const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { attachJurisdictionFilter } = require("../middleware/jurisdiction.middleware");
const { getDashboardStats, getRecentActivity, getDistrictOverview } = require("../controllers/dashboard.controller");

router.get("/stats", protect, authorize("authority", "admin"), attachJurisdictionFilter, getDashboardStats);
router.get("/activity", protect, authorize("authority", "admin"), attachJurisdictionFilter, getRecentActivity);
router.get("/districts", protect, authorize("authority", "admin"), attachJurisdictionFilter, getDistrictOverview);

module.exports = router;
