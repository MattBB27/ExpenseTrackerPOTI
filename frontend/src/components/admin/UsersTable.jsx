// Admin users table
//
// Self-deletion is blocked both client-side and server-side (returns 400).
// Self-edit IS allowed but only shows after reload.
//
// Rows are clickable: tapping anywhere outside the edit/delete buttons calls
// onUserClick(user), which AdminPanel uses to jump to the Activity Log sub-tab prefiltered.
//
// Pagination: server-side, PAGE_SIZE rows per page, PAGE_CAP display cap (same as ActivityLog)
//
// Search: identical structure and behaviour as ActivityLog user filter.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getUsers,
  getDeletedUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/api";
import UserForm from "./UserForm";

const PAGE_SIZE = 25;
const PAGE_CAP = 400;
const SEARCH_DEBOUNCE = 300;

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function UsersTable({ addToast, onUserClick }) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCapped, setTotalCapped] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Deleted users panel
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  // Search typeahead like ActivityLog.
  const [userQuery, setUserQuery] = useState("");
  const [lockedUser, setLockedUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Keep pageInput in sync with page (Prev/Next buttons, filter resets).
  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  // Fetch deleted users when the panel is opened.
  useEffect(() => {
    if (!showDeleted) return;
    let cancelled = false;
    setDeletedLoading(true);
    getDeletedUsers()
      .then((data) => { if (!cancelled) setDeletedUsers(data); })
      .catch(() => { if (!cancelled) setDeletedUsers([]); })
      .finally(() => { if (!cancelled) setDeletedLoading(false); });
    return () => { cancelled = true; };
  }, [showDeleted]);

  // Reset page when the locked user filter changes.
  useEffect(() => {
    setPage(1);
  }, [lockedUser]);

  // Fetch page of users. When a user is selected, pass their _id as a filter
  // so only their row appears (single-result page).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiError(null);

    const params = { page, limit: PAGE_SIZE };
    if (lockedUser) params.userId = lockedUser._id;

    getUsers(params)
      .then((data) => {
        if (cancelled) return;
        // Paginated response shape: { users, total, page, totalPages }
        if (Array.isArray(data)) {
          setUsers(data);
          setTotal(data.length);
          setTotalPages(1);
          setTotalCapped(false);
        } else {
          setUsers(data.users);
          setTotal(data.total);
          const raw = data.totalPages;
          if (raw > PAGE_CAP) {
            setTotalPages(PAGE_CAP);
            setTotalCapped(true);
          } else {
            setTotalPages(raw);
            setTotalCapped(false);
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err.response?.data?.error || "Failed to load users";
        setApiError(msg);
        addToast(msg, "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, lockedUser, addToast, refreshTick]);

  // Debounced typeahead: hits the server exactly as ActivityLog does.
  const handleUserQueryChange = useCallback((e) => {
    const q = e.target.value;
    setUserQuery(q);
    if (lockedUser) setLockedUser(null);

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
          // search returns a flat array
          const arr = Array.isArray(results) ? results : results.users ?? [];
          setSuggestions(arr);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }, SEARCH_DEBOUNCE);
  }, [lockedUser]);

  const selectUser = useCallback((u) => {
    setLockedUser(u);
    setUserQuery(u.username);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const clearSearch = useCallback(() => {
    setLockedUser(null);
    setUserQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Close suggestions on outside click.
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const refetch = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const handleSave = async (payload) => {
    if (editingUser) {
      const updated = await updateUser(editingUser._id, payload);
      // Update in place if still on the same page, otherwise refetch.
      setUsers((prev) =>
        prev.some((u) => u._id === updated._id)
          ? prev.map((u) => (u._id === updated._id ? updated : u))
          : prev
      );
      addToast("User updated successfully");
    } else {
      await createUser(payload);
      // New user lands on page 1 (newest-first sort) — go there.
      if (page === 1) refetch(); else setPage(1);
      addToast("User created successfully");
    }
    closeModal();
  };

  const handleDelete = async (target) => {
    const confirmed = window.confirm(
      `Delete user "${target.username}"? This will also delete all of their expenses and activity history. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteUser(target._id);
      if (lockedUser?._id === target._id) clearSearch();
      // If this was the last row on a non-first page, step back.
      const newTotal = total - 1;
      const newMaxPage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      if (page > newMaxPage) setPage(newMaxPage); else refetch();
      addToast(`Deleted user "${target.username}"`);
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete user", "error");
    }
  };

  const openAddModal = () => { setEditingUser(null); setModalOpen(true); };
  const openEditModal = (target) => { setEditingUser(target); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingUser(null); };

  if (loading && users.length === 0) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading users…</p>
      </div>
    );
  }

  if (apiError && users.length === 0) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <h2>Could not load users</h2>
        <p>{apiError}</p>
        <button className="btn-primary" onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="users-table-page">
      <div className="list-header">
        <div>
          <h2>Users</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", marginTop: "4px" }}>
            {total.toLocaleString()} account{total !== 1 ? "s" : ""}
            {lockedUser && " (filtered)"}
          </p>
        </div>
        <div className="list-header-actions">
          {!showDeleted && (
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
                {lockedUser && (
                  <button type="button" className="user-search-clear" onClick={clearSearch} aria-label="Clear user filter">
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
                      aria-selected={u._id === lockedUser?._id}
                      onMouseDown={(e) => { e.preventDefault(); selectUser(u); }}
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
          )}
          <button
            className={`btn-deleted-toggle${showDeleted ? " active" : ""}`}
            onClick={() => setShowDeleted((v) => !v)}
          >
            {showDeleted ? "← Active users" : "Deleted users"}
          </button>
          {!showDeleted && (
            <button className="btn-add" onClick={openAddModal}>+ Add User</button>
          )}
        </div>
      </div>

      {/* Deleted users panel */}
      {showDeleted && (
        <div className="deleted-users-panel">
          {deletedLoading ? (
            <div className="loading-state"><div className="spinner" /><p>Loading…</p></div>
          ) : deletedUsers.length === 0 ? (
            <div className="empty-list">
              <span className="empty-list-icon">🗑️</span>
              <p>No deleted accounts on record.</p>
            </div>
          ) : (
            <div className="expense-table-wrap">
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Deleted</th>
                    <th aria-label="View activity"></th>
                  </tr>
                </thead>
                <tbody>
                  {deletedUsers.map((u) => (
                    <tr
                      key={String(u._id)}
                      className="users-table-row clickable"
                      onClick={() => onUserClick?.(u)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onUserClick?.(u); } }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View activity for ${u.username}`}
                    >
                      <td className="expense-title-cell">
                        {u.username}
                        <span className="user-deleted-tag">deleted</span>
                      </td>
                      <td className="expense-date">
                        {new Date(u.deletedAt).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="view-activity-cell">
                        <span className="view-activity-hint" aria-hidden="true">View activity →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Desktop table — hidden when viewing deleted users */}
      {!showDeleted && (<>
        <div className="expense-table-wrap">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th aria-label="View activity"></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u._id === currentUser._id;
              const handleRowActivate = () => onUserClick?.(u);
              return (
                <tr
                  key={u._id}
                  className="users-table-row clickable"
                  onClick={handleRowActivate}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleRowActivate(); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View activity for ${u.username}`}
                >
                  <td className="expense-title-cell">
                    {u.username}
                    {isSelf && <span className="user-self-tag" title="That's you">you</span>}
                  </td>
                  <td>
                    <span className={`role-badge ${u.role === "admin" ? "role-admin" : "role-user"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="expense-date">{fmtDate(u.createdAt)}</td>
                  <td className="view-activity-cell">
                    <span className="view-activity-hint" aria-hidden="true">View activity →</span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); openEditModal(u); }} title="Edit user">✏️</button>
                      {!isSelf && (
                        <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); handleDelete(u); }} title="Delete user">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

      {/* Mobile cards */}
      <div className="expense-cards">
        {users.map((u) => {
          const isSelf = u._id === currentUser._id;
          const handleCardActivate = () => onUserClick?.(u);
          return (
            <div
              key={u._id}
              className="expense-card users-table-card clickable"
              onClick={handleCardActivate}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardActivate(); } }}
              tabIndex={0}
              role="button"
              aria-label={`View activity for ${u.username}`}
            >
              <div className="expense-card-header">
                <div className="expense-card-title">
                  {u.username}
                  {isSelf && <span className="user-self-tag">you</span>}
                </div>
                <span className={`role-badge ${u.role === "admin" ? "role-admin" : "role-user"}`}>
                  {u.role}
                </span>
              </div>
              <div className="expense-card-footer">
                <span className="expense-date">{fmtDate(u.createdAt)}</span>
                <span className="view-activity-hint view-activity-hint-card" aria-hidden="true">View activity →</span>
                <div className="actions-cell">
                  <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); openEditModal(u); }} title="Edit user">✏️</button>
                  {!isSelf && (
                    <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); handleDelete(u); }} title="Delete user">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
            Page{" "}
            <input
              className="pagination-page-input"
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              aria-label="Go to page"
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = parseInt(pageInput, 10);
                  if (!Number.isNaN(val) && val >= 1 && val <= totalPages) setPage(val);
                  else setPageInput(String(page));
                  e.target.blur();
                }
              }}
              onBlur={() => {
                const val = parseInt(pageInput, 10);
                if (!Number.isNaN(val) && val >= 1 && val <= totalPages) setPage(val);
                else setPageInput(String(page));
              }}
            />{" "}
            of {totalCapped ? `${PAGE_CAP}+` : totalPages}
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
      </>)}

      {modalOpen && (
        <UserForm
          initialData={editingUser}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
