# Expense Tracker

A full stack single-page web application for tracking personal expenses. Users register and log in, record and manage expenses across ten categories, and view their spending through dashboard charts. Admins have a dedicated management console to oversee all users, audit every action taken in the system, and manage accounts.

Built as a React SPA backed by an Express + MongoDB API. One HTML entry point; there are no full-page reloads inside the app.

---

## Tech stack

**Backend**: Node.js, Express 4, Mongoose, MongoDB (targets MongoDB Atlas; any 4.4+ instance works). Auth via `jsonwebtoken` and `bcryptjs`. Environment config in `dotenv`, CORS.

**Frontend**: React 18, Vite 8, Axios, Chart.js with `react-chartjs-2` and `chartjs-plugin-datalabels`. No CSS framework — vanilla CSS with design tokens in `src/index.css`.

**Dev tools**: `nodemon` for backend auto-restart, the Vite dev server with a built-in `/api` proxy to Express so the frontend makes no cross-origin requests during development.

---

## Prerequisites

- Node.js 18 or newer, and npm.
- A MongoDB connection string. A free MongoDB Atlas cluster is the easiest option; a local `mongod` works too.

---

## Running locally

The app runs as two processes. Express on port 5000 and Vite on port 5173.

### 1. Clone and install

```bash
git clone <repo-url>
cd <repo-root>

# Backend
cd backend
npm install

# Frontend (separate terminal)
cd ../frontend
npm install
```

### 2. Configure the backend environment

Copy `backend/.env.example` to `backend/.env` and fill in real values:

```ini
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=<a long random string, at least 32 characters>
```

`JWT_SECRET` can be anything. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` generates a good one.

The frontend has no `.env` file for local dev; it sends requests to `/api` and the Vite proxy forwards them to Express.

### 3. Seed the database

From `backend/`:

```bash
npm run seed
```

This wipes the users, expenses, and activity collections and inserts realistic demo data: 15–20 users, 30–60 expenses per user spread across six months, and 500+ activity log entries. Two accounts are always created with stable credentials:

| Username | Password | Role  |
|----------|----------|-------|
| admin123 | admin123 | admin |
| demo     | demo123  | user  |

Run `npm run seed` any time you want a clean slate. It is fully idempotent.

### 4. Start both servers

```bash
# In backend/
npm run dev     # nodemon, restarts on file changes, port 5000

# In frontend/ (separate terminal)
npm run dev     # Vite dev server, port 5173
```

Open **http://localhost:5173**. CORS on the backend accepts `localhost:5173` and `127.0.0.1:5173` only.

---

## Features

### Authentication
- Register, log in, log out. Passwords are bcrypt-hashed (cost 10).
- Sessions use JWTs with a 24-hour expiry; the payload is `{ id, role }` only.
- The token is stored in `localStorage`. A cross tab `storage` event listener logs out all other open tabs when you sign out in one.
- The axios response interceptor catches 401s from expired or invalidated tokens, redirecting the app to the login screen.

### Expenses (per-user, fully scoped)
- Create, read, update, delete expenses with a title, amount, category, date, and optional description.
- Ten categories: Food & Dining, Transport, Housing & Rent, Utilities, Entertainment, Healthcare, Shopping, Education, Travel, Other.
- Live search bar filters by title and description in real time as you type: composes with category and month filters simultaneously.
- Every query is scoped by `user: req.user._id` on the server. A user cannot read or modify another user's data even with a valid token.

### Dashboard
- Summary cards: total spent, average per expense, highest single expense.
- Category doughnut chart showing spending breakdown.
- Monthly bar chart showing the last 12 months of spending.

### Admin Console
Accessible only to users with `role: admin`. The server enforces this independently of the client.

**Stats strip** -  three live KPI tiles at the top of the admin panel: total registered users, all-time activity entries, and activity entries in the last 24 hours. (Fetched once)

**Users tab**
- Paginated user table (25 per page, typeable page input to jump directly to any page).
- Debounced typeahead search: filters by username against the server, locks on selection so substring collisions (e.g. "test" vs "test2") don't appear.
- Create, edit, and delete user accounts. Admins cannot delete their own account (users currently cannot delete their account, only admins which is a current limitation)
- Clicking any row jumps to the Activity Log tab pre-filtered to that user.
- **Deleted users panel**: toggled by a "Deleted users" button in the header. Each deleted row is clickable and opens their full activity history.

**Activity Log tab**
- Paginated log of every recorded action across all users (25 per page, typeable page jump).
- Three composable filters: user typeahead (same debounced search as the Users tab), action type dropdown, and date preset (Today / Last 7 days / Last 30 days / All time - defaults to Last 30 days).
- Active-filter summary line with a "Clear all" link.
- Action-coded left-border accents: green for create actions, amber for updates, red for deletes, no accent for auth events.
- Relative timestamps (exact time if under an hour; hours/days/date beyond that) ticked every 10 seconds so they stay live while the page is open.

### Audit log
Every login, logout, registration, expense mutation, admin user-management action, and account deletion is recorded with a metadata snapshot. Log rows remain readable after the underlying record is renamed or deleted because the snapshot is written at the moment of the action, not resolved later by reference.

### Responsive layout
Tables collapse to card lists below 768 px. Modal forms and the admin panel adapt to narrow viewports. Desktop admin tables use reduced row padding for information density; mobile touch targets remain ≥ 44 × 44 px.

---

## API routes

All routes return JSON. Auth routes are unauthenticated; all others require a `Bearer <token>` header. Admin routes additionally require `role: admin`.

```
POST   /api/auth/register        Register a new user
POST   /api/auth/login           Log in, receive JWT
POST   /api/auth/logout          Record logout (fire-and-forget audit entry)
GET    /api/auth/me              Return current user from DB

