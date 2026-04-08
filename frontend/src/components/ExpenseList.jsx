// Displays expenses in a filterable table. (Seperate from the dashboard)
// Filter is LOCAL to this component so the Dashboard always sees the full unfiltered data

import React, { useState, useMemo } from "react";
import ExpenseItem from "./ExpenseItem";
import { CATEGORIES } from "../app";

// --- Helpers ---

const fmt = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n ?? 0);

// List of the last 12 months for the month filter
function buildMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

// --- Component ---

export default function ExpenseList({
  expenses,   // full unfiltered list from App
  onEdit,
  onDelete,
  onAddClick,
}) {
  // Filter state —isolated from the Dashboard
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Client-side filtering 
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterMonth) {
        const d = new Date(e.date);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthStr !== filterMonth) return false;
      }
      return true;
    });
  }, [expenses, filterCategory, filterMonth]);

  const totalFiltered = useMemo(
    () => filtered.reduce((acc, e) => acc + e.amount, 0),
    [filtered]
  );

  const hasFilters = filterCategory || filterMonth;

  const clearFilters = () => {
    setFilterCategory("");
    setFilterMonth("");
  };

  return (
    <div className="expense-list-page">
      {/* Header */}
      <div className="list-header">
        <div>
          <h2>All Expenses</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", marginTop: "4px" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {hasFilters && ` (filtered from ${expenses.length})`}
          </p>
        </div>

        {/* Filters */}
        <div className="filters">
          {/* Category filter */}
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Month filter */}
          <select
            className="filter-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button className="filter-clear" onClick={clearFilters}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="empty-list">
          <span className="empty-list-icon">🔍</span>
          <p>
            {hasFilters
              ? "No expenses match your filters. Try clearing them."
              : "No expenses yet. Add one to get started!"}
          </p>
          {!hasFilters && (
            <button className="btn-primary" onClick={onAddClick}>
              + Add Expense
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="expense-table-wrap">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <ExpenseItem
                    key={expense._id}
                    expense={expense}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    asTableRow
                  />
                ))}
              </tbody>
            </table>

            {/* Summary bar */}
            <div className="list-summary-bar">
              <span>{filtered.length} expense{filtered.length !== 1 ? "s" : ""}</span>
              <span>
                Total:{" "}
                <span className="list-summary-total">{fmt(totalFiltered)}</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
