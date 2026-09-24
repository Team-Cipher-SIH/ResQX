# 🏗️ AI Assistant Architecture & Data Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CITIZEN DASHBOARD                           │
│                    (Next.js React App)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         🤖 FLOATING CHAT BUTTON COMPONENT                │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  📌 Bottom-Right Corner (z-index: 40)              │ │ │
│  │  │  👤 State: messages, inputValue, userLocation      │ │ │
│  │  │  🎯 Actions: Send message, Suggest topics          │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                           ▼                               │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │         CHAT MODAL (Opens on click)                │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐│ │ │
│  │  │  │ Header: ResQX Assistant                        ││ │ │
│  │  │  │ [Blue Gradient Background]                     ││ │ │
│  │  │  └─────────────────────────────────────────────────┘│ │ │
│  │  │  ┌─────────────────────────────────────────────────┐│ │ │
│  │  │  │ Messages Container                             ││ │ │
│  │  │  │ - User messages (right, blue)                  ││ │ │
│  │  │  │ - AI responses (left, gray)                    ││ │ │
│  │  │  │ - Timestamps                                   ││ │ │
│  │  │  │ - Auto-scroll to latest                        ││ │ │
│  │  │  └─────────────────────────────────────────────────┘│ │ │
│  │  │  ┌─────────────────────────────────────────────────┐│ │ │
│  │  │  │ Quick Suggestions (First Load)                 ││ │ │
│  │  │  │ 1. 🏠 "Where are nearest shelters?"           ││ │ │
│  │  │  │ 2. 🌊 "What should I do during flood?"        ││ │ │
│  │  │  │ 3. 📊 "How many shelter vacancies?"           ││ │ │
│  │  │  │ 4. 🗺️ "What's safest route to shelter?"      ││ │ │
│  │  │  │ 5. 🚨 "How do I report an incident?"          ││ │ │
│  │  │  │ 6. 📦 "What emergency supplies needed?"       ││ │ │
│  │  │  └─────────────────────────────────────────────────┘│ │ │
│  │  │  ┌─────────────────────────────────────────────────┐│ │ │
│  │  │  │ Input Area                                     ││ │ │
│  │  │  │ [Text Input] [Send Button →]                  ││ │ │
│  │  │  │ Disabled while loading (shows 3 dots)         ││ │ │
│  │  │  └─────────────────────────────────────────────────┘│ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────── │
│  │ Get Location (useEffect):                                   │
│  │ navigator.geolocation.getCurrentPosition()                  │
│  │ ↓ Returns: {lat, lng}                                       │
└─────────────────────────────────────────────────────────────────┘
                              ▼
                    NETWORK REQUEST
                              │
                    POST /api/ai/chat
                              │
                    Payload:
                    {
                      query: string,
                      userLocation: {lat, lng},
                      conversationHistory: []
                    }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                             │
