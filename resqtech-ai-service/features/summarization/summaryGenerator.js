/**
 * summaryGenerator.js
 * ------------------------------------------------------------
 * Work Package 4: AI Situation Summary
 *
 * Goal: given several citizen reports about the SAME incident
 * (e.g. the cluster we found in Work Package 3), automatically
 * write one short, readable summary for the authority — instead
 * of them having to read 10 separate messy reports.
 *
 * Technique: EXTRACTIVE SUMMARIZATION using sentence centrality
 * (a simplified version of a real, published algorithm called
 * LexRank). Plain-English idea:
 *
 * 1. Break all reports into individual sentences.
 * 2. For each sentence, measure how similar it is to every OTHER
 *    sentence (using the same cosine-similarity idea as our
 *    duplicate detector).
 * 3. A sentence that "sounds like" many other sentences is
 *    probably describing the CORE, agreed-upon fact — so we call
 *    it more "central" / important.
 * 4. Pick the top few most central sentences as the summary.
 *
 * This is a genuine, explainable NLP technique — no black box,
 * and no training data needed, so it works even for a disaster
 * type we've never seen text about before.
 * ------------------------------------------------------------
 */

const STOP_WORDS = new Set([
  "the", "is", "at", "a", "an", "and", "or", "in", "on", "of", "to",
  "near", "with", "has", "have", "was", "were", "be", "been", "it",
  "this", "that", "are", "for", "from", "by", "there", "has", "had"
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

function toFrequencyVector(words) {
  const vector = {};
  for (const word of words) vector[word] = (vector[word] || 0) + 1;
  return vector;
}

function cosineSimilarity(vectorA, vectorB) {
  const allWords = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);
  let dot = 0, magA = 0, magB = 0;
  for (const word of allWords) {
    const a = vectorA[word] || 0;
    const b = vectorB[word] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Splits a block of text into individual sentences. */
function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Picks the most "central" (representative) sentences across ALL
 * reports combined.
 * @param {string[]} reportTexts - array of report description strings
 * @param {number} maxSentences  - how many sentences to keep in the summary
 */
function extractKeySentences(reportTexts, maxSentences = 3) {
  // Step 1: gather every sentence from every report into one flat list
  const allSentences = reportTexts.flatMap((text) => splitIntoSentences(text));

  if (allSentences.length === 0) return [];
  if (allSentences.length <= maxSentences) return allSentences;

  // Step 2: build a word-frequency vector for each sentence
  const vectors = allSentences.map((s) => toFrequencyVector(tokenize(s)));

  // Step 3: score each sentence by its average similarity to all others
  const centralityScores = vectors.map((vectorA, i) => {
    let total = 0;
    for (let j = 0; j < vectors.length; j++) {
      if (i === j) continue;
      total += cosineSimilarity(vectorA, vectors[j]);
    }
    return total / (vectors.length - 1);
  });

  // Step 4: pick the top N sentences by score, but keep their ORIGINAL
  // order so the summary still reads naturally (not shuffled).
  const ranked = allSentences
    .map((sentence, i) => ({ sentence, score: centralityScores[i], originalIndex: i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.originalIndex - b.originalIndex);

  return ranked.map((r) => r.sentence);
}

/**
 * Builds the full situation summary: a structured header (facts we
 * already KNOW for certain, like counts and location) plus the
 * extracted key sentences (the actual narrative, in reporters' own
 * words — we don't rewrite their sentences, just select the best ones).
 *
 * @param {object} params
 * @param {string[]} params.reportTexts - descriptions of all reports in the cluster
 * @param {string} params.disasterType
 * @param {string} params.locationName
 * @param {string} [params.severity] - optional, e.g. from Work Package 2
 */
function generateSummary({ reportTexts, disasterType, locationName, severity }) {
  if (!reportTexts || reportTexts.length === 0) {
    return { summary: "No reports available to summarize.", keySentences: [] };
  }

  const keySentences = extractKeySentences(reportTexts, 3);

  const headerParts = [
    `${reportTexts.length} report${reportTexts.length > 1 ? "s" : ""} received`,
    `about a possible ${disasterType}`,
    locationName ? `near ${locationName}` : null,
    severity ? `(severity: ${severity})` : null
  ].filter(Boolean);

  const header = headerParts.join(" ") + ".";
  const narrative = keySentences.join(" ");

  return {
    summary: `${header} ${narrative}`.trim(),
    keySentences,
    reportCount: reportTexts.length
  };
}

module.exports = { generateSummary, extractKeySentences, splitIntoSentences };