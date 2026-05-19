// Mongoose schema and model for an expense document.
const mongoose = require("mongoose");

// Expense categories
const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Housing & Rent",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Travel",
  "Other",
];

const expenseSchema = new mongoose.Schema(
  {
    // Owner of this expense. All queries filter by this field so every user
    // only ever sees and modifies their own data. Indexed because it appears
    // in every single query.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: "{VALUE} is not a valid category",
      },
    },

    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    // Automatic createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Export the list of valid categories so /routes can use it
expenseSchema.statics.CATEGORIES = CATEGORIES;
const Expense = mongoose.model("Expense", expenseSchema);
module.exports = Expense;
