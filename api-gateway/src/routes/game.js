const express = require('express');
const Mission = require('../models/Mission');
const Achievement = require('../models/Achievement');
const Challenge = require('../models/Challenge');
const Village = require('../models/Village');
const ScoreSnapshot = require('../models/ScoreSnapshot');
const {
  authenticate,
  optionalAuth,
  requireRole,
} = require('../middleware/auth');
const { validateBody, challengeCreateSchema } = require('../utils/validators');
const { logAudit } = require('../utils/audit');
const { BADGE_CONFIG } = require('../services/gamification');

const router = express.Router();

// GET /api/game/missions?villageId=
router.get('/missions', optionalAuth, async (req, res) => {
  try {
    const { villageId } = req.query;
    const filter = {};
    if (villageId) filter.villageId = villageId;

    const missions = await Mission.find(filter).populate('villageId', 'name block overallScore sectors');

    // Sort: available closest to completion first, then completed (unclaimed), then claimed
    const sorted = missions.sort((a, b) => {
      const getPriority = m => {
        if (m.status === 'completed') return 0; // ready to claim
        if (m.status === 'available') {
          const currentScore = m.villageId?.sectors?.[m.sector]?.score || 0;
          return m.milestone - currentScore; // closest gap first
        }
        return 999;
      };
      return getPriority(a) - getPriority(b);
    });

    return res.json({ success: true, count: sorted.length, data: sorted });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch missions' });
  }
});

