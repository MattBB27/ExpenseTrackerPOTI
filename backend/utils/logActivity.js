// logActivity — fire-and-forget audit-log writer.
//
// Activity logging is observational and must never interfere with the
// real request path. This helper:
//   - returns undefined synchronously (callers never need to await)
//   - swallows its own promise rejection with a console.error
//   - validates nothing beyond what mongoose itself enforces — the model's
//     enum on `action` catches typos at write time
//
// If the write fails (Mongo blip, validation rejection, etc.) the error
// is logged but no exception ever propagates back to the caller. That's
// the whole point: a logging failure must not turn into a 500 on a request
// the user otherwise completed successfully.

const UserActivity = require("../models/UserActivity");

function logActivity({ userId, action, metadata }) {
  UserActivity.create({ user: userId, action, metadata }).catch((err) => {
    // Intentionally non-fatal. Surfaced to the server log so failures are
    // visible during development without changing the response shape.
    console.error(`logActivity(${action}) failed:`, err.message);
  });
}

module.exports = { logActivity };
