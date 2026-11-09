const express = require('express');
const Village = require('../models/Village');
const ScoreSnapshot = require('../models/ScoreSnapshot');
const ChangeRequest = require('../models/ChangeRequest');
const SystemSetting = require('../models/SystemSetting');
const {
  authenticate,
  optionalAuth,
  requireRole,
  enforceVillageScope,
} = require('../middleware/auth');
const { validateBody, villageUpdateSchema } = require('../utils/validators');
const { getVillageScore } = require('../services/mlClient');
const { logAudit } = require('../utils/audit');
const { evaluateBadgesForVillage } = require('../services/gamification');

const router = express.Router();

// GET /api/villages/meta/blocks
router.get('/meta/blocks', optionalAuth, async (req, res) => {
  try {
    const districts = await Village.distinct('district');
    const blocks = await Village.distinct('block');
    return res.json({ success: true, data: { districts, blocks } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch blocks meta' });
  }
});

// GET /api/villages/near?lat=&lng=&radiusKm=
router.get('/near', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }

    const radiusMeters = Number(radiusKm) * 1000;
    const villages = await Village.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: radiusMeters,
        },
      },
    }).limit(30);

    return res.json({ success: true, count: villages.length, data: villages });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/villages
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      district,
      block,
      tier,
      search,
      bbox,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 100,
    } = req.query;

    const filter = {};

    if (district) filter.district = new RegExp(`^${district}$`, 'i');
    if (block) filter.block = new RegExp(`^${block}$`, 'i');
    if (tier) filter.level = tier;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    // Bounding box filter: minLng,minLat,maxLng,maxLat
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

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [villages, total] = await Promise.all([
      Village.find(filter)
        .sort(sortOptions)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Village.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: villages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve villages' });
  }
});

// GET /api/villages/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const village = await Village.findById(req.params.id);
    if (!village) {
      return res.status(404).json({ success: false, error: 'Village not found' });
    }
    return res.json({ success: true, data: village });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch village' });
  }
});

// POST /api/villages
router.post(
  '/',
  authenticate,
  requireRole('admin', 'district_officer'),
  async (req, res) => {
    try {
      const {
        name,
        code,
        district,
        block,
        state = 'Madhya Pradesh',
        population,
        households,
        lat,
        lng,
        sectors,
      } = req.body;

      if (!name || !code || !district || !block || !lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Name, code, district, block, lat, and lng are required',
        });
      }

      // Check duplicate code
      const existing = await Village.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(409).json({ success: false, error: `Village with code '${code}' already exists` });
      }

      const defaultSectors = {
        sanitation: { score: Number(sectors?.sanitation || 50), lastUpdated: new Date(), updatedBy: req.user._id },
        water: { score: Number(sectors?.water || 50), lastUpdated: new Date(), updatedBy: req.user._id },
        education: { score: Number(sectors?.education || 50), lastUpdated: new Date(), updatedBy: req.user._id },
        roads: { score: Number(sectors?.roads || 50), lastUpdated: new Date(), updatedBy: req.user._id },
        electricity: { score: Number(sectors?.electricity || 50), lastUpdated: new Date(), updatedBy: req.user._id },
        healthcare: { score: Number(sectors?.healthcare || 50), lastUpdated: new Date(), updatedBy: req.user._id },
      };

      const scoreInfo = await getVillageScore(defaultSectors);

      const village = await Village.create({
        name,
        code: code.toUpperCase(),
        district,
        block,
        state,
        population: Number(population) || 1000,
        households: Number(households) || Math.round(Number(population || 1000) / 5),
        location: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        sectors: defaultSectors,
        overallScore: scoreInfo.overall_score,
        level: scoreInfo.tier,
        xp: 100,
        lastVerifiedAt: new Date(),
      });

      await logAudit(req, 'VILLAGE_CREATE', 'Village', village._id, null, village);

      return res.status(201).json({ success: true, data: village });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/villages/:id
router.put(
  '/:id',
  authenticate,
  enforceVillageScope,
  validateBody(villageUpdateSchema),
  async (req, res) => {
    try {
      const village = req.targetVillage || (await Village.findById(req.params.id));
      if (!village) {
        return res.status(404).json({ success: false, error: 'Village not found' });
      }

      const { sectors, population, households, name, note = 'Routine field update', evidence = null } = req.body;
      const settings = (await SystemSetting.findOne({ key: 'global_config' })) || {
        gamificationValues: { approvalJumpThreshold: 10 },
      };
      const jumpThreshold = settings.gamificationValues?.approvalJumpThreshold || 10;

      const beforeState = JSON.parse(JSON.stringify(village));
      const requiresChangeRequests = [];

      // Check sector updates for integrity
      if (sectors) {
        const sectorKeys = ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'];
        for (const sec of sectorKeys) {
          if (sectors[sec] !== undefined) {
            const oldScore = village.sectors[sec]?.score || 0;
            const newScore = Number(sectors[sec]);
            const delta = newScore - oldScore;

            // If user is village_officer or block_planner and jump > threshold, require approval
            if (delta > jumpThreshold && !['admin', 'district_officer'].includes(req.user.role)) {
              requiresChangeRequests.push({
                villageId: village._id,
                sector: sec,
                oldValue: oldScore,
                newValue: newScore,
                note: `${note} (Flagged: +${delta} points exceed ${jumpThreshold} threshold)`,
                evidence,
                requestedBy: req.user._id,
                status: 'pending',
              });
            } else {
              // Direct verified update
              village.sectors[sec].score = newScore;
              village.sectors[sec].lastUpdated = new Date();
              village.sectors[sec].updatedBy = req.user._id;
            }
          }
        }
      }

      // If change requests were generated, create them and notify user
      if (requiresChangeRequests.length > 0) {
        const createdCRs = await ChangeRequest.insertMany(requiresChangeRequests);
        await logAudit(
          req,
          'SCORE_CHANGE_REQUEST_SUBMITTED',
          'ChangeRequest',
          village._id,
          null,
          createdCRs
        );

        return res.status(202).json({
          success: true,
          status: 'pending_approval',
          message: `Score increase exceeds ${jumpThreshold} threshold. A formal change request has been submitted for District Officer review.`,
          changeRequests: createdCRs,
          village,
        });
      }

      // If regular update permitted
      if (population !== undefined) village.population = population;
      if (households !== undefined) village.households = households;
      if (name) village.name = name;

      // Recalculate composite score and tier
      const scoreInfo = await getVillageScore(village.sectors);
      village.overallScore = scoreInfo.overall_score;
      village.level = scoreInfo.tier;
      village.lastVerifiedAt = new Date();

      // Verified changes award planner XP (+25 XP per verified update)
      village.xp += 25;
      await village.save();

      // Check badges / achievements
      await evaluateBadgesForVillage(village);

      await logAudit(req, 'VILLAGE_UPDATE', 'Village', village._id, beforeState, village);

      return res.json({ success: true, data: village });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/villages/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const village = await Village.findByIdAndDelete(req.params.id);
      if (!village) {
        return res.status(404).json({ success: false, error: 'Village not found' });
      }

      await logAudit(req, 'VILLAGE_DELETE', 'Village', village._id, village, null);
      return res.json({ success: true, message: `Village '${village.name}' deleted successfully` });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to delete village' });
    }
  }
);

module.exports = router;
