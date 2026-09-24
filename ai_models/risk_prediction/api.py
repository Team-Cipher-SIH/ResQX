import datetime
import json
import os
import requests
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="ResQtech AI Inference Service",
    description="Pre-disaster risk scoring engine for Flood, Fire, and Earthquake",
    version="1.0.0",
)

# ==========================================
# 0a. REAL DISTRICT FLOOD FREQUENCY LOOKUP
# ==========================================
# Built by compute_district_flood_frequency.py from your real
# This is NOT the same as a rainfall-based proxy - it's real flood-count history.
DISTRICT_FLOOD_FREQUENCY = {}
try:
    with open(os.path.join("data", "district_flood_frequency.json")) as f:
        DISTRICT_FLOOD_FREQUENCY = json.load(f)
    print(
        f"[INFO] Loaded {len(DISTRICT_FLOOD_FREQUENCY):,} district flood-frequency entries"
    )
except Exception as e:
    print(
        f"[WARN] district_flood_frequency.json not found ({e}). "
        f"Run compute_district_flood_frequency.py first. Falling back to 0.35 default."
    )


# ==========================================
# 0b. LOAD TRAINED ML MODELS (with graceful fallback if missing)
# ==========================================
ML_MODELS = {}
for name in ("flood", "fire", "earthquake"):
    try:
        ML_MODELS[name] = joblib.load(f"models/{name}_model.pkl")
        print(f"[INFO] Loaded ML model for {name}")
    except Exception as e:
        ML_MODELS[name] = None
        print(
            f"[WARN] No trained model for {name} ({e}). Falling back to rule-based scoring for this disaster."
        )


CLASS_MIDPOINTS = {"LOW": 15, "MODERATE": 45, "HIGH": 70, "CRITICAL": 90}


def ml_predict(
    disaster_type: str, feature_dict: dict
) -> Optional[Tuple[int, str, float]]:
    """
    Runs the trained RandomForest for this disaster type.
    Returns (riskScore, riskLevel, raw_confidence) or None if no model is loaded.
    """
    bundle = ML_MODELS.get(disaster_type)
    if bundle is None:
        return None

    model = bundle["model"]
    feature_order = bundle["features"]

    try:
        x = pd.DataFrame(
            [[feature_dict[f] for f in feature_order]], columns=feature_order
        )
    except KeyError as e:
        print(
            f"[WARN] Missing feature {e} for {disaster_type} ML model, falling back to rules"
        )
        return None

    probs = model.predict_proba(x)[0]
    classes = model.classes_
    best_idx = int(np.argmax(probs))
    predicted_level = classes[best_idx]
    confidence = float(probs[best_idx])

    # Risk score as the probability-weighted expectation across ordered classes,
    # not just the single winning class — this makes borderline cases (e.g. 45%
    # HIGH / 40% MODERATE) reflect their genuine uncertainty in the numeric score too.
    score = 0.0
    for cls, prob in zip(classes, probs):
        score += prob * CLASS_MIDPOINTS.get(cls, 50)

    return int(round(score)), predicted_level, confidence


def calculate_level(score: int) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 35:
        return "MODERATE"
    return "LOW"


def get_district_state_for_lookup(lat: float, lng: float) -> Optional[Tuple[str, str]]:
    """Reverse-geocode coordinates to a (district, state) pair for the
    real flood-frequency lookup. Best-effort - returns None on failure."""
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lng, "format": "json"}
    headers = {"User-Agent": "ResQX-SIH-Disaster-Engine"}
    try:
        r = requests.get(url, params=params, headers=headers, timeout=5)
        if r.status_code == 200:
            address = r.json().get("address", {})
            # Nominatim uses different keys depending on region - try the likely ones
            district = (
                address.get("state_district")
                or address.get("county")
                or address.get("city_district")
                or address.get("city")
            )
            state = address.get("state")
            if district and state:
                return district.strip().upper(), state.strip().upper()
    except Exception as e:
        print(f"[WARN] Reverse geocode for district lookup failed: {e}")
    return None


def get_real_flood_frequency(lat: float, lng: float) -> Tuple[float, bool]:
    """Looks up REAL historical flood frequency for this location's district,
    consistent with what the model was trained on. Returns (value, was_found)."""
    resolved = get_district_state_for_lookup(lat, lng)
    if resolved:
        district, state = resolved
        key = f"{district}|{state}"
        if key in DISTRICT_FLOOD_FREQUENCY:
            return DISTRICT_FLOOD_FREQUENCY[key], True
    return 0.35, False  # neutral fallback if district can't be resolved/matched


