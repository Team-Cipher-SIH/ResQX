const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

// 1. GET ALL AUDIT LOGS (With optional filtering by severity or action, and pagination)
router.get('/', async (req, res) => {
  try {
    const { severity, action, limit = 50 } = req.query;
    let query = {};

    if (severity) query.severity = severity;
    if (action) query.action = new RegExp(action, 'i'); // Case-insensitive matching

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 }) // Newest logs first
      .limit(parseInt(limit));

    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// 2. CREATE A NEW AUDIT LOG ENTRY
router.post('/', async (req, res) => {
  try {
    // Automatically capture IP address if not provided in request body
    const ipAddress = req.body.ipAddress || req.ip || req.connection.remoteAddress;

    const newLog = new AuditLog({
      ...req.body,
      ipAddress
    });

    const savedLog = await newLog.save();
    res.status(201).json(savedLog);
  } catch (err) {
    res.status(400).json({ error: "Failed to record audit log", details: err.message });
  }
});

// 3. GET A SINGLE AUDIT LOG BY ID
router.get('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: "Audit log entry not found" });
    }
    res.status(200).json(log);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve log entry" });
  }
});

module.exports = router;