│                  (Express.js, Node.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  API ROUTE: POST /api/ai/chat                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 1. authenticateToken (Middleware)                  │ │ │
│  │  │    ✓ Verify JWT token                              │ │ │
│  │  │    ✓ Extract userId, state, district               │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 2. Extract Context Data                            │ │ │
│  │  │    { query, userLocation, conversationHistory }    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 3. Query Intent Detection                          │ │ │
│  │  │    determineQueryType(query)                       │ │ │
│  │  │    ↓                                                │ │ │
│  │  │    Returns: 'shelter' | 'disaster' | 'guidance'   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                           ▼                               │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 4. Context Data Fetching                           │ │ │
│  │  │                                                     │ │ │
│  │  │    If query type = 'shelter':                      │ │ │
│  │  │    ├─ getShelterContext()                          │ │ │
│  │  │    │  ├─ Filter: isActive=true, district match    │ │ │
│  │  │    │  ├─ Geospatial query (50km radius)           │ │ │
│  │  │    │  └─ Return: name, address, capacity,         │ │ │
│  │  │    │            occupancy, contact, coordinates   │ │ │
│  │  │    │                                              │ │ │
│  │  │    If query type = 'disaster':                    │ │ │
│  │  │    ├─ getIncidentContext()                        │ │ │
│  │  │    │  ├─ Filter: active incidents in district    │ │ │
│  │  │    │  ├─ Sort by latest                          │ │ │
│  │  │    │  └─ Return: title, type, severity, status   │ │ │
│  │  │                                                     │ │ │
│  │  │    Else: Skip context (guidance/safety queries)   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                           ▼                               │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 5. AI Response Generation                          │ │ │
│  │  │    generateAIResponse()                            │ │ │
│  │  │    (from aiService.js)                            │ │ │
│  │  │                                                     │ │ │
│  │  │    Switch based on query type:                    │ │ │
│  │  │    ├─ 'shelter'  → generateShelterResponse()      │ │ │
│  │  │    ├─ 'disaster' → generateDisasterResponse()    │ │ │
│  │  │    ├─ 'guidance' → generateGuidanceResponse()    │ │ │
│  │  │    ├─ 'safety'   → generateSafetyResponse()      │ │ │
│  │  │    └─ 'general'  → generateGeneralResponse()    │ │ │
│  │  │                                                     │ │ │
│  │  │    Returns: Formatted text with emojis            │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                           ▼                               │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 6. Return Response                                 │ │ │
│  │  │    {                                               │ │ │
│  │  │      success: true,                                │ │ │
│  │  │      response: "🏠 Nearby Shelters...",           │ │ │
│  │  │      timestamp: "2024-01-01T10:00:00Z"            │ │ │
│  │  │    }                                               │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  DATABASE QUERIES (MongoDB)                              │ │
│  │                                                            │ │
│  │  Shelter Collection:                                      │ │
│  │  ├─ Find by location (geospatial: 2dsphere)             │ │
│  │  ├─ Filter by district & state                           │ │
│  │  ├─ Select: name, address, capacity, occupancy,          │ │
│  │  │           contact, location                           │ │
│  │  └─ Limit: 15 results                                    │ │
│  │                                                            │ │
│  │  Incident Collection:                                     │ │
│  │  ├─ Find active incidents (status != closed)             │ │
│  │  ├─ Filter by district & state                           │ │
│  │  ├─ Sort by creation date (newest first)                 │ │
│  │  ├─ Select: title, type, severity, status               │ │
│  │  └─ Limit: 10 results                                    │ │
│  │                                                            │ │
│  │  Response Team Collection (Future):                       │ │
│  │  ├─ Find available teams                                 │ │
│  │  ├─ Get team capacity & location                         │ │
│  │  └─ Use for dispatch recommendations                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▼
                    RESPONSE RECEIVED
                              │
                    Display in Chat Modal
```

---

## 📊 Response Generation Logic

### Query Type Detection Flowchart

```
┌──────────────────────────────┐
│   User Query Received        │
└──────────────────┬───────────┘
                   ▼
        ┌─────────────────────────┐
        │  Extract Keywords       │
        │  Convert to lowercase   │
        └──────────┬──────────────┘
                   ▼
    ┌──────────────────────────────────┐
    │ Check Keyword Patterns:          │
    │                                  │
    │ shelter, accommodation,          │
    │ vacancy, refuge, stay,           │
    │ where to go, safest route,       │
    │ nearest                          │
    └──────────┬───────────────────────┘
               │
         ┌─────┴──────────┐
         ▼ YES            ▼ NO
      [SHELTER]         Continue
         │
         └──► Fetch shelter data
              Return shelter response


    ┌──────────────────────────────────┐
    │ Check Keywords:                  │
    │                                  │
    │ flood, earthquake, cyclone,      │
    │ fire, landslide, incident,       │
    │ what to do, how to               │
    └──────────┬───────────────────────┘
               │
         ┌─────┴──────────┐
         ▼ YES            ▼ NO
    [DISASTER/              Continue
     GUIDANCE]              │
         │                  │
         └──► Generate      │
              disaster       │
              guidelines &   │
              incident info  │


    ┌──────────────────────────────────┐
    │ Check Keywords:                  │
    │                                  │
    │ safe, danger, protect,           │
    │ prepare, supplies, risk,         │
    │ emergency kit                    │
    └──────────┬───────────────────────┘
               │
         ┌─────┴──────────┐
         ▼ YES            ▼ NO
      [SAFETY]          [GENERAL]
         │                  │
         └──► Return        │
              supplies &     │
              prep guide     │
              OR            │
              Return        │
              general help   │
              info
```

---

## 🔄 Data Flow for Shelter Query

```
User: "Where are the nearest shelters?"
                  ▼
        Frontend ChatButton
        └─ Send: {query, userLocation}
                  ▼
        Backend /api/ai/chat
        ├─ Authenticate user
        ├─ determineQueryType()
        │  └─ Returns: 'shelter'
        ├─ getShelterContext()
        │  ├─ Query: Shelter.find({
        │  │   state: userState,
        │  │   district: userDistrict,
        │  │   isActive: true,
        │  │   location: {
        │  │     $near: {
        │  │       $geometry: {
        │  │         type: 'Point',
        │  │         coordinates: [lng, lat]
        │  │       },
        │  │       $maxDistance: 50000  // 50km
        │  │     }
        │  │   }
        │  │ }).limit(10)
        │  │
        │  └─ Returns: [{
        │      name: "Red Cross Shelter",
        │      address: "Main St, City",
        │      occupancy: 45,
        │      capacity: 100,
        │      available: 55,
        │      occupancyPercentage: "45%",
        │      contact: "+91-123456789",
        │      coordinates: [77.209, 28.614]
        │    }, ...]
        │
        └─ generateShelterResponse(query, shelters)
           ├─ Format top 3 shelters
           ├─ Add availability status
           ├─ Include contact info
           └─ Returns formatted text with emojis
                  ▼
        Response: {
          success: true,
          response: "🏠 **Nearby Shelters Found (10 available)**\n\n
                     1. **Red Cross Shelter**\n
                     📍 Main St, City\n
                     📞 +91-123456789\n
                     📊 Capacity: 45/100 (🟡 Medium)\n
                     ✅ Available: 55 spots\n
                     ...",
          timestamp: "2024-01-01T10:00:00Z"
        }
                  ▼
        Frontend ChatButton
        └─ Display in modal
           └─ Add to messages array
              └─ Auto-scroll to latest
```

---

## 🌐 Disaster Response Content Map

```
Query Type: "What should I do during a flood?"
                  ▼
        AI Service recognizes: DISASTER
        Extracts: "flood"
                  ▼
        DISASTER_GUIDELINES['flood']
        ├─ ✅ DO's:
        │  ├─ Move to higher ground immediately
        │  ├─ Avoid driving through flooded areas
        │  ├─ Turn off utilities if advised
        │  ├─ Keep emergency supplies ready
        │  └─ Stay tuned to emergency broadcasts
        │
        ├─ ❌ DON'Ts:
        │  ├─ Do not walk/drive through flood water
        │  ├─ Do not touch electrical equipment in water
        │  ├─ Do not stay in basement/ground floor
        │  └─ Do not ignore evacuation orders
        │
        ├─ 📞 Emergency Contacts:
        │  ├─ Police: 100
        │  ├─ Fire: 101
        │  ├─ Ambulance: 102
        │  └─ Disaster Management: 1070
        │
        └─ 💡 Active Flood Alerts (if any):
           ├─ [Alert 1] - CRITICAL
           ├─ [Alert 2] - HIGH
           └─ [Alert 3] - MEDIUM
```

---

## 📦 State Management (Frontend)

```
ChatButton Component State:
├─ isOpen: boolean
│  └─ Controls modal visibility
│
├─ messages: Message[]
│  ├─ Structure: {
│  │    id: string,
│  │    text: string,
│  │    sender: 'user' | 'ai',
│  │    timestamp: Date
│  │  }
│  └─ Updated when: User sends message or AI responds
│
├─ inputValue: string
│  └─ Current text in input field
│
├─ isLoading: boolean
│  └─ True while waiting for API response
│
└─ userLocation: {lat, lng} | null
   └─ Obtained from navigator.geolocation
```

---

## 🔐 Security Flow

```
User Request
     ▼
Frontend: Include JWT token in Authorization header
     ▼
Backend: authenticateToken middleware
     ├─ Extract token from header
     ├─ Verify signature with JWT_SECRET
     ├─ Decode and validate expiration
     ├─ Extract userId, role, state, district
     └─ Attach to req.user
     ▼
API Route: Check jurisdiction
     ├─ Verify user is citizen
     ├─ Filter data by user's state/district
     └─ Prevent cross-jurisdiction access
     ▼
Response: Only authorized data returned
```

---

## 📈 Performance Optimization

```
Query Optimization:
├─ Database Indexes:
│  ├─ Shelter: location (2dsphere) ✓
│  ├─ Incident: status (1), priorityScore (-1) ✓
│  └─ User: email (unique), _id (primary) ✓
│
├─ Query Limits:
│  ├─ Shelters: 15 max results
│  ├─ Incidents: 10 max results
│  └─ Conversation history: 5 messages for context
│
├─ Caching (Future):
│  ├─ Cache disaster guidelines (static)
│  ├─ Cache frequently asked responses
│  └─ Cache user's district info
│
└─ Frontend Optimization:
   ├─ Lazy load ChatButton component
   ├─ Memoize suggestion buttons
   └─ Optimize re-renders
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────┐
│   Cloud/Server Setup                │
├─────────────────────────────────────┤
│                                     │
│  Frontend Deployment:               │
│  ├─ Vercel / AWS S3 + CloudFront   │
│  ├─ Next.js SSR/SSG                │
│  └─ Client-side hydration           │
│                                     │
│  Backend Deployment:                │
│  ├─ AWS EC2 / Render / Railway      │
│  ├─ Node.js + Express               │
│  └─ Environment variables (.env)    │
│                                     │
│  Database:                          │
│  ├─ MongoDB Atlas (Cloud)           │
│  ├─ Geospatial index enabled        │
│  ├─ Backup: Daily snapshots         │
│  └─ Replication: 3-node cluster    │
│                                     │
│  Monitoring:                        │
│  ├─ PM2 process manager             │
│  ├─ Sentry for error tracking       │
│  ├─ CloudWatch for logs             │
│  └─ Datadog for metrics             │
│                                     │
│  CI/CD:                             │
│  ├─ GitHub Actions / GitLab CI      │
│  ├─ Automated tests on push         │
│  ├─ Deploy on merge to main         │
│  └─ Rollback on failure             │
│                                     │
└─────────────────────────────────────┘
```

---

**Diagram Version**: 1.0
**Last Updated**: 2024-08-30
