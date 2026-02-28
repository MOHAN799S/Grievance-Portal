const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const sgMail = require("@sendgrid/mail");

require("dotenv").config();

// =============================
// 🌍 CONSTANTS / CONFIG
// =============================
const JWT_SECRET = process.env.JWT_SECRET || "civic_jwt_secret_change_in_prod";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "civic_refresh_secret_change_in_prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
const REFRESH_COOKIE_OPTS = {
  ...COOKIE_OPTS,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/api/auth/refresh",
};

// Flask validation sets (must match flask/app.py exactly)
const FLASK_VALID_AREAS = new Set([
  "suryaraopeta", "jagannaickpur", "raja rao peta", "bhanugudi", "old town",
  "rajah street", "main road", "gandhi nagar", "ashok nagar", "nethaji nagar",
  "srinivasa nagar", "tngo colony", "shankar vilas", "collector's colony",
  "new town", "bank colony", "drivers colony", "fci colony", "burma colony",
  "dwaraka nagar", "ayodhya nagar", "kakinada port area", "kakinada industrial area",
  "fishing harbour", "dairy farm", "auto nagar", "kaleswara rao nagar",
  "ramanayyapeta", "rama rao peta", "kondayya palem", "ganganapalle",
  "gudari gunta", "indrapalem", "sarpavaram", "uppada", "kaikavolu",
  "kothuru", "thammavaram", "thimmapuram", "vivekananda street", "jr ntr road",
  "jntu kakinada area", "govt general hospital area", "apsp camp",
  "kakinada beach road", "kakinada bazar", "anjaneya nagar",
]);
const FLASK_VALID_CATEGORIES = new Set([
  "electricity", "garbage", "pollution", "public transport",
  "roads", "sanitation", "stray animals", "water", "other",
]);
const CATEGORY_MAP = {
  "electricity": "electricity", "garbage": "garbage", "pollution": "pollution",
  "public transport": "public transport", "roads": "roads", "road": "roads",
  "sanitation": "sanitation", "stray animals": "stray animals",
  "stray animal": "stray animals", "water": "water",
};
const FLASK_VALID_LANGUAGES = new Set(["english", "hindi", "telugu"]);
const FLASK_VALID_URGENCY = new Set(["low", "medium", "high", "critical"]);
const FAIRNESS_DIMENSIONS = ["area", "category", "language"];

const PRIORITY_MAP = {
  critical: "Critical",
  medium: "Medium",
  high: "High",
  urgent: "High",
  low: "Low",
  "non-urgent": "Low",
};

// =============================
// 📦 APP SETUP
// =============================
const app = express();

// ── Cloudinary ──────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── SendGrid ────────────────────────────────────────────────────────────────
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ── Models ──────────────────────────────────────────────────────────────────
const HotspotAlert = require("./models/HotspotAlert");
const Grievance = require("./models/Grievance");
const User = require("./models/User");
const Otp = require("./models/Otp");

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Multer / Cloudinary Storage ──────────────────────────────────────────────
const grievanceUpload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: (_req, file) =>
      file.fieldname === "image"
        ? {
          folder: "civic_connect/images",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [{ width: 1280, crop: "limit", quality: "auto" }],
        }
        : { folder: "civic_connect/audio", resource_type: "video" },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// =============================
// 🗄️ DATABASE
// =============================
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/civic_connect";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log(`✅ Connected to ${MONGO_URI.includes("localhost") || MONGO_URI.includes("127.0.0.1") ? "Localhost" : "Atlas"} MongoDB`))
  .catch((err) => { console.error("❌ DB Error:", err); process.exit(1); });

// =============================
// 🔢 HELPERS
// =============================
const generateOTP = () => crypto.randomInt(100_000, 999_999).toString();

const mapUrgencyToPriority = (urgency = "") =>
  PRIORITY_MAP[urgency.toLowerCase()] ?? "Medium";

const normaliseUrgency = (u) => {
  const v = (u || "").toLowerCase().trim();
  if (v === "immediate") return "critical";
  return FLASK_VALID_URGENCY.has(v) ? v : "medium";
};

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.fullName || user.name || "" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId, type: "refresh" }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

const issueTokens = (res, user) => {
  const token = signToken(user);
  const refreshToken = signRefreshToken(user._id);
  res.cookie("access_token", token, COOKIE_OPTS);
  res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTS);
  return { token, refreshToken };
};

