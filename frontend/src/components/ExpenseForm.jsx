// Form for adding or editing an expense.
// Client-side validation with built-in error messages.

import React, { useState, useEffect, useRef } from "react";
import { CATEGORIES } from "../app";

// --- Helpers ---

const toDateInputValue = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toISOString().split("T")[0];
};

// --- Validation ---

function validate(fields) {
  const errors = {};

  if (!fields.title.trim()) {
    errors.title = "Title is required";
  } else if (fields.title.length > 100) {
    errors.title = "Title must be 100 characters or less";
  }

  if (!fields.amount) {
    errors.amount = "Amount is required";
  } else if (isNaN(Number(fields.amount)) || Number(fields.amount) <= 0) {
    errors.amount = "Amount must be a positive number";
  }

  if (!fields.category) {
    errors.category = "Please select a category";
  }

  if (!fields.date) {
    errors.date = "Date is required";
  }

  if (fields.description && fields.description.length > 500) {
    errors.description = "Description must be 500 characters or less";
  }

  return errors;
}

// --- Component ---

export default function ExpenseForm({ initialData, onSave, onClose }) {
  const isEditing = Boolean(initialData);

  const [fields, setFields] = useState({
    title: initialData?.title ?? "",
    amount: initialData?.amount ?? "",
    category: initialData?.category ?? "",
    date: initialData?.date
      ? toDateInputValue(initialData.date)
      : toDateInputValue(new Date()),
    description: initialData?.description ?? "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const firstInputRef = useRef(null);

  // Auto-focuses the title field when the form opens
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Escape key with confirmation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") handleAttemptClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDirty]);

  // Close with confirmation 
  const handleAttemptClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    const confirmClose = window.confirm(
      "Are you sure you want to cancel? Your changes will be lost."
    );
    if (confirmClose) {
      onClose();
    }
  };

  // --- Handlers ---

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFields((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true); // 🔥 mark as changed

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const errs = validate(fields);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: fields.title.trim(),
        amount: parseFloat(fields.amount),
        category: fields.category,
        date: new Date(fields.date).toISOString(),
        description: fields.description.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Render ---

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">
            {isEditing ? "✏️ Edit Expense" : "➕ Add Expense"}
          </h2>
          <button
            className="modal-close"
            onClick={handleAttemptClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Title */}
          <div className="form-field">
            <label className="form-label" htmlFor="title">
              Title <span>*</span>
            </label>
            <input
              ref={firstInputRef}
              id="title"
              name="title"
              type="text"
              className={`form-input ${errors.title ? "error" : ""}`}
              placeholder="e.g. Grocery run, Monthly rent…"
              value={fields.title}
              onChange={handleChange}
              maxLength={100}
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          {/* Amount + Category */}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label" htmlFor="amount">
                Amount ($) <span>*</span>
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                className={`form-input ${errors.amount ? "error" : ""}`}
                placeholder="0.00"
                value={fields.amount}
                onChange={handleChange}
              />
              {errors.amount && <span className="form-error">{errors.amount}</span>}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="category">
                Category <span>*</span>
              </label>
              <select
                id="category"
                name="category"
                className={`form-select ${errors.category ? "error" : ""}`}
                value={fields.category}
                onChange={handleChange}
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span className="form-error">{errors.category}</span>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="form-field">
            <label className="form-label" htmlFor="date">
              Date <span>*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className={`form-input ${errors.date ? "error" : ""}`}
              value={fields.date}
              onChange={handleChange}
            />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label" htmlFor="description">
              Description{" "}
              <span style={{ color: "var(--color-text-muted)" }}>
                (optional)
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              className={`form-textarea ${errors.description ? "error" : ""}`}
              placeholder="Any notes about this expense…"
              value={fields.description}
              onChange={handleChange}
              maxLength={500}
              rows={3}
            />
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                textAlign: "right",
              }}
            >
              {fields.description.length} / 500
            </span>
            {errors.description && (
              <span className="form-error">{errors.description}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleAttemptClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : isEditing
                ? "Save Changes"
                : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}