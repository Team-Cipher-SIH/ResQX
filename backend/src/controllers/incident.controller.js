const Incident = require("../models/incident.model");
const ActivityLog = require("../models/activitylog.model");
const User = require("../models/user.model");
const ResponseTeam = require("../models/responseteam.model");
const { calculatePriorityScore } = require("../utils/priorityScore");
const { validateObjectId, checkJurisdictionAccess } = require("../middleware/jurisdiction.middleware");
const { emitToJurisdiction, getIO } = require("../config/socket");

// Helper to safely parse and validate GeoJSON Point coordinates [longitude, latitude]
const parseAndValidateCoordinates = (coordinates) => {
  let coords = coordinates;
  if (typeof coords === "string") {
    try {
      coords = JSON.parse(coords);
    } catch (e) {
      return { valid: false, error: "coordinates must be a valid JSON array" };
    }
  }

  if (!Array.isArray(coords) || coords.length !== 2) {
    return { valid: false, error: "coordinates must be an array of [longitude, latitude]" };
  }

  const [lng, lat] = coords.map(Number);
  if (isNaN(lng) || isNaN(lat)) {
    return { valid: false, error: "coordinates elements must be numbers" };
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return { valid: false, error: "coordinates out of valid bounds: longitude [-180, 180], latitude [-90, 90]" };
  }

  return { valid: true, coordinates: [lng, lat] };
};

// POST /api/incidents/report
const createIncident = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      severity,
      coordinates,
      address,
      state,
      district,
    } = req.body;

    if (!title || !description || !type || !coordinates || !state || !district) {
      return res.status(400).json({
        success: false,
        message: "title, description, type, coordinates, state, and district are required",
      });
    }

    const validTypes = ["flood", "fire", "earthquake", "landslide", "cyclone", "other"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed types: ${validTypes.join(", ")}`,
      });
    }

    const validSeverities = ["low", "medium", "high", "critical"];
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Allowed values: ${validSeverities.join(", ")}`,
      });
    }

    const coordResult = parseAndValidateCoordinates(coordinates);
    if (!coordResult.valid) {
      return res.status(400).json({
        success: false,
        message: coordResult.error,
      });
    }

    const mediaUrls = req.file ? [req.file.path] : [];

    const incident = await Incident.create({
      title: title.trim(),
      description: description.trim(),
      type,
      severity: severity || "medium",
      status: "reported",
      location: { type: "Point", coordinates: coordResult.coordinates },
      address: address ? address.trim() : "",
      state: state.trim(),
      district: district.trim(),
      mediaUrls,
      reportedBy: req.user._id,
      statusHistory: [
        {
          status: "reported",
          timestamp: new Date(),
          updatedBy: req.user._id,
          note: "Incident reported",
        },
      ],
    });

    // Create activity log
    try {
      await ActivityLog.create({
        action: "incident_reported",
        description: `Incident reported: ${incident.title}`,
        performedBy: req.user._id,
        incident: incident._id,
        state: incident.state,
        district: incident.district,
      });
    } catch (logErr) {
      console.error("ActivityLog creation error on createIncident:", logErr.message);
    }

    // Emit real-time event to relevant rooms
    try {
      emitToJurisdiction(incident.state, incident.district, "new-incident", incident);
    } catch (sockErr) {
      console.error("Socket emission error on createIncident:", sockErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Incident reported successfully",
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to report incident",
      error: err.message,
    });
  }
};

// GET /api/incidents?status=&district=&state=&type=&severity=
const getIncidents = async (req, res) => {
  try {
    const { status, district, state, type, severity } = req.query;

    const filter = {};

    // 1. Enforce authenticated jurisdiction first
    if (req.user.role === "admin" || req.user.authorityLevel === "central") {
      if (state) filter.state = state;
      if (district) filter.district = district;
    } else if (req.user.authorityLevel === "state_admin") {
      // Must only query their own state
      filter.state = req.user.state;
      // Allow optional filter inside their own state
      if (district) filter.district = district;
    } else if (req.user.authorityLevel === "district_admin") {
      // Must only query their own state and district
      filter.state = req.user.state;
      filter.district = req.user.district;
    } else if (req.user.authorityLevel === "field_responder") {
      // Field responder: only their assigned incidents or teams
      const userTeams = await ResponseTeam.find({
        $or: [{ members: req.user._id }, { leader: req.user._id }],
      }).select("_id");
      const teamIds = userTeams.map((t) => t._id);

      filter.$or = [{ assignedTo: req.user._id }, { assignedTeam: { $in: teamIds } }];
    } else if (req.jurisdictionFilter) {
      Object.assign(filter, req.jurisdictionFilter);
    }

    // 2. Optional query filters
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const incidents = await Incident.find(filter)
      .populate("reportedBy", "name email phone")
      .populate("verifiedBy", "name email")
      .populate("assignedTo", "name email phone")
      .populate("assignedTeam", "name type status")
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(200);

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch incidents",
      error: err.message,
    });
  }
};

