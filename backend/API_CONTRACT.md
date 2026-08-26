# API Contract & DB Schema — Civic Resilience Platform


**Convention:** Har model file `src/models/` ke andar, naam lowercase + `.model.js` (jaise `user.model.js`, `report.model.js`).

```
src/
  config/
    db.js
  models/
    user.model.js
    report.model.js   (teammate add karega)
```

---

## 1. Models (DB Schema)

### User — `src/models/user.model.js` ✅ Done
```js
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },   // hashed
  role: { type: String, enum: ["citizen", "authority", "admin"], default: "citizen" },
  createdAt, updatedAt   // via timestamps: true
}
```
Mongoose model name: `"User"` — dusre models isi string se reference karenge (`ref: "User"`).

### Report — `src/models/report.model.js` ⏳ Teammate karega
```js
{
  reportedBy: { type: ObjectId, ref: "User", required: true },
  title: String,
  description: String,
  imageUrl: String,
  location: { lat: Number, lng: Number, address: String },
  category: { type: String, enum: ["civic", "emergency"] },
  subCategory: String,
  urgencyScore: { type: Number, min: 1, max: 10 },
  status: { type: String, enum: ["submitted", "in_progress", "resolved"], default: "submitted" },
  createdAt, updatedAt
}
```
Mongoose model name: `"Report"`.

---

## 2. API Endpoints

### Auth (mera scope)

**Register**
```
POST /api/auth/register

Request:
{ "name": "Akash", "email": "a@x.com", "password": "1234", "role": "citizen" }

Response (201):
{
  "success": true,
  "user": { "_id": "...", "name": "Akash", "email": "a@x.com", "role": "citizen" }
}
```

**Login**
```
POST /api/auth/login

Request:
{ "email": "a@x.com", "password": "1234" }

Response (200):
{
  "success": true,
  "token": "jwt-token-here",
  "user": { "_id": "...", "name": "Akash", "role": "citizen" }
}
```

Protected routes ke liye header:
```
Authorization: Bearer <token>
```

### Reports (teammate ka scope) — planned
```
POST   /api/reports              → naya report banana (auth required)
GET    /api/reports?category=&status=   → sare reports (filter ke saath)
PATCH  /api/reports/:id/status   → status update karna
```
Exact request/response shape teammate isi file me add karega jab route ready ho.

---

## 3. Team ke liye

- **Auth (User model + login/register/JWT) — mera scope.** Isko touch karne se pehle mujhse pooch lena.
- **Report model + report routes — teammate ka scope.**
- Report model me `reportedBy` field User model ko reference karega — isliye `user.model.js` merge hone ke baad hi teammate apna `report.model.js` banaye (naya branch le, `main`/`dev` se latest pull karke).
- Naya field/route add karna ho to pehle is file me likho, phir code — taaki dono ka kaam ek dusre se conflict na kare.
