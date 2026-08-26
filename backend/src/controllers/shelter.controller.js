const Shelter = require("../models/shelter.model");

// @desc   Create a new shelter (authority/admin only)
// @route  POST /api/shelters
const createShelter = async (req, res) => {
  try {
    const { name, address, state, district, capacity, contactNumber, coordinates } = req.body;

    if (!name || !address || !state || !district || !coordinates) {
      return res.status(400).json({
        success: false,
        message: "name, address, state, district, and coordinates are required",
      });
    }

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "coordinates must be an array of [longitude, latitude]",
      });
    }

    const shelter = await Shelter.create({
      name,
      address,
      state,
      district,
      capacity: capacity || 0,
      contactNumber,
      location: { type: "Point", coordinates },
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: "Shelter added successfully", data: shelter });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create shelter", error: err.message });
  }
};

// @desc   Get shelters near the citizen's location, sorted by distance
// @route  GET /api/shelters/nearby?lng=&lat=&maxDistance=
const getNearbyShelters = async (req, res) => {
  try {
    const { lng, lat, maxDistance } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: "lng and lat query params are required",
      });
    }

    const shelters = await Shelter.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: maxDistance ? parseInt(maxDistance) : 50000, // default 50km
        },
      },
    });

    res.status(200).json({ success: true, count: shelters.length, data: shelters });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch nearby shelters", error: err.message });
  }
};

// @desc   Get all shelters (list view, no distance sorting)
// @route  GET /api/shelters
const getAllShelters = async (req, res) => {
  try {
    const shelters = await Shelter.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: shelters.length, data: shelters });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch shelters", error: err.message });
  }
};

module.exports = { createShelter, getNearbyShelters, getAllShelters };