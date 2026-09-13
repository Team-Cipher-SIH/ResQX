const express = require('express');
const router = express.Router();

const {
  createRiskAssessment,
  getRiskAssessments,
  getRiskAssessmentById,
  updateRiskAssessment,
  deleteRiskAssessment,
  getVulnerableZones,
} = require('../controllers/riskAssessment.controller');

const { protect } = require('../middleware/auth.middleware');
const { attachJurisdictionFilter } = require('../middleware/jurisdiction.middleware');

router.use(protect);
router.use(attachJurisdictionFilter);

router.route('/').get(getRiskAssessments).post(createRiskAssessment);
router.get('/public/vulnerable-zones', getVulnerableZones); 
router.get('/vulnerable-zones', getVulnerableZones);

router
  .route('/:id')
  .get(getRiskAssessmentById)
  .patch(updateRiskAssessment)
  .delete(deleteRiskAssessment);

module.exports = router;