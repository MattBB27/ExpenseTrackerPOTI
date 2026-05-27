// Registration form. Client-side validation mirrors the backend's rules
// (username 3–30 chars, password ≥ 6 chars). 
// The backend remains the source of truth - anything that slips past these
// checks (e.g. a duplicate username) is surfaced from the API error.

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 6;

// Returns a map of field -> error string. An empty object means valid.
function validate({ username, password, confirm }) {
  const errors = {};

  const u = username.trim();
  if (!u) {
    errors.username = "Username is required";
  } else if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
    errors.username = `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`;
  } else if (!USERNAME_REGEX.test(u)) {
    errors.username = "Use only letters, numbers, and underscores";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters`;
  }

  if (password !== confirm) {
    errors.confirm = "Passwords do not match";
  }

  return errors;
}

export default function RegisterForm() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // `fieldErrors` is for client-side per-field validation; `formError` is
  // for server-side errors that aren't tied to a specific field (e.g. network failure).
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const errors = validate({ username, password, confirm });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await register(username.trim().toLowerCase(), password);
    } catch (err) {
      const msg = err.response?.data?.error;
      // Map known backend errors back to their field where possible so the
      // red outline lands on the right input.
      if (msg && /username/i.test(msg)) {
        setFieldErrors({ username: msg });
      } else if (msg && /password/i.test(msg)) {
        setFieldErrors({ password: msg });
      } else {
        setFormError(
          msg ||
          (err.code === "ECONNABORTED"
            ? "Request timed out — is the server running?"
            : "Could not reach the server")
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label className="auth-label" htmlFor="register-username">
          Username
        </label>
        <input
          id="register-username"
          className={`form-input ${fieldErrors.username ? "error" : ""}`}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        {fieldErrors.username ? (
          <p className="auth-error">{fieldErrors.username}</p>
        ) : (
          <p className="auth-hint">
            3–30 letters, numbers, or underscores
          </p>
        )}
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
          className={`form-input ${fieldErrors.password ? "error" : ""}`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
        {fieldErrors.password ? (
          <p className="auth-error">{fieldErrors.password}</p>
        ) : (
          <p className="auth-hint">At least 6 characters</p>
        )}
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="register-confirm">
          Confirm password
        </label>
        <input
          id="register-confirm"
          className={`form-input ${fieldErrors.confirm ? "error" : ""}`}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={submitting}
        />
        {fieldErrors.confirm && (
          <p className="auth-error">{fieldErrors.confirm}</p>
        )}
      </div>

      {formError && <p className="auth-error">{formError}</p>}

      <button type="submit" className="auth-submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
