const express = require("express");
const router = express.Router();
const { protect, authorize, optionalProtect } = require("../middleware/auth.middleware");
const {
  createAlert,
  getAlerts,
  deactivateAlert,
  getNearbyAlerts,
  getDraftAlerts,
  issueAlert,
  rejectAlert,
} = require("../controllers/alert.controller");

router.post("/", protect, authorize("authority", "admin"), createAlert);
router.get("/nearby", getNearbyAlerts);   // public — citizen ke liye specifically
router.get("/drafts", protect, authorize("authority", "admin"), getDraftAlerts); // 🆕
router.get("/", optionalProtect, getAlerts);
router.patch("/:id/deactivate", protect, authorize("authority", "admin"), deactivateAlert);
router.patch("/:id/issue", protect, authorize("authority", "admin"), issueAlert);   // 🆕
router.patch("/:id/reject", protect, authorize("authority", "admin"), rejectAlert); // 🆕

module.exports = router;