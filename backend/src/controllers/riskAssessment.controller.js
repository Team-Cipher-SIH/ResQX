const RiskAssessment = require('../models/riskAssessment.model');
const { triggerEarlyWarningIfNeeded } = require('../utils/riskAlertTrigger');

// @desc   Create a new risk assessment (AI or manual)
// @route  POST /api/risk-assessments
exports.createRiskAssessment = async (req, res) => {
  try {
    const {
      hazardType,
      coordinates,
      state,
      district,
      riskScore,
      confidence,
      factors,
      source,
      isVulnerableZone,
    } = req.body;

    if (!hazardType || !coordinates || !state || !district || riskScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'hazardType, coordinates, state, district, and riskScore are required.',
      });
    }

    const risk = await RiskAssessment.create({
      hazardType,
      location: { type: 'Point', coordinates },
      state,
      district,
      riskScore,
      confidence,
      factors,
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
// @route  GET /api/risk-assessments
exports.getRiskAssessments = async (req, res) => {
  try {
    const { hazardType, status, state, district } = req.query;

    const filter = { status: status || 'active' };
    if (hazardType) filter.hazardType = hazardType;
    if (state) filter.state = state;
    if (district) filter.district = district;

    // Jurisdiction filter always applied last so query params can't override scope
    const finalFilter = { ...filter, ...req.jurisdictionFilter };

    const risks = await RiskAssessment.find(finalFilter).sort({ riskScore: -1 });

    return res.status(200).json({ success: true, data: risks });
  } catch (err) {
    console.error('getRiskAssessments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch risk assessments.' });
  }
};

// @desc   Get single risk assessment
// @route  GET /api/risk-assessments/:id
exports.getRiskAssessmentById = async (req, res) => {
  try {
    const risk = await RiskAssessment.findById(req.params.id);
    if (!risk) {
      return res.status(404).json({ success: false, message: 'Risk assessment not found.' });
    }
    return res.status(200).json({ success: true, data: risk });
  } catch (err) {
    console.error('getRiskAssessmentById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch risk assessment.' });
  }
};

// @desc   Update a risk assessment (e.g. resolve, supersede, edit score)
// @route  PATCH /api/risk-assessments/:id
exports.updateRiskAssessment = async (req, res) => {
  try {
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
// @route  DELETE /api/risk-assessments/:id
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
// @route  GET /api/risk-assessments/vulnerable-zones
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