const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/config.js");

const generateAccessToken = (userOrId, roleArg, jurisdictionIdArg, authorityLevelArg) => {
  let id, role, jurisdictionId, authorityLevel;
  if (typeof userOrId === "object" && userOrId !== null) {
    id = userOrId._id || userOrId.id;
    role = userOrId.role;
    jurisdictionId =
      userOrId.jurisdictionId ||
      (userOrId.state && userOrId.district
        ? `${userOrId.state}_${userOrId.district}`.toUpperCase().replace(/\s+/g, "_")
        : userOrId.state
          ? userOrId.state.toUpperCase().replace(/\s+/g, "_")
          : null);
    authorityLevel = userOrId.authorityLevel || null;
  } else {
    id = userOrId;
    role = roleArg;
    jurisdictionId = jurisdictionIdArg || null;
    authorityLevel = authorityLevelArg || null;
  }

  return jwt.sign(
    {
      id,
      role,
      jurisdictionId: jurisdictionId || null,
      authorityLevel: authorityLevel || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );
};
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

// Helper for frontend display metadata (Display-only: Server never trusts frontend params for filtering)
const formatJurisdictionDisplay = (user) => {
  if (!user || user.role !== "authority") return null;
  const id =
    user.jurisdictionId ||
    (user.state && user.district
      ? `${user.state}_${user.district}`.toUpperCase().replace(/\s+/g, "_")
      : user.state
        ? user.state.toUpperCase().replace(/\s+/g, "_")
        : null);
  const name = [user.district, user.state].filter(Boolean).join(", ") || (user.authorityLevel === "central" ? "Central Authority" : null);
  return {
    id,
    name,
    level: user.authorityLevel || "district_admin",
    state: user.state || null,
    district: user.district || null,
  };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, authorityLevel, state, district, department } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3. Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let finalAuthorityLevel = authorityLevel;
    let finalJurisdictionId = req.body.jurisdictionId || null;

    if (role === "authority") {
      if (!finalAuthorityLevel) finalAuthorityLevel = "district_admin";
      if (!finalJurisdictionId) {
        if (state && district) {
          finalJurisdictionId = `${state}_${district}`.toUpperCase().replace(/\s+/g, "_");
        } else if (state) {
          finalJurisdictionId = `${state}`.toUpperCase().replace(/\s+/g, "_");
        }
      }
    } else if (role !== "admin") {
      // Citizens have no authority level or jurisdiction
      finalAuthorityLevel = null;
      finalJurisdictionId = null;
    }

    // 4. Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "citizen",
      authorityLevel: finalAuthorityLevel,
      jurisdictionId: finalJurisdictionId,
      state: role === "authority" ? state : (state || null),
      district: role === "authority" ? district : (district || null),
      department: role === "authority" ? department : null,
    });

    // 5. Generate token and respond
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);

    // refresh token DB mein save karo
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: "User registered succesfully",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorityLevel: user.authorityLevel,
      jurisdictionId: user.jurisdictionId,
      jurisdiction: formatJurisdictionDisplay(user),
      state: user.state,
      district: user.district,
      department: user.department,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// @desc   Login user
