const mongoose = require("mongoose");

const helpPostSchema = new mongoose.Schema(
  {
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["offer", "request"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["food", "shelter", "medical", "transport", "clothing", "other"],
      default: "other",
    },
    state: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "fulfilled"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpPost", helpPostSchema);