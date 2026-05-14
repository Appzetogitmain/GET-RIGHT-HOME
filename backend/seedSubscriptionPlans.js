import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from './models/SubscriptionPlan.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
console.log('Env loaded:', process.env.MONGODB_URI ? 'YES' : 'NO');



const plans = [
    {
        name: "Silver Tier",

        tier: "silver",
        price: 6000,
        durationDays: 30,
        maxProperties: 2,
        leadCap: 10,
        hasVerifiedTag: false,
        bannerType: "none",
        rankingWeight: 1,
        pauseDaysAllowed: 0,
        description: "Entry level plan for locality presence with 10 leads per month."
    },
    {
        name: "Gold Basic",
        tier: "gold_basic",
        price: 5500,
        durationDays: 30,
        maxProperties: 5,
        leadCap: 0,
        hasVerifiedTag: true,
        bannerType: "none",
        rankingWeight: 2,
        pauseDaysAllowed: 0,
        description: "Unlimited leads with basic verification badge."
    },
    {
        name: "Gold Enterprise",
        tier: "gold",
        price: 30000,
        durationDays: 180,
        maxProperties: 10,
        leadCap: 0,
        hasVerifiedTag: true,
        bannerType: "none",
        rankingWeight: 3,
        pauseDaysAllowed: 36,
        description: "6 months of unlimited leads with a 36-day pause feature."
    },
    {
        name: "Platinum Plus",
        tier: "platinum",
        price: 25000,
        durationDays: 90,
        maxProperties: 20,
        leadCap: 0,
        hasVerifiedTag: true,
        bannerType: "city",
        rankingWeight: 4,
        pauseDaysAllowed: 0,
        description: "City level reach with banner rotation and high ranking."
    },
    {
        name: "Diamond Elite",
        tier: "diamond",
        price: 35000,
        durationDays: 180,
        maxProperties: 50,
        leadCap: 0,
        hasVerifiedTag: true,
        bannerType: "city",
        rankingWeight: 5,
        pauseDaysAllowed: 0,
        description: "Highest ranking, city banners, and massive listing capacity."
    }
];

const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Optional: Clear existing plans if you want a fresh start
        // await SubscriptionPlan.deleteMany({});

        for (const plan of plans) {
            await SubscriptionPlan.findOneAndUpdate(
                { tier: plan.tier },
                plan,
                { upsert: true, new: true }
            );
        }

        console.log('Subscription plans seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedPlans();
