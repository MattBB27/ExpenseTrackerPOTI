// routes/expenses.js — CRUD API routes for expenses.
//
// All routes require authentication (requireAuth middleware). Every query is
// scoped to req.user._id so users only ever see and touch their own data.
//
// GET    /api/expenses          -> list the current user's expenses (with filters)
// GET    /api/expenses/summary  -> category totals + monthly trends (current user)
// POST   /api/expenses          -> create a new expense for the current user
// PUT    /api/expenses/:id      -> update an expense (must belong to current user)
// DELETE /api/expenses/:id      -> delete an expense (must belong to current user)

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const { requireAuth } = require("../middleware/auth");
const { logActivity } = require("../utils/logActivity");
const { ACTIONS } = require("../models/UserActivity");

// --- Helpers ---

function validateObjectId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid expense ID format" });
  }
  next();
}

// --- GET /api/expenses ---

// Return all expenses belonging to the current user.
// Supports optional ?category= and ?month=YYYY-MM query filters.
router.get("/", requireAuth, async (req, res) => {
  try {
    // Always scope to the logged-in user first
    const filter = { user: req.user._id };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.month) {
      const [year, month] = req.query.month.split("-").map(Number);
      if (year && month) {
        filter.date = {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 0, 23, 59, 59),
        };
      }
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error("GET /expenses error:", err.message);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// --- GET /api/expenses/summary ---

// Aggregate stats scoped to the current user:
// - category totals (all time)
// - monthly totals (last 12 months)
// - overall total (all time)
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Category totals (all time, current user only)
    const categoryTotals = await Expense.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Monthly totals (last 12 months, current user only)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTotals = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Grand total (all time, current user only)
    const totalResult = await Expense.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const overallTotal = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({ categoryTotals, monthlyTotals, overallTotal });
  } catch (err) {
    console.error("GET /expenses/summary error:", err.message);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// --- POST /api/expenses ---

// Create a new expense owned by the current user.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    if (!title || !amount || !category || !date) {
      return res.status(400).json({
        error: "title, amount, category, and date are required",
      });
    }

    const expense = new Expense({
      user: req.user._id,
      title,
      amount,
      category,
      date,
      description,
    });
    const saved = await expense.save();

    logActivity({
      userId: req.user._id,
      action: ACTIONS.CREATE_EXPENSE,
      metadata: {
        expenseId: saved._id,
        title: saved.title,
        amount: saved.amount,
        category: saved.category,
      },
    });

    res.status(201).json(saved);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("POST /expenses error:", err.message);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// --- PUT /api/expenses/:id ---

// Update an expense. The query matches on BOTH _id AND user so a user cannot
// edit another user's expense even if they know its ID.
router.put("/:id", requireAuth, validateObjectId, async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, amount, category, date, description },
      {
        new: true,           // return the updated document
        runValidators: true, // enforce schema validation on update
      }
    );

    if (!updated) {
      // Either the expense doesn't exist or it belongs to someone else.
      // Return 404 in both cases — no information about other users' data.
      return res.status(404).json({ error: "Expense not found" });
    }

    logActivity({
      userId: req.user._id,
      action: ACTIONS.UPDATE_EXPENSE,
      metadata: {
        expenseId: updated._id,
        title: updated.title,
        amount: updated.amount,
        category: updated.category,
      },
    });

    res.json(updated);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("PUT /expenses/:id error:", err.message);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// --- DELETE /api/expenses/:id ---

// Delete an expense. Same ownership enforcement as PUT above.
router.delete("/:id", requireAuth, validateObjectId, async (req, res) => {
  try {
    const deleted = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }

    logActivity({
      userId: req.user._id,
      action: ACTIONS.DELETE_EXPENSE,
      metadata: {
        expenseId: deleted._id,
        title: deleted.title,
        amount: deleted.amount,
        category: deleted.category,
      },
    });

    res.json({ message: "Expense deleted successfully", id: req.params.id });
  } catch (err) {
    console.error("DELETE /expenses/:id error:", err.message);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

module.exports = router;