/** Extract + verify a Bearer JWT; returns { payload } or { error } */
const verifyBearer = (authHeader) => {
  if (!authHeader?.startsWith("Bearer ")) return { error: "No token provided" };
  try {
    return { payload: jwt.verify(authHeader.slice(7), JWT_SECRET) };
  } catch (err) {
    return { error: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" };
  }
};

const sanitizeTokens = (tokens) =>
  Array.isArray(tokens)
    ? tokens.filter(t => t.token && typeof t.impact === "number").map(({ token, impact }) => ({ token, impact }))
    : [];

const extractCloudinaryPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const file = parts.at(-1).split(".")[0];
  const folder = parts.at(-2);
  return `${folder}/${file}`;
};

// =============================
// 🔐 AUTH MIDDLEWARE
// =============================
const verifyToken = (req, res, next) => {
  // 1) Authorization header
  const { payload, error } = verifyBearer(req.headers.authorization);
  if (payload) { req.user = payload; return next(); }

  // 2) Cookie fallback
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) {
    try {
      req.user = jwt.verify(cookieToken, JWT_SECRET);
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
    }
  }

  res.status(401).json({ success: false, message: error || "No token provided" });
};

const verifyAdmin = (req, res, next) =>
  verifyToken(req, res, () =>
    req.user?.role === "admin"
      ? next()
      : res.status(403).json({ success: false, message: "Admin access required" })
  );

const verifyCitizen = (req, res, next) =>
  verifyToken(req, res, () =>
    req.user?.role === "citizen"
      ? next()
      : res.status(403).json({ success: false, message: "Citizen access required" })
  );

// =============================
// 📧 EMAIL TEMPLATE
// =============================
const buildOtpEmail = (otp) => `
<div style="margin:0;padding:40px 0;background:#f2f2f2;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 30px;background:rgba(255,255,255,0.65);
    backdrop-filter:blur(8px);border:1px solid rgba(0,0,0,0.08);border-radius:12px;
    box-shadow:0 8px 24px rgba(0,0,0,0.06);text-align:center;">
    <h1 style="margin:0 0 10px;font-size:20px;font-weight:600;color:#111;letter-spacing:0.5px;">
      Civic Connect Portal
    </h1>
    <p style="margin:0 0 30px;font-size:13px;color:#444;">Government Grievance &amp; Citizen Services Notification</p>
    <div style="margin:20px 0;padding:20px 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;">
      <p style="margin:0 0 12px;font-size:14px;color:#333;">Your One-Time Verification Code</p>
      <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#000;">${otp}</div>
    </div>
    <p style="margin:20px 0 5px;font-size:13px;color:#555;">This code is valid for <strong>5 minutes</strong>.</p>
    <p style="margin:0;font-size:12px;color:#777;">Do not share this code with anyone. This is an automated system notification.</p>
    <div style="margin-top:35px;font-size:11px;color:#888;border-top:1px solid #eaeaea;padding-top:15px;">
      © ${new Date().getFullYear()} Civic Connect Portal<br/>Municipal Digital Services Platform
    </div>
  </div>
</div>`;

// =============================
// ⚖️ GFAS FAIRNESS HELPERS
// =============================
const clamp100 = (v) => Math.min(100, Math.max(0, Number(v) || 0));
const gapToScore = (gap) => gap == null ? 100 : clamp100(100 - Number(gap) * 200);

const scoreSeverity = (score) =>
  score >= 80 ? "ok" : score >= 60 ? "warning" : "critical";

const parseDimension = (block, dim) => {
  const EMPTY = { fairnessScore: 100, breakdown: [], flagged: [], average: 0, disparitySummary: {}, flagsRaised: 0 };
  if (!block || typeof block !== "object") return EMPTY;

  const groupMetrics = block.group_metrics ?? {};
  const disparitySummary = block.disparity_summary ?? {};
  const fairnessFlags = block.fairness_flags ?? [];
  const flagsRaised = block.flags_raised ?? fairnessFlags.length;

  const { statistical_parity_gap: parityGap, equal_opportunity_tpr_gap: tprGap, mean_priority_score_gap: priorityGap } = disparitySummary;

  const subScores = [parityGap, tprGap, priorityGap].filter(g => g != null).map(gapToScore);
  const fairnessScore = subScores.length ? clamp100(Math.min(...subScores)) : 100;

  const breakdown = Object.entries(groupMetrics).map(([groupName, m]) => ({
    [dim]: groupName,
    resolutionRate: clamp100((m.statistical_parity ?? 0) * 100),
    total: m.count ?? null,
    statisticalParity: m.statistical_parity ?? null,
    tpr: m.equal_opportunity_tpr ?? null,
    meanPriorityScore: m.mean_priority_score ?? null,
  })).sort((a, b) => a.resolutionRate - b.resolutionRate);

  const parityValues = breakdown.map(b => b.statisticalParity ?? 0);
  const meanParity = parityValues.length ? parityValues.reduce((s, v) => s + v, 0) / parityValues.length : 0;
  const flagged = breakdown.filter(b => (b.statisticalParity ?? meanParity) < meanParity - 0.10).map(b => b[dim]);
  const average = clamp100(meanParity * 100);

  return { fairnessScore, breakdown, flagged, average, disparitySummary, flagsRaised };
};

