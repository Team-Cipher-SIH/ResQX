const mongoose = require("mongoose");

const dispatchSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResponseTeam",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "en_route",
        "on_site",
        "in_progress",
        "completed",
        "rejected",
        "cancelled",
      ],
      default: "pending",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        note: { type: String, default: "" },
      },
    ],
    notes: { type: String, default: "" },
    state: { type: String, required: true },
    district: { type: String, required: true },
    dispatchedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

dispatchSchema.index({ status: 1, state: 1, district: 1 });
dispatchSchema.index({ team: 1, status: 1 });
dispatchSchema.index({ incident: 1 });

module.exports = mongoose.model("Dispatch", dispatchSchema);
