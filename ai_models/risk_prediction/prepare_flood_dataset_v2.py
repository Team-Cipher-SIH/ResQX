"""
RESQTECH - FLOOD ML PIPELINE
PHASE 1 V2: Clean district-state flood event table.

Key rule:
- Rainfall + DFSI are the primary geographic sources.
- Ambiguous districts are resolved ONLY when the event-level State contains
  exactly one state and that state is one of the known candidates.
- Open-Meteo geocoding is NOT used to automatically assign states.
- Unknown/uncertain records remain unresolved rather than becoming wrong labels.
"""

import os
import re
import pandas as pd

DATA_DIR = "data"

RAW_FILE = os.path.join(DATA_DIR, "India_Flood_Inventory_v3.csv")
RAINFALL_FILE = os.path.join(DATA_DIR, "rainfall_districtwise_daily_imd.csv")
DFSI_FILE = os.path.join(DATA_DIR, "DFSI.csv")
OUTPUT_FILE = os.path.join(DATA_DIR, "processed_flood_events.csv")

# ------------------------------------------------------------------
# TEXT CLEANING
# ------------------------------------------------------------------

def clean_text(value):
    if pd.isna(value):
        return ""
    value = str(value).strip().upper()
    value = value.replace("\n", " ").replace("\t", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip(" ,;*")


def clean_state(value):
    value = clean_text(value)

    aliases = {
        "ORISSA": "ODISHA",
        "UTTARANCHAL": "UTTARAKHAND",
        "JAMMU & KASHMIR": "JAMMU AND KASHMIR",
        "NCT OF DELHI": "DELHI",
        "CHHATISGARH": "CHHATTISGARH",
    }
    return aliases.get(value, value)


DISTRICT_ALIASES = {
    "ALLAHABAD": "PRAYAGRAJ",
    "PRAYAG": "PRAYAGRAJ",
    "BARA BANKI": "BARABANKI",
    "GHAZIPURR": "GHAZIPUR",

    "PASHCHIM CHAMPARAN": "WEST CHAMPARAN",
    "PURBI CHAMPARAN": "EAST CHAMPARAN",
    "PURBA CHAMPARAN": "EAST CHAMPARAN",

    "MYSORE": "MYSURU",
    "BANGALORE": "BENGALURU",
    "BANGALORE URBAN": "BENGALURU URBAN",
    "BANGALORE RURAL": "BENGALURU RURAL",

    "CALICUT": "KOZHIKODE",
    "TRIVANDRUM": "THIRUVANANTHAPURAM",
    "TRICHUR": "THRISSUR",
    "COCHIN": "ERNAKULAM",

    "GURGAON": "GURUGRAM",
    "KASHI": "VARANASI",
    "PONDICHERRY": "PUDUCHERRY",

    # Common malformed/legacy names in the flood inventory
    "SSHRAWASTI": "SHRAVASTI",
    "S.A.S NAGAR": "SAS NAGAR",
    "S.A.S NAGAR*": "SAS NAGAR",
    "SRI SRI MUKTSAR SAHIB SAHIB": "SRI MUKTSAR SAHIB",
    "BEEDAR": "BIDAR",
    "BAGALKOTEE": "BAGALKOTE",
    "CHAMARAJANAGARAA": "CHAMARAJANAGAR",
    "DAVANGERE????": "DAVANAGERE",
    "ANANTHAPURAMUAMU": "ANANTAPUR",
    "JAYASHANKAR BHUPALAPALLY": "JAYASHANKAR BHUPALPALLY",
    "YADADRI YADADRI BHUVANAGIRI": "YADADRI BHUVANAGAR",
    "SEPAHIJALA": "SEPAHIJALA",
    "LEH LADAKH": "LEH",
    "RUDRA PRAYAG": "RUDRAPRAYAG",
    "UTTAR KASHI": "UTTARKASHI",
    "JALORE": "JALORE",
    "JHUNJHUNU": "JHUNJHUNU",

    # Exact inventory variants
    "KHARGONE (KHARGONE (WEST NIMAR))": "KHARGONE",
    "KANPUR NAGAR NAGAR": "KANPUR NAGAR",
    "KANPUR NAGAR DEHAT": "KANPUR DEHAT",
    "PURBA PURBA BARDHAMAN": "PURBA BARDHAMAN",
    "PURBA PURBA MEDINIPUR": "PURBA MEDINIPUR",
    "PASCHIM PURBA MEDINIPUR": "PASCHIM MEDINIPUR",
    "PASCHIM PURBA BARDHAMAN": "PASCHIM BARDHAMAN",
    "NORTH 24 PARGANAS": "NORTH 24 PARGANAS",
    "SOUTH 24 PARGANAS": "SOUTH 24 PARGANAS",
    "SOUTH 24 PARGANAS*": "SOUTH 24 PARGANAS",
    "DEVBHUMI DWARKA DWARKA": "DEVBHUMI DWARKA",
    "BHADRADRI BHADRADRI KOTHAGUDEM": "BHADRADRI KOTHAGUDEM",
    "BHADRADRI BHADRADRI KOTHAGUDEM KOTHAGUDEM": "BHADRADRI KOTHAGUDEM",
    "BHADRADRI BHADRADRI KOTHAGUDEM BHADRADRI KOTHAGUDEM": "BHADRADRI KOTHAGUDEM",
    "UPPER LOWER SUBANSIRI": "UPPER SUBANSIRI",
    "LOWER LOWER SUBANSIRI": "LOWER SUBANSIRI",
    "SOUTH SALMARA MANCACHAR - MANKACHAR": "SOUTH SALMARA MANKACHAR",
    "SOUTH SALMARA MANCACHAR- MANKACHAR": "SOUTH SALMARA MANKACHAR",
}


def clean_district(value):
    value = clean_text(value)

    # Repair a few repeated-token corruption patterns.
    replacements = {
        "CHAMARAJANAGARAA": "CHAMARAJANAGAR",
        "BEEDAR": "BIDAR",
        "BAGALKOTEE": "BAGALKOTE",
        "SSHRAWASTI": "SHRAVASTI",
        "ANANTHAPURAMUAMU": "ANANTAPUR",
    }

    if value in DISTRICT_ALIASES:
        return DISTRICT_ALIASES[value]

    if value in replacements:
        value = replacements[value]

    return DISTRICT_ALIASES.get(value, value)


INVALID_PATTERNS = [
    r"^MANY PARTS$",
    r"^MOST OF THE DISTRICTS$",
    r"^VARIOUS PARTS$",
    r"^ALL DISTRICTS$",
    r"^\d+ DISTRICTS?$",
    r"^FEW DISTRICTS$",
    r"^PARTS OF ",
    r"^DIFFERENT PARTS",
    r"^CENTRAL PART",
    r"^COASTAL DISTRICTS",
    r"^SEVERAL OTHER DISTRICT",
    r"^NORTH BENGAL$",
    r"^GHAT AREA$",
    r"^KASHMIR VALLEY$",
    r"^PARTS OF [A-Z ]+$",
    r"^(NORTH|SOUTH|EAST|WEST)$",
    r"^& PARTS",
    r"^HYDERABAD & PARTS",
]


def is_valid_district(value):
    value = clean_district(value)
    if not value:
        return False

    return not any(re.search(p, value) for p in INVALID_PATTERNS)


# ------------------------------------------------------------------
# CANONICAL DISTRICT -> STATES
# ------------------------------------------------------------------

def build_canonical_mapping():
    mapping = {}

    def add(district, state):
        district = clean_district(district)
        state = clean_state(state)

        if not district or not state or not is_valid_district(district):
            return

        mapping.setdefault(district, set()).add(state)

    if os.path.exists(RAINFALL_FILE):
        rainfall = pd.read_csv(RAINFALL_FILE)

        if "District" in rainfall.columns and "State" in rainfall.columns:
            for _, row in rainfall[["District", "State"]].drop_duplicates().iterrows():
                add(row["District"], row["State"])
    else:
        print(f"[WARN] Missing {RAINFALL_FILE}")

    if os.path.exists(DFSI_FILE):
        dfsi = pd.read_csv(DFSI_FILE)

        district_col="Unnamed: 0"
        if district_col and "State_Name" in dfsi.columns:
            for _, row in dfsi[[district_col, "State_Name"]].drop_duplicates().iterrows():
                add(row[district_col], row["State_Name"])
        else:
            print("[WARN] DFSI district/state columns not found.")
    else:
        print(f"[WARN] Missing {DFSI_FILE}")

    unambiguous = {
        d: next(iter(states))
        for d, states in mapping.items()
        if len(states) == 1
    }

    ambiguous = {
        d: sorted(states)
        for d, states in mapping.items()
        if len(states) > 1
    }

    return mapping, unambiguous, ambiguous


# ------------------------------------------------------------------
# EVENT STATE CONTEXT
# ------------------------------------------------------------------

def extract_states(value):
    """
    Event-level State can contain multiple states. We only use it when,
    after cleaning, exactly one valid state remains.
    """
    if pd.isna(value):
        return set()

    parts = re.split(r"[,;/&]+", str(value))

    states = {
        clean_state(x)
        for x in parts
        if clean_state(x)
    }

    return states


def resolve_state(district, event_state, canonical, unambiguous, ambiguous):
    district = clean_district(district)

    # 1. Strongest source: unique canonical mapping.
    if district in unambiguous:
        return unambiguous[district], "canonical"

    # 2. Ambiguous canonical name: use event state only if it contains
    # exactly one state and that state is a known candidate.
    candidates = ambiguous.get(district, [])

    event_states = extract_states(event_state)

    if len(event_states) == 1:
        event_state_only = next(iter(event_states))

        if event_state_only in candidates:
            return event_state_only, "event_state_disambiguation"

    # 3. Special known aliases can be mapped only if the state is known
    # from the event and agrees with the alias.
    if len(event_states) == 1:
        return None, "unresolved"

    return None, "unresolved"


# ------------------------------------------------------------------
# SPLIT DISTRICTS
# ------------------------------------------------------------------

def split_districts(value):
    if pd.isna(value):
        return []

    text = str(value).strip()

    if not text:
        return []

    text = text.replace(";", ",")

    parts = [clean_district(x) for x in text.split(",")]
    parts = [x for x in parts if is_valid_district(x)]

    return list(dict.fromkeys(parts))


# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------

def main():
    if not os.path.exists(RAW_FILE):
        print(f"[ERROR] Raw file not found: {RAW_FILE}")
        return

    raw = pd.read_csv(RAW_FILE)

    required = ["UEI", "Start Date", "End Date", "Districts", "State"]
    missing = [c for c in required if c not in raw.columns]

    if missing:
        print("[ERROR] Missing columns:", missing)
        return

    raw["Start Date"] = pd.to_datetime(raw["Start Date"], errors="coerce")
    raw["End Date"] = pd.to_datetime(raw["End Date"], errors="coerce")

    raw = raw.dropna(subset=["Start Date", "Districts"]).copy()

    mapping, unambiguous, ambiguous = build_canonical_mapping()

    records = []
    unresolved = []
    resolution_counts = {
        "canonical": 0,
        "event_state_disambiguation": 0,
    }

    processed_events = 0

    for _, row in raw.iterrows():
        processed_events += 1

        districts = split_districts(row["Districts"])

        if not districts:
            continue

        for district in districts:
            state, method = resolve_state(
                district,
                row["State"],
                mapping,
                unambiguous,
                ambiguous,
            )

            if not state:
                unresolved.append(district)
                continue

            resolution_counts[method] += 1

            record = {
                "UEI": row["UEI"],
                "Start Date": row["Start Date"],
                "End Date": row["End Date"],
                "District": district,
                "State": state,
                "Flood_Occurred": 1,
                "Mapping_Method": method,
            }

            optional_columns = [
                "Duration(Days)",
                "Main Cause",
                "Location",
                "Latitude",
                "Longitude",
                "Severity",
                "Area Affected",
                "Human fatality",
                "Human injured",
                "Human Displaced",
                "Animal Fatality",
                "District_LGD_Codes",
                "State_Codes",
                "Event Source",
            ]

            for col in optional_columns:
                if col in row.index:
                    record[col] = row[col]

            records.append(record)

        if processed_events % 500 == 0:
            print(
                f"[PROGRESS] Source events processed: "
                f"{processed_events:,}/{len(raw):,}"
            )

    result = pd.DataFrame(records)

    if result.empty:
        print("[ERROR] No clean records were created.")
        return

    result = result.drop_duplicates(
        subset=["UEI", "District", "State", "Start Date"]
    ).copy()

    result = result.sort_values(
        ["Start Date", "State", "District"]
    ).reset_index(drop=True)

    os.makedirs(DATA_DIR, exist_ok=True)

    result.to_csv(OUTPUT_FILE, index=False)

if __name__ == "__main__":
    main()
