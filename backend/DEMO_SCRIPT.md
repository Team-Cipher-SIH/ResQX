# ResQtech (ResQX) — Live Demo Script & Architecture Guide

**SIH 2026 — AI-Powered Civic Resilience & Disaster Response Platform**

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients (Next.js 14 / Mobile)"]
        Citizen[Citizen Portal & Guest SOS]
        Authority[Authority Command Center]
        Responder[Field Responder Dashboard]
    end

    subgraph API["Backend API Gateway (Express 5.x)"]
        AuthMid["JWT & Jurisdiction Scoping Middleware"]
        SOSMid["SOS Protection & Rate Limiting"]
        DispatchEngine["Smart Dispatch & Geospatial Recommender"]
        AuditService["Audit Logger (Non-blocking)"]
    end

    subgraph DataRealtime["Storage & Messaging"]
        Mongo[("MongoDB Atlas (2dsphere Geospatial)")]
        SocketIO["Socket.IO Room Scoping Engine"]
    end

    subgraph AIWorker["Asynchronous AI Triage Pipeline"]
        Gemini["Google Gemini 1.5 Flash API"]
        ForensicNLP["Forensic Heuristic NLP Engine"]
    end

    Citizen -->|Guest SOS / Photo Upload| SOSMid
    SOSMid --> Mongo
    SOSMid -.->|Non-blocking Async Task| AIWorker
    AIWorker -->|Background Triage Update| Mongo
    AIWorker -.->|Realtime Broadcast| SocketIO

    Authority -->|Recommend Teams| DispatchEngine
    DispatchEngine -->|$geoNear 2dsphere Ranking| Mongo

    Responder -->|Update Status (en_route/completed)| DispatchEngine
    DispatchEngine -->|Auto-sync Incident & Free Team| Mongo
    DispatchEngine -.->|Realtime Jurisdiction Room Broadcast| SocketIO

    SocketIO -->|Scoped Alerts| Authority
    SocketIO -->|Dispatch Assignments| Responder
```

---

## 2. 5-Minute Live Demo Run-of-Show

### **Preparation (Before Starting the Presentation):**
1. Run demo seeder in terminal:
   ```bash
   npm run seed:demo
   ```
2. Open two browser windows side-by-side:
   - **Window 1 (Right):** Authority Command Center (`pune.admin@resqtech.gov.in` / `Pune@12345`)
   - **Window 2 (Left):** Citizen Mobile View (`http://localhost:3000/citizen`)

---

### **Act 1: Citizen SOS & Abuse Protection (Minute 0:00 – 1:00)**
- **Talking Point:** *"In a disaster, panicking citizens cannot fill 20-field forms. ResQX allows 1-tap Guest SOS without mandatory login, but protects against spam."*
- **Action 1 (Guest SOS):**
  - Tap Emergency SOS button in Citizen View.
  - Show instant sub-50ms response: *"Help is on the way."*
  - Point out network tab: `aiAnalysis.status: "pending"`. Incident creation never waits for external AI APIs.
- **Action 2 (Abuse & Spam Detection):**
  - Rapidly tap SOS again at the same location.
  - Show that ResQX detects existing SOS within 200m and returns `isDuplicate: true`, incrementing report count instead of flooding the authority dashboard with duplicates.

---

### **Act 2: AI Triage & Verification (Minute 1:00 – 2:00)**
- **Talking Point:** *"ResQX doesn't blindly trust reports. Our dual AI pipeline (Gemini + Forensic NLP) runs in the background to separate real crises from civic complaints and pranks."*
- **Action:**
  - Switch to Pune Authority Command Center.
  - Show the newly arrived SOS and the seeded Mutha River flood incident.
  - Highlight the AI Triage Card:
    - **Authenticity Score:** `92% Likely Genuine`
    - **Classification:** `Flood` (P1 Priority)
    - **Recommended Unit:** `NDRF Flood Rescue Unit`
  - Show that status stays `verified`/`reported` until officer approves: *"AI suggests, Authority commands."*

---

### **Act 3: Smart Dispatch & Proximity Ranking (Minute 2:00 – 3:00)**
- **Talking Point:** *"Dispatching the wrong team or guessing distances wastes precious lives. Our candidate recommendation endpoint dynamically ranks units by jurisdiction, capability, and real-time distance."*
- **Action:**
  - Click **"Recommend Teams"** on the Flood Incident.
  - Call `GET /api/dispatches/recommend/:incidentId`.
  - Show ranked candidate list:
    1. `NDRF Pune Alpha Rescue Unit` — **1.25 km** away (matches `flood` + `boat rescue`).
    2. `Pune Fire & Hazmat Unit` — **1.50 km** away.
  - Note: Mumbai teams are excluded because jurisdiction is enforced.
  - Click **"Dispatch Team"** $\rightarrow$ status becomes `assigned`, team marked `busy`.

---

### **Act 4: Field Responder Execution & Auto-Sync (Minute 3:00 – 4:00)**
- **Talking Point:** *"Dispatches are state machines. When a responder advances their mission, linked incident status and team availability sync automatically with zero manual paperwork."*
- **Action:**
  - Open Responder View (`responder.pune@resqtech.gov.in` / `Responder@12345`).
  - Accept dispatch $\rightarrow$ Incident auto-updates to `in_progress`.
  - Mark `completed` on site:
    - Team status automatically reverts to `available`.
    - Linked Incident automatically marks `resolved` with `priorityScore: 0`.
    - Live Socket.IO event updates Authority map in real time without refreshing.

---

### **Act 5: Zero-Leakage Jurisdiction & Audit Trail (Minute 4:00 – 5:00)**
- **Talking Point:** *"Accountability and data privacy are paramount in government systems."*
- **Action 1 (Audit Trail):**
  - Navigate to `/authority/audit-logs` (or call `GET /api/audit-logs`).
  - Show complete immutable chronological trail: Who logged in, who verified, who dispatched, and timestamps.
  - Filter by `targetType: "shelter"` or `action: "user_login"`.
- **Action 2 (Zero Jurisdiction Leakage):**
  - Log in as Mumbai Admin (`mumbai.admin@resqtech.gov.in` / `Mumbai@12345`).
  - Show that Mumbai Authority sees 0 Pune incidents or dispatches. Isolation is cryptographically enforced at the database level!

---

## 3. Judge Q&A Cheat Sheet

| Question | Winning Answer |
|---|---|
| *"What if Google Gemini API is down during an earthquake?"* | *"Our incident creation is completely non-blocking. Incidents save immediately with `status: pending`. If Gemini times out, `status: failed` is recorded gracefully. Authorities can still dispatch manually, and our deterministic Forensic NLP fallback acts as an offline heuristic."* |
| *"How do you prevent spam SOS if there is no login?"* | *"We combine 4 layers: 1) Hardware GPS bounds rejection (rejects [0,0]), 2) Sliding-window IP/guest rate limiter, 3) 200-meter proximity deduplication, and 4) AI prank marker dictionary."* |
| *"Can an officer from another district see private incident data?"* | *"No. All queries enforce state and district tenancy through our `jurisdiction.middleware.js`. Even Socket.IO rooms are scoped to `district:<name>`, so socket packets never reach unauthorized devices."* |
