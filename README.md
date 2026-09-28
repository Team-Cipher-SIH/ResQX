# 🚨 ResQtech

> **Detect. Respond. Protect.**

**ResQtech** is a smart disaster management and emergency response platform built for **Smart India Hackathon (SIH)**.

It connects **Citizens, Government Authorities, and Field Responders** on a unified platform for incident reporting, real-time coordination, shelter discovery, resource management, and emergency response.

---

## 🎯 Problem

During disasters, emergency information is often fragmented between citizens, authorities, and field teams. This can lead to:

* Delayed incident reporting
* Poor coordination between departments
* Difficulty prioritizing emergencies
* Lack of real-time situational awareness
* Difficulty locating nearby shelters and resources

## 💡 Our Solution

ResQtech creates a single platform where:

```text
👤 Citizen
    │
    ▼
🚨 Report Incident
    │
    ▼
🏛️ Authority
    │
    ├── Verify
    ├── Prioritize
    └── Dispatch
            │
            ▼
       🚑 Responder
            │
            ▼
       ✅ Resolve
```

---

# ✨ Key Features

### 👤 Citizen Portal

* 🚨 Real-time incident reporting
* 📍 Automatic geolocation
* 🗺️ Live disaster map
* 🏕️ Nearby shelter discovery
* 📢 Emergency alerts
* 💬 AI assistant for safety guidance

### 🏛️ Authority Command Center

* 🔍 Incident verification
* 🧠 Incident prioritization
* 🚑 Responder dispatch
* 📊 Disaster monitoring
* 📦 Resource management
* 🏕️ Shelter management
* 🔐 Jurisdiction-based access

### 🚑 Responder Dashboard

* 📋 Assigned incidents
* 📍 Incident location
* 📊 Response status updates
* ✅ Resolution tracking

---

# 🗺️ Real-Time Disaster Map

Currently, disaster markers are generated from **citizen-reported incidents**.

```text
👤 Citizen
     │
     ▼
🚨 Incident Report
     │
     ▼
🗄️ MongoDB
     │
     ▼
📡 REST API
     │
     ▼
🗺️ React-Leaflet Map
     │
     ▼
🔌 Socket.IO
     │
     ▼
⚡ Real-Time Updates
```

Incidents are stored with GeoJSON coordinates:

```json
{
  "location": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  }
}
```

Socket.IO events such as `new-incident` and `incident-updated` allow connected clients to receive updates without refreshing the page.

---

# 🏛️ Jurisdiction Model

Authorities have hierarchical access:

```text
🇮🇳 NATIONAL
     │
     ▼
🏛️ STATE
     │
     ▼
📍 DISTRICT
```

| Level         | Access                     |
| ------------- | -------------------------- |
| 🇮🇳 National | All states & districts     |
| 🏛️ State     | Assigned state & districts |
| 📍 District   | Assigned district          |

> 🔐 Access restrictions are enforced server-side through API middleware.

---

# 🤖 AI Layer — Future Development

ResQtech is designed to support an autonomous AI disaster-detection layer.

### Planned Pipeline

```text
🌦️ Weather Data
🌊 Water-Level Data
🌍 Seismic Data
🛰️ Satellite / Historical Data
          │
          ▼
     🤖 AI Engine
          │
          ▼
   ⚠️ Disaster Detected
       │     │     │
       ▼     ▼     ▼
     🗺️    📢    🏛️
     Map   Alert  Authority
```

### Planned AI Capabilities

* 🌊 Flood risk prediction
* 🤖 RAG-based disaster assistant
* 📊 Intelligent disaster analysis
* ⚠️ Autonomous disaster detection

> 🚧 **Prototype Status:** Autonomous AI detection is currently under development and is not yet integrated with the current backend.
> The existing citizen-reporting and real-time incident pipeline works independently.

---

# 🏗️ Architecture

```text
                 RESQTECH
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   👤 Citizen   🏛️ Authority  🚑 Responder
       │            │            │
       └────────────┼────────────┘
                    ▼
             Node.js + Express
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      MongoDB             Socket.IO
          │                   │
          └─────────┬─────────┘
                    ▼
             Future AI Engine
                 Python
```

---

# 🛠️ Tech Stack

### Frontend

`Next.js` • `TypeScript` • `Tailwind CSS` • `React-Leaflet`

### Backend

`Node.js` • `Express.js` • `MongoDB` • `Mongoose` • `JWT` • `Socket.IO` • `Axios`

### AI

`Python` • `Machine Learning` • `RAG`

### Testing

`Postman`

---

# 📁 Project Structure

```text
ResQtech/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── citizen/
│       │   ├── authority/
│       │   └── responder/
│       ├── components/
│       └── lib/
│
├── ai-engine/
│   ├── flood-prediction/
│   ├── rag-assistant/
│   └── main.py
│
├── postman/
├── README.md
└── package.json
```

---

# 🚀 Getting Started

## Prerequisites

* Node.js `v18+`
* MongoDB
* Git
* Postman *(optional)*

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Runs on:

```text
http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on:

```text
http://localhost:3000
```

---

# 🔑 Environment Variables

Create `.env` inside `/backend`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

For a separately deployed backend:

```env
NEXT_PUBLIC_API_URL=https://your-deployed-backend-url/api
```

> ⚠️ Never commit `.env` files or expose secret keys.

---

# 📊 Prototype Status

| Module               | Status            |
| -------------------- | ----------------- |
| Citizen Portal       | ✅ Working         |
| Authority Portal     | ✅ Working         |
| Responder Portal     | ✅ Working         |
| Incident Reporting   | ✅ Working         |
| Geolocation          | ✅ Working         |
| Live Disaster Map    | ✅ Working         |
| Socket.IO Updates    | ✅ Working         |
| JWT + RBAC           | ✅ Working         |
| Jurisdiction Control | ✅ Working         |
| Shelter Management   | 🚧 Prototype      |
| Resource Management  | 🚧 Prototype      |
| AI Detection         | 🚧 In Development |
| Flood Prediction     | 🚧 Planned        |
| RAG Assistant        | 🚧 In Development |

---

# 🌳 Development

```text
main
 │
 └── dev
      ├── feature/auth
      ├── feature/incident-api
      ├── feature/shelter-management
      ├── feature/dispatch
      ├── feature/dashboard
      └── feature/ai-engine
```

* `main` → Stable/demo-ready
* `dev` → Integration
* `feature/*` → Individual features

---

# 👥 Team

### 🎨 Frontend — 2 Members

UI, dashboards, maps, portals & API integration.

### ⚙️ Backend — 4 Members

APIs, database, authentication, authorization, incidents, dispatch & resource management.

### 🤖 AI

AI engine, flood prediction, RAG and intelligent disaster analysis.

---

# 🔮 Roadmap

```text
CURRENT
Citizen Reports
      │
      ▼
Real-Time Platform
      │
      ▼
Authority Coordination
      │
      ▼
Responder Dispatch
      │
      ▼
        🚧
Future AI Detection
      │
      ▼
Automatic Alerts
      │
      ▼
Intelligent Response
```

---

# 🎯 Vision

> **During a disaster, every second matters.**

ResQtech aims to make emergency response:

**⚡ Faster • 🎯 Smarter • 🤝 Coordinated • 📊 Data-Driven**

by connecting the people who **report, decide, and respond** through one unified platform.

---

# 🏆 Built for Smart India Hackathon

## 🚨 ResQtech

### *Smart Disaster Management & Emergency Response Platform*

> **Detect. Respond. Protect.**
