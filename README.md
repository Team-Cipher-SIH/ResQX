# Disaster Management Platform — SIH Project

## Team
- Frontend: 2 members
- Backend: 4 members

## Structure
- `/frontend` — public dashboard, login, citizen portal, authority command center
- `/backend` — Express + MongoDB API

## Setup
1. cd backend && npm install🚨 ResQtech — Smart Disaster Management Platform

A unified, full-stack disaster response coordination platform connecting citizens, field responders, and government authorities for real-time incident reporting, resource coordination, and emergency response — built for Smart India Hackathon (SIH).

ResQtech enables citizens to report emergencies and locate nearby shelters, while giving disaster-management authorities a jurisdiction-aware command center to triage incidents, dispatch response teams, and monitor relief camps and supply readiness — scoped precisely to their level of responsibility (National / State / District).

🧭 Table of Contents
Overview
Key Features
Tech Stack
Project Structure
Jurisdiction & Access Model
Getting Started
Environment Variables
API Overview
Branching Strategy
Team
Roadmap
Overview

Disasters demand fast, coordinated action across multiple levels of government and the public. ResQtech bridges that gap with three connected portals:

Portal	Who it's for	What it does
Citizen Portal	General public	Report incidents, view live hazard map, locate nearby shelters, track personal reports
Authority Command Center	Government officials (National / State / District)	Monitor incidents, dispatch response teams, manage shelters & supplies — scoped to jurisdiction
Responder Dashboard	Field response teams	View assigned incidents, update status, coordinate on-ground response
Key Features
Citizen-facing
🆘 Incident reporting with photo/media upload and geolocation
🗺️ Live disaster map with nearby shelters and active hazards (with reverse-geocoded location naming)
🏠 Real-time shelter capacity and availability
📋 Personal incident report tracking
Authority Command Center
📊 Jurisdiction-aware dashboards — National, State, and District authorities each see a command center scoped exactly to their responsibility
🚦 Incident triage-to-dispatch pipeline with auto-priority scoring
📢 Alert broadcast system for public advisories
🏕️ Relief camp / shelter management with live occupancy tracking
📦 Relief supply inventory (water, food, medicine, blankets) with stock-level alerts
🚑 Response team management and dispatch coordination
🗺️ Interactive tactical map with incidents, teams, and shelters layered together
Platform-wide
🔐 JWT-based authentication with role-based access control (Citizen / Authority / Admin)
🌍 Three-tier jurisdiction scoping (National → State → District)
📈 Aggregated analytics via MongoDB aggregation pipelines
🤖 AI-assisted features (flood risk prediction, nearest-team suggestion, RAG situational assistant) via a dedicated Python/ML microservice
Tech Stack

Frontend

Next.js (App Router, Turbopack)
TypeScript
Tailwind CSS
Leaflet / React-Leaflet (interactive maps)
React Hook Form + Zod (form validation)

Backend

Node.js + Express
MongoDB + Mongoose
JWT (jsonwebtoken) for authentication
bcryptjs for password hashing

AI Engine

Python/ML microservice (flood risk prediction, RAG situational assistant) — the Node backend proxies to this service via Axios

Tooling

Postman (API testing — collection in /postman)
Git branching workflow with feature isolation
Project Structure
.
├── backend/                   # Express + MongoDB API
│   ├── controllers/           # Route handlers (auth, incidents, shelters, dispatches, etc.)
│   ├── models/                # Mongoose schemas (User, Incident, Shelter, Supply, etc.)
│   ├── routes/                 # Express route definitions
│   ├── middleware/             # Auth (JWT) & jurisdiction-scoping middleware
│   └── server.js               # App entry point
│
├── frontend/                  # Next.js application
│   ├── src/app/
│   │   ├── (public)/            # Home, disaster info, guidelines
│   │   ├── citizen/             # Citizen login, register, dashboard
│   │   ├── authority/           # Authority login, register, dashboard, state/district views
│   │   └── responder/           # Field responder dashboard
│   ├── src/components/          # Shared UI components (Navbar, maps, forms, dashboards)
│   └── src/lib/                 # API client, auth helpers, validation schemas
│
├── postman/                   # Postman collection for API testing
├── .gitignore
├── package.json
└── README.md
Jurisdiction & Access Model

Authority accounts operate under a three-tier jurisdiction system, enforced both at the API layer (via middleware-injected MongoDB filters) and reflected in the frontend dashboards:

Level	Scope	Dashboard
National / Central	Full visibility — all states & districts	/authority/dashboard
State Admin	Entire assigned state — can view/toggle across all its districts	/authority/state
District Admin	Locked to a single assigned district	/authority/district

Jurisdiction is selected at registration (/authority/register) and enforced server-side on every scoped endpoint — a District Admin cannot view or modify data outside their district, and a State Admin cannot escalate to another state, regardless of frontend state.

Getting Started
Prerequisites
Node.js (v18+)
MongoDB (local instance via MongoDB Compass, or MongoDB Atlas for production)
1. Clone the repository
bash
git clone <repo-url>
cd <repo-folder>
2. Backend setup
bash
cd backend
npm install
cp .env.example .env   # fill in your values — see Environment Variables below
npm run dev

Backend runs on http://localhost:5000 by default.

3. Frontend setup
bash
cd frontend
npm install
npm run dev

Frontend runs on http://localhost:3000 by default, and proxies /api/* requests to the backend.

Environment Variables

Create a .env file inside /backend (see .env.example for the full template):

env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

For the frontend, if deploying separately from localhost:5000, set:

env
NEXT_PUBLIC_API_URL=https://your-deployed-backend-url/api

⚠️ Never commit .env files. They are gitignored by default.

API Overview

All endpoints are prefixed with /api. Key resource groups:

Resource	Base path	Notes
Auth	/auth	Register, login, refresh, profile
Incidents	/incidents	Report, verify, assign, jurisdiction-scoped listing
Incidents (public)	/incidents/public	Limited-field public feed for the citizen map
Shelters	/shelters	CRUD + /shelters/nearby for public proximity search
Teams	/teams	Response team management
Dispatches	/dispatches	Incident-to-team dispatch lifecycle
Alerts	/alerts	Public advisory broadcasts
Supplies	/supplies	Relief inventory tracking
Dashboard	/dashboard	Aggregated stats for authority dashboards

Full request/response examples are available in the Postman collection under /postman.

Branching Strategy
main — stable, demo-ready only
dev — integration branch; all completed features merge here first
feature/<name> — one branch per feature (e.g. feature/auth, feature/incident-api, feature/jurisdiction-scoping)

Pull requests are used to merge into main for tracked, reviewable releases — particularly before demos and final submission.

Team
Role	Count
Frontend	2 members
Backend	4 members

Backend ownership spans incident triage/dispatch, alerts, relief camps, jurisdiction scoping & RBAC, and analytics. AI/ML features (flood risk prediction, RAG situational assistant) are developed as an independent Python microservice, consumed by the Node backend via Axios.

Roadmap
 Department / Responder directory (CRUD + availability tracking)
 RAG-based situational assistant wrapper (Node ↔ Python integration)
 Notification system (SMS/push alerts)
 Admin approval workflow for authority self-registration
 Predictive risk layer on the live map

Built for Smart India Hackathon — ResQtech: Detect. Respond. Protect.
2. Copy .env.example to .env and fill in values
3. npm run dev

## Branching
- `main` — stable, demo-ready only
- `dev` — integration branch, all features merge here first
- `feature/<name>` — one branch per feature (e.g. feature/auth, feature/incident-api)
