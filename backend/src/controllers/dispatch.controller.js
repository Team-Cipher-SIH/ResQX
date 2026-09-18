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

module.exports = {
  createDispatch,
  getDispatches,
  getDispatchById,
  updateDispatchStatus,
  getActiveDispatches,
};
