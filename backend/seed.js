// Seed script: wipes users + expenses + activity and inserts demo data.
//
// Guaranteed seed accounts (kept stable so manual login flows don't break):
//   admin123 / admin123  (role: admin)
//   demo     / demo123   (role: user)
//
// Generates 15–20 users total (≥2 admins),
// 30–60 expenses per user spread over the last 6 months, and ≥500 activity
// entries covering login/logout, expense CRUD, and admin user-management.
//
// Every collection is wiped first, then reseeded from scratch.
// Usage: npm run seed   

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Expense = require("./models/Expense");
const UserActivity = require("./models/UserActivity");
const { ACTIONS } = require("./models/UserActivity");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const SAMPLE_TITLES = {
  "Food & Dining": ["Grocery run", "Coffee with friends", "Dinner takeout", "Weekly groceries", "Brunch"],
  "Transport": ["Uber ride", "Petrol fill-up", "Train pass", "Bus fare", "Airport taxi"],
  "Housing & Rent": ["Monthly rent", "Renters insurance", "Apartment cleaning"],
  "Utilities": ["Electricity bill", "Internet bill", "Water bill", "Gas bill"],
  "Entertainment": ["Movie tickets", "Concert tickets", "Streaming subscription", "Board game night"],
  "Healthcare": ["GP visit", "Pharmacy", "Dental checkup"],
  "Shopping": ["New shoes", "Birthday gift", "Winter jacket", "Headphones"],
  "Education": ["Textbook", "Online course", "Stationery"],
  "Travel": ["Flight to Melbourne", "Hotel booking", "Travel insurance"],
  "Other": ["Charity donation", "Bank fee", "Miscellaneous"],
};

const CATEGORIES = Object.keys(SAMPLE_TITLES);

