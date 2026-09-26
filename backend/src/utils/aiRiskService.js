const axios = require('axios');

const AI_RISK_SERVICE_URL = (process.env.AI_RISK_SERVICE_URL || 'https://resqx-2oud.onrender.com').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = parseInt(process.env.AI_RISK_TIMEOUT_MS || '20000', 10);

/**
 * Baseline heuristic generator if external AI service is unreachable or cold
 * Satisfies PDF 2 Page 9 requirement: "AI unavailable -> backend keeps system alive"
 */
function generateBaselineHeuristic({ disasterType, location, locationId, features = {} }) {
  const type = (disasterType || 'flood').toLowerCase();
  let score = 45;
  const factors = [];

  if (type === 'flood') {
    const rainfall = features.rainfall ?? 65;
    const riverLevel = features.riverLevel ?? 4.5;
    const elevation = features.elevation ?? 80;

    if (rainfall > 100) {
      score += 25;
      factors.push('Heavy cumulative rainfall');
    } else if (rainfall > 60) {
      score += 15;
      factors.push('Moderate rainfall observed');
    }

    if (riverLevel > 7.0) {
      score += 20;
      factors.push('River stage approaching warning level');
    }

    if (elevation < 50) {
      score += 10;
      factors.push('Low-lying basin terrain');
    }
  } else if (type === 'fire') {
    const temp = features.temperature ?? 36;
    const windSpeed = features.windSpeed ?? 22;
    const humidity = features.humidity ?? 28;

    if (temp > 40) {
      score += 25;
      factors.push('Extreme ambient heat condition');
    }
    if (windSpeed > 25) {
      score += 20;
      factors.push('High surface wind velocity accelerates spread');
    }
    if (humidity < 30) {
      score += 15;
      factors.push('Dry vegetation & low moisture index');
    }
  } else if (type === 'earthquake') {
    const seismicActivity = features.historicalSeismicActivity ?? 0.5;
    const faultDistance = features.faultDistanceKm ?? 45;

    if (seismicActivity > 0.7) {
      score += 25;
      factors.push('High regional seismic fault vulnerability');
    }
    if (faultDistance < 30) {
      score += 20;
      factors.push('Proximity to active tectonic fault line');
    }
  }

  score = Math.min(Math.max(score, 10), 95);

  let riskLevel = 'MODERATE';
  if (score >= 85) riskLevel = 'CRITICAL';
  else if (score >= 70) riskLevel = 'HIGH';
  else if (score < 40) riskLevel = 'LOW';

  if (factors.length === 0) {
    factors.push('Regional baseline terrain vulnerability profile');
  }

  return {
    disasterType: type,
    locationId: locationId || 'district-custom',
    riskScore: Math.round(score),
    riskLevel,
    confidence: 0.65,
    riskFactors: factors,
    predictedAt: new Date().toISOString(),
    source: 'baseline_heuristic',
    aiStatus: 'fallback_active',
  };
}

/**
 * Predict pre-disaster risk by calling Render FastAPI microservice
 * @param {Object} params
 * @param {string} params.disasterType - 'flood' | 'fire' | 'earthquake'
 * @param {Object} params.location - { lat: number, lng: number }
 * @param {string} [params.locationId] - District name or code
 * @param {Object} [params.features] - Numeric environmental indicators
 * @returns {Promise<Object>} Normalized prediction result
 */
async function predictDisasterRisk({ disasterType, location, locationId, features = {} }) {
  if (!disasterType || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    throw new Error('Valid disasterType and location ({ lat, lng }) are required for AI risk prediction.');
  }

  const payload = {
    disasterType: disasterType.toLowerCase(),
    location: {
      lat: Number(location.lat),
      lng: Number(location.lng),
    },
    locationId: locationId || 'district-custom',
    features: features && typeof features === 'object' ? features : {},
  };

  try {
    console.log(`[AI Risk Client] Calling Render microservice at ${AI_RISK_SERVICE_URL}/predict-risk...`);
    const response = await axios.post(`${AI_RISK_SERVICE_URL}/predict-risk`, payload, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data && typeof response.data.riskScore === 'number') {
      console.log(`[AI Risk Client] Successful prediction from Render (Score: ${response.data.riskScore}, Level: ${response.data.riskLevel})`);
      return {
        ...response.data,
        source: 'ai_model',
        aiStatus: 'online',
      };
    }

    throw new Error('Invalid response structure received from AI service');
  } catch (err) {
    console.warn(`[AI Risk Client Warning] Failed to reach Render AI service (${err.message}). Using resilient baseline heuristic.`);
    return generateBaselineHeuristic({
      disasterType,
      location,
      locationId,
      features,
    });
  }
}

module.exports = {
  predictDisasterRisk,
  generateBaselineHeuristic,
  AI_RISK_SERVICE_URL,
};
