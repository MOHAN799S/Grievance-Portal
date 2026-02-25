const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const multer     = require("multer");
const path       = require("path");
const fs         = require("fs");
const jwt        = require("jsonwebtoken");
const bcrypt     = require("bcryptjs");
const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");           // 👈 NEW
const cloudinary   = require("cloudinary").v2;           // 👈 NEW
const { CloudinaryStorage } = require("multer-storage-cloudinary"); // 👈 NEW

require("dotenv").config();

const app = express();

// =============================
// ☁️ CLOUDINARY CONFIG
// =============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =============================
// 📦 MODELS
// =============================
const Grievance = require("./models/Grievance");
const User      = require("./models/User");
const Otp       = require("./models/Otp");

// =============================
// 🔧 MIDDLEWARE
// =============================
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,   // 👈 required for cookies
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());                                 // 👈 NEW
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =============================
// 📂 FILE UPLOAD — CLOUDINARY
// =============================
const cloudinaryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "civic_connect/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1280, crop: "limit", quality: "auto" }],
  },
});

const cloudinaryAudioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "civic_connect/audio",
    allowed_formats: ["wav", "mp3", "ogg", "m4a"],
    resource_type:  "video", // Cloudinary uses "video" resource_type for audio
  },
});

// Mixed upload — image goes to Cloudinary, audio goes to Cloudinary
const upload = multer({
  storage: multer.diskStorage({            // fallback disk (overridden per-field below)
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename:    (_req, file, cb) => {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Per-field Cloudinary uploaders used inside the submit route
const uploadImage = multer({ storage: cloudinaryImageStorage, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadAudio = multer({
  storage: cloudinaryAudioStorage,
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /wav|mp3|ogg|m4a/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase().replace(".", "")));
  },
});

// Combined multer for grievance submit (both fields via Cloudinary)
const grievanceUpload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: (_req, file) => {
      if (file.fieldname === "image") {
        return {
          folder:         "civic_connect/images",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [{ width: 1280, crop: "limit", quality: "auto" }],
        };
      }
      // audio
      return {
        folder:        "civic_connect/audio",
        resource_type: "video",
      };
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// =============================
// 🗄️ DATABASE
// =============================
const url = process.env.MONGODB_URI || "mongodb://localhost:27017/civic_connect";
mongoose
  .connect(url)
  .then(() => console.log("✅ MongoDB Connected {}", url))
  .catch((err) => { console.error("❌ DB Error:", err); process.exit(1); });

// =============================
// 📧 EMAIL TRANSPORTER
// =============================
// =============================
// 📧 EMAIL TRANSPORTER (STABLE CONFIG)
// =============================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS upgrade
  pool: true, // connection pooling
  maxConnections: 5,
  maxMessages: 50,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter on startup
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP Config Error:", error);
  } else {
    console.log("✅ SMTP Ready");
  }
});

// =============================
// 🔢 HELPERS
// =============================
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const mapUrgencyToPriority = (urgency) => {
  if (!urgency) return "Medium";
  const u = urgency.toLowerCase();
  if (u === "critical")                    return "Critical";
  if (u === "medium")                   return "Medium";
  if (u === "high"  || u === "urgent")     return "High";
  if (u === "low"   || u === "non-urgent") return "Low";
  return "Medium";
};

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.fullName || user.name || "" },
    process.env.JWT_SECRET || "civic_jwt_secret_change_in_prod",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { id: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET || "civic_refresh_secret_change_in_prod",
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  );
}

function decodeToken(authHeader) {
  // 1. Try Authorization header first
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      return { payload: jwt.verify(token, process.env.JWT_SECRET || "civic_jwt_secret_change_in_prod") };
    } catch (err) {
      return { error: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" };
    }
  }
  return { error: "No token provided" };
}

// =============================
// 🍪 COOKIE HELPER
// =============================
const COOKIE_OPTS = {
  httpOnly: true,                                    // JS cannot read — XSS safe
  secure:   process.env.NODE_ENV === "production",   // HTTPS only in prod
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge:   7 * 24 * 60 * 60 * 1000,               // 7 days (matches JWT)
};

