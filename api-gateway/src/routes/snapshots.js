const express = require('express');
const ScoreSnapshot = require('../models/ScoreSnapshot');
const Village = require('../models/Village');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// GET /api/villages/:id/snapshots
router.get('/villages/:id/snapshots', optionalAuth, async (req, res) => {
  try {
    const snapshots = await ScoreSnapshot.find({ villageId: req.params.id }).sort({ quarter: 1 });
    return res.json({ success: true, count: snapshots.length, data: snapshots });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch score snapshots' });
  }
});

// POST /api/snapshots/close-quarter
router.post(
  '/snapshots/close-quarter',
  authenticate,
  requireRole('admin', 'district_officer'),
  async (req, res) => {
    try {
      const { quarter = '2026-Q4' } = req.body;
      const villages = await Village.find();

      const createdSnapshots = [];
      for (const v of villages) {
        const sectorScores = {
          sanitation: v.sectors.sanitation.score,
          water: v.sectors.water.score,
          education: v.sectors.education.score,
          roads: v.sectors.roads.score,
          electricity: v.sectors.electricity.score,
          healthcare: v.sectors.healthcare.score,
        };

        const snapshot = await ScoreSnapshot.findOneAndUpdate(
          { villageId: v._id, quarter },
          {
            sectors: sectorScores,
            overallScore: v.overallScore,
            source: 'quarterly_close',
          },
          { upsert: true, new: true }
        );
        createdSnapshots.push(snapshot);
      }

      await logAudit(
        req,
        'QUARTER_CLOSED',
        'ScoreSnapshot',
        null,
        null,
        { quarter, snapshotsCount: createdSnapshots.length }
      );

      return res.json({
        success: true,
        message: `Quarter ${quarter} closed successfully for ${createdSnapshots.length} villages.`,
        data: {
          quarter,
          count: createdSnapshots.length,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
