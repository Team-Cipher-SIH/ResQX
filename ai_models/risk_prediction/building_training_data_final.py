"""
RESQTECH - FLOOD ML PIPELINE
Phase 2: Build Historical Training Dataset

What this script does:
1. Loads processed historical flood events.
2. Uses district + state information.
3. Creates positive flood examples (Flood_Occurred = 1).
4. Creates candidate non-flood dates (Flood_Occurred = 0).
5. Gets district coordinates using Open-Meteo Geocoding.
6. Fetches historical rainfall from Open-Meteo Archive.
7. Creates rainfall features:
      rainfall_1d
      rainfall_3d
      rainfall_7d
8. Creates historical flood frequency using ONLY previous
   flood events, avoiding future-data leakage.
9. Saves:
      data/flood_training_dataset.csv
"""

import os
import time
import requests
import pandas as pd
import numpy as np

# ============================================================
# CONFIG
# ============================================================

DATA_DIR = "data"

INPUT_FILE = os.path.join(DATA_DIR, "processed_flood_events.csv")

OUTPUT_FILE = os.path.join(DATA_DIR, "flood_training_dataset.csv")

SAMPLE_FLOODS = 300
SAMPLE_SAFE = 300

REQUEST_DELAY = 0.25

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


# ============================================================
# UTILITY
# ============================================================


def clean_name(value):

    if pd.isna(value):
        return None

    value = str(value).strip().upper()

    value = " ".join(value.split())

    return value


# ============================================================
# 1. LOAD FLOOD EVENTS
# ============================================================


def load_flood_events():

    if not os.path.exists(INPUT_FILE):

        print(f"[ERROR] {INPUT_FILE} not found.")

        return None

    df = pd.read_csv(INPUT_FILE)

    required = ["Start Date", "District", "State", "Flood_Occurred"]

    missing = [c for c in required if c not in df.columns]

    if missing:

        print("[ERROR] Missing columns:", missing)

        return None

    df["Start Date"] = pd.to_datetime(df["Start Date"], errors="coerce")

    df["District"] = df["District"].apply(clean_name)

    df["State"] = df["State"].apply(clean_name)

    df = df.dropna(subset=["Start Date", "District", "State"])

    df["Flood_Occurred"] = 1

    return df


# ============================================================
# 2. BUILD POSITIVE EXAMPLES
# ============================================================


def build_positive_examples(df):

    # Remove exact duplicate district/date combinations
    positives = df.drop_duplicates(subset=["District", "State", "Start Date"]).copy()

    # Sample for manageable API usage
    if len(positives) > SAMPLE_FLOODS:

        positives = positives.sample(n=SAMPLE_FLOODS, random_state=42)

    positives["Flood_Occurred"] = 1

    return positives


# ============================================================
# 3. BUILD SAFE-DAY CANDIDATES
# ============================================================


def build_negative_examples(df):
    flood_intervals = []
    for _, r in df.iterrows():
        start = r["Start Date"]
        end = r.get("End Date", start)
        end = pd.to_datetime(end, errors="coerce")
        if pd.isna(end):
            end = start
        flood_intervals.append((r["District"], r["State"], start, end))

    district_pairs = df[["District", "State"]].drop_duplicates().reset_index(drop=True)

    rng = np.random.default_rng(42)

    negatives = []

    attempts = 0

    max_attempts = SAMPLE_SAFE * 20

    min_date = df["Start Date"].min()
    max_date = df["Start Date"].max()

    while len(negatives) < SAMPLE_SAFE and attempts < max_attempts:

        attempts += 1

        row = district_pairs.iloc[rng.integers(len(district_pairs))]

        district = row["District"]
        state = row["State"]

        random_days = rng.integers(0, (max_date - min_date).days + 1)

        candidate_date = min_date + pd.Timedelta(days=int(random_days))

        # Reject candidate if it lies inside any flood interval
        # for the same district + state.
        inside_flood = any(
            d == district and s == state and start <= candidate_date <= end
            for d, s, start, end in flood_intervals
        )

        if inside_flood:
            continue

        negatives.append(
            {
                "District": district,
                "State": state,
                "Start Date": candidate_date,
                "Flood_Occurred": 0,
            }
        )

    negatives = pd.DataFrame(negatives)

    return negatives


# ============================================================
# 4. GEOCODING
# ============================================================


def get_coordinates(district, state):

    query = f"{district}, {state}, India"

    params = {"name": query, "count": 5, "language": "en", "format": "json"}

    try:

        response = requests.get(GEOCODING_URL, params=params, timeout=10)

        if response.status_code != 200:
            return None, None

        results = response.json().get("results", [])

        # Prefer India results
        for result in results:

            country = (result.get("country") or "").upper()

            if country == "INDIA":

                return (float(result["latitude"]), float(result["longitude"]))

        if results:

            return (float(results[0]["latitude"]), float(results[0]["longitude"]))

    except Exception as e:

        print(f"[WARN] Geocoding failed for " f"{district}, {state}: {e}")

    return None, None


# ============================================================
# 5. FETCH HISTORICAL RAINFALL
# ============================================================


