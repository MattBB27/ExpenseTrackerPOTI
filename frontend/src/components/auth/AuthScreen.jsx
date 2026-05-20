// Tab shell for the unauthenticated user: switches between login and
// register. Branded to match the rest of the app.

import React, { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function AuthScreen() {
  const [tab, setTab] = useState("login"); // "login" | "register"

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo-icon">💰</span>
          <span className="logo-text">ExpenseTracker</span>
        </div>
        <p className="auth-subtitle">
          {tab === "login"
            ? "Sign in to manage your expenses"
            : "Create an account to start tracking expenses"}
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "login"}
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => setTab("login")}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={tab === "register"}
            className={`auth-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => setTab("register")}
          >
            Register
          </button>
        </div>

        {/* Mounting forms conditionally (rather than toggling display)
            means switching tabs clears any stale input or error state. */}
        {tab === "login" ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}
