// AdminPanel — container for the admin tab content, with sub-navigation
// between Users management and the Activity Log viewer.
//
// Each sub-view is rendered conditionally (not display:none) so it owns
// its own lifecycle. Switching tabs resets filters/pagination/modal state
// cleanly, matching the Dashboard/Expenses pattern in the parent app.

import React, { useState } from "react";
import UsersTable from "./UsersTable";
import ActivityLog from "./ActivityLog";

export default function AdminPanel({ addToast }) {
  const [subTab, setSubTab] = useState("users");

  return (
    <div className="admin-panel">
      <nav className="admin-subnav" role="tablist">
        <button
          role="tab"
          aria-selected={subTab === "users"}
          className={`admin-subnav-btn ${subTab === "users" ? "active" : ""}`}
          onClick={() => setSubTab("users")}
        >
          👥 Users
        </button>
        <button
          role="tab"
          aria-selected={subTab === "activity"}
          className={`admin-subnav-btn ${subTab === "activity" ? "active" : ""}`}
          onClick={() => setSubTab("activity")}
        >
          📜 Activity Log
        </button>
      </nav>

      {subTab === "users" && <UsersTable addToast={addToast} />}
      {subTab === "activity" && <ActivityLog addToast={addToast} />}
    </div>
  );
}
