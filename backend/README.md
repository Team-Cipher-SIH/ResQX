# ResQtech (ResQX) — Backend API Service

**Smart India Hackathon (SIH) 2026 — AI-Powered Civic Resilience & Disaster Management Platform**

ResQtech is a unified emergency response and civic intelligence platform connecting citizens, multi-tiered government disaster authorities, and field responder rescue units in real time.

---

## 🚀 Key Architectural Highlights

- **Smart Dispatch Engine**: Recommends candidate response teams dynamically filtered by jurisdiction, active status, capability fit, and ranked by 2dsphere GPS proximity (`GET /api/dispatches/recommend/:incidentId`).
- **Abuse-Resistant Guest SOS**: 1-tap unauthenticated emergency SOS with location sanity bounds checking (`[0,0]` rejection), sliding-window rate limiting, and 200m proximity deduplication.
- **Decoupled Non-Blocking AI Pipeline**: Sub-50ms incident response; dual AI verification (Google Gemini 1.5 Flash + Forensic NLP Heuristic) runs asynchronously in the background.
- **Zero-Leakage Multi-Tiered Jurisdiction**: Strict state/district multi-tenancy enforced at database query level and Socket.IO room level.
- **Searchable Audit Trail**: Complete immutable logging (`ActivityLog`) capturing auth logins, incident lifecycle, dispatches, and shelter changes (`GET /api/audit-logs`).

---

## 🛠️ Tech Stack

- **Runtime & Framework**: Node.js, Express.js 5.x
- **Database**: MongoDB Atlas with Mongoose ODM (2dsphere geospatial indexing)
- **Realtime Networking**: Socket.IO 4.x with custom room scoping
- **Authentication**: JWT (Access Tokens + Refresh Tokens) & bcryptjs
- **Media Storage**: Cloudinary with Multer
- **AI / NLP**: Google Gemini 1.5 Flash API + Deterministic Forensic NLP Engine

---

## 📂 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── config.js               # Environment variables config
│   │   ├── db.js                   # MongoDB connection pool
│   │   └── socket.js               # Socket.IO setup & jurisdiction room scoping
│   ├── controllers/
│   │   ├── audit.controller.js     # Searchable audit trail query endpoint
│   │   ├── auth.controller.js      # Auth, JWT, jurisdiction claims, login logs
│   │   ├── dispatch.controller.js  # Smart recommendations, dispatch CRUD, status sync
│   │   ├── incident.controller.js  # Incidents, Guest SOS, non-blocking AI, retry
│   │   ├── responseteam.controller.js # Response team CRUD & availability
│   │   └── shelter.controller.js   # Shelter management & capacity updates
│   ├── middleware/
│   │   ├── auth.middleware.js      # protect, optionalProtect, authorize roles
│   │   ├── jurisdiction.middleware.js # Multi-tenancy state/district filtering
│   │   └── sosProtection.middleware.js# GPS validation, rate limiter, guest identity
│   ├── models/
│   │   ├── activitylog.model.js    # Audit trail schema with targetType/targetId
│   │   ├── alert.model.js          # Civic & disaster advisories
│   │   ├── dispatch.model.js       # Dispatch mission lifecycle & statusHistory
│   │   ├── incident.model.js       # Incident schema with aiAnalysis & geo coordinates
│   │   ├── responseteam.model.js   # Units with 2dsphere currentLocation
│   │   ├── shelter.model.js        # Relif shelters with live occupancy
│   │   └── user.model.js           # Users with roles & authority levels
│   ├── utils/
│   │   ├── aiVerificationService.js# Gemini 1.5 Flash + Forensic NLP triage
│   │   ├── priorityScore.js        # Dynamic formula calculator
│   │   └── seedDemo.js             # One-command realistic demo data seeder
│   └── app.js                      # Express application, routes, error handlers
├── server.js                       # HTTP server + Socket.IO bootstrap
├── .env.example                    # Sample environment template
├── API_CONTRACT.md                 # Complete API specification
├── DEMO_SCRIPT.md                  # 5-minute live demo run-of-show & architecture
└── ResQtech_API_Postman_Collection.json # Importable Postman v2.1 collection
```

---

## ⚡ Quick Start & Setup

### 1. Installation
```bash
git clone <repo-url>
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 3. Seed Realistic Demo Data (One-Command)
Populates Central Admin, Pune Admin, Mumbai Admin, Responders, Citizens, ResponseTeams, Shelters, and Incidents:
```bash
npm run seed:demo
```

### 4. Start Server
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```
Server starts on `http://localhost:5000` with health check at `GET /`.

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Jurisdiction |
|---|---|---|---|
| **Central Admin** | `admin@resqtech.gov.in` | `Admin@12345` | National Command |
| **Pune District Admin** | `pune.admin@resqtech.gov.in` | `Pune@12345` | Maharashtra / Pune |
| **Mumbai District Admin** | `mumbai.admin@resqtech.gov.in` | `Mumbai@12345` | Maharashtra / Mumbai (Isolation Proof) |
| **Field Responder** | `responder.pune@resqtech.gov.in` | `Responder@12345` | Maharashtra / Pune (Mobile Unit) |
| **Citizen User** | `citizen@gmail.com` | `Citizen@12345` | General Public |

---

## 🧪 Postman Collection for Testing

Import `ResQtech_API_Postman_Collection.json` directly into Postman.  
It includes pre-built requests, environment variables, and auto-JWT extraction for:
1. Authentication (Pune Admin & Mumbai Admin)
2. Guest SOS with Rate Limiting & Location Rejection
3. Smart Dispatch Team Recommendations (`GET /api/dispatches/recommend/:incidentId`)
4. Active Dispatch Mission Transitions
5. Shelter Lookups & Capacity Updates
6. Searchable Audit Trail Querying (`GET /api/audit-logs`)
