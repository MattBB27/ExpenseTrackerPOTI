// routes/users.js — admin-only user-management API.
//
// Every route is gated by requireAuth + requireAdmin. The frontend hides the
// admin tab from non-admins, but the server is the source of truth.
//
// GET    /api/users        → list every user
// POST   /api/users        → create a new user (admin can set role on create)
// PUT    /api/users/:id    → update username / role / password (password optional)
// DELETE /api/users/:id    → delete a user (cannot delete self)
//
// Activity logging: every successful mutation is logged as CREATE/UPDATE/
// DELETE_USER attributed to the calling admin, with a metadata snapshot of
// the target user (id, username, role) so the audit log remains readable
// after the target is deleted or renamed.

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Expense = require("../models/Expense");
const UserActivity = require("../models/UserActivity");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { logActivity } = require("../utils/logActivity");
const { ACTIONS } = require("../models/UserActivity");

// Validation rules mirror /api/auth/register. Kept inline rather than
// extracted to a shared module — a 4-line duplication is easier to read
// than threading through a validator helper, and Phase 8 README can flag
// it as a future cleanup if it matters.
const USERNAME_REGEX = /^[a-z0-9_]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const MIN_PASSWORD_LENGTH = 6;
const ROLES = ["user", "admin"];

// Shape of a user object returned to admin clients. Same fields as the
// /auth helpers — never exposes passwordHash.
const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
});

function validateObjectId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }
  next();
}

function validateUsername(username) {
  if (typeof username !== "string") return "Username is required";
  const u = username.trim().toLowerCase();
  if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`;
  }
  if (!USERNAME_REGEX.test(u)) {
    return "Username can only contain lowercase letters, numbers, and underscores";
  }
  return null;
}

// Every route in this file requires admin access.
router.use(requireAuth, requireAdmin);

// --- GET /api/users ---

router.get("/", async (req, res) => {
  try {
    // Sorted newest-first for a sensible default in the admin table.
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  } catch (err) {
    console.error("GET /users error:", err.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// --- POST /api/users ---

router.post("/", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.status(400).json({ error: usernameErr });

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const chosenRole = role || "user";
    if (!ROLES.includes(chosenRole)) {
      return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
    }

    const lower = String(username).toLowerCase();
    const existing = await User.findOne({ username: lower });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const user = new User({ username: lower, role: chosenRole });
    await user.setPassword(password);
    await user.save();

    logActivity({
      userId: req.user._id,
      action: ACTIONS.CREATE_USER,
      metadata: {
        targetUserId: user._id,
        targetUsername: user.username,
        role: user.role,
      },
    });

    res.status(201).json(publicUser(user));
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    console.error("POST /users error:", err.message);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// --- PUT /api/users/:id ---

router.put("/:id", validateObjectId, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (username !== undefined) {
      const usernameErr = validateUsername(username);
      if (usernameErr) return res.status(400).json({ error: usernameErr });
      const lower = String(username).toLowerCase();

      // Only check uniqueness if the username is actually changing.
      if (lower !== user.username) {
        const clash = await User.findOne({ username: lower });
        if (clash) {
          return res.status(409).json({ error: "Username already taken" });
        }
        user.username = lower;
      }
    }

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
      }
      user.role = role;
    }

    // Password is optional on update. Empty / undefined means "keep current".
    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }
      await user.setPassword(password);
    }

    await user.save();

    logActivity({
      userId: req.user._id,
      action: ACTIONS.UPDATE_USER,
      metadata: {
        targetUserId: user._id,
        targetUsername: user.username,
        role: user.role,
      },
    });

    res.json(publicUser(user));
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    console.error("PUT /users/:id error:", err.message);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// --- DELETE /api/users/:id ---

router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    // Compare as strings — req.user._id is an ObjectId, params.id is a string.
    if (req.params.id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You cannot delete your own account" });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found" });

    // Cascade: remove the user's expenses and their activity history.
    // The admin's CREATE/UPDATE/DELETE_USER entries on this user are
    // attributed to the admin, not the deleted user, so they survive.
    await Expense.deleteMany({ user: deleted._id });
    await UserActivity.deleteMany({ user: deleted._id });

    logActivity({
      userId: req.user._id,
      action: ACTIONS.DELETE_USER,
      metadata: {
        targetUserId: deleted._id,
        targetUsername: deleted.username,
        role: deleted.role,
      },
    });

    res.json({ message: "User deleted successfully", id: req.params.id });
  } catch (err) {
    console.error("DELETE /users/:id error:", err.message);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
