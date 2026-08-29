const mongoose = require("mongoose");

const SUPPLY_CATEGORIES = [
  "Water",
  "Food",
  "Medicine",
  "First Aid",
  "Blankets",
  "Tents",
  "Clothing",
  "Hygiene",
  "Baby Care",
  "Other",
];

const SUPPLY_STATUSES = ["AVAILABLE", "LOW", "CRITICAL", "OUT_OF_STOCK"];

const computeSupplyStatus = (quantity, minimumStock) => {
  const q = Number(quantity) || 0;
  const min = Number(minimumStock) || 0;

  if (q <= 0) return "OUT_OF_STOCK";
  if (q <= min) return "CRITICAL";
  if (q <= min * 2) return "LOW";
  return "AVAILABLE";
};

const supplySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supply item name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Supply category is required"],
      enum: SUPPLY_CATEGORIES,
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shelter",
      required: [true, "Associated shelter reference is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    unit: {
      type: String,
      required: [true, "Measurement unit is required (e.g. litres, packets, kits)"],
      trim: true,
    },
    minimumStock: {
      type: Number,
      required: true,
      min: [0, "Minimum stock threshold cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      enum: SUPPLY_STATUSES,
      default: "AVAILABLE",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-derive status & isAvailable before saving
supplySchema.pre("save", function (next) {
  this.status = computeSupplyStatus(this.quantity, this.minimumStock);
  this.isAvailable = this.quantity > 0;
  this.lastUpdated = new Date();
  next();
});

// Indexes for fast jurisdiction queries and aggregation
supplySchema.index({ state: 1, district: 1 });
supplySchema.index({ shelter: 1 });
supplySchema.index({ category: 1 });
supplySchema.index({ status: 1 });

module.exports = {
  Supply: mongoose.model("Supply", supplySchema),
  SUPPLY_CATEGORIES,
  SUPPLY_STATUSES,
  computeSupplyStatus,
};
