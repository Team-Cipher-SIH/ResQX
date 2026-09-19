/**
 * preparednessRecommender.js
 * ------------------------------------------------------------
 * Work Package 5: Preparedness / Resource Recommendation
 *
 * How it works (plain English):
 * 1. Look up the base resource list for this disaster type
 *    (e.g. floods need boats, fires need fire tenders).
 * 2. Scale each resource by how many people are estimated to be
 *    affected (bigger population = more resources needed).
 * 3. Apply a severity multiplier as a safety buffer — a CRITICAL
 *    situation gets extra resources on top of the raw population
 *    math, because emergencies rarely go exactly as calculated.
 * 4. Round every quantity UP (Math.ceil) — you can't send "half
 *    a rescue boat", and it's always safer to slightly over-supply
 *    than under-supply in a real emergency.
 * ------------------------------------------------------------
 */

const { RESOURCE_RULES, SEVERITY_MULTIPLIERS } = require("./resourceRules");

/**
 * @param {string} disasterType - "flood" | "fire" | "earthquake"
 * @param {string} severity - "low" | "moderate" | "high" | "critical"
 * @param {number} affectedPeopleEstimate - rough headcount of people affected
 */
function recommendResources(disasterType, severity, affectedPeopleEstimate) {
  const rules = RESOURCE_RULES[disasterType];

  if (!rules) {
    return {
      error: `No resource rules defined for disaster type "${disasterType}"`,
      recommendations: []
    };
  }

  const multiplier = SEVERITY_MULTIPLIERS[severity] || 1;
  const populationUnits = Math.max(affectedPeopleEstimate, 0) / 100;

  const recommendations = rules.map((rule) => {
    const rawQuantity = rule.perHundredPeople * populationUnits * multiplier;
    return {
      resource: rule.resource,
      recommendedQuantity: Math.ceil(rawQuantity)
    };
  });

  return {
    disasterType,
    severity,
    affectedPeopleEstimate,
    severityMultiplierApplied: multiplier,
    recommendations,
    note: "AI-generated resource estimate — final allocation must be confirmed by the responding authority"
  };
}

module.exports = { recommendResources };