// logActivity: audit-log writer.
//
// Activity logging is observational and must never interfere with the
// real request path. This helper:
//   - returns undefined synchronously (callers never need to await)
//   - swallows its own promise rejection with a console.error

const UserActivity = require("../models/UserActivity");

function logActivity({ userId, action, metadata }) {
  // Capture the timestamp synchronously so it reflects when the event
  // logically occurred, not when the async DB write happens.
  const createdAt = new Date();
  UserActivity.create({ user: userId, action, metadata, createdAt }).catch((err) => {
    console.error(`logActivity(${action}) failed:`, err.message);
  });
}

module.exports = { logActivity };
