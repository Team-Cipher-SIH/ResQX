"""
compute_district_flood_frequency.py

Builds district_flood_frequency.json from your real processed_flood_events.csv,
using the EXACT SAME formula building_training_data_final.py used to compute
historicalFloodFrequency during training:

    events_per_year = count(district's floods) / years_of_history
    frequency = min(events_per_year, 1.0)

api.py loads this file at startup and looks up a location's district (via
reverse-geocoding) to get a frequency value that's consistent with what the
model was actually trained on - not a different rainfall-based proxy.
"""

import json
import os
import pandas as pd

INPUT_FILE = os.path.join("data", "processed_flood_events.csv")
OUTPUT_FILE = os.path.join("data", "district_flood_frequency.json")


def main():
    if not os.path.exists(INPUT_FILE):
        print(f"[ERROR] {INPUT_FILE} not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    df["Start Date"] = pd.to_datetime(df["Start Date"], errors="coerce")
    df = df.dropna(subset=["Start Date", "District", "State"])

    today = pd.Timestamp.now()
    lookup = {}

    for (district, state), group in df.groupby(["District", "State"]):
        first_event = group["Start Date"].min()
        years = (today - first_event).days / 365.25

        if years <= 0:
            freq = 0.0
        else:
            events_per_year = len(group) / years
            freq = round(min(events_per_year, 1.0), 4)

        key = f"{district.strip().upper()}|{state.strip().upper()}"
        lookup[key] = freq

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(lookup, f, indent=2)


if __name__ == "__main__":
    main()
