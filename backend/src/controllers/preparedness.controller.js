const { computePreparedness } = require('../utils/preparednessCalculator');

// @desc   Get preparedness status for the caller's jurisdiction
// @route  GET /api/preparedness
exports.getPreparedness = async (req, res) => {
  try {
    const finalFilter = { ...req.jurisdictionFilter };
    const result = await computePreparedness(finalFilter);

    return res.status(200).json({
      success: true,
      data: {
        state: req.query.state || req.user?.state || null,
        district: req.query.district || req.user?.district || null,
        ...result,
      },
    });
  } catch (err) {
    console.error('getPreparedness error:', err);
    return res.status(500).json({ success: false, message: 'Failed to compute preparedness status.' });
  }
};

// @desc   Get preparedness breakdown across all districts within scope (for central/state admins)
// @route  GET /api/preparedness/breakdown
exports.getPreparednessBreakdown = async (req, res) => {
  try {
    const Shelter = require('../models/shelter.model');
    const baseFilter = { ...req.jurisdictionFilter };

    // Find distinct districts within the current scope
    const districts = await Shelter.distinct('district', baseFilter);

    const breakdown = await Promise.all(
      districts.map(async (district) => {
        const result = await computePreparedness({ ...baseFilter, district });
        return { district, ...result };
      })
    );

    // Sort worst-prepared first so authorities see priorities immediately
    breakdown.sort((a, b) => a.score - b.score);

    return res.status(200).json({ success: true, data: breakdown });
  } catch (err) {
    console.error('getPreparednessBreakdown error:', err);
    return res.status(500).json({ success: false, message: 'Failed to compute preparedness breakdown.' });
  }
};