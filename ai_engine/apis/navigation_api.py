import math
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

# Initial list of rescue teams 
RESCUE_TEAMS = [
    {"id": "NDRF-Alpha-01", "name": "NDRF Alpha Unit (Heavy Rescue)", "lat": 18.5204, "lon": 73.8567, "status": "Available"},
    {"id": "SDRF-Bravo-02", "name": "SDRF Medical Response Unit", "lat": 18.5000, "lon": 73.8000, "status": "Available"},
    {"id": "POLICE-Delta-05", "name": "Local District Police Rapid Team", "lat": 18.4500, "lon": 73.9000, "status": "Busy"},
    {"id": "NDRF-Charlie-03", "name": "NDRF Flood & Boat Squad", "lat": 18.5900, "lon": 73.8200, "status": "Available"}
]

def geocode_location(location_name):
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={location_name}&count=1&format=json"
    res = requests.get(url).json()
    if "results" in res and len(res["results"]) > 0:
        return res["results"][0]["latitude"], res["results"][0]["longitude"]
    raise ValueError(f"Location '{location_name}' not found")

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

@app.route('/api/add-team', methods=['POST'])
def add_rescue_team():
    data = request.get_json() or {}
    team_id = data.get('id')
    name = data.get('name')
    lat = data.get('lat')
    lon = data.get('lon')
    status = data.get('status', 'Available')

    if not team_id or not name or lat is None or lon is None:
        return jsonify({"status": "error", "message": "Fields 'id', 'name', 'lat', and 'lon' are required."}), 400

    for team in RESCUE_TEAMS:
        if team['id'] == team_id:
            return jsonify({"status": "error", "message": f"Team with ID '{team_id}' already exists."}), 400

    new_team = {
        "id": team_id,
        "name": name,
        "lat": lat,
        "lon": lon,
        "status": status
    }
    RESCUE_TEAMS.append(new_team)

    return jsonify({
        "status": "success",
        "message": "Rescue team registered successfully.",
        "added_team": new_team,
        "total_teams_registered": len(RESCUE_TEAMS)
    })

@app.route('/api/find-nearest-team', methods=['POST'])
def find_nearest_team():
    data = request.get_json() or {}
    location_name = data.get('location_name')

    if not location_name:
        return jsonify({"status": "error", "message": "'location_name' is required."}), 400

    try:
        incident_lat, incident_lon = geocode_location(location_name)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

    nearest_team = None
    min_distance = float('inf')
    all_teams_evaluated = []

    for team in RESCUE_TEAMS:
        distance_km = calculate_haversine_distance(incident_lat, incident_lon, team['lat'], team['lon'])
        
        team_info = {
            "id": team['id'],
            "name": team['name'],
            "status": team['status'],
            "distance_km": distance_km
        }
        all_teams_evaluated.append(team_info)

        if team['status'] == "Available" and distance_km < min_distance:
            min_distance = distance_km
            nearest_team = team_info

    if not nearest_team:
        return jsonify({
            "status": "warning",
            "message": "No available rescue teams found nearby.",
            "evaluated_teams": all_teams_evaluated
        }), 200

    return jsonify({
        "status": "success",
        "incident_location": {"location_name": location_name, "lat": incident_lat, "lon": incident_lon},
        "optimal_dispatch": {
            "team_id": nearest_team['id'],
            "team_name": nearest_team['name'],
            "distance_km": nearest_team['distance_km'],
            "estimated_response_time_mins": round(nearest_team['distance_km'] * 2.5)
        },
        "all_evaluated_units": all_teams_evaluated
    })

if __name__ == '__main__':
    app.run(port=5004, debug=True)