const Alert = require("../models/alert.model");

// POST /api/alerts
const createAlert = async (req, res) => {
  try {
    const { title, message, type, severity, affectedStates, affectedDistricts, endTime } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "title and message are required" });
    }

    const alert = await Alert.create({
      title,
      message,
      type: type || "advisory",
      severity: severity || "medium",
      affectedStates: affectedStates || [],
      affectedDistricts: affectedDistricts || [],
      endTime: endTime || null,
      issuedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: "Alert created successfully", data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create alert", error: err.message });
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

    const alerts = await Alert.find(filter).sort({ severity: -1, createdAt: -1 }).limit(200);

    res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch alerts", error: err.message });
  }
};

// PATCH /api/alerts/:id/deactivate
// Marks an alert as no longer active — we never delete alerts, since a
// closed alert is still useful history (e.g. "how many flood warnings did
// district X get this month" for a report later).
const deactivateAlert = async (req, res) => {
  try {
    const { id } = req.params;

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

    res.status(200).json({ success: true, message: "Alert deactivated successfully", data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to deactivate alert", error: err.message });
  }
};

module.exports = { createAlert, getAlerts, deactivateAlert };