const buildAlerts = (dimResults) => {
  const dimLabel = { area: "Area", category: "Category", language: "Language" };
  return Object.entries(dimResults).flatMap(([dim, d]) => {
    if (d.fairnessScore >= 80) return [];
    const label = dimLabel[dim] ?? dim;
    const flaggedStr = d.flagged.length ? ` Affected groups: ${d.flagged.slice(0, 3).join(", ")}${d.flagged.length > 3 ? ` +${d.flagged.length - 3} more` : ""}.` : "";
    const metricMsgs = [];
    if (d.disparitySummary.statistical_parity_gap > 0.20) metricMsgs.push(`urgency-rate gap of ${(d.disparitySummary.statistical_parity_gap * 100).toFixed(1)}%`);
    if (d.disparitySummary.equal_opportunity_tpr_gap > 0.20) metricMsgs.push(`detection-rate gap of ${(d.disparitySummary.equal_opportunity_tpr_gap * 100).toFixed(1)}%`);
    if (d.disparitySummary.mean_priority_score_gap > 0.20) metricMsgs.push(`priority-score gap of ${d.disparitySummary.mean_priority_score_gap.toFixed(3)}`);
    const metricStr = metricMsgs.length ? ` (${metricMsgs.join("; ")})` : "";
    const message = d.fairnessScore < 60
      ? `Significant ${label.toLowerCase()} fairness disparity detected${metricStr}.${flaggedStr} Immediate review recommended.`
      : `Moderate ${label.toLowerCase()} fairness disparity detected${metricStr}.${flaggedStr} Monitor resolution trends.`;
    return [{ severity: scoreSeverity(d.fairnessScore), message, dimension: dim }];
  });
};

const buildRecommendations = (dimResults, globalAvg) => {
  const titleMap = {
    area: "Improve urgency detection in under-served areas",
    category: "Address priority scoring gap across grievance categories",
    language: "Ensure equitable urgency classification by submission language",
  };
  const descTemplate = (dim, d) => {
    const flaggedStr = d.flagged.length ? ` (${d.flagged.slice(0, 2).join(", ")}${d.flagged.length > 2 ? " and others" : ""})` : "";
    const { statistical_parity_gap: pg, equal_opportunity_tpr_gap: tg } = d.disparitySummary;
    const details = [];
    if (pg != null && pg > 0.20) details.push(`a ${(pg * 100).toFixed(1)}% urgency-rate disparity`);
    if (tg != null && tg > 0.20) details.push(`a ${(tg * 100).toFixed(1)}% detection-rate gap for truly urgent cases`);
    const detailStr = details.length ? ` The audit found ${details.join(" and ")}.` : "";
    const templates = {
      area: `Some areas${flaggedStr} show significantly lower urgent-grievance detection rates than the district average.${detailStr} Prioritise outreach and staff allocation to these localities.`,
      category: `Certain categories${flaggedStr} have a priority scoring gap well below the overall average.${detailStr} Review staff skill allocation and escalation workflows for these complaint types.`,
      language: `Grievances submitted in certain languages${flaggedStr} receive lower urgency scores.${detailStr} Consider multilingual staff or translation-assisted workflows to remove language barriers.`,
    };
    return templates[dim] ?? `Fairness score for ${dim}: ${d.fairnessScore}.`;
  };

  return Object.entries(dimResults)
    .filter(([, d]) => d.fairnessScore < 80)
    .sort((a, b) => a[1].fairnessScore - b[1].fairnessScore)
    .map(([dim, d]) => ({
      priority: d.fairnessScore < 60 ? "high" : "medium",
      title: titleMap[dim] ?? `Review ${dim} fairness`,
      description: descTemplate(dim, d),
      dimension: dim,
      affectedArea: d.flagged.slice(0, 2).join(", ") || null,
    }));
};

