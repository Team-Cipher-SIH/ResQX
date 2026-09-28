/**
 * routes.js (summarization)
 * ------------------------------------------------------------
 * POST /ai/incident/summary
 *
 * INPUT:
 *  {
 *    "reportTexts": ["Water entering homes...", "Heavy flooding reported...", ...],
 *    "disasterType": "flood",
 *    "locationName": "Kanpur",
 *    "severity": "high"
 *  }
 *
 * OUTPUT:
 *  {
 *    "summary": "3 reports received about a possible flood near Kanpur (severity: high). ...",
 *    "keySentences": [...],
 *    "reportCount": 3
 *  }
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const { generateSummary } = require("./summaryGenerator");

router.post("/summary", (req, res) => {
  const { reportTexts, disasterType, locationName, severity } = req.body;

  if (!Array.isArray(reportTexts) || reportTexts.length === 0) {
    return res.status(400).json({
      error: "reportTexts must be a non-empty array of strings"
    });
  }

  if (!disasterType) {
    return res.status(400).json({
      error: "disasterType is required"
    });
  }

  const result = generateSummary({ reportTexts, disasterType, locationName, severity });

  return res.status(200).json(result);
});

module.exports = router;