const REFRESH_COOKIE_OPTS = {
  ...COOKIE_OPTS,
  maxAge: 30 * 24 * 60 * 60 * 1000,               // 30 days
  path:   "/api/auth/refresh",                      // only sent to refresh endpoint
};

/**
 * Sets both access + refresh tokens as httpOnly cookies
 * AND returns them in the response body (for mobile / non-browser clients)
 */
function issueTokens(res, user) {
  const token        = signToken(user);
  const refreshToken = signRefreshToken(user._id);

  // Browser cookies (httpOnly, secure in prod)
  res.cookie("access_token",   token,        COOKIE_OPTS);
  res.cookie("refresh_token",  refreshToken, REFRESH_COOKIE_OPTS);

  return { token, refreshToken };
}

// =============================
// 🔐 AUTH MIDDLEWARE
// =============================
const verifyToken = (req, res, next) => {
  // Accept token from Authorization header OR cookie
  const fromHeader = decodeToken(req.headers.authorization);
  if (!fromHeader.error) { req.user = fromHeader.payload; return next(); }

  // Fallback: read from cookie
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) {
    try {
      req.user = jwt.verify(cookieToken, process.env.JWT_SECRET || "civic_jwt_secret_change_in_prod");
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
    }
  }

  res.status(401).json({ success: false, message: "No token provided" });
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== "admin")
      return res.status(403).json({ success: false, message: "Admin access required" });
    next();
  });
};

const verifyCitizen = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== "citizen")
      return res.status(403).json({ success: false, message: "Citizen access required" });
    next();
  });
};

if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// =================================================
// 🔑 AUTH ROUTES
// =================================================