// GET /api/incidents/:id
const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid incident ID" });
    }

    const incident = await Incident.findById(id)
      .populate("reportedBy", "name email phone")
      .populate("verifiedBy", "name email")
      .populate("assignedTo", "name email phone state district")
      .populate("assignedTeam", "name type status members leader")
      .populate("statusHistory.updatedBy", "name role authorityLevel");

    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Check citizen access: citizens can only view incidents they reported
    if (req.user.role === "citizen") {
      const reporterId = incident.reportedBy ? (incident.reportedBy._id || incident.reportedBy).toString() : null;
      if (reporterId !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Forbidden: You can only view your own reported incidents" });
      }
    } else {
      // Check authority jurisdiction
      const hasAccess = checkJurisdictionAccess(req.user, incident);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have permission to view incidents in this jurisdiction",
        });
      }
    }

    return res.status(200).json({ success: true, data: incident });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch incident",
      error: err.message,
    });
  }
};

// GET /api/incidents/my-reports
const getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user._id })
      .populate("assignedTo", "name phone")
      .populate("assignedTeam", "name type")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your incidents",
      error: err.message,
    });
  }
};

// PATCH /api/incidents/:id/verify
const verifyIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid incident ID" });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Enforce jurisdiction: state/district admin can only verify incidents in their jurisdiction
    if (!checkJurisdictionAccess(req.user, incident)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to verify incidents in this jurisdiction",
      });
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
    // ALWAYS use authenticated user from token — NEVER trust req.body.verifiedBy
    incident.verifiedBy = req.user._id;
    incident.verifiedAt = new Date();
    incident.statusHistory.push({
      status: "verified",
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: note || "Incident verified",
    });

    await incident.save();

    // Create activity log
    try {
      await ActivityLog.create({
        action: "incident_verified",
        description: `Incident verified: ${incident.title}`,
        performedBy: req.user._id,
        incident: incident._id,
        state: incident.state,
        district: incident.district,
      });
    } catch (logErr) {
      console.error("ActivityLog creation error on verifyIncident:", logErr.message);
    }

    // Real-time notification
    try {
      emitToJurisdiction(incident.state, incident.district, "incident-updated", incident);
    } catch (sockErr) {
      console.error("Socket emission error on verifyIncident:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Incident verified successfully",
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify incident",
      error: err.message,
    });
  }
};

