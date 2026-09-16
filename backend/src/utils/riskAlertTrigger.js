const Alert = require('../models/alert.model');

const RISK_ALERT_THRESHOLD = 70;

const triggerEarlyWarningIfNeeded = async (riskDoc) => {
  try {
    if (!riskDoc || riskDoc.riskScore < RISK_ALERT_THRESHOLD) return null;
    if (riskDoc.status !== 'active') return null;

    const existingAlert = await Alert.findOne({
      sourceRiskAssessment: riskDoc._id,
      status: { $in: ['draft', 'issued'] },
    });

    if (existingAlert) {
      if (existingAlert.status === 'draft') {
        existingAlert.message = buildAlertMessage(riskDoc);
        existingAlert.severity = getSeverityFromScore(riskDoc.riskScore);
        existingAlert.type = getAlertType(riskDoc.riskScore);
        await existingAlert.save();
      }
      return existingAlert;
    }

    const alert = await Alert.create({
      title: `${capitalize(riskDoc.disasterType)} Risk Warning — ${riskDoc.district}`,
      message: buildAlertMessage(riskDoc),
      type: getAlertType(riskDoc.riskScore),
      severity: getSeverityFromScore(riskDoc.riskScore),
      affectedStates: [riskDoc.state],
      affectedDistricts: [riskDoc.district],
      status: 'draft',
      isActive: false,
      source: 'ai_risk_prediction',
      sourceRiskAssessment: riskDoc._id,
    });

    return alert;
  } catch (err) {
    console.error('triggerEarlyWarningIfNeeded error:', err);
    return null;
  }
};

const getSeverityFromScore = (score) => {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  return 'medium';
};

const getAlertType = (score) => {
  if (score >= 85) return 'warning';
  if (score >= 70) return 'watch';
  return 'advisory';
};

const buildAlertMessage = (riskDoc) =>
  `Elevated ${riskDoc.disasterType} risk detected in ${riskDoc.district}, ${riskDoc.state} (score: ${riskDoc.riskScore}/100, level: ${riskDoc.riskLevel}).${
    riskDoc.isVulnerableZone ? ' This area is flagged as a vulnerable zone.' : ''
  }`;

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

module.exports = { triggerEarlyWarningIfNeeded, RISK_ALERT_THRESHOLD };