// Seed script for the expenses collection.
// Wipes existing expenses and inserts ~25 realistic sample records spread
// across the last 6 months so the dashboard and charts have something to show.
//
// Usage: npm run seed   (stop the backend first; this overwrites existing data)

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Expense = require("./models/Expense");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Pool of realistic titles keyed by category. Picking from these (rather than
// "<Category> expense") gives us variety so the live search added later has
// something meaningful to filter on.
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

// Random integer in [min, max] inclusive
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

// Generate a date `monthsAgo` months ago on a random day (1-28 to avoid Feb edge cases).
const generateDate = (monthsAgo) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(rand(1, 28));
  return d;
};

async function seedExpenses() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is not set. Create backend/.env from .env.example first.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Expense.deleteMany();
    console.log("Cleared existing expenses");

    const sampleData = [];
    for (let i = 0; i < 25; i++) {
      const category = pick(CATEGORIES);
      sampleData.push({
        title: pick(SAMPLE_TITLES[category]),
        amount: rand(5, 500),
        category,
        date: generateDate(rand(0, 5)),
        description: "Sample seeded data",
      });
    }

    await Expense.insertMany(sampleData);
    console.log(`Seeded ${sampleData.length} sample expenses`);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
}

seedExpenses();
