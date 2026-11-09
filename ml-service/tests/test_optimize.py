import pytest
from app.optimize import compute_sector_gain, simulate_investment, optimize_budget

def test_compute_sector_gain_diminishing_returns():
    # Adding more budget should give diminishing marginal returns
    gain_100k = compute_sector_gain("water", 100000, 40.0, 2000)
    gain_200k = compute_sector_gain("water", 200000, 40.0, 2000)
    gain_300k = compute_sector_gain("water", 300000, 40.0, 2000)

    assert gain_100k > 0
    assert gain_200k > gain_100k
    assert gain_300k > gain_200k
    # Diminishing marginal returns check: marginal gain from 100k to 200k > marginal gain from 200k to 300k
    marg_1 = gain_200k - gain_100k
    marg_2 = gain_300k - gain_200k
    assert marg_1 > marg_2

def test_simulate_investment():
    sim = simulate_investment(current_score=45.0, investment=150000, sector="sanitation")
    assert sim["gain"] > 0
    assert sim["projected_score"] == pytest.approx(45.0 + sim["gain"], 0.01)
    assert "assumptions" in sim

def test_optimize_budget():
    villages = [
        {"id": "v1", "name": "Village Low", "population": 1500, "sectors": {"water": 30.0, "sanitation": 35.0, "education": 40.0, "roads": 45.0, "electricity": 50.0, "healthcare": 40.0}},
        {"id": "v2", "name": "Village High", "population": 3000, "sectors": {"water": 80.0, "sanitation": 85.0, "education": 90.0, "roads": 75.0, "electricity": 85.0, "healthcare": 80.0}},
    ]
    res = optimize_budget(villages, total_budget=1000000)
    assert res["total_budget"] == 1000000
    assert len(res["allocations"]) > 0
    # Village with low scores (high gap/headroom) should receive larger allocation
    v1_alloc = sum(a["amount"] for a in res["allocations"] if a["villageId"] == "v1")
    v2_alloc = sum(a["amount"] for a in res["allocations"] if a["villageId"] == "v2")
    assert v1_alloc > v2_alloc
