const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actor: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: 'System' },
    role: { type: String, default: 'system' },
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  entity: {
    type: String,
    required: true,
    index: true,
  },
  entityId: {
    type: String,
    default: null,
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  ip: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
