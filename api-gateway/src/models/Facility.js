const mongoose = require('mongoose');

const FacilitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['school', 'health centre', 'water source'],
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Facility name is required'],
    trim: true,
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
    },
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true,
  },
  block: {
    type: String,
    index: true,
  },
  operationalStatus: {
    type: String,
    enum: ['functional', 'partial', 'non_functional'],
    default: 'functional',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

FacilitySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Facility', FacilitySchema);
