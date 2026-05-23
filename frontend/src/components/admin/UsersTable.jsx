// Admin users table
//
// Self-deletion is blocked both client-side and server-side (returns 400). 
// Self-edit IS allowed; if the admin renames themselves, the header greeting stays
// stale until reload because it's not refetched on every action.
//
// Rows are clickable: tapping anywhere outside the edit/delete buttons calls onUserClick(userId), 
// which AdminPanel uses to jump to the Activity Log sub-tab prefiltered to that user. 

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/api";
import UserForm from "./UserForm";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function UsersTable({ addToast, onUserClick }) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create mode

  const fetchUsers = useCallback(async () => {
    try {
      setApiError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to load users";
      setApiError(msg);
      addToast(msg, "error");
    }
  }, [addToast]);

  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  const handleSave = async (payload) => {
    if (editingUser) {
      const updated = await updateUser(editingUser._id, payload);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      addToast("User updated successfully");
    } else {
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev]);
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
      setUsers((prev) => prev.filter((u) => u._id !== target._id));
      addToast(`Deleted user "${target.username}"`);
    } catch (err) {
      addToast(
        err.response?.data?.error || "Failed to delete user",
        "error"
      );
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditModal = (target) => {
    setEditingUser(target);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  if (loading) {
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
        <button className="btn-primary" onClick={fetchUsers}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="users-table-page">
      <div className="list-header">
        <div>
          <h2>Users</h2>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              marginTop: "4px",
            }}
          >
            {users.length} account{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-add" onClick={openAddModal}>
          + Add User
        </button>
      </div>

      {/* Desktop table */}
      <div className="expense-table-wrap">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowActivate();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View activity for ${u.username}`}
                >
                  <td className="expense-title-cell">
                    {u.username}
                    {isSelf && (
                      <span className="user-self-tag" title="That's you">
                        you
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`role-badge ${u.role === "admin" ? "role-admin" : "role-user"
                        }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="expense-date">{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn-icon edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(u);
                        }}
                        title="Edit user"
                      >
                        ✏️
                      </button>
                      {/* Delete hidden on own row to prevent foot-gun;
                          server enforces this too. */}
                      {!isSelf && (
                        <button
                          className="btn-icon delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(u);
                          }}
                          title="Delete user"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — CSS toggles between this and the table above */}
      <div className="expense-cards">
        {users.map((u) => {
          const isSelf = u._id === currentUser._id;
          const handleCardActivate = () => onUserClick?.(u);
          return (
            <div
              key={u._id}
              className="expense-card users-table-card clickable"
              onClick={handleCardActivate}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardActivate();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View activity for ${u.username}`}
            >
              <div className="expense-card-header">
                <div className="expense-card-title">
                  {u.username}
                  {isSelf && <span className="user-self-tag">you</span>}
                </div>
                <span
                  className={`role-badge ${u.role === "admin" ? "role-admin" : "role-user"
                    }`}
                >
                  {u.role}
                </span>
              </div>
              <div className="expense-card-footer">
                <span className="expense-date">{fmtDate(u.createdAt)}</span>
                <div className="actions-cell">
                  <button
                    className="btn-icon edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(u);
                    }}
                    title="Edit user"
                  >
                    ✏️
                  </button>
                  {!isSelf && (
                    <button
                      className="btn-icon delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(u);
                      }}
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
