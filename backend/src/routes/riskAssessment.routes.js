const express = require('express');
const router = express.Router();

const {
  createRiskAssessment,
  predictRiskWithAI,
  getRiskAssessments,
  getRiskByDistrict,
  getRiskByDistrictAndType,
  updateRiskAssessment,
  deleteRiskAssessment,
  getVulnerableZones,
} = require('../controllers/riskAssessment.controller');

const { protect } = require('../middleware/auth.middleware');
const { attachJurisdictionFilter } = require('../middleware/jurisdiction.middleware');

router.use(protect);
router.use(attachJurisdictionFilter);

// Static routes FIRST — order matters
router.get('/', getRiskAssessments);
router.post('/predict', predictRiskWithAI);
router.post('/prediction', createRiskAssessment);
router.get('/vulnerable-zones', getVulnerableZones);

// Dynamic routes — two-segment before one-segment
router.get('/:district/:disasterType', getRiskByDistrictAndType);
router.get('/:district', getRiskByDistrict);

router.patch('/:id', updateRiskAssessment);
router.delete('/:id', deleteRiskAssessment);

module.exports = router;