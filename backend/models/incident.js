
const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["flood", "fire", "earthquake", "landslide", "cyclone", "other"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["reported", "verified", "assigned", "in_progress", "resolved", "closed"],
      default: "reported",
    },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },

    mediaUrls: [{ type: String }],
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    priorityScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

incidentSchema.index({ location: "2dsphere" });
incidentSchema.index({ status: 1, priorityScore: -1 });

module.exports = mongoose.model("Incident", incidentSchema);