// Pool of usernames to draw from. Kept lowercase + underscore-safe to match the User schema validator.
const USERNAME_POOL = [
  "alice", "bob", "charlie", "dana", "eli",
  "fiona", "george", "hana", "ivan", "julia",
  "kevin", "lena", "mason", "nora", "owen",
  "priya", "quinn", "rita", "sam", "tina",
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

// A random date within the last `monthsBack` months. Used for expense
// `date` fields and for activity `createdAt` overrides (demo/testing purposes)
const dateWithinMonths = (monthsBack) => {
  const now = Date.now();
  const past = new Date();
  past.setMonth(past.getMonth() - monthsBack);
  return new Date(rand(past.getTime(), now));
};

async function seed() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is not set. Create backend/.env from .env.example first.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const now = new Date();

    // Wipe everything for reseed. 
    await Expense.deleteMany();
    await User.deleteMany();
    await UserActivity.deleteMany();
    console.log("Cleared existing users, expenses, and activity records");

    // --- Users ---
    // Two default accounts plus a randomised pool. 
    const userCount = rand(15, 20);
    const adminSlots = new Set([0]); // index 0 is admin123
    adminSlots.add(rand(2, userCount - 1));

    const users = [];
    const usernames = ["admin123", "demo", ...USERNAME_POOL.slice(0, userCount - 2)];

    for (let i = 0; i < userCount; i++) {
      const u = new User({
        username: usernames[i],
        role: adminSlots.has(i) ? "admin" : "user",
      });
      // Passwords for the two default seed accounts; everyone else gets a simple password (username(pass))
      const pw =
        i === 0 ? "admin123" : i === 1 ? "demo123" : `${usernames[i]}pass`;
      await u.setPassword(pw);
      await u.save();
      users.push(u);
    }
    console.log(`Created ${users.length} users (${[...adminSlots].length} admin)`);

    // --- Expenses ---
    // 30–60 per user, spread over the last 6 months. Snapshot the chosen
    // values so we can reuse them in activity metadata below without an extra DB roundtrip.
    const expensesByUser = new Map();
    const allExpenseDocs = [];

    for (const user of users) {
      const n = rand(30, 60);
      const userExpenses = [];
      for (let i = 0; i < n; i++) {
        const category = pick(CATEGORIES);
        const doc = {
          user: user._id,
          title: pick(SAMPLE_TITLES[category]),
          amount: rand(5, 500),
          category,
          date: dateWithinMonths(6),
          description: "Sample seeded data",
        };
        userExpenses.push(doc);
        allExpenseDocs.push(doc);
      }
      expensesByUser.set(user._id.toString(), userExpenses);
    }

    const insertedExpenses = await Expense.insertMany(allExpenseDocs);
    console.log(`Seeded ${insertedExpenses.length} expenses across ${users.length} users`);

    // Rebuild the per-user map with inserted docs (so we have real _ids
    // available for the UPDATE/DELETE activity metadata).
    const insertedByUser = new Map();
    for (const u of users) insertedByUser.set(u._id.toString(), []);
    for (const e of insertedExpenses) {
      insertedByUser.get(e.user.toString()).push(e);
    }

    // --- Activity log ---
    // Build at least 500 entries spread across auth, expense CRUD, and admin
    // user-management actions. We insert with explicit createdAt timestamps
    // so the date-range filter has something to test/demo.
    const activityDocs = [];
    const admins = users.filter((u) => u.role === "admin");

    // Every user: one REGISTER + a handful of LOGIN/LOGOUTs.
    for (const u of users) {
      activityDocs.push({
        user: u._id,
        action: ACTIONS.REGISTER,
        createdAt: dateWithinMonths(6),
      });
      const sessions = rand(3, 8);
      for (let i = 0; i < sessions; i++) {
        const loginAt = dateWithinMonths(6);
        const logoutAt = new Date(loginAt.getTime() + rand(5, 120) * 60 * 1000);
        activityDocs.push({ user: u._id, action: ACTIONS.LOGIN, createdAt: loginAt });
        activityDocs.push({ user: u._id, action: ACTIONS.LOGOUT, createdAt: logoutAt });
      }
    }

    // Expense CRUD: every inserted expense gets a CREATE entry; some also get UPDATE/DELETE entries.
    for (const e of insertedExpenses) {
      const snapshot = {
        expenseId: e._id,
        title: e.title,
        amount: e.amount,
        category: e.category,
      };
      activityDocs.push({
        user: e.user,
        action: ACTIONS.CREATE_EXPENSE,
        metadata: snapshot,
        createdAt: e.date,
      });
      // ~25% updated, ~10% deleted
      if (Math.random() < 0.25) {
        const updatedAt = new Date(e.date.getTime() + rand(1, 30) * 24 * 60 * 60 * 1000);
        activityDocs.push({
          user: e.user,
          action: ACTIONS.UPDATE_EXPENSE,
          metadata: snapshot,
          createdAt: updatedAt > now ? now : updatedAt,
        });
      }
      if (Math.random() < 0.1) {
        const deletedAt = new Date(e.date.getTime() + rand(1, 60) * 24 * 60 * 60 * 1000);
        activityDocs.push({
          user: e.user,
          action: ACTIONS.DELETE_EXPENSE,
          metadata: snapshot,
          createdAt: deletedAt > now ? now : deletedAt,
        });
      }
    }

    // Admin user-management: attribute to a random admin, target a random
    // non-admin. Enough entries to ensure all three CREATE/UPDATE/DELETE
    // action types show up under the new action filter.
    for (let i = 0; i < 30; i++) {
      const actor = pick(admins);
      const target = pick(users.filter((u) => u._id.toString() !== actor._id.toString()));
      const action = pick([
        ACTIONS.CREATE_USER,
        ACTIONS.UPDATE_USER,
        ACTIONS.DELETE_USER,
      ]);
      activityDocs.push({
        user: actor._id,
        action,
        metadata: {
          targetUserId: target._id,
          targetUsername: target.username,
          role: target.role,
        },
        createdAt: dateWithinMonths(6),
      });
    }

    await UserActivity.insertMany(activityDocs);
    console.log(`Seeded ${activityDocs.length} activity entries`);

    console.log("\nSeed accounts:");
    console.log("  username: admin123   password: admin123   role: admin");
    console.log("  username: demo       password: demo123    role: user");
    console.log("  (other users use the pattern <username>pass, e.g. alicepass)");

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
}

seed();
