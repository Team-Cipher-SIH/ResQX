/**
 * routes.js (preparedness)
 * ------------------------------------------------------------
 * POST /api/ai/preparedness/recommend
 *
 * INPUT:
 *  {
 *    "disasterType": "flood",
 *    "severity": "critical",
 *    "affectedPeopleEstimate": 850
 *  }
 *
 * OUTPUT:
 *  {
 *    "disasterType": "flood",
 *    "severity": "critical",
 *    "affectedPeopleEstimate": 850,
 *    "severityMultiplierApplied": 2.2,
 *    "recommendations": [
 *      { "resource": "rescue boats", "recommendedQuantity": 38 },
 *      ...
 *    ],
 *    "note": "AI-generated resource estimate — final allocation must be confirmed by the responding authority"
 *  }
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const { recommendResources } = require("./preparednessRecommender");

router.post("/recommend", (req, res) => {
  const { disasterType, severity, affectedPeopleEstimate } = req.body;

  if (!disasterType || !severity || affectedPeopleEstimate === undefined) {
    return res.status(400).json({
      error: "disasterType, severity and affectedPeopleEstimate are required"
    });
  }

  const result = recommendResources(disasterType, severity, affectedPeopleEstimate);

  if (result.error) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
});

module.exports = router;