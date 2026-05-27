// routes/auth.js - registration, login, logout, and current-user lookup.
//
// POST /api/auth/register  -> create a new user, return JWT + user
// POST /api/auth/login     -> verify credentials, return JWT + user
// POST /api/auth/logout    -> (mostly) no-op; client deletes its token
// GET  /api/auth/me        -> return the currently authenticated user

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const { requireAuth } = require("../middleware/auth");
const { logActivity } = require("../utils/logActivity");
const { ACTIONS } = require("../models/UserActivity");

// Minimum acceptable password length. Kept short and pragmatic for a uni
// project; a real product would enforce a strength estimator like zxcvbn.
const MIN_PASSWORD_LENGTH = 6;

// Shape of a user object returned to the client. Explicit picking is safer
// and more legible than relying solely on the toJSON transform.
const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
});

// --- POST /api/auth/register ---

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    // Schema lowercases username on save, but queries do not, so lowercase
    // explicitly here for the uniqueness check.
    const existing = await User.findOne({
      username: String(username).toLowerCase(),
    });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const user = new User({ username });
    await user.setPassword(password);
    await user.save();

    logActivity({ userId: user._id, action: ACTIONS.REGISTER });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    // Duplicate key (in case the unique check race-conditions through)
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    console.error("POST /auth/register error:", err.message);
    res.status(500).json({ error: "Failed to register" });
  }
});

// --- POST /api/auth/login ---

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await User.findOne({
      username: String(username).toLowerCase(),
    });

    // Use the same error for "user not found" and "wrong password" so an
    // attacker cannot enumerate which usernames exist.
    const genericFail = () =>
      res.status(401).json({ error: "Invalid username or password" });

    if (!user) return genericFail();
    const ok = await user.verifyPassword(password);
    if (!ok) return genericFail();

    logActivity({ userId: user._id, action: ACTIONS.LOGIN });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("POST /auth/login error:", err.message);
    res.status(500).json({ error: "Failed to log in" });
  }
});

// --- POST /api/auth/logout ---

// With JWTs stored client-side, the server-side hit exists so we can record a 
// LOGOUT activity entry for the audit log; the response shape is unchanged.
router.post("/logout", requireAuth, (req, res) => {
  logActivity({ userId: req.user._id, action: ACTIONS.LOGOUT });
  res.json({ message: "Logged out" });
});

// --- GET /api/auth/me ---

// Used by the frontend on page load to confirm a stored token is still valid
// and to hydrate the auth context with the current user.
router.get("/me", requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

module.exports = router;
