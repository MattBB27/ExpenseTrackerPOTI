// Admin activity log viewer.
//
// User filter: typeahead search rather than a dropdown. 
// Typing fires GET /api/users?search= after a 300 ms debounce; 
// selecting a suggestion locks in the filter and dismisses the list. 
//
// Default date window: Last 30 days. Admins can still select "All time"
//
// Page count cap: totalPages is capped at PAGE_CAP in the display. Mongo's
// countDocuments on a large result set is expensive. We show "400+ pages".

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getActivities, getUsers } from "../../services/api";

const PAGE_SIZE = 25;
// Shown as "N+ pages" when the actual count would exceed this
const PAGE_CAP = 400;
// Debounce delay for the user search input (ms).
const SEARCH_DEBOUNCE = 300;

const ACTION_LABELS = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  REGISTER: "Register",
  CREATE_EXPENSE: "Create expense",
  UPDATE_EXPENSE: "Update expense",
  DELETE_EXPENSE: "Delete expense",
  CREATE_USER: "Create user",
  UPDATE_USER: "Update user",
  DELETE_USER: "Delete user",
};

// Default to Last 30 days
const DATE_PRESETS = {
  "30d": "Last 30 days",
  today: "Today",
  "7d": "Last 7 days",
  all: "All time",
};

