const { Supply, SUPPLY_CATEGORIES, computeSupplyStatus } = require("../models/supply.model");
const Shelter = require("../models/shelter.model");
const ActivityLog = require("../models/activitylog.model");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { validateObjectId, checkJurisdictionAccess } = require("../middleware/jurisdiction.middleware");
const { emitToJurisdiction } = require("../config/socket");

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
  } catch {
    // ignore
  }
  return null;
};

// @desc   Create a new supply item linked to a shelter
// @route  POST /api/supplies
const createSupply = async (req, res) => {
  try {
    const { name, category, shelter: shelterId, quantity, unit, minimumStock } = req.body;

    if (!name || !category || !shelterId || !unit) {
      return res.status(400).json({
        success: false,
        message: "name, category, shelter, and unit are required fields",
      });
    }

    if (!SUPPLY_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed categories: ${SUPPLY_CATEGORIES.join(", ")}`,
      });
    }

    if (!validateObjectId(shelterId)) {
      return res.status(400).json({ success: false, message: "Invalid shelter ID format" });
    }

    const shelterDoc = await Shelter.findById(shelterId);
    if (!shelterDoc) {
      return res.status(404).json({ success: false, message: "Associated shelter not found" });
    }

    // Verify user has jurisdiction over this shelter
    if (!checkJurisdictionAccess(req.user, shelterDoc)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cannot register supplies for a shelter outside your jurisdiction",
      });
    }

    const numQuantity = Math.max(0, parseInt(quantity) || 0);
    const numMinStock = Math.max(0, parseInt(minimumStock) || 0);

    const supply = new Supply({
      name: name.trim(),
      category,
      shelter: shelterDoc._id,
      state: shelterDoc.state,
      district: shelterDoc.district,
      quantity: numQuantity,
      unit: unit.trim(),
      minimumStock: numMinStock,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await supply.save();
    const populated = await Supply.findById(supply._id)
      .populate("shelter", "name address state district capacity currentOccupancy contactNumber isActive location")
      .populate("updatedBy", "name email");

    // Log Activity
    try {
      await ActivityLog.create({
        action: "supply_created",
        description: `Supply "${supply.name}" (${supply.quantity} ${supply.unit}) registered at "${shelterDoc.name}" [${supply.district}, ${supply.state}]`,
        performedBy: req.user._id,
        state: supply.state,
        district: supply.district,
        metadata: {
          supplyId: supply._id,
          shelterId: shelterDoc._id,
          category: supply.category,
          quantity: supply.quantity,
          unit: supply.unit,
        },
      });
    } catch (logErr) {
      console.warn("ActivityLog error on supply creation:", logErr.message);
    }

    // Realtime notification
    try {
      emitToJurisdiction(supply.state, supply.district, "supply_created", populated);
    } catch {
      // ignore
    }

    res.status(201).json({ success: true, message: "Supply item registered successfully", data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create supply item", error: err.message });
  }
};

// @desc   Get all supply items with strict jurisdiction enforcement and rich filtering
// @route  GET /api/supplies
const getSupplies = async (req, res) => {
  try {
    const user = req.user || (await extractUserFromToken(req));
    const { state, district, shelter, category, status, search, limit, page } = req.query;

    const query = {};

    // 1. Enforce jurisdiction from authenticated user
    if (user && user.role !== "admin" && user.authorityLevel !== "central" && user.role !== "citizen") {
      if (user.authorityLevel === "state_admin" && user.state) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
        if (district) query.district = { $regex: new RegExp(`^${district.trim()}$`, "i") };
      } else if (user.authorityLevel === "district_admin" && user.state && user.district) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
        query.district = { $regex: new RegExp(`^${user.district.trim()}$`, "i") };
      } else if (user.state && user.district) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
        query.district = { $regex: new RegExp(`^${user.district.trim()}$`, "i") };
      }
    } else {
      // Central or unauthenticated query parameters
      if (state && state !== "all") {
        query.state = { $regex: new RegExp(`^${state.trim()}$`, "i") };
      }
      if (district && district !== "all") {
        query.district = { $regex: new RegExp(`^${district.trim()}$`, "i") };
      }
    }

    if (shelter && validateObjectId(shelter)) {
      query.shelter = shelter;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (status && status !== "all") {
      query.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { district: regex }, { unit: regex }];
    }

    const pageSize = parseInt(limit) || 100;
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * pageSize;

    const [supplies, totalCount] = await Promise.all([
      Supply.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("shelter", "name address state district capacity currentOccupancy contactNumber isActive location")
        .populate("updatedBy", "name email"),
      Supply.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: supplies.length,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / pageSize),
      data: supplies,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch supply inventory", error: err.message });
  }
};

// @desc   Get single supply item by ID
// @route  GET /api/supplies/:id
const getSupplyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid supply ID format" });
    }

    const supply = await Supply.findById(id)
      .populate("shelter", "name address state district capacity currentOccupancy contactNumber isActive location")
      .populate("updatedBy", "name email")
      .populate("createdBy", "name email");

    if (!supply) {
      return res.status(404).json({ success: false, message: "Supply item not found" });
    }

    const user = req.user || (await extractUserFromToken(req));
    if (user && !checkJurisdictionAccess(user, supply)) {
      return res.status(403).json({ success: false, message: "Forbidden: Supply item is outside your jurisdiction" });
    }

    res.status(200).json({ success: true, data: supply });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch supply item", error: err.message });
  }
};

// @desc   Update supply metadata or thresholds
// @route  PATCH /api/supplies/:id
const updateSupply = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid supply ID format" });
    }

    const supply = await Supply.findById(id);
    if (!supply) {
      return res.status(404).json({ success: false, message: "Supply item not found" });
    }

    if (!checkJurisdictionAccess(req.user, supply)) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot edit supply outside your jurisdiction" });
    }

    const { name, category, quantity, unit, minimumStock, isAvailable } = req.body;

    if (name) supply.name = name.trim();
    if (category) {
      if (!SUPPLY_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: "Invalid supply category" });
      }
      supply.category = category;
    }
    if (unit) supply.unit = unit.trim();
    if (minimumStock !== undefined) {
      const min = parseInt(minimumStock);
      if (min < 0) return res.status(400).json({ success: false, message: "minimumStock cannot be negative" });
      supply.minimumStock = min;
    }
    if (quantity !== undefined) {
      const q = parseInt(quantity);
      if (q < 0) return res.status(400).json({ success: false, message: "quantity cannot be negative" });
      supply.quantity = q;
    }
    if (isAvailable !== undefined) {
      supply.isAvailable = Boolean(isAvailable);
    }

    supply.updatedBy = req.user._id;
    await supply.save();

    const populated = await Supply.findById(supply._id)
      .populate("shelter", "name address state district capacity currentOccupancy contactNumber isActive location")
      .populate("updatedBy", "name email");

    // Log Activity
    try {
      await ActivityLog.create({
        action: "supply_updated",
        description: `Supply "${supply.name}" updated at shelter in ${supply.district}, ${supply.state} (Current: ${supply.quantity} ${supply.unit})`,
        performedBy: req.user._id,
        state: supply.state,
        district: supply.district,
        metadata: { supplyId: supply._id, quantity: supply.quantity, minimumStock: supply.minimumStock },
      });
    } catch (logErr) {
      console.warn("ActivityLog error on supply update:", logErr.message);
    }

    // Realtime notification
    try {
      emitToJurisdiction(supply.state, supply.district, "supply_updated", populated);
    } catch {
      // ignore
    }

    res.status(200).json({ success: true, message: "Supply updated successfully", data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update supply", error: err.message });
  }
};

// @desc   Adjust supply stock (ADD, REMOVE, SET)
// @route  PATCH /api/supplies/:id/stock
const adjustSupplyStock = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid supply ID format" });
    }

    const supply = await Supply.findById(id);
    if (!supply) {
      return res.status(404).json({ success: false, message: "Supply item not found" });
    }

    if (!checkJurisdictionAccess(req.user, supply)) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot adjust stock outside your jurisdiction" });
    }

    const { action, amount, note } = req.body;
    const numAmount = parseInt(amount);

    if (!action || isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Action ("ADD", "REMOVE", "SET") and non-negative amount are required',
      });
    }

    const oldQuantity = supply.quantity;
    let newQuantity = oldQuantity;

    const upperAction = action.toUpperCase();
    if (upperAction === "ADD") {
      newQuantity = oldQuantity + numAmount;
    } else if (upperAction === "REMOVE") {
      if (oldQuantity < numAmount) {
        return res.status(400).json({
          success: false,
          message: `Cannot remove ${numAmount} ${supply.unit}. Available stock is only ${oldQuantity} ${supply.unit}.`,
        });
      }
      newQuantity = oldQuantity - numAmount;
    } else if (upperAction === "SET") {
      newQuantity = numAmount;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "ADD", "REMOVE", or "SET"',
      });
    }

    supply.quantity = newQuantity;
    supply.updatedBy = req.user._id;
    await supply.save();

    const populated = await Supply.findById(supply._id)
      .populate("shelter", "name address state district capacity currentOccupancy contactNumber isActive location")
      .populate("updatedBy", "name email");

    // Log Activity
    try {
      const actionText =
        upperAction === "ADD"
          ? `Stock +${numAmount} ${supply.unit} added`
          : upperAction === "REMOVE"
          ? `Stock -${numAmount} ${supply.unit} dispatched`
          : `Stock adjusted to ${newQuantity} ${supply.unit}`;

      await ActivityLog.create({
        action: "supply_stock_updated",
        description: `${actionText} for "${supply.name}" (${oldQuantity} → ${newQuantity} ${supply.unit})${note ? ` [Note: ${note}]` : ""}`,
        performedBy: req.user._id,
        state: supply.state,
        district: supply.district,
        metadata: {
          supplyId: supply._id,
          action: upperAction,
          adjustment: numAmount,
          oldQuantity,
          newQuantity,
          note: note || null,
        },
      });
    } catch (logErr) {
      console.warn("ActivityLog error on stock adjustment:", logErr.message);
    }

    // Realtime notification
    try {
      emitToJurisdiction(supply.state, supply.district, "supply_stock_updated", populated);
    } catch {
      // ignore
    }

    res.status(200).json({
      success: true,
      message: `Stock updated successfully (${oldQuantity} → ${newQuantity} ${supply.unit})`,
      data: populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to adjust stock", error: err.message });
  }
};

// @desc   Soft-deactivate supply item (quantity=0, isAvailable=false)
// @route  DELETE /api/supplies/:id
const deleteSupply = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid supply ID format" });
    }

    const supply = await Supply.findById(id);
    if (!supply) {
      return res.status(404).json({ success: false, message: "Supply item not found" });
    }

    if (!checkJurisdictionAccess(req.user, supply)) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot delete supply outside your jurisdiction" });
    }

    supply.isAvailable = false;
    supply.quantity = 0;
    supply.updatedBy = req.user._id;
    await supply.save();

    try {
      await ActivityLog.create({
        action: "supply_deactivated",
        description: `Supply "${supply.name}" was marked depleted/deactivated in ${supply.district}, ${supply.state}`,
        performedBy: req.user._id,
        state: supply.state,
        district: supply.district,
        metadata: { supplyId: supply._id },
      });
    } catch (logErr) {
      console.warn("ActivityLog error on supply deactivation:", logErr.message);
    }

    res.status(200).json({ success: true, message: "Supply item marked unavailable", data: supply });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to deactivate supply", error: err.message });
  }
};

// @desc   Public safe nearby relief supplies availability for Citizens
// @route  GET /api/supplies/public?lng=&lat=&maxDistance=
const getPublicNearbySupplies = async (req, res) => {
  try {
    const { lng, lat, maxDistance } = req.query;

    let shelters = [];
    if (lng && lat) {
      shelters = await Shelter.find({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: maxDistance ? parseInt(maxDistance) : 50000, // 50km
          },
        },
      }).select("name address state district capacity currentOccupancy contactNumber location");
    } else {
      shelters = await Shelter.find({ isActive: true })
        .limit(20)
        .select("name address state district capacity currentOccupancy contactNumber location");
    }

    const shelterIds = shelters.map((s) => s._id);
    const supplies = await Supply.find({
      shelter: { $in: shelterIds },
      isAvailable: true,
    }).select("shelter category status quantity");

    // Aggregate simplified public status for each shelter
    const publicResults = shelters.map((shelter) => {
      const sSupplies = supplies.filter((s) => s.shelter.toString() === shelter._id.toString());

      const getCategoryAvailability = (categoryName) => {
        const items = sSupplies.filter((s) => s.category.toLowerCase() === categoryName.toLowerCase());
        if (items.length === 0) return "unavailable";
        const anyCritical = items.some((i) => i.status === "CRITICAL" || i.status === "OUT_OF_STOCK");
        const anyAvailable = items.some((i) => i.status === "AVAILABLE");
        if (anyAvailable && !anyCritical) return "available";
        if (anyAvailable || items.some((i) => i.status === "LOW")) return "limited";
        return "unavailable";
      };

      const occ = shelter.currentOccupancy || 0;
      const cap = shelter.capacity || 0;
      const availCap = Math.max(0, cap - occ);

      return {
        _id: shelter._id,
        name: shelter.name,
        address: shelter.address,
        state: shelter.state,
        district: shelter.district,
        capacity: cap,
        availableCapacity: availCap,
        contactNumber: shelter.contactNumber,
        location: shelter.location,
        supplies: {
          water: getCategoryAvailability("Water"),
          food: getCategoryAvailability("Food"),
          medicine: getCategoryAvailability("Medicine"),
          firstAid: getCategoryAvailability("First Aid"),
          blankets: getCategoryAvailability("Blankets"),
          tents: getCategoryAvailability("Tents"),
          hygiene: getCategoryAvailability("Hygiene"),
        },
      };
    });

    res.status(200).json({ success: true, count: publicResults.length, data: publicResults });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch public relief supplies", error: err.message });
  }
};

// @desc   Get inventory statistics for authority dashboard
// @route  GET /api/supplies/stats
const getSupplyStats = async (req, res) => {
  try {
    const user = req.user || (await extractUserFromToken(req));
    const query = {};

    if (user && user.role !== "admin" && user.authorityLevel !== "central" && user.role !== "citizen") {
      if (user.authorityLevel === "state_admin" && user.state) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
      } else if (user.authorityLevel === "district_admin" && user.state && user.district) {
        query.state = { $regex: new RegExp(`^${user.state.trim()}$`, "i") };
        query.district = { $regex: new RegExp(`^${user.district.trim()}$`, "i") };
      }
    }

    const supplies = await Supply.find(query);

    let totalItems = supplies.length;
    let availableCount = 0;
    let lowCount = 0;
    let criticalCount = 0;
    let outOfStockCount = 0;

    let totalWaterLitres = 0;
    let totalFoodKits = 0;
    let totalMedicineItems = 0;
    let totalBlankets = 0;

    supplies.forEach((s) => {
      const st = s.status;
      if (st === "AVAILABLE") availableCount++;
      else if (st === "LOW") lowCount++;
      else if (st === "CRITICAL") criticalCount++;
      else if (st === "OUT_OF_STOCK") outOfStockCount++;

      const cat = (s.category || "").toLowerCase();
      if (cat === "water") totalWaterLitres += s.quantity;
      else if (cat === "food") totalFoodKits += s.quantity;
      else if (cat === "medicine" || cat === "first aid") totalMedicineItems += s.quantity;
      else if (cat === "blankets") totalBlankets += s.quantity;
    });

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        availableCount,
        lowCount,
        criticalCount,
        outOfStockCount,
        categoryTotals: {
          water: totalWaterLitres,
          food: totalFoodKits,
          medicine: totalMedicineItems,
          blankets: totalBlankets,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch supply statistics", error: err.message });
  }
};

module.exports = {
  createSupply,
  getSupplies,
  getSupplyById,
  updateSupply,
  adjustSupplyStock,
  deleteSupply,
  getPublicNearbySupplies,
  getSupplyStats,
};
