// Simple, explainable priority score — good for a hackathon demo since you
// can justify every number to a judge in one sentence.
//
// severity contributes most of the score, and a small time-based bonus
// ensures an older ignored incident doesn't get buried forever under newer
// ones of the same severity.

const SEVERITY_WEIGHTS = {
  critical: 40,
  high: 30,
  medium: 20,
  low: 10,
};

const calculatePriorityScore = (severity, createdAt) => {
  const severityScore = SEVERITY_WEIGHTS[severity] || 10;

  const hoursSinceReported = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  // Cap the time bonus at 20 so an ancient low-severity incident still
  // doesn't outrank a fresh critical one.
  const timeBonus = Math.min(hoursSinceReported * 1, 20);

  return Math.round(severityScore + timeBonus);
};

module.exports = { calculatePriorityScore };
