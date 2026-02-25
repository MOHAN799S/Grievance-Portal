const mongoose = require('mongoose');


// ===============================
// 🔹 TOKEN SUB-SCHEMA
// ===============================
const TokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    trim: true
  },
  impact: {
    type: Number,
    required: true
  }
}, { _id: false });


// ===============================
// 🔹 EXPLANATION SUB-SCHEMA
// ===============================
const ExplanationSchema = new mongoose.Schema({
  finalReason: {
    type: String,
    default: null
  },
  prioritySummary: {
    type: String,
    default: null
  },
  categoryDecision: {
    type: String,
    default: null
  },
  urgencyDecision: {
    type: String,
    default: null
  },
  categoryTokens: {
    type: [TokenSchema],
    default: []
  },
  urgencyTokens: {
    type: [TokenSchema],
    default: []
  }
}, { _id: false });


// ===============================
// 🔹 MAIN GRIEVANCE SCHEMA
// ===============================
const GrievanceSchema = new mongoose.Schema({

  // 👤 CITIZEN INFO
  citizenName: {
    type: String,
    default: "Anonymous",
    trim: true
  },

  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  // 📝 GRIEVANCE DETAILS
  description: {
    type: String,
    default: "Media Evidence Submitted",
    trim: true
  },

  area: {
    type: String,
    required: true,
    trim: true
  },

  status: {
    type: String,
    enum: ['Pending', 'Resolved', 'Spam'],
    default: 'Pending'
  },

  // 🤖 AI CLASSIFICATION
  category: {
    type: String,
    default: 'Other'
  },

  categoryConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },

  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: null
  },

  urgency: {
    type: String, // e.g. "urgent", "non-urgent"
    default: null
  },

  urgencyConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },

  priorityScore: {
    type: Number, // 0.0 - 1.0
    min: 0,
    max: 1,
    default: null
  },

  language: {
    type: String,
    default: null
  },

  // 🧠 AI EXPLANATION
  explanation: {
    type: ExplanationSchema,
    default: {}
  },

  // 📎 MEDIA
  imageUrl: {
    type: String,
    default: null
  },

  audioUrl: {
    type: String,
    default: null
  },

  // 📍 LOCATION (GeoJSON for production-ready geospatial queries)
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    }
  },

  // 🛠️ ADMIN
  adminReply: {
    type: String,
    default: null
  },

  estimatedTime: {
    type: String,
    default: null
  }

}, {
  timestamps: true // Automatically adds createdAt & updatedAt
});


// ===============================
// 🔹 INDEXES (IMPORTANT 🚀)
// ===============================

// Geo index for map-based queries
GrievanceSchema.index({ location: "2dsphere" },{sparse: true });

// Faster filtering
GrievanceSchema.index({ status: 1 });
GrievanceSchema.index({ priority: 1 });
GrievanceSchema.index({ createdAt: -1 });


// ===============================
module.exports = mongoose.model('Grievance', GrievanceSchema);