const express = require("express");
const router = express.Router();
const { createAlert, getAlerts, deactivateAlert } = require("../controllers/alertController");

router.post("/", createAlert);
router.get("/", getAlerts);
router.patch("/:id/deactivate", deactivateAlert);

module.exports = router;