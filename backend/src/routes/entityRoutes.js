const express = require('express');
const router = express.Router();
const Entity = require('../models/Entity');

// 1. GET ALL RESPONDERS / DEPARTMENTS (with optional filtering by district, status, or type)
router.get('/', async (req, res) => {
  try {
    const { district, status, type } = req.query;
    let query = {};

    if (district) query.district = new RegExp(district, 'i'); // Case-insensitive filter
    if (status) query.availabilityStatus = status;
    if (type) query.type = type;

    const entities = await Entity.find(query).sort({ createdAt: -1 });
    res.status(200).json(entities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch directory entities" });
  }
});

// 2. CREATE A NEW RESPONDER OR DEPARTMENT
router.post('/', async (req, res) => {
  try {
    const newEntity = new Entity(req.body);
    const savedEntity = await newEntity.save();
    res.status(201).json(savedEntity);
  } catch (err) {
    res.status(400).json({ error: "Failed to create entity", details: err.message });
  }
});

// 3. UPDATE AVAILABILITY STATUS ONLY (Quick update for field teams)
router.patch('/:id/status', async (req, res) => {
  try {
    const { availabilityStatus } = req.body;
    const updatedEntity = await Entity.findByIdAndUpdate(
      req.params.id,
      { availabilityStatus },
      { new: true, runValidators: true }
    );

    if (!updatedEntity) {
      return res.status(404).json({ error: "Entity not found" });
    }

    res.status(200).json(updatedEntity);
  } catch (err) {
    res.status(400).json({ error: "Failed to update status", details: err.message });
  }
});

// 4. DELETE A RESPONDER / DEPARTMENT
router.delete('/:id', async (req, res) => {
  try {
    const deletedEntity = await Entity.findByIdAndDelete(req.params.id);
    if (!deletedEntity) {
      return res.status(404).json({ error: "Entity not found" });
    }
    res.status(200).json({ message: "Entity deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entity" });
  }
});

module.exports = router;