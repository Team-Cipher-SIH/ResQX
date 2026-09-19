const crypto = require("crypto");

// In-memory sliding window store for rate limiting (Key -> array of timestamps)
const rateLimitStore = new Map();

// Periodic cleanup of stale timestamps every 5 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }
}, 5 * 60 * 1000).unref();

// Client IP resolver helper
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1"
  );
};

// Location sanity validator
const validateSosLocation = (coordinates) => {
  let coords = coordinates;
  if (typeof coords === "string") {
    try {
      coords = JSON.parse(coords);
    } catch (e) {
      return { valid: false, error: "coordinates must be a valid JSON array or [lng, lat]" };
    }
  }

  if (!Array.isArray(coords) || coords.length !== 2) {
    return { valid: false, error: "coordinates must be an array of [longitude, latitude]" };
  }

  const [lng, lat] = coords.map(Number);
  if (isNaN(lng) || isNaN(lat)) {
    return { valid: false, error: "coordinates elements must be valid numbers" };
  }

  // Reject [0, 0] / null island coordinates (GPS not locked)
  if (Math.abs(lng) < 0.0001 && Math.abs(lat) < 0.0001) {
    return {
      valid: false,
      error: "Invalid coordinates [0, 0]: GPS fix required before triggering SOS",
    };
  }

  // Geographic bounds
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return {
      valid: false,
      error: "Coordinates out of valid bounds: longitude [-180, 180], latitude [-90, 90]",
    };
  }

  return { valid: true, coordinates: [lng, lat] };
};

/**
 * SOS Protection Middleware:
 * 1. Resolves/generates guest session identity
 * 2. Applies rate limiting per IP and guest identity
 * 3. Enforces location sanity validation
 */
const sosProtectionMiddleware = (req, res, next) => {
  try {
    // 1. Resolve or generate Guest Session Identity
    let guestSessionId =
      req.headers["x-guest-session-id"] ||
      req.body?.guestSessionId ||
      null;

    if (!guestSessionId) {
      guestSessionId = crypto.randomUUID();
    }

    req.guestSessionId = guestSessionId;
    res.setHeader("x-guest-session-id", guestSessionId);

    const clientIp = getClientIp(req);
    req.clientIp = clientIp;

    // 2. Sliding Window Rate Limiting (configurable for demo, defaults to 10 in 5 min)
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const maxRequests = parseInt(process.env.SOS_RATE_LIMIT_MAX, 10) || 10;

    const rateKey = req.user ? `user:${req.user._id}` : `guest:${guestSessionId}:${clientIp}`;
    const userTimestamps = rateLimitStore.get(rateKey) || [];
    const activeTimestamps = userTimestamps.filter((ts) => now - ts < windowMs);

    if (activeTimestamps.length >= maxRequests) {
      const oldest = activeTimestamps[0];
      const waitMs = windowMs - (now - oldest);
      const waitSec = Math.ceil(waitMs / 1000);

      return res.status(429).json({
        success: false,
        message: "SOS rate limit reached. Please wait before triggering another alert.",
        retryAfterSeconds: waitSec,
        guestSessionId,
      });
    }

    // Record request timestamp
    activeTimestamps.push(now);
    rateLimitStore.set(rateKey, activeTimestamps);

    // 3. Location Sanity Validation
    const { coordinates } = req.body || {};
    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "coordinates are required for SOS [longitude, latitude]",
      });
    }

    const locCheck = validateSosLocation(coordinates);
    if (!locCheck.valid) {
      return res.status(400).json({
        success: false,
        message: locCheck.error,
      });
    }

    req.validatedCoordinates = locCheck.coordinates;
    next();
  } catch (err) {
    console.error("Error in sosProtectionMiddleware:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during SOS security verification",
      error: err.message,
    });
  }
};

module.exports = {
  sosProtectionMiddleware,
  validateSosLocation,
  rateLimitStore,
};
