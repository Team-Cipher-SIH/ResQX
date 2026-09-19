/**
 * routes.js (severity)
 * ------------------------------------------------------------
 * POST /ai/incident/severity
 *
 * INPUT:
 *  {
 *    "incidentId": "INC123",
 *    "description": "building collapsed, people trapped under debris",
 *    "reportedCount": 12
 *  }
 *
 * OUTPUT (matches your PPT Slide 4 exactly):
 *  {
 *    "incidentId": "INC123",
 *    "predictedSeverity": "critical",
 *    "confidence": 0.92,
 *    "factors": ["structural collapse", "people possibly trapped", ...]
 *  }
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const { predictSeverity } = require("./severityScorer");

router.post("/severity", (req, res) => {
  const { incidentId, description, reportedCount } = req.body;

  if (!incidentId || !description) {
    return res.status(400).json({
      error: "incidentId and description are required"
    });
  }

  const result = predictSeverity(description, { reportedCount });

  return res.status(200).json({
    incidentId,
    predictedSeverity: result.predictedSeverity,
    confidence: result.confidence,
    factors: result.factors,
    note: "AI-generated recommendation — authority verification required"
  });
});

module.exports = router;