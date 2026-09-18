# Disaster Management Platform — SIH Project

## Team
- Frontend: 2 members
- Backend: 4 members

## Structure
- `/frontend` — public dashboard, login, citizen portal, authority command center
- `/backend` — Express + MongoDB API

## Setup
1. cd backend && npm install
2. Copy .env.example to .env and fill in values
3. npm run dev

## Branching
- `main` — stable, demo-ready only
- `dev` — integration branch, all features merge here first
- `feature/<name>` — one branch per feature (e.g. feature/auth, feature/incident-api)
