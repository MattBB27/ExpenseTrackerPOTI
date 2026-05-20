// Mongoose model for an audit-log entry capturing one user action.
//
// Entries are immutable: written once by logActivity() at the point a user
// performs a logged action, and never updated. 
// index { user: 1, createdAt: -1 } is defined here so that query is cheap.
//
// `metadata` is intentionally schemaless (Mixed) so each action type can
// store whatever context is most useful without a schema migration. For
// expense actions we snapshot the title/amount/category at the time of the
// action; the activity log remains readable even after the
// underlying expense is deleted or renamed.

const mongoose = require("mongoose");

// The set of action verbs the system records. Exported so route files refer
// to them as ACTIONS.LOGIN rather than scattering magic strings — and
// mongoose's enum validator catches typos at write time as a second guard.
const ACTIONS = Object.freeze({
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  CREATE_EXPENSE: "CREATE_EXPENSE",
  UPDATE_EXPENSE: "UPDATE_EXPENSE",
  DELETE_EXPENSE: "DELETE_EXPENSE",
  // Admin user-management actions. Attributed to the admin who performed
  // them; metadata snapshots the target user's id/username/role so the log
  // remains meaningful after the target is deleted or renamed.
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  DELETE_USER: "DELETE_USER",
});

const userActivitySchema = new mongoose.Schema(
  {
    // The user who performed the action. Indexed both standalone (via the
    // compound index below, which can serve user-only queries by virtue of
    // its leading field) and required because every entry must be attributable.
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
    // as a snapshot. For auth actions this is typically absent.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    // Entries are write-once: no updatedAt needed and storing one would be
    // misleading. createdAt is what Phase 7 sorts on.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index supports both "all activity for user X, newest first"
// (per-user filter and "any activity for user X" lookups, since
// MongoDB can use a compound index's leading field on its own.
userActivitySchema.index({ user: 1, createdAt: -1 });
// Standalone createdAt index for the unfiltered "all users, newest first"
// query path. A compound index's non-leading fields cannot serve a query
// that does not include the leading field, so this second index is needed
// to keep the unfiltered case off a collection scan + in-memory sort.
userActivitySchema.index({ createdAt: -1 });

userActivitySchema.statics.ACTIONS = ACTIONS;

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

module.exports = UserActivity;
module.exports.ACTIONS = ACTIONS;
