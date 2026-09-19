const Dispatch = require("../models/dispatch.model");
const Incident = require("../models/incident.model");
const ResponseTeam = require("../models/responseteam.model");
const ActivityLog = require("../models/activitylog.model");
const { validateObjectId, checkJurisdictionAccess } = require("../middleware/jurisdiction.middleware");
const { emitToJurisdiction, getIO } = require("../config/socket");

// Allowed status transitions state machine
const ALLOWED_TRANSITIONS = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["en_route", "cancelled"],
  en_route: ["on_site", "cancelled"],
  on_site: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

// Create Dispatch
const createDispatch = async (req, res) => {
  try {
    const { incidentId, teamId, notes } = req.body;

    if (!validateObjectId(incidentId) || !validateObjectId(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid incidentId or teamId format" });
    }

    // 1. Find incident
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // 2. Verify incident belongs to authenticated authority jurisdiction
    if (!checkJurisdictionAccess(req.user, incident)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have jurisdiction over this incident",
      });
    }

    // 3. Verify incident is dispatchable
    if (incident.status === "reported") {
      return res.status(400).json({
        success: false,
        message: `Incident must be verified before dispatching. Current status: "${incident.status}"`,
      });
    }
    if (["resolved", "closed"].includes(incident.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot dispatch an incident with status "${incident.status}"`,
      });
    }

    // 4. Find response team
    const team = await ResponseTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Response team not found" });
    }

    // 5. Verify team belongs to the incident's state and district
    if (team.state !== incident.state || team.district !== incident.district) {
      return res.status(400).json({
        success: false,
        message: `Jurisdiction mismatch: Team is in ${team.district}, ${team.state} but incident is in ${incident.district}, ${incident.state}`,
      });
    }

    // 6. Verify team is available
    if (team.status !== "available") {
      return res.status(400).json({
        success: false,
        message: `Team "${team.name}" is currently "${team.status}" and cannot accept new dispatches`,
      });
    }

    // 7. Prevent duplicate active dispatches on the same incident
    const activeDispatch = await Dispatch.findOne({
      incident: incidentId,
      status: { $in: ["pending", "accepted", "en_route", "on_site", "in_progress"] },
    });
    if (activeDispatch) {
      return res.status(400).json({
        success: false,
        message: `Incident already has an active dispatch (${activeDispatch._id}) with status "${activeDispatch.status}"`,
      });
    }

    // 8. Create dispatch record
    const dispatch = new Dispatch({
      incident: incidentId,
      team: teamId,
      assignedBy: req.user._id,
      notes: notes || "",
      state: incident.state,
      district: incident.district,
      status: "pending",
      dispatchedAt: new Date(),
      statusHistory: [
        {
          status: "pending",
          timestamp: new Date(),
          updatedBy: req.user._id,
          note: notes || "Dispatch created",
        },
      ],
    });

    await dispatch.save();

    // 9. Update incident assignment and status
    incident.status = "assigned";
    incident.assignedTeam = teamId;
    incident.statusHistory.push({
      status: "assigned",
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: `Dispatched response team: ${team.name}`,
    });
    await incident.save();

    // 10. Mark team as busy
    team.status = "busy";
    await team.save();

    // 11. Activity Log
    try {
      await ActivityLog.create({
        action: "dispatch_created",
        description: `Dispatch created for team ${team.name} to incident ${incident.title}`,
        performedBy: req.user._id,
        incident: incidentId,
        dispatch: dispatch._id,
        team: teamId,
        state: incident.state,
        district: incident.district,
      });
    } catch (logErr) {
      console.error("ActivityLog error on createDispatch:", logErr.message);
    }

    // 12. Emit realtime events
    try {
      emitToJurisdiction(incident.state, incident.district, "dispatch-created", dispatch);
      emitToJurisdiction(incident.state, incident.district, "incident-updated", incident);
      emitToJurisdiction(incident.state, incident.district, "team-updated", team);

      try {
        const io = getIO();
        io.to(`team:${teamId}`).emit("dispatch-assigned", dispatch);
        if (team.members && Array.isArray(team.members)) {
          team.members.forEach((m) => {
            io.to(`user:${m}`).emit("dispatch-assigned", dispatch);
          });
        }
        if (team.leader) {
          io.to(`user:${team.leader}`).emit("dispatch-assigned", dispatch);
        }
      } catch (e) {}
    } catch (sockErr) {
      console.error("Socket error on createDispatch:", sockErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Dispatch created successfully",
      data: dispatch,
    });
  } catch (error) {
    console.error("Error in createDispatch:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update Dispatch Status (Accept -> En Route -> On Site -> In Progress -> Completed / Rejected / Cancelled)
const updateDispatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid dispatch ID" });
    }

    const validStatuses = [
      "pending",
      "accepted",
      "en_route",
      "on_site",
      "in_progress",
      "completed",
      "rejected",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses: ${validStatuses.join(", ")}`,
      });
    }

    const dispatch = await Dispatch.findById(id).populate("team");
    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }

    // 1. Authorization: Field Responder vs Authority
    if (req.user.authorityLevel === "field_responder") {
      // Must be member or leader of assigned team
      const userIdStr = req.user._id.toString();
      const team = dispatch.team;
      const isMember = team && team.members && team.members.some((m) => m.toString() === userIdStr);
      const isLeader = team && team.leader && team.leader.toString() === userIdStr;

      if (!isMember && !isLeader) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not assigned to this response team dispatch",
        });
      }
    } else {
      // Authority check jurisdiction
      if (!checkJurisdictionAccess(req.user, dispatch)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have permission to modify this dispatch",
        });
      }
    }

    // 2. Validate state machine transition
    const currentStatus = dispatch.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (["completed", "rejected", "cancelled"].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update status of a "${currentStatus}" dispatch. It is in a terminal state.`,
      });
    }

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${currentStatus}" to "${status}". Allowed transitions: ${allowed.join(", ") || "none"}`,
      });
    }

    // 3. Update dispatch timestamps & status history
    dispatch.status = status;
    dispatch.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: note || `Status updated to ${status}`,
    });

    if (status === "accepted") dispatch.acceptedAt = new Date();
    if (status === "on_site") dispatch.arrivedAt = new Date();
    if (status === "completed") dispatch.completedAt = new Date();

    await dispatch.save();

    // 4. Incident & Team Synchronization
    let incident = await Incident.findById(dispatch.incident);
    let team = await ResponseTeam.findById(dispatch.team._id || dispatch.team);

    if (["accepted", "en_route", "on_site", "in_progress"].includes(status)) {
      if (incident && incident.status !== "in_progress") {
        incident.status = "in_progress";
        incident.statusHistory.push({
          status: "in_progress",
          timestamp: new Date(),
          updatedBy: req.user._id,
          note: `Dispatch status: ${status}`,
        });
        await incident.save();
      }
    } else if (status === "completed") {
      // Free team
      if (team) {
        team.status = "available";
        await team.save();
      }

      // Resolve incident
      if (incident) {
        incident.status = "resolved";
        incident.priorityScore = 0;
        incident.statusHistory.push({
          status: "resolved",
          timestamp: new Date(),
          updatedBy: req.user._id,
          note: "Incident resolved via completed dispatch",
        });
        await incident.save();
      }
    } else if (status === "rejected" || status === "cancelled") {
      // Free team
      if (team) {
        team.status = "available";
        await team.save();
      }

      // If no other active dispatch, revert incident to verified
      if (incident) {
        const otherActive = await Dispatch.findOne({
          incident: incident._id,
          _id: { $ne: dispatch._id },
          status: { $in: ["pending", "accepted", "en_route", "on_site", "in_progress"] },
        });

        if (!otherActive) {
          incident.status = "verified";
          incident.assignedTeam = null;
          incident.statusHistory.push({
            status: "verified",
            timestamp: new Date(),
            updatedBy: req.user._id,
            note: `Dispatch ${status}, returned to verified status`,
          });
          await incident.save();
        }
      }
    }

    // 5. Activity Logging
    try {
      const actionEnum = `dispatch_${status}`;
      await ActivityLog.create({
        action: actionEnum,
        description: note || `Dispatch status updated to "${status}" for incident ${incident ? incident.title : dispatch.incident}`,
        performedBy: req.user._id,
        incident: dispatch.incident,
        dispatch: dispatch._id,
        team: dispatch.team._id || dispatch.team,
        state: dispatch.state,
        district: dispatch.district,
      });

      if (status === "completed" && incident) {
        await ActivityLog.create({
          action: "incident_resolved",
          description: `Incident resolved: ${incident.title}`,
          performedBy: req.user._id,
          incident: incident._id,
          dispatch: dispatch._id,
          team: dispatch.team._id || dispatch.team,
          state: incident.state,
          district: incident.district,
        });
      }
    } catch (logErr) {
      console.error("ActivityLog error on updateDispatchStatus:", logErr.message);
    }

    // 6. Realtime Socket Events
    try {
      emitToJurisdiction(dispatch.state, dispatch.district, "dispatch-updated", dispatch);
      if (incident) {
        emitToJurisdiction(incident.state, incident.district, "incident-updated", incident);
      }
      if (team) {
        emitToJurisdiction(team.state, team.district, "team-updated", team);
      }

      try {
        const io = getIO();
        const teamIdStr = (dispatch.team._id || dispatch.team).toString();
        io.to(`team:${teamIdStr}`).emit("dispatch-updated", dispatch);
      } catch (e) {}
    } catch (sockErr) {
      console.error("Socket error on updateDispatchStatus:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Dispatch status updated to ${status}`,
      data: dispatch,
    });
  } catch (error) {
    console.error("Error in updateDispatchStatus:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get Dispatch By Id
const getDispatchById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid dispatch ID" });
    }

    const dispatch = await Dispatch.findById(id)
      .populate("incident")
      .populate({
        path: "team",
        populate: { path: "members leader", select: "name email phone role authorityLevel state district" },
      })
      .populate("assignedBy", "name email role authorityLevel")
      .populate("statusHistory.updatedBy", "name role authorityLevel");

    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }

    // Check jurisdiction authorization
    if (req.user.authorityLevel === "field_responder") {
      const userIdStr = req.user._id.toString();
      const team = dispatch.team;
      const isMember = team && team.members && team.members.some((m) => (m._id || m).toString() === userIdStr);
      const isLeader = team && team.leader && (team.leader._id || team.leader).toString() === userIdStr;

      if (!isMember && !isLeader) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have access to view this dispatch",
        });
      }
    } else {
      if (!checkJurisdictionAccess(req.user, dispatch)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have permission to view dispatches in this jurisdiction",
        });
      }
    }

    return res.status(200).json({ success: true, data: dispatch });
  } catch (error) {
    console.error("Error in getDispatchById:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get Dispatches with filters and pagination
const getDispatches = async (req, res) => {
  try {
    const { status, state, district, teamId, incidentId, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (req.user.role === "admin" || req.user.authorityLevel === "central") {
      if (state) filter.state = state;
      if (district) filter.district = district;
    } else if (req.user.authorityLevel === "state_admin") {
      filter.state = req.user.state;
      if (district) filter.district = district;
    } else if (req.user.authorityLevel === "district_admin") {
      filter.state = req.user.state;
      filter.district = req.user.district;
    } else if (req.user.authorityLevel === "field_responder") {
      const userTeams = await ResponseTeam.find({
        $or: [{ members: req.user._id }, { leader: req.user._id }],
      }).select("_id");
      filter.team = { $in: userTeams.map((t) => t._id) };
    } else if (req.jurisdictionFilter) {
      Object.assign(filter, req.jurisdictionFilter);
    }

    if (status) filter.status = status;
    if (teamId && validateObjectId(teamId)) filter.team = teamId;
    if (incidentId && validateObjectId(incidentId)) filter.incident = incidentId;

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const pageSize = Math.min(100, parseInt(limit));

    const [dispatches, totalCount] = await Promise.all([
      Dispatch.find(filter)
        .populate("incident", "title type severity status location address state district")
        .populate("team", "name type status members leader")
        .populate("assignedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Dispatch.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: dispatches.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / pageSize),
      data: dispatches,
    });
  } catch (error) {
    console.error("Error in getDispatches:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get Active Dispatches
const getActiveDispatches = async (req, res) => {
  try {
    const filter = {
      status: { $in: ["pending", "accepted", "en_route", "on_site", "in_progress"] },
    };

    if (req.user.role === "admin" || req.user.authorityLevel === "central") {
      // all active
    } else if (req.user.authorityLevel === "state_admin") {
      filter.state = req.user.state;
    } else if (req.user.authorityLevel === "district_admin") {
      filter.state = req.user.state;
      filter.district = req.user.district;
    } else if (req.user.authorityLevel === "field_responder") {
      const teams = await ResponseTeam.find({
        $or: [{ members: req.user._id }, { leader: req.user._id }],
      });
      const teamIds = teams.map((t) => t._id);
      filter.team = { $in: teamIds };
    } else if (req.jurisdictionFilter) {
      Object.assign(filter, req.jurisdictionFilter);
    }

    const dispatches = await Dispatch.find(filter)
      .populate("incident")
      .populate("team")
      .populate("assignedBy", "name email")
      .sort({ dispatchedAt: -1 });

    return res.status(200).json({ success: true, count: dispatches.length, data: dispatches });
  } catch (error) {
    console.error("Error in getActiveDispatches:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Haversine formula for distance fallback calculation in km
const calculateDistanceKm = (coord1, coord2) => {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return null;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Recommend candidate response teams for an incident (read-only)
const recommendTeamsForIncident = async (req, res) => {
  try {
    const { incidentId } = req.params;

    if (!validateObjectId(incidentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID format",
      });
    }

    // 1. Fetch Incident
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    // 2. Check Authority Jurisdiction Access
    if (!checkJurisdictionAccess(req.user, incident)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have jurisdiction over this incident",
      });
    }

    // 3. Check for active (non-terminal) dispatch
    const activeDispatch = await Dispatch.findOne({
      incident: incident._id,
      status: { $in: ["pending", "accepted", "en_route", "on_site", "in_progress"] },
    }).populate("team", "name type status");
    const hasActiveDispatch = !!activeDispatch;

    // 4. Prepare Disaster Capability Keywords
    const disasterType = (incident.type || "").toLowerCase().trim();
    const disasterKeywords = [
      disasterType,
      `${disasterType} rescue`,
      "rescue",
      "general",
      "emergency",
      "all",
    ];

    if (disasterType === "flood") {
      disasterKeywords.push("water rescue", "boat rescue", "flood rescue", "evacuation");
    } else if (disasterType === "fire") {
      disasterKeywords.push("firefighting", "smoke rescue", "hazmat", "burn rescue");
    } else if (disasterType === "earthquake") {
      disasterKeywords.push("collapse rescue", "rubble search", "structural rescue");
    } else if (disasterType === "landslide") {
      disasterKeywords.push("debris rescue", "earth excavation", "search and rescue");
    } else if (disasterType === "cyclone") {
      disasterKeywords.push("storm rescue", "evacuation", "flood rescue");
    }

    const capabilityRegexes = disasterKeywords.map((kw) => new RegExp(kw, "i"));

    const hasValidCoordinates =
      incident.location &&
      Array.isArray(incident.location.coordinates) &&
      incident.location.coordinates.length === 2 &&
      typeof incident.location.coordinates[0] === "number" &&
      typeof incident.location.coordinates[1] === "number";
    const incidentCoordinates = hasValidCoordinates ? incident.location.coordinates : null;

    // Helper to query teams with $geoNear and graceful Haversine fallback
    const runCandidateQuery = async (matchFilter) => {
      if (hasValidCoordinates) {
        try {
          return await ResponseTeam.aggregate([
            {
              $geoNear: {
                near: {
                  type: "Point",
                  coordinates: incidentCoordinates,
                },
                distanceField: "distanceMeters",
                spherical: true,
                key: "currentLocation",
                query: matchFilter,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "leader",
                foreignField: "_id",
                as: "leaderInfo",
              },
            },
            {
              $unwind: {
                path: "$leaderInfo",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]);
        } catch (geoErr) {
          console.warn("MongoDB $geoNear failed, falling back to Haversine sort:", geoErr.message);
        }
      }

      // Fallback find
      const teams = await ResponseTeam.find(matchFilter)
        .populate("leader", "name email phone role")
        .lean();

      return teams
        .map((team) => {
          const distKm =
            hasValidCoordinates && team.currentLocation?.coordinates
              ? calculateDistanceKm(incidentCoordinates, team.currentLocation.coordinates)
              : null;
          return {
            ...team,
            leaderInfo: team.leader,
            distanceMeters: distKm !== null ? Math.round(distKm * 1000) : null,
          };
        })
        .sort((a, b) => (a.distanceMeters ?? 999999999) - (b.distanceMeters ?? 999999999));
    };

    // 5. Query candidate teams in district first
    let searchScope = "district";
    const districtMatch = {
      state: incident.state,
      district: incident.district,
      status: "available",
      $or: [
        { capabilities: { $in: [disasterType, ...disasterKeywords, ...capabilityRegexes] } },
        { type: { $in: [disasterType, "rescue", "general"] } },
      ],
    };

    let candidateTeams = await runCandidateQuery(districtMatch);

    // 6. Edge case: If no teams found in district, widen search to state
    if (candidateTeams.length === 0) {
      const stateMatch = {
        state: incident.state,
        status: "available",
        $or: [
          { capabilities: { $in: [disasterType, ...disasterKeywords, ...capabilityRegexes] } },
          { type: { $in: [disasterType, "rescue", "general"] } },
        ],
      };
      candidateTeams = await runCandidateQuery(stateMatch);
      if (candidateTeams.length > 0) {
        searchScope = "state";
      }
    }

    // 7. Format Candidate Teams
    const formattedTeams = candidateTeams.map((team) => {
      const distMeters =
        team.distanceMeters !== undefined && team.distanceMeters !== null
          ? Math.round(team.distanceMeters)
          : null;
      const distKm = distMeters !== null ? parseFloat((distMeters / 1000).toFixed(2)) : null;

      const teamCaps = team.capabilities || [];
      const matchedCaps = teamCaps.filter(
        (cap) =>
          disasterKeywords.some((kw) => cap.toLowerCase().includes(kw)) ||
          cap.toLowerCase() === disasterType ||
          cap.toLowerCase() === "rescue" ||
          cap.toLowerCase() === "general"
      );

      if (
        matchedCaps.length === 0 &&
        (team.type === disasterType || team.type === "rescue" || team.type === "general")
      ) {
        matchedCaps.push(`Team Type: ${team.type}`);
      }

      return {
        _id: team._id,
        name: team.name,
        type: team.type,
        state: team.state,
        district: team.district,
        status: team.status,
        capabilities: team.capabilities || [],
        matchedCapabilities: matchedCaps,
        currentLocation: team.currentLocation,
        distanceMeters: distMeters,
        distanceKm: distKm,
        leader: team.leaderInfo
          ? {
              _id: team.leaderInfo._id,
              name: team.leaderInfo.name,
              phone: team.leaderInfo.phone,
              email: team.leaderInfo.email,
            }
          : team.leader && typeof team.leader === "object"
          ? {
              _id: team.leader._id,
              name: team.leader.name,
              phone: team.leader.phone,
              email: team.leader.email,
            }
          : null,
        membersCount: Array.isArray(team.members) ? team.members.length : 0,
        reasons: [], // Left for AI/ML teammate
        confidence: null, // Left for AI/ML teammate
      };
    });

    let message = `Found ${formattedTeams.length} candidate team(s) in ${
      searchScope === "state" ? `${incident.state} state` : `${incident.district} district`
    }`;
    if (formattedTeams.length === 0) {
      message = `No available response teams found matching capability "${disasterType}" in ${incident.district} or ${incident.state}`;
    }

    return res.status(200).json({
      success: true,
      incidentId: incident._id,
      disasterType: incident.type,
      jurisdiction: {
        state: incident.state,
        district: incident.district,
      },
      hasActiveDispatch,
      activeDispatch: activeDispatch
        ? {
            _id: activeDispatch._id,
            status: activeDispatch.status,
            team: activeDispatch.team,
            dispatchedAt: activeDispatch.dispatchedAt,
          }
        : null,
      searchScope,
      count: formattedTeams.length,
      data: formattedTeams,
      message,
    });
  } catch (error) {
    console.error("Error in recommendTeamsForIncident:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching team recommendations",
      error: error.message,
    });
  }
};

module.exports = {
  createDispatch,
  getDispatches,
  getDispatchById,
  updateDispatchStatus,
  getActiveDispatches,
  recommendTeamsForIncident,
};
