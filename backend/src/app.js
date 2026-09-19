const express=require("express");
const authRouter = require("./routes/auth.route.js");
const incidentRoutes = require("./routes/incident.route.js");
const alertRoutes = require("./routes/alert.route.js");
const shelterRouter = require("./routes/shelter.route");
const supplyRouter = require("./routes/supply.route");
const helpPostRouter = require("./routes/helppost.route");
const riskAssessmentRoutes = require('./routes/riskAssessment.routes');
const preparednessRoutes = require('./routes/preparedness.route');
const externalDataRoutes = require('./routes/externalData.route');
const app=express();
const cors = require("cors");
app.use(cors());
app.use(express.json());


app.use('/api/risk', riskAssessmentRoutes);
app.use('/api/preparedness', preparednessRoutes);
app.use('/api/external-data', externalDataRoutes);
app.use("/api/auth",authRouter);
app.use("/api/incidents", incidentRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/shelters", shelterRouter);
app.use("/api/supplies", supplyRouter);
app.use("/api/help-posts", helpPostRouter);


const teamRoutes = require("./routes/responseteam.route.js");
const dispatchRoutes = require("./routes/dispatch.route.js");
const dashboardRoutes = require("./routes/dashboard.route.js");
const aiRoutes = require("./routes/ai.route.js");
const auditRoutes = require("./routes/audit.route.js");


app.use("/api/teams", teamRoutes);
app.use("/api/dispatches", dispatchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/audit-logs", auditRoutes);

// Health check root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ResQtech Disaster & Civic Resilience Platform API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// 404 Catch-All for unmatched API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: [${req.method}] ${req.originalUrl}`,
  });
});

// Global Express error-handling middleware (Zero-Crash Guarantee)
app.use((err, req, res, next) => {
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error occurred",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

module.exports = app;