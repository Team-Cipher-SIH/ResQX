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
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
