"""
Recommendation Engine for GramCraft.
Generates ranked priority sector recommendations with transparent rule-based explanations,
including the exact numbers, thresholds, and confidence values.
"""
from typing import Dict, Any, List
from .config import DEFAULT_THRESHOLDS

def generate_recommendations(
    village_name: str,
    sectors: Dict[str, float],
    custom_thresholds: Dict[str, float] = None,
    population: int = 2000
) -> List[Dict[str, Any]]:
    thresholds = custom_thresholds or DEFAULT_THRESHOLDS
    critical_t = float(thresholds.get("critical", 35.0))
    priority_t = float(thresholds.get("priority", 50.0))
    watch_t = float(thresholds.get("watch", 65.0))

    recommendations = []

    sector_display_names = {
        "sanitation": "Sanitation & Waste Management",
        "water": "Clean Water & Jal Jeevan Access",
        "education": "School Infrastructure & Facilities",
        "roads": "All-Weather Road Connectivity",
        "electricity": "Reliable Power & Feeder Separation",
        "healthcare": "Primary Healthcare & Sub-Center Access",
    }

    action_items = {
        "sanitation": "Construct community sanitation units, greywater soak pits, household latrines, and solid waste segregation shed.",
        "water": "Augment deep borewell yield, lay tap connections, and install solar water pump with chlorination.",
        "education": "Upgrade primary school classrooms, install clean drinking water, and equip digital smart lab.",
        "roads": "Construct all-weather bituminous road link connecting to the nearest district arterial road.",
        "electricity": "Separate agricultural and domestic feeders; replace broken transformers with solar-backed lighting.",
        "healthcare": "Equip Ayushman Arogya Mandir with diagnostic kits, maternal checkups, and tele-consultation.",
    }

    for sector, raw_score in sectors.items():
        score = float(raw_score)
        norm_name = sector_display_names.get(sector, sector.capitalize())
        action = action_items.get(sector, f"Prioritize targeted development scheme in {sector}.")

        if score < critical_t:
            gap = round(priority_t - score, 1)
            reason = (
                f"{norm_name} is currently at {score:.1f}%, which is {gap:.1f} points below "
                f"the critical baseline threshold of {critical_t:.1f}%. Urgent intervention required."
            )
            confidence = round(0.92 + min(0.06, (critical_t - score) / 100.0), 2)
            recommendations.append({
                "sector": sector,
                "title": f"Critical Intervention: {norm_name}",
                "level": "critical",
                "score": score,
                "target_threshold": priority_t,
                "gap": gap,
                "reason": reason,
                "confidence": confidence,
                "action": action,
                "factors": {
                    "current_score": score,
                    "critical_threshold": critical_t,
                    "priority_threshold": priority_t,
                    "gap_to_target": gap,
                    "population_affected": population,
                },
                "rank_weight": (critical_t - score) * 3.0 + (100 - score),
            })
        elif score < priority_t:
            gap = round(priority_t - score, 1)
            reason = (
                f"{norm_name} is at {score:.1f}%, below the {priority_t:.1f}% priority threshold. "
                f"A targeted budget allocation of +{gap:.1f} points will lift this sector to sustainable status."
            )
            confidence = 0.88
            recommendations.append({
                "sector": sector,
                "title": f"Priority Scheme: {norm_name}",
                "level": "priority",
                "score": score,
                "target_threshold": priority_t,
                "gap": gap,
                "reason": reason,
                "confidence": confidence,
                "action": action,
                "factors": {
                    "current_score": score,
                    "priority_threshold": priority_t,
                    "gap_to_target": gap,
                    "population_affected": population,
                },
                "rank_weight": (priority_t - score) * 2.0 + (100 - score),
            })
        elif score < watch_t:
            gap = round(watch_t - score, 1)
            reason = (
                f"{norm_name} is at {score:.1f}%, meeting the baseline but below the {watch_t:.1f}% watch threshold. "
                f"Preventative maintenance and ongoing projects are advised."
            )
            confidence = 0.79
            recommendations.append({
                "sector": sector,
                "title": f"Watchlist & Maintenance: {norm_name}",
                "level": "watch",
                "score": score,
                "target_threshold": watch_t,
                "gap": gap,
                "reason": reason,
                "confidence": confidence,
                "action": f"Monitor ongoing maintenance and complete pipeline projects for {norm_name}.",
                "factors": {
                    "current_score": score,
                    "watch_threshold": watch_t,
                    "gap_to_target": gap,
                    "population_affected": population,
                },
                "rank_weight": (watch_t - score) * 1.0,
            })

    # Sort descending by rank_weight
    recommendations.sort(key=lambda r: r["rank_weight"], reverse=True)

    # Assign rank numbers and remove internal sorting weight
    for rank, item in enumerate(recommendations, 1):
        item["rank"] = rank
        del item["rank_weight"]

    return recommendations
