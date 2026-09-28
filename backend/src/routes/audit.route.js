const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { attachJurisdictionFilter } = require("../middleware/jurisdiction.middleware");
const { getAuditLogs } = require("../controllers/audit.controller");

router.get(
  "/",
  protect,
  authorize("authority", "admin"),
  attachJurisdictionFilter,
  getAuditLogs
);

module.exports = router;