def get_rainfall_windows(lat: float, lng: float) -> Tuple[dict, bool]:
    """
    Fetches 1-day, 3-day, and 7-day rainfall totals for TODAY, matching the
    exact feature shape the flood model was trained on (rainfall_1d/3d/7d).
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": "precipitation_sum",
        "past_days": 7,
        "forecast_days": 1,
        "timezone": "auto",
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            daily = r.json().get("daily", {}).get("precipitation_sum", [])
            values = [v for v in daily if v is not None]
            if values:
                return {
                    "rainfall_1d": round(values[-1], 1),
                    "rainfall_3d": round(sum(values[-3:]), 1),
                    "rainfall_7d": round(sum(values[-7:]), 1),
                }, True
    except Exception as e:
        print(f"[WARN] Rainfall window fetch failed: {e}")
    return {"rainfall_1d": 0.0, "rainfall_3d": 0.0, "rainfall_7d": 0.0}, False


def ml_predict_flood_binary(feature_dict: dict) -> Optional[Tuple[int, str, float]]:
    """
    Runs the REAL, binary-trained flood model (trained on your actual
    processed_flood_events.csv + Open-Meteo historical rainfall).
    Returns (riskScore 0-100, riskLevel, confidence) or None if unavailable.
    """
    bundle = ML_MODELS.get("flood")
    if bundle is None or bundle.get("type") != "binary":
        return None

    model = bundle["model"]
    feature_order = bundle["features"]

    try:
        x = pd.DataFrame(
            [[feature_dict[f] for f in feature_order]], columns=feature_order
        )
    except KeyError as e:
        print(f"[WARN] Missing feature {e} for flood model")
        return None

    probs = model.predict_proba(x)[0]  # [P(no flood), P(flood)]
    p_flood = float(probs[1])

    score = int(round(p_flood * 100))
    level = calculate_level(score)
    confidence = float(max(probs))  # how sure the model is of its actual prediction

    return score, level, confidence


# ==========================================
# 1. CONTRACT MODELS (Matches PPT Slide 6 & 7)
# ==========================================


class Location(BaseModel):
    lat: float
    lng: float


class PredictRiskRequest(BaseModel):
    disasterType: str = Field(..., description="flood, fire, or earthquake")
    location: Location
    locationId: Optional[str] = "district-custom"
    features: Optional[Dict[str, float]] = None


class PredictRiskResponse(BaseModel):
    disasterType: str
    locationId: str
    riskScore: int
    riskLevel: str
    confidence: float
    riskFactors: List[str]
    predictedAt: str


# ==========================================
# 2. LIVE TELEMETRY COLLECTORS
# ==========================================


def get_live_weather_and_elevation(lat: float, lng: float) -> tuple[dict, bool]:
    """Fetches precipitation, temperature, wind speed, relative humidity, and elevation.
    Returns (data, was_live) — was_live=False means the failsafe defaults were used."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": ["precipitation_sum", "temperature_2m_max", "wind_speed_10m_max"],
        "hourly": ["relative_humidity_2m"],
        "timezone": "auto",
    }
    try:
        r = requests.get(url, params=params, timeout=5)
        if r.status_code == 200:
            data = r.json()
            elevation = data.get("elevation", 100.0)
            daily = data.get("daily", {})
            rain = (daily.get("precipitation_sum") or [0.0])[0] or 0.0
            temp = (daily.get("temperature_2m_max") or [30.0])[0] or 30.0
            wind = (daily.get("wind_speed_10m_max") or [10.0])[0] or 10.0

            hourly_rh = data.get("hourly", {}).get("relative_humidity_2m", [])
            valid_rh = [h for h in hourly_rh if h is not None]
            avg_humidity = sum(valid_rh) / len(valid_rh) if valid_rh else 50.0

            return {
                "rainfall": float(rain),
                "temperature": float(temp),
                "windSpeed": float(wind),
                "humidity": float(avg_humidity),
                "elevation": float(elevation),
            }, True
    except Exception as e:
        print(f"[WARN] Weather API lookup failed: {e}")

    return {
        "rainfall": 10.0,
        "temperature": 30.0,
        "windSpeed": 10.0,
        "humidity": 50.0,
        "elevation": 100.0,
    }, False


