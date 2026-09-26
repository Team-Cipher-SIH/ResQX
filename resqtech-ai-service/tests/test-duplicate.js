/**
 * test-duplicate.js
 * ------------------------------------------------------------
 * Run with: node tests/test-duplicate.js
 *
 * Tests Work Package 3 directly (no server/curl needed) using
 * the sample data in features/duplicate-detection/pastIncidents.js
 * ------------------------------------------------------------
 */

const { findRelatedIncidents } = require("../features/duplicate-detection/duplicateDetector");
const pastIncidents = require("../features/duplicate-detection/pastIncidents");

// A brand new report that SHOULD match the Kanpur flood cluster
const newFloodReport = {
  incidentId: "NEW_REPORT",
  disasterType: "flood",
  description: "Water entering houses near the market, roads flooded",
  lat: 26.4505,
  lng: 80.3325,
  timestamp: "2026-09-18T08:20:00Z",
  locationName: "Kanpur"
};

console.log("--- Test 1: Should find related flood reports in Kanpur ---");
console.log(JSON.stringify(findRelatedIncidents(newFloodReport, pastIncidents), null, 2));

// A report far away and unrelated — should return null
const unrelatedReport = {
  incidentId: "NEW_REPORT_2",
  disasterType: "earthquake",
  description: "Ground shaking, building cracked",
  lat: 19.0760,
  lng: 72.8777,
  timestamp: "2026-09-18T08:20:00Z",
  locationName: "Mumbai"
};

console.log("\n--- Test 2: Unrelated report far away — should be null ---");
console.log(findRelatedIncidents(unrelatedReport, pastIncidents));