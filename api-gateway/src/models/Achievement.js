const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null,
  },
  badgeKey: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: 'award',
  },
  earnedAt: {
    type: Date,
    default: Date.now,
  },
  atRisk: {
    type: Boolean,
    default: false,
  },
});

AchievementSchema.index({ villageId: 1, badgeKey: 1 });
AchievementSchema.index({ userId: 1, badgeKey: 1 });

module.exports = mongoose.model('Achievement', AchievementSchema);