// PATCH /api/incidents/:id/assign
const assignIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedDepartment, assignedTeam, note } = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid incident ID" });
    }

    if (!assignedTo && !assignedDepartment && !assignedTeam) {
      return res.status(400).json({
        success: false,
        message: "At least one of assignedTo (field responder), assignedDepartment, or assignedTeam is required",
      });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Enforce jurisdiction access
    if (!checkJurisdictionAccess(req.user, incident)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to assign incidents in this jurisdiction",
      });
    }

    if (incident.status !== "verified") {
      return res.status(400).json({
        success: false,
        message: `Cannot assign an incident with status "${incident.status}". Only "verified" incidents can be assigned.`,
      });
    }

    // If assignedTo is provided, validate user exists, is authority/field_responder, and belongs to same state & district
    if (assignedTo) {
      if (!validateObjectId(assignedTo)) {
        return res.status(400).json({ success: false, message: "Invalid assignedTo user ID" });
      }

      const responder = await User.findById(assignedTo);
      if (!responder) {
        return res.status(404).json({ success: false, message: "Assigned responder user not found" });
      }

      if (responder.role !== "authority" || responder.authorityLevel !== "field_responder") {
        return res.status(400).json({
          success: false,
          message: "Assigned user must be an authority with authorityLevel 'field_responder'",
        });
      }

      if (responder.state !== incident.state || responder.district !== incident.district) {
        return res.status(400).json({
          success: false,
          message: `Responder jurisdiction mismatch: responder is registered in ${responder.district}, ${responder.state} but incident is in ${incident.district}, ${incident.state}`,
        });
      }

      incident.assignedTo = responder._id;
    }

    // If assignedTeam is provided, validate team
    if (assignedTeam) {
      if (!validateObjectId(assignedTeam)) {
        return res.status(400).json({ success: false, message: "Invalid assignedTeam ID" });
      }

      const team = await ResponseTeam.findById(assignedTeam);
      if (!team) {
        return res.status(404).json({ success: false, message: "Assigned response team not found" });
      }

      if (team.state !== incident.state || team.district !== incident.district) {
        return res.status(400).json({
          success: false,
          message: `Team jurisdiction mismatch: team belongs to ${team.district}, ${team.state} but incident is in ${incident.district}, ${incident.state}`,
        });
      }

      incident.assignedTeam = team._id;
    }

    if (assignedDepartment) {
      incident.assignedDepartment = assignedDepartment;
    }

    incident.status = "assigned";
    incident.statusHistory.push({
      status: "assigned",
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: note || "Incident assigned",
    });

    await incident.save();

    // Create activity log
    try {
      await ActivityLog.create({
        action: "incident_assigned",
        description: `Incident assigned: ${incident.title}`,
        performedBy: req.user._id,
        incident: incident._id,
        team: incident.assignedTeam || null,
        state: incident.state,
        district: incident.district,
      });
    } catch (logErr) {
      console.error("ActivityLog creation error on assignIncident:", logErr.message);
    }

    // Emit real-time events
    try {
      emitToJurisdiction(incident.state, incident.district, "incident-updated", incident);
      if (incident.assignedTo) {
        try {
          getIO().to(`user:${incident.assignedTo}`).emit("incident-assigned", incident);
        } catch (e) {}
      }
    } catch (sockErr) {
      console.error("Socket emission error on assignIncident:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Incident assigned successfully",
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to assign incident",
      error: err.message,
    });
  }
};

// PATCH /api/incidents/:id/status
const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid incident ID" });
    }

    const validStatuses = [
      "reported",
      "verified",
      "assigned",
      "in_progress",
      "resolved",
      "closed",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Enforce jurisdiction access
    if (!checkJurisdictionAccess(req.user, incident)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to modify incidents in this jurisdiction",
      });
    }

    const currentStatusIndex = validStatuses.indexOf(incident.status);
    const newStatusIndex = validStatuses.indexOf(status);

    if (newStatusIndex <= currentStatusIndex) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition status backwards or to the same status (${incident.status} -> ${status})`,
      });
    }

    incident.status = status;
    incident.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: note || `Status updated to ${status}`,
    });

    if (status === "resolved" || status === "closed") {
      incident.priorityScore = 0;
    }

    await incident.save();

    // Map to valid ActivityLog action enum
    let logAction = "incident_status_updated";
    if (status === "resolved") logAction = "incident_resolved";
    if (status === "closed") logAction = "incident_closed";

    try {
      await ActivityLog.create({
        action: logAction,
        description: note || `Incident status updated to ${status}: ${incident.title}`,
        performedBy: req.user._id,
        incident: incident._id,
        state: incident.state,
        district: incident.district,
      });
    } catch (logErr) {
      console.error("ActivityLog creation error on updateIncidentStatus:", logErr.message);
    }

    try {
      emitToJurisdiction(incident.state, incident.district, "incident-updated", incident);
    } catch (sockErr) {
      console.error("Socket emission error on updateIncidentStatus:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Incident status updated to ${status}`,
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update incident status",
      error: err.message,
    });
  }
};

