import pytest
from app.forecast import forecast_village, compute_sector_forecast

def test_forecast_insufficient_data():
    fc = compute_sector_forecast("water", [45.0], ["2026-Q1"])
    assert fc["status"] == "not_enough_history"
    assert fc["method"] == "insufficient_data"

def test_forecast_moving_average():
    fc = compute_sector_forecast("water", [45.0, 50.0], ["2026-Q1", "2026-Q2"])
    assert fc["status"] == "forecasted"
    assert fc["method"] == "moving_average"
    assert fc["forecast_score"] > 45.0
    assert fc["lower_bound"] <= fc["forecast_score"] <= fc["upper_bound"]

def test_forecast_ridge_regression():
    quarters = ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1']
    snapshots = [
        {"quarter": quarters[i], "sectors": {s: 40 + i * 4 for s in ["sanitation", "water", "education", "roads", "electricity", "healthcare"]}}
        for i in range(5)
    ]
    result = forecast_village(snapshots)
    assert result["sample_size"] == 5
    assert result["next_quarter"] == "2026-Q2"
    water_fc = result["sectors"]["water"]
    assert water_fc["method"] == "ridge_regression"
    assert water_fc["forecast_score"] > 50.0