const transformFlaskResponse = (flaskData, totalGrievances, avgResolutionRate) => {
  const audit = flaskData.fairness_audit ?? flaskData;
  const results = audit.results ?? audit ?? {};

  const area = parseDimension(results.area ?? null, "area");
  const category = parseDimension(results.category ?? null, "category");
  const language = parseDimension(results.language ?? null, "language");

  const overallFairnessScore = clamp100((area.fairnessScore + category.fairnessScore + language.fairnessScore) / 3);
  const globalAvg = clamp100((area.average + category.average + language.average) / 3);

  const allGaps = [area, category, language].flatMap(d => Object.values(d.disparitySummary).filter(v => v != null));
  const disparityIndex = allGaps.length ? Number(Math.max(...allGaps).toFixed(4)) : null;

  const dimResults = { area, category, language };

  return {
    overallFairnessScore,
    area, category, language,
    summary: {
      totalGrievances: audit.total_grievances ?? totalGrievances,
      avgResolutionRate,
      disparityIndex,
    },
    alerts: buildAlerts(dimResults),
    recommendations: buildRecommendations(dimResults, globalAvg),
    generatedAt: new Date().toISOString(),
  };
};


// =============================
// 🚨 HOTSPOT HELPER
// =============================

/**
 * Slim each grievance to exactly the 4 fields Flask /hotspot-forecast uses:
 *
 *   area, category  → groupby keys
 *   createdAt       → pd.to_datetime(utc=True) → Prophet "ds" column
 *   priorityScore   → averaged per bucket for risk_score calculation
 *
 * Flask also filters rows by VALID_LABELS:
 *   ["electricity","garbage","pollution","public transport",
 *    "roads","sanitation","stray animals","water"]
 * Records with any other category (e.g. "other") are silently dropped by Flask.
 *
 * Flask requires ≥2 unique dates per area+category pair to run Prophet.
 * We keep full ISO strings so pd.to_datetime(utc=True) parses correctly.
 * Dropping every field beyond these 4 cuts payload ~80% (115 KB → ~22 KB).
 */

// Must match Flask's VALID_LABELS exactly — anything else is silently dropped
const FLASK_HOTSPOT_VALID_LABELS = new Set([
  "electricity", "garbage", "pollution", "public transport",
  "roads", "sanitation", "stray animals", "water",
]);

function buildHotspotPayload(grievances) {
  const rows = [];
  for (const g of grievances) {
    const area = (g.area || "").toLowerCase().trim();
    const category = (g.category || "").toLowerCase().trim();

    // Pre-filter: skip categories Flask will silently drop anyway
    if (!FLASK_HOTSPOT_VALID_LABELS.has(category)) continue;

    rows.push({
      area,
      category,
      // Full ISO string — Flask does pd.to_datetime(utc=True) on this field
      createdAt: g.createdAt instanceof Date
        ? g.createdAt.toISOString()
        : String(g.createdAt),
      // Flask averages this per bucket for the risk_score formula
      priorityScore: typeof g.priorityScore === "number"
        ? Number(g.priorityScore.toFixed(3))
        : 0,
    });
  }
  return rows;
}

/**
 * Map one Flask hotspot entry → HotspotAlert document shape.
 * Stores the full raw Flask response for audit / replay.
 */
function normaliseHotspot(h, flaskSnapshot) {
  const risk = Number((h.risk_score <= 1 ? h.risk_score * 100 : h.risk_score).toFixed(2));
  let level = "Low";
  if (risk >= 80) level = "Critical";
  else if (risk >= 60) level = "High";
  else if (risk >= 40) level = "Medium";

  return {
    // ── Fields that exactly match HotspotAlert schema ─────────────────────
    area: h.area,
    category: h.category,
    riskScore: risk,
    level,
    growthPercent: Number((h.growth_percent ?? 0).toFixed(2)),
    sourceWindowDays: 45,    // matches the cutoff used in triggerHotspotCheck
    forecastHorizonDays: 7,     // matches horizon_days sent to Flask
    confidenceScore: h.confidence != null
      ? Math.min(1, Math.max(0, Number(h.confidence)))
      : 0.75,                     // schema default
    isResolved: false,
    // flaskSnapshot stored for audit — added to schema below
    flaskSnapshot,
  };
}

