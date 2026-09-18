const ResponseTeam = require("../models/responseteam.model");
const User = require("../models/user.model");
const Dispatch = require("../models/dispatch.model");
const ActivityLog = require("../models/activitylog.model");
const { validateObjectId, checkJurisdictionAccess } = require("../middleware/jurisdiction.middleware");
const { emitToJurisdiction } = require("../config/socket");

// Helper to validate team members & leader jurisdiction and role
const validateTeamResponders = async (members, leader, targetState, targetDistrict) => {
  if (leader) {
    if (!validateObjectId(leader)) {
      return { valid: false, error: "Invalid leader user ID" };
    }
    const leaderUser = await User.findById(leader);
    if (!leaderUser) {
      return { valid: false, error: "Leader user not found" };
    }
    if (leaderUser.role !== "authority" || leaderUser.authorityLevel !== "field_responder") {
      return { valid: false, error: `Leader "${leaderUser.name}" must have authorityLevel "field_responder"` };
    }
    if (leaderUser.state !== targetState || leaderUser.district !== targetDistrict) {
      return {
        valid: false,
        error: `Leader "${leaderUser.name}" belongs to ${leaderUser.district}, ${leaderUser.state} and cannot lead a team in ${targetDistrict}, ${targetState}`,
      };
    }
  }

  if (members && Array.isArray(members) && members.length > 0) {
    for (const memberId of members) {
      if (!validateObjectId(memberId)) {
        return { valid: false, error: `Invalid member ID: ${memberId}` };
      }
    }

    const memberUsers = await User.find({ _id: { $in: members } });
    if (memberUsers.length !== members.length) {
      return { valid: false, error: "One or more team member users were not found" };
    }

    for (const member of memberUsers) {
      if (member.role !== "authority" || member.authorityLevel !== "field_responder") {
        return {
          valid: false,
          error: `Member "${member.name}" (${member._id}) must have authorityLevel "field_responder"`,
        };
      }
      if (member.state !== targetState || member.district !== targetDistrict) {
        return {
          valid: false,
          error: `Member "${member.name}" belongs to ${member.district}, ${member.state} and cannot be added to a team in ${targetDistrict}, ${targetState}`,
        };
      }
    }
  }

  return { valid: true };
};

