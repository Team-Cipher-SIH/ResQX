const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { createAlert, getAlerts, deactivateAlert } = require("../controllers/alert.controller");

router.post("/", protect, authorize("authority", "admin"), createAlert);
router.get("/", getAlerts); 
router.patch("/:id/deactivate", protect, authorize("authority", "admin"), deactivateAlert);

module.exports = router;