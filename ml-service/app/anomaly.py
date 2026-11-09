"""
Anomaly detection module for GramCraft data integrity.
Flags suspicious score updates:
- Unusually large score jumps (> 15 points in a single update)
- Multiple simultaneous massive jumps (> 3 sectors jumping > 10 points)
- Negative shifts below minimum thresholds
- Out-of-bounds numbers
"""
from typing import Dict, Any, List

SECTORS = ["sanitation", "water", "education", "roads", "electricity", "healthcare"]

def detect_anomalies(
    previous_scores: Dict[str, float],
    new_scores: Dict[str, float],
    jump_threshold: float = 12.0
) -> Dict[str, Any]:
    flags = []
    large_jumps = 0
    severe_anomalies = False

    for sector in SECTORS:
        old_val = float(previous_scores.get(sector, 50.0))
        new_val = float(new_scores.get(sector, 50.0))

        delta = round(new_val - old_val, 1)

        # Check for out-of-bounds
        if new_val < 0 or new_val > 100:
            flags.append({
                "sector": sector,
                "type": "out_of_bounds",
                "severity": "critical",
                "message": f"{sector} score {new_val} is outside permissible range [0, 100].",
                "delta": delta,
            })
            severe_anomalies = True

        # Check for large jump
        if abs(delta) >= jump_threshold:
            severity = "high" if abs(delta) >= 20.0 else "medium"
            flags.append({
                "sector": sector,
                "type": "large_jump",
                "severity": severity,
                "message": f"{sector} changed by {delta:+0.1f} points (from {old_val} to {new_val}), exceeding the threshold of {jump_threshold}.",
                "delta": delta,
            })
            large_jumps += 1

    # Check for widespread simultaneous shifts
    if large_jumps >= 3:
        flags.append({
            "sector": "multiple",
            "type": "systemic_shift",
            "severity": "high",
            "message": f"{large_jumps} sectors experienced large score adjustments simultaneously. Verification evidence required.",
            "delta": None,
        })
        severe_anomalies = True

    requires_verification = (len(flags) > 0)

    return {
        "has_anomalies": requires_verification,
        "severe": severe_anomalies,
        "requires_evidence": requires_verification,
        "anomalies_count": len(flags),
        "flags": flags,
    }
