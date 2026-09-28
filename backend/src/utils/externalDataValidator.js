// Per-disasterType field schemas — validates ranges/types and normalizes units
// before anything is trusted enough to store.

const FIELD_RULES = {
  flood: {
    rainfall_mm: { required: true, min: 0, max: 2000 },
    riverLevel_m: { required: true, min: 0, max: 50 },
    historicalFloodIndex: { required: false, min: 0, max: 100 },
  },
  fire: {
    temperature_c: { required: true, min: -10, max: 60 },
    windSpeed_kmph: { required: true, min: 0, max: 300 },
    drynessIndex: { required: false, min: 0, max: 100 },
  },
  earthquake: {
    seismicActivityIndex: { required: true, min: 0, max: 10 },
    historicalActivityCount: { required: false, min: 0, max: 10000 },
    regionalVulnerability: { required: false, min: 0, max: 100 },
  },
};

// Simple unit normalization: accepts alt units and converts to the canonical ones above
const normalizeValue = (key, value, unit) => {
  if (key === 'temperature_c' && unit === 'F') {
    return (value - 32) * (5 / 9);
  }
  if (key === 'windSpeed_kmph' && unit === 'mph') {
    return value * 1.60934;
  }
  return value;
};

/**
 * Validates + normalizes raw external data for a given disasterType.
 * Returns { valid: boolean, errors: string[], normalized: object }
 */
const validateAndNormalize = (disasterType, rawData) => {
  const rules = FIELD_RULES[disasterType];
  if (!rules) {
    return { valid: false, errors: [`Unsupported disasterType: ${disasterType}`], normalized: null };
  }

  const errors = [];
  const normalized = {};

  for (const [field, rule] of Object.entries(rules)) {
    const rawValue = rawData[field];
    const unit = rawData[`${field}_unit`]; // optional, e.g. temperature_c_unit: "F"

    if (rawValue === undefined || rawValue === null) {
      if (rule.required) {
        errors.push(`Missing required field: ${field}`);
      }
      continue;
    }

    if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
      errors.push(`${field} must be a number, got: ${typeof rawValue}`);
      continue;
    }

    const value = normalizeValue(field, rawValue, unit);

    if (value < rule.min || value > rule.max) {
      errors.push(`${field} out of range (${rule.min}-${rule.max}): got ${value}`);
      continue;
    }

    normalized[field] = Math.round(value * 100) / 100; // 2 decimal precision
  }

  return { valid: errors.length === 0, errors, normalized };
};

module.exports = { validateAndNormalize, FIELD_RULES };