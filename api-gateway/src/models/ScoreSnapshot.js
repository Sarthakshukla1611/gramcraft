const mongoose = require('mongoose');

const ScoreSnapshotSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true,
  },
  quarter: {
    type: String, // e.g. "2026-Q3"
    required: true,
    index: true,
  },
  sectors: {
    sanitation: { type: Number, required: true },
    water: { type: Number, required: true },
    education: { type: Number, required: true },
    roads: { type: Number, required: true },
    electricity: { type: Number, required: true },
    healthcare: { type: Number, required: true },
  },
  overallScore: {
    type: Number,
    required: true,
  },
  source: {
    type: String,
    enum: ['quarterly_close', 'verified_update', 'seed', 'manual'],
    default: 'quarterly_close',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ScoreSnapshotSchema.index({ villageId: 1, quarter: 1 }, { unique: true });

module.exports = mongoose.model('ScoreSnapshot', ScoreSnapshotSchema);
