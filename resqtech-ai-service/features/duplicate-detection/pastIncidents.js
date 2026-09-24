/**
 * pastIncidents.js
 * ------------------------------------------------------------
 * SIMULATED DATA — in a real system, this list would come FROM
 * Backend Member 1's database via an API call, not live here.
 * For building/testing Work Package 3 standalone, we keep a
 * small in-memory array of "already reported" incidents.
 *
 * Each incident has: id, disasterType, description, coordinates
 * (lat/lng), locationName, and a timestamp.
 * ------------------------------------------------------------
 */

const pastIncidents = [
  {
    incidentId: "INC12",
    disasterType: "flood",
    description: "Water entering homes near the market area, roads flooded",
    lat: 26.4499,
    lng: 80.3319, // Kanpur
    locationName: "Kanpur",
    timestamp: "2026-09-18T08:00:00Z"
  },
  {
    incidentId: "INC18",
    disasterType: "flood",
    description: "Heavy flooding reported, streets waterlogged near the market",
    lat: 26.4520,
    lng: 80.3350, // ~0.3km from INC12
    locationName: "Kanpur",
    timestamp: "2026-09-18T09:30:00Z"
  },
  {
    incidentId: "INC21",
    disasterType: "flood",
    description: "Roads submerged and residents stuck due to rising water",
    lat: 26.4480,
    lng: 80.3300, // also very close
    locationName: "Kanpur",
    timestamp: "2026-09-18T10:15:00Z"
  },
  {
    incidentId: "INC40",
    disasterType: "fire",
    description: "Fire broke out in a warehouse, thick smoke visible",
    lat: 28.7041,
    lng: 77.1025, // Delhi - far away, different type
    locationName: "Delhi",
    timestamp: "2026-09-18T09:00:00Z"
  }
];

module.exports = pastIncidents;