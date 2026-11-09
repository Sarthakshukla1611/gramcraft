"""
Forecasting module for GramCraft.
Generates next-quarter per-sector forecasts:
- Linear / Ridge regression when >= 4 snapshots
- Moving average when 2 or 3 snapshots
- Informative message when < 2 snapshots
- Computes prediction interval (95% confidence interval or standard error band)
"""
from typing import List, Dict, Any
import numpy as np

SECTORS = ["sanitation", "water", "education", "roads", "electricity", "healthcare"]

def _fit_ridge(x: np.ndarray, y: np.ndarray, alpha: float = 1.0):
    """
    Closed-form Ridge regression: w = (X^T X + alpha * I)^(-1) X^T y
    Includes intercept.
    """
    n = len(x)
    # Augment with bias column of ones
    X = np.hstack([x, np.ones((n, 1))])
    I = np.eye(2)
    I[1, 1] = 0.0  # Do not regularize intercept
    # (X^T X + alpha * I) w = X^T y
    A = X.T @ X + alpha * I
    b = X.T @ y
    w = np.linalg.solve(A, b)
    slope = float(w[0])
    intercept = float(w[1])
    return slope, intercept

def compute_sector_forecast(sector: str, values: List[float], quarters: List[str]) -> Dict[str, Any]:
    n = len(values)
    
    if n < 2:
        return {
            "sector": sector,
            "status": "not_enough_history",
            "message": "At least 2 historical quarters required for trend forecasting.",
            "forecast_score": round(values[0], 1) if n == 1 else None,
            "lower_bound": None,
            "upper_bound": None,
            "method": "insufficient_data",
            "trend": "unknown",
        }
    
    values_arr = np.array(values, dtype=float)
    x = np.arange(n, dtype=float).reshape(-1, 1)

    if n >= 4:
        slope, intercept = _fit_ridge(x, values_arr, alpha=1.0)
        pred = slope * n + intercept

        # Calculate residuals and standard error
        fitted = slope * np.arange(n, dtype=float) + intercept
        residuals = values_arr - fitted
        std_err = float(np.std(residuals)) if n > 2 else 2.5
        interval = max(2.0, 1.96 * std_err)

        trend = "improving" if slope > 0.5 else ("declining" if slope < -0.5 else "stable")
        method = "ridge_regression"
    else:
        # 2 or 3 snapshots: weighted moving average (more weight to latest)
        weights = np.linspace(1, 2, n)
        weights /= weights.sum()
        pred = float(np.sum(values_arr * weights))
        std_err = float(np.std(values_arr)) if n > 1 else 3.0
        interval = max(3.0, 1.5 * std_err)
        diff = values_arr[-1] - values_arr[0]
        trend = "improving" if diff > 1.0 else ("declining" if diff < -1.0 else "stable")
        method = "moving_average"

    # Clamp predictions between 0 and 100
    clamped_pred = round(max(0.0, min(100.0, pred)), 1)
    lower_bound = round(max(0.0, min(100.0, pred - interval)), 1)
    upper_bound = round(max(0.0, min(100.0, pred + interval)), 1)

    return {
        "sector": sector,
        "status": "forecasted",
        "method": method,
        "historical_count": n,
        "current_score": round(values[-1], 1),
        "forecast_score": clamped_pred,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "projected_change": round(clamped_pred - values[-1], 1),
        "trend": trend,
    }

def forecast_village(snapshots: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    snapshots: List of chronological score snapshots:
    [{ "quarter": "2024-Q4", "sectors": { "water": 45, ... }, "overallScore": 52 }, ...]
    """
    sorted_snaps = sorted(snapshots, key=lambda s: s.get("quarter", ""))
    quarters = [s.get("quarter") for s in sorted_snaps]

    sector_forecasts = {}
    total_forecast = 0.0

    for sector in SECTORS:
        history = []
        for s in sorted_snaps:
            sec_dict = s.get("sectors", {})
            val = sec_dict.get(sector, 0.0)
            history.append(float(val))

        fc = compute_sector_forecast(sector, history, quarters)
        sector_forecasts[sector] = fc
        if fc.get("forecast_score") is not None:
            total_forecast += fc["forecast_score"]

    avg_forecast = round(total_forecast / len(SECTORS), 1)

    # Next quarter identifier
    last_quarter = quarters[-1] if quarters else "2026-Q3"
    next_quarter = _compute_next_quarter(last_quarter)

    return {
        "next_quarter": next_quarter,
        "projected_overall_score": avg_forecast,
        "sectors": sector_forecasts,
        "sample_size": len(sorted_snaps),
    }

def _compute_next_quarter(q_str: str) -> str:
    try:
        parts = q_str.split("-Q")
        year = int(parts[0])
        q = int(parts[1])
        if q == 4:
            return f"{year + 1}-Q1"
        return f"{year}-Q{q + 1}"
    except Exception:
        return "2026-Q4"
