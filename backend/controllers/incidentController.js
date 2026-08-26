const Incident = require("../models/Incident");
const { calculatePriorityScore } = require("../utils/priorityScore");

// POST /api/incidents/report
const createIncident = async (req, res) => {
  try {
    const { title, description, type, severity, coordinates, address, state, district, mediaUrls } = req.body;

    if (!title || !description || !type || !coordinates || !state || !district) {
      return res.status(400).json({
        success: false,
        message: "title, description, type, coordinates, state, and district are required",
      });
    }

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "coordinates must be an array of [longitude, latitude]",
      });
    }

    const incident = await Incident.create({
      title,
      description,
      type,
      severity: severity || "medium",
      status: "reported",
      location: { type: "Point", coordinates },
      address,
      state,
      district,
      mediaUrls: mediaUrls || [],
      reportedBy: req.body.reportedBy || null,
    });

    res.status(201).json({ success: true, message: "Incident reported successfully", data: incident });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to report incident", error: err.message });
  }
};

// GET /api/incidents?status=&district=&state=&type=&severity=
const getIncidents = async (req, res) => {
  try {
    const { status, district, state, type, severity } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (district) filter.district = district;
    if (state) filter.state = state;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const incidents = await Incident.find(filter).sort({ createdAt: -1 }).limit(200);

    res.status(200).json({ success: true, count: incidents.length, data: incidents });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch incidents", error: err.message });
  }
};

// PATCH /api/incidents/:id/verify
const verifyIncident = async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    if (incident.status !== "reported") {
      return res.status(400).json({
        success: false,
        message: `Cannot verify an incident with status "${incident.status}". Only "reported" incidents can be verified.`,
      });
    }

    const priorityScore = calculatePriorityScore(incident.severity, incident.createdAt);

    incident.status = "verified";
    incident.priorityScore = priorityScore;
    incident.verifiedBy = req.body.verifiedBy || null;

    await incident.save();

    res.status(200).json({ success: true, message: "Incident verified successfully", data: incident });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to verify incident", error: err.message });
  }
};

// PATCH /api/incidents/:id/assign
// This is the actual "dispatch" step — a verified incident gets handed off
// to a field responder and/or department. Only "verified" incidents can be
// assigned, same guard pattern as verifyIncident above.
const assignIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedDepartment } = req.body;

    if (!assignedTo && !assignedDepartment) {
      return res.status(400).json({
        success: false,
        message: "At least one of assignedTo (field responder) or assignedDepartment is required",
      });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    if (incident.status !== "verified") {
      return res.status(400).json({
        success: false,
        message: `Cannot assign an incident with status "${incident.status}". Only "verified" incidents can be assigned.`,
      });
    }

    incident.status = "assigned";
    if (assignedTo) incident.assignedTo = assignedTo;
    if (assignedDepartment) incident.assignedDepartment = assignedDepartment;

    await incident.save();

    res.status(200).json({ success: true, message: "Incident assigned successfully", data: incident });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to assign incident", error: err.message });
  }
};

module.exports = { createIncident, getIncidents, verifyIncident, assignIncident };