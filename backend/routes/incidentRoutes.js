const express = require("express");
const router = express.Router();
const {
  createIncident,
  getIncidents,
  verifyIncident,
  assignIncident,
} = require("../controllers/incidentController");

router.post("/report", createIncident);
router.get("/", getIncidents);
router.patch("/:id/verify", verifyIncident);
router.patch("/:id/assign", assignIncident);

module.exports = router;