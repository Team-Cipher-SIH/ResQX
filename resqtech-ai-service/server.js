/**
 * server.js
 * ------------------------------------------------------------
 * Entry point for the whole resqtech-ai-service project.
 * As you build each Work Package, mount its routes here the
 * same way classification is mounted below.
 *
 * Run with: node server.js
 * ------------------------------------------------------------
 */

const express = require("express");
const app = express();
app.use(express.json());

// ---- Work Package 1: Incident Classification ----
const classificationRoutes = require("./features/classification/routes");
app.use("/ai/incident", classificationRoutes);

// ---- Work Package 2: Severity Recommendation (coming next) ----
const severityRoutes = require("./features/severity/routes");
app.use("/ai/incident", severityRoutes);

// ---- Work Package 3: Duplicate Detection ----
const duplicateRoutes = require("./features/duplicate-detection/routes");
app.use("/ai/incident", duplicateRoutes);

// ---- Work Package 4: Situation Summary ----
const summaryRoutes = require("./features/summarization/routes");
app.use("/ai/incident", summaryRoutes);

// ---- Work Package 5: Preparedness Recommendation ----
const preparednessRoutes = require("./features/preparedness/routes");
app.use("/api/ai/preparedness", preparednessRoutes);

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`ResQtech AI service running on http://localhost:${PORT}`);
  console.log(`Try: POST http://localhost:${PORT}/ai/incident/classify`);
  console.log(`Add ?model=basic to use the simple keyword model instead of ML`);
});