const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 5000,
});

// Fallback scoring logic if ML service is unreachable
function fallbackScore(sectors) {
  const keys = ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'];
  let total = 0;
  keys.forEach(k => {
    const val = typeof sectors[k] === 'object' ? (sectors[k]?.score ?? 50) : (sectors[k] ?? 50);
    total += Number(val);
  });
  const score = Math.round(total / keys.length);
  let tier = 'Growing';
  let tag = 'Emerging';
  if (score >= 80) { tier = 'Model Village'; tag = 'High Performer'; }
  else if (score >= 65) { tier = 'Thriving'; tag = 'Advanced'; }
  else if (score >= 50) { tier = 'Growing'; tag = 'Emerging'; }
  else if (score >= 35) { tier = 'Sprout'; tag = 'Needs Focus'; }
  else { tier = 'Seedling'; tag = 'Critical Gaps'; }

  return {
    overall_score: score,
    tier,
    tag,
    next_threshold: score >= 80 ? 100 : (score >= 65 ? 80 : (score >= 50 ? 65 : (score >= 35 ? 50 : 35))),
    progress_to_next: Math.min(100, Math.round((score / 80) * 100)),
  };
}

// Fallback recommendations if ML service is unreachable
function fallbackRecommendations(villageName, sectors, thresholds = { critical: 35, priority: 50, watch: 65 }) {
  const recs = [];
  const secNames = {
    sanitation: 'Sanitation & Waste Management',
    water: 'Clean Water & Jal Jeevan Access',
    education: 'School Infrastructure & Facilities',
    roads: 'All-Weather Road Connectivity',
    electricity: 'Reliable Power & Feeder Separation',
    healthcare: 'Primary Healthcare & Sub-Center Access',
  };

  const actionItems = {
    sanitation: 'Construct community sanitation units, greywater soak pits, household latrines, and solid waste segregation shed.',
    water: 'Augment deep borewell yield, lay tap connections, and install solar water pump with chlorination.',
    education: 'Upgrade primary school classrooms, install clean drinking water, and equip digital smart lab.',
    roads: 'Construct all-weather bituminous road link connecting to the nearest district arterial road.',
    electricity: 'Separate agricultural and domestic feeders; replace broken transformers with solar-backed lighting.',
    healthcare: 'Equip Ayushman Arogya Mandir with diagnostic kits, maternal checkups, and tele-consultation.',
  };

  for (const [sec, val] of Object.entries(sectors)) {
    const score = typeof val === 'object' ? (val?.score ?? 50) : Number(val);
    const normName = secNames[sec] || sec;

    if (score < thresholds.critical) {
      recs.push({
        sector: sec,
        title: `Critical Intervention: ${normName}`,
        level: 'critical',
        score,
        target_threshold: thresholds.priority,
        gap: Math.round(thresholds.priority - score),
        reason: `${normName} is currently at ${score}%, which is below the critical baseline threshold of ${thresholds.critical}%. Urgent intervention required.`,
        confidence: 0.94,
        action: actionItems[sec] || `Prioritize targeted interventions in ${sec}.`,
        rank_weight: (thresholds.critical - score) * 3 + (100 - score),
      });
    } else if (score < thresholds.priority) {
      recs.push({
        sector: sec,
        title: `Priority Scheme: ${normName}`,
        level: 'priority',
        score,
        target_threshold: thresholds.priority,
        gap: Math.round(thresholds.priority - score),
        reason: `${normName} is at ${score}%, below the ${thresholds.priority}% priority threshold.`,
        confidence: 0.88,
        action: actionItems[sec] || `Prioritize targeted interventions in ${sec}.`,
        rank_weight: (thresholds.priority - score) * 2 + (100 - score),
      });
    } else if (score < thresholds.watch) {
      recs.push({
        sector: sec,
        title: `Watchlist & Maintenance: ${normName}`,
        level: 'watch',
        score,
        target_threshold: thresholds.watch,
        gap: Math.round(thresholds.watch - score),
        reason: `${normName} is at ${score}%, meeting baseline but below the ${thresholds.watch}% watch threshold.`,
        confidence: 0.79,
        action: `Monitor ongoing projects and ensure maintenance for ${normName}.`,
        rank_weight: (thresholds.watch - score),
      });
    }
  }

  recs.sort((a, b) => b.rank_weight - a.rank_weight);
  return recs.map((r, i) => {
    delete r.rank_weight;
    return { ...r, rank: i + 1 };
  });
}

