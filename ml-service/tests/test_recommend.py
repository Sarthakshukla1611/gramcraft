import pytest
from app.recommend import generate_recommendations

def test_recommendations_critical_sector():
    sectors = {
        "sanitation": 28.0,  # critical (< 35)
        "water": 45.0,       # priority (< 50)
        "education": 60.0,   # watch (< 65)
        "roads": 75.0,       # healthy
        "electricity": 80.0, # healthy
        "healthcare": 72.0,  # healthy
    }
    recs = generate_recommendations("Test Village", sectors)
    assert len(recs) == 3
    # Top priority must be sanitation because it's critical
    top = recs[0]
    assert top["sector"] == "sanitation"
    assert top["level"] == "critical"
    assert "critical baseline threshold" in top["reason"]
    assert top["confidence"] >= 0.90
    assert "sanitation" in top["action"].lower()

def test_recommendations_all_healthy():
    sectors = {s: 85.0 for s in ["sanitation", "water", "education", "roads", "electricity", "healthcare"]}
    recs = generate_recommendations("Healthy Village", sectors)
    assert len(recs) == 0
