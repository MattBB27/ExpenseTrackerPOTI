// AdminPanel: container for the admin tab content, with sub-navigation
// between Users management and the Activity Log viewer.
//
// AdminPanel also owns the activity-log user filter (`selectedUserId`).
// It lives here rather than inside ActivityLog so that UsersTable can
// pre-seed the filter when an admin clicks a user row, then flip the
// sub-tab over to Activity in one go. ActivityLog still owns its own
// pagination state — that's a view-level concern with no cross-sibling
// implications.
//
// Each sub-view is rendered conditionally (not display:none) so it owns
// its own lifecycle for everything else (modal state, data fetches).

import React, { useState, useCallback } from "react";
import UsersTable from "./UsersTable";
import ActivityLog from "./ActivityLog";

export default function AdminPanel({ addToast }) {
  const [subTab, setSubTab] = useState("users");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Called from UsersTable when an admin clicks a user row. Sets the
  // activity-log filter and switches the sub-tab in a single update so
  // ActivityLog mounts with the filter already applied.
  const navigateToActivity = useCallback((userId) => {
    setSelectedUserId(userId);
    setSubTab("activity");
  }, []);

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

      {subTab === "users" && (
        <UsersTable
          addToast={addToast}
          onUserClick={navigateToActivity}
        />
      )}
      {subTab === "activity" && (
        <ActivityLog
          addToast={addToast}
          selectedUserId={selectedUserId}
          onSelectedUserIdChange={setSelectedUserId}
        />
      )}
    </div>
  );
}
