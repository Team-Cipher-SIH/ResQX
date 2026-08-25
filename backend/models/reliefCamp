const mongoose = require("mongoose");

const reliefCampSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
    },

    // Simple low/adequate/surplus enums — easy to render as progress bars
    // on the dashboard without extra frontend logic.
    supplies: {
      food: { type: String, enum: ["low", "adequate", "surplus"], default: "adequate" },
      water: { type: String, enum: ["low", "adequate", "surplus"], default: "adequate" },
      medical: { type: String, enum: ["low", "adequate", "surplus"], default: "adequate" },
      blankets: { type: String, enum: ["low", "adequate", "surplus"], default: "adequate" },
    },

    contactPerson: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },

    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // TODO: wire to req.user.id once auth is ready
    },

    status: {
      type: String,
      enum: ["active", "full", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

reliefCampSchema.index({ location: "2dsphere" });
reliefCampSchema.index({ state: 1, district: 1 });

module.exports = mongoose.model("ReliefCamp", reliefCampSchema);