def get_historical_rainfall(lat, lon, date):

    date_str = date.strftime("%Y-%m-%d")

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": date_str,
        "end_date": date_str,
        "daily": "precipitation_sum",
        "timezone": "auto",
    }

    try:

        response = requests.get(ARCHIVE_URL, params=params, timeout=15)

        if response.status_code != 200:

            return None

        data = response.json()

        daily = data.get("daily", {})

        values = daily.get("precipitation_sum", [])

        if not values:

            return None

        value = values[0]

        if value is None:

            return 0.0

        return float(value)

    except Exception:

        return None


# ============================================================
# 6. FETCH RAINFALL WINDOW
# ============================================================


def get_rainfall_features(lat, lon, date):

    # FIX: use rainfall from BEFORE the flood date, not including it.
    # Predicting risk using rain that fell on the same day the flood
    # already started isn't genuine "before-disaster" prediction.
    end_date = date - pd.Timedelta(days=1)

    start_date = end_date - pd.Timedelta(days=6)

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": "precipitation_sum",
        "timezone": "auto",
    }

    try:

        response = requests.get(ARCHIVE_URL, params=params, timeout=20)

        if response.status_code != 200:

            return None

        data = response.json()

        rainfall = data.get("daily", {}).get("precipitation_sum", [])

        if not rainfall:

            return None

        values = [float(x) for x in rainfall if x is not None]

        if not values:

            return None

        # Last value corresponds to target date
        rainfall_1d = values[-1]

        rainfall_3d = sum(values[-3:])

        rainfall_7d = sum(values[-7:])

        return {
            "rainfall_1d": rainfall_1d,
            "rainfall_3d": rainfall_3d,
            "rainfall_7d": rainfall_7d,
        }

    except Exception:

        return None


# ============================================================
# 7. HISTORICAL FLOOD FREQUENCY
# ============================================================


def calculate_historical_frequency(flood_df, district, state, target_date):

    district_floods = flood_df[
        (flood_df["District"] == district)
        & (flood_df["State"] == state)
        & (flood_df["Start Date"] < target_date)
    ]

    if len(district_floods) == 0:

        return 0.0

    years = (target_date - district_floods["Start Date"].min()).days / 365.25

    if years <= 0:

        return 0.0

    events_per_year = len(district_floods) / years

    # Convert to bounded 0-1 feature.
    # 1 event/year or more = 1.0
    frequency = min(events_per_year, 1.0)

    return round(frequency, 4)


# ============================================================
# 8. BUILD WEATHER DATASET
# ============================================================


def build_weather_dataset(positives, negatives, flood_history):
    print("STEP 4 - FETCHING REAL HISTORICAL RAINFALL")

    combined = pd.concat([positives, negatives], ignore_index=True)

    # Cache coordinates by district/state
    coordinate_cache = {}

    records = []

    total = len(combined)

    for index, row in combined.iterrows():

        district = row["District"]
        state = row["State"]
        date = row["Start Date"]

        key = (district, state)

        # ----------------------------------------------------
        # Get coordinates
        # ----------------------------------------------------

        if key not in coordinate_cache:

            print(f"[GEO] {district}, {state}")

            lat, lon = get_coordinates(district, state)

            coordinate_cache[key] = (lat, lon)

            time.sleep(REQUEST_DELAY)

        else:

            lat, lon = coordinate_cache[key]

        if lat is None:

            print(f"[SKIP] Could not locate " f"{district}, {state}")

            continue

        # ----------------------------------------------------
        # Historical rainfall
        # ----------------------------------------------------

        weather = get_rainfall_features(lat, lon, date)

        if weather is None:

            print(f"[SKIP] No rainfall data: " f"{district}, " f"{date.date()}")

            continue

        # ----------------------------------------------------
        # Historical flood frequency
        # ----------------------------------------------------

        frequency = calculate_historical_frequency(flood_history, district, state, date)

        records.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "district": district,
                "state": state,
                "latitude": lat,
                "longitude": lon,
                "rainfall_1d": weather["rainfall_1d"],
                "rainfall_3d": weather["rainfall_3d"],
                "rainfall_7d": weather["rainfall_7d"],
                "historicalFloodFrequency": frequency,
                "Flood_Occurred": int(row["Flood_Occurred"]),
            }
        )

        if (index + 1) % 20 == 0:

            print(f"Progress: " f"{index + 1}/{total}")

        time.sleep(REQUEST_DELAY)

    result = pd.DataFrame(records)

    return result


# ============================================================
# 9. SAVE
# ============================================================


def save_dataset(df):

    os.makedirs(DATA_DIR, exist_ok=True)

    df.to_csv(OUTPUT_FILE, index=False)


# ============================================================
# MAIN
# ============================================================


def main():
    print("RESQTECH - FLOOD ML")
    print("PHASE 2: BUILD REAL TRAINING DATA")

    # 1
    flood_df = load_flood_events()

    if flood_df is None:
        return

    # 2
    positives = build_positive_examples(flood_df)

    # 3
    negatives = build_negative_examples(flood_df)

    if len(negatives) == 0:

        print("[ERROR] Could not create " "non-flood examples.")

        return

    # 4
    final_df = build_weather_dataset(positives, negatives, flood_df)

    # 5
    save_dataset(final_df)


if __name__ == "__main__":
    main()
