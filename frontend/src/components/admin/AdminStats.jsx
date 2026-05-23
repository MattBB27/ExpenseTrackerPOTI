// Compact KPI strip on the admin sub-nav. Three numbers fetched once:
// total users, total activity entries, and entries in the last 24 hours.
//
// Each call uses an endpoint:
//   - getUsers() returns the full list 
//   - getActivities({ limit:1 }) returns { total } cheaply (doesn't gate total)
//   - getActivities({ from: 24h-ago-ISO, limit: 1 }) does the same with a date filter

import React, { useState, useEffect } from "react";
import { getUsers, getActivities } from "../../services/api";

export default function AdminStats() {
  const [stats, setStats] = useState({
    users: null,
    activities: null,
    activities24h: null,
  });
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      getUsers(),
      getActivities({ limit: 1 }),
      getActivities({ limit: 1, from: dayAgo }),
    ])
      .then(([users, all, last24]) => {
        if (cancelled) return;
        setStats({
          users: users.length,
          activities: all.total,
          activities24h: last24.total,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Render the strip even while loading so the layout doesn't shift in.
  // Numbers show "—" until they arrive (or on error).
  const display = (n) => {
    if (error) return "—";
    if (n === null) return "—";
    return n.toLocaleString();
  };

  return (
    <div className="admin-stats" role="group" aria-label="Admin stats">
      <div className="admin-stat">
        <div className="admin-stat-value">{display(stats.users)}</div>
        <div className="admin-stat-label">Registered users</div>
      </div>
      <div className="admin-stat">
        <div className="admin-stat-value">{display(stats.activities)}</div>
        <div className="admin-stat-label">Activity entries (all time)</div>
      </div>
      <div className="admin-stat">
        <div className="admin-stat-value">{display(stats.activities24h)}</div>
        <div className="admin-stat-label">Activity entries (last 24h)</div>
      </div>
    </div>
  );
}
