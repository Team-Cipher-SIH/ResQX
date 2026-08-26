const express = require("express");
const router = express.Router();
const {
  createReliefCamp,
  getReliefCamps,
  updateReliefCamp,
  closeReliefCamp,
} = require("../controllers/reliefCampController");

router.post("/", createReliefCamp);
router.get("/", getReliefCamps);
router.patch("/:id/update", updateReliefCamp);
router.patch("/:id/close", closeReliefCamp);

module.exports = router;