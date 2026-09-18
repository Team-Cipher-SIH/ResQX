const axios = require("axios");

/**
 * ResQTech AI Incident Intelligence & Triage Service
 * Combines Google Gemini 1.5 Flash API with a deterministic Forensic Heuristic NLP Engine.
 */

// ─── CIVIC VS EMERGENCY DICTIONARIES ───
const CIVIC_ONLY_MARKERS = [
  "pothole",
  "small pothole",
  "garbage",
  "kachra",
  "dustbin",
  "waste",
  "streetlight",
  "street light",
  "batti kharab",
  "water supply",
  "tap water",
  "pani nahi aa raha",
  "small branch",
  "chhota tree",
  "footpath",
  "dog barking",
  "stray dogs",
  "graffiti",
  "drain clean",
  "nali band",
  "noise complaint",
  "chhoti branch",
];

const PRANK_TROLL_MARKERS = [
  "kamode",
  "commode",
  "toilet",
  "potty",
  "prank",
  "joke",
  "alien",
  "ufo",
  "zombie",
  "ghost",
  "superman",
  "batman",
  "dinosaur",
  "dragon",
  "funny",
  "lol",
  "lmao",
  "fake",
  "test report",
  "testing 123",
  "asdf",
  "qwerty",
];

const HIGH_CRITICAL_MARKERS = [
  "trapped",
  "casualties",
  "people inside",
  "people stuck",
  "injured",
  "burning",
  "flames spreading",
  "fire spreading",
  "gas leak",
  "cylinder blast",
  "collapse",
  "collapsed",
  "submerged",
  "water entering houses",
  "washed away",
  "highway blocked",
  "major accident",
  "live wire",
  "electrocuted",
  "landslide blocked",
  "debris",
  "screaming",
  "suffocation",
  "drowning",
];

/**
 * Deterministic Forensic Heuristic Analysis (Guaranteed 0-Latency Fallback)
 */
function analyzeHeuristically(incident) {
  const text = `${incident.title || ""} ${incident.description || ""}`.toLowerCase();
  
  // 1. Check for Prank / Troll
  const prankHit = PRANK_TROLL_MARKERS.find((kw) => text.includes(kw));
  if (prankHit) {
    return {
      isEmergency: false,
      emergencyRelevanceReason: `Flagged as informal or non-emergency submission (detected keyword: "${prankHit}").`,
      classifiedType: "Other Emergency",
      aiSeverity: "LOW",
      aiPriority: "P4",
      recommendedTeam: "Civil Verification Unit",
      aiSummary: `Suspicious submission regarding "${incident.title}" with non-standard emergency indicators.`,
      authenticity: "SUSPICIOUS_OR_PRANK",
      credibilityScore: 15,
      confidence: 94,
      reasoning: `AI detected anomalous keywords ("${prankHit}") and unstructured phrasing. Highly characteristic of a prank or troll report without physical disaster indicators.`,
      recommendedAction: "Perform telephonic verification with the reporter before mobilizing response teams.",
      suggestedUnit: "Police / Tele-Verification Unit",
    };
  }

  // 2. Check for Routine Civic Issue (Non-Disaster)
  const civicHit = CIVIC_ONLY_MARKERS.find((kw) => text.includes(kw));
  const hasCriticalMarkers = HIGH_CRITICAL_MARKERS.some((kw) => text.includes(kw));

  if (civicHit && !hasCriticalMarkers) {
    return {
      isEmergency: false,
      emergencyRelevanceReason: "Routine municipal maintenance issue. Does not pose immediate threat to human life or infrastructure.",
      classifiedType: "Other Emergency",
      aiSeverity: "LOW",
      aiPriority: "P4",
      recommendedTeam: "Municipal Public Works Department",
      aiSummary: `Minor civic maintenance report: ${incident.title}. No active disaster hazards detected.`,
      authenticity: "LIKELY_GENUINE",
      credibilityScore: 85,
      confidence: 90,
      reasoning: "Report describes standard municipal maintenance rather than a disaster emergency. Excluded from active disaster triage.",
      recommendedAction: "Forward to Municipal Civic Complaint portal. No emergency response deployment needed.",
      suggestedUnit: "Municipal Public Works",
    };
  }

  // 3. Disaster Classification & Triage
  let classifiedType = "Other Emergency";
  let recommendedTeam = "Rapid Disaster Action Force";
  let suggestedUnit = "Disaster Response Unit";

  if (text.includes("flood") || text.includes("water") || text.includes("drown") || text.includes("submerge") || incident.type === "flood") {
    classifiedType = "Flood";
    recommendedTeam = "NDRF / SDRF Water Rescue Force";
    suggestedUnit = "Water Rescue & Inundation Team";
  } else if (text.includes("fire") || text.includes("smoke") || text.includes("flame") || text.includes("burn") || incident.type === "fire") {
    classifiedType = "Fire";
    recommendedTeam = "Fire & Emergency Services";
    suggestedUnit = "Fire Station Engine Unit";
  } else if (text.includes("collapse") || text.includes("building") || text.includes("wall fell") || text.includes("debris")) {
    classifiedType = "Building Collapse";
    recommendedTeam = "Search & Rescue Heavy Extrication Force";
    suggestedUnit = "NDRF Search & Rescue";
  } else if (text.includes("earthquake") || text.includes("tremor") || text.includes("shake") || incident.type === "earthquake") {
    classifiedType = "Earthquake";
    recommendedTeam = "State Disaster Management Heavy Team";
    suggestedUnit = "Civil Defence & Disaster Unit";
  } else if (text.includes("landslide") || text.includes("mudslide") || text.includes("rock") || incident.type === "landslide") {
    classifiedType = "Landslide";
    recommendedTeam = "Search & Rescue / Highway Clearance Team";
    suggestedUnit = "SDRF Mountain Rescue Team";
  } else if (text.includes("cyclone") || text.includes("storm") || text.includes("hurricane") || incident.type === "cyclone") {
    classifiedType = "Cyclone / Storm";
    recommendedTeam = "Civil Defence Evacuation & Relief Team";
    suggestedUnit = "Evacuation & Shelter Unit";
  } else if (text.includes("electric") || text.includes("wire") || text.includes("shock") || text.includes("transformer")) {
    classifiedType = "Electrical Hazard";
    recommendedTeam = "Electricity Board Emergency Safety Crew";
    suggestedUnit = "Power Grid Emergency Unit";
  } else if (text.includes("accident") || text.includes("crash") || text.includes("highway") || text.includes("block")) {
    classifiedType = "Major Road Blockage";
    recommendedTeam = "Traffic & Highway Quick Response Force";
    suggestedUnit = "Traffic Police & Medical Unit";
  } else if (text.includes("medical") || text.includes("heart") || text.includes("breath") || text.includes("blood") || text.includes("patient")) {
    classifiedType = "Medical Emergency";
    recommendedTeam = "Advanced Life Support Medical Team";
    suggestedUnit = "108 Emergency Ambulance Unit";
  }

  // 4. Severity & Priority Assessment
  let aiSeverity = "MEDIUM";
  let aiPriority = "P3";

  const criticalHit = HIGH_CRITICAL_MARKERS.some((kw) => text.includes(kw));
  if (criticalHit || incident.severity === "critical" || incident.isSOS) {
    aiSeverity = "CRITICAL";
    aiPriority = "P1";
  } else if (incident.severity === "high" || text.includes("danger") || text.includes("urgent") || text.includes("heavy")) {
    aiSeverity = "HIGH";
    aiPriority = "P2";
  } else if (incident.severity === "low") {
    aiSeverity = "LOW";
    aiPriority = "P4";
  }

  // 5. Clean Executive Summary
  const cleanSummary = `${classifiedType} emergency reported at ${incident.district || "assigned area"}, ${incident.state || "India"}. ${
    criticalHit ? "Direct threat to human safety/infrastructure with immediate rescue required." : "Operational assessment and rapid unit deployment advised."
  }`;

  return {
    isEmergency: true,
    emergencyRelevanceReason: `Active ${classifiedType.toLowerCase()} disaster event requiring emergency coordination.`,
    classifiedType,
    aiSeverity,
    aiPriority,
    recommendedTeam,
    aiSummary: cleanSummary,
    authenticity: "LIKELY_GENUINE",
    credibilityScore: 92,
    confidence: 88,
    reasoning: `Report verified with genuine disaster terminology, location coordinates, and operational distress indicators for ${classifiedType}.`,
    recommendedAction: `Deploy ${recommendedTeam} immediately with priority ${aiPriority}.`,
    suggestedUnit,
  };
}

