const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "incident_reported",
        "incident_verified",
        "incident_assigned",
        "incident_status_updated",
        "incident_resolved",
        "incident_closed",
        "dispatch_created",
        "dispatch_accepted",
        "dispatch_en_route",
        "dispatch_on_site",
        "dispatch_in_progress",
        "dispatch_completed",
        "dispatch_rejected",
        "dispatch_cancelled",
        "team_created",
        "team_updated",
        "team_status_changed",
        "alert_created",
        "alert_deactivated",
        "responder_status_changed",
        "sos_triggered",
        "shelter_created",
        "shelter_updated",
        "shelter_deactivated",
        "shelter_activated",
        "supply_created",
        "supply_stock_updated",
        "supply_updated",
        "supply_deactivated",
        "supply_activated",
      ],
    },
    description: { type: String, required: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
    },
    dispatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispatch",
      default: null,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResponseTeam",
      default: null,
    },
    state: { type: String, default: null },
    district: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ state: 1, district: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
