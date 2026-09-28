# API Contract — SIH Civic Resilience Platform (Backend)

Base URL (local dev): `http://localhost:5000/api`

All protected endpoints require this header:
```
Authorization: Bearer <accessToken>
```

## Response envelope conventions

Two response styles exist in this backend — the frontend must handle both:

**Auth endpoints** (register/login/profile/etc.) return the resource fields directly at the top level, e.g.:
```json
{ "_id": "...", "name": "...", "email": "...", "role": "citizen", "accessToken": "...", "refreshToken": "..." }
```
On error: `{ "message": "..." }`

**Incidents / Alerts / Shelters / Help Posts** endpoints use a wrapped envelope:
```json
{ "success": true, "count": 3, "data": [...] }
```
or for a single resource:
```json
{ "success": true, "message": "...", "data": {...} }
```
On error: `{ "success": false, "message": "...", "error": "..." }`

---

## 1. Auth — `/api/auth`

### POST /api/auth/register
Public. Creates a new user with `role: "citizen"` (fixed — no role selection at signup).

Request body:
```json
{ "name": "string (required)", "email": "string (required, unique)", "password": "string (required)" }
```

Success `201`:
```json
{
  "message": "User registered succesfully",
  "_id": "string",
  "name": "string",
  "email": "string",
  "role": "citizen",
  "accessToken": "string",
  "refreshToken": "string"
}
```

Errors:
- `400` `{ "message": "All fields are required" }` — missing name/email/password
- `400` `{ "message": "User already exists" }` — email already registered
- `500` `{ "message": "Server error", "error": "..." }`

### POST /api/auth/login
Public.

Request body:
```json
{ "email": "string (required)", "password": "string (required)" }
```

Success `200`:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "role": "citizen | authority | admin",
  "accessToken": "string",
  "refreshToken": "string"
}
```

Errors:
- `400` `{ "message": "Email and password required" }`
- `400` `{ "message": "Invalid credentials" }` — wrong email or password (same message for both, don't leak which)
- `500` `{ "message": "Server error", "error": "..." }`

### POST /api/auth/refresh
Public (uses the refresh token itself as auth).

Request body:
```json
{ "refreshToken": "string (required)" }
```

Success `200`:
```json
{ "accessToken": "string" }
```

Errors:
- `401` `{ "message": "Refresh token required" }` — missing from body
- `403` `{ "message": "Invalid refresh token" }` — token doesn't match what's stored for that user
- `403` `{ "message": "Invalid or expired refresh token" }` — verify failed (expired/tampered/malformed)

**accessToken expires in 15 minutes.** Frontend must catch `401` responses on any protected call, silently attempt `/api/auth/refresh` with the stored refresh token, retry the original request once with the new access token, and only redirect to login if the refresh itself fails.

### POST /api/auth/logout
Protected. Invalidates the stored refresh token server-side (sets it to null on the user doc).

No body required.

Success `200`: `{ "message": "Logged out successfully" }`

Frontend must clear `accessToken` and `refreshToken` from local storage on logout regardless of response.

### GET /api/auth/profile
Protected. Returns the logged-in user's own profile.

Success `200`: full user object EXCLUDING `password` and `refreshToken`:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "role": "citizen | authority | admin",
  "phone": "string | null",
  "address": "string | null",
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string"
}
```

