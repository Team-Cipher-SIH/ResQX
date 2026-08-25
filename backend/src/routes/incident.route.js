const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const {
  createIncident,
  getIncidents,
  verifyIncident,
  assignIncident,
  getMyIncidents,
  createSOS,
} = require("../controllers/incident.controller");

router.post("/sos", protect, createSOS);
router.post("/report", protect, upload.single("photo"), createIncident);
router.get("/my-reports", protect, getMyIncidents);
router.get("/", protect, authorize("authority","admin"), getIncidents);
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
