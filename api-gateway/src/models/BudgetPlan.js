const mongoose = require('mongoose');

const AllocationSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
  },
  villageName: {
    type: String,
    required: true,
  },
  sector: {
    type: String,
    enum: ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare', 'unallocated'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  locked: {
    type: Boolean,
    default: false,
  },
  expectedGain: {
    type: Number,
    default: 0,
  },
}, { _id: false });

const BudgetPlanSchema = new mongoose.Schema({
  blockId: {
    type: String,
    required: [true, 'Block ID is required'],
    index: true,
  },
  district: {
    type: String,
    default: 'Sehore',
  },
  total: {
    type: Number,
    required: [true, 'Total budget amount is required'],
    min: 0,
  },
  scenarioName: {
    type: String,
    required: [true, 'Scenario name is required'],
    trim: true,
  },
  allocations: [AllocationSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['draft', 'approved', 'applied'],
    default: 'draft',
  },
  assumptions: {
    type: String,
    default: 'Diminishing marginal returns model with elasticity alpha=0.55. Output is simulated and requires calibration with real outcome data.',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('BudgetPlan', BudgetPlanSchema);