### PATCH /api/auth/profile
Protected. Partial update — only send fields you want to change; omitted fields are left untouched (do NOT send `null`/empty string for fields you don't want to change, omit the key entirely).

Request body (all optional, send only what changed):
```json
{ "name": "string", "phone": "string", "address": "string" }
```

Success `200`:
```json
{
  "message": "Profile updated successfully",
  "_id": "string",
  "name": "string",
  "email": "string",
  "phone": "string | null",
  "address": "string | null",
  "role": "citizen | authority | admin"
}
```

### GET /api/auth/me
Protected. Legacy/debug route — returns the full `req.user` object (same shape as `/profile`). Prefer `/profile` for the actual UI; this exists mainly for backend debugging.

### GET /api/auth/authority-only
Protected, `authorize("authority", "admin")`. Debug/test route only — not meant to power any real UI feature. Returns `{ "message": "Welcome authority!" }` on success, `403` for citizens.

### PATCH /api/auth/users/:userId/role
Protected, `authorize("admin")` only. NOT relevant to the citizen frontend — this is an admin/authority-management tool. Included here for completeness only.

Request body: `{ "role": "citizen | authority | admin" }`

Success `200`: updated user object.

---

## 2. Incidents — `/api/incidents`

Valid `type` values (enum, lowercase, exact match required): `flood`, `fire`, `earthquake`, `landslide`, `cyclone`, `other`

Valid `severity` values: `low`, `medium`, `high` (default `medium` if omitted)

Valid `status` values (system-managed, not user-settable): `reported` → `verified` → `assigned` → (eventually `resolved`, not yet implemented as an endpoint)

### POST /api/incidents/report
Protected (any logged-in user — citizen, authority, or admin can all report). **Content-Type: multipart/form-data** (not JSON) because of the optional photo.

Form fields:
| Field | Type | Required | Notes |
|---|---|---|---|
| title | text | yes | |
| description | text | yes | |
| type | text | yes | must be one of the 6 enum values above |
| severity | text | no | one of low/medium/high, defaults to medium |
| coordinates | text | yes | **must be a JSON-stringified array**, e.g. the string `"[80.3319,26.4499]"` — order is `[longitude, latitude]`, NOT [lat, lng]. Frontend must `JSON.stringify([lng, lat])` before appending to FormData. |
| address | text | no | free text |
| state | text | yes | |
| district | text | yes | |
| photo | file | no | image file (jpg/jpeg/png), uploaded to Cloudinary. Field name must be exactly `photo`. |

Success `201`:
```json
{
  "success": true,
  "message": "Incident reported successfully",
  "data": {
    "_id": "string",
    "title": "string",
    "description": "string",
    "type": "flood|fire|earthquake|landslide|cyclone|other",
    "severity": "low|medium|high",
    "status": "reported",
    "location": { "type": "Point", "coordinates": [lng, lat] },
    "address": "string",
    "state": "string",
    "district": "string",
    "mediaUrls": ["https://res.cloudinary.com/... "],
    "reportedBy": "userId string",
    "verifiedBy": null,
    "assignedTo": null,
    "assignedDepartment": null,
    "priorityScore": 0,
    "isSOS": false,
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```
`mediaUrls` is an empty array `[]` if no photo was attached — photo is optional.

Errors:
- `400` `{ "success": false, "message": "title, description, type, coordinates, state, and district are required" }`
- `400` `{ "success": false, "message": "coordinates must be an array of [longitude, latitude]" }` — wrong length or invalid JSON
- `500` on server error

### POST /api/incidents/sos
Protected (any logged-in user). **Content-Type: application/json** (not form-data — no photo on SOS, it's meant to be instant).

Request body:
```json
{
  "coordinates": [lng, lat],
  "type": "string (optional, one of the 6 enums, defaults to 'other')",
  "state": "string (optional, defaults to 'Unknown')",
  "district": "string (optional, defaults to 'Unknown')"
}
```
Frontend should get `coordinates` from `navigator.geolocation.getCurrentPosition()` and send immediately — this is meant to be a single-tap action with minimal friction, ideally no form at all.

Success `201`: same shape as incident report, but with:
- `title`: auto-set to `"SOS Emergency Alert"`
- `description`: auto-set to a fixed emergency message
- `severity`: forced to `"high"` regardless of input
- `isSOS`: `true`

Errors:
- `400` `{ "success": false, "message": "coordinates are required for SOS" }`
- `400` `{ "success": false, "message": "coordinates must be an array of [longitude, latitude]" }`

### GET /api/incidents/my-reports
Protected. Returns only incidents reported by the currently logged-in user, sorted newest first.

Success `200`:
```json
{ "success": true, "count": 2, "data": [ /* array of incident objects, same shape as above */ ] }
```

This is the endpoint for a "Track My Reports" page — use the `status` field on each incident to render a progress indicator (reported → verified → assigned).

### GET /api/incidents
Protected, `authorize("authority", "admin")` only. **Citizens get 403 here** — this is NOT for the citizen frontend's incident list; it's for the authority dashboard (out of scope for the citizen app). Do not build a "browse all incidents" page for citizens.

### PATCH /api/incidents/:id/verify and PATCH /api/incidents/:id/assign
Protected, `authorize("authority", "admin")` only. Not relevant to citizen frontend.

---

## 3. Alerts — `/api/alerts`

Valid `type` values: free text, but conventionally `advisory`, `warning`, etc. (no strict enum on backend — display whatever string comes back)

Valid `severity` values: `low`, `medium`, `high` (default `medium`)

### GET /api/alerts/nearby
**Public — no auth header needed.** This is the primary endpoint for the citizen dashboard's alert feed.

Query params:
| Param | Required | Notes |
|---|---|---|
| state | yes | e.g. `"Uttar Pradesh"` |
| district | no | narrows further, but state-level and nationwide alerts still included |

Behavior: returns alerts where `isActive: true` AND (the alert is nationwide — has no specific states listed — OR it specifically targets the given state, OR — if district was given — it specifically targets that district). Sorted by severity (high first) then newest first.

Success `200`:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "string",
      "title": "string",
      "message": "string",
      "type": "string",
      "severity": "low|medium|high",
      "affectedStates": ["string"],
      "affectedDistricts": ["string"],
      "isActive": true,
      "issuedBy": "userId string",
      "endTime": "ISO date | null",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ]
}
```

Errors:
- `400` `{ "success": false, "message": "state is required" }`

Frontend flow: get citizen's state via browser geolocation reverse-geocoding OR ask them to select their state manually (simplest for MVP: a state dropdown, since reverse-geocoding needs a separate service). Call this endpoint with that state on dashboard load.

### GET /api/alerts
Public. Returns ALL alerts (active and inactive, no location filtering). Less useful for the citizen app than `/nearby` — probably not needed in the UI, but available.

### POST /api/alerts and PATCH /api/alerts/:id/deactivate
Protected, `authorize("authority", "admin")` only. Not relevant to citizen frontend.

---

## 4. Shelters — `/api/shelters`

### GET /api/shelters/nearby
**Public — no auth header needed.**

Query params:
| Param | Required | Notes |
|---|---|---|
| lng | yes | longitude, number |
| lat | yes | latitude, number |
| maxDistance | no | radius in **meters**, defaults to `50000` (50km) |

Behavior: geospatial `$near` query — results are automatically sorted closest-first. Only returns shelters where `isActive: true`.

Success `200`:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "string",
      "name": "string",
      "address": "string",
      "state": "string",
      "district": "string",
      "capacity": 200,
      "currentOccupancy": 0,
      "contactNumber": "string | null",
      "isActive": true,
      "location": { "type": "Point", "coordinates": [lng, lat] },
      "createdBy": "userId string",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ]
}
```
Results are already distance-sorted — do not re-sort on the frontend. There is no explicit "distance in km" field returned — if you want to display distance, calculate it client-side from the citizen's coordinates and each shelter's `location.coordinates` (haversine formula), or skip displaying an exact number and just rely on the sort order.

