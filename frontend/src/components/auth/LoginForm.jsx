// Username + password login form.
//
// Local useState only; global auth state lives in AuthContext. The form
// trusts the backend's "Invalid username or password" message.
// Doesn't validate username format on the login screen
// (a banned-character username could not have been registered in the first place)


import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Username and password are required");
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim().toLowerCase(), password);
      // On success the auth context flips to "authenticated" and this form
      // unmounts; no further state work needed here.
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.code === "ECONNABORTED"
          ? "Request timed out — is the server running?"
          : "Could not reach the server");
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label className="auth-label" htmlFor="login-username">
          Username
        </label>
        <input
          id="login-username"
          className="form-input"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={submitting}
          autoFocus
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className="form-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" className="auth-submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
