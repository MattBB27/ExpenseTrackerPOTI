// Seed script — wipes users + expenses and inserts demo data.
//
// Creates two accounts:
//   admin / admin123  (role: admin)
//   demo  / demo123   (role: user)
//
// Then seeds 25 realistic expenses split between them.
//
// Usage: npm run seed   (run from backend/, requires .env to be set up)

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Expense = require("./models/Expense");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const SAMPLE_TITLES = {
  "Food & Dining":  ["Grocery run", "Coffee with friends", "Dinner takeout", "Weekly groceries", "Brunch"],
  "Transport":      ["Uber ride", "Petrol fill-up", "Train pass", "Bus fare", "Airport taxi"],
  "Housing & Rent": ["Monthly rent", "Renters insurance", "Apartment cleaning"],
  "Utilities":      ["Electricity bill", "Internet bill", "Water bill", "Gas bill"],
  "Entertainment":  ["Movie tickets", "Concert tickets", "Streaming subscription", "Board game night"],
  "Healthcare":     ["GP visit", "Pharmacy", "Dental checkup"],
  "Shopping":       ["New shoes", "Birthday gift", "Winter jacket", "Headphones"],
  "Education":      ["Textbook", "Online course", "Stationery"],
  "Travel":         ["Flight to Melbourne", "Hotel booking", "Travel insurance"],
  "Other":          ["Charity donation", "Bank fee", "Miscellaneous"],
};

const CATEGORIES = Object.keys(SAMPLE_TITLES);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const generateDate = (monthsAgo) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(rand(1, 28));
  return d;
};

async function seed() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is not set. Create backend/.env from .env.example first.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Wipe existing data so the seed is idempotent
    await Expense.deleteMany();
    await User.deleteMany();
    console.log("Cleared existing users and expenses");

    // Create the two seed users
    const admin = new User({ username: "admin", role: "admin" });
    await admin.setPassword("admin123");
    await admin.save();

    const demo = new User({ username: "demo", role: "user" });
    await demo.setPassword("demo123");
    await demo.save();

    console.log("Created seed users");

    // Generate 25 expenses alternating between the two users so both
    // accounts have data to explore
    const users = [admin, demo];
    const expenses = [];

    for (let i = 0; i < 25; i++) {
      const owner = users[i % 2];
      const category = pick(CATEGORIES);
      expenses.push({
        user: owner._id,
        title: pick(SAMPLE_TITLES[category]),
        amount: rand(5, 500),
        category,
        date: generateDate(rand(0, 5)),
        description: "Sample seeded data",
      });
    }

    await Expense.insertMany(expenses);
    console.log(`Seeded ${expenses.length} expenses`);

    console.log("\nSeed accounts:");
    console.log("  username: admin   password: admin123   role: admin");
    console.log("  username: demo    password: demo123    role: user");

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
}

seed();
