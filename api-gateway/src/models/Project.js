const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: [true, 'Village ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
  },
  sector: {
    type: String,
    enum: ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'],
    required: [true, 'Sector is required'],
    index: true,
  },
  status: {
    type: String,
    enum: ['planned', 'approved', 'in_progress', 'completed', 'delayed'],
    default: 'planned',
    index: true,
  },
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [0, 'Budget cannot be negative'],
  },
  spent: {
    type: Number,
    default: 0,
    min: [0, 'Spent amount cannot be negative'],
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  assignee: {
    type: String,
    default: 'Gram Panchayat Officer',
    trim: true,
  },
  evidence: [{
    type: String, // file urls or paths
  }],
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Project', ProjectSchema);