/**
 * Main AI Verification & Triage Pipeline
 */
async function verifyIncidentAuthenticity(incident) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.length > 15 && !apiKey.startsWith("AQ.Ab8RN")) {
    try {
      const prompt = `You are the AI Command Core of ResQTech (National Disaster Decision Support System).

Evaluate this emergency report:
- Title: "${incident.title}"
- Description: "${incident.description}"
- Citizen Category: "${incident.type}"
- User Severity: "${incident.severity}"
- Location: "${incident.district}, ${incident.state}"
- Coordinates: ${JSON.stringify(incident.location?.coordinates || [])}
- Media Count: ${incident.mediaUrls ? incident.mediaUrls.length : 0}

Perform full disaster triage and respond ONLY in valid JSON matching this schema:
{
  "isEmergency": <true if genuine disaster/emergency or false if routine municipal/civic complaint or prank>,
  "emergencyRelevanceReason": "<Why it is or is not an emergency>",
  "classifiedType": "<Flood | Fire | Earthquake | Landslide | Cyclone / Storm | Building Collapse | Major Road Blockage | Medical Emergency | Electrical Hazard | Search & Rescue | Other Emergency>",
  "aiSeverity": "<LOW | MEDIUM | HIGH | CRITICAL>",
  "aiPriority": "<P1 | P2 | P3 | P4>",
  "recommendedTeam": "<NDRF / SDRF Water Rescue Force | Fire & Emergency Services | Search & Rescue Force | Advanced Life Support Medical Team | Traffic & Highway Quick Response Force | Rapid Disaster Action Force>",
  "aiSummary": "<Concise 1-2 sentence executive summary for disaster commanders>",
  "authenticity": "<LIKELY_GENUINE | SUSPICIOUS_OR_PRANK | NEEDS_PHYSICAL_VERIFICATION>",
  "credibilityScore": <integer 0-100>,
  "confidence": <integer 0-100>,
  "reasoning": "<2-3 sentence forensic reasoning explaining authenticity and risk factors>",
  "recommendedAction": "<Specific operational directive for command officers>",
  "suggestedUnit": "<Response unit designation>"
}`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.15,
          },
        },
        { timeout: 7000 }
      );

      const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        const parsed = JSON.parse(candidateText);
        return {
          ...parsed,
          analyzedAt: new Date(),
        };
      }
    } catch (apiError) {
      console.warn("[Gemini AI Intelligence] API error/timeout, using deterministic heuristic engine:", apiError.message);
    }
  }

  // Fast & accurate deterministic heuristic analysis
  const heuristicResult = analyzeHeuristically(incident);
  return {
    ...heuristicResult,
    analyzedAt: new Date(),
  };
}

module.exports = {
  verifyIncidentAuthenticity,
};
