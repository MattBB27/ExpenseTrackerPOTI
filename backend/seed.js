import mongoose from "mongoose";
import dotenv from "dotenv";
import Expense from "./models/Expense.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const categories = [
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

// Helper: random number
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate realistic dates across last 6 months
const generateDate = (monthsAgo) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    d.setDate(rand(1, 28));
    return d;
};

const seedExpenses = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // 🔥 Clear existing data (optional)
        await Expense.deleteMany();

        const sampleData = [];

        for (let i = 0; i < 20; i++) {
            const category = categories[rand(0, categories.length - 1)];

            sampleData.push({
                title: `${category} expense`,
                amount: rand(5, 500),
                category,
                date: generateDate(rand(0, 5)),
                description: "Sample seeded data",
            });
        }

        await Expense.insertMany(sampleData);

        console.log("✅ Database seeded with sample expenses");
        process.exit();
    } catch (err) {
        console.error("❌ Seed error:", err.message);
        process.exit(1);
    }
};

seedExpenses();