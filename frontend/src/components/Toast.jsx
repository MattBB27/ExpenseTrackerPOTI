// Toast notifications - Rendered by the toast stack in App.jsx.

import React from "react";

const ICONS = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
};

export default function Toast({ message, type = "success" }) {
  return (
    <div className={`toast ${type}`} role="alert" aria-live="polite">
      <span className="toast-icon">{ICONS[type] ?? "ℹ️"}</span>
      <span>{message}</span>
    </div>
  );
}
