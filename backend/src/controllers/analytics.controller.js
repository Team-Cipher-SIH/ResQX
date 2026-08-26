const Incident = require("../models/incident.model");

// GET /api/analytics/trend?days=7
// Daily incident count for the last N days
exports.getIncidentTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchFilter = {
      createdAt: { $gte: startDate },
      ...req.jurisdictionFilter,
    };

    const trend = await Incident.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ success: true, data: trend });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch trend", error: err.message });
  }
};

// GET /api/analytics/by-type
exports.getIncidentsByType = async (req, res) => {
  try {
    const byType = await Incident.aggregate([
      { $match: req.jurisdictionFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ success: true, data: byType });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch type breakdown", error: err.message });
  }
};

// GET /api/analytics/sos-count
exports.getSOSCount = async (req, res) => {
  try {
    const count = await Incident.countDocuments({
      isSOS: true,
      ...req.jurisdictionFilter,
    });

    res.status(200).json({ success: true, data: { sosCount: count } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch SOS count", error: err.message });
  }
};

// GET /api/analytics/avg-response-time
// Average time (in minutes) between "reported" and "verified" — uses createdAt vs updatedAt
// for incidents that have been verified
exports.getAvgResponseTime = async (req, res) => {
  try {
    const result = await Incident.aggregate([
      {
        $match: {
          status: { $in: ["verified", "assigned", "in_progress", "resolved", "closed"] },
          verifiedBy: { $ne: null },
          ...req.jurisdictionFilter,
        },
      },
      {
        $project: {
          responseTimeMinutes: {
            $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 60000],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTimeMinutes: { $avg: "$responseTimeMinutes" },
          count: { $sum: 1 },
        },
      },
    ]);

    const data = result[0] || { avgResponseTimeMinutes: 0, count: 0 };
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch avg response time", error: err.message });
  }
};

// GET /api/analytics/by-location
// State/district-wise incident count
exports.getIncidentsByLocation = async (req, res) => {
  try {
    const byLocation = await Incident.aggregate([
      { $match: req.jurisdictionFilter },
      {
        $group: {
          _id: { state: "$state", district: "$district" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ success: true, data: byLocation });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch location breakdown", error: err.message });
  }
};

// GET /api/analytics/by-status
exports.getIncidentsByStatus = async (req, res) => {
  try {
    const byStatus = await Incident.aggregate([
      { $match: req.jurisdictionFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({ success: true, data: byStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch status breakdown", error: err.message });
  }
};

// GET /api/analytics/by-severity
exports.getIncidentsBySeverity = async (req, res) => {
  try {
    const bySeverity = await Incident.aggregate([
      { $match: req.jurisdictionFilter },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);

    res.status(200).json({ success: true, data: bySeverity });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch severity breakdown", error: err.message });
  }
};