Errors:
- `400` `{ "success": false, "message": "lng and lat query params are required" }`

Frontend flow: use `navigator.geolocation.getCurrentPosition()` to get the citizen's `[lng, lat]`, call this endpoint. If geolocation is denied/unavailable, fall back to `GET /api/shelters` (below) which needs no coordinates.

### GET /api/shelters
Public. Returns all active shelters, unsorted (no distance calculation). Use as a fallback when geolocation isn't available.

Success `200`: same shape as `/nearby` but without distance-based ordering.

### POST /api/shelters
Protected, `authorize("authority", "admin")` only. Not relevant to citizen frontend.

---

## 5. Community Help Board — `/api/help-posts`

Valid `type` values (enum, required): `offer`, `request`

Valid `category` values (enum, optional, default `other`): `food`, `shelter`, `medical`, `transport`, `clothing`, `other`

Valid `status` values (system-managed): `open` (default), `fulfilled`

### POST /api/help-posts
Protected (any logged-in user).

Request body:
```json
{
  "type": "offer | request",
  "title": "string (required)",
  "description": "string (required)",
  "category": "food|shelter|medical|transport|clothing|other (optional, default 'other')",
  "state": "string (required)",
  "district": "string (required)",
  "contactNumber": "string (required)"
}
```

Success `201`:
```json
{
  "success": true,
  "message": "Help post created successfully",
  "data": {
    "_id": "string",
    "postedBy": "userId string",
    "type": "offer|request",
    "title": "string",
    "description": "string",
    "category": "string",
    "state": "string",
    "district": "string",
    "contactNumber": "string",
    "status": "open",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```

Errors:
- `400` `{ "success": false, "message": "type, title, description, state, district, and contactNumber are required" }`
- `400` `{ "success": false, "message": "type must be either 'offer' or 'request'" }`

### GET /api/help-posts
**Public — no auth header needed.**

Query params (all optional, combine freely):
| Param | Notes |
|---|---|
| type | `offer` or `request` |
| category | one of the category enums |
| state | exact match |
| district | exact match |
| status | if omitted, **defaults to `open` only** — pass `status=fulfilled` explicitly to see fulfilled posts |

Success `200`:
```json
{ "success": true, "count": 5, "data": [ /* array of help post objects */ ] }
```

This is the main help board feed — build filter controls (type toggle, category dropdown, district input) that map directly to these query params.

### GET /api/help-posts/my-posts
Protected. Returns all posts (any status) created by the logged-in user — this is how the citizen sees their own offers/requests to manage them (e.g. mark as fulfilled).

Success `200`: same shape as above.

### PATCH /api/help-posts/:id/fulfill
Protected. Marks a post as fulfilled. **Only the original poster can do this.**

No request body needed.

Success `200`:
```json
{ "success": true, "message": "Post marked as fulfilled", "data": { /* updated post, status: "fulfilled" */ } }
```

Errors:
- `403` `{ "success": false, "message": "You can only update your own posts" }` — not the owner
- `400` `{ "success": false, "message": "This post is already marked fulfilled" }`
- `404` `{ "success": false, "message": "Help post not found" }`

---

## Roles reference

- `citizen` — default role on self-registration. Full access to everything in this document.
- `authority` — municipality/disaster-response staff. Cannot self-register; created via admin. Has additional endpoints not in this document (verify/assign incidents, create/deactivate alerts, create shelters) — out of scope for the citizen frontend.
- `admin` — full access including role management. Out of scope for citizen frontend.

## Pages the citizen frontend needs (derived from the above — nothing else is needed)

1. Register
2. Login
3. Dashboard (nearby alerts feed + quick links)
4. Profile (view + edit)
5. Report Incident (form with photo upload)
6. My Reports (status tracking)
7. SOS (one-tap emergency button)
8. Nearby Shelters (list, geolocation-based)
9. Community Help Board (browse offers/requests, post new, mark own as fulfilled)

No other pages are backed by this API — do not build a general "browse all incidents" or "manage alerts" page for the citizen role, those endpoints return 403 for citizens by design.
