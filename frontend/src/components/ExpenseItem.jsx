// Renders a single expense.
// Supports two modes:
//   asTableRow = <tr> for the main table
//   default    = full mobile card

import React from "react";
import { CATEGORY_COLORS } from "../app";

// --- Helpers ---

const fmt = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n ?? 0);

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// --- Component ---

export default function ExpenseItem({ expense, onEdit, onDelete, asTableRow }) {
  const color = CATEGORY_COLORS[expense.category] || "#8b8fa8";

  // Table row 

  if (asTableRow) {
    return (
      <tr>
        <td>
          <div className="expense-title-cell">{expense.title}</div>
          {expense.description && (
            <div className="expense-desc">{expense.description}</div>
          )}
        </td>
        <td>
          <span className="category-badge" style={{ color }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
              }}
            />
            {expense.category}
          </span>
        </td>
        <td>
          <span className="expense-amount">{fmt(expense.amount)}</span>
        </td>
        <td>
          <span className="expense-date">{fmtDate(expense.date)}</span>
        </td>
        <td>
          <div className="actions-cell">
            <button
              className="btn-icon edit"
              title="Edit expense"
              onClick={() => onEdit(expense)}
            >
              ✏️
            </button>
            <button
              className="btn-icon delete"
              title="Delete expense"
              onClick={() => onDelete(expense._id)}
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    );
  }



  // Full mobile card

  return (
    <div className="expense-card">
      <div className="expense-card-top">
        <div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>{expense.title}</div>
          <span className="category-badge" style={{ color }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
              }}
            />
            {expense.category}
          </span>
        </div>
        <div className="expense-card-amount">{fmt(expense.amount)}</div>
      </div>

      {expense.description && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          {expense.description}
        </p>
      )}

      <div className="expense-card-bottom">
        <span className="expense-date">{fmtDate(expense.date)}</span>
        <div className="actions-cell">
          <button
            className="btn-icon edit"
            title="Edit"
            onClick={() => onEdit(expense)}
          >
            ✏️
          </button>
          <button
            className="btn-icon delete"
            title="Delete"
            onClick={() => onDelete(expense._id)}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