// POST /api/game/missions/:id/claim
router.post('/missions/:id/claim', authenticate, async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission not found' });
    }

    if (mission.status === 'claimed') {
      return res.status(400).json({ success: false, error: 'Mission has already been claimed' });
    }

    const village = await Village.findById(mission.villageId);
    if (!village) {
      return res.status(404).json({ success: false, error: 'Village not found' });
    }

    // Verify current score meets milestone
    const currentScore = village.sectors[mission.sector]?.score || 0;
    if (currentScore < mission.milestone) {
      return res.status(400).json({
        success: false,
        error: `Sector score (${currentScore}) has not yet reached required milestone (${mission.milestone})`,
      });
    }

    mission.status = 'claimed';
    mission.claimedAt = new Date();
    await mission.save();

    // Reward XP
    village.xp += mission.rewardXp;
    await village.save();

    await logAudit(req, 'MISSION_CLAIM', 'Mission', mission._id, null, {
      villageId: village._id,
      rewardXp: mission.rewardXp,
      tokenBonus: mission.tokenBonus,
    });

    return res.json({
      success: true,
      message: `Mission claimed! +${mission.rewardXp} XP awarded to ${village.name}. ₹${mission.tokenBonus.toLocaleString('en-IN')} token bonus unlocked.`,
      data: {
        mission,
        villageXp: village.xp,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/game/badges?villageId=
router.get('/badges', optionalAuth, async (req, res) => {
  try {
    const { villageId } = req.query;
    let earnedBadges = [];
    let village = null;

    if (villageId) {
      village = await Village.findById(villageId);
      earnedBadges = await Achievement.find({ villageId });
    } else {
      earnedBadges = await Achievement.find({}).limit(50);
    }

    const earnedKeys = new Set(earnedBadges.map(b => b.badgeKey));

    // Full catalog with locked statuses
    const fullCatalog = [
      ...BADGE_CONFIG.map(b => ({
        key: b.key,
        name: b.name,
        description: b.desc,
        sector: b.sector,
        threshold: b.threshold,
        icon: b.icon,
        isEarned: earnedKeys.has(b.key),
        atRisk: earnedBadges.find(x => x.badgeKey === b.key)?.atRisk || false,
        earnedAt: earnedBadges.find(x => x.badgeKey === b.key)?.earnedAt || null,
        currentScore: village ? village.sectors[b.sector]?.score || 0 : null,
      })),
      {
        key: 'balanced_village',
        name: 'Balanced Village',
        description: 'All 6 core development sectors maintain scores of 50 or higher',
        icon: 'scale',
        threshold: 50,
        isEarned: earnedKeys.has('balanced_village'),
        atRisk: earnedBadges.find(x => x.badgeKey === 'balanced_village')?.atRisk || false,
        earnedAt: earnedBadges.find(x => x.badgeKey === 'balanced_village')?.earnedAt || null,
      },
      {
        key: 'model_village_badge',
        name: 'Model Gram Panchayat',
        description: 'Composite overall score of 80 or above across all sectors',
        icon: 'trophy',
        threshold: 80,
        isEarned: earnedKeys.has('model_village_badge'),
        atRisk: earnedBadges.find(x => x.badgeKey === 'model_village_badge')?.atRisk || false,
        earnedAt: earnedBadges.find(x => x.badgeKey === 'model_village_badge')?.earnedAt || null,
      },
      {
        key: 'data_hero',
        name: 'Data Hero',
        description: 'All village sectors updated and verified within the current quarter',
        icon: 'check-circle-2',
        threshold: null,
        isEarned: village ? Boolean(village.lastVerifiedAt && (Date.now() - new Date(village.lastVerifiedAt).getTime() < 90 * 86400000)) : false,
        atRisk: false,
      },
    ];

    return res.json({
      success: true,
      data: {
        earned: earnedBadges,
        catalog: fullCatalog,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

// GET /api/game/leaderboard?scope=&sector=&period=
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { scope = 'district', district = 'Sehore', block, sector, sortBy = 'overall' } = req.query;
    const filter = {};
    if (district) filter.district = new RegExp(`^${district}$`, 'i');
    if (block) filter.block = new RegExp(`^${block}$`, 'i');

    const villages = await Village.find(filter);

    let ranked = villages.map(v => {
      let metric = v.overallScore;
      if (sector && v.sectors[sector]) {
        metric = v.sectors[sector].score;
      }
      return {
        id: v._id,
        name: v.name,
        code: v.code,
        block: v.block,
        district: v.district,
        population: v.population,
        level: v.level,
        xp: v.xp,
        score: metric,
        overallScore: v.overallScore,
        sectors: v.sectors,
      };
    });

    ranked.sort((a, b) => b.score - a.score);

    // Grouping by population peer groups: Small (< 1500), Medium (1500 - 3000), Large (> 3000)
    const peerGroups = {
      small: ranked.filter(v => v.population < 1500).slice(0, 10),
      medium: ranked.filter(v => v.population >= 1500 && v.population <= 3000).slice(0, 10),
      large: ranked.filter(v => v.population > 3000).slice(0, 10),
    };

    return res.json({
      success: true,
      scope,
      sector: sector || 'overall',
      totalCount: ranked.length,
      leaderboard: ranked.map((item, idx) => ({ ...item, rank: idx + 1 })),
      peerGroups,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate leaderboard' });
  }
});

// GET /api/game/challenges
router.get('/challenges', optionalAuth, async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ startDate: -1 });
    return res.json({ success: true, count: challenges.length, data: challenges });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch challenges' });
  }
});

// POST /api/game/challenges
router.post(
  '/challenges',
  authenticate,
  requireRole('admin', 'district_officer', 'block_planner'),
  validateBody(challengeCreateSchema),
  async (req, res) => {
    try {
      const { title, description, participants, sector, target, startDate, endDate } = req.body;

      // Populate starting scores for participants
      const hydratedParticipants = [];
      for (const p of participants) {
        let currentScore = 0;
        if (p.entityType === 'village') {
          const v = await Village.findById(p.entityId);
          currentScore = v?.sectors[sector]?.score || 0;
        } else {
          // Block aggregate
          const vList = await Village.find({ block: p.entityId });
          const sum = vList.reduce((acc, v) => acc + (v.sectors[sector]?.score || 0), 0);
          currentScore = vList.length ? Math.round(sum / vList.length) : 0;
        }

        hydratedParticipants.push({
          entityType: p.entityType,
          entityId: p.entityId,
          name: p.name,
          startingScore: currentScore,
          currentScore,
          progress: 0,
        });
      }

      const challenge = await Challenge.create({
        title,
        description: description || '',
        participants: hydratedParticipants,
        sector,
        target,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'active',
      });

      await logAudit(req, 'CHALLENGE_CREATE', 'Challenge', challenge._id, null, challenge);

      return res.status(201).json({ success: true, data: challenge });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/game/season-recap
router.get('/season-recap', optionalAuth, async (req, res) => {
  try {
    const { quarter = '2026-Q3', block } = req.query;
    const filter = {};
    if (block) filter.block = block;

    const villages = await Village.find(filter).limit(10);
    const completedMissionsCount = await Mission.countDocuments({ status: { $in: ['completed', 'claimed'] } });
    const badgesCount = await Achievement.countDocuments({ atRisk: false });

    return res.json({
      success: true,
      data: {
        season: quarter,
        block: block || 'Sehore District',
        recap: {
          villagesEvaluated: villages.length,
          completedMissions: completedMissionsCount,
          activeBadges: badgesCount,
          averageImprovement: '+4.2 pts',
          mvpVillage: villages[0]?.name || 'Doraha',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
