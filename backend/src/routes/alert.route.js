const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { createAlert, getAlerts, deactivateAlert, getNearbyAlerts } = require("../controllers/alert.controller");

router.post("/", protect, authorize("authority", "admin"), createAlert);
router.get("/nearby", getNearbyAlerts);   // public — citizen ke liye specifically
router.get("/", getAlerts); 
router.patch("/:id/deactivate", protect, authorize("authority", "admin"), deactivateAlert);

module.exports = router;