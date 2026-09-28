const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// Step 1: Verify token, attach user to request
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach verified token claims
    req.tokenClaims = decoded;

    // Ensure jurisdictionId is consistently populated on req.user
    if (!user.jurisdictionId && decoded.jurisdictionId) {
      user.jurisdictionId = decoded.jurisdictionId;
    } else if (!user.jurisdictionId && user.role === "authority") {
      if (user.state && user.district) {
        user.jurisdictionId = `${user.state}_${user.district}`.toUpperCase().replace(/\s+/g, "_");
      } else if (user.state) {
        user.jurisdictionId = `${user.state}`.toUpperCase().replace(/\s+/g, "_");
      }
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Step 2: Check role — usage: authorize("authority", "admin")
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient role" });
    }
    next();
  };
};

// Optional auth: attaches user if token is present, does not fail if no token
exports.optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      req.tokenClaims = decoded;
      if (!user.jurisdictionId && decoded.jurisdictionId) {
        user.jurisdictionId = decoded.jurisdictionId;
      } else if (!user.jurisdictionId && user.role === "authority") {
        if (user.state && user.district) {
          user.jurisdictionId = `${user.state}_${user.district}`.toUpperCase().replace(/\s+/g, "_");
        } else if (user.state) {
          user.jurisdictionId = `${user.state}`.toUpperCase().replace(/\s+/g, "_");
        }
      }
      req.user = user;
    }
    next();
  } catch (error) {
    // If token invalid in optional route, proceed unauthenticated
    next();
  }
};