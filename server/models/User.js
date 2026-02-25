const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Personal Details
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hash with bcrypt
  mobileNumber: { type: String, required: true, unique: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  aadhaarNumber: { type: String, required: true, unique: true },
  occupation: { type: String },
  
  // Address Details
  address: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  
  // Account Details
  role: {
    type: String,
    enum: ['citizen', 'admin'],
    default: 'citizen'
  },
  isVerified: { type: Boolean, default: false }, // OTP verification status
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function () {
  this.updatedAt = Date.now();
});


module.exports = mongoose.model('User', UserSchema);