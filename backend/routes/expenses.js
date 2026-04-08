// routes/expenses.js — CRUD API routes for expenses.
//
// GET    /api/expenses          → get all expenses (with optional filters)
// GET    /api/expenses/summary  → category totals + monthly trends
// POST   /api/expenses          → create a new expense
// PUT    /api/expenses/:id      → update an existing expense
// DELETE /api/expenses/:id      → delete an expense

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Expense = require("../models/Expense");

// --- Helpers --- 

function validateObjectId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid expense ID format" });
  }
  next();
}

// --- GET /api/expenses --- 

// Retrieve all expenses. Supports OPTIONAL query filters
router.get("/", async (req, res) => {
  try {
    const filter = {};

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Month filter (YYYY-MM)
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

// Return totals by category, month, or overall.
router.get("/summary", async (req, res) => {
  try {
    // Category totals (all time)
    const categoryTotals = await Expense.aggregate([
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Monthly totals (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);
    const monthlyTotals = await Expense.aggregate([
      { $match: { date: { $gte: twelveMonthsAgo } } },
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

    // Grand total (all time)
    const totalResult = await Expense.aggregate([
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

// Creates a new expense (title, amount, category, date, description)
router.post("/", async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    if (!title || !amount || !category || !date) {
      return res.status(400).json({
        error: "title, amount, category, and date are required",
      });
    }

    const expense = new Expense({ title, amount, category, date, description });
    const saved = await expense.save();

    res.status(201).json(saved);
  } catch (err) {
    // Mongoose validation error
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("POST /expenses error:", err.message);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// --- PUT /api/expenses/:id ---

// Update an existing expense using expense object/document ID.
router.put("/:id", validateObjectId, async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, amount, category, date, description },
      {
        new: true,            // return the updated document
        runValidators: true,  // enforce schema validation 
      }
    );

    if (!updated) {
      return res.status(404).json({ error: "Expense not found" });
    }
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

// Delete an expense using expense object/document ID
router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ message: "Expense deleted successfully", id: req.params.id });
  } catch (err) {
    console.error("DELETE /expenses/:id error:", err.message);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// Export categories list so frontend can request it
router.get("/categories", (req, res) => {
  res.json(Expense.schema.statics.CATEGORIES || [
    "Food & Dining", "Transport", "Housing & Rent", "Utilities",
    "Entertainment", "Healthcare", "Shopping", "Education", "Travel", "Other",
  ]);
});

module.exports = router;
