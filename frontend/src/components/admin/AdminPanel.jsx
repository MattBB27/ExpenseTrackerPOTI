// AdminPanel — container for the admin tab content.
//
// Currently renders just the users table. Phase 7 will add a sub-navigation
// here to switch between the Users view and an Activity Log view; keeping
// this wrapper in place now means that change is localised when it lands.

import React from "react";
import UsersTable from "./UsersTable";

export default function AdminPanel({ addToast }) {
  return (
    <div className="admin-panel">
      <UsersTable addToast={addToast} />
    </div>
  );
}
