const  RiskAssessment  = require('../models/riskAssessment.model');
const { triggerEarlyWarningIfNeeded } = require('../utils/riskAlertTrigger');

// Derives riskLevel from riskScore when not explicitly provided
const deriveRiskLevel = (score) => {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
};

// @desc   Create a new risk assessment (AI or manual)
// @route  POST /api/risk/prediction
exports.createRiskAssessment = async (req, res) => {
  try {
    const {
      disasterType,
      coordinates,
      state,
      district,
      riskScore,
      riskLevel,
      confidence,
      riskFactors,
      source,
      isVulnerableZone,
    } = req.body;

    if (!disasterType || !coordinates || !state || !district || riskScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'disasterType, coordinates, state, district, and riskScore are required.',
      });
    }

    if (riskScore < 0 || riskScore > 100) {
      return res.status(400).json({ success: false, message: 'riskScore must be between 0 and 100.' });
    }

    if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
      return res.status(400).json({ success: false, message: 'confidence must be between 0 and 1.' });
    }

    const finalRiskLevel = riskLevel || deriveRiskLevel(riskScore);
    const validLevels = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    if (!validLevels.includes(finalRiskLevel)) {
      return res.status(400).json({ success: false, message: 'riskLevel must be one of LOW, MODERATE, HIGH, CRITICAL.' });
    }

    const risk = await RiskAssessment.create({
      disasterType,
      location: { type: 'Point', coordinates },
      state,
      district,
      riskScore,
      riskLevel: finalRiskLevel,
      confidence,
      riskFactors: riskFactors || [],
      source: source || 'ai_model',
      isVulnerableZone: !!isVulnerableZone,
      createdBy: req.user?._id,
    });

    await triggerEarlyWarningIfNeeded(risk);

    return res.status(201).json({ success: true, data: risk });
  } catch (err) {
    console.error('createRiskAssessment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create risk assessment.' });
  }
};

// @desc   Get all risk assessments (jurisdiction scoped)
// @route  GET /api/risk
exports.getRiskAssessments = async (req, res) => {
  try {
    const { disasterType, status, state, district, riskLevel, from, to } = req.query;

    const filter = { status: status || 'active' };
    if (disasterType) filter.disasterType = disasterType;
    if (state) filter.state = state;
    if (district) filter.district = district;
    if (riskLevel) filter.riskLevel = riskLevel;

    if (from || to) {
      filter.predictedAt = {};
      if (from) filter.predictedAt.$gte = new Date(from);
      if (to) filter.predictedAt.$lte = new Date(to);
    }

    const finalFilter = { ...filter, ...req.jurisdictionFilter };

    const risks = await RiskAssessment.find(finalFilter).sort({ riskScore: -1 });

    const STALE_HOURS = 24;
    const now = Date.now();
    const risksWithStaleness = risks.map((r) => {
      const hoursSincePredicted = (now - new Date(r.predictedAt).getTime()) / (1000 * 60 * 60);
      return {
        ...r.toObject(),
        isStale: hoursSincePredicted > STALE_HOURS,
      };
    });

    return res.status(200).json({ success: true, data: risksWithStaleness });
  } catch (err) {
    console.error('getRiskAssessments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch risk assessments.' });
  }
};

// @desc   Update a risk assessment (e.g. resolve, supersede, edit score)
// @route  PATCH /api/risk/:id
exports.updateRiskAssessment = async (req, res) => {
  try {
    if (req.body.riskScore !== undefined && req.body.riskLevel === undefined) {
      req.body.riskLevel = deriveRiskLevel(req.body.riskScore);
    }

    const risk = await RiskAssessment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!risk) {
      return res.status(404).json({ success: false, message: 'Risk assessment not found.' });
    }

    await triggerEarlyWarningIfNeeded(risk);

    return res.status(200).json({ success: true, data: risk });
  } catch (err) {
    console.error('updateRiskAssessment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update risk assessment.' });
  }
};

// @desc   Delete a risk assessment
// @route  DELETE /api/risk/:id
exports.deleteRiskAssessment = async (req, res) => {
  try {
    const risk = await RiskAssessment.findByIdAndDelete(req.params.id);
    if (!risk) {
      return res.status(404).json({ success: false, message: 'Risk assessment not found.' });
    }
    return res.status(200).json({ success: true, message: 'Risk assessment deleted.' });
  } catch (err) {
    console.error('deleteRiskAssessment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete risk assessment.' });
  }
};

// @desc   Get only vulnerable-area zones (for map red-zone marking)
// @route  GET /api/risk/vulnerable-zones
exports.getVulnerableZones = async (req, res) => {
  try {
    const finalFilter = {
      isVulnerableZone: true,
      status: 'active',
      ...(req.jurisdictionFilter || {}),
    };
    const zones = await RiskAssessment.find(finalFilter).sort({ riskScore: -1 });
    return res.status(200).json({ success: true, data: zones });
  } catch (err) {
    console.error('getVulnerableZones error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vulnerable zones.' });
  }
};

// @desc   Get risk assessments for a specific district (all disaster types)
// @route  GET /api/risk/:district
exports.getRiskByDistrict = async (req, res) => {
  try {
    const { district } = req.params;
    const { riskLevel, status } = req.query;

    const filter = {
      district: new RegExp(`^${district}$`, 'i'),
      status: status || 'active',
    };
    if (riskLevel) filter.riskLevel = riskLevel;

    const finalFilter = { ...filter, ...req.jurisdictionFilter };
    const risks = await RiskAssessment.find(finalFilter).sort({ riskScore: -1 });

    const STALE_HOURS = 24;
    const now = Date.now();
    const risksWithStaleness = risks.map((r) => {
      const hoursSincePredicted = (now - new Date(r.predictedAt).getTime()) / (1000 * 60 * 60);
      return { ...r.toObject(), isStale: hoursSincePredicted > STALE_HOURS };
    });

    return res.status(200).json({ success: true, data: risksWithStaleness });
  } catch (err) {
    console.error('getRiskByDistrict error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch district risk data.' });
  }
};

// @desc   Get risk assessments for a specific district + disaster type
// @route  GET /api/risk/:district/:disasterType
exports.getRiskByDistrictAndType = async (req, res) => {
  try {
    const { district, disasterType } = req.params;
    const { status } = req.query;

    const filter = {
      district: new RegExp(`^${district}$`, 'i'),
      disasterType,
      status: status || 'active',
    };

    const finalFilter = { ...filter, ...req.jurisdictionFilter };
    const risks = await RiskAssessment.find(finalFilter).sort({ riskScore: -1 });

    const STALE_HOURS = 24;
    const now = Date.now();
    const risksWithStaleness = risks.map((r) => {
      const hoursSincePredicted = (now - new Date(r.predictedAt).getTime()) / (1000 * 60 * 60);
      return { ...r.toObject(), isStale: hoursSincePredicted > STALE_HOURS };
    });

    return res.status(200).json({ success: true, data: risksWithStaleness });
  } catch (err) {
    console.error('getRiskByDistrictAndType error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch district risk data.' });
  }
};