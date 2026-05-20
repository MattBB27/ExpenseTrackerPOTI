// routes/activities.js: admin-only activity log viewer.
//
// GET /api/activities
//   ?page=<int>         1-indexed, default 1
//   ?limit=<int>        default 25, capped at 100 to avoid foot-gun queries
//   ?userId=<ObjectId>  optional filter; rejected with 400 if malformed
//
// Returns { activities, total, page, limit, totalPages }. The user ref is
// populated with username and role only; passwordHash never leaves the DB
// even by accident on this path. Entries are immutable so caching headers
// could be added later, but for a fresh-on-every-load admin view they would
// be more annoying than useful.

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const UserActivity = require("../models/UserActivity");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Parse a positive integer query param with a fallback. Returns the fallback
// for missing values; returns null if the value is present but invalid so
// the caller can decide how to surface the error.
function parsePositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    if (page === null) {
      return res.status(400).json({ error: "page must be a positive integer" });
    }

    let limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    if (limit === null) {
      return res
        .status(400)
        .json({ error: "limit must be a positive integer" });
    }
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const filter = {};
    if (req.query.userId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
        return res.status(400).json({ error: "Invalid userId format" });
      }
      filter.user = req.query.userId;
    }

    const skip = (page - 1) * limit;

    // Run the find and the count in parallel - they hit independent indexes
    // and there is no reason to serialise them.
    const [activities, total] = await Promise.all([
      UserActivity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username role"),
      UserActivity.countDocuments(filter),
    ]);

    res.json({
      activities,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("GET /activities error:", err.message);
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
});

module.exports = router;