async function triggerHotspotCheck() {
  // 1. Fetch recent grievances
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);

  const grievances = await Grievance.find({ createdAt: { $gte: cutoff } })
    .select("area category createdAt priorityScore")
    .lean();

  if (!grievances.length) {
    console.log("[hotspot] No grievances in last 45 days — skipping.");
    return { inserted: 0, skipped: 0 };
  }

  // 2. Slim payload — keeps per-row temporal signal, pre-filters invalid categories
  const slimmed = buildHotspotPayload(grievances);
  const filteredOut = grievances.length - slimmed.length;
  const approxKB = Math.round(JSON.stringify(slimmed).length / 1024);
  console.log(`[hotspot] ${grievances.length} grievances → ${slimmed.length} valid rows (~${approxKB} KB) | ${filteredOut} filtered (invalid category)`);

  if (slimmed.length < 2) {
    console.log("[hotspot] Too few valid rows for Prophet — check category values in DB.");
    return { inserted: 0, skipped: 0 };
  }

  // 3. Call Flask
  let flaskData;
  try {
    const { data } = await axios.post(
      `${FLASK_URL}/hotspot-forecast`,
      { grievances: slimmed, horizon_days: 7, top_n: 20 },
      { timeout: 50_000 },   // parallel Prophet: ~3–8 s for 300+ groups
    );
    flaskData = data;
  } catch (err) {
    const reason = err.code === "ECONNABORTED" ? "timeout after 20 s" : (err.code || err.message);
    console.error(`[hotspot] Flask call failed — ${reason}`);
    throw err;
  }

  const hotspots = flaskData.top_hotspots || [];
  if (!hotspots.length) {
    console.log("[hotspot] Flask returned no hotspots.");
    return { inserted: 0, skipped: 0 };
  }

  // 4. Deduplicate against open alerts already in DB (all levels, no risk filter)
  const existingKeys = new Set(
    (await HotspotAlert.find({ isResolved: false }).select("area category").lean())
      .map(a => `${a.area}_${a.category}`)
  );

  // 5. Build insert list — ALL risk levels stored, only skip true duplicates
  const toInsert = hotspots
    .map(h => normaliseHotspot(h, flaskData))
    .filter(h => !existingKeys.has(`${h.area}_${h.category}`));

  const skipped = hotspots.length - toInsert.length;

  // 6. Bulk-insert
  if (toInsert.length) {
    await HotspotAlert.insertMany(toInsert, { ordered: false });
    const byLevel = toInsert.reduce((acc, h) => { acc[h.level] = (acc[h.level] || 0) + 1; return acc; }, {});
    console.log(`[hotspot] ✅ ${toInsert.length} alert(s) saved ${JSON.stringify(byLevel)} | ${skipped} skipped (already open)`);
  } else {
    console.log(`[hotspot] No new alerts — all ${skipped} already open in DB.`);
  }

  return { inserted: toInsert.length, skipped };
}

// =================================================
// 🌐 ROUTES — Health
// =================================================
app.get("/", (_req, res) => res.send("Civic Connect API is running. Please use the /api endpoints."));

// =================================================
// 🔑 AUTH ROUTES
// =================================================
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;
    if (!email || !mobileNumber)
      return res.status(400).json({ success: false, message: "Email & mobile required" });

    const otp = generateOTP();
    // Upsert-style: delete old, create new (atomic enough for OTP)
    await Otp.deleteOne({ email });
    await Otp.create({ email, mobileNumber, otp, expiresAt: new Date(Date.now() + 5 * 60_000), attempts: 0 });

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_VERIFIED_EMAIL,
      subject: "OTP Verification – Civic Connect",
      html: buildOtpEmail(otp),
    }).catch(mailErr => {
      console.error("❌ SendGrid Error:", mailErr.response?.body || mailErr);
      throw Object.assign(new Error("Email delivery failed"), { isMailError: true });
    });

    console.log("📧 OTP email sent");
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    if (err.isMailError) return res.status(500).json({ success: false, message: "Email delivery failed" });
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
    if (!record) return res.json({ success: false, message: "OTP not found or expired" });
    if (new Date() > record.expiresAt) return res.json({ success: false, message: "OTP expired" });
    if (record.otp !== otp) return res.json({ success: false, message: "Invalid OTP" });
    if (await User.exists({ email })) return res.json({ success: false, message: "User already exists. Please login." });

    const [hashedPassword] = await Promise.all([
      bcrypt.hash(userData.password, 12),
      Otp.deleteOne({ email }),
    ]);

    const newUser = await User.create({ ...userData, email: email.toLowerCase().trim(), password: hashedPassword, role: "citizen" });
    const { token, refreshToken } = issueTokens(res, newUser);
    const { password: _pw, ...safeUser } = newUser.toObject();

    res.status(201).json({ success: true, message: "Registration successful", token, refreshToken, user: safeUser });
  } catch (err) {
    console.error("[verify-otp]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email & password required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ success: false, message: "No account found with this email" });

    const isMatch = user.role === "admin"
      ? password === user.password                     // plain text admin (existing behaviour)
      : await bcrypt.compare(password, user.password); // bcrypt for citizens

    if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password" });

    const { token, refreshToken } = issueTokens(res, user);
    const { password: _pw, ...safeUser } = user.toObject();

    res.json({ success: true, token, refreshToken, user: safeUser, role: user.role });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    if (!refreshToken) return res.status(400).json({ success: false, message: "Refresh token required" });

    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: err.name === "TokenExpiredError" ? "Refresh token expired, please login again" : "Invalid refresh token" });
    }

    if (payload.type !== "refresh") return res.status(401).json({ success: false, message: "Invalid token type" });

    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const newToken = signToken(user);
    res.cookie("access_token", newToken, COOKIE_OPTS);
    res.json({ success: true, token: newToken });
  } catch (err) {
    console.error("[refresh]", err);
    res.status(500).json({ success: false, message: "Token refresh failed" });
  }
});

