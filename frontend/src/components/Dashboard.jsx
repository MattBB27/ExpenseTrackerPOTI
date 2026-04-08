// Summary featuring expenses stats and charts

import React, { useMemo } from "react";
import MonthlyChart from "./MonthlyChart";
import CategoryChart from "./CategoryChart";
import ExpenseItem from "./ExpenseItem";
import { CATEGORY_COLORS } from "../app";

// --- Helpers ---

const format = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    n ?? 0
  );

const currentMonthLabel = () => {
  return new Date().toLocaleString("default", { month: "long", year: "numeric" });
};

// --- Component ---

export default function Dashboard({ expenses, summary, onAddClick }) {

  // --- Derived stats ---
  const totalSpent = summary?.overallTotal ?? 0;

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const thisMonthExpenseCount = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [expenses]);

  const topCategory = useMemo(() => {
    if (!summary?.categoryTotals?.length) return "—";
    return summary.categoryTotals[0]._id;
  }, [summary]);

  const maxCategoryTotal = useMemo(() => {
    if (!summary?.categoryTotals?.length) return 1;
    return summary.categoryTotals[0].total;
  }, [summary]);

  // --- Early empty state ---
  if (!expenses.length) {
    return (
      <div className="empty-dashboard">
        <span style={{ fontSize: "4rem" }}>📊</span>
        <h2>No expenses yet</h2>
        <p>
          Start tracking your spending by adding your first expense. Your
          dashboard will show charts and summaries here.
        </p>
        <button className="btn-primary" onClick={onAddClick}>
          + Add First Expense
        </button>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">
        Overview
      </h1>

      {/* Stat cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-icon">💵</div>
          <div className="stat-card-label">Total Spent (All Time)</div>
          <div className="stat-card-value danger">{format(totalSpent)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">🗓️</div>
          <div className="stat-card-label">This Month</div>
          <div className="stat-card-value warning">{format(thisMonthTotal)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">📋</div>
          <div className="stat-card-label">Total Expenses</div>
          <div className="stat-card-value primary">{expenses.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">💳</div>
          <div className="stat-card-label">Expenses This Month</div>
          <div className="stat-card-value success">{thisMonthExpenseCount}</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="charts-grid">
        {/* Monthly bar chart */}
        <div className="chart-card">
          <div className="chart-card-title">📈 Monthly Spending (Last 12 Months)</div>
          {summary?.monthlyTotals?.length ? (
            <MonthlyChart data={summary.monthlyTotals} />
          ) : (
            <div className="chart-empty">
              <span className="chart-empty-icon">📉</span>
              Not enough data yet
            </div>
          )}
        </div>

        {/* Doughnut chart */}
        <div className="chart-card">
          <div className="chart-card-title">🛒 Total Spending by Category</div>
          {summary?.categoryTotals?.length ? (
            <CategoryChart data={summary.categoryTotals} />
          ) : (
            <div className="chart-empty">
              <span className="chart-empty-icon">📊</span>
              No category data
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown list */}
      {summary?.categoryTotals?.length > 0 && (
        <div className="chart-card">
          <div className="chart-card-title">🥇 Top Spending Categories</div>
          <div className="category-list">
            {summary.categoryTotals.slice(0, 6).map((cat) => (
              <div className="category-row" key={cat._id}>
                <span
                  className="category-dot"
                  style={{ background: CATEGORY_COLORS[cat._id] || "#8b8fa8" }}
                />
                <span className="category-row-name">{cat._id}</span>
                <div className="category-bar-wrap">
                  <div
                    className="category-bar"
                    style={{
                      width: `${(cat.total / maxCategoryTotal) * 100}%`,
                      background: CATEGORY_COLORS[cat._id] || "#8b8fa8",
                    }}
                  />
                </div>
                <span className="category-row-amount">{format(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
