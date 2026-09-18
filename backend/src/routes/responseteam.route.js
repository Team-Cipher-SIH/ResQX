const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { attachJurisdictionFilter } = require("../middleware/jurisdiction.middleware");

const {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  updateTeamAvailability,
  deleteTeam,
} = require("../controllers/responseteam.controller");

router.route("/")
  .post(protect, authorize("authority", "admin"), createTeam)
  .get(protect, authorize("authority", "admin"), attachJurisdictionFilter, getTeams);

router.route("/:id")
  .get(protect, authorize("authority", "admin"), getTeamById)
  .patch(protect, authorize("authority", "admin"), updateTeam)
  .delete(protect, authorize("admin"), deleteTeam);

router.patch("/:id/availability", protect, authorize("authority", "admin"), updateTeamAvailability);

module.exports = router;
