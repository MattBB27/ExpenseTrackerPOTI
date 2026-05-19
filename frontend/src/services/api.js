// Axios service for all backend calls.
// All components import from here.
//
// Phase 3 additions:
//   - Auth endpoint helpers (loginRequest, registerRequest, logoutRequest, getMe)
//   - Request interceptor attaches Bearer token from localStorage
//   - Response interceptor dispatches `auth:expired` on 401, but only when a
//     token was actually set — so wrong-password login attempts don't trigger
//     a spurious global logout race.

import axios from "axios";

// localStorage key for the JWT. Exported so AuthContext (and only AuthContext)
// can read/write it without duplicating the string literal.
export const TOKEN_KEY = "expense_tracker_token";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10 second timeout
});

// --- Interceptors ---

// Request: attach the current token (if any) on every outgoing request.
// Reading from localStorage each time means a logout in one tab is picked up
// on the next request without us having to wire up storage events.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: on 401, fire a window event so the AuthContext can transition the
// app to the unauthenticated state. The token guard is important — without it,
// a wrong-password login attempt would also dispatch `auth:expired`, racing
// with the login form's own error handling. We only treat a 401 as a session
// expiry if there was actually a session to expire.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  }
);

// --- Auth ---

export const loginRequest = (username, password) =>
  api.post("/auth/login", { username, password }).then((r) => r.data);

export const registerRequest = (username, password) =>
  api.post("/auth/register", { username, password }).then((r) => r.data);

// We still hit the endpoint on logout so Phase 5 can log a LOGOUT activity
// entry server-side; the AuthContext does not block on it.
export const logoutRequest = () =>
  api.post("/auth/logout").then((r) => r.data);

export const getMe = () => api.get("/auth/me").then((r) => r.data);

// --- Expense CRUD ---

// Fetch all expenses, optionally filtered
export const getExpenses = (params = {}) =>
  api.get("/expenses", { params }).then((r) => r.data);

// Fetch category + monthly summary 
export const getSummary = () =>
  api.get("/expenses/summary").then((r) => r.data);

// Create a new expense 
export const createExpense = (data) =>
  api.post("/expenses", data).then((r) => r.data);

// Update an expense by id 
export const updateExpense = (id, data) =>
  api.put(`/expenses/${id}`, data).then((r) => r.data);

// Delete an expense by id 
export const deleteExpense = (id) =>
  api.delete(`/expenses/${id}`).then((r) => r.data);

export default api;
