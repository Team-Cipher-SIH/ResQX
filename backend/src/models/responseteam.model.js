const mongoose = require("mongoose");

const responseTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["medical", "fire", "rescue", "flood", "general", "police", "hazmat"],
      default: "general",
    },
    state: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    capabilities: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

responseTeamSchema.index({ currentLocation: "2dsphere" });
responseTeamSchema.index({ state: 1, district: 1, status: 1 });

module.exports = mongoose.model("ResponseTeam", responseTeamSchema);
