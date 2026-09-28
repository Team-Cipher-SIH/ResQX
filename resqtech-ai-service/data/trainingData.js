/**
 * trainingData.js
 * ------------------------------------------------------------
 * Sample sentences used to TRAIN the advanced classifier.
 *
 * This is the "advanced" difference from the basic version:
 * instead of hand-written keyword lists, we show a model many
 * example sentences per category, and it LEARNS which words are
 * statistically associated with each disaster type (Naive Bayes).
 *
 * For our SIH demo: we can say "we trained a text classifier
 * on sample incident reports" — this is genuinely true, just on
 * a small hand-built dataset instead of scraped real-world data.
 * You can grow this list any time to improve accuracy — no code
 * changes needed elsewhere.
 * ------------------------------------------------------------
 */

const trainingData = [
  // ---------- FLOOD ----------
  { text: "Water entering houses in the colony", label: "flood" },
  { text: "Roads and homes are flooded after heavy rain", label: "flood" },
  { text: "River water level rising rapidly near the village", label: "flood" },
  { text: "Drainage system overflowing, streets waterlogged", label: "flood" },
  { text: "Entire locality submerged due to continuous rainfall", label: "flood" },
  { text: "Dam release has caused water to enter nearby fields", label: "flood" },
  { text: "People stranded on rooftops due to rising flood water", label: "flood" },
  { text: "Vehicles stuck in waterlogged streets after monsoon rain", label: "flood" },
  { text: "Low lying areas inundated, families evacuated to relief camps", label: "flood" },
  { text: "Heavy downpour has flooded the market area completely", label: "flood" },

  // ---------- FIRE ----------
  { text: "Building on fire with thick smoke visible", label: "fire" },
  { text: "Massive blaze reported in the industrial area", label: "fire" },
  { text: "Gas leak caused a huge explosion and fire", label: "fire" },
  { text: "Short circuit led to fire breaking out in the market", label: "fire" },
  { text: "Wildfire spreading quickly through the dry forest", label: "fire" },
  { text: "Flames seen coming out of the third floor windows", label: "fire" },
  { text: "Warehouse fire causing heavy smoke across the neighborhood", label: "fire" },
  { text: "Residents evacuated after fire broke out in apartment complex", label: "fire" },
  { text: "Fire fighters struggling to control the burning factory", label: "fire" },
  { text: "Kitchen fire spread rapidly to the rest of the house", label: "fire" },

  // ---------- EARTHQUAKE ----------
  { text: "Strong tremor felt across the city", label: "earthquake" },
  { text: "Building collapsed after the earthquake struck", label: "earthquake" },
  { text: "Cracks appeared in walls following the shaking", label: "earthquake" },
  { text: "People trapped under debris after the quake", label: "earthquake" },
  { text: "Aftershocks continue to be felt in the region", label: "earthquake" },
  { text: "Ground shaking violently, residents ran out of buildings", label: "earthquake" },
  { text: "Landslide triggered by the earthquake blocked the highway", label: "earthquake" },
  { text: "Multiple structures damaged due to the powerful tremor", label: "earthquake" },
  { text: "Rescue teams searching rubble for survivors after quake", label: "earthquake" },
  { text: "Earthquake of high magnitude jolts the district", label: "earthquake" },

  // ---------- OTHER / UNKNOWN (important: teaches the model what "not a disaster" looks like) ----------
  { text: "My cat is missing since yesterday", label: "other" },
  { text: "Street light not working near my house", label: "other" },
  { text: "Garbage not collected for three days", label: "other" },
  { text: "Requesting information about ration card renewal", label: "other" },
  { text: "Noise complaint about a loud wedding function", label: "other" },
  { text: "Stray dogs causing trouble in the park", label: "other" },
  { text: "Water supply timing needs to be changed", label: "other" },
  { text: "Pothole on the main road needs repair", label: "other" }
];

module.exports = trainingData;