# 🤖 ResQX AI Assistant - Implementation Guide

## Overview

The AI Assistant is a conversational chatbot integrated into the Citizen Portal that helps users:
- **Find nearby shelters** with real-time capacity information
- **Get disaster safety guidelines** specific to incident types
- **Report incidents** with guided step-by-step assistance
- **Understand emergency supplies** needed for preparedness
- **Receive contextual safety advice** based on location and situation

---

## 🎯 Features Implemented

### 1. **Floating Chat Button** (Frontend)
- Located in bottom-right corner of citizen dashboard
- Always accessible, non-intrusive design
- Opens expandable modal with conversation history
- Shows 6 quick suggestion buttons on first load

### 2. **Smart Context Injection** (Backend)
The AI system automatically detects:
- **Shelter queries**: Fetches nearby shelters, capacity, contact info
- **Disaster queries**: Provides type-specific safety guidelines
- **Guidance queries**: Step-by-step instructions
- **General queries**: Contextual help based on user role

### 3. **Real-time Data Integration**
- **Shelter data**: Pulls current capacity, occupancy, contact numbers
- **Incident data**: Shows active incidents in user's district
- **Location-aware**: Uses geolocation for nearest shelter detection
- **Jurisdiction-aware**: Respects authority boundaries

---

## 📁 Files Created

```
Frontend:
├── src/components/AIAssistant/ChatButton.tsx
│   ├── Floating button component
│   ├── Chat modal with message history
│   ├── Quick suggestion buttons
│   └── Location detection & API integration

Backend:
├── src/routes/ai.route.js
│   ├── POST /api/ai/chat endpoint
│   ├── Context data fetching
│   └── Query processing

├── src/utils/aiService.js
│   ├── Response generation logic
│   ├── Disaster guidelines database
│   ├── Query intent detection
│   └── Formatting utilities
```

---

## 🚀 Quick Start

### Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:3000`
- User authenticated as citizen

### Testing the Feature

1. **Login as Citizen**
   - Navigate to `/citizen/login`
   - Use citizen credentials

2. **Open Chat Button**
   - Click blue message icon (bottom-right)
   - Chat modal will open

3. **Try Quick Suggestions**
   - Click any suggestion button
   - AI responds with contextual information

4. **Manual Query**
   - Type in the input field
   - Press Enter or click Send button
   - AI processes and responds

---

## 💬 Query Examples & Expected Responses

### Shelter Queries
```
User: "Where are the nearest shelters?"
Response: Shows top 3 shelters with:
- Name & address
- Current occupancy (with visual bar)
- Available spots
- Contact number
```

### Disaster Guidance
```
User: "What should I do during a flood?"
Response: 
✅ DO's (5 action items)
❌ DON'Ts (4 warnings)
📞 Emergency contacts
💡 Tips
```

### Supply Checklist
```
User: "What supplies do I need?"
Response: 12-item emergency supplies checklist
- Water
- Non-perishable food
- First aid kit
- Flashlight
- Radio
- [etc...]
```

### Report Incident
```
User: "How do I report an incident?"
Response: Step-by-step guide:
1. Go to "Report Incident"
2. Select type
3. Provide location
4. Add photos
5. Submit
```

---

## 🔧 API Endpoint

