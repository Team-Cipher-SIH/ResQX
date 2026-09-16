const ExternalData = require('../models/externalData.model');
const { validateAndNormalize } = require('../utils/externalDataValidator');

const STALE_THRESHOLD_HOURS = 6;

// @desc   Ingest raw external data (weather/seismic/flood feed) — validates,
//         normalizes, and stores as the latest trusted snapshot.
// @route  POST /api/external-data/ingest
exports.ingestExternalData = async (req, res) => {
  try {
    const { state, district, disasterType, sourceName, data } = req.body;

    if (!state || !district || !disasterType || !data) {
      return res.status(400).json({
        success: false,
        message: 'state, district, disasterType, and data are required.',
      });
    }

    const { valid, errors, normalized } = validateAndNormalize(disasterType, data);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'External data failed validation — malformed values rejected.',
        errors,
      });
    }

    // Upsert: replace the previous trusted snapshot for this district+disasterType
    const snapshot = await ExternalData.findOneAndUpdate(
      { state, district, disasterType },
      {
        state,
        district,
        disasterType,
        values: normalized,
        sourceName: sourceName || 'unspecified',
        fetchedAt: new Date(),
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ success: true, data: snapshot });
  } catch (err) {
    console.error('ingestExternalData error:', err);
    return res.status(500).json({ success: false, message: 'Failed to ingest external data.' });
  }
};

// @desc   Get the latest trusted snapshot for a district+disasterType, with
//         staleness indication — this is what the AI/risk engine reads.
// @route  GET /api/external-data/latest
exports.getLatestExternalData = async (req, res) => {
  try {
    const { state, district, disasterType } = req.query;

    if (!state || !district || !disasterType) {
      return res.status(400).json({
        success: false,
        message: 'state, district, and disasterType query params are required.',
      });
    }

    const snapshot = await ExternalData.findOne({ state, district, disasterType });

    if (!snapshot) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'No external data snapshot available yet for this district/disasterType.',
        data: null,
      });
    }

    const hoursSinceUpdate = (Date.now() - snapshot.fetchedAt.getTime()) / (1000 * 60 * 60);
    const isStale = hoursSinceUpdate > STALE_THRESHOLD_HOURS;

    return res.status(200).json({
      success: true,
      available: true,
      isStale,
      lastUpdated: snapshot.fetchedAt,
      sourceName: snapshot.sourceName,
      data: snapshot.values,
    });
  } catch (err) {
    console.error('getLatestExternalData error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch external data.' });
  }
};