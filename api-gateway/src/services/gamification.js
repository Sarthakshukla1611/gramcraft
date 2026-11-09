const Achievement = require('../models/Achievement');
const Mission = require('../models/Mission');
const Village = require('../models/Village');
const Notification = require('../models/Notification');

const BADGE_CONFIG = [
  { key: 'water_secure', sector: 'water', threshold: 70, name: 'Water Secure', desc: 'Maintained 70+ in clean piped water security', icon: 'droplet' },
  { key: 'sanitation_champion', sector: 'sanitation', threshold: 70, name: 'Sanitation Champion', desc: 'Achieved 70+ in ODF Plus & waste processing', icon: 'shield-check' },
  { key: 'learning_hub', sector: 'education', threshold: 70, name: 'Learning Hub', desc: '70+ in School facilities & student enrollment', icon: 'book-open' },
  { key: 'all_weather_roads', sector: 'roads', threshold: 70, name: 'All-Weather Roads', desc: '70+ in Village all-weather bitumen connectivity', icon: 'navigation' },
  { key: 'powered_up', sector: 'electricity', threshold: 70, name: 'Powered Up', desc: '70+ in 24x7 power reliability & solar pumps', icon: 'zap' },
  { key: 'health_access', sector: 'healthcare', threshold: 70, name: 'Health Access', desc: '70+ in Health Sub-Center & maternal care', icon: 'heart-pulse' },
];

async function evaluateBadgesForVillage(village) {
  try {
    const existingBadges = await Achievement.find({ villageId: village._id });
    const existingMap = new Map(existingBadges.map(b => [b.badgeKey, b]));

    // 1. Sector Specific Badges
    for (const b of BADGE_CONFIG) {
      const score = village.sectors[b.sector]?.score || 0;
      const existing = existingMap.get(b.key);

      if (score >= b.threshold) {
        if (!existing) {
          // Award badge!
          await Achievement.create({
            villageId: village._id,
            badgeKey: b.key,
            name: b.name,
            description: b.desc,
            icon: b.icon,
            atRisk: false,
          });
        } else if (existing.atRisk) {
          // Restore from at-risk status
          existing.atRisk = false;
          await existing.save();
        }
      } else {
        // Score is below threshold. Section 6 rule:
        // "A sector score going down never removes earned history, but a badge shows as 'at risk' when the score drops below its threshold."
        if (existing && !existing.atRisk) {
          existing.atRisk = true;
          await existing.save();
        }
      }
    }

    // 2. Balanced Village Badge (all 6 sectors >= 50)
    const allAbove50 = ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare']
      .every(sec => (village.sectors[sec]?.score || 0) >= 50);

    const balancedExisting = existingMap.get('balanced_village');
    if (allAbove50) {
      if (!balancedExisting) {
        await Achievement.create({
          villageId: village._id,
          badgeKey: 'balanced_village',
          name: 'Balanced Village',
          description: 'All 6 core development sectors maintain scores of 50 or higher',
          icon: 'scale',
          atRisk: false,
        });
      } else if (balancedExisting.atRisk) {
        balancedExisting.atRisk = false;
        await balancedExisting.save();
      }
    } else if (balancedExisting && !balancedExisting.atRisk) {
      balancedExisting.atRisk = true;
      await balancedExisting.save();
    }

    // 3. Model Village Badge (overallScore >= 80)
    const modelExisting = existingMap.get('model_village_badge');
    if (village.overallScore >= 80) {
      if (!modelExisting) {
        await Achievement.create({
          villageId: village._id,
          badgeKey: 'model_village_badge',
          name: 'Model Gram Panchayat',
          description: 'Achieved composite Model Village status with 80+ overall score',
          icon: 'trophy',
          atRisk: false,
        });
      } else if (modelExisting.atRisk) {
        modelExisting.atRisk = false;
        await modelExisting.save();
      }
    } else if (modelExisting && !modelExisting.atRisk) {
      modelExisting.atRisk = true;
      await modelExisting.save();
    }

    // 4. Update Missions status
    const missions = await Mission.find({ villageId: village._id });
    for (const m of missions) {
      const score = village.sectors[m.sector]?.score || 0;
      if (score >= m.milestone && m.status === 'available') {
        m.status = 'completed';
        m.claimedAt = new Date();
        await m.save();
      }
    }
  } catch (err) {
    console.error('[Gamification] Error evaluating badges:', err);
  }
}

module.exports = {
  BADGE_CONFIG,
  evaluateBadgesForVillage,
};
