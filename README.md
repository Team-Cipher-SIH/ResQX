# 🚨 ResQtech

> **Detect. Respond. Protect.**

**ResQtech** is a smart, full-stack disaster management and emergency response platform built for **Smart India Hackathon (SIH)**.

It connects **Citizens, Government Authorities, and Field Responders** on a unified platform for real-time incident reporting, response coordination, shelter management, and disaster monitoring.

---

## 🌐 Overview

ResQtech provides three interconnected portals:

| Portal                           | Purpose                                                               |
| -------------------------------- | --------------------------------------------------------------------- |
| 👤 **Citizen Portal**            | Report incidents, view the disaster map & find nearby shelters        |
| 🏛️ **Authority Command Center** | Verify incidents, prioritize cases, dispatch teams & manage resources |
| 🚑 **Responder Dashboard**       | View assigned incidents and update field response status              |

### 🔄 Response Workflow

```text
👤 Citizen
    │
    ▼
🚨 Report Incident
    │
    ▼
🏛️ Authority
    │
    ├── 🔍 Verify
    ├── 🧠 Prioritize
    └── 🚑 Dispatch
             │
             ▼
       👨‍🚒 Responder
             │
             ▼
       📊 Status Update
             │
             ▼
          ✅ Resolved
```

---

## ✨ Key Features

* 🚨 **Real-time Incident Reporting** with geolocation
* 🗺️ **Live Disaster Map** using React-Leaflet
* 🧠 **Incident Triage & Priority Scoring**
* 🏛️ **Jurisdiction-aware Authority Dashboard**
* 🚑 **Response Team & Dispatch Management**
* 🏕️ **Shelter & Relief Camp Management**
* 📦 **Relief Supply Inventory Tracking**
* 📢 **Public Emergency Alerts**
* 🔐 **JWT Authentication & Role-Based Access Control**
* 📍 **Nearby Shelter Discovery**

---

## 🏛️ Jurisdiction Model

Authorities operate under a three-level access hierarchy:

```text
             🇮🇳 NATIONAL / CENTRAL
                      │
             ┌────────┴────────┐
             ▼                 ▼
        🏛️ STATE ADMIN     🏛️ STATE ADMIN
             │
        ┌────┴────┐
        ▼         ▼
   📍 DISTRICT  📍 DISTRICT
      ADMIN        ADMIN
```

| Level             | Access                         |
| ----------------- | ------------------------------ |
| 🇮🇳 **National**    | All states & districts         |
| 🏛️ **State**      | Assigned state & its districts |
| 📍 **District**   | Assigned district only         |

> 🔐 Jurisdiction restrictions are enforced **server-side through API middleware**.

---

## 🤖 AI Engine — In Development

ResQtech includes a separate **Python-based AI engine** for future intelligent disaster-management capabilities.

### Planned Features

* 🌊 Flood Risk Prediction
* 🤖 RAG-based Disaster Assistant
* 📊 Intelligent Disaster Analysis

> 🚧 **Current Status:** The AI engine is under development and is **not yet integrated** with the main Node.js backend or frontend.

### Planned Architecture

```text
             RESQTECH PLATFORM
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    Node.js Backend      Python AI Engine
          │                   │
       MongoDB         ┌──────┴──────┐
                       ▼             ▼
                  Flood ML        RAG
                       │             │
                       └──────┬──────┘
                              ▼
                       🚧 Future Integration
```

---

## 🛠️ Tech Stack

### Frontend

`Next.js` • `TypeScript` • `Tailwind CSS` • `React-Leaflet`

### Backend

`Node.js` • `Express.js` • `MongoDB` • `Mongoose` • `JWT` • `Axios`

### AI Engine

`Python` • `Machine Learning` • `RAG`

### API Testing

`Postman`

---

## 📁 Project Structure

```text
ResQtech/
│
├── 📁 backend/
│   ├── 📁 controllers/
│   ├── 📁 models/
│   ├── 📁 routes/
│   ├── 📁 middleware/
│   ├── server.js
│   └── .env.example
│
├── 📁 frontend/
│   └── 📁 src/
│       ├── 📁 app/
│       │   ├── 📁 citizen/
│       │   ├── 📁 authority/
│       │   └── 📁 responder/
│       ├── 📁 components/
│       └── 📁 lib/
│
├── 🚧 📁 ai-engine/
│   ├── 📁 flood-prediction/
│   ├── 📁 rag-assistant/
│   └── main.py
│
├── 📁 postman/
├── .gitignore
├── README.md
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

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

## 🔑 Environment Variables

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

## 🌳 Branching Strategy

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

* `main` → Stable & demo-ready
* `dev` → Integration branch
* `feature/*` → Individual feature development

---

## 👥 Team

### 🎨 Frontend — 2 Members

UI, dashboards, maps, portals & API integration

### ⚙️ Backend — 4 Members

APIs, database, authentication, authorization, incidents, dispatch & resource management

### 🤖 AI

Separate AI engine currently under development.

---

## 🎯 Vision

> **During a disaster, every second matters.**

ResQtech aims to make emergency response:

**⚡ Faster • 🎯 Smarter • 🤝 Coordinated • 📊 Data-Driven**

by connecting the people who **report**, **decide**, and **respond** — all through one platform.

---

# 🏆 Built for Smart India Hackathon

## **ResQtech**

### *Smart Disaster Management & Emergency Response Platform*

**Detect. Respond. Protect.**
