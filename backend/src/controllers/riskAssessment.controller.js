const RiskAssessment = require('../models/riskAssessment.model');
const ActivityLog = require('../models/activitylog.model');
const { triggerEarlyWarningIfNeeded } = require('../utils/riskAlertTrigger');
const { predictDisasterRisk } = require('../utils/aiRiskService');
const { emitToJurisdiction } = require('../config/socket');

// Derives riskLevel from riskScore when not explicitly provided
const deriveRiskLevel = (score) => {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
};

// @desc   Trigger AI disaster risk prediction via Render microservice and store result
// @route  POST /api/risk/predict
exports.predictRiskWithAI = async (req, res) => {
  try {
    let {
      disasterType,
      coordinates,
      location,
      state,
      district,
      locationId,
      features,
      isVulnerableZone,
    } = req.body;

    // Normalize coordinates [lng, lat] and location { lat, lng }
    let finalCoordinates = null;
    let finalLocation = null;

    if (Array.isArray(coordinates) && coordinates.length === 2) {
      finalCoordinates = [Number(coordinates[0]), Number(coordinates[1])];
      finalLocation = { lat: finalCoordinates[1], lng: finalCoordinates[0] };
    } else if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      finalLocation = { lat: Number(location.lat), lng: Number(location.lng) };
      finalCoordinates = [finalLocation.lng, finalLocation.lat];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Valid coordinates [lng, lat] or location { lat, lng } are required.',
      });
    }

    if (!disasterType) {
      return res.status(400).json({
        success: false,
        message: 'disasterType is required (flood, fire, earthquake).',
      });
    }

    // Default state/district from authenticated user or fallback
    state = state || req.user?.state || 'Maharashtra';
    district = district || req.user?.district || locationId || 'Pune';
    locationId = locationId || district.toLowerCase();

    // Call Render microservice via resilient adapter
    const aiResult = await predictDisasterRisk({
      disasterType,
      location: finalLocation,
      locationId,
      features: features || {},
    });

    const finalRiskLevel = aiResult.riskLevel || deriveRiskLevel(aiResult.riskScore);

    const risk = await RiskAssessment.create({
      disasterType: (aiResult.disasterType || disasterType).toLowerCase(),
      location: { type: 'Point', coordinates: finalCoordinates },
      state,
      district,
      locationId,
      features: features || {},
      riskScore: aiResult.riskScore,
      riskLevel: finalRiskLevel,
      confidence: aiResult.confidence ?? 0.8,
      riskFactors: aiResult.riskFactors || [],
      source: aiResult.source || 'ai_model',
      aiStatus: aiResult.aiStatus || 'online',
      isVulnerableZone: !!isVulnerableZone,
      createdBy: req.user?._id || null,
      predictedAt: aiResult.predictedAt ? new Date(aiResult.predictedAt) : new Date(),
    });

    // Auto-trigger early warning alert if riskScore >= 70
    const alert = await triggerEarlyWarningIfNeeded(risk);

    // Realtime notification via Socket.IO
    try {
      emitToJurisdiction(state, district, 'risk-updated', risk);
      if (alert) {
        emitToJurisdiction(state, district, 'alert-broadcast', alert);
      }
    } catch (sockErr) {
      console.warn('Socket emission non-fatal warning in risk prediction:', sockErr.message);
    }

    // Audit logging
    try {
      await ActivityLog.create({
        action: 'risk_assessment_created',
        description: `AI Risk Assessment generated for ${risk.district}, ${risk.state} (${risk.disasterType.toUpperCase()}: ${risk.riskScore}/100 [${risk.riskLevel}])`,
        targetType: 'alert',
        targetId: risk._id,
        state,
        district,
        performedBy: req.user?._id || null,
        metadata: {
          disasterType: risk.disasterType,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          source: risk.source,
          aiStatus: risk.aiStatus,
          alertTriggered: !!alert,
        },
      });
    } catch (auditErr) {
      console.warn('Audit log non-fatal warning in risk prediction:', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'AI disaster risk prediction completed successfully',
      data: risk,
      alertTriggered: !!alert,
      alert: alert || null,
    });
  } catch (err) {
    console.error('predictRiskWithAI error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process AI risk prediction.' });
  }
};

// @desc   Create a new risk assessment (AI or manual)
// @route  POST /api/risk/prediction
exports.createRiskAssessment = async (req, res) => {
  try {
    if (req.body.riskScore === undefined || req.body.callAI === true) {
      return exports.predictRiskWithAI(req, res);
    }

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