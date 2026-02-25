const express = require("express");
const bcrypt = require("bcryptjs");
const { resend } = require("../config/resend");
const Otp = require("../models/Otp");
const User = require("../models/User");
const { issueTokens } = require("../utils/jwt");
const { generateOTP } = require("../utils/generateOTP");

const router = express.Router();

// =================================================
// 🔑 SEND OTP
// =================================================
router.post("/send-otp", async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;

    if (!email || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Email & mobile required",
      });
    }

    const otp = generateOTP();

    await Otp.findOneAndDelete({ email });

    await Otp.create({
      email,
      mobileNumber,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    // ✅ RESEND EMAIL
    await resend.emails.send({
      from: "Civic Connect GKMC <noreply@yourdomain.com>",
      to: email,
      subject: "OTP Verification – Civic Connect",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#111827">Your Verification Code</h2>
          <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1d4ed8;padding:20px 0">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:13px">
            Expires in <strong>5 minutes</strong>. Do not share this code.
          </p>
        </div>
      `,
    });

    return res.json({ success: true, message: "OTP sent successfully" });

  } catch (err) {
    console.error("[send-otp]", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

// =================================================
// 🔑 VERIFY OTP
// =================================================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, userData } = req.body;

    if (!email || !otp || !userData) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const record = await Otp.findOne({ email });

    if (!record)
      return res.json({ success: false, message: "OTP not found or expired" });

    if (new Date() > record.expiresAt)
      return res.json({ success: false, message: "OTP expired" });

    if (record.otp !== otp)
      return res.json({ success: false, message: "Invalid OTP" });

    if (await User.exists({ email }))
      return res.json({
        success: false,
        message: "User already exists. Please login.",
      });

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const newUser = await User.create({
      ...userData,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "citizen",
    });

    await Otp.deleteOne({ email });

    const { token, refreshToken } = issueTokens(res, newUser);

    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      refreshToken,
      user: userObj,
    });

  } catch (err) {
    console.error("[verify-otp]", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;