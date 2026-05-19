// Renders a single expense in either table-row or card form.
// Table row (asTableRow=true) is used on desktop; the card is used on mobile.
// CSS in App.css controls which one is visible at any given viewport.

import React from "react";
import { CATEGORY_COLORS } from "../App";

// --- Helpers ---

const fmt = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n ?? 0);

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// --- Small reusable pieces ---

// Inline category badge with a coloured dot. Shared by row and card.
function CategoryBadge({ category, color }) {
  return (
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
      {category}
    </span>
  );
}

// Edit + delete buttons. Shared by row and card.
function RowActions({ expense, onEdit, onDelete }) {
  return (
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
  );
}

// --- Component ---

export default function ExpenseItem({ expense, onEdit, onDelete, asTableRow }) {
  const color = CATEGORY_COLORS[expense.category] || "#8b8fa8";

  // Desktop: render as a table row inside ExpenseList's <tbody>.
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
          <CategoryBadge category={expense.category} color={color} />
        </td>
        <td>
          <span className="expense-amount">{fmt(expense.amount)}</span>
        </td>
        <td>
          <span className="expense-date">{fmtDate(expense.date)}</span>
        </td>
        <td>
          <RowActions expense={expense} onEdit={onEdit} onDelete={onDelete} />
        </td>
      </tr>
    );
  }

  // Mobile: render as a card.
  return (
    <div className="expense-card">
      <div className="expense-card-header">
        <div className="expense-card-title">{expense.title}</div>
        <span className="expense-amount">{fmt(expense.amount)}</span>
      </div>
      {expense.description && (
        <div className="expense-card-desc">{expense.description}</div>
      )}
      <div className="expense-card-footer">
        <CategoryBadge category={expense.category} color={color} />
        <span className="expense-date">{fmtDate(expense.date)}</span>
        <RowActions expense={expense} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}
