const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { createShelter, getNearbyShelters, getAllShelters } = require("../controllers/shelter.controller");

router.post("/", protect, authorize("authority", "admin"), createShelter);
router.get("/nearby", getNearbyShelters);   // public — citizen ko turant dikhna chahiye, login se pehle bhi
router.get("/", getAllShelters);

module.exports = router;