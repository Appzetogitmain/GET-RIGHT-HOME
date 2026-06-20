import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import FeaturedPlan from '../models/FeaturedPlan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const plans = [
  {
    name: 'Pro',
    color: 'purple',
    description: 'Top-tier visibility. Maximum ranking weight for premium handpicked placement.',
    defaultDurationDays: 60,
    weight: 100,
    isActive: true
  },
  {
    name: 'Gold',
    color: 'amber',
    description: 'Excellent visibility and high ranking in handpicked sections.',
    defaultDurationDays: 30,
    weight: 50,
    isActive: true
  },
  {
    name: 'Silver',
    color: 'slate',
    description: 'Standard featured tag for verified properties.',
    defaultDurationDays: 15,
    weight: 10,
    isActive: true
  }
];

const seedFeaturedPlans = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/getrighthome');
    console.log('Connected to DB.');

    for (const plan of plans) {
      const existing = await FeaturedPlan.findOne({ name: plan.name });
      if (existing) {
        console.log(`Plan ${plan.name} already exists. Updating...`);
        await FeaturedPlan.findByIdAndUpdate(existing._id, plan);
      } else {
        console.log(`Creating Plan ${plan.name}...`);
        await FeaturedPlan.create(plan);
      }
    }

    console.log('Successfully seeded Featured Plans!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding featured plans:', error);
    process.exit(1);
  }
};

seedFeaturedPlans();
