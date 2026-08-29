const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  createSupply,
  getSupplies,
  getSupplyById,
  updateSupply,
  adjustSupplyStock,
  deleteSupply,
  getPublicNearbySupplies,
  getSupplyStats,
} = require("../controllers/supply.controller");

// Public endpoints for citizens
router.get("/public", getPublicNearbySupplies);
router.get("/nearby", getPublicNearbySupplies);

// Inventory stats for dashboards
router.get("/stats", getSupplyStats);

// General inventory list (jurisdiction-filtered when authenticated)
router.get("/", getSupplies);

// Single supply item
router.get("/:id", getSupplyById);

// Create new supply item (authority/admin only)
router.post("/", protect, authorize("authority", "admin"), createSupply);

// Update supply item fields
router.patch("/:id", protect, authorize("authority", "admin"), updateSupply);

// Stock adjustment (+/- / set)
router.patch("/:id/stock", protect, authorize("authority", "admin"), adjustSupplyStock);

// Soft delete / deactivate supply item
router.delete("/:id", protect, authorize("authority", "admin"), deleteSupply);

module.exports = router;
