# 💰 Expense Tracker

A full-stack single page application for tracking personal expenses. Built with React, Node.js + Express, and MongoDB.


## Problem Description

Managing finances is a problem that affect most people on the planet. People often lose track of where their money goes across different categories (food, rent, transport, etc) and struggle to responsibily manage their finances. **ExpenseTracker** solves this by providing a clean, responsive web app that lets users log, view, edit, and delete expenses together with visual charts to understand spending patterns, and identify key areas of concern.


## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, Vite, CSS               |
| Backend    | Node.js, Express 4                |
| Database   | MongoDB w/ Mongoose ODM           |
| Charts     | Chart.js + react-chartjs-2        |
| HTTP Client| Axios                             |


## Features

- **Add expenses** — title, category, amount, date, and optional description
- **View all expenses** — paginated table 
- **Edit expenses** — inline modal with pre-filled values
- **Delete expenses** — with a confirmation prompt
- **Filter** by category or month
- **Dashboard** with:
  - Total spent (all time) and total spent this month
  - Monthly spending bar chart (last 12 months)
  - Category breakdown doughnut chart
  - Category ranking with progress bars
- **Fully responsive** — works on mobile and desktop
- **Input validation** — client-side and server-side
- **Toast notifications** — success and error feedback
- **Dark theme** with smooth animations

---

## Project Structure

```
expense-tracker/
│
├── backend/                       # Express + MongoDB API
│   ├── server.js                  # App entry point, DB connection
│   ├── package.json
│   ├── .env.example               # Environment variable template (hide private info)
│   ├── models/
│   │   └── Expense.js             # Mongoose schema/model
│   └── routes/
│       └── expenses.js            # CRUD API routes + summary endpoint
│
├── frontend/                      # React single page application (Vite)
│   ├── index.html                 # HTML shell
│   ├── vite.config.js             # Vite + proxy config
│   ├── package.json
│   └── src/
│       ├── main.jsx               # ReactDOM entry point
│       ├── App.jsx                # Root component, global state
│       ├── App.css                # All component styles
│       ├── index.css              # CSS variables and global reset
│       ├── components/
│       │   ├── Dashboard.jsx      # Summary cards + charts view
│       │   ├── ExpenseList.jsx    # Filterable table list
│       │   ├── ExpenseItem.jsx    # Single expense (table row)
│       │   ├── ExpenseForm.jsx    # Add/Edit modal with validation
│       │   ├── MonthlyChart.jsx   # Bar chart (Chart.js)
│       │   ├── CategoryChart.jsx  # Doughnut chart (Chart.js)
│       │   └── Toast.jsx          # Notifications
│       └── services/
│           └── api.js             # Axios API service layer
│
└── README.md
```



## Setup Instructions

### Prerequisites

- **Node.js** v18 or later → https://nodejs.org
- **MongoDB** — choose one:
  - **Local:** (Recommended) Install from https://www.mongodb.com/try/download/community
  - **Cloud (Atlas):** Free tier at https://www.mongodb.com/atlas

---

### Step 1: Clone / Download the project

```bash
# Unzip the downloaded folder and cd into it
cd expense-tracker
```
---

### Step 2: Set up the Backend

```bash
cd backend
npm install
```
---

### Step 3: Database setup
```bash
# Create a .env file inside the backend folder:
cp .env.example .env 
# OR
copy .env.example .env 
```
Open and ensure it contains this code. Select Option A or Option B and replace the 1st line:
```bash
MONGO_URI=your_connection_string_here
PORT=5000
```

Option A: Local MongoDB (Recommended)
```bash
# Replace the string in .env file with this
MONGO_URI=mongodb://localhost:27017/expense-tracker
```
Option B: MongoDB Atlas (what I used)
```bash
# Create a cluster and copy your connection string into .env (longer set-up)
```
Data seed for demo purposes. This is NOT required but RECOMMENDED when testing the application.
You can run it AFTER you start with a blank expense list if you so wish 
```bash
# DISCLAIMER: you need to STOP running the backend if you wish to do this later. This will overwrite any EXISTING data.
# May require a page refresh
npm run seed
```
---

### Step 4: Start backend server
```bash
# Back to terminal expense-tracker/backend
npm run dev
```

You should see:
```
Connected to MongoDB
Server running on http://localhost:5000
```
---

### Step 5: Set up the Frontend

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

Open **http://localhost:5173** in your browser. 


## API References

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/api/health`             | Health check                         |
| GET    | `/api/expenses`           | Get all expenses (with filtering capabilities) |
| GET    | `/api/expenses/summary`   | Category totals + monthly trends     |
| POST   | `/api/expenses`           | Create a new expense                 |
| PUT    | `/api/expenses/:id`       | Update an expense                    |
| DELETE | `/api/expenses/:id`       | Delete an expense                    |

---

## Challenges Faced

1. **Incorrect monthly grouping in MongoDB**: Initially, expenses weren't grouped by month correctly (with months with $0 in expenses causing issue too) as well as some months missing or combining. This was due to mistakes when using MongoDB date operators. To fix this, explicitly extracting the year and month using $month was a glaringly obvious fix that came after much trial and error. I addition, I got the frontend to insert zero values into missing/cost-free months.

2. **Charts not rendering through trial and error**: The charts were difficult to get working especially since I had not used Chart.js before. I realised I had to explicitly register all the elements (like CategoryScale, LinearScale, etc) before they could render, and it was a lot of trial and error to get them to what I could deem good enough.

3. **Charts overflowing and sizing poorly**: Charts were either overflowing (and cropping out key details) or were not sized correctly (too big or too small) which was partly due to the grid layouts. Chart.js maintains its own aspect ratio by default, and it took me a while to discover disabling maintainAspectRatio was the culprit.

4. **State Desyncronisation**: After a CRUD operation, the dashboard summary and charts didn't IMMEDIATELY show the changes. UI depended on shared data and would not update consistently, and to fix this, I made sure the local state updates IMMEDIATELY after changes and re-fetching summary data if needed, as well as using useCallback ot prevent re-renders that are unnecessary.

5. **API Requests failing**: API calls from frontend initially were having problems as the frontend and backend where on different ports. So instead of hardcoded URLs I configured a proxy in vite which mdae API requests simple for development.



## READ THIS
I did NOT include a .env (which means more set-up steps; trade-off for emulating good security practices).
You can also CHOOSE to seed data; the user experience is very intuitive whether there is existing data or nothing at all.

