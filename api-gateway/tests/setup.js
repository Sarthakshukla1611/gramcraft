const mongoose = require('mongoose');
const AuditLog = require('../src/models/AuditLog');
const SystemSetting = require('../src/models/SystemSetting');
const Achievement = require('../src/models/Achievement');
const Mission = require('../src/models/Mission');

// Disable buffering so tests don't wait on unneeded DB connections
mongoose.set('bufferCommands', false);

beforeEach(() => {
  jest.spyOn(AuditLog, 'create').mockResolvedValue({});
  jest.spyOn(SystemSetting, 'findOne').mockResolvedValue({
    gamificationValues: { approvalJumpThreshold: 10 },
    weights: {
      sanitation: 1 / 6,
      water: 1 / 6,
      education: 1 / 6,
      roads: 1 / 6,
      electricity: 1 / 6,
      healthcare: 1 / 6,
    },
    thresholds: { critical: 35, priority: 50, watch: 65, modelVillage: 80 },
  });
  jest.spyOn(Achievement, 'find').mockResolvedValue([]);
  jest.spyOn(Achievement, 'create').mockResolvedValue({});
  jest.spyOn(Mission, 'find').mockResolvedValue([]);
});
