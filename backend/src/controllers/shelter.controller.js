const Shelter = require("../models/shelter.model");
const ActivityLog = require("../models/activitylog.model");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { validateObjectId, checkJurisdictionAccess } = require("../middleware/jurisdiction.middleware");

// Helper to extract user from token if present (for optional auth routes)
const extractUserFromToken = async (req) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      const token = req.headers.authorization.split(" ")[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await User.findById(decoded.id).select("-password");
      }
    }
  } catch (err) {
    // Ignore invalid token on optional auth
  }
  return null;
};

// @desc   Create a new shelter (authority/admin only, jurisdiction-aware)
// @route  POST /api/shelters
const createShelter = async (req, res) => {
  try {
    let { name, address, state, district, capacity, currentOccupancy, contactNumber, coordinates, isActive } = req.body;

    if (typeof coordinates === "string") {
      try {
        coordinates = JSON.parse(coordinates);
      } catch (e) {
        return res.status(400).json({ success: false, message: "coordinates must be a valid JSON array" });
      }
    }

    if (!name || !address || !state || !district || !coordinates) {
      return res.status(400).json({
        success: false,
        message: "name, address, state, district, and coordinates are required",
      });
    }

    if (!Array.isArray(coordinates) || coordinates.length !== 2 || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
      return res.status(400).json({
        success: false,
        message: "coordinates must be an array of [longitude, latitude]",
      });
    }

    const numCapacity = parseInt(capacity) || 0;
    const numOccupancy = parseInt(currentOccupancy) || 0;

    if (numCapacity < 0) {
      return res.status(400).json({ success: false, message: "Capacity cannot be negative" });
    }
    if (numOccupancy < 0) {
      return res.status(400).json({ success: false, message: "Occupancy cannot be negative" });
    }
    if (numOccupancy > numCapacity) {
      return res.status(400).json({ success: false, message: "Current occupancy cannot exceed shelter capacity" });
    }

    // Jurisdiction enforcement on create
    const user = req.user;
    if (user.role !== "admin" && user.authorityLevel !== "central") {
      if (user.authorityLevel === "state_admin") {
        if (!user.state || user.state.toLowerCase() !== state.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: State Admin can only create shelters in ${user.state}`,
          });
        }
      } else if (user.authorityLevel === "district_admin") {
        if (
          !user.state ||
          !user.district ||
          user.state.toLowerCase() !== state.toLowerCase() ||
          user.district.toLowerCase() !== district.toLowerCase()
        ) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: District Admin can only create shelters in ${user.district}, ${user.state}`,
          });
        }
      }
    }

    const shelter = await Shelter.create({
      name: name.trim(),
      address: address.trim(),
      state: state.trim(),
      district: district.trim(),
      capacity: numCapacity,
      currentOccupancy: numOccupancy,
      contactNumber: contactNumber ? contactNumber.trim() : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      location: { type: "Point", coordinates },
      createdBy: req.user._id,
    });

    // Log Activity
    try {
      await ActivityLog.create({
        action: "shelter_created",
        description: `Shelter "${shelter.name}" created in ${shelter.district}, ${shelter.state} (Capacity: ${shelter.capacity})`,
        performedBy: req.user._id,
        state: shelter.state,
        district: shelter.district,
        metadata: { shelterId: shelter._id, capacity: shelter.capacity },
      });
    } catch (logErr) {
      console.warn("ActivityLog error for shelter creation:", logErr.message);
    }

    res.status(201).json({ success: true, message: "Shelter created successfully", data: shelter });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create shelter", error: err.message });
  }
};

// @desc   Get all shelters (jurisdiction-aware, filterable)
// @route  GET /api/shelters
const getAllShelters = async (req, res) => {
  try {
    const user = req.user || (await extractUserFromToken(req));
    const { state, district, isActive, search, status } = req.query;

    const query = {};

    // Jurisdiction filtering if user is authenticated authority
    if (user && user.role !== "admin" && user.authorityLevel !== "central" && user.role !== "citizen") {
      if (user.authorityLevel === "state_admin" && user.state) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
      } else if (user.authorityLevel === "district_admin" && user.state && user.district) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
        query.district = { $regex: new RegExp(`^${user.district.trim()}$`, "i") };
      } else if (user.state && user.district) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
        query.district = { $regex: new RegExp(`^${user.district.trim()}$`, "i") };
      }
    } else {
      // Query parameters for unauthenticated/central users
      if (state) {
        query.state = { $regex: new RegExp(`^${state.trim()}$`, "i") };
      }
      if (district) {
        query.district = { $regex: new RegExp(`^${district.trim()}$`, "i") };
      }
    }

    // Active status filter (default: if unauthenticated/citizen, show only active)
    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    } else if (!user || user.role === "citizen") {
      query.isActive = true;
    }

    // Text search by name, address, or district
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { address: regex }, { district: regex }];
    }

    let shelters = await Shelter.find(query).sort({ createdAt: -1 });

    // In-memory status filtering if requested (open, full, near_capacity, inactive)
    if (status) {
      const lowerStatus = status.toLowerCase();
      shelters = shelters.filter((s) => {
        if (!s.isActive) return lowerStatus === "inactive";
        const occPct = s.capacity > 0 ? (s.currentOccupancy / s.capacity) * 100 : 0;
        if (lowerStatus === "full") return occPct >= 100;
        if (lowerStatus === "near_capacity" || lowerStatus === "near capacity") return occPct >= 85 && occPct < 100;
        if (lowerStatus === "open") return occPct < 85;
        return true;
      });
    }

    res.status(200).json({ success: true, count: shelters.length, data: shelters });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch shelters", error: err.message });
  }
};

