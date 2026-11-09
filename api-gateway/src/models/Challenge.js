const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['village', 'block'],
    default: 'village',
  },
  entityId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  currentScore: {
    type: Number,
    default: 0,
  },
  startingScore: {
    type: Number,
    default: 0,
  },
  progress: {
    type: Number,
    default: 0,
  },
}, { _id: false });

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  participants: [ParticipantSchema],
  sector: {
    type: String,
    enum: ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'],
    required: true,
  },
  target: {
    type: Number,
    required: [true, 'Target score increase is required'],
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active',
  },
  winner: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
