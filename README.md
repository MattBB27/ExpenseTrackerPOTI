# 💰 ExpenseTracker

A full-stack Single Page Application (SPA) for tracking personal expenses — built with **React + Vite**, **Node.js + Express**, and **MongoDB**.

---

## 📋 Problem Description

Managing day-to-day finances is a common challenge. People often lose track of where their money goes across different categories (food, rent, transport, etc.) and struggle to identify spending trends over time. **ExpenseTracker** solves this by providing a clean, responsive web app that lets users log, view, edit, and delete expenses — with visual charts to understand spending patterns at a glance.

---

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, Vite, CSS Custom Properties |
| Backend    | Node.js, Express 4                |
| Database   | MongoDB with Mongoose ODM         |
| Charts     | Chart.js + react-chartjs-2        |
| HTTP Client| Axios                             |

---

## ✨ Features

- ➕ **Add expenses** — title, category, amount, date, and optional description
- 📋 **View all expenses** — paginated table (desktop) and card list (mobile)
- ✏️ **Edit expenses** — inline modal with pre-filled values
- 🗑️ **Delete expenses** — with confirmation prompt
- 🔍 **Filter** by category or month
- 📊 **Dashboard** with:
  - Total spent (all time), this month, average per expense
  - Monthly spending bar chart (last 12 months)
  - Category breakdown doughnut chart
  - Category ranking with animated progress bars
- 📱 **Fully responsive** — works on mobile and desktop
- ✅ **Input validation** — client-side and server-side
- 🔔 **Toast notifications** — success and error feedback
- 🎨 **Dark theme** with smooth animations

---

## 📁 Folder Structure

```
expense-tracker/
│
├── backend/                   # Express + MongoDB API
│   ├── server.js              # App entry point, DB connection
│   ├── package.json
│   ├── .env.example           # Environment variable template
│   ├── models/
│   │   └── Expense.js         # Mongoose schema/model
│   └── routes/
│       └── expenses.js        # CRUD API routes + summary endpoint
│
├── frontend/                  # React SPA (Vite)
│   ├── index.html             # HTML shell
│   ├── vite.config.js         # Vite + proxy config
│   ├── package.json
│   └── src/
│       ├── main.jsx           # ReactDOM entry point
│       ├── App.jsx            # Root component, global state
│       ├── App.css            # All component styles
│       ├── index.css          # CSS variables and global reset
│       ├── components/
│       │   ├── Dashboard.jsx  # Summary cards + charts view
│       │   ├── ExpenseList.jsx# Filterable table/card list
│       │   ├── ExpenseItem.jsx# Single expense (table row or card)
│       │   ├── ExpenseForm.jsx# Add/Edit modal with validation
│       │   ├── MonthlyChart.jsx  # Bar chart (Chart.js)
│       │   ├── CategoryChart.jsx # Doughnut chart (Chart.js)
│       │   └── Toast.jsx      # Notification pill
│       └── services/
│           └── api.js         # Axios API service layer
│
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18 or later → https://nodejs.org
- **MongoDB** — choose one:
  - **Local:** Install from https://www.mongodb.com/try/download/community
  - **Cloud (Atlas):** Free tier at https://www.mongodb.com/atlas

---

### Step 1 — Clone / Download the project

```bash
# If using git:
git clone <your-repo-url>
cd expense-tracker

# Or just unzip the downloaded folder and cd into it
```

---

### Step 2 — Set up the Backend

```bash
cd backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Open `.env` and set your MongoDB URI:

```
# Local MongoDB (default — works if MongoDB is running locally)
MONGO_URI=mongodb://localhost:27017/expense_tracker
PORT=5000

# OR MongoDB Atlas (replace with your connection string):
# MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/expense_tracker
```

Start the backend server:

```bash
# Development (auto-restarts on file changes):
npm run dev

# Production:
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:5000
```

Test the API is working:
```bash
curl http://localhost:5000/api/health
# → {"status":"ok","message":"Expense Tracker API is running"}
```

---

### Step 3 — Set up the Frontend

Open a **new terminal tab**:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. 🎉

---

### Step 4 — Using MongoDB Atlas (Cloud) — Optional

1. Go to https://www.mongodb.com/atlas and sign up (free)
2. Create a free **M0** cluster
3. Under **Database Access**, create a user with read/write permissions
4. Under **Network Access**, add `0.0.0.0/0` (allow all IPs) for development
5. Click **Connect → Drivers → Node.js** to copy your connection string
6. Paste it into `backend/.env` as `MONGO_URI`

---

## 🔌 API Reference

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/api/health`             | Health check                         |
| GET    | `/api/expenses`           | Get all expenses (supports `?category=` & `?month=YYYY-MM`) |
| GET    | `/api/expenses/summary`   | Category totals + monthly trends     |
| POST   | `/api/expenses`           | Create a new expense                 |
| PUT    | `/api/expenses/:id`       | Update an expense                    |
| DELETE | `/api/expenses/:id`       | Delete an expense                    |

---

## 🧪 Example API Request

```bash
# Add an expense
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Grocery run",
    "amount": 85.50,
    "category": "Food & Dining",
    "date": "2024-03-15",
    "description": "Weekly supermarket shop"
  }'
```

---

## ⚠️ Challenges Faced

1. **MongoDB Aggregation for Monthly Trends** — Grouping expenses by year+month using `$group` and `$project` required understanding MongoDB's date operators (`$year`, `$month`). Filling in zero-value months on the frontend for a complete 12-month view took extra logic.

2. **Chart.js Registration in React** — Chart.js v4 requires manually registering each component (scales, elements, plugins) before use, which caused silent failures until the correct imports were identified.

3. **Keeping Charts Responsive** — Making Chart.js charts properly resize inside flex/grid containers required setting `maintainAspectRatio` and controlling container dimensions through CSS rather than canvas attributes.

4. **SPA State Synchronisation** — After a CRUD operation, both the expense list and summary totals need to stay in sync. Managing this with `useState`/`useEffect` without redundant API calls required careful use of `useCallback` and selective refetching.

5. **CORS + Vite Proxy** — During development, the React app (port 5173) needs to call the Express API (port 5000). Configuring Vite's proxy avoided CORS issues cleanly without needing to hard-code the backend URL in the frontend.

---

## 📜 License

This project was created as a university assignment. Free to use for educational purposes.