// @desc   Get a single shelter by ID
// @route  GET /api/shelters/:id
const getShelterById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid shelter ID format" });
    }

    const shelter = await Shelter.findById(id);
    if (!shelter) {
      return res.status(404).json({ success: false, message: "Shelter not found" });
    }

    const user = req.user || (await extractUserFromToken(req));
    if (user && !checkJurisdictionAccess(user, shelter)) {
      return res.status(403).json({ success: false, message: "Forbidden: Access outside your jurisdiction" });
    }

    res.status(200).json({ success: true, data: shelter });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch shelter", error: err.message });
  }
};

// @desc   Update a shelter (authority/admin only, jurisdiction-aware)
// @route  PATCH /api/shelters/:id
const updateShelter = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid shelter ID format" });
    }

    const shelter = await Shelter.findById(id);
    if (!shelter) {
      return res.status(404).json({ success: false, message: "Shelter not found" });
    }

    // Jurisdiction check
    if (!checkJurisdictionAccess(req.user, shelter)) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot modify shelter outside your jurisdiction" });
    }

    let { name, address, state, district, capacity, currentOccupancy, contactNumber, isActive, coordinates } = req.body;

    if (typeof coordinates === "string") {
      try {
        coordinates = JSON.parse(coordinates);
      } catch (e) {
        return res.status(400).json({ success: false, message: "coordinates must be a valid JSON array" });
      }
    }

    // Prevent jurisdiction escalation
    if (state && req.user.authorityLevel === "state_admin" && req.user.state.toLowerCase() !== state.toLowerCase()) {
      return res.status(403).json({ success: false, message: `Forbidden: Cannot move shelter to state other than ${req.user.state}` });
    }
    if (district && req.user.authorityLevel === "district_admin" && req.user.district.toLowerCase() !== district.toLowerCase()) {
      return res.status(403).json({ success: false, message: `Forbidden: Cannot move shelter to district other than ${req.user.district}` });
    }

    const newCapacity = capacity !== undefined ? parseInt(capacity) : shelter.capacity;
    const newOccupancy = currentOccupancy !== undefined ? parseInt(currentOccupancy) : shelter.currentOccupancy;

    if (newCapacity < 0) {
      return res.status(400).json({ success: false, message: "Capacity cannot be negative" });
    }
    if (newOccupancy < 0) {
      return res.status(400).json({ success: false, message: "Occupancy cannot be negative" });
    }
    if (newOccupancy > newCapacity) {
      return res.status(400).json({ success: false, message: "Current occupancy cannot exceed shelter capacity" });
    }

    if (name) shelter.name = name.trim();
    if (address) shelter.address = address.trim();
    if (state) shelter.state = state.trim();
    if (district) shelter.district = district.trim();
    if (capacity !== undefined) shelter.capacity = newCapacity;
    if (currentOccupancy !== undefined) shelter.currentOccupancy = newOccupancy;
    if (contactNumber !== undefined) shelter.contactNumber = contactNumber ? contactNumber.trim() : null;
    if (isActive !== undefined) shelter.isActive = Boolean(isActive);

    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2 && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1])) {
      shelter.location = { type: "Point", coordinates };
    }

    await shelter.save();

    // Log Activity
    try {
      await ActivityLog.create({
        action: "shelter_updated",
        description: `Shelter "${shelter.name}" updated in ${shelter.district}, ${shelter.state} (Occupancy: ${shelter.currentOccupancy}/${shelter.capacity})`,
        performedBy: req.user._id,
        state: shelter.state,
        district: shelter.district,
        metadata: { shelterId: shelter._id, capacity: shelter.capacity, currentOccupancy: shelter.currentOccupancy },
      });
    } catch (logErr) {
      console.warn("ActivityLog error for shelter update:", logErr.message);
    }

    res.status(200).json({ success: true, message: "Shelter updated successfully", data: shelter });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update shelter", error: err.message });
  }
};

// @desc   Deactivate / Soft Delete a shelter (authority/admin only)
// @route  DELETE /api/shelters/:id
const deactivateShelter = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid shelter ID format" });
    }

    const shelter = await Shelter.findById(id);
    if (!shelter) {
      return res.status(404).json({ success: false, message: "Shelter not found" });
    }

    if (!checkJurisdictionAccess(req.user, shelter)) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot deactivate shelter outside your jurisdiction" });
    }

    shelter.isActive = false;
    await shelter.save();

    try {
      await ActivityLog.create({
        action: "shelter_deactivated",
        description: `Shelter "${shelter.name}" in ${shelter.district}, ${shelter.state} was deactivated`,
        performedBy: req.user._id,
        state: shelter.state,
        district: shelter.district,
        metadata: { shelterId: shelter._id },
      });
    } catch (logErr) {
      console.warn("ActivityLog error for shelter deactivation:", logErr.message);
    }

    res.status(200).json({ success: true, message: "Shelter deactivated successfully", data: shelter });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to deactivate shelter", error: err.message });
  }
};

// @desc   Get shelters near a location (public / citizen)
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

module.exports = {
  createShelter,
  getAllShelters,
  getNearbyShelters,
  getShelterById,
  updateShelter,
  deactivateShelter,
};