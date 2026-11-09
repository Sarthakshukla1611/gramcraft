"""
Peers module for GramCraft.
Finds similar peer villages using Nearest Neighbors distance on population and sector profile.
"""
from typing import List, Dict, Any
import numpy as np

SECTORS = ["sanitation", "water", "education", "roads", "electricity", "healthcare"]

def find_peer_villages(
    target_village: Dict[str, Any],
    all_villages: List[Dict[str, Any]],
    k: int = 4
) -> List[Dict[str, Any]]:
    if not all_villages:
        return []

    target_id = target_village.get("id") or target_village.get("_id")
    candidates = [
        v for v in all_villages
        if (v.get("id") or v.get("_id")) != target_id
    ]

    if not candidates:
        return []

    def extract_features(v: Dict[str, Any]) -> List[float]:
        # Population feature (log scale, normalized)
        pop = float(v.get("population", 2000))
        pop_feat = np.log1p(pop) / 10.0
        
        # Sector features (divided by 100)
        sec_feats = []
        sectors = v.get("sectors", {})
        for s in SECTORS:
            if isinstance(sectors.get(s), dict):
                score = float(sectors[s].get("score", 50.0))
            else:
                score = float(sectors.get(s, 50.0))
            sec_feats.append(score / 100.0)

        return [pop_feat] + sec_feats

    candidate_vectors = np.array([extract_features(c) for c in candidates], dtype=float)
    target_vector = np.array(extract_features(target_village), dtype=float)

    # Vectorized Euclidean distances
    diffs = candidate_vectors - target_vector
    distances = np.linalg.norm(diffs, axis=1)

    # Sort indices by smallest distance
    sorted_indices = np.argsort(distances)[:k]

    peer_results = []
    for idx in sorted_indices:
        dist = float(distances[idx])
        cand = candidates[idx]
        sim_pct = round(max(0.0, 100.0 * (1.0 - (dist / 2.0))), 1)
        
        peer_results.append({
            "id": cand.get("id") or cand.get("_id"),
            "name": cand.get("name"),
            "block": cand.get("block"),
            "population": cand.get("population"),
            "overallScore": cand.get("overallScore") or cand.get("overall_score"),
            "level": cand.get("level"),
            "similarity": sim_pct,
            "sectors": cand.get("sectors"),
        })

    return peer_results
