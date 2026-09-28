/**
 * classifier.advanced.js
 * ------------------------------------------------------------
 * ADVANCED VERSION — Work Package 1: Incident Classification
 *
 * Uses a real trained ML model: a Naive Bayes text classifier
 * (from the `natural` NLP library), trained on the sample
 * sentences in data/trainingData.js.
 *
 * Why this is "advanced" compared to the keyword version:
 *  - It doesn't just look for exact words — it learns statistical
 *    word-probability patterns from training examples, so it can
 *    still classify text that uses slightly different wording.
 *  - It gives a genuine probability distribution across ALL
 *    classes, not just a hand-tuned score.
 *  - It's a real, explainable ML technique used in production
 *    spam filters and text classifiers — good to name-drop in
 *    your SIH presentation ("Naive Bayes text classification").
 *
 * We still keep it HYBRID: we also run the keyword matcher as a
 * secondary "explainability" signal, because judges (and your
 * own PPT, Slide 10) want to see WHY the AI decided something,
 * not just a black-box label.
 * ------------------------------------------------------------
 */

const natural = require("natural");
const trainingData = require("../../data/trainingData");
const { extractKeywords } = require("./classifier.basic");

// Step 1: build and train the classifier ONCE when the server starts.
// (Training a Bayes classifier on ~40 short sentences is instant —
// this is not a slow operation.)
const classifier = new natural.BayesClassifier();

trainingData.forEach(({ text, label }) => {
  classifier.addDocument(text, label);
});
classifier.train();

/**
 * Classifies incident text using the trained Naive Bayes model.
 * @param {string} title
 * @param {string} description
 */
function classifyIncidentAdvanced(title = "", description = "") {
  const combinedText = `${title} ${description}`.trim();

  if (!combinedText) {
    return { predictedType: "unknown", confidence: 0.3, matchedKeywords: [], modelUsed: "naive-bayes" };
  }

  // Step 2: get a probability score for EVERY class, sorted highest first
  // e.g. [{ label: 'flood', value: 0.81 }, { label: 'other', value: 0.11 }, ...]
  const classifications = classifier.getClassifications(combinedText);
  const top = classifications[0];

  // Step 3: "other" is our model's way of saying "not a disaster" —
  // we translate that to your PPT's "unknown" outcome.
  const predictedType = top.label === "other" ? "unknown" : top.label;

  // Step 4: Naive Bayes scores aren't always neat 0–1 probabilities
  // (can be skewed with a small training set), so we normalize them
  // into a clean, presentable confidence value.
  const totalScore = classifications.reduce((sum, c) => sum + c.value, 0);
  const confidence = totalScore > 0 ? Number((top.value / totalScore).toFixed(2)) : 0.3;

  // Step 5: add keyword evidence for explainability (reuses the
  // simple version's logic — see classifier.basic.js)
  const matchedKeywords =
    predictedType !== "unknown" ? extractKeywords(combinedText, predictedType) : [];

  return {
    predictedType,
    confidence,
    matchedKeywords,
    modelUsed: "naive-bayes",
    // Normalize each raw likelihood by the total so scores read as
    // relative percentages (e.g. 0.95) instead of tiny raw numbers
    // like 0.0000764 that round down to 0.
    allScores: classifications.map((c) => ({
      type: c.label === "other" ? "unknown" : c.label,
      score: totalScore > 0 ? Number((c.value / totalScore).toFixed(3)) : 0
    }))
  };
}

module.exports = { classifyIncidentAdvanced };