const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema({
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
  milestone: {
    type: Number,
    enum: [50, 70, 90],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['locked', 'available', 'completed', 'claimed'],
    default: 'available',
    index: true,
  },
  rewardXp: {
    type: Number,
    default: 100,
  },
  tokenBonus: {
    type: Number,
    default: 25000, // Token budget unlock representation
  },
  claimedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

MissionSchema.index({ villageId: 1, sector: 1, milestone: 1 }, { unique: true });

module.exports = mongoose.model('Mission', MissionSchema);
