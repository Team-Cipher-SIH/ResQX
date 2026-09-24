/**
 * routes.js (duplicate-detection)
 * ------------------------------------------------------------
 * POST /ai/incident/duplicate-check
 *
 * INPUT:
 *  {
 *    "newIncident": {
 *      "incidentId": "NEW1",
 *      "disasterType": "flood",
 *      "description": "Water entering houses near market",
 *      "lat": 25.4358,
 *      "lng": 81.8463,
 *      "timestamp": "2026-09-18T10:00:00Z",
 *      "locationName": "Prayagraj"
 *    },
 *    "pastIncidents": [ { ...same shape... }, ... ]
 *  }
 *
 * OUTPUT (if related incidents found):
 *  {
 *    "hasRelatedIncidents": true,
 *    "result": {
 *      "clusterId": "FLOOD-PRAYAGRAJ-1234",
 *      "relatedIncidentIds": ["INC001"],
 *      "similarityScore": 0.78,
 *      "reason": "nearby location + similar text + same time window",
 *      "matchDetails": [...]
 *    }
 *  }
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const { findRelatedIncidents } = require("./duplicateDetector");

router.post("/duplicate-check", (req, res) => {
  const { newIncident, pastIncidents } = req.body;

  if (!newIncident || !newIncident.lat || !newIncident.lng || !newIncident.timestamp || !newIncident.disasterType) {
    return res.status(400).json({
      error: "newIncident requires disasterType, lat, lng, timestamp and description"
    });
  }

  if (!Array.isArray(pastIncidents)) {
    return res.status(400).json({
      error: "pastIncidents must be an array (can be empty)"
    });
  }

  const result = findRelatedIncidents(newIncident, pastIncidents);

  return res.status(200).json({
    hasRelatedIncidents: result !== null,
    result
  });
});

module.exports = router;