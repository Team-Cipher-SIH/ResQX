const Incident = require("../models/incident.model");
const ActivityLog = require("../models/activitylog.model");
const User = require("../models/user.model");
const ResponseTeam = require("../models/responseteam.model");
const { calculatePriorityScore } = require("../utils/priorityScore");
const { validateObjectId, checkJurisdictionAccess } = require("../middleware/jurisdiction.middleware");
const { emitToJurisdiction, getIO } = require("../config/socket");
const { verifyIncidentAuthenticity } = require("../utils/aiVerificationService");

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

// Asynchronous background AI worker (non-blocking)
const runBackgroundAiVerification = async (incidentId) => {
  try {
    const incident = await Incident.findById(incidentId);
    if (!incident) return;

    try {
      const result = await verifyIncidentAuthenticity(incident);
      incident.aiAnalysis = {
        status: "completed",
        isEmergency: result.isEmergency !== undefined ? result.isEmergency : true,
        emergencyRelevanceReason: result.emergencyRelevanceReason || null,
        classifiedType: result.classifiedType || incident.type,
        predictedType: result.classifiedType || incident.type,
        aiSeverity: result.aiSeverity || "MEDIUM",
        predictedSeverity: result.aiSeverity || "MEDIUM",
        aiPriority: result.aiPriority || "P2",
        recommendedTeam: result.recommendedTeam || null,
        aiSummary: result.aiSummary || result.summary || null,
        summary: result.aiSummary || result.summary || null,
        authenticity: result.authenticity || "LIKELY_GENUINE",
        credibilityScore: result.credibilityScore ?? null,
        confidence: result.confidence ?? null,
        reasoning: result.reasoning || null,
        recommendedAction: result.recommendedAction || null,
        suggestedUnit: result.suggestedUnit || null,
        analyzedAt: new Date(),
      };
      await incident.save();

      // Emit realtime update to jurisdiction rooms
      try {
        emitToJurisdiction(incident.state, incident.district, "incident-updated", incident);
      } catch (e) {}
    } catch (aiErr) {
      console.warn(`[AI-Verification] Background AI failed for incident ${incidentId}:`, aiErr.message);
      incident.aiAnalysis = {
        ...(incident.aiAnalysis?.toObject ? incident.aiAnalysis.toObject() : incident.aiAnalysis || {}),
        status: "failed",
        analyzedAt: new Date(),
      };
      await incident.save();
    }
  } catch (err) {
    console.error(`[AI-Verification] Error running background AI for incident ${incidentId}:`, err.message);
  }
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
      aiAnalysis: {
        status: "pending",
      },
      statusHistory: [
        {
          status: "reported",
          timestamp: new Date(),
          updatedBy: req.user._id,
          note: "Incident reported",
        },
      ],
    });

    // Send immediate response to client (sub-50ms)
    res.status(201).json({
      success: true,
      message: "Incident reported successfully",
      data: incident,
    });

    // Fire non-blocking AI verification in background
    setImmediate(() => {
      runBackgroundAiVerification(incident._id);
    });

    // Create activity log in background
    try {
      await ActivityLog.create({
        action: "incident_reported",
        targetType: "incident",
        targetId: incident._id,
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
      emitToJurisdiction(incident.state, incident.district, "incident-created", incident);
    } catch (sockErr) {
      console.error("Socket emission error on createIncident:", sockErr.message);
    }
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
    const makeRegex = (val) => new RegExp(`^${val.trim()}$`, "i");

    if (req.user.role === "admin" || req.user.authorityLevel === "central") {
      if (state) filter.state = makeRegex(state);
      if (district) filter.district = makeRegex(district);
    } else if (req.user.authorityLevel === "state_admin") {
      // Must only query their own state (case-insensitive)
      if (req.user.state) filter.state = makeRegex(req.user.state);
      // Allow optional filter inside their own state
      if (district) filter.district = makeRegex(district);
    } else if (req.user.authorityLevel === "district_admin") {
      // Must only query their own state and district (case-insensitive)
      if (req.user.state) filter.state = makeRegex(req.user.state);
      if (req.user.district) filter.district = makeRegex(req.user.district);
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

// Major Indian district centroids for instant offline GPS district resolution
const REGIONAL_DISTRICT_CENTERS = [
  // Uttar Pradesh
  { district: "Prayagraj", state: "Uttar Pradesh", coords: [81.8463, 25.4358] },
  { district: "Varanasi", state: "Uttar Pradesh", coords: [82.9739, 25.3176] },
  { district: "Lucknow", state: "Uttar Pradesh", coords: [80.9462, 26.8467] },
  { district: "Kanpur", state: "Uttar Pradesh", coords: [80.3319, 26.4499] },
  { district: "Ayodhya", state: "Uttar Pradesh", coords: [82.1998, 26.7922] },
  { district: "Gorakhpur", state: "Uttar Pradesh", coords: [83.3732, 26.7606] },
  { district: "Agra", state: "Uttar Pradesh", coords: [78.0081, 27.1767] },
  { district: "Noida", state: "Uttar Pradesh", coords: [77.3910, 28.5355] },
  { district: "Ghaziabad", state: "Uttar Pradesh", coords: [77.4538, 28.6692] },
  { district: "Meerut", state: "Uttar Pradesh", coords: [77.7064, 28.9845] },
  { district: "Bareilly", state: "Uttar Pradesh", coords: [79.4304, 28.3670] },
  { district: "Aligarh", state: "Uttar Pradesh", coords: [78.0880, 27.8974] },
  { district: "Jhansi", state: "Uttar Pradesh", coords: [78.5788, 25.4484] },

  // Maharashtra
  { district: "Pune", state: "Maharashtra", coords: [73.8567, 18.5204] },
  { district: "Mumbai", state: "Maharashtra", coords: [72.8777, 19.0760] },
  { district: "Thane", state: "Maharashtra", coords: [72.9781, 19.2183] },
  { district: "Nashik", state: "Maharashtra", coords: [73.7898, 19.9975] },
  { district: "Nagpur", state: "Maharashtra", coords: [79.0882, 21.1458] },
  { district: "Kolhapur", state: "Maharashtra", coords: [74.2433, 16.7050] },
  { district: "Solapur", state: "Maharashtra", coords: [75.9064, 17.6599] },
  { district: "Satara", state: "Maharashtra", coords: [74.0183, 17.6805] },
  { district: "Sangli", state: "Maharashtra", coords: [74.5815, 16.8524] },
  { district: "Aurangabad", state: "Maharashtra", coords: [75.3433, 19.8762] },

  // Other Major State Capitals & Hubs
  { district: "New Delhi", state: "Delhi", coords: [77.2090, 28.6139] },
  { district: "Bengaluru", state: "Karnataka", coords: [77.5946, 12.9716] },
  { district: "Hyderabad", state: "Telangana", coords: [78.4867, 17.3850] },
  { district: "Chennai", state: "Tamil Nadu", coords: [80.2707, 13.0827] },
  { district: "Kolkata", state: "West Bengal", coords: [88.3639, 22.5726] },
  { district: "Patna", state: "Bihar", coords: [85.1376, 25.5941] },
  { district: "Bhopal", state: "Madhya Pradesh", coords: [77.4126, 23.2599] },
  { district: "Indore", state: "Madhya Pradesh", coords: [75.8577, 22.7196] },
  { district: "Jaipur", state: "Rajasthan", coords: [75.7873, 26.9124] },
  { district: "Ahmedabad", state: "Gujarat", coords: [72.5714, 23.0225] },
  { district: "Ranchi", state: "Jharkhand", coords: [85.3096, 23.3441] },
  { district: "Dehradun", state: "Uttarakhand", coords: [78.0322, 30.3165] },
  { district: "Chandigarh", state: "Punjab", coords: [76.7794, 30.7333] },
];

function calculateHaversineDistanceKm(c1, c2) {
  if (!c1 || !c2 || c1.length < 2 || c2.length < 2) return Infinity;
  const [lon1, lat1] = c1;
  const [lon2, lat2] = c2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function resolveDistrictAndState(coords) {
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;

  // 1. Live reverse geocoding via Nominatim with fast timeout (1800ms)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ResQX-Disaster-App/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const state = addr.state || null;
        // Priority: state_district -> county -> city -> town -> district
        const districtRaw =
          addr.state_district ||
          addr.county ||
          addr.city ||
          addr.town ||
          addr.district ||
          null;

        if (state && districtRaw) {
          const cleanDistrict = districtRaw.replace(/ District/i, "").trim();
          return {
            district: cleanDistrict,
            state: state.trim(),
            address: data.display_name || null,
            suburb: addr.suburb || addr.neighbourhood || null,
            source: "nominatim_reverse_geocoding",
          };
        }
      }
    }
  } catch (geoErr) {
    // Non-fatal, continue to offline centroids
  }

  // 2. Offline fallback using nearest regional district centroid
  let closest = null;
  let minDist = Infinity;
  for (const center of REGIONAL_DISTRICT_CENTERS) {
    const dist = calculateHaversineDistanceKm(coords, center.coords);
    if (dist < minDist) {
      minDist = dist;
      closest = { ...center, distKm: Math.round(dist * 10) / 10, source: "offline_centroid" };
    }
  }
  return closest;
}

// POST /api/incidents/sos
const createSOS = async (req, res) => {
  try {
    const { coordinates, type, state, district } = req.body;

    let coords = req.validatedCoordinates;
    if (!coords) {
      if (!coordinates) {
        return res.status(400).json({
          success: false,
          message: "coordinates are required for SOS [longitude, latitude]",
        });
      }
      const coordResult = parseAndValidateCoordinates(coordinates);
      if (!coordResult.valid) {
        return res.status(400).json({
          success: false,
          message: coordResult.error,
        });
      }
      coords = coordResult.coordinates;
    }

    // 1. Duplicate & Spam Detection: Check active SOS within 10 minutes and ~200 meters
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    // 200 meters in radians (Earth radius ≈ 6,378,100 meters)
    const radiusInRadians = 200 / 6378100;

    let existingSOS = null;

    // Check A: Geospatial proximity within 200m using $geoWithin $centerSphere (never throws in $or)
    try {
      existingSOS = await Incident.findOne({
        isSOS: true,
        status: { $in: ["reported", "verified", "assigned", "in_progress"] },
        createdAt: { $gte: tenMinutesAgo },
        location: {
          $geoWithin: {
            $centerSphere: [coords, radiusInRadians],
          },
        },
      });
    } catch (geoErr) {
      console.warn("Geospatial proximity query warning:", geoErr.message);
    }

    // Check B: Fallback to same user or guest session ID within 10 min if GPS jittered
    if (!existingSOS && (req.user || req.guestSessionId)) {
      try {
        existingSOS = await Incident.findOne({
          isSOS: true,
          status: { $in: ["reported", "verified", "assigned", "in_progress"] },
          createdAt: { $gte: tenMinutesAgo },
          $or: [
            ...(req.user ? [{ reportedBy: req.user._id }] : []),
            ...(req.guestSessionId ? [{ guestSessionId: req.guestSessionId }] : []),
          ],
        });
      } catch (idErr) {
        console.warn("ID-based SOS lookup warning:", idErr.message);
      }
    }

    if (existingSOS) {
      existingSOS.reportCount = (existingSOS.reportCount || 1) + 1;
      existingSOS.statusHistory.push({
        status: existingSOS.status,
        timestamp: new Date(),
        updatedBy: req.user ? req.user._id : null,
        note: `Additional SOS report received from vicinity (Total Reports: ${existingSOS.reportCount})`,
      });
      await existingSOS.save();

      // Emit realtime update so authority dashboard shows updated count live
      try {
        emitToJurisdiction(existingSOS.state, existingSOS.district, "incident-updated", existingSOS);
        emitToJurisdiction(existingSOS.state, existingSOS.district, "sos-alert", existingSOS);
        try {
          const ioInstance = getIO();
          ioInstance.emit("incident-updated", existingSOS);
          ioInstance.emit("sos-alert", existingSOS);
        } catch (e) {}
      } catch (sockErr) {
        console.warn("Socket emission error on duplicate SOS:", sockErr.message);
      }

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: `Existing SOS alert in your immediate vicinity updated. Total reports: ${existingSOS.reportCount}. Responders are notified.`,
        data: existingSOS,
        guestSessionId: req.guestSessionId || null,
      });
    }

    // 2. Create Fresh SOS Incident with Auto-resolved Jurisdiction and Real Address
    const resolved = await resolveDistrictAndState(coords);
    const userState = state && state !== "Unknown" ? state : (resolved?.state || req.user?.state || "Uttar Pradesh");
    const userDistrict = district && district !== "Unknown" ? district : (resolved?.district || req.user?.district || "Prayagraj");

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    const formattedCoords = `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
    const autoAddress =
      req.body.address ||
      resolved?.address ||
      `GPS Fix: ${formattedCoords} (${userDistrict}, ${userState})`;
    const sosTitle = `🚨 SOS: Emergency Beacon (${userDistrict} - ${formattedCoords})`;

    const incident = await Incident.create({
      title: sosTitle,
      description: req.body.description || `Emergency SOS triggered by citizen. Exact GPS Coordinates: [${lat.toFixed(6)}, ${lng.toFixed(6)}]. Location: ${autoAddress}. Immediate tactical response required.`,
      type: type || "other",
      severity: "critical", // SOS is always critical priority
      status: "reported", // SOS stays reported until authority verification
      location: { type: "Point", coordinates: coords },
      address: autoAddress,
      state: userState,
      district: userDistrict,
      isSOS: true,
      reportCount: 1,
      reportedBy: req.user ? req.user._id : null,
      guestSessionId: req.guestSessionId || null,
      priorityScore: 95,
      aiAnalysis: {
        status: "pending",
      },
      statusHistory: [
        {
          status: "reported",
          timestamp: new Date(),
          updatedBy: req.user ? req.user._id : null,
          note: req.user
            ? "SOS Alert triggered by citizen"
            : `SOS Alert triggered by guest (${req.guestSessionId})`,
        },
      ],
    });

    // Send immediate response to client (sub-50ms)
    res.status(201).json({
      success: true,
      message: "SOS alert sent successfully. Help is on the way.",
      data: incident,
      guestSessionId: req.guestSessionId || null,
    });

    // Fire non-blocking AI verification in background
    setImmediate(() => {
      runBackgroundAiVerification(incident._id);
    });

    // Create activity log in background
    try {
      await ActivityLog.create({
        action: "sos_triggered",
        targetType: "incident",
        targetId: incident._id,
        description: `Emergency SOS triggered at [${coords.join(", ")}]`,
        performedBy: req.user ? req.user._id : null,
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
      emitToJurisdiction(incident.state, incident.district, "incident-created", incident);
      emitToJurisdiction(incident.state, incident.district, "incident-updated", incident);
      try {
        const ioInstance = getIO();
        ioInstance.emit("sos-alert", incident);
        ioInstance.emit("new-incident", incident);
        ioInstance.emit("incident-created", incident);
        ioInstance.emit("incident-updated", incident);
      } catch (e) {}
    } catch (sockErr) {
      console.error("Socket emission error on createSOS:", sockErr.message);
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to send SOS alert",
      error: err.message,
    });
  }
};

// Public: limited fields, no auth required, for citizen-facing live map
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

// POST /api/incidents/:id/ai-retry (Authority only re-analysis)
const retryIncidentAI = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid incident ID format" });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    if (!checkJurisdictionAccess(req.user, incident)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have jurisdiction over this incident",
      });
    }

    incident.aiAnalysis = {
      ...(incident.aiAnalysis?.toObject ? incident.aiAnalysis.toObject() : incident.aiAnalysis || {}),
      status: "pending",
    };
    await incident.save();

    setImmediate(() => {
      runBackgroundAiVerification(incident._id);
    });

    return res.status(200).json({
      success: true,
      message: "AI triage re-analysis initiated in background",
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to initiate AI re-analysis",
      error: err.message,
    });
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
  retryIncidentAI,
};
