const Shelter  = require('../models/shelter.model');
const ResponseTeam  = require('../models/responseteam.model');
const { Supply } = require('../models/supply.model');
const  RiskAssessment  = require('../models/riskAssessment.model'); 

/**
 * Computes jurisdiction-level preparedness by combining Shelters,
 * Response Teams, Supplies, and active Risk Zones.
 * Optionally scoped to a specific disasterType.
 */
const computePreparedness = async (filter = {}, disasterType = null) => {
  const riskFilter = { ...filter, status: 'active' };
  if (disasterType) riskFilter.disasterType = disasterType;

  const [shelters, teams, supplies, riskZones] = await Promise.all([
    Shelter.find(filter),
    ResponseTeam.find(filter),
    Supply.find(filter),
    RiskAssessment.find(riskFilter),
  ]);

  // ─── Shelter readiness ───
  const activeShelters = shelters.filter((s) => s.isActive !== false);
  const totalCapacity = activeShelters.reduce((sum, s) => sum + (s.capacity || 0), 0);
  const totalOccupied = activeShelters.reduce(
    (sum, s) => sum + (s.currentOccupancy !== undefined ? s.currentOccupancy : s.occupancy || 0),
    0
  );
  const availableCapacity = Math.max(0, totalCapacity - totalOccupied);

  const activeRatio = shelters.length > 0 ? activeShelters.length / shelters.length : 0;
  const capacityRatio = totalCapacity > 0 ? availableCapacity / totalCapacity : 0;
  const shelterReadiness = Math.round((activeRatio * 0.4 + capacityRatio * 0.6) * 100);

  // ─── Teams ───
  const availableTeams = teams.filter((t) => t.status === 'available');
  const teamsAvailable = availableTeams.length;

  // ─── Supplies: worst-status-wins per category ───
  // 🔧 category values are capitalized ("Water", "Medicine", "Food")
  const getCategoryStatus = (category) => {
    const items = supplies.filter((s) => s.category === category);
    if (items.length === 0) return 'UNKNOWN';
    const hasOutOrCritical = items.some((s) => s.status === 'CRITICAL' || s.status === 'OUT_OF_STOCK');
    if (hasOutOrCritical) return 'CRITICAL';
    const hasLow = items.some((s) => s.status === 'LOW');
    if (hasLow) return 'LOW';
    return 'AVAILABLE'; // 🔧 was "GOOD", now matches actual enum
  };

  const waterStatus = getCategoryStatus('Water');
  const medicineStatus = getCategoryStatus('Medicine');
  const foodStatus = getCategoryStatus('Food');

  // ─── Risk zone context ───
  const highRiskZones = riskZones.filter((z) => z.riskScore >= 70);
  const vulnerableZones = riskZones.filter((z) => z.isVulnerableZone);

  // ─── Overall score (0-100) ───
  let score = 100;

  if (shelterReadiness < 50) score -= 20;
  else if (shelterReadiness < 70) score -= 10;

  if (teamsAvailable === 0 && riskZones.length > 0) score -= 30;
  else if (teamsAvailable < 2) score -= 10;

  if (waterStatus === 'CRITICAL' || medicineStatus === 'CRITICAL') score -= 20;
  else if (waterStatus === 'LOW' || medicineStatus === 'LOW') score -= 10;

  if (vulnerableZones.length > 0 && capacityRatio < 0.3) score -= 15;

  if (highRiskZones.length > 2) score -= 10;

  score = Math.max(0, Math.min(100, score));

  const status =
    score >= 80 ? 'well_prepared' :
    score >= 55 ? 'moderate' :
    score >= 30 ? 'at_risk' :
    'critical';

  // ─── Recommended actions ───
  const actions = [];
  if (shelterReadiness < 60) actions.push('Check shelter capacity and reactivate inactive facilities');
  if (waterStatus === 'CRITICAL' || waterStatus === 'LOW') actions.push('Verify water stock levels');
  if (medicineStatus === 'CRITICAL' || medicineStatus === 'LOW') actions.push('Verify medicine stock');
  if (teamsAvailable < 2) actions.push('Deploy or mobilize additional response teams');
  if (vulnerableZones.length > 0) actions.push('Prioritize monitoring of flagged vulnerable zones');
  if (actions.length === 0) actions.push('No immediate action required — maintain routine monitoring');

  return {
    disasterType: disasterType || 'all',
    shelterReadiness,
    teamsAvailable,
    waterStatus,
    medicineStatus,
    foodStatus,
    actions,
    score,
    status,
    lastUpdated: new Date(),
    metrics: {
      totalShelters: shelters.length,
      activeShelters: activeShelters.length,
      totalCapacity,
      availableCapacity,
      totalTeams: teams.length,
      availableTeams: teamsAvailable,
      activeRiskZones: riskZones.length,
      highRiskZones: highRiskZones.length,
      vulnerableZones: vulnerableZones.length,
    },
  };
};

module.exports = { computePreparedness };