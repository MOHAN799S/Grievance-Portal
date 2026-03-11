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
  // Populated from:
  //   • text input directly
  //   • aiPrediction.text when input was image-only or audio-only
  //     (Flask returns the extracted / transcribed text in the "text" field)
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

  // 📥 INPUT MODE
  // Tracks how the grievance was submitted so admins / analytics know the source.
  // Values mirror Flask's "input_mode" field:
  //   "text" | "audio" | "image" | "text+image" | "audio+image"
  inputMode: {
    type: String,
    enum: ['text', 'audio', 'image', 'text+image', 'audio+image'],
    default: 'text'
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
    type: String,
    default: null
  },

  urgencyConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },

  priorityScore: {
    type: Number,
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

  // 📍 LOCATION
  // GeoJSON Point — stored when coordinates are provided via req.body
  // AND Flask confirms the evidence image location is "valid" (inside Kakinada),
  // OR when no image is attached (text/audio only, coordinates trusted from client).
  //
  // locationStatus mirrors Flask's "location" field (only present for image evidence):
  //   "valid"   — EXIF GPS confirmed inside Kakinada bounding box
  //   "invalid" — EXIF GPS missing or outside Kakinada
  //   null      — no evidence image was submitted (text / audio only modes)
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],   // [longitude, latitude]
      default: undefined
    }
  },

  locationStatus: {
    type: String,
    enum: ['valid', 'invalid', null],
    default: null
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
  timestamps: true
});


// ===============================
// 🔹 INDEXES
// ===============================
GrievanceSchema.index({ location: "2dsphere" }, { sparse: true });
GrievanceSchema.index({ status: 1 });
GrievanceSchema.index({ priority: 1 });
GrievanceSchema.index({ createdAt: -1 });
GrievanceSchema.index({ locationStatus: 1 });   // filter verified-location grievances
GrievanceSchema.index({ inputMode: 1 });         // analytics by submission channel


// ===============================
module.exports = mongoose.model('Grievance', GrievanceSchema);