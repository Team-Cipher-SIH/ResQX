const express = require('express');
const router = express.Router();

const {
  getWeatherData,
  getSeismicData,
  getFloodMappingData,
  getMultiSourceIntake,
} = require('../controllers/externalData.controller');

const { protect } = require('../middleware/auth.middleware');
const { attachJurisdictionFilter } = require('../middleware/jurisdiction.middleware');

router.use(protect);
router.use(attachJurisdictionFilter);

router.get('/weather', getWeatherData);
router.get('/seismic', getSeismicData);
router.get('/flood-mapping', getFloodMappingData);
router.get('/intake', getMultiSourceIntake);

module.exports = router;