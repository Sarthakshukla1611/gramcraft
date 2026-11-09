from flask import Blueprint, request, jsonify
from .scoring import compute_village_score, compute_batch_scores
from .recommend import generate_recommendations
from .forecast import forecast_village
from .peers import find_peer_villages
from .optimize import optimize_budget, simulate_investment
from .anomaly import detect_anomalies

api_bp = Blueprint("api", __name__)

@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "ml-service",
        "version": "1.0.0"
    }), 200

@api_bp.route("/score", methods=["POST"])
def score():
    data = request.get_json() or {}
    sectors = data.get("sectors", {})
    weights = data.get("weights")
    result = compute_village_score(sectors, weights)
    return jsonify({"success": True, "data": result}), 200

@api_bp.route("/score/batch", methods=["POST"])
def score_batch():
    data = request.get_json() or {}
    villages = data.get("villages", [])
    weights = data.get("weights")
    results = compute_batch_scores(villages, weights)
    return jsonify({"success": True, "data": results}), 200

@api_bp.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json() or {}
    village_name = data.get("name", "Village")
    sectors = data.get("sectors", {})
    thresholds = data.get("thresholds")
    population = int(data.get("population", 2000))
    results = generate_recommendations(village_name, sectors, thresholds, population)
    return jsonify({"success": True, "data": results}), 200

@api_bp.route("/forecast", methods=["POST"])
def forecast():
    data = request.get_json() or {}
    snapshots = data.get("snapshots", [])
    result = forecast_village(snapshots)
    return jsonify({"success": True, "data": result}), 200

@api_bp.route("/peers", methods=["POST"])
def peers():
    data = request.get_json() or {}
    target_village = data.get("targetVillage", {})
    all_villages = data.get("allVillages", [])
    k = int(data.get("k", 4))
    result = find_peer_villages(target_village, all_villages, k)
    return jsonify({"success": True, "data": result}), 200

@api_bp.route("/optimize-budget", methods=["POST"])
def optimize():
    data = request.get_json() or {}
    villages = data.get("villages", [])
    total_budget = float(data.get("totalBudget", 1000000))
    locked = data.get("lockedAllocations", [])
    min_per_village = float(data.get("minPerVillage", 0.0))
    max_per_village = float(data["maxPerVillage"]) if data.get("maxPerVillage") else None
    result = optimize_budget(villages, total_budget, locked, min_per_village, max_per_village)
    return jsonify({"success": True, "data": result}), 200

@api_bp.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json() or {}
    current_score = float(data.get("currentScore", 50.0))
    investment = float(data.get("investmentAmount", 100000.0))
    sector = data.get("sector", "water")
    population = int(data.get("population", 2000))
    result = simulate_investment(current_score, investment, sector, population)
    return jsonify({"success": True, "data": result}), 200

@api_bp.route("/anomalies", methods=["POST"])
def anomalies():
    data = request.get_json() or {}
    previous_scores = data.get("previousScores", {})
    new_scores = data.get("newScores", {})
    jump_threshold = float(data.get("jumpThreshold", 12.0))
    result = detect_anomalies(previous_scores, new_scores, jump_threshold)
    return jsonify({"success": True, "data": result}), 200
