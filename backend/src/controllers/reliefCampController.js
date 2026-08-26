const ReliefCamp = require("../models/reliefCamp");

// POST /api/relief-camps
const createReliefCamp = async (req, res) => {
  try {
    const { name, coordinates, address, state, district, capacity, contactPerson, contactNumber, supplies } = req.body;

    if (!name || !coordinates || !state || !district || !capacity) {
      return res.status(400).json({
        success: false,
        message: "name, coordinates, state, district, and capacity are required",
      });
    }

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "coordinates must be an array of [longitude, latitude]",
      });
    }

    const camp = await ReliefCamp.create({
      name,
      location: { type: "Point", coordinates },
      address,
      state,
      district,
      capacity,
      currentOccupancy: 0,
      contactPerson,
      contactNumber,
      supplies: supplies || undefined,
      managedBy: req.body.managedBy || null,
    });

    res.status(201).json({ success: true, message: "Relief camp created successfully", data: camp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create relief camp", error: err.message });
  }
};

// GET /api/relief-camps?status=&district=&state=
// Step 4: list with filters, same dynamic-filter pattern as Incident/Alert
const getReliefCamps = async (req, res) => {
  try {
    const { status, district, state } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (district) filter.district = district;
    if (state) filter.state = state;

    const camps = await ReliefCamp.find(filter).sort({ createdAt: -1 }).limit(200);

    res.status(200).json({ success: true, count: camps.length, data: camps });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch relief camps", error: err.message });
  }
};

// PATCH /api/relief-camps/:id/update
// Step 5: update occupancy and/or supplies as the situation changes on the
// ground. Partial updates are allowed — you might only want to bump
// occupancy without touching supplies, or vice versa.
const updateReliefCamp = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentOccupancy, supplies } = req.body;

    const camp = await ReliefCamp.findById(id);
    if (!camp) {
      return res.status(404).json({ success: false, message: "Relief camp not found" });
    }

    if (camp.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a closed relief camp",
      });
    }

    if (currentOccupancy !== undefined) {
      if (currentOccupancy < 0 || currentOccupancy > camp.capacity) {
        return res.status(400).json({
          success: false,
          message: `currentOccupancy must be between 0 and capacity (${camp.capacity})`,
        });
      }
      camp.currentOccupancy = currentOccupancy;
      // Auto-flip status to "full" when occupancy hits capacity — saves the
      // authority from having to remember to do this manually every time.
      camp.status = currentOccupancy >= camp.capacity ? "full" : "active";
    }

    if (supplies) {
      // Merge instead of replace — so sending only { food: "low" } doesn't
      // wipe out the other three supply fields.
      camp.supplies = { ...camp.supplies.toObject(), ...supplies };
    }

    await camp.save();

    res.status(200).json({ success: true, message: "Relief camp updated successfully", data: camp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update relief camp", error: err.message });
  }
};

// PATCH /api/relief-camps/:id/close
// Step 6: close a camp permanently (e.g. situation resolved, camp
// decommissioned). Unlike update, this is a one-way action.
const closeReliefCamp = async (req, res) => {
  try {
    const { id } = req.params;

    const camp = await ReliefCamp.findById(id);
    if (!camp) {
      return res.status(404).json({ success: false, message: "Relief camp not found" });
    }

    if (camp.status === "closed") {
      return res.status(400).json({ success: false, message: "Relief camp is already closed" });
    }

    camp.status = "closed";
    await camp.save();

    res.status(200).json({ success: true, message: "Relief camp closed successfully", data: camp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to close relief camp", error: err.message });
  }
};

module.exports = { createReliefCamp, getReliefCamps, updateReliefCamp, closeReliefCamp };