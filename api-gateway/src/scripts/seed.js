require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');

// Models
const User = require('../models/User');
const Village = require('../models/Village');
const ScoreSnapshot = require('../models/ScoreSnapshot');
const Project = require('../models/Project');
const BudgetPlan = require('../models/BudgetPlan');
const Mission = require('../models/Mission');
const Achievement = require('../models/Achievement');
const Challenge = require('../models/Challenge');
const Facility = require('../models/Facility');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');

const {
  BLOCKS,
  DISTRICT,
  STATE,
  VILLAGE_DEFS,
  PROFILE_RANGES,
  generatePolygonAroundPoint,
} = require('../../../database/seedData');

const SECTORS = ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'];
const QUARTERS = ['2024-Q4', '2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3'];

function calculateLevel(score) {
  if (score >= 80) return 'Model Village';
  if (score >= 65) return 'Thriving';
  if (score >= 50) return 'Growing';
  if (score >= 35) return 'Sprout';
  return 'Seedling';
}

async function seedDatabase() {
  console.log('[Seed] Starting database seed process...');
  await connectDB();

  // Clean collections
  console.log('[Seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Village.deleteMany({}),
    ScoreSnapshot.deleteMany({}),
    Project.deleteMany({}),
    BudgetPlan.deleteMany({}),
    Mission.deleteMany({}),
    Achievement.deleteMany({}),
    Challenge.deleteMany({}),
    Facility.deleteMany({}),
    SystemSetting.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 1. Create Default System Settings
  console.log('[Seed] Creating default system settings...');
  await SystemSetting.create({
    key: 'global_config',
    weights: {
      sanitation: 1 / 6,
      water: 1 / 6,
      education: 1 / 6,
      roads: 1 / 6,
      electricity: 1 / 6,
      healthcare: 1 / 6,
    },
    thresholds: {
      critical: 35,
      priority: 50,
      watch: 65,
      modelVillage: 80,
    },
    gamificationValues: {
      missionXpMilestone50: 50,
      missionXpMilestone70: 100,
      missionXpMilestone90: 200,
      badgeThreshold: 70,
      approvalJumpThreshold: 10,
    },
    publicScoreboardEnabled: true,
  });

  // 2. Create Demo Users
  console.log('[Seed] Creating demo users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('GramCraft@2026', salt);

  const adminUser = await User.create({
    name: 'Rajesh Verma (Admin)',
    email: 'admin@gramcraft.gov.in',
    passwordHash,
    role: 'admin',
    language: 'en',
    scope: { district: null, block: null, villageIds: [] },
  });

  const districtUser = await User.create({
    name: 'Sunita Sharma (District Officer)',
    email: 'district@gramcraft.gov.in',
    passwordHash,
    role: 'district_officer',
    language: 'hi',
    scope: { district: DISTRICT, block: null, villageIds: [] },
  });

  const blockUser = await User.create({
    name: 'Amit Patel (Ichhawar Planner)',
    email: 'ichhawar.planner@gramcraft.gov.in',
    passwordHash,
    role: 'block_planner',
    language: 'en',
    scope: { district: DISTRICT, block: 'Ichhawar', villageIds: [] },
  });

  const viewerUser = await User.create({
    name: 'Citizen Observer (Public)',
    email: 'viewer@gramcraft.gov.in',
    passwordHash,
    role: 'viewer',
    language: 'en',
    scope: { district: null, block: null, villageIds: [] },
  });

  // 3. Seed Villages
  console.log('[Seed] Seeding 30 villages with boundaries and 8 quarters of history...');
  const seededVillages = [];

  for (const vDef of VILLAGE_DEFS) {
    const range = PROFILE_RANGES[vDef.profile];
    const boundary = generatePolygonAroundPoint(vDef.lng, vDef.lat);

    // Generate realistic base sector scores
    const sectors = {};
    let totalScore = 0;

    SECTORS.forEach(sec => {
      // variance around the profile range
      const base = range.min + Math.random() * (range.max - range.min);
      const score = Math.min(100, Math.max(10, Math.round(base)));
      sectors[sec] = {
        score,
        lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 15 * 86400000)),
        updatedBy: adminUser._id,
      };
      totalScore += score;
    });

    const overallScore = Math.round(totalScore / SECTORS.length);
    const level = calculateLevel(overallScore);
    const xp = (overallScore * 25) + Math.floor(Math.random() * 400);

    const village = await Village.create({
      name: vDef.name,
      code: vDef.code,
      district: DISTRICT,
      block: vDef.block,
      state: STATE,
      population: vDef.pop,
      households: vDef.hh,
      location: {
        type: 'Point',
        coordinates: [vDef.lng, vDef.lat], // [lng, lat]
      },
      boundary,
      sectors,
      overallScore,
      level,
      xp,
      lastVerifiedAt: new Date(),
    });

    seededVillages.push(village);

    // 4. Create 8 Quarters of Score History (snapshots)
    // Model historical trajectory ending at current scores
    const snapshots = [];
    const stepRatio = 0.85; // earlier scores were slightly lower on average

    for (let qIdx = 0; qIdx < QUARTERS.length; qIdx++) {
      const quarter = QUARTERS[qIdx];
      const factor = stepRatio + ((1 - stepRatio) * (qIdx / (QUARTERS.length - 1)));
      const snapSectors = {};
      let qTotal = 0;

      SECTORS.forEach(sec => {
        // slight jitter per quarter
        const jitter = (Math.sin(qIdx * 1.5 + sec.length) * 4);
        const score = Math.min(100, Math.max(12, Math.round(sectors[sec].score * factor + jitter)));
        snapSectors[sec] = score;
        qTotal += score;
      });

      const qOverall = Math.round(qTotal / SECTORS.length);

      snapshots.push({
        villageId: village._id,
        quarter,
        sectors: snapSectors,
        overallScore: qOverall,
        source: qIdx === QUARTERS.length - 1 ? 'verified_update' : 'quarterly_close',
      });
    }

    await ScoreSnapshot.insertMany(snapshots);

    // 5. Create Auto-generated Missions for this Village
    const missionItems = [
      { sector: 'water', milestone: 50, title: 'Clean Tap Water Milestone', rewardXp: 50, tokenBonus: 20000 },
      { sector: 'water', milestone: 70, title: 'Har Ghar Jal Standard', rewardXp: 100, tokenBonus: 40000 },
      { sector: 'sanitation', milestone: 50, title: 'ODF Plus Verification', rewardXp: 50, tokenBonus: 25000 },
      { sector: 'sanitation', milestone: 70, title: 'Solid-Liquid Waste Management', rewardXp: 100, tokenBonus: 45000 },
      { sector: 'education', milestone: 70, title: 'Smart Classrooms Setup', rewardXp: 100, tokenBonus: 50000 },
      { sector: 'roads', milestone: 70, title: 'All-Weather Road Connectivity', rewardXp: 100, tokenBonus: 50000 },
      { sector: 'healthcare', milestone: 70, title: 'Primary Health Sub-Center Upgrade', rewardXp: 100, tokenBonus: 50000 },
      { sector: 'electricity', milestone: 90, title: '100% Solar-Assisted Feeder', rewardXp: 200, tokenBonus: 75000 },
    ];

    for (const m of missionItems) {
      const currentSectorScore = sectors[m.sector].score;
      let status = 'available';
      let claimedAt = null;

      if (currentSectorScore >= m.milestone) {
        status = 'completed';
        claimedAt = new Date();
      } else if (currentSectorScore < m.milestone - 20) {
        status = 'available';
      }

      await Mission.create({
        villageId: village._id,
        sector: m.sector,
        milestone: m.milestone,
        title: `${m.title} (${village.name})`,
        description: `Achieve a score of ${m.milestone}+ in ${m.sector} to unlock ${m.rewardXp} XP and ₹${(m.tokenBonus).toLocaleString('en-IN')} token allocation.`,
        status,
        rewardXp: m.rewardXp,
        tokenBonus: m.tokenBonus,
        claimedAt,
      });
    }

    // 6. Check Badges for Village
    const badgeMappings = [
      { key: 'water_secure', sector: 'water', name: 'Water Secure', desc: 'Sustained 70+ in Water security', icon: 'droplet' },
      { key: 'sanitation_champion', sector: 'sanitation', name: 'Sanitation Champion', desc: 'Achieved 70+ in Sanitation & waste processing', icon: 'shield-check' },
      { key: 'learning_hub', sector: 'education', name: 'Learning Hub', desc: '70+ in School facilities & attendance', icon: 'book-open' },
      { key: 'all_weather_roads', sector: 'roads', name: 'All-Weather Roads', desc: '70+ in Road network connectivity', icon: 'navigation' },
      { key: 'powered_up', sector: 'electricity', name: 'Powered Up', desc: '70+ in Reliable power & solar usage', icon: 'zap' },
      { key: 'health_access', sector: 'healthcare', name: 'Health Access', desc: '70+ in Maternal & Child health coverage', icon: 'heart-pulse' },
    ];

    let hasBalanced = true;
    for (const b of badgeMappings) {
      const score = sectors[b.sector].score;
      if (score < 50) hasBalanced = false;
      if (score >= 70) {
        await Achievement.create({
          villageId: village._id,
          badgeKey: b.key,
          name: b.name,
          description: b.desc,
          icon: b.icon,
          atRisk: score < 72, // near threshold
        });
      }
    }

    if (hasBalanced) {
      await Achievement.create({
        villageId: village._id,
        badgeKey: 'balanced_village',
        name: 'Balanced Village',
        description: 'All 6 development sectors maintain scores of 50 or higher',
        icon: 'scale',
      });
    }

    if (overallScore >= 80) {
      await Achievement.create({
        villageId: village._id,
        badgeKey: 'model_village_badge',
        name: 'Model Gram Panchayat',
        description: 'Village has achieved composite Model status with 80+ overall score',
        icon: 'trophy',
      });
    }
  }

  // 7. Create Village Officer assigned to Bijori village
  const bijoriVillage = seededVillages.find(v => v.name === 'Bijori');
  const villageUser = await User.create({
    name: 'Kavita Chouksey (Bijori Officer)',
    email: 'bijori.officer@gramcraft.gov.in',
    passwordHash,
    role: 'village_officer',
    language: 'hi',
    scope: { district: DISTRICT, block: 'Ichhawar', villageIds: [bijoriVillage._id] },
  });

  // 8. Seed 40 Realistic Projects across Villages
  console.log('[Seed] Seeding 40 projects across statuses...');
  const projectTemplates = [
    { title: 'Jal Jeevan Mission Household Tap Connection Phase 2', sector: 'water', budget: 450000, daysSpan: 90 },
    { title: 'Community Greywater Soak Pit and Drain Construction', sector: 'sanitation', budget: 180000, daysSpan: 45 },
    { title: 'Government Primary School Digital Smart Board & Roof Solar', sector: 'education', budget: 320000, daysSpan: 60 },
    { title: 'PMGSY Bituminous Road Link to Main Highway', sector: 'roads', budget: 1250000, daysSpan: 180 },
    { title: '3-Phase Agricultural and Domestic Feeder Separation', sector: 'electricity', budget: 620000, daysSpan: 120 },
    { title: 'Ayushman Arogya Mandir Health Wellness Sub-Center Solarizing', sector: 'healthcare', budget: 280000, daysSpan: 50 },
    { title: 'Overhead RCC Water Tank 50,000L Capacity', sector: 'water', budget: 850000, daysSpan: 150 },
    { title: 'Solid Waste Segregation Shed & E-Rickshaw Collection', sector: 'sanitation', budget: 350000, daysSpan: 40 },
    { title: 'Anganwadi Center Child-Friendly Kitchen and Toilet', sector: 'education', budget: 150000, daysSpan: 30 },
    { title: 'Culvert Bridge Repair over Seasonal Nala', sector: 'roads', budget: 420000, daysSpan: 75 },
    { title: 'LED Street Lighting along Main Gram Path (60 Poles)', sector: 'electricity', budget: 210000, daysSpan: 35 },
    { title: 'Mobile Medical Van Bi-Weekly Clinic Stationing', sector: 'healthcare', budget: 120000, daysSpan: 90 },
  ];

  const statuses = ['planned', 'approved', 'in_progress', 'completed', 'delayed'];

  for (let i = 0; i < 40; i++) {
    const tmpl = projectTemplates[i % projectTemplates.length];
    const village = seededVillages[i % seededVillages.length];
    const status = statuses[i % statuses.length];
    const budget = tmpl.budget + (Math.floor(Math.random() * 8) * 10000);
    const spent = status === 'completed' ? budget : (status === 'in_progress' ? Math.round(budget * 0.55) : (status === 'delayed' ? Math.round(budget * 0.3) : 0));
    
    const startDate = new Date(Date.now() - Math.floor(Math.random() * 90 * 86400000));
    const dueDate = new Date(startDate.getTime() + (tmpl.daysSpan * 86400000));

    await Project.create({
      villageId: village._id,
      title: `${tmpl.title} - ${village.name}`,
      sector: tmpl.sector,
      status,
      budget,
      spent,
      startDate,
      dueDate,
      assignee: i % 2 === 0 ? 'Gram Panchayat Secretary' : 'Rural Engineering Services (RES)',
      evidence: status === 'completed' ? ['/uploads/evidence-sample-1.jpg', '/uploads/evidence-sample-2.pdf'] : [],
      notes: status === 'delayed' ? 'Delayed due to monsoon waterlogging; scheduled for expedited resumption.' : 'Work running as per DPR specifications.',
    });
  }

  // 9. Seed Facilities (schools, health centres, water sources)
  console.log('[Seed] Seeding facilities with GIS coordinates...');
  const facilityTypes = ['school', 'health centre', 'water source'];
  for (const village of seededVillages) {
    const [vLng, vLat] = village.location.coordinates;

    // School
    await Facility.create({
      type: 'school',
      name: `Govt. Primary & High School ${village.name}`,
      location: {
        type: 'Point',
        coordinates: [vLng + 0.003, vLat - 0.002],
      },
      villageId: village._id,
      block: village.block,
      operationalStatus: 'functional',
    });

    // Health Centre
    await Facility.create({
      type: 'health centre',
      name: `Sub-Health Centre ${village.name}`,
      location: {
        type: 'Point',
        coordinates: [vLng - 0.004, vLat + 0.003],
      },
      villageId: village._id,
      block: village.block,
      operationalStatus: village.sectors.healthcare.score < 40 ? 'partial' : 'functional',
    });

    // Water source
    await Facility.create({
      type: 'water source',
      name: `Jal Jeevan Deep Borewell ${village.name}`,
      location: {
        type: 'Point',
        coordinates: [vLng + 0.001, vLat + 0.004],
      },
      villageId: village._id,
      block: village.block,
      operationalStatus: village.sectors.water.score < 40 ? 'non_functional' : 'functional',
    });
  }

  // 10. Seed Challenges
  console.log('[Seed] Seeding peer challenges...');
  const v1 = seededVillages[0]; // Bijori
  const v2 = seededVillages[1]; // Diwadia
  const v3 = seededVillages[3]; // Semli Jadid

  await Challenge.create({
    title: 'Clean Jal Jeevan Sprint 2026',
    description: '30-Day sprint between Ichhawar villages to achieve 100% piped water meter readings and water quality testing.',
    participants: [
      {
        entityType: 'village',
        entityId: v1._id.toString(),
        name: v1.name,
        startingScore: v1.sectors.water.score,
        currentScore: v1.sectors.water.score + 6,
        progress: 60,
      },
      {
        entityType: 'village',
        entityId: v2._id.toString(),
        name: v2.name,
        startingScore: v2.sectors.water.score,
        currentScore: v2.sectors.water.score + 8,
        progress: 80,
      },
      {
        entityType: 'village',
        entityId: v3._id.toString(),
        name: v3.name,
        startingScore: v3.sectors.water.score,
        currentScore: v3.sectors.water.score + 4,
        progress: 40,
      },
    ],
    sector: 'water',
    target: 10,
    startDate: new Date(Date.now() - 15 * 86400000),
    endDate: new Date(Date.now() + 15 * 86400000),
    status: 'active',
  });

  await Challenge.create({
    title: 'Inter-Block Sanitation Push: Ichhawar vs Ashta',
    description: 'Race to achieve the highest percentage of functional soak pits and solid waste compost units.',
    participants: [
      {
        entityType: 'block',
        entityId: 'Ichhawar',
        name: 'Ichhawar Block',
        startingScore: 48,
        currentScore: 56,
        progress: 80,
      },
      {
        entityType: 'block',
        entityId: 'Ashta',
        name: 'Ashta Block',
        startingScore: 52,
        currentScore: 58,
        progress: 60,
      },
    ],
    sector: 'sanitation',
    target: 10,
    startDate: new Date(Date.now() - 20 * 86400000),
    endDate: new Date(Date.now() + 10 * 86400000),
    status: 'active',
  });

  // 11. Sample Budget Plan
  console.log('[Seed] Seeding sample budget plan...');
  const ichhawarVillages = seededVillages.filter(v => v.block === 'Ichhawar').slice(0, 6);
  await BudgetPlan.create({
    blockId: 'Ichhawar',
    district: DISTRICT,
    total: 5000000, // ₹50 Lakhs
    scenarioName: 'FY2026-Q4 High Priority Gap Elimination',
    allocations: ichhawarVillages.map((v, idx) => ({
      villageId: v._id,
      villageName: v.name,
      sector: idx % 2 === 0 ? 'sanitation' : 'water',
      amount: 750000 + (idx * 50000),
      locked: idx === 0, // Bijori locked
      expectedGain: 12.4,
    })),
    createdBy: blockUser._id,
    status: 'draft',
  });

  console.log('[Seed] Complete! Summary of seeded accounts:');
  console.log('----------------------------------------------------');
  console.log('1. Admin:            admin@gramcraft.gov.in        / GramCraft@2026');
  console.log('2. District Officer: district@gramcraft.gov.in     / GramCraft@2026');
  console.log('3. Block Planner:    ichhawar.planner@gramcraft.gov.in / GramCraft@2026');
  console.log('4. Village Officer:  bijori.officer@gramcraft.gov.in / GramCraft@2026');
  console.log('5. Public Viewer:    viewer@gramcraft.gov.in       / GramCraft@2026');
  console.log('----------------------------------------------------');

  await disconnectDB();
  console.log('[Seed] Database disconnected cleanly.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