// @route  POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    // 1. Find user by email (case-insensitive & trimmed)
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { email: new RegExp(`^${normalizedEmail}$`, "i") },
      ],
    });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // 2. Compare entered password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // 3. Generate token and respond
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);
    
    // refresh token DB mein save karo
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorityLevel: user.authorityLevel,
      jurisdictionId: user.jurisdictionId || (user.state && user.district ? `${user.state}_${user.district}`.toUpperCase().replace(/\s+/g, "_") : user.state ? user.state.toUpperCase().replace(/\s+/g, "_") : null),
      jurisdiction: formatJurisdictionDisplay(user),
      state: user.state,
      district: user.district,
      department: user.department,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//Logout functionality
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.refreshToken = null;
    await user.save();
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update a user's role (admin only)
// @route  PATCH /api/auth/users/:userId/role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, authorityLevel, jurisdictionId, state, district, department } = req.body;

    // Validate role value
    const allowedRoles = ["citizen", "authority", "admin"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const allowedLevels = ["central", "state_admin", "district_admin", "field_responder", "department"];
    if (authorityLevel && !allowedLevels.includes(authorityLevel)) {
      return res.status(400).json({ message: "Invalid authority level" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (role !== undefined) user.role = role;
    if (authorityLevel !== undefined) user.authorityLevel = authorityLevel;
    if (state !== undefined) user.state = state;
    if (district !== undefined) user.district = district;
    if (department !== undefined) user.department = department;

    if (jurisdictionId !== undefined) {
      user.jurisdictionId = jurisdictionId;
    } else if (user.role === "authority") {
      // Auto-compute jurisdictionId if not explicitly provided
      if (user.state && user.district) {
        user.jurisdictionId = `${user.state}_${user.district}`.toUpperCase().replace(/\s+/g, "_");
      } else if (user.state) {
        user.jurisdictionId = `${user.state}`.toUpperCase().replace(/\s+/g, "_");
      }
    } else if (user.role === "citizen") {
      user.jurisdictionId = null;
      user.authorityLevel = null;
    }

    await user.save();

    res.status(200).json({
      message: "User role/authority updated successfully",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorityLevel: user.authorityLevel,
      jurisdictionId: user.jurisdictionId,
      jurisdiction: formatJurisdictionDisplay(user),
      state: user.state,
      district: user.district,
      department: user.department,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// @desc   Get new access token using refresh token
// @route  POST /api/auth/refresh
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user);

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// @desc   Get logged-in user's profile
// @route  GET /api/auth/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update logged-in user's profile
// @route  PATCH /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, department, isAvailable } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // sirf jo fields bheji gayi hain wahi update honi chahiye
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (department !== undefined) user.department = department;
    if (isAvailable !== undefined) user.isAvailable = isAvailable;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      department: user.department,
      isAvailable: user.isAvailable,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Provision a new Authority Officer (Hierarchical access)
// @route  POST /api/auth/officers
exports.provisionOfficer = async (req, res) => {
  try {
    const creator = req.user;
    const { name, email, password, phone, authorityLevel, state, district, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    // 1. Check existing user
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A user with this email already exists" });
    }

    // 2. Enforce Hierarchical Permissions
    let targetLevel = authorityLevel || "field_responder";
    let targetState = state;
    let targetDistrict = district;

    if (creator.role === "admin" || creator.authorityLevel === "central") {
      // Central admin can provision any role in any state/district
      targetState = state || null;
      targetDistrict = district || null;
    } else if (creator.authorityLevel === "state_admin") {
      // State admin can only provision within their state
      if (!creator.state) {
        return res.status(403).json({ success: false, message: "State admin does not have an assigned state" });
      }
      targetState = creator.state; // Lock to creator's state
      // State admin cannot create central authority
      if (targetLevel === "central") {
        return res.status(403).json({ success: false, message: "State admin cannot create central authorities" });
      }
    } else if (creator.authorityLevel === "district_admin") {
      // District admin can only provision within their state and district
      if (!creator.state || !creator.district) {
        return res.status(403).json({ success: false, message: "District admin does not have an assigned district" });
      }
      targetState = creator.state;
      targetDistrict = creator.district;
      // District admin can only create field_responder or department leads
      if (["central", "state_admin"].includes(targetLevel)) {
        return res.status(403).json({
          success: false,
          message: "District admin can only provision field responders and department personnel",
        });
      }
    } else {
      return res.status(403).json({ success: false, message: "Insufficient permissions to provision officers" });
    }

    // 3. Compute Jurisdiction ID
    let jurisdictionId = null;
    if (targetState && targetDistrict) {
      jurisdictionId = `${targetState}_${targetDistrict}`.toUpperCase().replace(/\s+/g, "_");
    } else if (targetState) {
      jurisdictionId = `${targetState}`.toUpperCase().replace(/\s+/g, "_");
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create Officer
    const officer = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone ? phone.trim() : null,
      role: "authority",
      authorityLevel: targetLevel,
      jurisdictionId,
      state: targetState,
      district: targetDistrict,
      department: department ? department.trim() : null,
      isAvailable: true,
    });

    return res.status(201).json({
      success: true,
      message: "Officer provisioned successfully",
      data: {
        _id: officer._id,
        name: officer.name,
        email: officer.email,
        phone: officer.phone,
        role: officer.role,
        authorityLevel: officer.authorityLevel,
        jurisdictionId: officer.jurisdictionId,
        jurisdiction: formatJurisdictionDisplay(officer),
        state: officer.state,
        district: officer.district,
        department: officer.department,
        isAvailable: officer.isAvailable,
        createdAt: officer.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to provision officer", error: error.message });
  }
};

// @desc   Get list of authority officers (Scoped by creator's jurisdiction)
// @route  GET /api/auth/officers
exports.getOfficers = async (req, res) => {
  try {
    const user = req.user;
    const { search, authorityLevel, department, state, district } = req.query;

    const filter = { role: { $in: ["authority", "admin"] } };

    // Enforce hierarchical jurisdiction filter
    if (user.role === "admin" || user.authorityLevel === "central") {
      if (state) filter.state = state;
      if (district) filter.district = district;
    } else if (user.authorityLevel === "state_admin") {
      filter.state = user.state;
      if (district) filter.district = district;
    } else if (user.authorityLevel === "district_admin") {
      filter.state = user.state;
      filter.district = user.district;
    } else {
      // Field responders only see themselves or teammates
      filter._id = user._id;
    }

    if (authorityLevel) filter.authorityLevel = authorityLevel;
    if (department) filter.department = department;

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { department: searchRegex },
        { jurisdictionId: searchRegex },
      ];
    }

    const officers = await User.find(filter)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: officers.length,
      data: officers.map((off) => ({
        ...off.toObject(),
        jurisdiction: formatJurisdictionDisplay(off),
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch officers", error: error.message });
  }
};