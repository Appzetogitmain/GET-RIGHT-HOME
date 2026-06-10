import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from './models/SubscriptionPlan.js';
import SubscriptionTier from './models/SubscriptionTier.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://rukkooin:rukkooin@cluster0.6mzfrnp.mongodb.net/?appName=Cluster0";

const defaultTiers = [
    { name: "Silver", key: "silver" },
    { name: "Gold Basic", key: "gold_basic" },
    { name: "Gold", key: "gold" },
    { name: "Platinum", key: "platinum" },
    { name: "Diamond", key: "diamond" }
];

const plans = [
    {
        name: "Starter Silver Pack",
        tier: "silver",
        price: 999,
        durationDays: 30,
        maxProperties: 2,
        leadCap: 5,
        hasVerifiedTag: false,
        bannerType: "none",
        rankingWeight: 1,
        pauseDaysAllowed: 0,
        description: "Entry level plan with low price. List up to 2 properties and get 5 leads per month."
    },
    {
        name: "Professional Gold Pack",
        tier: "gold",
        price: 2499,
        durationDays: 30,
        maxProperties: 10,
        leadCap: 0, // Unlimited
        hasVerifiedTag: true,
        bannerType: "none",
        rankingWeight: 3,
        pauseDaysAllowed: 5,
        description: "Perfect for active agents. List up to 10 properties with unlimited leads and verified badge."
    },
    {
        name: "Elite Diamond Pack",
        tier: "diamond",
        price: 4999,
        durationDays: 30,
        maxProperties: 35,
        leadCap: 0, // Unlimited
        hasVerifiedTag: true,
        bannerType: "city",
        rankingWeight: 5,
        pauseDaysAllowed: 10,
        description: "Premium plan for top brokers. List up to 35 properties, unlimited leads, and city banners."
    }
];

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URL);
        console.log('Connected to MongoDB');

        // 1. Seed Tiers
        console.log('Seeding Tiers...');
        for (const tier of defaultTiers) {
            await SubscriptionTier.findOneAndUpdate(
                { key: tier.key },
                tier,
                { upsert: true, new: true }
            );
        }
        console.log('Tiers seeded successfully.');

        // 2. Clear old plans and seed the 3 standard plans
        console.log('Seeding 3 standard plans...');
        await SubscriptionPlan.deleteMany({});
        for (const plan of plans) {
            await SubscriptionPlan.create(plan);
        }
        console.log('3 Standard Subscription plans seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