app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;
    if (!email || !mobileNumber)
      return res.status(400).json({ success: false, message: "Email & mobile required" });

    const otp = generateOTP();
    await Otp.findOneAndDelete({ email });
    await Otp.create({ email, mobileNumber, otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 });

    try {
  const info = await transporter.sendMail({
    from: `"Civic Connect GKMC" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "OTP Verification – Civic Connect",
    html: `
  <div style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.08);overflow:hidden;">
      
      <!-- Header -->
      <tr>
        <td style="background-color:#1e3a8a;padding:20px;text-align:center;color:#ffffff;">
          <h1 style="margin:0;font-size:20px;letter-spacing:1px;">
            Civic Connect – Municipal Services Portal
          </h1>
          <p style="margin:5px 0 0;font-size:13px;opacity:0.9;">
            Government Grievance & Citizen Service Platform
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:30px 25px;text-align:center;">
          <h2 style="margin:0 0 15px;color:#111827;font-size:18px;">
            OTP Verification Code
          </h2>

          <p style="font-size:14px;color:#374151;margin-bottom:20px;">
            Please use the following One-Time Password (OTP) to complete your verification process.
          </p>

          <!-- OTP Box -->
          <div style="display:inline-block;background:#f1f5f9;border:2px dashed #1e3a8a;
                      padding:15px 30px;font-size:32px;font-weight:bold;
                      letter-spacing:8px;color:#1e3a8a;border-radius:6px;">
            ${otp}
          </div>

          <p style="margin-top:20px;font-size:13px;color:#6b7280;">
            This code is valid for <strong>5 minutes</strong> only.
          </p>

          <p style="margin-top:10px;font-size:12px;color:#9ca3af;">
            Do not share this code with anyone. Government officials will never ask for your OTP.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#6b7280;">
          © ${new Date().getFullYear()} Civic Connect Portal<br/>
          This is an automated system-generated email. Please do not reply.
        </td>
      </tr>

    </table>
  </div>
`,
  });

  console.log("📧 Email sent:", info.messageId);

} catch (mailErr) {
  console.error("❌ Mail Error:", mailErr.response || mailErr);
  return res.status(500).json({
    success: false,
    message: "Email delivery failed",
  });
}

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("[send-otp]", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, userData } = req.body;
    if (!email || !otp || !userData)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const record = await Otp.findOne({ email });
    if (!record)                       return res.json({ success: false, message: "OTP not found or expired" });
    if (new Date() > record.expiresAt) return res.json({ success: false, message: "OTP expired" });
    if (record.otp !== otp)            return res.json({ success: false, message: "Invalid OTP" });
    if (await User.exists({ email }))  return res.json({ success: false, message: "User already exists. Please login." });

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const newUser = await User.create({ ...userData, email: email.toLowerCase().trim(), password: hashedPassword, role: "citizen" });
    await Otp.deleteOne({ email });

    const { token, refreshToken } = issueTokens(res, newUser); // 👈 sets cookies + returns values
    const { password: _pw, ...safeUser } = newUser.toObject();

    res.status(201).json({ success: true, message: "Registration successful", token, refreshToken, user: safeUser });
  } catch (err) {
    console.error("[verify-otp]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email & password required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with this email",
      });
    }

    let isMatch = false;

    // 👇 Conditional password verification
    if (user.role === "admin") {
      // Direct plain text comparison
      isMatch = password === user.password;
    } else {
      // Normal users → bcrypt comparison
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const { token, refreshToken } = issueTokens(res, user);
    const { password: _pw, ...safeUser } = user.toObject();

    return res.json({
      success: true,
      token,
      refreshToken,
      user: safeUser,
      role: user.role,
    });

  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// ─── POST /api/auth/refresh ─────────────────────────────────────────────────
app.post("/api/auth/refresh", async (req, res) => {
  try {
    // Accept from body OR cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: "Refresh token required" });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "civic_refresh_secret_change_in_prod");
    } catch (err) {
      return res.status(401).json({ success: false, message: err.name === "TokenExpiredError" ? "Refresh token expired, please login again" : "Invalid refresh token" });
    }

    if (payload.type !== "refresh")
      return res.status(401).json({ success: false, message: "Invalid token type" });

    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const newToken = signToken(user);
    res.cookie("access_token", newToken, COOKIE_OPTS); // 👈 rotate cookie too
    res.json({ success: true, token: newToken });
  } catch (err) {
    console.error("[refresh]", err);
    res.status(500).json({ success: false, message: "Token refresh failed" });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// ─── PUT /api/auth/me ──────────────────────────────────────────────────────
app.put("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const ALLOWED = ["fullName", "name", "mobileNumber", "address"];
    const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    if (!Object.keys(update).length)
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    const updated = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true }).select("-password -__v");
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Profile update failed" });
  }
});

// ─── POST /api/auth/change-password ────────────────────────────────────────
app.post("/api/auth/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Both passwords required" });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    const user    = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Password change failed" });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
app.post("/api/auth/logout", verifyToken, (_req, res) => {
  // Clear both cookies
  res.clearCookie("access_token",  { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
  res.json({ success: true, message: "Logged out successfully" });
});

// ─── GET /api/auth/check ───────────────────────────────────────────────────
app.get("/api/auth/check", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("fullName email role isVerified").lean();
    if (!user) return res.status(401).json({ success: false, isSignedIn: false, message: "User not found" });
    res.json({ success: true, isSignedIn: true, role: user.role, user: { id: req.user.id, name: user.fullName, email: user.email, role: user.role, isVerified: user.isVerified } });
  } catch (err) {
    res.status(500).json({ success: false, isSignedIn: false, message: "Auth check failed" });
  }
});

// =================================================
// 📋 GRIEVANCE ROUTES
// =================================================

app.get("/api/grievances", verifyToken, async (req, res) => {
  try {
    const { status, priority, category, area, search, sort = "newest", page = "1", limit = "50" } = req.query;
    const filter = {};
    if (req.user.role === "citizen") filter.userEmail = req.user.email;
    if (status   && status   !== "All") filter.status   = status;
    if (priority && priority !== "All") filter.priority = priority === "Critical" ? { $in: ["Critical", "Immediate"] } : priority;
    if (category && category !== "All") {
      const knownCats = ["Electricity","Garbage","Pollution","Public Transport","Roads","Sanitation","Stray Animals","Water"];
      filter.category = category === "Others" ? { $nin: knownCats } : category;
    }
    if (area)   filter.area        = { $regex: area,   $options: "i" };
    if (search) filter.description = { $regex: search, $options: "i" };

    const sortMap    = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, priority: { priorityScore: -1, createdAt: -1 } };
    const pageNum    = Math.max(1, parseInt(page, 10) || 1);
    const limitNum   = Math.min(200, parseInt(limit, 10) || 50);

    const [grievances, total] = await Promise.all([
      Grievance.find(filter).sort(sortMap[sort] || sortMap.newest).skip((pageNum - 1) * limitNum).limit(limitNum).select("-__v").lean(),
      Grievance.countDocuments(filter),
    ]);

    res.json({ success: true, data: grievances, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum), hasNext: pageNum < Math.ceil(total / limitNum) } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch grievances" });
  }
});

app.get("/api/grievances/stats/summary", verifyAdmin, async (req, res) => {
  try {
    const [statusStats, priorityStats, categoryStats, recentTrend] = await Promise.all([
      Grievance.aggregate([{ $match: { status: { $ne: "Spam" } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $match: { status: { $ne: "Spam" } } }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $match: { status: { $ne: "Spam" } } }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Grievance.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: { $ne: "Spam" } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    const [total, spam] = await Promise.all([Grievance.countDocuments({ status: { $ne: "Spam" } }), Grievance.countDocuments({ status: "Spam" })]);
    const toObj      = (arr) => Object.fromEntries(arr.map(({ _id, count }) => [_id, count]));
    const statusObj  = toObj(statusStats);
    res.json({ success: true, data: { total, spam, status: statusObj, priority: toObj(priorityStats), categories: categoryStats.map(({ _id, count }) => ({ name: _id, count })), trend: recentTrend.map(({ _id, count }) => ({ date: _id, count })), resolvedPct: total ? Math.round(((statusObj.Resolved || 0) / total) * 100) : 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

app.get("/api/grievances/:id", verifyToken, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id).select("-__v").lean();
    if (!grievance) return res.status(404).json({ success: false, message: "Grievance not found" });
    if (req.user.role === "citizen" && grievance.userEmail !== req.user.email)
      return res.status(403).json({ success: false, message: "Access denied" });
    res.json({ success: true, data: grievance });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch grievance" });
  }
});

// ─── POST /api/grievances/submit — Cloudinary upload ─────────────────────
app.post(
  "/api/grievances/submit",
  verifyCitizen,
  grievanceUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const userEmail   = req.user.email;
      const citizenName = req.user.name || "Anonymous";

      const imageUrl = req.files?.image?.[0]?.path || null;
      const audioUrl = req.files?.audio?.[0]?.path || null;

      // ================================
      // 🔹 CALL AI SERVICE
      // ================================
      let aiPrediction;

      try {
        const predRes = await fetch("http://localhost:5001/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: req.body.textInput || req.body.description || "",
            area: req.body.area || "",
            citizenName,
            hasImage: !!imageUrl,
            hasAudio: !!audioUrl,
            explain:true,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!predRes.ok) {
          const errBody = await predRes.text();
          return res.status(502).json({
            success: false,
            message: "AI prediction service error.",
            detail: errBody,
          });
        }

        aiPrediction = await predRes.json();

      } catch (predErr) {
        console.error("⚠️ AI Service Error:", predErr.message);
        return res.status(503).json({
          success: false,
          message: "AI prediction service unavailable.",
          detail: predErr.message,
        });
      }

      // ================================
      // 🔹 PREPARE GEOJSON LOCATION
      // ================================
      let location = undefined;

      if (req.body.latitude && req.body.longitude) {
        location = {
          type: "Point",
          coordinates: [
            parseFloat(req.body.longitude),
            parseFloat(req.body.latitude),
          ],
        };
      }

      // ================================
      // 🔹 SANITIZE TOKEN ARRAYS
      // ================================
      const sanitizeTokens = (tokens) => {
        if (!Array.isArray(tokens)) return [];
        return tokens
          .filter(t => t.token && typeof t.impact === "number")
          .map(t => ({
            token: t.token,
            impact: t.impact
          }));
      };

      // ================================
      // 🔹 CREATE GRIEVANCE
      // ================================
      const grievance = await Grievance.create({
        citizenName,
        userEmail,
        area: req.body.area,
        description: req.body.textInput || req.body.description || "Media Evidence Submitted",
        status: "Pending",

        // AI fields
        category: aiPrediction.category ?? "Other",
        categoryConfidence: aiPrediction.category_confidence ?? null,
        priority: mapUrgencyToPriority(aiPrediction.urgency),
        urgency: aiPrediction.urgency ?? null,
        urgencyConfidence: aiPrediction.urgency_confidence ?? null,
        priorityScore: aiPrediction.priority_score ?? null,
        language: aiPrediction.language ?? null,

        explanation: {
          finalReason: aiPrediction.explanation?.final_reason ?? null,
          prioritySummary: aiPrediction.explanation?.priority_summary ?? null,
          categoryDecision: aiPrediction.explanation?.category_decision ?? null,
          urgencyDecision: aiPrediction.explanation?.urgency_decision ?? null,
          categoryTokens: sanitizeTokens(aiPrediction.explanation?.category_tokens),
          urgencyTokens: sanitizeTokens(aiPrediction.explanation?.urgency_tokens),
        },

        imageUrl,
        audioUrl,
        location,
      });

      // ================================
      // 🔹 RESPONSE
      // ================================
      return res.status(201).json({
        success: true,
        data: grievance,
        prediction: {
          category: aiPrediction.category,
          categoryConfidence: aiPrediction.category_confidence,
          urgency: aiPrediction.urgency,
          urgencyConfidence: aiPrediction.urgency_confidence,
          priorityScore: aiPrediction.priority_score,
          language: aiPrediction.language,
        }
      });

    } catch (err) {
      console.error("[POST /api/grievances/submit]", err);
      return res.status(500).json({
        success: false,
        message: "Failed to submit grievance",
        error: err.message,
      });
    }
  }
);

app.put("/api/grievances/:id", verifyAdmin, async (req, res) => {
  try {
    const ALLOWED = ["status", "adminReply", "estimatedTime", "priority", "category"];
    const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: "No valid fields to update" });
    const updated = await Grievance.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).select("-__v");
    if (!updated) return res.status(404).json({ success: false, message: "Grievance not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// ─── DELETE — also remove from Cloudinary ─────────────────────────────────
app.delete("/api/grievances/:id", verifyAdmin, async (req, res) => {
  try {
    const deleted = await Grievance.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Grievance not found" });

    // Delete from Cloudinary using public_id extracted from URL
    const extractPublicId = (url) => {
      if (!url) return null;
      const parts = url.split("/");
      const file  = parts[parts.length - 1].split(".")[0];
      const folder = parts[parts.length - 2];
      return `${folder}/${file}`;
    };

    if (deleted.imageUrl) {
      try { await cloudinary.uploader.destroy(`civic_connect/images/${extractPublicId(deleted.imageUrl)}`); } catch {}
    }
    if (deleted.audioUrl) {
      try { await cloudinary.uploader.destroy(`civic_connect/audio/${extractPublicId(deleted.audioUrl)}`, { resource_type: "video" }); } catch {}
    }

    res.json({ success: true, message: "Grievance permanently deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

// ─── ADMIN USER MANAGEMENT ────────────────────────────────────────────────
app.get("/api/admin/users", verifyAdmin, async (req, res) => {
  try {
    const { role, search, page = "1", limit = "30" } = req.query;
    const filter = {};
    if (role && role !== "All") filter.role = role;
    if (search) filter.$or = [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10) || 30);
    const [users, total] = await Promise.all([User.find(filter).select("-password -__v").sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(), User.countDocuments(filter)]);
    res.json({ success: true, data: users, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

app.delete("/api/admin/users/:id", verifyAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));