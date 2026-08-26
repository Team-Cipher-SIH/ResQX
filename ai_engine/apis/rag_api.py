import os
import uuid
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from google import genai
from dotenv import load_dotenv
import chromadb
from chromadb.utils import embedding_functions

# Load environment variables from the .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize the Gemini client securely
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from environment variables or .env file!")

client = genai.Client(api_key=api_key)
RISK_API_URL = "http://127.0.0.1:5003/api/predict-risk"

# --- VECTOR DATABASE INITIALIZATION (CHROMADB) ---
chroma_client = chromadb.PersistentClient(path="./chroma_db")
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

kb_collection = chroma_client.get_or_create_collection(
    name="disaster_sops", 
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)

# Seed documents into the Vector DB if it's empty
if kb_collection.count() == 0:
    kb_collection.add(
        documents=[
            "SOP-01: Evacuate residents from low-lying areas immediately when risk exceeds 70%. Coordinate transport via municipal buses and prioritize elderly and children.",
            "SOP-02: NDRF deployment protocol requires establishing a command post within 2km of the impact zone, setting up emergency communication channels, and deploying rescue boats for flooded sectors.",
            "SOP-03: Relief camps must be stocked with clean drinking water, dry rations, medical kits, and backup power generators for a minimum of 72 hours.",
            "Standard Disaster Response Protocol: Maintain continuous monitoring, ensure public helplines are active, and coordinate with local district administration."
        ],
        ids=["sop_evac", "sop_ndrf", "sop_shelter", "sop_general"]
    )

def retrieve_relevant_sop(user_query):
    try:
        results = kb_collection.query(
            query_texts=[user_query],
            n_results=1
        )
        if results and results["documents"] and results["documents"][0]:
            return results["documents"][0][0]
    except Exception as e:
        print("[ERROR] Vector DB query failed:", e)
    
    return "Standard Disaster Response Protocol: Maintain continuous monitoring."

# --- ROUTE: DYNAMICALLY ADD DATA TO VECTOR DB ---
@app.route('/api/add-sop', methods=['POST'])
def add_to_vectordb():
    data = request.get_json() or {}
    new_text = data.get('text')
    doc_id = data.get('id', f"sop_custom_{uuid.uuid4().hex[:8]}")

    if not new_text:
        return jsonify({"status": "error", "message": "The 'text' field is required to update the Vector DB."}), 400

    try:
        kb_collection.add(
            documents=[new_text],
            ids=[doc_id]
        )
        return jsonify({
            "status": "success",
            "message": "New intelligence successfully embedded into Vector Database.",
            "document_id": doc_id,
            "embedded_text": new_text,
            "total_documents_in_db": kb_collection.count()
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- ROUTE: CHAT ---
@app.route('/api/chat', methods=['POST'])
def situational_rag_chat():
    data = request.get_json() or {}
    user_message = data.get('message', 'What is the current status?')
    
    # Extract location from the frontend payload (defaults to Delhi)
    location_name = data.get('location', 'Delhi')
    
    risk_url = f"{RISK_API_URL}?location={location_name}"
    
    try:
        risk_response = requests.get(risk_url, timeout=10)
        risk_data = risk_response.json().get('data', {})
        
        # Extract keys matching your current Risk API
        severity = risk_data.get('severity_level', 'YELLOW')
        today_rain = risk_data.get('today_accumulated_rain_mm', 0.0)
        past_rain = risk_data.get('past_3days_accumulated_mm', 0.0)
        risk_percentage = risk_data.get('risk_score_percentage', 0)
        spi_index = risk_data.get('spi_index', 0.0)
        action = risk_data.get('system_recommended_action', 'Maintain continuous monitoring.')
        coordinates = risk_data.get('coordinates', {})
        
    except Exception as e:
        severity = "UNKNOWN"
        today_rain = 0.0
        past_rain = 0.0
        risk_percentage = 0
        spi_index = 0.0
        action = "System monitoring active."
        coordinates = {}

    retrieved_sop = retrieve_relevant_sop(user_message)

    prompt = f"""
    You are an expert AI Command Center Assistant for disaster management. 
    You are responding to an emergency operator's query based on real-time telemetry and official guidelines.

    --- REAL-TIME TELEMETRY ---
    - Location: {location_name} (Coordinates: {coordinates.get('lat', 'N/A')}, {coordinates.get('lon', 'N/A')})
    - Severity Level: {severity}
    - Risk Score: {risk_percentage}%
    - Today's Accumulated Rainfall: {today_rain} mm
    - Past 3 Days Accumulated Rainfall (Soil Saturation): {past_rain} mm
    - SPI Anomaly Index: {spi_index}
    - System Triggered Action: {action}

    --- RETRIEVED KNOWLEDGE BASE (Vector DB Semantic Match) ---
    {retrieved_sop}

    --- OPERATOR QUERY ---
    "{user_message}"

    Instructions:
    Generate a professional, concise, and tactical briefing for the emergency operator. Integrate the real-time telemetry numbers and the retrieved SOP guidelines naturally into your response. Do not mention that you are an AI model. Format your response using clear markdown headings and bullet points.
    """

    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
        )
        ai_reply = response.text
    except Exception as e:
        ai_reply = f"Error generating LLM response: {str(e)}"

    return jsonify({
        "status": "success",
        "retrieved_context": {
            "telemetry": {
                "location_name": location_name,
                "coordinates": coordinates,
                "severity_level": severity,
                "today_rain_mm": today_rain,
                "past_3days_rain_mm": past_rain,
                "spi_index": spi_index,
                "risk_score": risk_percentage,
                "system_action": action
            },
            "retrieved_sop": retrieved_sop
        },
        "response": ai_reply
    })

if __name__ == '__main__':
    app.run(port=5002, debug=True)