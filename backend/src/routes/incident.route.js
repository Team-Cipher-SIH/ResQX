const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { createIncident, getIncidents, verifyIncident, assignIncident } = require("../controllers/incident.controller");

router.post("/report", protect, createIncident);
router.get("/", protect, authorize("authority", "admin"), getIncidents);
router.patch("/:id/verify", protect, authorize("authority", "admin"), verifyIncident);
router.patch("/:id/assign", protect, authorize("authority", "admin"), assignIncident);

module.exports = router;