### POST `/api/ai/chat`

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "query": "Where are nearby shelters?",
  "userLocation": {
    "lat": 28.6139,
    "lng": 77.2090
  },
  "conversationHistory": [
    {
      "id": "msg-1",
      "text": "Previous message",
      "sender": "user",
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "response": "🏠 **Nearby Shelters Found (5 available)**\n\n1. **Red Cross Shelter**\n...",
  "timestamp": "2024-01-01T10:05:00Z"
}
```

---

## 🎨 UI/UX Features

### Chat Button Styling
- **Color**: Blue gradient (`bg-gradient-to-r from-blue-600 to-blue-700`)
- **Size**: 56px × 56px fixed button
- **Position**: Bottom-right corner (z-index: 40)
- **Hover**: Enhanced shadow effect

### Chat Modal
- **Width**: 384px (responsive)
- **Height**: 600px
- **Header**: Blue gradient with assistant name
- **Messages**: Left (AI) / Right (User) alignment
- **Input**: Bottom sticky input bar

### Visual Indicators
- 💧 Water for shelters
- 🌊 Waves for floods
- 🏥 Medical for health
- 📊 Chart for statistics
- 🚨 Alert for emergencies
- ✅ Check for tips
- ❌ Cross for warnings

---

## 🧠 Intent Detection Logic

The system identifies query type by keywords:

| Query Type | Keywords | Response |
|-----------|----------|----------|
| Shelter | shelter, accommodation, vacancy, where to go | Shelter data |
| Disaster | flood, earthquake, cyclone, fire, landslide | Safety guidelines |
| Incident | report, incident, emergency, accident | Reporting guide |
| Guidance | what to do, how to, should i | Step-by-step guide |
| Safety | safe, prepare, danger, supplies | Safety info |

---

## 🗄️ Data Sources

### Shelters Collection
- Location (geospatial)
- Name & Address
- Capacity & Current Occupancy
- Contact Number
- Active status
- District filter

### Incidents Collection
- Type (flood, earthquake, etc.)
- Severity (low, medium, high, critical)
- Status (reported, verified, assigned, in_progress, resolved)
- Location
- District & State

---

## 🔐 Security Features

✅ **Authentication**: All requests require valid JWT token
✅ **Authorization**: Only citizens can access
✅ **Jurisdiction**: Data filtered by user's district
✅ **Rate Limiting**: (Can be added in future)
✅ **Input Validation**: Query length & format checked

---

## 📈 Future Enhancements

### Phase 2: LLM Integration
```javascript
// Use OpenAI/Gemini for more natural responses
const response = await openai.chat.completions.create({
  messages: conversationHistory,
  model: "gpt-4-turbo",
  system: "You are ResQX emergency assistant..."
});
```

### Phase 3: Advanced Features
- 🎤 Voice input/output
- 📸 Image-based incident analysis
- 🤝 Multi-language support
- 💾 Chat history persistence
- 📊 Analytics on common questions
- 🔗 Integration with official helplines

### Phase 4: Authority Portal
- Similar chat for authorities
- Data-driven incident recommendations
- Resource optimization suggestions
- Training material suggestions

---

## 🐛 Troubleshooting

### Chat button not appearing
- Check if `ChatButton` is imported in dashboard
- Verify z-index is set correctly
- Check browser console for errors

### No response from AI
- Verify backend is running
- Check network tab in DevTools
- Ensure authentication token is valid
- Check backend logs for errors

### Wrong shelter information
- Verify shelter data in database
- Check geospatial index on shelters collection
- Ensure user location is accurate

### Styling issues
- Verify Tailwind CSS is properly configured
- Check for CSS conflicts
- Ensure `lucide-react` icons are installed

---

## 📚 Code Structure

### Frontend Flow
```
ChatButton.tsx
  ├── State: messages, inputValue, userLocation
  ├── Effects: Get location, Auto-scroll
  ├── Handlers:
  │   ├── handleSendMessage()
  │   └── API call to /api/ai/chat
  └── Render:
      ├── Floating button
      └── Chat modal (messages + input)
```

### Backend Flow
```
ai.route.js
  ├── POST /api/ai/chat
  │   ├── Extract context data
  │   ├── Determine query type
  │   ├── Fetch shelter/incident data
  │   └── Call generateAIResponse()
  └── aiService.js
      ├── determineQueryType()
      ├── generateShelterResponse()
      ├── generateDisasterResponse()
      ├── generateGuidanceResponse()
      └── generateSafetyResponse()
```

---

## 🎓 Configuration

### Environment Variables
```bash
# Add to .env if using LLM integration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo
```

### Frontend Config
```typescript
// src/components/AIAssistant/ChatButton.tsx
const API_URL = '/api/ai/chat'; // Backend endpoint
const MAX_MESSAGES = 50; // Message history limit
const SUGGESTION_COUNT = 6; // Quick suggestions
```

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs
3. Verify database connectivity
4. Check geospatial indexes

---

**Last Updated**: 2024-08-30
**Status**: ✅ Production Ready
**Maintenance**: Active
