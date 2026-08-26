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
      enum: ["state", "district", "field_responder", "department"],
      default: null,
    },
    jurisdiction: {
      type: String,
      default: null, // state ka naam ya district ka naam (state/district authorityLevel ke liye)
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null, // sirf department authorityLevel ke liye
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
