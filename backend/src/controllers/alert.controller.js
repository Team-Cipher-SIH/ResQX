const Alert = require("../models/alert.model");
const ActivityLog = require("../models/activitylog.model");
const { validateObjectId, checkJurisdictionAccess } = require("../middleware/jurisdiction.middleware");
const { emitToJurisdiction } = require("../config/socket");

// POST /api/alerts
const createAlert = async (req, res) => {
  try {
    let { title, message, type, severity, affectedStates, affectedDistricts, endTime } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "title and message are required" });
    }

    // Auto-scope alert based on authority level
    if (req.user.authorityLevel === "state_admin" && req.user.state) {
      affectedStates = [req.user.state];
    } else if (req.user.authorityLevel === "district_admin") {
      if (req.user.state) affectedStates = [req.user.state];
      if (req.user.district) affectedDistricts = [req.user.district];
    }

    const alert = await Alert.create({
      title: title.trim(),
      message: message.trim(),
      type: type || "advisory",
      severity: severity || "medium",
      affectedStates: affectedStates || [],
      affectedDistricts: affectedDistricts || [],
      endTime: endTime || null,
      issuedBy: req.user._id,
    });

    try {
      await ActivityLog.create({
        action: "alert_created",
        description: `Alert created: ${alert.title}`,
        performedBy: req.user._id,
        state: alert.affectedStates[0] || req.user.state || null,
        district: alert.affectedDistricts[0] || req.user.district || null,
      });
    } catch (logErr) {
      console.error("ActivityLog error on createAlert:", logErr.message);
    }

    try {
      const targetState = alert.affectedStates[0] || null;
      const targetDistrict = alert.affectedDistricts[0] || null;
      emitToJurisdiction(targetState, targetDistrict, "new-alert", alert);
    } catch (sockErr) {
      console.error("Socket error on createAlert:", sockErr.message);
    }

    return res.status(201).json({ success: true, message: "Alert created successfully", data: alert });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to create alert", error: err.message });
  }
};

// GET /api/alerts?isActive=&severity=&type=&state=&district=
const getAlerts = async (req, res) => {
  try {
    const { isActive, severity, type, state, district } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (state) filter.affectedStates = state;
    if (district) filter.affectedDistricts = district;

    const alerts = await Alert.find(filter)
      .populate("issuedBy", "name email role authorityLevel")
      .sort({ severity: -1, createdAt: -1 })
      .limit(200);

    return res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch alerts", error: err.message });
  }
};

// PATCH /api/alerts/:id/deactivate
const deactivateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid alert ID" });
    }

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    if (!alert.isActive) {
      return res.status(400).json({ success: false, message: "Alert is already inactive" });
    }

    alert.isActive = false;
    alert.endTime = new Date();

    await alert.save();

    try {
      await ActivityLog.create({
        action: "alert_deactivated",
        description: `Alert deactivated: ${alert.title}`,
        performedBy: req.user._id,
        state: alert.affectedStates[0] || req.user.state || null,
        district: alert.affectedDistricts[0] || req.user.district || null,
      });
    } catch (logErr) {
      console.error("ActivityLog error on deactivateAlert:", logErr.message);
    }

    return res.status(200).json({ success: true, message: "Alert deactivated successfully", data: alert });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to deactivate alert", error: err.message });
  }
};

// GET /api/alerts/nearby?state=&district=
const getNearbyAlerts = async (req, res) => {
  try {
    const { state, district } = req.query;

    if (!state) {
      return res.status(400).json({ success: false, message: "state is required" });
    }

    const locationFilter = {
      $or: [
        { affectedStates: { $size: 0 } }, // nationwide alerts
        { affectedStates: state },
      ],
    };

    if (district) {
      locationFilter.$or.push({ affectedDistricts: district });
    }

    const alerts = await Alert.find({
      isActive: true,
      ...locationFilter,
    })
      .populate("issuedBy", "name email role authorityLevel")
      .sort({ severity: -1, createdAt: -1 });

    return res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch nearby alerts", error: err.message });
  }
};

module.exports = { createAlert, getAlerts, deactivateAlert, getNearbyAlerts };