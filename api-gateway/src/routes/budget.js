const express = require('express');
const BudgetPlan = require('../models/BudgetPlan');
const Village = require('../models/Village');
const Project = require('../models/Project');
const {
  authenticate,
  optionalAuth,
  requireRole,
  enforceBlockScope,
} = require('../middleware/auth');
const {
  validateBody,
  budgetOptimizeSchema,
  budgetSimulateSchema,
} = require('../utils/validators');
const { optimizeBudget, simulateInvestment } = require('../services/mlClient');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// POST /api/budget/optimize
router.post(
  '/optimize',
  authenticate,
  validateBody(budgetOptimizeSchema),
  async (req, res) => {
    try {
      const { blockId, total, lockedAllocations = [], minPerVillage = 0, maxPerVillage = null } = req.body;
      const villages = await Village.find({ block: new RegExp(`^${blockId}$`, 'i') });

      if (!villages.length) {
        return res.status(404).json({ success: false, error: `No villages found in block '${blockId}'` });
      }

      const formattedVillages = villages.map(v => ({
        id: v._id.toString(),
        name: v.name,
        population: v.population,
        sectors: {
          sanitation: v.sectors.sanitation.score,
          water: v.sectors.water.score,
          education: v.sectors.education.score,
          roads: v.sectors.roads.score,
          electricity: v.sectors.electricity.score,
          healthcare: v.sectors.healthcare.score,
        },
      }));

      const optimizationResult = await optimizeBudget(
        formattedVillages,
        total,
        lockedAllocations,
        minPerVillage,
        maxPerVillage
      );

      if (!optimizationResult) {
        return res.status(500).json({ success: false, error: 'Budget optimization engine failed' });
      }

      return res.json({ success: true, data: optimizationResult });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/budget/simulate
router.post(
  '/simulate',
  authenticate,
  validateBody(budgetSimulateSchema),
  async (req, res) => {
    try {
      const { villageId, sector, investmentAmount } = req.body;
      const village = await Village.findById(villageId);
      if (!village) {
        return res.status(404).json({ success: false, error: 'Village not found' });
      }

      const currentScore = village.sectors[sector]?.score || 50;
      const sim = await simulateInvestment(
        currentScore,
        investmentAmount,
        sector,
        village.population
      );

      return res.json({
        success: true,
        data: {
          villageId: village._id,
          villageName: village.name,
          ...sim,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/budget/plans
router.get('/plans', optionalAuth, async (req, res) => {
  try {
    const { blockId } = req.query;
    const filter = {};
    if (blockId) filter.blockId = new RegExp(`^${blockId}$`, 'i');

    const plans = await BudgetPlan.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch budget plans' });
  }
});

// GET /api/budget/plans/:id
router.get('/plans/:id', optionalAuth, async (req, res) => {
  try {
    const plan = await BudgetPlan.findById(req.params.id).populate('createdBy', 'name email role');
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Budget plan not found' });
    }
    return res.json({ success: true, data: plan });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/budget/plans
router.post(
  '/plans',
  authenticate,
  requireRole('admin', 'district_officer', 'block_planner'),
  async (req, res) => {
    try {
      const { blockId, total, scenarioName, allocations, district = 'Sehore' } = req.body;

      if (!blockId || !total || !scenarioName || !allocations?.length) {
        return res.status(400).json({
          success: false,
          error: 'blockId, total, scenarioName, and allocations are required',
        });
      }

      const plan = await BudgetPlan.create({
        blockId,
        district,
        total,
        scenarioName,
        allocations,
        createdBy: req.user._id,
        status: 'draft',
      });

      await logAudit(req, 'BUDGET_PLAN_CREATE', 'BudgetPlan', plan._id, null, plan);

      return res.status(201).json({ success: true, data: plan });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/budget/plans/:id/apply
router.post(
  '/plans/:id/apply',
  authenticate,
  requireRole('admin', 'district_officer', 'block_planner'),
  async (req, res) => {
    try {
      const plan = await BudgetPlan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({ success: false, error: 'Budget plan not found' });
      }

      if (plan.status === 'applied') {
        return res.status(400).json({ success: false, error: 'Budget plan has already been applied' });
      }

      // Convert allocations into concrete Project lines
      const createdProjects = [];
      for (const item of plan.allocations) {
        if (item.amount > 0) {
          const project = await Project.create({
            villageId: item.villageId,
            title: `${item.sector.toUpperCase()} Infrastructure Scheme (${plan.scenarioName})`,
            sector: item.sector,
            budget: item.amount,
            spent: 0,
            startDate: new Date(),
            dueDate: new Date(Date.now() + 120 * 86400000), // 120 days
            assignee: 'Block Development Officer',
            status: 'approved',
            notes: `Auto-allocated from applied budget plan: ${plan.scenarioName}`,
          });
          createdProjects.push(project);
        }
      }

      plan.status = 'applied';
      await plan.save();

      await logAudit(
        req,
        'BUDGET_PLAN_APPLIED',
        'BudgetPlan',
        plan._id,
        { status: 'draft' },
        { status: 'applied', projectsCreatedCount: createdProjects.length }
      );

      return res.json({
        success: true,
        message: `Plan applied successfully! ${createdProjects.length} project schemes initialized.`,
        data: {
          plan,
          projectsCount: createdProjects.length,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
