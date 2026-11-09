"""
Configuration and model calibration parameters for GramCraft ML Service.
IMPORTANT NOTE:
The response curve parameters and elasticity coefficients below represent
engineering assumptions based on standard rural development econometric models.
They are placeholder calibrations to be calibrated with real post-implementation
outcome data as GramCraft field monitoring accumulates verified results.
"""

DEFAULT_WEIGHTS = {
    "sanitation": 1.0 / 6.0,
    "water": 1.0 / 6.0,
    "education": 1.0 / 6.0,
    "roads": 1.0 / 6.0,
    "electricity": 1.0 / 6.0,
    "healthcare": 1.0 / 6.0,
}

DEFAULT_THRESHOLDS = {
    "critical": 35.0,
    "priority": 50.0,
    "watch": 65.0,
    "model_village": 80.0,
}

# Diminishing returns curve parameters:
# delta_score = ALPHA * (investment / (COST_PER_POINT * population_scale))^ELASTICITY * (100 - current_score) / 100
OPTIMIZER_CONFIG = {
    # Baseline cost in INR to raise a sector by 1 index point for a nominal village of 2,000 population
    "cost_per_point": {
        "sanitation": 25000.0,
        "water": 35000.0,
        "education": 30000.0,
        "roads": 60000.0,
        "electricity": 40000.0,
        "healthcare": 32000.0,
    },
    # Diminishing returns elasticity exponent (0 < alpha < 1 ensures diminishing returns)
    "elasticity": 0.55,
    "nominal_population": 2000.0,
    "max_points_gain": 25.0,  # Max realistic single-period gain cap per sector
}
