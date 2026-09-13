const Shelter = require('../models/shelter.model');
const ResponseTeam = require('../models/responseteam.model');
const RiskAssessment = require('../models/riskAssessment.model');

/**
 * Computes a jurisdiction-level preparedness snapshot by aggregating
 * shelters, response teams, and active risk zones.
 */
const computePreparedness = async (filter = {}) => {
  const [shelters, teams, riskZones] = await Promise.all([
    Shelter.find(filter),
    ResponseTeam.find(filter),
    RiskAssessment.find({ ...filter, status: 'active' }),
  ]);

  const activeShelters = shelters.filter((s) => s.isActive !== false);
  const totalCapacity = activeShelters.reduce((sum, s) => sum + (s.capacity || 0), 0);
  const totalOccupied = activeShelters.reduce(
    (sum, s) => sum + (s.currentOccupancy !== undefined ? s.currentOccupancy : s.occupancy || 0),
    0
  );
  const availableCapacity = Math.max(0, totalCapacity - totalOccupied);

  const availableTeams = teams.filter((t) => t.status === 'available');

  const highRiskZones = riskZones.filter((z) => z.riskScore >= 70);
  const vulnerableZones = riskZones.filter((z) => z.isVulnerableZone);

  // ─── Scoring logic ───
  // Start at 100, deduct for gaps, add nothing above 100.
  let score = 100;

  // Shelter capacity vs vulnerable zone count: each vulnerable zone needs buffer capacity
  const capacityPerVulnerableZone = vulnerableZones.length > 0
    ? availableCapacity / vulnerableZones.length
    : availableCapacity;

  if (vulnerableZones.length > 0 && capacityPerVulnerableZone < 200) {
    score -= 25; // insufficient shelter buffer for known vulnerable zones
  }

  if (availableTeams.length === 0 && (highRiskZones.length > 0 || riskZones.length > 0)) {
    score -= 30; // no available responders despite active risk
  } else if (availableTeams.length < 2) {
    score -= 10;
  }

  if (highRiskZones.length > 2) {
    score -= 15; // multiple high-severity zones unaddressed
  }

  if (activeShelters.length === 0) {
    score -= 20; // no operational shelters at all
  }

  score = Math.max(0, Math.min(100, score));

  const status =
    score >= 80 ? 'well_prepared' :
    score >= 55 ? 'moderate' :
    score >= 30 ? 'at_risk' :
    'critical';

  return {
    score,
    status,
    metrics: {
      totalShelters: shelters.length,
      activeShelters: activeShelters.length,
      totalCapacity,
      availableCapacity,
      totalTeams: teams.length,
      availableTeams: availableTeams.length,
      activeRiskZones: riskZones.length,
      highRiskZones: highRiskZones.length,
      vulnerableZones: vulnerableZones.length,
    },
  };
};

module.exports = { computePreparedness };