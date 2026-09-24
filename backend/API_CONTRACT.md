# ResQtech (ResQX) — Complete API Specification & Contract

**Smart India Hackathon (SIH) 2026 — AI-Powered Civic Resilience & Disaster Management Platform**

Base URL: `http://localhost:5000/api`  
Authentication: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

---

## 1. Authentication & Jurisdiction (`/api/auth`)

### `POST /api/auth/login`
- **Access**: Public
- **Body**:
  ```json
  { "email": "pune.admin@resqtech.gov.in", "password": "Pune@12345" }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "_id": "65f...",
    "name": "Pune District Authority Admin",
    "email": "pune.admin@resqtech.gov.in",
    "role": "authority",
    "authorityLevel": "district_admin",
    "state": "Maharashtra",
    "district": "Pune",
    "jurisdictionId": "MAHARASHTRA_PUNE",
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "496a57..."
  }
  ```

---

## 2. Incidents & Guest SOS (`/api/incidents`)

### `POST /api/incidents/sos`
- **Access**: Public / Guest-accessible (`optionalProtect`)
- **Headers**: Optional `x-guest-session-id: <uuid>`
- **Body**:
  ```json
  {
    "coordinates": [73.8567, 18.5204],
    "type": "flood",
    "state": "Maharashtra",
    "district": "Pune"
  }
  ```
- **Protections Active**:
  - Rejects `[0, 0]` coordinates with `400 Bad Request`.
  - Rate limited (max 10 in 5 min for demo, 429 if exceeded).
  - Deduplication: Active SOS within 200m & 10 min returns `isDuplicate: true` with existing ID.
  - Non-blocking: Returns immediately (< 50ms) with `aiAnalysis.status: "pending"`.
- **Response (201)**:
  ```json
  {
    "success": true,
    "message": "SOS alert sent successfully. Help is on the way.",
    "guestSessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "data": {
      "_id": "65fa...",
      "title": "SOS Emergency Alert",
      "type": "flood",
      "severity": "critical",
      "status": "reported",
      "isSOS": true,
      "location": { "type": "Point", "coordinates": [73.8567, 18.5204] },
      "priorityScore": 50,
      "aiAnalysis": { "status": "pending" }
    }
  }
  ```

### `POST /api/incidents/:id/ai-retry`
- **Access**: Authority & Admin only
- **Response (200)**:
  ```json
  {
    "success": true,
    "message": "AI triage re-analysis initiated in background",
    "data": { "_id": "65fa...", "aiAnalysis": { "status": "pending" } }
  }
  ```

---

## 3. Smart Dispatch & Recommendations (`/api/dispatches`)

### `GET /api/dispatches/recommend/:incidentId`
- **Access**: Authority & Admin only (read-only candidate fit ranking)
- **Features**: Matches district jurisdiction, available status, disaster capability keywords, sorted by 2dsphere distance in meters & km. Includes AI teammate placeholders.
- **Response (200)**:
  ```json
  {
    "success": true,
    "incidentId": "65fa...",
    "disasterType": "flood",
    "jurisdiction": { "state": "Maharashtra", "district": "Pune" },
    "hasActiveDispatch": false,
    "activeDispatch": null,
    "searchScope": "district",
    "count": 2,
    "data": [
      {
        "_id": "65fb...",
        "name": "NDRF Pune Alpha Rescue Unit",
        "type": "flood",
        "status": "available",
        "capabilities": ["flood", "boat rescue", "water evacuation"],
        "matchedCapabilities": ["flood", "boat rescue"],
        "distanceKm": 1.25,
        "distanceMeters": 1250,
        "leader": { "name": "Vikram Rane", "phone": "+91-9822088888" },
        "membersCount": 6,
        "reasons": [],
        "confidence": null
      }
    ],
    "message": "Found 2 candidate team(s) in Pune district"
  }
  ```

### `POST /api/dispatches`
- **Access**: Authority & Admin
- **Body**: `{ "incidentId": "65fa...", "teamId": "65fb...", "notes": "Urgent deployment" }`
- **Effects**: Creates dispatch, transitions incident to `assigned`, marks team `busy`, emits `dispatch-created`.

### `PATCH /api/dispatches/:id/status`
- **Access**: Assigned Field Responder or Authority
- **Allowed Transitions**: `pending` $\rightarrow$ `accepted` $\rightarrow$ `en_route` $\rightarrow$ `on_site` $\rightarrow$ `in_progress` $\rightarrow$ `completed`
- **Auto-Sync**:
  - `accepted`..`in_progress`: Incident auto-transitions to `in_progress`.
  - `completed`: Team becomes `available`, incident marks `resolved`, `priorityScore` resets to 0.

---

## 4. Response Teams (`/api/teams`)

- `POST /api/teams` — Create response team (Authority/Admin)
- `GET /api/teams` — Get teams in officer's jurisdiction
- `PATCH /api/teams/:id/availability` — Toggle `available` / `busy` / `offline`

---

## 5. Relief Shelters (`/api/shelters`)

- `POST /api/shelters` — Create shelter (Authority/Admin, emits `shelter-updated`)
- `GET /api/shelters` — List shelters with occupancy and capacity
- `PATCH /api/shelters/:id` — Update shelter / live capacity (emits `shelter-updated`)
- `GET /api/shelters/nearby?lng=73.85&lat=18.52` — Proximity lookup for citizens

---

## 6. Realtime Audit Logging (`/api/audit-logs`)

### `GET /api/audit-logs`
- **Access**: Authority & Admin only (strict jurisdiction-scoped)
- **Query Parameters**:
  - `targetType`: `incident`, `dispatch`, `team`, `shelter`, `alert`, `auth`
  - `targetId`: Resource ObjectId
  - `action`: `user_login`, `shelter_updated`, `dispatch_created`, etc.
  - `performedBy`: User ObjectId
  - `startDate`, `endDate`: ISO Date range
  - `page`, `limit`: Pagination controls
- **Response (200)**:
  ```json
  {
    "success": true,
    "count": 25,
    "total": 120,
    "page": 1,
    "totalPages": 5,
    "data": [
      {
        "_id": "65fc...",
        "action": "shelter_updated",
        "targetType": "shelter",
        "targetId": "65fd...",
        "description": "Shelter 'Pune Central' updated (Occupancy: 140/500)",
        "performedBy": { "name": "Pune Admin", "role": "authority" },
        "state": "Maharashtra",
        "district": "Pune",
        "createdAt": "2026-09-15T22:30:00.000Z"
      }
    ]
  }
  ```

---

## 7. Realtime Socket.IO Events & Room Scoping

**Rooms**:
- `district:<DistrictName>` — Officers in that district
- `state:<StateName>` — State administrators
- `jurisdiction:<STATE_DISTRICT>` — Canonical combined room
- `team:<TeamId>` — Field responders assigned to the team
- `central-authority` — National command officers

**Standardized Event Format (`resource-action`)**:
| Event Name | Trigger | Scoped Rooms |
|---|---|---|
| `incident-created` / `new-incident` | Incident or SOS reported | District, State, Central |
| `incident-updated` | Verified, assigned, status changed | District, State, Central |
| `dispatch-created` | Dispatch order issued | District, State, Team room |
| `dispatch-updated` | Status transition (en route, on site, completed) | District, State, Team room |
| `team-updated` | Team status change (available/busy) | District, State, Central |
| `shelter-updated` | Shelter occupancy/capacity updated | District, State, Central |
| `new-alert` | Advisory broadcast created | Affected District & State |
