const express = require('express');
const router = express.Router();

const {
  ingestExternalData,
  getLatestExternalData,
} = require('../controllers/externalData.controller');

const { protect, authorize } = require('../middleware/auth.middleware');
const { attachJurisdictionFilter } = require('../middleware/jurisdiction.middleware');

router.use(protect);
router.use(attachJurisdictionFilter);

router.post('/ingest', authorize('authority', 'admin'), ingestExternalData);
router.get('/latest', getLatestExternalData);

module.exports = router;