// Create a new response team
const createTeam = async (req, res) => {
  try {
    let { name, type, state, district, capabilities, leader, members, currentLocation, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Team name is required." });
    }

    // Force jurisdiction state/district if user has restricted authorityLevel
    if (req.user.authorityLevel === "state_admin") {
      state = req.user.state;
    } else if (req.user.authorityLevel === "district_admin") {
      state = req.user.state;
      district = req.user.district;
    }

    if (!state || !district) {
      return res.status(400).json({ success: false, message: "State and district are required." });
    }

    const validTypes = ["medical", "fire", "rescue", "flood", "general", "police", "hazmat"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid team type. Allowed: ${validTypes.join(", ")}` });
    }

    const validStatuses = ["available", "busy", "offline"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${validStatuses.join(", ")}` });
    }

    // Validate members & leader match the team's state and district
    const validationResult = await validateTeamResponders(members, leader, state, district);
    if (!validationResult.valid) {
      return res.status(400).json({ success: false, message: validationResult.error });
    }

    const newTeam = await ResponseTeam.create({
      name: name.trim(),
      type: type || "general",
      state: state.trim(),
      district: district.trim(),
      capabilities: capabilities || [],
      leader: leader || null,
      members: members || [],
      status: status || "available",
      currentLocation: currentLocation || { type: "Point", coordinates: [0, 0] },
      createdBy: req.user._id,
    });

    // Log Activity
    try {
      await ActivityLog.create({
        action: "team_created",
        description: `Response team created: ${newTeam.name} (${newTeam.type}) in ${newTeam.district}, ${newTeam.state}`,
        performedBy: req.user._id,
        team: newTeam._id,
        state: newTeam.state,
        district: newTeam.district,
      });
    } catch (logErr) {
      console.error("ActivityLog error on createTeam:", logErr.message);
    }

    // Realtime notification
    try {
      emitToJurisdiction(newTeam.state, newTeam.district, "team-updated", newTeam);
    } catch (sockErr) {
      console.error("Socket error on createTeam:", sockErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Response team created successfully.",
      data: newTeam,
    });
  } catch (error) {
    console.error("Error in createTeam:", error);
    return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// List teams with query filters
const getTeams = async (req, res) => {
  try {
    const { state, district, status, type } = req.query;
    const query = {};

    if (req.user.role === "admin" || req.user.authorityLevel === "central") {
      if (state) query.state = state;
      if (district) query.district = district;
    } else if (req.user.authorityLevel === "state_admin") {
      query.state = req.user.state;
      if (district) query.district = district;
    } else if (req.user.authorityLevel === "district_admin") {
      query.state = req.user.state;
      query.district = req.user.district;
    } else if (req.user.authorityLevel === "field_responder") {
      query.$or = [{ members: req.user._id }, { leader: req.user._id }];
    } else if (req.jurisdictionFilter) {
      Object.assign(query, req.jurisdictionFilter);
    }

    if (status) query.status = status;
    if (type) query.type = type;

    const teams = await ResponseTeam.find(query)
      .populate("leader", "name email phone role authorityLevel state district")
      .populate("members", "name email phone role authorityLevel state district")
      .sort({ status: 1, name: 1 });

    return res.status(200).json({
      success: true,
      count: teams.length,
      message: "Teams fetched successfully.",
      data: teams,
    });
  } catch (error) {
    console.error("Error in getTeams:", error);
    return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// Single team detail
const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid team ID" });
    }

    const team = await ResponseTeam.findById(id)
      .populate("leader", "name email phone role authorityLevel state district")
      .populate("members", "name email phone role authorityLevel state district")
      .populate("createdBy", "name email");

    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found." });
    }

    if (!checkJurisdictionAccess(req.user, team)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to view this response team",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Team fetched successfully.",
      data: team,
    });
  } catch (error) {
    console.error("Error in getTeamById:", error);
    return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// Update team fields
const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid team ID" });
    }

    const team = await ResponseTeam.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found." });
    }

    if (!checkJurisdictionAccess(req.user, team)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to modify this response team",
      });
    }

    const { name, type, capabilities, leader, members, currentLocation, status } = req.body;

    // Validate responders if leader or members are modified
    const targetLeader = leader !== undefined ? leader : team.leader;
    const targetMembers = members !== undefined ? members : team.members;
    const validationResult = await validateTeamResponders(targetMembers, targetLeader, team.state, team.district);
    if (!validationResult.valid) {
      return res.status(400).json({ success: false, message: validationResult.error });
    }

    if (name !== undefined) team.name = name.trim();
    if (type !== undefined) {
      const validTypes = ["medical", "fire", "rescue", "flood", "general", "police", "hazmat"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: `Invalid type. Allowed: ${validTypes.join(", ")}` });
      }
      team.type = type;
    }
    if (capabilities !== undefined) team.capabilities = capabilities;
    if (leader !== undefined) team.leader = leader;
    if (members !== undefined) team.members = members;
    if (currentLocation !== undefined) team.currentLocation = currentLocation;
    if (status !== undefined) {
      const validStatuses = ["available", "busy", "offline"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${validStatuses.join(", ")}` });
      }
      team.status = status;
    }

    await team.save();

    // Log Activity
    try {
      await ActivityLog.create({
        action: "team_updated",
        description: `Response team updated: ${team.name}`,
        performedBy: req.user._id,
        team: team._id,
        state: team.state,
        district: team.district,
      });
    } catch (logErr) {
      console.error("ActivityLog error on updateTeam:", logErr.message);
    }

    try {
      emitToJurisdiction(team.state, team.district, "team-updated", team);
    } catch (sockErr) {
      console.error("Socket error on updateTeam:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Team updated successfully.",
      data: team,
    });
  } catch (error) {
    console.error("Error in updateTeam:", error);
    return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// Update team availability
const updateTeamAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid team ID" });
    }

    if (!["available", "busy", "offline"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value. Must be 'available', 'busy', or 'offline'." });
    }

    const team = await ResponseTeam.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found." });
    }

    if (!checkJurisdictionAccess(req.user, team)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to update this response team",
      });
    }

    // If changing to available, ensure team is not engaged in an active dispatch
    if (status === "available") {
      const activeDispatch = await Dispatch.findOne({
        team: id,
        status: { $in: ["pending", "accepted", "en_route", "on_site", "in_progress"] },
      });
      if (activeDispatch) {
        return res.status(400).json({
          success: false,
          message: `Cannot set team to available: team is currently engaged in active dispatch ${activeDispatch._id} with status "${activeDispatch.status}"`,
        });
      }
    }

    team.status = status;
    await team.save();

    // Log Activity
    try {
      await ActivityLog.create({
        action: "team_status_changed",
        description: `Team availability updated to "${status}" for ${team.name}`,
        performedBy: req.user._id,
        team: team._id,
        state: team.state,
        district: team.district,
      });
    } catch (logErr) {
      console.error("ActivityLog error on updateTeamAvailability:", logErr.message);
    }

    try {
      emitToJurisdiction(team.state, team.district, "team-updated", team);
    } catch (sockErr) {
      console.error("Socket error on updateTeamAvailability:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Team availability updated successfully.",
      data: team,
    });
  } catch (error) {
    console.error("Error in updateTeamAvailability:", error);
    return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// Delete team
const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid team ID" });
    }

    const team = await ResponseTeam.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found." });
    }

    if (!checkJurisdictionAccess(req.user, team)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to delete this response team",
      });
    }

    // Check if team has active dispatches before deleting
    const activeDispatch = await Dispatch.findOne({
      team: id,
      status: { $in: ["pending", "accepted", "en_route", "on_site", "in_progress"] },
    });
    if (activeDispatch) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete team with active ongoing dispatches",
      });
    }

    await ResponseTeam.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Team deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Error in deleteTeam:", error);
    return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  updateTeamAvailability,
  deleteTeam,
};
