const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: String,
  mobileNumber: String,
  otp: String,
  expiresAt: Date,
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Otp", otpSchema);