function presetToFrom(preset) {
  if (preset === "all") return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (preset === "today") return d;
  if (preset === "7d") {
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (preset === "30d") {
    d.setDate(d.getDate() - 29);
    return d;
  }
  return null;
}

function relativeTime(iso, now) {
  const then = new Date(iso);
  const seconds = Math.round((now - then.getTime()) / 1000);
  if (seconds < 120) {
    return then.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  return then.toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
    year: then.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

const ACTION_DISPLAY = {
  LOGIN: { icon: "🔐", label: "logged in" },
  LOGOUT: { icon: "🚪", label: "logged out" },
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
  if (!entry) return { icon: "•", text: activity.action.toLowerCase() };
  const text =
    typeof entry.label === "function"
      ? entry.label(activity.metadata)
      : entry.label;
  return { icon: entry.icon, text };
}

// LOGIN/LOGOUT stay neutral (no colour) so the log isn't a wall of colour.
function actionTone(action) {
  if (action === "REGISTER" || action.startsWith("CREATE_")) return "create";
  if (action.startsWith("UPDATE_")) return "update";
  if (action.startsWith("DELETE_")) return "delete";
  return "neutral";
}

export default function ActivityLog({
  addToast,
  selectedUserId,
  selectedUsername,
  onSelectedUserChange,
}) {
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCapped, setTotalCapped] = useState(false); // true when count hit PAGE_CAP
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Local filters
  const [actionFilter, setActionFilter] = useState("");
  // Default to 30d
  const [datePreset, setDatePreset] = useState("30d");

  // Ticks every 10s so relative timestamps on the visible page stay live.
  // Without this, "Just now" entries never update.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  // User search typeahead state.
  const [userQuery, setUserQuery] = useState(selectedUsername || "");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Keep the text input in sync when AdminPanel pre-seeds a user (e.g. from a UsersTable row click)
  useEffect(() => {
    setUserQuery(selectedUsername || "");
  }, [selectedUsername]);

  // Debounced user search. Only fires when the input has content and no user
  // is locked in yet (once locked, typing is blocked until cleared)
  const handleUserQueryChange = useCallback((e) => {
    const q = e.target.value;
    setUserQuery(q);

    // Changing the text clears any locked selection
    if (selectedUserId) onSelectedUserChange(null);

    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSuggestionsLoading(true);
      getUsers({ search: q })
        .then((results) => {
          setSuggestions(results);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }, SEARCH_DEBOUNCE);
  }, [selectedUserId, onSelectedUserChange]);

  const selectUser = useCallback((user) => {
    onSelectedUserChange(user);
    setUserQuery(user.username);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onSelectedUserChange]);

  const clearUserFilter = useCallback(() => {
    onSelectedUserChange(null);
    setUserQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onSelectedUserChange]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset page on any filter change
  useEffect(() => {
    setPage(1);
  }, [selectedUserId, actionFilter, datePreset]);

  // Fetch 
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiError(null);

    const params = { page, limit: PAGE_SIZE };
    if (selectedUserId) params.userId = selectedUserId;
    if (actionFilter) params.action = actionFilter;
    const from = presetToFrom(datePreset);
    if (from) params.from = from.toISOString();

    getActivities(params)
      .then((data) => {
        if (cancelled) return;
        setActivities(data.activities);
        setTotal(data.total);
        const rawPages = data.totalPages;
        if (rawPages > PAGE_CAP) {
          setTotalPages(PAGE_CAP);
          setTotalCapped(true);
        } else {
          setTotalPages(rawPages);
          setTotalCapped(false);
        }
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

    return () => { cancelled = true; };
  }, [page, selectedUserId, actionFilter, datePreset, addToast]);

  const hasActiveFilters =
    Boolean(selectedUserId) || Boolean(actionFilter) || datePreset !== "30d";

  const clearAllFilters = () => {
    clearUserFilter();
    setActionFilter("");
    setDatePreset("30d");
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
            {hasActiveFilters && " (filtered)"}
          </p>
        </div>

        <div className="filters">
          {/* User search typeahead */}
          <div className="user-search-wrap" ref={searchRef}>
            <div className="user-search-field">
              <input
                type="text"
                className="filter-search user-search-input"
                placeholder="Search user…"
                value={userQuery}
                onChange={handleUserQueryChange}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                aria-label="Filter by username"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
              />
              {selectedUserId && (
                <button
                  type="button"
                  className="user-search-clear"
                  onClick={clearUserFilter}
                  aria-label="Clear user filter"
                >
                  ×
                </button>
              )}
              {suggestionsLoading && (
                <span className="user-search-spinner" aria-hidden="true" />
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="user-search-suggestions" role="listbox">
                {suggestions.map((u) => (
                  <li
                    key={u._id}
                    className="user-search-option"
                    role="option"
                    aria-selected={u._id === selectedUserId}
                    onMouseDown={(e) => {
                      // mousedown fires before blur, preventing the outside-click
                      // handler from closing the list before the click registers.
                      e.preventDefault();
                      selectUser(u);
                    }}
                  >
                    <span className="user-search-option-name">{u.username}</span>
                    <span className="user-search-option-role">{u.role}</span>
                  </li>
                ))}
              </ul>
            )}
            {showSuggestions && !suggestionsLoading && suggestions.length === 0 && (
              <div className="user-search-empty">No users found</div>
            )}
          </div>

          <select
            className="filter-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            aria-label="Filter by date range"
          >
            {Object.entries(DATE_PRESETS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          <span className="active-filters-text">
            Showing entries for{" "}
            {[
              selectedUserId && selectedUsername,
              actionFilter && ACTION_LABELS[actionFilter],
              datePreset !== "30d" && DATE_PRESETS[datePreset],
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <button
            type="button"
            className="active-filters-clear"
            onClick={clearAllFilters}
          >
            Clear all
          </button>
        </div>
      )}

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
            {hasActiveFilters
              ? "No activity matches these filters."
              : "No activity recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <ul className="activity-list">
            {activities.map((a) => {
              const { icon, text } = describe(a);
              const username = a.user?.username || "(deleted user)";
              const fullTime = new Date(a.createdAt).toLocaleString("en-AU");
              return (
                <li
                  key={a._id}
                  className="activity-row"
                  data-tone={actionTone(a.action)}
                >
                  <span className="activity-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <div className="activity-body">
                    <span className="activity-user">{username}</span>
                    <span className="activity-text"> {text}</span>
                  </div>
                  <span className="activity-time" title={fullTime}>
                    {relativeTime(a.createdAt, now)}
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
                Page {page} of {totalCapped ? `${PAGE_CAP}+` : totalPages}
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
