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
      enum: [
        "reported",
        "verified",
        "assigned",
        "in_progress",
        "resolved",
        "closed",
      ],
      default: "reported",
    },
    isSOS: {
      type: Boolean,
      default: false,
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
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedDepartment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResponseTeam",
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        note: { type: String, default: "" },
      },
    ],
    priorityScore: { type: Number, default: 0 },
    aiAnalysis: {
      isEmergency: { type: Boolean, default: true },
      emergencyRelevanceReason: { type: String, default: null },
      classifiedType: { type: String, default: null },
      aiSeverity: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default: "MEDIUM",
      },
      aiPriority: {
        type: String,
        enum: ["P1", "P2", "P3", "P4"],
        default: "P2",
      },
      recommendedTeam: { type: String, default: null },
      aiSummary: { type: String, default: null },
      authenticity: {
        type: String,
        enum: ["LIKELY_GENUINE", "SUSPICIOUS_OR_PRANK", "NEEDS_PHYSICAL_VERIFICATION"],
        default: null,
      },
      credibilityScore: { type: Number, default: null },
      confidence: { type: Number, default: null },
      reasoning: { type: String, default: null },
      recommendedAction: { type: String, default: null },
      suggestedUnit: { type: String, default: null },
      analyzedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

incidentSchema.index({ location: "2dsphere" });
incidentSchema.index({ status: 1, priorityScore: -1 });

module.exports = mongoose.model("Incident", incidentSchema);
