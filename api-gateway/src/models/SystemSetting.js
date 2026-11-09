const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_config',
  },
  weights: {
    sanitation: { type: Number, default: 1 / 6 },
    water: { type: Number, default: 1 / 6 },
    education: { type: Number, default: 1 / 6 },
    roads: { type: Number, default: 1 / 6 },
    electricity: { type: Number, default: 1 / 6 },
    healthcare: { type: Number, default: 1 / 6 },
  },
  thresholds: {
    critical: { type: Number, default: 35 },
    priority: { type: Number, default: 50 },
    watch: { type: Number, default: 65 },
    modelVillage: { type: Number, default: 80 },
  },
  gamificationValues: {
    missionXpMilestone50: { type: Number, default: 50 },
    missionXpMilestone70: { type: Number, default: 100 },
    missionXpMilestone90: { type: Number, default: 200 },
    badgeThreshold: { type: Number, default: 70 },
    approvalJumpThreshold: { type: Number, default: 10 }, // jumps > 10 require change request
  },
  publicScoreboardEnabled: {
    type: Boolean,
    default: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);
