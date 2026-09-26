/**
 * resourceRules.js
 * ------------------------------------------------------------
 * Work Package 5: Preparedness / Resource Recommendation
 *
 * Defines, per disaster type, WHICH resources are typically
 * needed and HOW MUCH of each — expressed as a quantity "per 100
 * affected people". This is our knowledge base, same idea as
 * severityFactors.js in Work Package 2: a domain expert (disaster
 * management official) would normally help tune these numbers in
 * a real deployment.
 * ------------------------------------------------------------
 */

const RESOURCE_RULES = {
  flood: [
    { resource: "rescue boats", perHundredPeople: 2 },
    { resource: "life jackets", perHundredPeople: 100 },
    { resource: "drinking water (liters)", perHundredPeople: 500 },
    { resource: "relief camp tents", perHundredPeople: 20 },
    { resource: "medical first-aid kits", perHundredPeople: 10 }
  ],
  fire: [
    { resource: "fire tenders", perHundredPeople: 1 },
    { resource: "medical first-aid kits", perHundredPeople: 15 },
    { resource: "relief camp tents", perHundredPeople: 10 },
    { resource: "drinking water (liters)", perHundredPeople: 300 }
  ],
  earthquake: [
    { resource: "search and rescue teams", perHundredPeople: 2 },
    { resource: "excavation equipment units", perHundredPeople: 1 },
    { resource: "medical first-aid kits", perHundredPeople: 20 },
    { resource: "relief camp tents", perHundredPeople: 25 },
    { resource: "drinking water (liters)", perHundredPeople: 500 }
  ]
};

// How much extra buffer to add on top of the base calculation,
// depending on how severe the situation is. A CRITICAL flood needs
// more safety margin than a LOW one, even for the same population.
const SEVERITY_MULTIPLIERS = {
  low: 1,
  moderate: 1.3,
  high: 1.7,
  critical: 2.2
};

module.exports = { RESOURCE_RULES, SEVERITY_MULTIPLIERS };