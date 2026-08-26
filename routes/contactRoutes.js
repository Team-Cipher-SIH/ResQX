const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// 1. GET ALL CONTACTS (with optional region/category search)
router.get('/', async (req, res) => {
  try {
    const { region, category } = req.query;
    let query = {};

    if (region) query.region = new RegExp(region, 'i'); // Case-insensitive
    if (category) query.category = category;

    const contacts = await Contact.find(query).sort({ priorityLevel: 1 });
    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch emergency contacts" });
  }
});

// 2. POST A NEW CONTACT
router.post('/', async (req, res) => {
  try {
    const newContact = new Contact(req.body);
    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (err) {
    res.status(400).json({ error: "Failed to create contact", details: err.message });
  }
});

module.exports = router;