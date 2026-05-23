// Top-level routing between AuthScreen / LoadingScreen / AuthenticatedApp based on AuthContext. 

import React, { useState, useEffect, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import ExpenseList from "./components/ExpenseList";
import ExpenseForm from "./components/ExpenseForm";
import Toast from "./components/Toast";
import AuthScreen from "./components/auth/AuthScreen";
import AdminPanel from "./components/admin/AdminPanel";
import { useAuth } from "./context/AuthContext";
import { getExpenses, getSummary, createExpense, updateExpense, deleteExpense } from "./services/api";
import "./App.css";

// --- Constants ---

export const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Housing & Rent",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Travel",
  "Other",
];

export const CATEGORY_COLORS = {
  "Food & Dining": "#ff6b6b",
  "Transport": "#ffd166",
  "Housing & Rent": "#06d6a0",
  "Utilities": "#118ab2",
  "Entertainment": "#a855f7",
  "Healthcare": "#f77f00",
  "Shopping": "#ff6584",
  "Education": "#43c98b",
  "Travel": "#6c63ff",
  "Other": "#8b8fa8",
};

// --- AuthenticatedApp ---
// The main app shell, rendered only when the user is signed in.

function AuthenticatedApp() {
  const { user, logout } = useAuth();

  // State
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  // Admins land on the Admin tab; everyone else on Dashboard.
  // Only used as the initial value — admins can still freely navigate
  // to Dashboard or Expenses from the tab nav once mounted.
  const [activeTab, setActiveTab] = useState(
    user.role === "admin" ? "admin" : "dashboard"
  ); // 'dashboard' | 'expenses' | 'admin'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null); // null = add mode
  const [toasts, setToasts] = useState([]);

  // --- Toast helpers ---

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // --- Data fetching ---
  // Always fetches ALL expenses — filtering is done client-side inside ExpenseList,
  // so the Dashboard always receives the complete unfiltered data (due to issues caused by filtering expenses on Expenses tab)

  const fetchExpenses = useCallback(async () => {
    try {
      setApiError(null);
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to load expenses";
      setApiError(msg);
      addToast(msg, "error");
    }
  }, [addToast]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Summary fetch error:", err.message);
    }
  }, []);

  // Initial load only 
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchExpenses(), fetchSummary()]).finally(() =>
      setLoading(false)
    );
  }, [fetchExpenses, fetchSummary]);

  // --- CRUD handlers ---

  const handleSave = async (formData) => {
    try {
      if (editingExpense) {
        const updated = await updateExpense(editingExpense._id, formData);
        setExpenses((prev) =>
          prev.map((e) => (e._id === updated._id ? updated : e))
        );
        addToast("Expense updated successfully!");
      } else {
        const created = await createExpense(formData);
        setExpenses((prev) => [created, ...prev]);
        addToast("Expense added successfully!");
      }
      fetchSummary();
      closeModal();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save expense";
      addToast(msg, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e._id !== id));
      fetchSummary();
      addToast("Expense deleted.");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete expense", "error");
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setModalOpen(true);
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingExpense(null);
  };

  // --- Render ---

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">💰</span>
            <span className="logo-text">ExpenseTracker</span>
          </div>

          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              📊 Dashboard
            </button>
            <button
              className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`}
              onClick={() => setActiveTab("expenses")}
            >
              📋 Expenses
              {expenses.length > 0 && (
                <span className="tab-badge">{expenses.length}</span>
              )}
            </button>
            {user.role === "admin" && (
              <button
                className={`tab-btn ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                🛡️ Admin
              </button>
            )}
          </nav>

          <div className="user-menu">
            <span className="user-greeting">
              Hi, <strong>{user.username}</strong>
              {user.role === "admin" && (
                <span className="admin-badge">admin</span>
              )}
            </span>
            <button
              className="btn-logout"
              onClick={logout}
              title="Sign out"
            >
              Logout
            </button>
          </div>

          {/* Hide the global "+ Add Expense" on the admin tab — UsersTable
              has its own "+ Add User" primary action. */}
          {activeTab !== "admin" && (
            <button className="btn-add" onClick={openAddModal}>
              + Add Expense
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading your expenses…</p>
          </div>
        ) : apiError && expenses.length === 0 ? (
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <h2>Could not connect to server</h2>
            <p>{apiError}</p>
            <button className="btn-primary" onClick={fetchExpenses}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <Dashboard
                expenses={expenses}
                summary={summary}
                onAddClick={openAddModal}
              />
            )}
            {activeTab === "expenses" && (
              // Pass the full expenses list
              <ExpenseList
                expenses={expenses}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddClick={openAddModal}
              />
            )}
            {activeTab === "admin" && user.role === "admin" && (
              <AdminPanel addToast={addToast} />
            )}
          </>
        )}
      </main>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ExpenseForm
          initialData={editingExpense}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {/* Toast stack */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} />
        ))}
      </div>
    </div>
  );
}

// --- LoadingScreen ---
// Shown for the brief window between mount and the AuthContext resolving
// its initial hydrate. Visible only when there is a stored token whose
// validity has to be confirmed with /api/auth/me; if there is no token this never renders.

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading…</p>
    </div>
  );
}

// --- App ---
// Top-level routing. The three branches map 1:1 to the AuthContext status.

export default function App() {
  const { status } = useAuth();

  if (status === "loading") return <LoadingScreen />;
  if (status === "unauthenticated") return <AuthScreen />;
  return <AuthenticatedApp />;
}
