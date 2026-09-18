const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { attachJurisdictionFilter } = require("../middleware/jurisdiction.middleware");

const {
  createDispatch,
  getDispatches,
  getDispatchById,
  updateDispatchStatus,
  getActiveDispatches,
} = require("../controllers/dispatch.controller");

router.post("/", protect, authorize("authority", "admin"), createDispatch);

router.get("/active", protect, getActiveDispatches);

router.get("/", protect, authorize("authority", "admin"), attachJurisdictionFilter, getDispatches);

router.get("/:id", protect, getDispatchById);

router.patch("/:id/status", protect, updateDispatchStatus);

module.exports = router;
