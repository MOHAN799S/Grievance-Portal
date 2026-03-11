const mongoose = require("mongoose");

const hotspotAlertSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    area: {
      type:      String,
      required:  true,
      lowercase: true,
      trim:      true,
      index:     true,
    },

    category: {
      type:      String,
      required:  true,
      lowercase: true,
      trim:      true,
      enum:      ["electricity", "garbage", "pollution", "public transport",
                  "roads", "sanitation", "stray animals", "water"],
      index:     true,
    },

    // ── Risk metrics ──────────────────────────────────────────────────────────
    riskScore: {
      type:     Number,
      required: true,
      min:      0,
      max:      100,       // sigmoid-normalised on Flask side — always in range
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
      min:     -500,       // clamped on Flask side — guards against ±Infinity
      max:      500,
    },

    // ── Forecast config (mirrors what was sent to / returned from Flask) ──────
    sourceWindowDays: {
      type:    Number,
      default: 45,         // days of history fed to Prophet
    },

    forecastHorizonDays: {
      type:     Number,
      required: true,      // always returned by updated Flask endpoint
    },

    confidenceScore: {
      type:    Number,
      min:     0,
      max:     1,          // derived from Prophet yhat interval width
      required: true,
    },

    // ── Full raw Flask response (for audit / replay) ──────────────────────────
    // Stored as Mixed so any shape Flask returns is preserved without schema drift.
    flaskSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Resolution ────────────────────────────────────────────────────────────
    isResolved: {
      type:    Boolean,
      default: false,
      index:   true,
    },

    resolvedAt: {
      type:      Date,
      default:   null,
      validate: {
        validator: function (v) {
          // resolvedAt must only be set when isResolved is true
          return !v || this.isResolved;
        },
        message: "resolvedAt can only be set when isResolved is true.",
      },
    },
  },
  {
    timestamps: true,   // createdAt + updatedAt
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Fast lookup: "is this area+category already open?"
hotspotAlertSchema.index({ area: 1, category: 1, isResolved: 1 });

// Fast dashboard query: latest unresolved alerts sorted by risk
hotspotAlertSchema.index({ isResolved: 1, riskScore: -1, createdAt: -1 });

// Fast filtering by level within unresolved alerts
hotspotAlertSchema.index({ isResolved: 1, level: 1, createdAt: -1 });

module.exports = mongoose.model("HotspotAlert", hotspotAlertSchema);