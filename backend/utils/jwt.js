// JWT signing and verification helpers.
//
// Token payload deliberately contains only { id, role }. Everything else
// (username, createdAt, etc.) is fetched from the DB by the auth middleware.
// Keeping the payload tiny means we don't have to invalidate tokens when
// non-critical user fields change.

const jwt = require("jsonwebtoken");

// 24 hours is a reasonable balance: short enough that a stolen token is not
// usable indefinitely, long enough that users are not constantly logged out.
const TOKEN_EXPIRY = "24h";

// Read the secret lazily so the server can still boot without JWT_SECRET set
// (useful for the seed script and unauthenticated routes during local dev).
// Any actual auth operation will throw a clear error if the secret is missing.
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Add it to backend/.env (see .env.example)."
    );
  }
  return secret;
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    getSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

// Throws JsonWebTokenError on invalid signatures and TokenExpiredError on
// expiry. Both are caught by the auth middleware and surfaced as a 401.
function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signToken, verifyToken };
