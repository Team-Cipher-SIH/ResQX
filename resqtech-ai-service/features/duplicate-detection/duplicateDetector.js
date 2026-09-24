/**
 * duplicateDetector.js
 * ------------------------------------------------------------
 * Work Package 3: Duplicate / Related Incident Detection
 *
 * Your PPT (Slide 5) says to combine FOUR signals:
 *   1. Text similarity     - do the descriptions sound alike?
 *   2. Geographic proximity - are they physically close?
 *   3. Time window          - did they happen around the same time?
 *   4. Same disaster type   - a flood report can't cluster with a fire
 *
 * We score each signal from 0 to 1, combine them into one overall
 * similarityScore, and if it's high enough, group the incidents
 * into a cluster.
 * ------------------------------------------------------------
 */

// ---------- Signal 1: Text similarity (Jaccard similarity) ----------
// Plain-English idea: turn each description into a "bag of words",
// then measure what fraction of words they share.
// Jaccard = (words in BOTH) / (words in EITHER)
function textSimilarity(textA, textB) {
  const wordsA = new Set(textA.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().split(/\W+/).filter(Boolean));

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// ---------- Signal 2: Geographic proximity (Haversine distance) ----------
// Calculates real-world distance in km between two lat/lng points.
function distanceInKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Converts distance into a 0-1 score: very close = 1, far = 0.
function proximityScore(km) {
  const CLOSE_KM = 3; // within 3km = full score
  const FAR_KM = 20; // beyond 20km = zero score
  if (km <= CLOSE_KM) return 1;
  if (km >= FAR_KM) return 0;
  return 1 - (km - CLOSE_KM) / (FAR_KM - CLOSE_KM);
}

// ---------- Signal 3: Time window ----------
// Converts hour-difference into a 0-1 score: recent = 1, old = 0.
function timeScore(timestampA, timestampB) {
  const CLOSE_HOURS = 6;
  const FAR_HOURS = 48;
  const hoursApart =
    Math.abs(new Date(timestampA) - new Date(timestampB)) / (1000 * 60 * 60);
  if (hoursApart <= CLOSE_HOURS) return 1;
  if (hoursApart >= FAR_HOURS) return 0;
  return 1 - (hoursApart - CLOSE_HOURS) / (FAR_HOURS - CLOSE_HOURS);
}

// ---------- Combine everything ----------
const WEIGHTS = { text: 0.4, proximity: 0.4, time: 0.2 };
const SIMILARITY_THRESHOLD = 0.55; // below this, we don't consider it related

// HARD SAFETY CUTOFFS: no matter how similar the text sounds, we
// never treat two reports as related if they're absurdly far apart
// in distance or time. Without this, two IDENTICAL-text reports from
// different cities could still average into a "related" score just
// from the text match alone — which would be a real bug in a
// disaster-response system.
const HARD_MAX_DISTANCE_KM = 15;
const HARD_MAX_HOURS_APART = 24;

/**
 * Compares a NEW incident against a list of PAST incidents and
 * finds which ones are likely describing the same real event.
 *
 * @param {object} newIncident   { incidentId, disasterType, description, lat, lng, timestamp }
 * @param {array}  pastIncidents list of past incidents (same shape)
 */
function findRelatedIncidents(newIncident, pastIncidents) {
  const matches = [];

  for (const past of pastIncidents) {
    // Gate 1: only compare incidents of the SAME disaster type.
    // A flood report should never cluster with a fire report.
    if (past.disasterType !== newIncident.disasterType) continue;

    const km = distanceInKm(newIncident.lat, newIncident.lng, past.lat, past.lng);
    const hoursApart =
      Math.abs(new Date(newIncident.timestamp) - new Date(past.timestamp)) / (1000 * 60 * 60);

    // Gate 2 & 3: hard cutoffs — skip entirely if too far or too old,
    // regardless of how similar the text is.
    if (km > HARD_MAX_DISTANCE_KM || hoursApart > HARD_MAX_HOURS_APART) continue;

    const tScore = textSimilarity(newIncident.description, past.description);
    const pScore = proximityScore(km);
    const timeSim = timeScore(newIncident.timestamp, past.timestamp);

    const overallScore =
      tScore * WEIGHTS.text + pScore * WEIGHTS.proximity + timeSim * WEIGHTS.time;

    if (overallScore >= SIMILARITY_THRESHOLD) {
      matches.push({
        incidentId: past.incidentId,
        similarityScore: Number(overallScore.toFixed(2)),
        distanceKm: Number(km.toFixed(2)),
        textSimilarity: Number(tScore.toFixed(2))
      });
    }
  }

  if (matches.length === 0) {
    return null; // no related incidents found - this is a standalone report
  }

  // Build a human-readable cluster ID, e.g. "FLOOD-KANPUR-1758..."
  const locationTag = (newIncident.locationName || "AREA").toUpperCase().replace(/\s+/g, "");
  const clusterId = `${newIncident.disasterType.toUpperCase()}-${locationTag}-${Date.now()
    .toString()
    .slice(-4)}`;

  // Average similarity across all matched incidents, for one overall score.
  const avgSimilarity =
    matches.reduce((sum, m) => sum + m.similarityScore, 0) / matches.length;

  return {
    clusterId,
    relatedIncidentIds: matches.map((m) => m.incidentId),
    similarityScore: Number(avgSimilarity.toFixed(2)),
    reason: "nearby location + similar text + same time window",
    matchDetails: matches // extra detail, useful for debugging/demo
  };
}

module.exports = { findRelatedIncidents, textSimilarity, distanceInKm };