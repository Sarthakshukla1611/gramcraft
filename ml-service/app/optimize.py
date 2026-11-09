"""
Budget Optimizer and Scenario Simulation Module for GramCraft.
Uses diminishing marginal returns response curves with greedy allocation.
"""
from typing import List, Dict, Any
import math
from .config import OPTIMIZER_CONFIG

SECTORS = ["sanitation", "water", "education", "roads", "electricity", "healthcare"]

def compute_sector_gain(
    sector: str,
    investment: float,
    current_score: float,
    population: int = 2000
) -> float:
    """
    Computes projected score gain (0 to 100 headroom) given investment amount in INR.
    Uses concave diminishing-returns saturation curve.
    """
    if investment <= 0 or current_score >= 100:
        return 0.0

    cost_base = OPTIMIZER_CONFIG["cost_per_point"].get(sector, 30000.0)
    pop_factor = (max(200, population) / OPTIMIZER_CONFIG["nominal_population"]) ** 0.65
    eff_cost = cost_base * pop_factor

    headroom = max(0.0, 100.0 - current_score)
    elasticity = OPTIMIZER_CONFIG["elasticity"]

    # Diminishing returns formula
    ratio = (investment / eff_cost) ** elasticity
    gain = headroom * (1.0 - math.exp(-0.20 * ratio))
    max_cap = OPTIMIZER_CONFIG["max_points_gain"]
    
    return float(min(headroom, min(max_cap, gain)))

def simulate_investment(
    current_score: float,
    investment: float,
    sector: str,
    population: int = 2000
) -> Dict[str, Any]:
    gain = round(compute_sector_gain(sector, investment, current_score, population), 2)
    projected_score = round(min(100.0, current_score + gain), 2)

    return {
        "sector": sector,
        "current_score": current_score,
        "investment": investment,
        "gain": gain,
        "projected_score": projected_score,
        "assumptions": (
            "Response curve model assumes elasticity alpha=0.55 and diminishing marginal returns. "
            "These engineering parameters must be calibrated against actual GramCraft project outcomes."
        ),
    }

def optimize_budget(
    villages: List[Dict[str, Any]],
    total_budget: float,
    locked_allocations: List[Dict[str, Any]] = None,
    min_per_village: float = 0.0,
    max_per_village: float = None
) -> Dict[str, Any]:
    """
    Greedy marginal gain budget allocation with diminishing returns.
    """
    locked_allocations = locked_allocations or []
    
    # Track allocations per (village_id, sector)
    allocations: Dict[str, Dict[str, float]] = {v["id"]: {s: 0.0 for s in SECTORS} for v in villages}
    v_lookup = {v["id"]: v for v in villages}

    spent_budget = 0.0

    # Apply locked allocations first
    for item in locked_allocations:
        v_id = item["villageId"]
        sec = item["sector"]
        amt = float(item["amount"])
        if v_id in allocations and sec in allocations[v_id]:
            allocations[v_id][sec] = amt
            spent_budget += amt

    remaining_budget = max(0.0, total_budget - spent_budget)
    
    # Discretize into 60 allocation chunks for smooth greedy optimization
    num_steps = 60
    step_size = remaining_budget / num_steps if remaining_budget > 0 else 0.0

    if step_size > 0:
        for _ in range(num_steps):
            best_gain = -1.0
            best_choice = None

            for v in villages:
                v_id = v["id"]
                pop = v.get("population", 2000)
                v_total_invested = sum(allocations[v_id].values())

                if max_per_village and (v_total_invested + step_size > max_per_village):
                    continue

                for sec in SECTORS:
                    current_s = float(v.get("sectors", {}).get(sec, {}).get("score", 50.0) if isinstance(v.get("sectors", {}).get(sec), dict) else v.get("sectors", {}).get(sec, 50.0))
                    already_invested = allocations[v_id][sec]
                    
                    # Marginal gain of adding step_size
                    gain_before = compute_sector_gain(sec, already_invested, current_s, pop)
                    gain_after = compute_sector_gain(sec, already_invested + step_size, current_s, pop)
                    marginal_gain = gain_after - gain_before

                    # Weight by gap to 100 and sector priority
                    weighted_marginal = marginal_gain * (100.0 - current_s)

                    if weighted_marginal > best_gain:
                        best_gain = weighted_marginal
                        best_choice = (v_id, sec)

            if best_choice and best_gain > 0:
                v_id, sec = best_choice
                allocations[v_id][sec] += step_size
            else:
                break

    # Compile result items
    allocation_list = []
    total_projected_gain = 0.0

    for v in villages:
        v_id = v["id"]
        pop = v.get("population", 2000)
        v_name = v.get("name", "Village")
        
        for sec in SECTORS:
            amt = allocations[v_id][sec]
            if amt > 0:
                current_s = float(v.get("sectors", {}).get(sec, {}).get("score", 50.0) if isinstance(v.get("sectors", {}).get(sec), dict) else v.get("sectors", {}).get(sec, 50.0))
                gain = compute_sector_gain(sec, amt, current_s, pop)
                total_projected_gain += gain
                
                is_locked = any(
                    l["villageId"] == v_id and l["sector"] == sec
                    for l in locked_allocations
                )

                allocation_list.append({
                    "villageId": v_id,
                    "villageName": v_name,
                    "sector": sec,
                    "amount": round(amt, 2),
                    "currentScore": round(current_s, 1),
                    "expectedGain": round(gain, 1),
                    "projectedScore": round(min(100.0, current_s + gain), 1),
                    "locked": is_locked,
                })

    gain_per_lakh = round((total_projected_gain / (total_budget / 100000.0)), 2) if total_budget > 0 else 0.0

    return {
        "total_budget": total_budget,
        "allocated_budget": round(sum(item["amount"] for item in allocation_list), 2),
        "total_projected_score_gain": round(total_projected_gain, 1),
        "expected_gain_per_lakh": gain_per_lakh,
        "allocations": allocation_list,
        "assumptions": (
            "Allocations generated via diminishing marginal returns optimization (elasticity 0.55). "
            "Impact estimates represent assumptions until calibrated with verified field monitoring data."
        ),
    }