def get_live_river_discharge(lat: float, lng: float) -> tuple[float, bool]:
    """Fetches river discharge volume (m3/s) from Open-Meteo Global Flood API.
    Returns (value, was_live)."""
    url = "https://flood-api.open-meteo.com/v1/flood"
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": "river_discharge",
        "forecast_days": 1,
    }
    try:
        r = requests.get(url, params=params, timeout=5)
        if r.status_code == 200:
            data = r.json()
            readings = data.get("daily", {}).get("river_discharge", [])
            valid = [v for v in readings if v is not None]
            if valid:
                return float(valid[0]), True
    except Exception as e:
        print(f"[WARN] Flood API lookup failed: {e}")
    return 0.0, False


def get_recent_seismic_activity(lat: float, lng: float) -> tuple[float, int, bool]:
    """Queries USGS for earthquakes within a 250km radius over the past 30 days.
    Returns (max_magnitude, event_count, was_live)."""
    url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    params = {
        "format": "geojson",
        "latitude": lat,
        "longitude": lng,
        "maxradiuskm": 250,
        "minmagnitude": 2.5,
    }
    try:
        r = requests.get(url, params=params, timeout=5)
        if r.status_code == 200:
            features = r.json().get("features", [])
            count = len(features)
            max_mag = max(
                [
                    f["properties"]["mag"]
                    for f in features
                    if f["properties"]["mag"] is not None
                ],
                default=0.0,
            )
            return float(max_mag), count, True
    except Exception as e:
        print(f"[WARN] USGS API lookup failed: {e}")
    return 0.0, 0, False


def get_historical_flood_frequency(lat: float, lng: float) -> tuple[float, bool]:
    """
    Calculates a 0.0-1.0 historical flood probability score by checking
    10 years of Open-Meteo archive data for extreme rain events (>50mm/day).
    Returns (value, was_live).
    """
    today = datetime.date.today()
    start_date = datetime.date(today.year - 10, today.month, 1).strftime("%Y-%m-%d")
    end_date = datetime.date(today.year - 1, today.month, 28).strftime("%Y-%m-%d")

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "precipitation_sum",
        "timezone": "auto",
    }

    try:
        r = requests.get(url, params=params, timeout=5)
        if r.status_code == 200:
            data = r.json()
            rain_data = data.get("daily", {}).get("precipitation_sum", [])
            valid_rain = [v for v in rain_data if v is not None]

            if not valid_rain:
                return 0.35, False  # safe baseline if archive returned nothing

            extreme_days = sum(1 for rain in valid_rain if rain > 50.0)
            years_analyzed = len(valid_rain) / 365.25
            avg_extreme_per_year = (
                extreme_days / years_analyzed if years_analyzed > 0 else 0
            )

            frequency_score = min(avg_extreme_per_year / 5.0, 1.0)
            return round(frequency_score, 2), True

    except Exception as e:
        print(f"[WARN] Historical frequency fetch failed: {e}")

    return 0.35, False  # failsafe fallback


# --- Static seismic zone reference (BIS/GSI Seismic Zoning of India, Zones II-V) ---
# Approximate state-level mapping. Real zone maps cross state boundaries in detail,
# but this state-level approximation is a defensible, documented simplification.
# Score is a 0.0-1.0 "fault proximity / seismic vulnerability" proxy derived from the zone.
INDIA_SEISMIC_ZONE_SCORE = {
    # Zone V — most severe
    "jammu and kashmir": 0.9,
    "himachal pradesh": 0.85,
    "uttarakhand": 0.85,
    "gujarat": 0.8,
    "bihar": 0.75,
    "assam": 0.9,
    "meghalaya": 0.9,
    "manipur": 0.9,
    "mizoram": 0.9,
    "nagaland": 0.9,
    "tripura": 0.85,
    "arunachal pradesh": 0.9,
    "sikkim": 0.85,
    "andaman and nicobar islands": 0.9,
    # Zone IV
    "delhi": 0.65,
    "punjab": 0.6,
    "haryana": 0.6,
    "west bengal": 0.55,
    # Zone III (default-ish, moderate)
    "uttar pradesh": 0.45,
    "rajasthan": 0.4,
    "madhya pradesh": 0.4,
    "maharashtra": 0.4,
    "jharkhand": 0.4,
    "chhattisgarh": 0.35,
    # Zone II — least severe
    "tamil nadu": 0.2,
    "karnataka": 0.25,
    "kerala": 0.25,
    "andhra pradesh": 0.2,
    "telangana": 0.2,
    "odisha": 0.3,
    "goa": 0.25,
}


