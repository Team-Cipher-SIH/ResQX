# ResQtech (ResQX) — AI & Backend Integration Reference Guide
**Smart India Hackathon (SIH) 2026**

This document serves as the permanent memory and architectural reference for how the **Backend (Member 1)** and the **AI Risk Prediction Microservice (Member A)** are built, integrated, and verified.

---

## 1. System Architecture Overview

```
                                ┌──────────────────────────────────────────────┐
                                │   AI Microservice on Render (Python FastAPI) │
                                │   https://resqx-2oud.onrender.com            │
                                │   POST /predict-risk                         │
                                └──────────────────────┬───────────────────────┘
                                                       │ (Lightweight JSON HTTP)
                                                       ▼
┌─────────────────────────┐        ┌───────────────────────────────────────────┐
│ Next.js Frontend        │        │ Node.js / Express Core Backend            │
│ (Vercel)                │ ◄────► │ ├── utils/aiRiskService.js (Safe Adapter) │
│ - Command Map (Leaflet) │        │ ├── controllers/riskAssessment.controller │
│ - Risk Zones & Alerts   │        │ ├── models/riskAssessment.model.js        │
│ - SOS & Incident Triage │        │ └── utils/riskAlertTrigger.js (Alerts)    │
└─────────────────────────┘        └───────────────────────────────────────────┘
```

---

## 2. Why Microservice Architecture? (Solving the 500 MB Vercel Limit)

* **The Problem:** Vercel functions have a hard limit of **250 MB**. Heavy Python machine learning libraries (`torch`, `scikit-learn`, `scipy`) and model weights exceed **500 MB – 1.5 GB**, crashing Vercel builds.
* **The Solution:** 
  * The ML models run independently on **Render** (`https://resqx-2oud.onrender.com`).
  * The Node.js/Express backend runs on **Vercel** as the API Gateway, Database Manager, Authentication, and Socket.IO Broadcaster.
  * The two communicate via lightweight HTTP JSON calls (< 2 KB).

---

## 3. Phase 1: Member 1 Backend Core Pipeline

### Key Modules Implemented:
1. **Multi-Disaster Incident Schema (`incident.model.js`)**:
   * Supports `flood`, `fire`, `earthquake`, `cyclone`, `landslide`, etc.
   * Geospatial `2dsphere` index on `location.coordinates` (`[lng, lat]`).
   * Decoupled `aiAnalysis` subdocument (`pending`, `completed`, `failed`).
   * Anonymous guest reporting via `guestSessionId`.

2. **Incident Lifecycle & State Machine (`incident.controller.js`)**:
   * Progression: `reported` $\rightarrow$ `verified` $\rightarrow$ `assigned` $\rightarrow$ `in_progress` $\rightarrow$ `resolved` $\rightarrow$ `closed`.
   * Enforces multi-tenant jurisdiction (District Admins are strictly scoped to their assigned state and district).

3. **SOS Protection & Anti-Spam (`sosProtection.middleware.js`)**:
   * GPS location validation (rejects invalid/dead `[0, 0]` coordinates).
   * Sliding-window rate limiter (`SOS_RATE_LIMIT_MAX`).
   * Deduplication engine (detects duplicate SOS within 200m & 10 minutes).
   * Non-blocking AI dispatch (< 50ms response to citizens).

4. **Smart Dispatch Recommendation (`dispatch.controller.js`)**:
   * Endpoint: `GET /api/dispatches/recommend/:incidentId`.
   * Geospatial `$geoNear` aggregation sorts candidate response teams by proximity.
   * Matches team capabilities (e.g. flood rescue, fire suppression).
   * Authority-controlled: AI recommends, but only human officers dispatch.

5. **Realtime Events & Audit Logging (`activitylog.model.js`, `audit.controller.js`)**:
   * Standardized Socket.IO emissions (`resource-action` convention).
   * Complete audit trail for actions across Auth, Incidents, Dispatches, Shelters, and Risk predictions.

---

## 4. Phase 2: Member A AI Integration (Pre-Disaster Risk)

### How AI Microservice Connects:
1. **HTTP Client Adapter (`backend/src/utils/aiRiskService.js`)**:
   * Configurable target: `process.env.AI_RISK_SERVICE_URL || 'https://resqx-2oud.onrender.com'`.
   * Timeout set to **20,000ms** to accommodate Render free-tier cold starts.
   * **Fail-Safe Heuristic**: If Render is unreachable, it automatically computes an explainable baseline heuristic (`source: "baseline_heuristic"`, `aiStatus: "fallback_active"`). **Zero backend crashes**.

2. **Risk Controller & Route (`POST /api/risk/predict`)**:
   * Validates coordinates and disaster type.
   * Calls Render's `POST /predict-risk`.
   * Saves the result into MongoDB [`RiskAssessment`](backend/src/models/riskAssessment.model.js).
   * **Automatic Alert Trigger**: If `riskScore >= 70`, automatically calls `triggerEarlyWarningIfNeeded` to draft an emergency alert in MongoDB.
   * Broadcasts `risk-updated` and `alert-broadcast` over Socket.IO.

3. **Frontend Integration (`frontend/src/lib/api.ts`)**:
   * Added `RISK_AI_PREDICT: '/risk/predict'`.
   * Feeds directly into `CommandMapClient.tsx` for real-time risk zone polygon and marker rendering.

---

## 5. Automated Verification & Test Suite

File: [`backend/src/utils/testAiIntegration.js`](backend/src/utils/testAiIntegration.js)

### How to Run:
```bash
# From the backend directory:
cd backend
node src/utils/testAiIntegration.js
```

### Verified Scenarios (31/31 Passed):
1. **Auth**: JWT acquired for District Admin.
2. **Flood Model**: Score 67, Level HIGH from Render AI.
3. **Fire Model**: Score 87, Level CRITICAL from Render AI.
4. **Earthquake Model**: Score 20, Level LOW from Render AI.
5. **Auto-Alert**: Verified emergency alert automatically generated in MongoDB for Fire (Score 87 $\ge$ 70).
6. **Fallback Resilience**: Verified baseline calculation works if AI is offline.
7. **Frontend Feeds**: Verified GeoJSON `[lng, lat]` format and telemetry for Leaflet Command Map.
8. **Audit Trail**: Verified `risk_assessment_created` logged in `ActivityLog`.

---

## 6. Important Credentials for Demos

* **Central Authority Admin**: `admin@resqtech.gov.in` / `Admin@12345`
* **Pune District Admin**: `pune.admin@resqtech.gov.in` / `Pune@12345`
* **Mumbai District Admin**: `mumbai.admin@resqtech.gov.in` / `Mumbai@12345`
* **Field Responder**: `responder.pune@resqtech.gov.in` / `Responder@12345`
* **Citizen**: `citizen@gmail.com` / `Citizen@12345`
