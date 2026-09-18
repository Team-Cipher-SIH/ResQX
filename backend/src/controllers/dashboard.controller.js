const Incident = require("../models/incident.model");
const ResponseTeam = require("../models/responseteam.model");
const Dispatch = require("../models/dispatch.model");
const ActivityLog = require("../models/activitylog.model");
const User = require("../models/user.model");

// Helper to construct secure jurisdiction filter for any model
const getJurisdictionFilter = (user, baseFilter = {}) => {
  const filter = { ...baseFilter };

  if (user.role === "admin" || user.authorityLevel === "central") {
    return filter;
  }

  if (user.authorityLevel === "state_admin") {
    filter.state = user.state;
    return filter;
  }

  if (user.authorityLevel === "district_admin") {
    filter.state = user.state;
    filter.district = user.district;
    return filter;
  }

  if (user.authorityLevel === "field_responder") {
    filter.$or = [{ assignedTo: user._id }, { state: user.state, district: user.district }];
    return filter;
  }

  if (user.role === "authority") {
    if (user.state) filter.state = user.state;
    if (user.district) filter.district = user.district;
  }

  return filter;
};

exports.getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const baseFilter = {};

    if (user.role === "admin" || user.authorityLevel === "central") {
      // no jurisdiction constraint
    } else if (user.authorityLevel === "state_admin") {
      baseFilter.state = user.state;
    } else if (user.authorityLevel === "district_admin") {
      baseFilter.state = user.state;
      baseFilter.district = user.district;
    } else if (user.authorityLevel === "field_responder") {
      baseFilter.assignedTo = user._id;
    } else if (req.jurisdictionFilter) {
      Object.assign(baseFilter, req.jurisdictionFilter);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Incident metrics using actual schema fields & status values
    const [
      totalIncidents,
      activeIncidents,
      criticalIncidents,
      pendingVerification,
      verifiedIncidents,
      assignedIncidents,
      inProgressIncidents,
      sosIncidents,
      resolvedToday,
    ] = await Promise.all([
      Incident.countDocuments(baseFilter),
      Incident.countDocuments({
        ...baseFilter,
        status: { $in: ["reported", "verified", "assigned", "in_progress"] },
      }),
      Incident.countDocuments({ ...baseFilter, severity: "critical" }),
      Incident.countDocuments({ ...baseFilter, status: "reported" }),
      Incident.countDocuments({ ...baseFilter, status: "verified" }),
      Incident.countDocuments({ ...baseFilter, status: "assigned" }),
      Incident.countDocuments({ ...baseFilter, status: "in_progress" }),
      Incident.countDocuments({ ...baseFilter, isSOS: true }),
      Incident.countDocuments({
        ...baseFilter,
        status: "resolved",
        updatedAt: { $gte: startOfToday },
      }),
    ]);

    // 2. Response teams metrics (filtering by team's state/district)
    const teamFilter = {};
    if (user.role === "admin" || user.authorityLevel === "central") {
      // all
    } else if (user.authorityLevel === "state_admin") {
      teamFilter.state = user.state;
    } else if (user.authorityLevel === "district_admin") {
      teamFilter.state = user.state;
      teamFilter.district = user.district;
    } else if (user.authorityLevel === "field_responder") {
      teamFilter.$or = [{ members: user._id }, { leader: user._id }];
    }

    const activeResponseTeams = await ResponseTeam.countDocuments({
      ...teamFilter,
      status: { $in: ["available", "busy"] },
    });

    // 3. Dispatches metrics using actual dispatch status values
    const dispatchFilter = {};
    if (user.role === "admin" || user.authorityLevel === "central") {
      // all
    } else if (user.authorityLevel === "state_admin") {
      dispatchFilter.state = user.state;
    } else if (user.authorityLevel === "district_admin") {
      dispatchFilter.state = user.state;
      dispatchFilter.district = user.district;
    } else if (user.authorityLevel === "field_responder") {
      const userTeams = await ResponseTeam.find({
        $or: [{ members: user._id }, { leader: user._id }],
      }).select("_id");
      dispatchFilter.team = { $in: userTeams.map((t) => t._id) };
    }

    const activeDispatches = await Dispatch.countDocuments({
      ...dispatchFilter,
      status: { $in: ["pending", "accepted", "en_route", "on_site", "in_progress"] },
    });

    return res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        activeIncidents,
        criticalIncidents,
        pendingVerification,
        dispatchedIncidents: activeDispatches,
        activeResponseTeams,
        resolvedToday,
        totalIncidents,
        inProgressIncidents,
        assignedIncidents,
        verifiedIncidents,
        sosIncidents,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    if (user.role === "admin" || user.authorityLevel === "central") {
      // all
    } else if (user.authorityLevel === "state_admin") {
      filter.state = user.state;
    } else if (user.authorityLevel === "district_admin") {
      filter.state = user.state;
      filter.district = user.district;
    } else if (user.authorityLevel === "field_responder") {
      filter.$or = [{ performedBy: user._id }, { state: user.state, district: user.district }];
    } else if (req.jurisdictionFilter) {
      if (req.jurisdictionFilter.state) filter.state = req.jurisdictionFilter.state;
      if (req.jurisdictionFilter.district) filter.district = req.jurisdictionFilter.district;
    }

    const activities = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("performedBy", "name email role authorityLevel")
      .populate("incident", "title severity status isSOS")
      .populate("team", "name type status")
      .populate("dispatch", "status");

    return res.status(200).json({
      success: true,
      message: "Recent activity fetched successfully",
      data: activities,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDistrictOverview = async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    if (user.role === "admin" || user.authorityLevel === "central") {
      // all
    } else if (user.authorityLevel === "state_admin") {
      filter.state = user.state;
    } else if (user.authorityLevel === "district_admin") {
      filter.state = user.state;
      filter.district = user.district;
    } else if (req.jurisdictionFilter) {
      Object.assign(filter, req.jurisdictionFilter);
    }

    // Aggregate incidents by state and district
    const incidentsAggregation = await Incident.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { state: "$state", district: "$district" },
          activeIncidents: {
            $sum: {
              $cond: [
                { $in: ["$status", ["reported", "verified", "assigned", "in_progress"]] },
                1,
                0,
              ],
            },
          },
          criticalIncidents: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
          },
          totalIncidents: { $sum: 1 },
        },
      },
    ]);

    const teamFilter = { ...filter };
    const teamsAggregation = await ResponseTeam.aggregate([
      { $match: teamFilter },
      {
        $group: {
          _id: { state: "$state", district: "$district" },
          totalTeams: { $sum: 1 },
          availableTeams: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
          },
        },
      },
    ]);

    const respondersFilter = {
      ...filter,
      role: "authority",
      authorityLevel: "field_responder",
      isAvailable: true,
    };

    const respondersAggregation = await User.aggregate([
      { $match: respondersFilter },
      {
        $group: {
          _id: { state: "$state", district: "$district" },
          respondersAvailable: { $sum: 1 },
        },
      },
    ]);

    const districtMap = new Map();

    const ensureDistrict = (state, district) => {
      const key = `${state}-${district}`;
      if (!districtMap.has(key)) {
        districtMap.set(key, {
          state,
          district,
          activeIncidents: 0,
          criticalIncidents: 0,
          totalIncidents: 0,
          respondersAvailable: 0,
          totalTeams: 0,
          availableTeams: 0,
        });
      }
      return districtMap.get(key);
    };

    incidentsAggregation.forEach((item) => {
      if (!item._id.state || !item._id.district) return;
      const entry = ensureDistrict(item._id.state, item._id.district);
      entry.activeIncidents = item.activeIncidents;
      entry.criticalIncidents = item.criticalIncidents;
      entry.totalIncidents = item.totalIncidents;
    });

    teamsAggregation.forEach((item) => {
      if (!item._id.state || !item._id.district) return;
      const entry = ensureDistrict(item._id.state, item._id.district);
      entry.totalTeams = item.totalTeams;
      entry.availableTeams = item.availableTeams;
    });

    respondersAggregation.forEach((item) => {
      if (!item._id.state || !item._id.district) return;
      const entry = ensureDistrict(item._id.state, item._id.district);
      entry.respondersAvailable = item.respondersAvailable;
    });

    return res.status(200).json({
      success: true,
      message: "District overview fetched successfully",
      data: Array.from(districtMap.values()),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
