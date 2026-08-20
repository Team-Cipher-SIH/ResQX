const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["warning", "watch", "advisory"],
      default: "advisory",
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    // Which areas this alert applies to — decides what shows on the public
    // ticker/map for a given viewer. Empty arrays = applies nationwide.
    affectedStates: [{ type: String }],
    affectedDistricts: [{ type: String }],

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // TODO: make required once auth is wired in
    },

    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

alertSchema.index({ isActive: 1, severity: 1 });
alertSchema.index({ affectedDistricts: 1 });

module.exports = mongoose.model("Alert", alertSchema);