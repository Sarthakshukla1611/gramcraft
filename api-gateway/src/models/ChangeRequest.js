const mongoose = require('mongoose');

const ChangeRequestSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true,
  },
  sector: {
    type: String,
    enum: ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'],
    required: true,
  },
  oldValue: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  newValue: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  note: {
    type: String,
    required: [true, 'Verification note / rationale is required'],
    trim: true,
  },
  evidence: {
    type: String, // file url/path
    default: null,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewNote: {
    type: String,
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ChangeRequest', ChangeRequestSchema);
