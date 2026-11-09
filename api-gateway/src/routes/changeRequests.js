const express = require('express');
const ChangeRequest = require('../models/ChangeRequest');
const Village = require('../models/Village');
const {
  authenticate,
  optionalAuth,
  requireRole,
} = require('../middleware/auth');
const {
  validateBody,
  changeRequestSchema,
  changeRequestReviewSchema,
} = require('../utils/validators');
const { getVillageScore } = require('../services/mlClient');
const { logAudit } = require('../utils/audit');
const { evaluateBadgesForVillage } = require('../services/gamification');

const router = express.Router();

// GET /api/change-requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, villageId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (villageId) filter.villageId = villageId;

    const requests = await ChangeRequest.find(filter)
      .populate('villageId', 'name code block district')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch change requests' });
  }
});

// POST /api/change-requests
router.post(
  '/',
  authenticate,
  validateBody(changeRequestSchema),
  async (req, res) => {
    try {
      const { villageId, sector, oldValue, newValue, note, evidence } = req.body;
      const village = await Village.findById(villageId);
      if (!village) {
        return res.status(404).json({ success: false, error: 'Village not found' });
      }

      const cr = await ChangeRequest.create({
        villageId,
        sector,
        oldValue,
        newValue,
        note,
        evidence: evidence || null,
        requestedBy: req.user._id,
        status: 'pending',
      });

      await logAudit(req, 'CHANGE_REQUEST_CREATE', 'ChangeRequest', cr._id, null, cr);

      return res.status(201).json({
        success: true,
        message: 'Verification change request created for official review.',
        data: cr,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/change-requests/:id/approve
router.patch(
  '/:id/approve',
  authenticate,
  requireRole('admin', 'district_officer'),
  validateBody(changeRequestReviewSchema),
  async (req, res) => {
    try {
      const cr = await ChangeRequest.findById(req.params.id);
      if (!cr) {
        return res.status(404).json({ success: false, error: 'Change request not found' });
      }

      if (cr.status !== 'pending') {
        return res.status(400).json({ success: false, error: `Request already has status '${cr.status}'` });
      }

      const village = await Village.findById(cr.villageId);
      if (!village) {
        return res.status(404).json({ success: false, error: 'Target village not found' });
      }

      const beforeState = JSON.parse(JSON.stringify(village));

      // Apply verified score update
      village.sectors[cr.sector].score = cr.newValue;
      village.sectors[cr.sector].lastUpdated = new Date();
      village.sectors[cr.sector].updatedBy = cr.requestedBy;

      // Recalculate overall score and level
      const scoreInfo = await getVillageScore(village.sectors);
      village.overallScore = scoreInfo.overall_score;
      village.level = scoreInfo.tier;
      village.lastVerifiedAt = new Date();

      // Integrity rule: verified changes award XP
      village.xp += 50;
      await village.save();

      // Update badge statuses
      await evaluateBadgesForVillage(village);

      // Update change request record
      cr.status = 'approved';
      cr.reviewedBy = req.user._id;
      cr.reviewNote = req.body.reviewNote || 'Approved after evidence review.';
      cr.reviewedAt = new Date();
      await cr.save();

      await logAudit(
        req,
        'CHANGE_REQUEST_APPROVED',
        'ChangeRequest',
        cr._id,
        beforeState,
        village
      );

      return res.json({
        success: true,
        message: `Change request approved. ${village.name}'s ${cr.sector} score updated to ${cr.newValue}.`,
        data: {
          changeRequest: cr,
          village,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/change-requests/:id/reject
router.patch(
  '/:id/reject',
  authenticate,
  requireRole('admin', 'district_officer'),
  validateBody(changeRequestReviewSchema),
  async (req, res) => {
    try {
      const cr = await ChangeRequest.findById(req.params.id);
      if (!cr) {
        return res.status(404).json({ success: false, error: 'Change request not found' });
      }

      if (cr.status !== 'pending') {
        return res.status(400).json({ success: false, error: `Request already has status '${cr.status}'` });
      }

      cr.status = 'rejected';
      cr.reviewedBy = req.user._id;
      cr.reviewNote = req.body.reviewNote || 'Insufficient evidence or justification.';
      cr.reviewedAt = new Date();
      await cr.save();

      await logAudit(req, 'CHANGE_REQUEST_REJECTED', 'ChangeRequest', cr._id, null, cr);

      return res.json({
        success: true,
        message: 'Change request rejected.',
        data: cr,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
