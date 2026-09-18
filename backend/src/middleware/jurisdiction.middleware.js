const mongoose = require("mongoose");

const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const attachJurisdictionFilter = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const { role, authorityLevel, state, district, jurisdictionId, _id } = req.user;

  if (role === "citizen") {
    return res.status(403).json({ success: false, message: "Forbidden: Citizens do not have authority jurisdiction" });
  }

  // Set the token/user-verified jurisdictionId
  req.jurisdictionId =
    jurisdictionId ||
    (state && district
      ? `${state}_${district}`.toUpperCase().replace(/\s+/g, "_")
      : state
        ? `${state}`.toUpperCase().replace(/\s+/g, "_")
        : null);

  const makeRegex = (val) => (val ? new RegExp(`^${val.trim()}$`, "i") : null);

  if (role === "admin" || authorityLevel === "central") {
    req.jurisdictionFilter = {};
  } else if (authorityLevel === "state_admin") {
    if (!state) {
      return res.status(403).json({ success: false, message: "Forbidden: State admin without assigned state" });
    }
    req.jurisdictionFilter = { state: makeRegex(state) };
  } else if (authorityLevel === "district_admin") {
    if (!state || !district) {
      return res.status(403).json({ success: false, message: "Forbidden: District admin without assigned state or district" });
    }
    req.jurisdictionFilter = { state: makeRegex(state), district: makeRegex(district) };
  } else if (authorityLevel === "field_responder") {
    req.jurisdictionFilter = { assignedTo: _id };
  } else if (authorityLevel === "department") {
    const filter = {};
    if (state) filter.state = makeRegex(state);
    if (district) filter.district = makeRegex(district);
    req.jurisdictionFilter = filter;
  } else if (role === "authority") {
    // Fallback for authority role without explicit authorityLevel
    if (state && district) {
      req.jurisdictionFilter = { state: makeRegex(state), district: makeRegex(district) };
    } else if (state) {
      req.jurisdictionFilter = { state: makeRegex(state) };
    } else {
      req.jurisdictionFilter = {};
    }
  } else {
    req.jurisdictionFilter = {};
  }

  next();
};

const authorizeLevel = (...allowedLevels) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (req.user.role === "admin") {
      return next();
    }
    if (!allowedLevels.includes(req.user.authorityLevel)) {
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient authority level" });
    }
    next();
  };
};

/**
 * Validates if the authenticated user has permission to access or modify a specific document.
 * @param {Object} user - The authenticated user (req.user)
 * @param {Object} doc - The document (incident, dispatch, team, etc.) containing state/district or assignedTo
 * @returns {boolean} - true if authorized, false otherwise
 */
const checkJurisdictionAccess = (user, doc) => {
  if (!user || !doc) return false;

  // Admins and Central Authority have full access
  if (user.role === "admin" || user.authorityLevel === "central") {
    return true;
  }

  // State Admin: must match state
  if (user.authorityLevel === "state_admin") {
    return !!user.state && doc.state === user.state;
  }

  // District Admin: must match both state and district
  if (user.authorityLevel === "district_admin") {
    return !!user.state && !!user.district && doc.state === user.state && doc.district === user.district;
  }

  // Field Responder: must be explicitly assigned to user or user's team
  if (user.authorityLevel === "field_responder") {
    const userIdStr = user._id.toString();

    // Directly assigned user
    if (doc.assignedTo && doc.assignedTo.toString() === userIdStr) {
      return true;
    }
    // Team member or leader
    if (doc.members && Array.isArray(doc.members)) {
      const isMember = doc.members.some((m) => (m._id ? m._id.toString() : m.toString()) === userIdStr);
      if (isMember) return true;
    }
    if (doc.leader && (doc.leader._id ? doc.leader._id.toString() : doc.leader.toString()) === userIdStr) {
      return true;
    }
    // For dispatch records where responder is member of assigned team
    if (doc.team && doc.team.members && Array.isArray(doc.team.members)) {
      const isTeamMember = doc.team.members.some((m) => (m._id ? m._id.toString() : m.toString()) === userIdStr);
      if (isTeamMember) return true;
    }

    return false;
  }

  // Department: within state/district
  if (user.authorityLevel === "department") {
    if (user.state && doc.state !== user.state) return false;
    if (user.district && doc.district !== user.district) return false;
    return true;
  }

  // Fallback for role === "authority" without explicit authorityLevel
  if (user.role === "authority") {
    if (user.state && doc.state !== user.state) return false;
    if (user.district && doc.district !== user.district) return false;
    return true;
  }

  return false;
};

module.exports = {
  validateObjectId,
  attachJurisdictionFilter,
  authorizeLevel,
  checkJurisdictionAccess,
};
