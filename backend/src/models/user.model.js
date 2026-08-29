const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["citizen", "authority", "admin"],
      default: "citizen",
    },
    authorityLevel: {
      type: String,
      enum: ["central", "state_admin", "district_admin", "field_responder", "department"],
      default: null,
    },
    state: { type: String, default: null, trim: true },
    district: { type: String, default: null, trim: true },
    department: { type: String, default: null, trim: true },
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  { timestamps: true },
);

userSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