app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

app.put("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const ALLOWED = ["fullName", "name", "mobileNumber", "address"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: "No valid fields to update" });
    const updated = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true }).select("-password -__v");
    res.json({ success: true, user: updated });
  } catch {
    res.status(500).json({ success: false, message: "Profile update failed" });
  }
});

app.post("/api/auth/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: "Both passwords required" });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch {
    res.status(500).json({ success: false, message: "Password change failed" });
  }
});

app.post("/api/auth/logout", verifyToken, (_req, res) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
  res.json({ success: true, message: "Logged out successfully" });
});

app.get("/api/auth/check", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("fullName email role isVerified").lean();
    if (!user) return res.status(401).json({ success: false, isSignedIn: false, message: "User not found" });
    res.json({ success: true, isSignedIn: true, role: user.role, user: { id: req.user.id, name: user.fullName, email: user.email, role: user.role, isVerified: user.isVerified } });
  } catch {
    res.status(500).json({ success: false, isSignedIn: false, message: "Auth check failed" });
  }
});

// =================================================
// ⚖️ FAIRNESS AUDIT
// =================================================
app.get("/api/fairness-audit", verifyAdmin, async (req, res) => {
  try {
    const grievances = await Grievance.find({})
      .select("area category language status urgency priorityScore")
      .lean();

    const emptyAudit = () => ({
      overallFairnessScore: 100,
      area: { fairnessScore: 100, breakdown: [], flagged: [], average: 0 },
      category: { fairnessScore: 100, breakdown: [], flagged: [], average: 0 },
      language: { fairnessScore: 100, breakdown: [], flagged: [], average: 0 },
      summary: { totalGrievances: grievances.length, avgResolutionRate: 0, disparityIndex: null },
      alerts: [], recommendations: [],
      generatedAt: new Date().toISOString(),
    });

    if (!grievances.length) return res.json({ success: true, data: emptyAudit() });

    const totalGrievances = grievances.length;
    const resolvedCount = grievances.filter(g => g.status === "Resolved").length;
    const avgResolutionRate = (resolvedCount / totalGrievances) * 100;

    // Filter to records Flask can process
    const skipped = [];
    const flaskRecords = [];

    for (const g of grievances) {
      const rawArea = (g.area || "").trim().toLowerCase();
      if (!FLASK_VALID_AREAS.has(rawArea)) { skipped.push({ id: g._id, reason: `area: "${rawArea}"` }); continue; }

      const rawCategory = (g.category || "").trim().toLowerCase();
      const mappedCategory = CATEGORY_MAP[rawCategory] ?? rawCategory;
      if (!FLASK_VALID_CATEGORIES.has(mappedCategory)) { skipped.push({ id: g._id, reason: `category: "${rawCategory}"` }); continue; }

      const rawLanguage = (g.language || "english").trim().toLowerCase();

      flaskRecords.push({
        area: rawArea,
        category: mappedCategory,
        language: FLASK_VALID_LANGUAGES.has(rawLanguage) ? rawLanguage : "english",
        predicted_urgency: normaliseUrgency(g.urgency),
        true_urgency: normaliseUrgency(g.urgency),
        priority_score: typeof g.priorityScore === "number" && isFinite(g.priorityScore) ? g.priorityScore : 0,
      });
    }

    if (skipped.length) console.warn(`[fairness-audit] Skipped ${skipped.length}/${totalGrievances}:`, skipped.slice(0, 5));

    if (!flaskRecords.length) {
      const uniqueReasons = [...new Set(skipped.map(s => s.reason.split(":")[0]))];
      return res.json({
        success: true,
        data: {
          ...emptyAudit(),
          summary: { totalGrievances, avgResolutionRate: Math.round(avgResolutionRate * 10) / 10, disparityIndex: null, skippedRecords: skipped.length },
          alerts: [{ severity: "warning", message: `${skipped.length} of ${totalGrievances} grievances excluded. Unrecognised fields: ${uniqueReasons.join(", ")}.`, dimension: null }],
        },
      });
    }

    let flaskRaw;
    try {
      const { data } = await axios.post(
        `${FLASK_URL}/fairness-audit`,
        { grievances: flaskRecords, dimensions: FAIRNESS_DIMENSIONS, group_by: "area", meta: { totalGrievances, validRecords: flaskRecords.length, avgResolutionRate } },
        { headers: { "Content-Type": "application/json" }, timeout: parseInt(process.env.ML_TIMEOUT_MS || "20000", 10) },
      );
      flaskRaw = data.data ?? data.result ?? data;
    } catch (flaskErr) {
      console.error("[fairness-audit] Flask error:", flaskErr.message);
      const status = flaskErr.response?.status;
      const message = flaskErr.response?.data?.message ?? (status ? `ML service returned HTTP ${status}` : `ML service unreachable at ${FLASK_URL}`);
      return res.status(502).json({ success: false, message });
    }

    const transformed = transformFlaskResponse(flaskRaw, totalGrievances, avgResolutionRate);
    console.log(`[fairness-audit] Score: ${transformed.overallFairnessScore} | Alerts: ${transformed.alerts.length}`);
    res.json({ success: true, data: transformed });
  } catch (err) {
    console.error("[fairness-audit]", err);
    res.status(500).json({ success: false, message: "Internal server error during fairness audit." });
  }
});

