/**
 * routes.js
 * ------------------------------------------------------------
 * POST /ai/incident/classify
 *
 * By default uses the ADVANCED (Naive Bayes) model.
 * Add ?model=basic to the URL to use the simple keyword model
 * instead — handy for comparing both live in your demo.
 *
 * INPUT:
 *  {
 *    "incidentId": "INC123",
 *    "title": "Water entering houses",
 *    "description": "Roads and homes are flooded"
 *  }
 *
 * OUTPUT:
 *  {
 *    "incidentId": "INC123",
 *    "predictedType": "flood",
 *    "confidence": 0.94,
 *    "supportingKeywords": ["flood", "water entering"],
 *    "modelUsed": "naive-bayes"
 *  }
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();

const { classifyIncidentBasic } = require("./classifier.basic");
const { classifyIncidentAdvanced } = require("./classifier.advanced");

router.post("/classify", (req, res) => {
  const { incidentId, title, description } = req.body;
  const useModel = req.query.model === "basic" ? "basic" : "advanced";

  if (!incidentId || (!title && !description)) {
    return res.status(400).json({
      error: "incidentId and at least one of title/description are required"
    });
  }

  const result =
    useModel === "basic"
      ? classifyIncidentBasic(title, description)
      : classifyIncidentAdvanced(title, description);

  const response = {
    incidentId,
    predictedType: result.predictedType,
    confidence: result.confidence,
    modelUsed: result.modelUsed
  };

  if (result.matchedKeywords && result.matchedKeywords.length > 0) {
    response.supportingKeywords = result.matchedKeywords;
  }

  return res.status(200).json(response);
});

module.exports = router;