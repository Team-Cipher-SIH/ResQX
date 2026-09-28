const mongoose = require('mongoose');

// Stores the LATEST TRUSTED SNAPSHOT per state+district+disasterType.
// Upserted on every ingestion — we don't keep full history, just current trusted values.
const externalDataSchema = new mongoose.Schema(
  {
    state: { type: String, required: true },
    district: { type: String, required: true },
    disasterType: {
      type: String,
      enum: ['flood', 'fire', 'earthquake'],
      required: true,
    },
    // Normalized values — shape depends on disasterType (validated before storage)
    values: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    sourceName: { type: String, default: 'unspecified' }, // e.g. "IMD", "seismic_network"
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One trusted snapshot per district+disasterType combination
externalDataSchema.index({ state: 1, district: 1, disasterType: 1 }, { unique: true });

module.exports = mongoose.model('ExternalData', externalDataSchema);