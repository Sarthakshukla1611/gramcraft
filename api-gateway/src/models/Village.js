const mongoose = require('mongoose');

const SectorDetailSchema = new mongoose.Schema({
  score: {
    type: Number,
    required: true,
    min: [0, 'Score cannot be negative'],
    max: [100, 'Score cannot exceed 100'],
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { _id: false });

const VillageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Village name is required'],
    trim: true,
    index: true,
  },
  code: {
    type: String,
    required: [true, 'Village census code is required'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    trim: true,
    index: true,
  },
  block: {
    type: String,
    required: [true, 'Block is required'],
    trim: true,
    index: true,
  },
  state: {
    type: String,
    default: 'Madhya Pradesh',
    trim: true,
  },
  population: {
    type: Number,
    required: [true, 'Population is required'],
    min: [0, 'Population cannot be negative'],
  },
  households: {
    type: Number,
    required: [true, 'Households count is required'],
    min: [0, 'Households cannot be negative'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: function(coords) {
          if (!Array.isArray(coords) || coords.length !== 2) return false;
          const [lng, lat] = coords;
          // Valid India bounds: lng 68.0 to 97.5, lat 8.0 to 37.5
          return lng >= 68.0 && lng <= 97.5 && lat >= 8.0 && lat <= 37.5;
        },
        message: 'Coordinates must be valid India bounds (lng 68.0-97.5, lat 8.0-37.5)',
      },
    },
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  sectors: {
    sanitation: { type: SectorDetailSchema, default: () => ({ score: 50 }) },
    water: { type: SectorDetailSchema, default: () => ({ score: 50 }) },
    education: { type: SectorDetailSchema, default: () => ({ score: 50 }) },
    roads: { type: SectorDetailSchema, default: () => ({ score: 50 }) },
    electricity: { type: SectorDetailSchema, default: () => ({ score: 50 }) },
    healthcare: { type: SectorDetailSchema, default: () => ({ score: 50 }) },
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },
  level: {
    type: String,
    enum: ['Seedling', 'Sprout', 'Growing', 'Thriving', 'Model Village'],
    default: 'Growing',
  },
  xp: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastVerifiedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

VillageSchema.index({ location: '2dsphere' });
VillageSchema.index({ district: 1, block: 1 });
VillageSchema.index({ overallScore: -1 });

module.exports = mongoose.model('Village', VillageSchema);