async function getVillageScore(sectors, weights) {
  try {
    const res = await mlClient.post('/score', { sectors, weights });
    if (res.data?.success && res.data?.data) return res.data.data;
  } catch (err) {
    // console.warn('[mlClient] /score unavailable, using fallback:', err.message);
  }
  return fallbackScore(sectors);
}

async function getRecommendations(name, sectors, thresholds, population) {
  try {
    const res = await mlClient.post('/recommend', { name, sectors, thresholds, population });
    if (res.data?.success && res.data?.data) return res.data.data;
  } catch (err) {
    // console.warn('[mlClient] /recommend unavailable, using fallback:', err.message);
  }
  return fallbackRecommendations(name, sectors, thresholds);
}

async function getForecast(snapshots) {
  try {
    const res = await mlClient.post('/forecast', { snapshots });
    if (res.data?.success && res.data?.data) return res.data.data;
  } catch (err) {
    // console.warn('[mlClient] /forecast unavailable:', err.message);
  }
  // Simple fallback forecast
  const last = snapshots[snapshots.length - 1];
  return {
    next_quarter: '2026-Q4',
    projected_overall_score: last?.overallScore || 50,
    sample_size: snapshots.length,
    sectors: {},
  };
}

async function getPeers(targetVillage, allVillages, k = 4) {
  try {
    const res = await mlClient.post('/peers', { targetVillage, allVillages, k });
    if (res.data?.success && res.data?.data) return res.data.data;
  } catch (err) {
    // console.warn('[mlClient] /peers unavailable:', err.message);
  }
  return [];
}

async function optimizeBudget(villages, totalBudget, lockedAllocations, minPerVillage, maxPerVillage) {
  try {
    const res = await mlClient.post('/optimize-budget', {
      villages,
      totalBudget,
      lockedAllocations,
      minPerVillage,
      maxPerVillage,
    });
    if (res.data?.success && res.data?.data) return res.data.data;
  } catch (err) {
    console.warn('[mlClient] /optimize-budget unavailable:', err.message);
  }
  return null;
}

async function simulateInvestment(currentScore, investmentAmount, sector, population) {
  try {
    const res = await mlClient.post('/simulate', {
      currentScore,
      investmentAmount,
      sector,
      population,
    });
    if (res.data?.success && res.data?.data) return res.data.data;
  } catch (err) {
    // console.warn('[mlClient] /simulate unavailable:', err.message);
  }
  const gain = Math.min(25, (investmentAmount / 40000) * 0.5);
  return {
    sector,
    current_score: currentScore,
    investment: investmentAmount,
    gain: Math.round(gain * 10) / 10,
    projected_score: Math.min(100, Math.round((currentScore + gain) * 10) / 10),
    assumptions: 'Heuristic fallback estimation.',
  };
}

async function checkAnomalies(previousScores, newScores, jumpThreshold = 12) {
  try {
    const res = await mlClient.post('/anomalies', { previousScores, newScores, jumpThreshold });
    if (res.data?.success && res.data?.data) return res.data.data;
  } catch (err) {
    // fallback
  }
  return { has_anomalies: false, requires_evidence: false, flags: [] };
}

module.exports = {
  getVillageScore,
  getRecommendations,
  getForecast,
  getPeers,
  optimizeBudget,
  simulateInvestment,
  checkAnomalies,
};
