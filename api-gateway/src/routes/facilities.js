const express = require('express');
const Facility = require('../models/Facility');
const Village = require('../models/Village');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// GET /api/facilities
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { villageId, type, block, bbox } = req.query;
    const filter = {};

    if (villageId) filter.villageId = villageId;
    if (type) filter.type = type;
    if (block) filter.block = block;

    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        filter.location = {
          $geoWithin: {
            $box: [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
          },
        };
      }
    }

    const facilities = await Facility.find(filter)
      .populate('villageId', 'name code block')
      .limit(200);

    return res.json({ success: true, count: facilities.length, data: facilities });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch facilities' });
  }
});

// POST /api/facilities (supports mobile data entry with GPS lat/lng)
router.post(
  '/',
  authenticate,
  async (req, res) => {
    try {
      const { type, name, lat, lng, villageId, operationalStatus } = req.body;

      if (!type || !name || !lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'type, name, lat, and lng are required',
        });
      }

      // Check India bounds
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (numLat < 8.0 || numLat > 37.5 || numLng < 68.0 || numLng > 97.5) {
        return res.status(400).json({
          success: false,
          error: 'Coordinates must be valid India bounds (lng 68.0-97.5, lat 8.0-37.5)',
        });
      }

      let block = null;
      if (villageId) {
        const v = await Village.findById(villageId);
        if (v) block = v.block;
      }

      const facility = await Facility.create({
        type,
        name,
        location: {
          type: 'Point',
          coordinates: [numLng, numLat],
        },
        villageId: villageId || null,
        block,
        operationalStatus: operationalStatus || 'functional',
      });

      await logAudit(req, 'FACILITY_CREATE', 'Facility', facility._id, null, facility);

      return res.status(201).json({ success: true, data: facility });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