// =================================================
// 🚨 HOTSPOT ALERTS
// =================================================
app.post("/api/admin/hotspot-alerts", verifyAdmin, async (req, res) => {
  try {
    const result = await triggerHotspotCheck();
    res.json({ success: true, message: `Hotspot check complete — ${result.inserted} alert(s) saved, ${result.skipped} skipped`, data: result });
  } catch (err) {
    const reason = err.code === "ECONNABORTED" ? "ML service timeout" : err.message;
    console.error(`[hotspot] POST trigger failed — ${reason}`);
    res.status(502).json({ success: false, message: `Hotspot check failed: ${reason}` });
  }
});

app.get("/api/admin/hotspot-alerts", verifyAdmin, async (req, res) => {
  try {
    const alerts = await HotspotAlert.find({ isResolved: false }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error("[hotspot-get]", err);
    res.status(500).json({ success: false, message: "Failed to fetch hotspot alerts" });
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
    if (status && status !== "All") filter.status = status;
    if (priority && priority !== "All") filter.priority = priority === "Critical" ? { $in: ["Critical", "Immediate"] } : priority;
    if (category && category !== "All") {
      const knownCats = ["Electricity", "Garbage", "Pollution", "Public Transport", "Roads", "Sanitation", "Stray Animals", "Water"];
      filter.category = category === "Others" ? { $nin: knownCats } : category;
    }
    if (area) filter.area = { $regex: area, $options: "i" };
    if (search) filter.description = { $regex: search, $options: "i" };

    const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, priority: { priorityScore: -1, createdAt: -1 } };
    const rawLimit = parseInt(limit, 10);
    const fetchAll = rawLimit === 0;                       // limit=0 → return everything
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = fetchAll ? 0 : Math.min(5000, rawLimit || 50);
    const skip = fetchAll ? 0 : (pageNum - 1) * limitNum;

    const baseQuery = Grievance.find(filter).sort(sortMap[sort] ?? sortMap.newest).select("-__v").lean();
    const [grievances, total] = await Promise.all([
      fetchAll ? baseQuery : baseQuery.skip(skip).limit(limitNum),
      Grievance.countDocuments(filter),
    ]);

    res.json({ success: true, data: grievances, pagination: { total, page: pageNum, limit: fetchAll ? total : limitNum, pages: fetchAll ? 1 : Math.ceil(total / limitNum), hasNext: fetchAll ? false : pageNum < Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error("[GET /api/grievances]", err);
    res.status(500).json({ success: false, message: "Failed to fetch grievances" });
  }
});

app.get("/api/grievances/stats/summary", verifyAdmin, async (req, res) => {
  try {
    const notSpam = { $match: { status: { $ne: "Spam" } } };
    const [statusStats, priorityStats, categoryStats, recentTrend, total, spam] = await Promise.all([
      Grievance.aggregate([notSpam, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Grievance.aggregate([notSpam, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Grievance.aggregate([notSpam, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Grievance.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86_400_000) }, status: { $ne: "Spam" } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Grievance.countDocuments({ status: { $ne: "Spam" } }),
      Grievance.countDocuments({ status: "Spam" }),
    ]);

    const toObj = (arr) => Object.fromEntries(arr.map(({ _id, count }) => [_id, count]));
    const statusObj = toObj(statusStats);

    res.json({
      success: true,
      data: {
        total, spam,
        status: statusObj,
        priority: toObj(priorityStats),
        categories: categoryStats.map(({ _id, count }) => ({ name: _id, count })),
        trend: recentTrend.map(({ _id, count }) => ({ date: _id, count })),
        resolvedPct: total ? Math.round(((statusObj.Resolved || 0) / total) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("[stats/summary]", err);
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
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch grievance" });
  }
});

app.post(
  "/api/grievances/submit",
  verifyCitizen,
  grievanceUpload.fields([{ name: "image", maxCount: 1 }, { name: "audio", maxCount: 1 }]),
  async (req, res) => {
    try {
      const userEmail = req.user.email;
      const citizenName = req.user.name || "Anonymous";
      const imageUrl = req.files?.image?.[0]?.path || null;
      const audioUrl = req.files?.audio?.[0]?.path || null;

      // Call AI service
      let aiPrediction;
      try {
        const predRes = await fetch(`${FLASK_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: req.body.textInput || req.body.description || "",
            area: req.body.area || "",
            citizenName,
            hasImage: !!imageUrl,
            hasAudio: !!audioUrl,
            explain: true,
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!predRes.ok) {
          const detail = await predRes.text();
          return res.status(502).json({ success: false, message: "AI prediction service error.", detail });
        }
        aiPrediction = await predRes.json();
      } catch (predErr) {
        console.error("⚠️ AI Service Error:", predErr.message);
        return res.status(503).json({ success: false, message: "AI prediction service unavailable.", detail: predErr.message });
      }

      const location = req.body.latitude && req.body.longitude
        ? { type: "Point", coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)] }
        : undefined;

      const grievance = await Grievance.create({
        citizenName,
        userEmail,
        area: req.body.area,
        description: req.body.textInput || req.body.description || "Media Evidence Submitted",
        status: "Pending",

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

        imageUrl, audioUrl, location,
      });

      res.status(201).json({
        success: true,
        data: grievance,
        prediction: {
          category: aiPrediction.category,
          categoryConfidence: aiPrediction.category_confidence,
          urgency: aiPrediction.urgency,
          urgencyConfidence: aiPrediction.urgency_confidence,
          priorityScore: aiPrediction.priority_score,
          language: aiPrediction.language,
        },
      });
    } catch (err) {
      console.error("[POST /api/grievances/submit]", err);
      res.status(500).json({ success: false, message: "Failed to submit grievance", error: err.message });
    }
  }
);

app.put("/api/grievances/:id", verifyAdmin, async (req, res) => {
  try {
    const ALLOWED = ["status", "adminReply", "estimatedTime", "priority", "category"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: "No valid fields to update" });
    const updated = await Grievance.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).select("-__v");
    if (!updated) return res.status(404).json({ success: false, message: "Grievance not found" });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

app.delete("/api/grievances/:id", verifyAdmin, async (req, res) => {
  try {
    const deleted = await Grievance.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Grievance not found" });

    // Fire-and-forget Cloudinary cleanup
    const rmImage = deleted.imageUrl ? cloudinary.uploader.destroy(`civic_connect/images/${extractCloudinaryPublicId(deleted.imageUrl)}`).catch(() => { }) : null;
    const rmAudio = deleted.audioUrl ? cloudinary.uploader.destroy(`civic_connect/audio/${extractCloudinaryPublicId(deleted.audioUrl)}`, { resource_type: "video" }).catch(() => { }) : null;
    await Promise.allSettled([rmImage, rmAudio].filter(Boolean));

    res.json({ success: true, message: "Grievance permanently deleted" });
  } catch {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

// =================================================
// 👥 ADMIN USER MANAGEMENT
// =================================================
app.get("/api/admin/users", verifyAdmin, async (req, res) => {
  try {
    const { role, search, page = "1", limit = "30" } = req.query;
    const filter = {};
    if (role && role !== "All") filter.role = role;
    if (search) filter.$or = [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10) || 30);

    const [users, total] = await Promise.all([
      User.find(filter).select("-password -__v").sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

app.delete("/api/admin/users/:id", verifyAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

// =================================================
// 🛑 ERROR HANDLERS (must be last)
// =================================================
app.use((err, _req, res, _next) => {
  console.error("[Unhandled Error]", err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// =================================================
// 🚀 START
// =================================================
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));