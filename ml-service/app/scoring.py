"""
Scoring module for GramCraft.
Computes weighted composite Village Development Score, tier, tag, and level progress.
"""
from typing import Dict, Any, List
from .config import DEFAULT_WEIGHTS

def get_tier_and_tag(overall_score: float) -> Dict[str, str]:
    if overall_score >= 80.0:
        return {
            "tier": "Model Village",
            "tag": "High Performer",
            "badge": "Model Gram Panchayat",
            "description": "Exemplary infrastructure, high access and balanced sector performance."
        }
    elif overall_score >= 65.0:
        return {
            "tier": "Thriving",
            "tag": "Advanced",
            "badge": "Thriving Panchayat",
            "description": "Strong performance across basic services with minor gaps remaining."
        }
    elif overall_score >= 50.0:
        return {
            "tier": "Growing",
            "tag": "Emerging",
            "badge": "Growing Village",
            "description": "Baseline established; key infrastructure investments underway."
        }
    elif overall_score >= 35.0:
        return {
            "tier": "Sprout",
            "tag": "Needs Focus",
            "badge": "Sprout Village",
            "description": "Significant gaps in essential services; priority interventions required."
        }
    else:
        return {
            "tier": "Seedling",
            "tag": "Critical Gaps",
            "badge": "Seedling Village",
            "description": "Severe deficits across water, sanitation or connectivity; urgent mission needed."
        }

def compute_village_score(sectors: Dict[str, float], custom_weights: Dict[str, float] = None) -> Dict[str, Any]:
    weights = custom_weights or DEFAULT_WEIGHTS
    
    # Normalize weights if sum != 1
    total_w = sum(weights.values())
    if total_w <= 0:
        weights = DEFAULT_WEIGHTS
        total_w = 1.0

    weighted_sum = 0.0
    for sector, weight in weights.items():
        score = float(sectors.get(sector, 0.0))
        # Ensure within 0-100
        score = max(0.0, min(100.0, score))
        weighted_sum += score * (weight / total_w)

    overall_score = round(weighted_sum, 1)
    tier_info = get_tier_and_tag(overall_score)

    # Next milestone & XP
    next_threshold = 80.0
    if overall_score < 35.0:
        next_threshold = 35.0
    elif overall_score < 50.0:
        next_threshold = 50.0
    elif overall_score < 65.0:
        next_threshold = 65.0
    elif overall_score < 80.0:
        next_threshold = 80.0
    else:
        next_threshold = 100.0

    progress_to_next = round(min(100.0, max(0.0, (overall_score / next_threshold) * 100.0)), 1)

    return {
        "overall_score": overall_score,
        "tier": tier_info["tier"],
        "tag": tier_info["tag"],
        "description": tier_info["description"],
        "next_threshold": next_threshold,
        "progress_to_next": progress_to_next,
    }

def compute_batch_scores(villages: List[Dict[str, Any]], custom_weights: Dict[str, float] = None) -> List[Dict[str, Any]]:
    results = []
    for v in villages:
        v_id = v.get("id") or v.get("_id")
        sectors = v.get("sectors", {})
        score_data = compute_village_score(sectors, custom_weights)
        score_data["id"] = v_id
        score_data["name"] = v.get("name")
        results.append(score_data)
    return results
