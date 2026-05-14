import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from './models/SubscriptionPlan.js';

dotenv.config();

const checkPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        const plans = await SubscriptionPlan.find();
        console.log('Plans in DB:');
        plans.forEach(p => {
            console.log(`- ID: ${p._id}, Name: ${p.name}, Tier: ${p.tier}, Price: ${p.price}`);
        });
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkPlans();
