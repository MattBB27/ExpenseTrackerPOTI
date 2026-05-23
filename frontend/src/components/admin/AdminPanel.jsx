// AdminPanel: container for the admin tab content, with sub-navigation
// between Users management and the Activity Log viewer.
//
// AdminPanel owns the activity-log user filter as a full { _id, username }
// object (selectedUser) so ActivityLog can display names without a separate lookup.
// It can pre-seed it when an admin clicks a user row and change the sub-tab in one update

import React, { useState, useCallback } from "react";
import UsersTable from "./UsersTable";
import ActivityLog from "./ActivityLog";

export default function AdminPanel({ addToast }) {
  const [subTab, setSubTab] = useState("users");
  // Full { _id, username } object so ActivityLog can display the name without a separate lookup
  const [selectedUser, setSelectedUser] = useState(null);

  // Called from UsersTable when an admin clicks a user row. Receives the
  // full user object so the name is immediately available in ActivityLog.
  const navigateToActivity = useCallback((user) => {
    setSelectedUser(user);
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
          {"👥 Users"}
        </button>
        <button
          role="tab"
          aria-selected={subTab === "activity"}
          className={`admin-subnav-btn ${subTab === "activity" ? "active" : ""}`}
          onClick={() => setSubTab("activity")}
        >
          {"📜 Activity Log"}
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
          selectedUserId={selectedUser?._id || ""}
          selectedUsername={selectedUser?.username || ""}
          onSelectedUserChange={setSelectedUser}
        />
      )}
    </div>
  );
}
