// Admin user-form modal. Same modal/.form-* styling as ExpenseForm so the
// admin UI feels native to the rest of the app.
//
// initialData = null → create mode (password required).
// initialData = {...user} → edit mode (password optional; blank means
// keep current). Username casing is normalised to lowercase on submit to
// match the backend's storage rules.

import React, { useState } from "react";

const USERNAME_REGEX = /^[a-z0-9_]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 6;

function validate({ username, password, isEdit }) {
  const errors = {};

  const u = username.trim();
  if (!u) {
    errors.username = "Username is required";
  } else if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
    errors.username = `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`;
  } else if (!USERNAME_REGEX.test(u.toLowerCase())) {
    errors.username =
      "Use only lowercase letters, numbers, and underscores";
  }

  // Password is required on create, optional on edit (blank = keep current).
  if (!isEdit && !password) {
    errors.password = "Password is required";
  } else if (password && password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters`;
  }

  return errors;
}

export default function UserForm({ initialData, onSave, onClose }) {
  const isEdit = !!initialData;

  const [username, setUsername] = useState(initialData?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialData?.role || "user");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const errors = validate({ username, password, isEdit });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Build the payload. On edit we only send password when the admin
    // actually typed one — the backend treats absent/empty as "keep current".
    const payload = {
      username: username.trim().toLowerCase(),
      role,
    };
    if (password) payload.password = password;

    setSubmitting(true);
    try {
      await onSave(payload);
      // Parent closes the modal on success.
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg && /username/i.test(msg)) {
        setFieldErrors({ username: msg });
      } else if (msg && /password/i.test(msg)) {
        setFieldErrors({ password: msg });
      } else {
        setFormError(msg || "Could not save user");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? "Edit User" : "Add User"}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label" htmlFor="user-username">
                Username <span>*</span>
              </label>
              <input
                id="user-username"
                className={`form-input ${fieldErrors.username ? "error" : ""}`}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                autoFocus
              />
              {fieldErrors.username && (
                <p className="form-error">{fieldErrors.username}</p>
              )}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="user-password">
                Password {!isEdit && <span>*</span>}
              </label>
              <input
                id="user-password"
                className={`form-input ${fieldErrors.password ? "error" : ""}`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Leave blank to keep current" : ""}
                autoComplete="new-password"
                disabled={submitting}
              />
              {fieldErrors.password && (
                <p className="form-error">{fieldErrors.password}</p>
              )}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="user-role">
                Role <span>*</span>
              </label>
              <select
                id="user-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={submitting}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {formError && <p className="form-error">{formError}</p>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting
                ? "Saving…"
                : isEdit
                ? "Save Changes"
                : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
