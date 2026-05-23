// routes/activities.js: admin-only activity log viewer.
//
// GET /api/activities
//   ?page=<int>          
//   ?limit=<int>         default 25, capped at 100
//   ?userId=<ObjectId>   optional filter; rejected with 400 if malformed
//   ?action=<ACTION>     optional ACTIONS enum filter; 400 if not in the enum
//   ?from=<ISO date>     optional lower bound on createdAt; 400 if unparseable
//   ?to=<ISO date>       optional upper bound on createdAt (inclusive); 400 if unparseable
//
// Returns { activities, total, page, limit, totalPages }. 
// The user ref is populated with username and role only

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const UserActivity = require("../models/UserActivity");
const { ACTIONS } = require("../models/UserActivity");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Parse a positive integer query param with fallback. Returns the fallback
// for missing values; returns null if the value is present but invalid 
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

    if (req.query.action) {
      if (!Object.values(ACTIONS).includes(req.query.action)) {
        return res.status(400).json({ error: "Invalid action" });
      }
      filter.action = req.query.action;
    }

    // Date range on createdAt. `to` is inclusive to the end of the day
    if (req.query.from || req.query.to) {
      const range = {};
      if (req.query.from) {
        const from = new Date(req.query.from);
        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({ error: "Invalid from date" });
        }
        range.$gte = from;
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        if (Number.isNaN(to.getTime())) {
          return res.status(400).json({ error: "Invalid to date" });
        }
        to.setHours(23, 59, 59, 999);
        range.$lte = to;
      }
      filter.createdAt = range;
    }

    const skip = (page - 1) * limit;

    // Run the find and the count in parallel 
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
