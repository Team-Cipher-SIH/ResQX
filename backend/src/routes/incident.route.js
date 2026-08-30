const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const { attachJurisdictionFilter } = require("../middleware/jurisdiction.middleware");
const {
  createIncident,
  getIncidents,
  verifyIncident,
  getPublicIncidents,
  assignIncident,
  getMyIncidents,
  createSOS,
  getIncidentById,
  updateIncidentStatus,
  getIncidentStats,
} = require("../controllers/incident.controller");

router.post("/sos", protect, createSOS);
router.post("/report", protect, upload.single("photo"), createIncident);
router.get("/my-reports", protect, getMyIncidents);
router.get("/stats", protect, authorize("authority", "admin"), attachJurisdictionFilter, getIncidentStats);
router.get("/public", getPublicIncidents);
router.get("/", protect, authorize("authority", "admin"), attachJurisdictionFilter, getIncidents);
router.get("/:id", protect, getIncidentById);
router.patch(
  "/:id/status",
  protect,
  authorize("authority", "admin"),
  updateIncidentStatus
);
router.patch(
  "/:id/verify",
  protect,
  authorize("authority", "admin"),
  verifyIncident,
);
router.patch(
  "/:id/assign",
  protect,
  authorize("authority", "admin"),
  assignIncident,
);

module.exports = router;
