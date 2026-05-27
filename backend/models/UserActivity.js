// Mongoose model for an audit log entry capturing one user action.
//
// Entries are immutable: written once by logActivity() at the point a user
// performs a logged action, and never updated. 
//
// For expense actions we snapshot the title/amount/category at the 
// time of them action; the activity log remains readable even after the
// underlying expense is deleted or renamed.

const mongoose = require("mongoose");

// What the system records. Exported so route files refer to them as ACTIONS.LOGIN,
// also mongoose's enum validator catches typos at write time as a second guard.
const ACTIONS = Object.freeze({
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  CREATE_EXPENSE: "CREATE_EXPENSE",
  UPDATE_EXPENSE: "UPDATE_EXPENSE",
  DELETE_EXPENSE: "DELETE_EXPENSE",

  // Admin user-management actions. Attributed to the admin who performed them. 
  // Metadata snapshots the target user's id/username/role so the log remains indefinitely
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  DELETE_USER: "DELETE_USER", // Currently only admins can delete users (yes, not good practice)
});

const userActivitySchema = new mongoose.Schema(
  {
    // The user who performed the action.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
      enum: {
        values: Object.values(ACTIONS),
        message: "{VALUE} is not a valid activity action",
      },
    },

    // Free-form context. For expense actions we store
    //   { expenseId, title, amount, category }
    // as a snapshot. For auth actions this is normally absent.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    // Entries are write-once
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index supports "all activity for user X, newest first"
// (per-user filter and "any activity for user X" lookups.
userActivitySchema.index({ user: 1, createdAt: -1 });

// Standalone createdAt index for the unfiltered "all users, newest first" query path
userActivitySchema.index({ createdAt: -1 });

userActivitySchema.statics.ACTIONS = ACTIONS;

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

module.exports = UserActivity;
module.exports.ACTIONS = ACTIONS;
