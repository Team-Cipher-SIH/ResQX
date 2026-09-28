/**
 * classifier.basic.js
 * ------------------------------------------------------------
 * SIMPLE VERSION — Work Package 1: Incident Classification
 *
 * Keyword-based classifier. No training, no dependencies beyond
 * plain JavaScript. Easiest to explain in your presentation:
 * "we scan the report text for known disaster-related words."
 *
 * This file also exports `extractKeywords`, which the ADVANCED
 * version reuses to explain ITS predictions too (showing which
 * words support the ML model's decision).
 * ------------------------------------------------------------
 */

const KEYWORDS = {
  flood: [
    "flood", "flooding", "flooded", "water entering", "water level",
    "overflow", "waterlogged", "drowning", "submerged", "heavy rain",
    "river rising", "dam", "drainage", "waterlogging"
  ],
  fire: [
    "fire", "burning", "smoke", "flames", "blaze", "explosion",
    "gas leak", "short circuit", "wildfire", "burnt", "charred"
  ],
  earthquake: [
    "earthquake", "tremor", "shaking", "collapsed", "collapse",
    "building fell", "cracks in wall", "aftershock", "rubble",
    "trapped under debris", "landslide"
  ]
};

/** Returns which keywords for a given type appear in the text. */
function extractKeywords(text, type) {
  if (!KEYWORDS[type]) return [];
  const lowerText = text.toLowerCase();
  return KEYWORDS[type].filter((word) => lowerText.includes(word));
}

/** Full simple classification: scans all types, picks the best match. */
function classifyIncidentBasic(title = "", description = "") {
  const combinedText = `${title} ${description}`;
  let bestType = "unknown";
  let bestScore = 0;
  let bestKeywords = [];

  for (const type of Object.keys(KEYWORDS)) {
    const matched = extractKeywords(combinedText, type);
    if (matched.length > bestScore) {
      bestScore = matched.length;
      bestType = type;
      bestKeywords = matched;
    }
  }

  if (bestScore === 0) {
    return { predictedType: "unknown", confidence: 0.3, matchedKeywords: [], modelUsed: "keyword-match" };
  }

  const confidence = Math.min(0.6 + bestScore * 0.12, 0.97);

  return {
    predictedType: bestType,
    confidence: Number(confidence.toFixed(2)),
    matchedKeywords: bestKeywords,
    modelUsed: "keyword-match"
  };
}

module.exports = { classifyIncidentBasic, extractKeywords };