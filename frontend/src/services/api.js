// Axios service for all backend calls
// All components import from here 

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10 second timeout
});

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
