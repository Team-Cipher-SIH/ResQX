// Stub controller simulating external hazard data sources (IMD weather,
// seismic feeds, satellite flood mapping). Real API keys/integration
// pending — mirrors the USE_MOCK_AI pattern for stable demos.

const MOCK_WEATHER_DATA = {
  rainfall_mm_24h: 145,
  windSpeed_kmph: 38,
  temperature_c: 27,
  humidity_pct: 88,
  forecast: 'Heavy rainfall expected in next 48 hours',
};

const MOCK_SEISMIC_DATA = {
  recentTremors: 2,
  maxMagnitude: 3.4,
  lastEventHoursAgo: 14,
  faultLineProximity_km: 42,
};

const MOCK_FLOOD_MAPPING_DATA = {
  riverLevel_m: 4.2,
  dangerLevel_m: 5.0,
  floodPlainCoverage_pct: 23,
  satellitePassHoursAgo: 6,
};

// @desc   Get weather feed data for a jurisdiction (IMD stub)
// @route  GET /api/external-data/weather
exports.getWeatherData = async (req, res) => {
  try {
    const { state, district } = req.query;

    if (!state || !district) {
      return res.status(400).json({
        success: false,
        message: 'state and district query params are required.',
      });
    }

    return res.status(200).json({
      success: true,
      source: 'mock_imd_stub',
      state,
      district,
      data: MOCK_WEATHER_DATA,
      note: 'Stub data — real IMD API integration pending credentials.',
    });
  } catch (err) {
    console.error('getWeatherData error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch weather data.' });
  }
};

// @desc   Get seismic activity feed (earthquake monitoring stub)
// @route  GET /api/external-data/seismic
exports.getSeismicData = async (req, res) => {
  try {
    const { state, district } = req.query;

    if (!state || !district) {
      return res.status(400).json({
        success: false,
        message: 'state and district query params are required.',
      });
    }

    return res.status(200).json({
      success: true,
      source: 'mock_seismic_stub',
      state,
      district,
      data: MOCK_SEISMIC_DATA,
      note: 'Stub data — real seismic sensor network integration pending.',
    });
  } catch (err) {
    console.error('getSeismicData error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch seismic data.' });
  }
};

// @desc   Get flood/river level mapping feed (satellite stub)
// @route  GET /api/external-data/flood-mapping
exports.getFloodMappingData = async (req, res) => {
  try {
    const { state, district } = req.query;

    if (!state || !district) {
      return res.status(400).json({
        success: false,
        message: 'state and district query params are required.',
      });
    }

    return res.status(200).json({
      success: true,
      source: 'mock_satellite_stub',
      state,
      district,
      data: MOCK_FLOOD_MAPPING_DATA,
      note: 'Stub data — real satellite/flood-mapping API integration pending.',
    });
  } catch (err) {
    console.error('getFloodMappingData error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch flood mapping data.' });
  }
};

// @desc   Unified multi-source intake — combines all external feeds in one call
// @route  GET /api/external-data/intake
exports.getMultiSourceIntake = async (req, res) => {
  try {
    const { state, district, hazardType } = req.query;

    if (!state || !district) {
      return res.status(400).json({
        success: false,
        message: 'state and district query params are required.',
      });
    }

    // In production, this would fan out to real weather/seismic/satellite
    // APIs based on hazardType and merge results for the AI model to consume.
    const intake = {
      weather: MOCK_WEATHER_DATA,
      seismic: MOCK_SEISMIC_DATA,
      floodMapping: MOCK_FLOOD_MAPPING_DATA,
    };

    return res.status(200).json({
      success: true,
      source: 'mock_multi_source_stub',
      state,
      district,
      hazardType: hazardType || 'all',
      data: intake,
      note: 'Combined stub feed — ready for AI model consumption once real sources are wired.',
    });
  } catch (err) {
    console.error('getMultiSourceIntake error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch multi-source intake data.' });
  }
};