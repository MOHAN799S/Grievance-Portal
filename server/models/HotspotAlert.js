const mongoose = require("mongoose");

const hotspotAlertSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    area: {
      type:     String,
      required: true,
      lowercase: true,
      trim:     true,
      index:    true,
    },

    category: {
      type:     String,
      required: true,
      lowercase: true,
      trim:     true,
      index:    true,
    },

    // ── Risk metrics ────────────────────────────────────────────────────────
    riskScore: {
      type:     Number,
      required: true,
      min:      0,
      max:      100,
      index:    true,
    },

    level: {
      type:     String,
      enum:     ["Low", "Medium", "High", "Critical"],
      required: true,
      index:    true,
    },

    growthPercent: {
      type:    Number,
      default: 0,
    },

    // ── Forecast config (mirrors what was sent to Flask) ────────────────────
    sourceWindowDays: {
      type:    Number,
      default: 45,   // days of history used for the forecast
    },

    forecastHorizonDays: {
      type:    Number,
      default: 7,    // days ahead that were forecast
    },

    confidenceScore: {
      type:    Number,
      min:     0,
      max:     1,
      default: 0.75,
    },

    // ── Full raw Flask response (for audit / replay) ─────────────────────────
    // Stored as Mixed so any shape Flask returns is preserved without schema drift.
    flaskSnapshot: {
      type:    mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Resolution ──────────────────────────────────────────────────────────
    isResolved: {
      type:    Boolean,
      default: false,
      index:   true,
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,   // adds createdAt + updatedAt automatically
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Fast lookup for "is this area+category already open?"
hotspotAlertSchema.index({ area: 1, category: 1, isResolved: 1 });

// Fast dashboard query: latest unresolved alerts sorted by risk
hotspotAlertSchema.index({ isResolved: 1, riskScore: -1, createdAt: -1 });

module.exports = mongoose.model("HotspotAlert", hotspotAlertSchema);