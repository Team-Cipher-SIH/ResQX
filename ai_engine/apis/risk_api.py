import requests
import numpy as np
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def geocode_location(location_name):
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={location_name}&count=1&format=json"
    res = requests.get(url).json()
    if "results" in res and len(res["results"]) > 0:
        return res["results"][0]["latitude"], res["results"][0]["longitude"]
    raise ValueError("Location not found")

def fetch_historical_baseline(lat, lon):
    end_date = datetime.now() - timedelta(days=30)
    start_date = end_date - timedelta(days=10950)
    
    url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}&daily=precipitation_sum&timezone=auto"
    res = requests.get(url)
    data = res.json()
    
    precip_data = [x if x is not None else 0.0 for x in data.get('daily', {}).get('precipitation_sum', [])]
    precip = np.array(precip_data, dtype=float)
    precip = precip[~np.isnan(precip)]
    
    mean_rain = float(np.mean(precip)) if len(precip) > 0 else 0.0
    std_rain = float(np.std(precip)) if len(precip) > 0 else 0.0
    p95_rain = float(np.percentile(precip, 95)) if len(precip) > 0 else 0.0
    
    return mean_rain, std_rain, p95_rain

def fetch_current_and_recent_data(lat, lon):
    # Notice: forecast_days=2 grabs today (index 3) AND tomorrow (index 4)
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum&current=precipitation,cloud_cover&timezone=Asia%2FKolkata&past_days=3&forecast_days=2"
    res = requests.get(url).json()
    
    daily_precip = res.get('daily', {}).get('precipitation_sum', [])
    current_data = res.get('current', {})
    
    current_rain_rate = float(current_data.get('precipitation') or 0.0)
    cloud_cover = int(current_data.get('cloud_cover') or 0)
    
    # Index 0,1,2 = Past 3 days. Index 3 = Today. Index 4 = Tomorrow.
    past_3days_rain = sum(float(x or 0.0) for x in daily_precip[0:3])
    today_rain = float(daily_precip[3] or 0.0) if len(daily_precip) > 3 else 0.0
    tomorrow_rain = float(daily_precip[4] or 0.0) if len(daily_precip) > 4 else 0.0
    
    if today_rain > 20 and current_rain_rate == 0.0 and cloud_cover < 30:
        today_rain = today_rain * 0.1  
        past_3days_rain = past_3days_rain * 0.3  
        tomorrow_rain = tomorrow_rain * 0.1
        
    return today_rain, past_3days_rain, tomorrow_rain

@app.route('/api/predict-risk', methods=['GET'])
def predict_risk():
    location_name = request.args.get('location', 'Guwahati')
    
    try:
        lat, lon = geocode_location(location_name)
        mean_rain, std_rain, p95_rain = fetch_historical_baseline(lat, lon)
        today_rain, past_3days_rain, tomorrow_rain = fetch_current_and_recent_data(lat, lon)
        
        spi = (today_rain - mean_rain) / (std_rain if std_rain > 0 else 1)
        risk_score = 0
        
        # 1. P95 Extreme Threshold Check (Today)
        if today_rain >= p95_rain:
            risk_score += 50
        elif today_rain >= (p95_rain * 0.5):
            risk_score += 30
            
        # 2. 3-Day Soil Saturation
        if past_3days_rain > 100:
            risk_score += 30
        elif past_3days_rain > 30:
            risk_score += 15
            
        # 3. SPI Anomaly Index
        if spi > 1.5:
            risk_score += 20
        elif spi > 1.0:
            risk_score += 15
            
        # 4. PREDICTIVE THREAT ASSESSMENT (Tomorrow)
        if tomorrow_rain >= p95_rain:
            risk_score += 40 
        elif tomorrow_rain >= (p95_rain * 0.5):
            risk_score += 20
            
        if past_3days_rain > 50 and tomorrow_rain > 20:
            risk_score += 25
            
        risk_percentage = min(100, max(0, risk_score))
        
        if risk_percentage >= 70:
            severity = "RED"
            action = "Initiate immediate evacuation in low-lying areas."
        elif risk_percentage >= 40:
            severity = "ORANGE"
            action = "Alert emergency teams and clear drainage bottlenecks."
        else:
            severity = "YELLOW"
            action = "Maintain continuous monitoring."
            
        return jsonify({
            "status": "success",
            "data": {
                "location_name": location_name,
                "coordinates": {"lat": lat, "lon": lon},
                "today_accumulated_rain_mm": round(today_rain, 2),
                "past_3days_accumulated_mm": round(past_3days_rain, 2),
                "tomorrow_forecasted_rain_mm": round(tomorrow_rain, 2),
                "historical_mean_mm": round(mean_rain, 2),
                "p95_threshold_mm": round(p95_rain, 2),
                "spi_index": round(spi, 2),
                "risk_score_percentage": int(risk_percentage),
                "severity_level": severity,
                "system_recommended_action": action
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5003, debug=True)