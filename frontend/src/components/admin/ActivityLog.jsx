// Admin activity log viewer.
//
// Owns its own fetch state for both activities and the user list (for the
// filter dropdown). Filter and pagination state is local; switching away
// from this tab unmounts and resets everything, matching the rest of the
// app's tab pattern. Failed-login attempts are not logged anywhere in the
// system so they do not appear as a row type here.

import React, { useState, useEffect } from "react";
import { getActivities, getUsers } from "../../services/api";

const PAGE_SIZE = 25;

// Hand-rolled relative-time formatter. Intl.RelativeTimeFormat is correct but
// reads more stiltedly out of the box; this matches the casual tone of the
// rest of the UI. The precise time goes in the title attribute on hover.
function relativeTime(iso) {
  const then = new Date(iso);
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  return then.toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
    year: then.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

// Map each ACTION to an icon + a function that builds the summary line from
// activity.metadata. The fallbacks make the viewer robust to any historical
// entries that pre-date a metadata convention.
const ACTION_DISPLAY = {
  LOGIN:    { icon: "🔐", label: "logged in" },
  LOGOUT:   { icon: "🚪", label: "logged out" },
  REGISTER: { icon: "✨", label: "registered an account" },
  CREATE_EXPENSE: {
    icon: "➕",
    label: (m) =>
      m?.title
        ? `created expense "${m.title}"${m.amount != null ? ` ($${m.amount})` : ""}`
        : "created an expense",
  },
  UPDATE_EXPENSE: {
    icon: "✏️",
    label: (m) =>
      m?.title
        ? `updated expense "${m.title}"${m.amount != null ? ` ($${m.amount})` : ""}`
        : "updated an expense",
  },
  DELETE_EXPENSE: {
    icon: "🗑️",
    label: (m) =>
      m?.title ? `deleted expense "${m.title}"` : "deleted an expense",
  },
  CREATE_USER: {
    icon: "👤",
    label: (m) =>
      m?.targetUsername
        ? `created user "${m.targetUsername}"${m.role ? ` (${m.role})` : ""}`
        : "created a user",
  },
  UPDATE_USER: {
    icon: "👤",
    label: (m) =>
      m?.targetUsername
        ? `updated user "${m.targetUsername}"${m.role ? ` (${m.role})` : ""}`
        : "updated a user",
  },
  DELETE_USER: {
    icon: "👤",
    label: (m) =>
      m?.targetUsername ? `deleted user "${m.targetUsername}"` : "deleted a user",
  },
};

function describe(activity) {
  const entry = ACTION_DISPLAY[activity.action];
  if (!entry) {
    // Defensive: surface unknown actions rather than rendering nothing.
    return { icon: "•", text: activity.action.toLowerCase() };
  }
  const text =
    typeof entry.label === "function"
      ? entry.label(activity.metadata)
      : entry.label;
  return { icon: entry.icon, text };
}

export default function ActivityLog({ addToast }) {
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Fetch the user list once for the filter dropdown. If an admin creates a
  // new user on the Users sub-tab and switches here without remounting,
  // they will not see the new option until the next mount — acceptable
  // for a uni-project scope and the trade-off was discussed in Phase 6.
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => {
        // Non-fatal: the activity log still works without the dropdown.
        // The fetch error surfaces below if the activities query also fails.
      });
  }, []);

  // Refetch activities on page or filter change. Two fetch paths share this
  // effect because they want identical loading / error handling.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiError(null);

    const params = { page, limit: PAGE_SIZE };
    if (selectedUserId) params.userId = selectedUserId;

    getActivities(params)
      .then((data) => {
        if (cancelled) return;
        setActivities(data.activities);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err.response?.data?.error || "Failed to load activity log";
        setApiError(msg);
        addToast(msg, "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Cancel flag protects against stale responses landing after a faster
    // newer request — e.g. user clicks Next twice quickly.
    return () => {
      cancelled = true;
    };
  }, [page, selectedUserId, addToast]);

  const handleUserFilter = (e) => {
    setSelectedUserId(e.target.value);
    setPage(1); // reset to page 1 so we never land on a non-existent page
  };

  return (
    <div className="activity-log-page">
      <div className="list-header">
        <div>
          <h2>Activity Log</h2>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              marginTop: "4px",
            }}
          >
            {total} entr{total !== 1 ? "ies" : "y"}
            {selectedUserId && " (filtered)"}
          </p>
        </div>

        <div className="filters">
          <select
            className="filter-select"
            value={selectedUserId}
            onChange={handleUserFilter}
            aria-label="Filter by user"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading activity…</p>
        </div>
      ) : apiError && activities.length === 0 ? (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Could not load activity log</h2>
          <p>{apiError}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-list">
          <span className="empty-list-icon">🗂️</span>
          <p>
            {selectedUserId
              ? "No activity for this user yet."
              : "No activity recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <ul className="activity-list">
            {activities.map((a) => {
              const { icon, text } = describe(a);
              // a.user may be null if the referenced user has been deleted,
              // though Phase 6's cascade delete makes that path unlikely.
              const username = a.user?.username || "(deleted user)";
              const fullTime = new Date(a.createdAt).toLocaleString("en-AU");
              return (
                <li key={a._id} className="activity-row">
                  <span className="activity-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <div className="activity-body">
                    <span className="activity-user">{username}</span>
                    <span className="activity-text"> {text}</span>
                  </div>
                  <span className="activity-time" title={fullTime}>
                    {relativeTime(a.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Prev
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