GET    /api/expenses             List current user's expenses (filterable)
GET    /api/expenses/summary     Category + monthly totals for dashboard charts
POST   /api/expenses             Create an expense
PUT    /api/expenses/:id         Update an expense (ownership enforced)
DELETE /api/expenses/:id         Delete an expense (ownership enforced)

GET    /api/users                Admin: paginated user list (?page, ?limit, ?userId)
                                 ?search= switches to typeahead mode (max 20 results)
GET    /api/users/deleted        Admin: list of self-deleted accounts (tombstones)
POST   /api/users                Admin: create a user
PUT    /api/users/:id            Admin: update username / role / password
DELETE /api/users/:id            Admin: delete a user (cannot delete self)

GET    /api/activities           Admin: paginated activity log
                                 (?page, ?limit, ?userId, ?action, ?from, ?to)
```

---

## Database

Three collections:

**`users`**: `username` (unique), `passwordHash`, `role` (`user` | `admin`), `createdAt`.

**`expenses`**: `user` (ref), `title`, `amount`, `category`, `date`, `description`, `createdAt`.

**`useractivities`**: `user` (ref), `action` (enum), `metadata` (schemaless snapshot), `createdAt`. Indexed on `{ user, createdAt }` (compound) and `{ createdAt }` (standalone).

### Resetting the database

```bash
cd backend
npm run seed
```

To start completely fresh without demo data, run the seed then delete the extra accounts through the admin panel, or wipe collections manually in Atlas and register your first admin via the API then promote it:

```js
// Atlas shell / Compass
db.users.updateOne({ username: "yourname" }, { $set: { role: "admin" } })
```

---

## Folder structure

```
backend/
├── models/
│   ├── User.js             Schema + bcrypt helpers (setPassword, verifyPassword)
│   ├── Expense.js          Schema with user ref and category enum
│   └── UserActivity.js     Schema, ACTIONS enum, compound + standalone indexes
├── routes/
│   ├── auth.js             Register, login, logout, /me
│   ├── expenses.js         CRUD + summary aggregation, scoped to req.user
│   ├── users.js            Admin user management + deleted-users tombstone endpoint
│   └── activities.js       Admin activity log with AND-composed filters
├── middleware/
│   └── auth.js             requireAuth (re-fetches user from DB), requireAdmin
├── utils/
│   ├── jwt.js              signToken / verifyToken wrappers
│   └── logActivity.js      Fire-and-forget audit logger; captures timestamp
│                           synchronously before the async .create()
├── server.js               Express entry point, MongoDB connect, route mounting
├── seed.js                 Wipe + reseed with demo data (npm run seed)
└── .env.example            Environment variable template

frontend/
├── index.html              Single HTML entry point
├── vite.config.js          Vite config + /api proxy to Express
└── src/
    ├── main.jsx            React root mount
    ├── App.jsx             Authenticated shell: tab nav, expense state, toasts
    ├── App.css             Component styles (scoped classes, no framework)
    ├── index.css           Global reset + design tokens (CSS custom properties)
    ├── context/
    │   └── AuthContext.jsx 3-state reducer (loading/authenticated/unauthenticated),
    │                       login/register/logout actions, cross-tab sync
    ├── services/
    │   └── api.js          Axios instance, request/response interceptors, all API calls
    └── components/
        ├── auth/
        │   ├── AuthScreen.jsx   Login / Register toggle
        │   ├── LoginForm.jsx
        │   └── RegisterForm.jsx
        ├── admin/
        │   ├── AdminPanel.jsx   Admin Console header, stats strip, sub-nav
        │   ├── AdminStats.jsx   KPI tiles (users, total activity, last 24h)
        │   ├── UsersTable.jsx   Paginated user table, search, deleted-users panel
        │   ├── UserForm.jsx     Create / edit user modal
        │   └── ActivityLog.jsx  Paginated log, filters, action tones, relative time
        ├── Dashboard.jsx        Summary cards
        ├── CategoryChart.jsx    Doughnut chart (Chart.js)
        ├── MonthlyChart.jsx     Bar chart (Chart.js)
        ├── ExpenseList.jsx      Filterable + searchable expense table
        ├── ExpenseItem.jsx      Single expense row / card
        ├── ExpenseForm.jsx      Create / edit expense modal
        └── Toast.jsx            Notification stack
```

---

## Dependencies

**Backend runtime:** `bcryptjs`, `cors`, `dotenv`, `express`, `jsonwebtoken`, `mongoose`.  
**Backend dev:** `nodemon`.

**Frontend runtime:** `react`, `react-dom`, `axios`, `chart.js`, `react-chartjs-2`, `chartjs-plugin-datalabels`.  
**Frontend dev:** `vite`, `@vitejs/plugin-react`.

Versions are in `backend/package.json` and `frontend/package.json`.

---

## Code notes

Non-obvious decisions are documented in comments at the top of each file. Notable ones:

- `backend/middleware/auth.js`: `requireAuth` re-fetches the user from the DB on every request rather than trusting only the JWT payload. This means a deleted or demoted user loses access on their next request without waiting for the token to expire.
- `backend/utils/logActivity.js`: the audit logger is fire-and-forget and never throws. It captures `createdAt = new Date()` synchronously before the async `.create()` so rapid sequential events have the correct order in the log.
- `frontend/src/context/AuthContext.jsx`: the `auth:expired` event (fired by the axios interceptor on a 401 with a token present) and the `storage` event (fired when another tab clears the token) both route the app back to the login screen. 

