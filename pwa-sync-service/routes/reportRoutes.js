const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// 1. DEDUPLICATED SYNC ROUTE
router.post('/sync', async (req, res) => {
  try {
    const reports = Array.isArray(req.body) ? req.body : [req.body];

    if (reports.length === 0) {
      return res.status(200).json({ message: "No reports to sync." });
    }

    // Bulk write query to prevent duplicate records
    const bulkOperations = reports.map(report => ({
      updateOne: {
        filter: { clientReportId: report.clientReportId },
        update: { $setOnInsert: report }, // Aggar ID pehle se hai to skip kar dega
        upsert: true
      }
    }));

    const result = await Report.bulkWrite(bulkOperations);

    res.status(200).json({
      message: "Sync batch processed successfully",
      newlyInserted: result.upsertedCount,
      alreadyExistedSkipped: result.matchedCount
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to sync reports", details: err.message });
  }
});

// 2. GET ALL REPORTS
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

module.exports = router;