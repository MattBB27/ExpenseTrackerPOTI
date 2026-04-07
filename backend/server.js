/**
 * server.js — Entry point for the Expense Tracker backend.
 * Sets up Express, connects to MongoDB, and mounts API routes.
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────

// Allow requests from the React frontend (Vite default port 5173)
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Parse incoming JSON bodies
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────

const expenseRoutes = require("./routes/expenses");
app.use("/api/expenses", expenseRoutes);

// Health-check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Expense Tracker API is running" });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Database & Server Start ─────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/expense_tracker";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
