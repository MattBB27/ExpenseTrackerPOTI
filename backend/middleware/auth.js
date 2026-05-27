// Authentication and authorization middleware.
//
// requireAuth: validates the Bearer token in the Authorization header,
// loads the user from the DB, and attaches them to req.user.
// requireAdmin: assumes requireAuth has already run.

const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Throws if the signature is invalid or the token has expired.
    const payload = verifyToken(token);

    // Re-fetch the user every request rather than trusting the JWT payload
    // alone. This means a deleted or demoted user cannot keep using an old
    // token: extra DB cost in exchange for good authorisation practices.
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    req.user = user;
    next();
  } catch (err) {
    // Invalid signature, expired token, malformed payload, etc.
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Use after requireAuth on routes that must be admin-only.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
