/**
 * severityScorer.js
 * ------------------------------------------------------------
 * Work Package 2: Severity Recommendation
 *
 * How it works (plain English):
 * 1. Start every incident at a neutral score of 0.
 * 2. Scan the text for danger-signal phrases from severityFactors.js.
 * 3. Add (or subtract) each phrase's weight to a running score.
 * 4. Convert the final score into one of 4 buckets:
 *      LOW < 15   |   MODERATE 15-34   |   HIGH 35-59   |   CRITICAL 60+
 * 5. Return the bucket + confidence + the human-readable factors
 *    that drove the decision (your PPT explicitly asks for this,
 *    not just a bare label).
 * ------------------------------------------------------------
 */

const SEVERITY_FACTORS = require("./severityFactors");

const THRESHOLDS = {
  MODERATE: 15,
  HIGH: 35,
  CRITICAL: 60
};

function scoreToSeverity(score) {
  if (score >= THRESHOLDS.CRITICAL) return "critical";
  if (score >= THRESHOLDS.HIGH) return "high";
  if (score >= THRESHOLDS.MODERATE) return "moderate";
  return "low";
}

/**
 * @param {string} description  - incident description text
 * @param {object} metadata     - optional extra info, e.g. { reportedCount: 5 }
 */
function predictSeverity(description = "", metadata = {}) {
  let workingText = description.toLowerCase();
  let score = 0;
  const matchedFactors = new Set(); // Set avoids duplicate labels automatically

  // Pass 1: check NEGATING phrases first ("no injuries", "under control").
  // Whenever one matches, we REMOVE it from the working text so a
  // positive phrase hiding inside it (like "injuries" inside
  // "no injuries") can't wrongly match in Pass 2.
  const negatingFactors = SEVERITY_FACTORS.filter((f) => f.weight < 0);
  for (const factor of negatingFactors) {
    if (workingText.includes(factor.phrase)) {
      score += factor.weight;
      workingText = workingText.split(factor.phrase).join(" ");
    }
  }

  // Pass 2: check severity-increasing phrases on what's left of the text.
  const positiveFactors = SEVERITY_FACTORS.filter((f) => f.weight > 0);
  for (const factor of positiveFactors) {
    if (workingText.includes(factor.phrase)) {
      score += factor.weight;
      matchedFactors.add(factor.label);
    }
  }

  // Optional metadata boost: if backend tells us many people reported
  // the same incident, that alone is a signal of a bigger emergency.
  if (metadata.reportedCount && metadata.reportedCount >= 10) {
    score += 15;
    matchedFactors.add(`high report volume (${metadata.reportedCount} reports)`);
  }

  score = Math.max(score, 0); // never go negative
  const predictedSeverity = scoreToSeverity(score);
  const factorsList = Array.from(matchedFactors);

  // Confidence grows with how many independent factors agree,
  // capped so we never claim total certainty.
  const confidence = Math.min(0.6 + factorsList.length * 0.08, 0.97);

  return {
    predictedSeverity,
    confidence: Number(confidence.toFixed(2)),
    factors: factorsList.length > 0 ? factorsList : ["no strong severity signals detected"],
    rawScore: score
  };
}

module.exports = { predictSeverity };