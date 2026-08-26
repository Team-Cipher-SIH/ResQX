const express = require("express");
const router = express.Router();
const { protect, authorize, scopeByJurisdiction } = require("../middleware/auth.middleware");
const {
  getIncidentTrend,
  getIncidentsByType,
  getSOSCount,
  getAvgResponseTime,
  getIncidentsByLocation,
  getIncidentsByStatus,
  getIncidentsBySeverity,
} = require("../controllers/analytics.controller");

router.get("/trend", protect, authorize("authority", "admin"), scopeByJurisdiction, getIncidentTrend);
router.get("/by-type", protect, authorize("authority", "admin"), scopeByJurisdiction, getIncidentsByType);
router.get("/sos-count", protect, authorize("authority", "admin"), scopeByJurisdiction, getSOSCount);
router.get("/avg-response-time", protect, authorize("authority", "admin"), scopeByJurisdiction, getAvgResponseTime);
router.get("/by-location", protect, authorize("authority", "admin"), scopeByJurisdiction, getIncidentsByLocation);
router.get("/by-status", protect, authorize("authority", "admin"), scopeByJurisdiction, getIncidentsByStatus);
router.get("/by-severity", protect, authorize("authority", "admin"), scopeByJurisdiction, getIncidentsBySeverity);

module.exports = router;