def get_seismic_zone_score(lat: float, lng: float) -> tuple[float, bool]:
    """
    Resolves the state for given coordinates via free reverse-geocoding,
    then maps it to an approximate BIS seismic zone vulnerability score.
    Falls back to 0.4 (Zone III, moderate) if the state can't be resolved.
    Returns (value, was_live).
    """
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lng, "format": "json"}
    headers = {"User-Agent": "ResQX-SIH-Disaster-Engine"}
    try:
        r = requests.get(url, params=params, headers=headers, timeout=5)
        if r.status_code == 200:
            address = r.json().get("address", {})
            state = (address.get("state") or "").strip().lower()
            if state in INDIA_SEISMIC_ZONE_SCORE:
                return INDIA_SEISMIC_ZONE_SCORE[state], True
    except Exception as e:
        print(f"[WARN] Reverse geocode for seismic zone failed: {e}")

    return 0.4, False  # Zone III fallback — moderate, not an extreme guess either way


# ==========================================
# 3. DISASTER PREDICTION ENGINES
# ==========================================


def scale_confidence_for_data_quality(
    raw_confidence: float, live_flags: List[bool]
) -> float:
    """
    'Data Integrity Scaling': if some inputs had to fall back to defaults
    (API failure, missing feature), confidence should drop — but not collapse
    to zero, since a partial-data prediction is still better than nothing.
    A 0.7 floor multiplier means: all-live-data keeps full confidence,
    all-fallback data still keeps 70% of it.
    """
    if not live_flags:
        return raw_confidence
    data_quality = sum(1 for f in live_flags if f) / len(live_flags)
    return round(raw_confidence * (0.7 + 0.3 * data_quality), 3)


def evaluate_flood(
    lat: float, lng: float, features: Optional[dict]
) -> tuple[int, str, float, List[str]]:
    f = features or {}
    live_flags = []

    # --- Get the REAL 4 features the trained model was actually built on ---
    rainfall_windows, rain_live = get_rainfall_windows(lat, lng)
    freq_live_val, freq_live = get_real_flood_frequency(lat, lng)

    rainfall_1d = f.get("rainfall_1d", rainfall_windows["rainfall_1d"])
    rainfall_3d = f.get("rainfall_3d", rainfall_windows["rainfall_3d"])
    rainfall_7d = f.get("rainfall_7d", rainfall_windows["rainfall_7d"])
    hist_freq = f.get("historicalFloodFrequency", freq_live_val)

    if "rainfall_1d" not in f and "rainfall_3d" not in f and "rainfall_7d" not in f:
        live_flags.append(rain_live)
    if "historicalFloodFrequency" not in f:
        live_flags.append(freq_live)

    # --- Rule-based factors (explainability — kept regardless of scoring method) ---
    factors = []
    if rainfall_1d > 100:
        factors.append("Extreme rainfall")
    elif rainfall_1d > 50:
        factors.append("Heavy rainfall")
    if rainfall_7d > 150:
        factors.append("Sustained heavy rainfall over the past week")
    if hist_freq > 0.6:
        factors.append("High historical flood incidence in this district")
    if not factors:
        factors.append("Stable hydrological parameters")

    # --- Try the REAL trained binary flood model first ---
    ml_result = ml_predict_flood_binary(
        {
            "rainfall_1d": rainfall_1d,
            "rainfall_3d": rainfall_3d,
            "rainfall_7d": rainfall_7d,
            "historicalFloodFrequency": hist_freq,
        }
    )
    if ml_result:
        score, level, raw_conf = ml_result
        confidence = scale_confidence_for_data_quality(raw_conf, live_flags)
        return score, level, confidence, factors

    # --- Fallback: simple rule-based scoring if no trained model file was found ---
    score = 15.0
    if rainfall_1d > 100:
        score += 35
    elif rainfall_1d > 50:
        score += 25
    elif rainfall_1d > 25:
        score += 12
    if rainfall_7d > 150:
        score += 20
    if hist_freq > 0.6:
        score += 20
    elif hist_freq > 0.3:
        score += 10

    final_score = int(min(max(score, 5), 98))
    level = calculate_level(final_score)
    confidence = scale_confidence_for_data_quality(
        0.75 if features else 0.65, live_flags
    )
    return final_score, level, confidence, factors


