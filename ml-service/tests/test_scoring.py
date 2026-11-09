import pytest
from app.scoring import compute_village_score, compute_batch_scores

def test_compute_village_score_basic():
    sectors = {
        "sanitation": 60.0,
        "water": 70.0,
        "education": 80.0,
        "roads": 50.0,
        "electricity": 90.0,
        "healthcare": 70.0,
    }
    result = compute_village_score(sectors)
    assert result["overall_score"] == 70.0
    assert result["tier"] == "Thriving"
    assert result["tag"] == "Advanced"
    assert result["progress_to_next"] > 0

def test_model_village_tier():
    sectors = {s: 85.0 for s in ["sanitation", "water", "education", "roads", "electricity", "healthcare"]}
    result = compute_village_score(sectors)
    assert result["overall_score"] == 85.0
    assert result["tier"] == "Model Village"

def test_critical_seedling_tier():
    sectors = {s: 25.0 for s in ["sanitation", "water", "education", "roads", "electricity", "healthcare"]}
    result = compute_village_score(sectors)
    assert result["overall_score"] == 25.0
    assert result["tier"] == "Seedling"

def test_batch_scoring():
    villages = [
        {"id": "v1", "name": "Village A", "sectors": {"water": 80, "sanitation": 80}},
        {"id": "v2", "name": "Village B", "sectors": {"water": 30, "sanitation": 30}},
    ]
    results = compute_batch_scores(villages)
    assert len(results) == 2
    assert results[0]["name"] == "Village A"
