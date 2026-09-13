const express = require('express');
const router = express.Router();

const {
  getPreparedness,
  getPreparednessBreakdown,
} = require('../controllers/preparedness.controller');

const { protect } = require('../middleware/auth.middleware');
const { attachJurisdictionFilter } = require('../middleware/jurisdiction.middleware');

router.use(protect);
router.use(attachJurisdictionFilter);

router.get('/', getPreparedness);
router.get('/breakdown', getPreparednessBreakdown);

module.exports = router;