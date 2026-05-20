# Expense Tracker

A full-stack single-page web app for tracking personal expenses. Users register and log in, record expenses across ten categories, see dashboard charts of their spending, and search and filter their list. Admins manage users and audit an activity log of every meaningful action in the system.

Built as a React SPA backed by an Express + MongoDB API. One HTML entry point, client-side rendering — there are no full page reloads inside the app.

## Tech stack

**Backend** — Node.js, Express 4, Mongoose, MongoDB (targets MongoDB Atlas but any 4.4+ instance works). Auth via `jsonwebtoken` and `bcryptjs`. Env via `dotenv`, CORS via `cors`.

**Frontend** — React 18, Vite 8, Axios, Chart.js with `react-chartjs-2` and `chartjs-plugin-datalabels`. No CSS framework — vanilla CSS with design tokens in `src/index.css`.

**Dev tools** — `nodemon` for the backend, the Vite dev server for the frontend with a built-in `/api` proxy to Express.

## Prerequisites

- Node.js 18 or newer, and npm.
- A MongoDB connection string. A free MongoDB Atlas cluster is the easiest way to get one; a local `mongod` works too.

## Running locally

The app runs as two processes — Express on port 5000 and Vite on port 5173. The Vite dev server proxies `/api/*` to Express, so the frontend makes no cross-origin requests during development.

### 1. Clone and install

```bash
git clone <repo-url>
cd <repo-root>

# backend
cd backend
npm install

# frontend, in a second terminal
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

`MONGO_URI` must be set for the server to connect. `JWT_SECRET` is read lazily — the server will boot without it, but any sign-in or token check will throw a clear error until it's set. The frontend does not need its own `.env` for local dev; it reads `/api` and lets the Vite proxy do the rest.

### 3. Seed demo data (optional, recommended)

From `backend/`:

```bash
npm run seed
```

The seed wipes the users, expenses, and activity collections and creates two accounts:

- `admin` / `admin123` — admin role, no pre-populated expenses, used for trying the admin panel.
- `demo` / `demo123` — regular user, with 25 pre-populated expenses across categories and the last six months.

The seed is idempotent — re-run it whenever you want a clean slate.

### 4. Start both servers

```bash
# backend/
npm run dev     # nodemon, port 5000

# frontend/, separate terminal
npm run dev     # vite, port 5173
```

Open <http://localhost:5173>. CORS on the backend is set to accept `localhost:5173` and `127.0.0.1:5173` only.

## Features

- **Authentication.** Register, log in, log out. Passwords are bcrypt-hashed (cost 10). Sessions are JWT-based, 24-hour expiry, payload limited to `{ id, role }`.
- **CRUD on three entities** — `User`, `Expense`, `UserActivity` — each with its own routes and Mongoose schema.
- **Per-user expense scoping.** Every list, summary, update, and delete query filters by `user: req.user._id`, so a user only sees and can modify their own data.
- **Live search** on the expenses table — case-insensitive substring across title and description, computed in-memory in the browser. Composes with the existing category and month filters.
- **Dashboard** with summary cards, a category bar chart, and a 12-month trend chart.
- **Admin panel.** Create / edit / delete users from a sortable table. Paginated activity-log viewer with a per-user filter.
- **Role-based access** with distinct semantics: missing or invalid auth returns `401`, authenticated-but-not-permitted returns `403`. The client treats these differently.
- **Cross-tab session sync** — logging out in one tab logs out the others via the `storage` event.
- **Audit log.** Every login, logout, registration, expense mutation, and admin user-management action is recorded with a metadata snapshot, so log rows stay readable after the underlying record is deleted or renamed.
- **Responsive layout.** Tables collapse to card lists below 768px; the modal forms and admin panels adapt to narrow viewports.

## Folder structure

```
backend/
├── models/        User.js, Expense.js, UserActivity.js
├── routes/        auth.js, expenses.js, users.js, activities.js
├── middleware/    auth.js              (requireAuth, requireAdmin)
├── utils/         jwt.js, logActivity.js
├── server.js
├── seed.js
└── .env.example

frontend/
├── index.html
├── vite.config.js
└── src/
    ├── components/
    │   ├── auth/    AuthScreen, LoginForm, RegisterForm
    │   ├── admin/   AdminPanel, UsersTable, UserForm, ActivityLog
    │   ├── Dashboard, ExpenseList, ExpenseItem, ExpenseForm
    │   ├── CategoryChart, MonthlyChart, Toast
    ├── context/     AuthContext.jsx
    ├── services/    api.js
    ├── App.jsx, main.jsx
    └── App.css, index.css
```

## Dependencies

**Backend runtime:** `bcryptjs`, `cors`, `dotenv`, `express`, `jsonwebtoken`, `mongoose`.
**Backend dev:** `nodemon`.

**Frontend runtime:** `react`, `react-dom`, `axios`, `chart.js`, `react-chartjs-2`, `chartjs-plugin-datalabels`.
**Frontend dev:** `vite`, `@vitejs/plugin-react`.

Versions are pinned in `backend/package.json` and `frontend/package.json` respectively.

## Notes for readers

The non-obvious decisions are documented in comments at the top of each file. The places worth starting:

- `backend/middleware/auth.js` — how authentication and the user/role re-fetch work on every request.
- `backend/routes/expenses.js` — how horizontal access control is enforced (`{ _id, user }` queries) and why a known expense ID cannot be operated on by another user.
- `backend/models/UserActivity.js` — what's logged, why metadata is snapshotted rather than referenced, and the rationale for the two indexes (compound `{ user, createdAt }` plus a standalone `{ createdAt }`).
- `backend/utils/logActivity.js` — why the audit logger is fire-and-forget and never throws.
- `frontend/src/context/AuthContext.jsx` — the three-state reducer (`loading` / `authenticated` / `unauthenticated`) and how `auth:expired` and `storage` events route the app back to the auth screen.
- `frontend/src/services/api.js` — the axios interceptors and the guard that prevents wrong-password login attempts from triggering a spurious global logout.