// GET /api/incidents/stats
const getIncidentStats = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "admin" || req.user.authorityLevel === "central") {
      // no filter
    } else if (req.user.authorityLevel === "state_admin") {
      filter.state = req.user.state;
    } else if (req.user.authorityLevel === "district_admin") {
      filter.state = req.user.state;
      filter.district = req.user.district;
    } else if (req.jurisdictionFilter) {
      Object.assign(filter, req.jurisdictionFilter);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stats = await Incident.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIncidents: { $sum: 1 },
          criticalIncidents: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
          },
          sosIncidents: {
            $sum: { $cond: [{ $eq: ["$isSOS", true] }, 1, 0] },
          },
          pendingVerification: {
            $sum: { $cond: [{ $eq: ["$status", "reported"] }, 1, 0] },
          },
          verifiedIncidents: {
            $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] },
          },
          assignedIncidents: {
            $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] },
          },
          inProgressIncidents: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
          },
          dispatchedIncidents: {
            $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] },
          },
          resolvedToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "resolved"] },
                    { $gte: ["$updatedAt", startOfToday] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const defaultStats = {
      activeIncidents: 0,
      criticalIncidents: 0,
      pendingVerification: 0,
      verifiedIncidents: 0,
      assignedIncidents: 0,
      inProgressIncidents: 0,
      dispatchedIncidents: 0,
      resolvedToday: 0,
      totalIncidents: 0,
      sosIncidents: 0,
    };

    if (stats.length > 0) {
      const s = stats[0];
      const result = {
        activeIncidents:
          s.pendingVerification +
          s.verifiedIncidents +
          s.assignedIncidents +
          s.inProgressIncidents,
        criticalIncidents: s.criticalIncidents,
        pendingVerification: s.pendingVerification,
        verifiedIncidents: s.verifiedIncidents,
        assignedIncidents: s.assignedIncidents,
        inProgressIncidents: s.inProgressIncidents,
        dispatchedIncidents: s.dispatchedIncidents,
        resolvedToday: s.resolvedToday,
        totalIncidents: s.totalIncidents,
        sosIncidents: s.sosIncidents,
      };

      return res.status(200).json({ success: true, data: result });
    }

    return res.status(200).json({ success: true, data: defaultStats });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to get incident stats",
      error: err.message,
    });
  }
};

// POST /api/incidents/sos
const createSOS = async (req, res) => {
  try {
    const { coordinates, type, state, district } = req.body;

    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "coordinates are required for SOS",
      });
    }

    const coordResult = parseAndValidateCoordinates(coordinates);
    if (!coordResult.valid) {
      return res.status(400).json({
        success: false,
        message: coordResult.error,
      });
    }

    const userState = state || req.user.state || "Unknown";
    const userDistrict = district || req.user.district || "Unknown";

    const incident = await Incident.create({
      title: "SOS Emergency Alert",
      description: "Emergency SOS triggered by citizen. Immediate attention required.",
      type: type || "other",
      severity: "critical", // SOS is always critical priority
      status: "reported",
      location: { type: "Point", coordinates: coordResult.coordinates },
      state: userState,
      district: userDistrict,
      isSOS: true,
      reportedBy: req.user._id,
      priorityScore: 50,
      statusHistory: [
        {
          status: "reported",
          timestamp: new Date(),
          updatedBy: req.user._id,
          note: "SOS Alert triggered",
        },
      ],
    });

    // Create activity log
    try {
      await ActivityLog.create({
        action: "sos_triggered",
        description: `Emergency SOS triggered by citizen at [${coordResult.coordinates.join(", ")}]`,
        performedBy: req.user._id,
        incident: incident._id,
        state: incident.state,
        district: incident.district,
      });
    } catch (logErr) {
      console.error("ActivityLog creation error on createSOS:", logErr.message);
    }

    // Emit real-time events
    try {
      emitToJurisdiction(incident.state, incident.district, "sos-alert", incident);
      emitToJurisdiction(incident.state, incident.district, "new-incident", incident);
    } catch (sockErr) {
      console.error("Socket emission error on createSOS:", sockErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "SOS alert sent successfully. Help is on the way.",
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to send SOS alert",
      error: err.message,
    });
  }
};// Public: limited fields, no auth required, for citizen-facing live map
const getPublicIncidents = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const incidents = await Incident.find(filter)
      .select('title type severity status isSOS location address state district priorityScore createdAt')
      .limit(200)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch public incidents' });
  }
};


module.exports = {
  createIncident,
  getIncidents,
  getPublicIncidents,
  getIncidentById,
  verifyIncident,
  assignIncident,
  updateIncidentStatus,
  getIncidentStats,
  getMyIncidents,
  createSOS,
};
