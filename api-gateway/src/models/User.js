const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  role: {
    type: String,
    enum: ['admin', 'district_officer', 'block_planner', 'village_officer', 'viewer'],
    default: 'viewer',
    required: true,
  },
  scope: {
    district: { type: String, default: null },
    block: { type: String, default: null },
    villageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Village' }],
  },
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
