const express = require('express');
const Village = require('../models/Village');
const ScoreSnapshot = require('../models/ScoreSnapshot');
const Project = require('../models/Project');
const Mission = require('../models/Mission');
const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const { optionalAuth } = require('../middleware/auth');
const {
  getVillageScore,
  getRecommendations,
  getForecast,
  getPeers,
} = require('../services/mlClient');

const router = express.Router();

// GET /api/villages/:id/insights
router.get('/villages/:id/insights', optionalAuth, async (req, res) => {
  try {
    const village = await Village.findById(req.params.id);
    if (!village) {
      return res.status(404).json({ success: false, error: 'Village not found' });
    }

    const settings = (await SystemSetting.findOne({ key: 'global_config' })) || {
      thresholds: { critical: 35, priority: 50, watch: 65, modelVillage: 80 },
    };

    // 1. Score info
    const scoreData = await getVillageScore(village.sectors, settings.weights);

    // 2. Rule-based explainable recommendations
    const recommendations = await getRecommendations(
      village.name,
      village.sectors,
      settings.thresholds,
      village.population
    );

    // 3. Historical snapshots & next-quarter forecast
    const snapshots = await ScoreSnapshot.find({ villageId: village._id }).sort({ quarter: 1 });
    const forecast = await getForecast(snapshots);

    // 4. Peer villages comparison
    const allInBlock = await Village.find({ block: village.block }).lean();
    const peers = await getPeers(village, allInBlock, 4);

    return res.json({
      success: true,
      data: {
        villageId: village._id,
        name: village.name,
        code: village.code,
        block: village.block,
        district: village.district,
        population: village.population,
        score: scoreData,
        recommendations,
        forecast,
        peers,
        lastVerifiedAt: village.lastVerifiedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/blocks/:block/insights
router.get('/blocks/:block/insights', optionalAuth, async (req, res) => {
  try {
    const block = req.params.block;
    const villages = await Village.find({ block: new RegExp(`^${block}$`, 'i') });

    if (!villages.length) {
      return res.status(404).json({ success: false, error: `No villages found for block '${block}'` });
    }

    const villageIds = villages.map(v => v._id);

    // Aggregates
    let totalScore = 0;
    const tierCounts = { 'Model Village': 0, 'Thriving': 0, 'Growing': 0, 'Sprout': 0, 'Seedling': 0 };
    const sectorTotals = { sanitation: 0, water: 0, education: 0, roads: 0, electricity: 0, healthcare: 0 };

    villages.forEach(v => {
      totalScore += v.overallScore;
      if (tierCounts[v.level] !== undefined) {
        tierCounts[v.level]++;
      }
      Object.keys(sectorTotals).forEach(sec => {
        sectorTotals[sec] += (v.sectors[sec]?.score || 0);
      });
    });

    const avgScore = Math.round(totalScore / villages.length);
    const sectorAverages = {};
    Object.keys(sectorTotals).forEach(sec => {
      sectorAverages[sec] = Math.round(sectorTotals[sec] / villages.length);
    });

    // Biggest gaps (lowest average sector)
    const sortedGaps = Object.entries(sectorAverages)
      .map(([sec, val]) => ({ sector: sec, averageScore: val, gapToTarget: Math.max(0, 70 - val) }))
      .sort((a, b) => a.averageScore - b.averageScore);

    // Projects summary for this block
    const projects = await Project.find({ villageId: { $in: villageIds } });
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);

    const projectStatusCounts = {
      planned: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
    };
    projects.forEach(p => {
      if (projectStatusCounts[p.status] !== undefined) {
        projectStatusCounts[p.status]++;
      }
    });

    // Active missions
    const activeMissionsCount = await Mission.countDocuments({
      villageId: { $in: villageIds },
      status: { $in: ['available', 'completed'] },
    });

    // Recent activity log
    const recentActivity = await AuditLog.find({
      entityId: { $in: villageIds.map(id => id.toString()) },
    })
      .sort({ timestamp: -1 })
      .limit(10);

    // Most improved villages (comparing latest snapshot to 2 quarters prior)
    const topVillages = [...villages].sort((a, b) => b.overallScore - a.overallScore);

    return res.json({
      success: true,
      data: {
        block,
        villageCount: villages.length,
        averageScore: avgScore,
        tierCounts,
        sectorAverages,
        biggestGaps: sortedGaps,
        budget: {
          allocated: totalBudget,
          spent: totalSpent,
          utilizationPercent: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        },
        projects: {
          total: projects.length,
          statusCounts: projectStatusCounts,
        },
        activeMissionsCount,
        leaderboardPreview: topVillages.slice(0, 5).map(v => ({
          id: v._id,
          name: v.name,
          overallScore: v.overallScore,
          level: v.level,
        })),
        recentActivity,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/districts/:district/summary
router.get('/districts/:district/summary', optionalAuth, async (req, res) => {
  try {
    const district = req.params.district;
    const villages = await Village.find({ district: new RegExp(`^${district}$`, 'i') });

    if (!villages.length) {
      return res.status(404).json({ success: false, error: `District '${district}' not found` });
    }

    const blocks = await Village.distinct('block', { district: new RegExp(`^${district}$`, 'i') });
    const villageIds = villages.map(v => v._id);

    const totalScore = villages.reduce((acc, v) => acc + v.overallScore, 0);
    const avgScore = Math.round(totalScore / villages.length);

    const projects = await Project.find({ villageId: { $in: villageIds } });
    const totalAllocated = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
    const totalSpent = projects.reduce((acc, p) => acc + (p.spent || 0), 0);

    const tierBreakdown = { 'Model Village': 0, 'Thriving': 0, 'Growing': 0, 'Sprout': 0, 'Seedling': 0 };
    villages.forEach(v => {
      if (tierBreakdown[v.level] !== undefined) tierBreakdown[v.level]++;
    });

    return res.json({
      success: true,
      data: {
        district,
        blocks,
        totalVillages: villages.length,
        averageScore: avgScore,
        totalBudget: totalAllocated,
        totalSpent,
        utilization: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
        tierBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
