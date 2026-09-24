const ActivityLog = require("../models/activitylog.model");
const { validateObjectId } = require("../middleware/jurisdiction.middleware");

// GET /api/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const {
      targetType,
      targetId,
      action,
      performedBy,
      state,
      district,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    // 1. Jurisdiction Enforcement
    if (req.user.role === "admin" || req.user.authorityLevel === "central") {
      if (state) filter.state = state;
      if (district) filter.district = district;
    } else if (req.user.authorityLevel === "state_admin") {
      filter.state = req.user.state;
      if (district) filter.district = district;
    } else if (req.user.authorityLevel === "district_admin") {
      filter.state = req.user.state;
      filter.district = req.user.district;
    } else if (req.jurisdictionFilter) {
      Object.assign(filter, req.jurisdictionFilter);
    }

    // 2. Resource Filters
    if (targetType) {
      filter.targetType = targetType.toLowerCase().trim();
    }
    if (targetId) {
      filter.targetId = targetId;
    }
    if (action) {
      filter.action = action.trim();
    }
    if (performedBy && validateObjectId(performedBy)) {
      filter.performedBy = performedBy;
    }

    // 3. Date Range Filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, totalCount] = await Promise.all([
      ActivityLog.find(filter)
        .populate("performedBy", "name email role authorityLevel state district")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: logs.length,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: logs,
    });
  } catch (error) {
    console.error("Error in getAuditLogs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

module.exports = {
  getAuditLogs,
};