def evaluate_fire(
    lat: float, lng: float, features: Optional[dict]
) -> tuple[int, str, float, List[str]]:
    f = features or {}
    live_flags = []

    weather, w_live = get_live_weather_and_elevation(lat, lng)
    if not features:
        live_flags.append(w_live)

    temp = f.get("temperature", weather["temperature"])
    wind = f.get("windSpeed", weather["windSpeed"])
    humidity = f.get("humidity", weather["humidity"])

    factors = []
    if temp > 40:
        factors.append("Extreme heat wave")
    elif temp > 34:
        factors.append("High ambient temperature")
    if humidity < 25:
        factors.append("Critical dry vegetation conditions")
    elif humidity < 40:
        factors.append("Low relative humidity")
    if wind > 30:
        factors.append("High surface wind speed")
    if not factors:
        factors.append("Normal thermal and vegetation conditions")

    ml_result = ml_predict(
        "fire", {"temperature": temp, "windSpeed": wind, "humidity": humidity}
    )
    if ml_result:
        score, level, raw_conf = ml_result
        confidence = scale_confidence_for_data_quality(raw_conf, live_flags)
        return score, level, confidence, factors

    # Fallback rule-based scoring
    score = 10.0
    if temp > 40:
        score += 35
    elif temp > 34:
        score += 20
    if humidity < 25:
        score += 30
    elif humidity < 40:
        score += 15
    if wind > 30:
        score += 25
    elif wind > 18:
        score += 12

    final_score = int(min(max(score, 5), 95))
    level = calculate_level(final_score)
    confidence = scale_confidence_for_data_quality(
        0.85 if features else 0.80, live_flags
    )
    return final_score, level, confidence, factors


def evaluate_earthquake(
    lat: float, lng: float, features: Optional[dict]
) -> tuple[int, str, float, List[str]]:
    f = features or {}
    live_flags = []

    max_mag, event_count, s_live = get_recent_seismic_activity(lat, lng)
    zone_score, z_live = get_seismic_zone_score(lat, lng)

    seismic_indicator = f.get("seismicActivity", max_mag)
    fault_proximity = f.get("faultProximityScore", zone_score)

    if "seismicActivity" not in f:
        live_flags.append(s_live)
    if "faultProximityScore" not in f:
        live_flags.append(z_live)

    factors = []
    if seismic_indicator >= 5.5:
        factors.append("Significant recent seismic activity")
    elif seismic_indicator >= 4.0:
        factors.append("Moderate local tremors detected")
    elif event_count > 3:
        factors.append("Frequent cluster of low-magnitude events")
    if fault_proximity > 0.7:
        factors.append("High regional seismic vulnerability zone")
    elif fault_proximity > 0.5:
        factors.append("Moderate regional seismic vulnerability zone")
    if not factors:
        factors.append("Low background seismic frequency")

    ml_result = ml_predict(
        "earthquake",
        {
            "seismicActivity": seismic_indicator,
            "eventCount": event_count,
            "faultProximityScore": fault_proximity,
        },
    )
    if ml_result:
        score, level, raw_conf = ml_result
        confidence = scale_confidence_for_data_quality(raw_conf, live_flags)
        return score, level, confidence, factors

    # Fallback rule-based scoring
    score = 20.0
    if seismic_indicator >= 5.5:
        score += 45
    elif seismic_indicator >= 4.0:
        score += 30
    elif event_count > 3:
        score += 20
    if fault_proximity > 0.7:
        score += 25
    elif fault_proximity > 0.5:
        score += 12

    final_score = int(min(max(score, 5), 92))
    level = calculate_level(final_score)
    confidence = scale_confidence_for_data_quality(0.81, live_flags)
    return final_score, level, confidence, factors


# ==========================================
# 4. PRIMARY INFERENCE ROUTE
# ==========================================


@app.post("/predict-risk", response_model=PredictRiskResponse)
def predict_risk(payload: PredictRiskRequest):
    disaster_type = payload.disasterType.strip().lower()
    lat = payload.location.lat
    lng = payload.location.lng
    loc_id = payload.locationId or "district-custom"

    if disaster_type == "flood":
        score, level, conf, factors = evaluate_flood(lat, lng, payload.features)
    elif disaster_type == "fire":
        score, level, conf, factors = evaluate_fire(lat, lng, payload.features)
    elif disaster_type == "earthquake":
        score, level, conf, factors = evaluate_earthquake(lat, lng, payload.features)
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid disasterType. Allowed types: 'flood', 'fire', 'earthquake'",
        )

    return PredictRiskResponse(
        disasterType=disaster_type,
        locationId=loc_id,
        riskScore=score,
        riskLevel=level,
        confidence=conf,
        riskFactors=factors,
        # Matches contract format exactly: "...Z", not "...+00:00"
        predictedAt=datetime.datetime.now(datetime.timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
