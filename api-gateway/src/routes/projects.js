const express = require('express');
const Project = require('../models/Project');
const Village = require('../models/Village');
const ChangeRequest = require('../models/ChangeRequest');
const {
  authenticate,
  optionalAuth,
  requireRole,
  enforceVillageScope,
} = require('../middleware/auth');
const {
  validateBody,
  projectCreateSchema,
  projectStatusSchema,
} = require('../utils/validators');
const { logAudit } = require('../utils/audit');
const { evaluateBadgesForVillage } = require('../services/gamification');

const router = express.Router();

// GET /api/projects
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { villageId, sector, status, block } = req.query;
    const filter = {};

    if (villageId) filter.villageId = villageId;
    if (sector) filter.sector = sector;
    if (status) filter.status = status;

    if (block) {
      const villagesInBlock = await Village.find({ block }).select('_id');
      filter.villageId = { $in: villagesInBlock.map(v => v._id) };
    }

    const projects = await Project.find(filter)
      .populate('villageId', 'name code block district')
      .sort({ dueDate: 1 });

    return res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('villageId', 'name code block district');
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    return res.json({ success: true, data: project });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/projects
router.post(
  '/',
  authenticate,
  enforceVillageScope,
  validateBody(projectCreateSchema),
  async (req, res) => {
    try {
      const { villageId, title, sector, budget, spent, startDate, dueDate, assignee, notes } = req.body;

      const project = await Project.create({
        villageId,
        title,
        sector,
        budget,
        spent: spent || 0,
        startDate: new Date(startDate),
        dueDate: new Date(dueDate),
        assignee: assignee || 'Gram Panchayat Officer',
        notes: notes || '',
        status: 'planned',
      });

      await logAudit(req, 'PROJECT_CREATE', 'Project', project._id, null, project);

      return res.status(201).json({ success: true, data: project });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/projects/:id
router.put(
  '/:id',
  authenticate,
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const before = JSON.parse(JSON.stringify(project));
      const allowed = ['title', 'budget', 'spent', 'startDate', 'dueDate', 'assignee', 'notes', 'evidence'];
      allowed.forEach(field => {
        if (req.body[field] !== undefined) project[field] = req.body[field];
      });

      await project.save();
      await logAudit(req, 'PROJECT_UPDATE', 'Project', project._id, before, project);

      return res.json({ success: true, data: project });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/projects/:id/status
router.patch(
  '/:id/status',
  authenticate,
  validateBody(projectStatusSchema),
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const village = await Village.findById(project.villageId);
      const { status, notes, evidence } = req.body;
      const oldStatus = project.status;
      project.status = status;
      if (notes) project.notes = notes;
      if (evidence && Array.isArray(evidence)) {
        project.evidence = [...(project.evidence || []), ...evidence];
      }

      // If completing a project:
      // "Completing a verified project updates the related sector score through a reviewed change, not silently."
      let changeRequestCreated = null;
      if (status === 'completed' && oldStatus !== 'completed' && village) {
        project.spent = project.budget; // Mark budget fully spent
        const oldSectorScore = village.sectors[project.sector]?.score || 50;
        const projectedGain = Math.min(10, Math.max(3, Math.round((project.budget / 100000) * 1.5)));
        const newSectorScore = Math.min(100, oldSectorScore + projectedGain);

        if (['admin', 'district_officer'].includes(req.user.role)) {
          // Direct verified review applied
          village.sectors[project.sector].score = newSectorScore;
          village.sectors[project.sector].lastUpdated = new Date();
          village.sectors[project.sector].updatedBy = req.user._id;
          village.xp += 50; // Completion XP bonus
          await village.save();
          await evaluateBadgesForVillage(village);
        } else {
          // Creates a reviewed change request
          changeRequestCreated = await ChangeRequest.create({
            villageId: village._id,
            sector: project.sector,
            oldValue: oldSectorScore,
            newValue: newSectorScore,
            note: `Project '${project.title}' completed. Requested sector score increase of +${projectedGain} points based on field delivery.`,
            evidence: project.evidence?.[0] || null,
            requestedBy: req.user._id,
            status: 'pending',
          });
        }
      }

      await project.save();
      await logAudit(
        req,
        'PROJECT_STATUS_UPDATE',
        'Project',
        project._id,
        { status: oldStatus },
        { status, changeRequestId: changeRequestCreated?._id }
      );

      return res.json({
        success: true,
        data: project,
        changeRequest: changeRequestCreated,
        message: changeRequestCreated
          ? 'Project marked completed. Sector score update submitted for review.'
          : 'Project status updated successfully.',
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/projects/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'district_officer'),
  async (req, res) => {
    try {
      const project = await Project.findByIdAndDelete(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      await logAudit(req, 'PROJECT_DELETE', 'Project', project._id, project, null);
      return res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
