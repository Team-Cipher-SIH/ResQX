/**
 * severityFactors.js
 * ------------------------------------------------------------
 * Weighted "danger signal" words for Work Package 2: Severity
 * Recommendation.
 *
 * Each factor has a WEIGHT (how much it pushes up the severity
 * score) and a LABEL (a human-readable reason shown to the
 * authority — your PPT, Slide 4, requires "top factors" not just
 * a single label).
 *
 * Higher weight = more dangerous signal. These weights are our
 * own judgment call — in a real system a domain expert (disaster
 * management official) would help tune these numbers, which is a
 * great line to say in your SIH demo.
 * ------------------------------------------------------------
 */

const SEVERITY_FACTORS = [
  // ---- CRITICAL-level signals (life-threatening, highest weight) ----
  { phrase: "people trapped", weight: 40, label: "people possibly trapped" },
  { phrase: "trapped under", weight: 40, label: "people possibly trapped" },
  { phrase: "building collapse", weight: 40, label: "building collapse" },
  { phrase: "collapsed", weight: 35, label: "structural collapse" },
  { phrase: "casualties", weight: 40, label: "casualties reported" },
  { phrase: "deaths", weight: 45, label: "fatalities reported" },
  { phrase: "unconscious", weight: 35, label: "unconscious victims" },
  { phrase: "critical condition", weight: 40, label: "victims in critical condition" },
  { phrase: "explosion", weight: 35, label: "explosion reported" },
  { phrase: "fire spreading", weight: 30, label: "fire actively spreading" },

  // ---- HIGH-level signals ----
  { phrase: "injured", weight: 22, label: "injuries reported" },
  { phrase: "injuries", weight: 22, label: "injuries reported" },
  { phrase: "cannot escape", weight: 25, label: "people unable to escape" },
  { phrase: "spreading rapidly", weight: 22, label: "situation escalating rapidly" },
  { phrase: "large number of people", weight: 20, label: "large number of people affected" },
  { phrase: "multiple buildings", weight: 20, label: "multiple structures affected" },
  { phrase: "evacuation", weight: 18, label: "evacuation underway" },
  { phrase: "cracks in wall", weight: 18, label: "structural damage visible" },

  // ---- MODERATE-level signals ----
  { phrase: "damage", weight: 10, label: "property damage" },
  { phrase: "blocked road", weight: 10, label: "road blockage" },
  { phrase: "power outage", weight: 8, label: "power outage" },
  { phrase: "minor", weight: -8, label: "minor severity indicated" }, // reduces score
  { phrase: "small", weight: -5, label: "small-scale incident" },
  { phrase: "few", weight: -5, label: "limited number affected" },

  // ---- LOW-level signals (reduce the score) ----
  { phrase: "under control", weight: -15, label: "situation reported under control" },
  { phrase: "no injuries", weight: -15, label: "no injuries reported" },
  { phrase: "precautionary", weight: -10, label: "precautionary report only" }
];

module.exports = SEVERITY_FACTORS;