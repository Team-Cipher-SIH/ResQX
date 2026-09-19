const mongoose = require('mongoose');

const riskAssessmentSchema = new mongoose.Schema(
  {
    disasterType: {
      type: String,
      enum: ['flood', 'fire', 'earthquake'],
      required: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    riskScore: { type: Number, min: 0, max: 100, required: true },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    riskFactors: [{ type: String }], // e.g. ["heavy rainfall", "river level"]
    source: {
      type: String,
      enum: ['ai_model', 'manual', 'external_feed'],
      default: 'ai_model',
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'superseded'],
      default: 'active',
      index: true,
    },
    isVulnerableZone: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    predictedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

riskAssessmentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('RiskAssessment', riskAssessmentSchema);