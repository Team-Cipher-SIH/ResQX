const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  createShelter,
  getAllShelters,
  getNearbyShelters,
  getShelterById,
  updateShelter,
  deactivateShelter,
} = require("../controllers/shelter.controller");

// Public endpoint for citizen proximity map & list
router.get("/nearby", getNearbyShelters);

// Get all shelters (jurisdiction-filtered if authenticated, filterable by query)
router.get("/", getAllShelters);

// Get single shelter by ID
router.get("/:id", getShelterById);

// Create shelter (authority/admin only, jurisdiction-enforced)
router.post("/", protect, authorize("authority", "admin"), createShelter);

// Update shelter (authority/admin only, jurisdiction-enforced)
router.patch("/:id", protect, authorize("authority", "admin"), updateShelter);
router.put("/:id", protect, authorize("authority", "admin"), updateShelter);

// Deactivate shelter (authority/admin only, jurisdiction-enforced)
router.delete("/:id", protect, authorize("authority", "admin"), deactivateShelter);

module.exports = router;