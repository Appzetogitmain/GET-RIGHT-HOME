import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import HomeServiceCategory from './models/HomeServiceCategory.js';
import HomeServiceSubCategory from './models/HomeServiceSubCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const MONGO_URL = process.env.MONGODB_URL || 'mongodb+srv://sagarchouhan7609_db_user:sagarchouhan7609_db_user@cluster0.od9npjt.mongodb.net/hoomzo';

async function test() {
  console.log('Connecting to:', MONGO_URL);
  await mongoose.connect(MONGO_URL);
  console.log('Connected to MongoDB successfully!');

  const categories = await HomeServiceCategory.find({});
  console.log('\n--- Categories in DB ---');
  categories.forEach(c => {
    console.log(`ID: ${c._id}, Title: ${c.title}, Slug: ${c.slug}, isActive: ${c.isActive}`);
  });

  const subcategories = await HomeServiceSubCategory.find({});
  console.log('\n--- Sub-Categories in DB ---');
  subcategories.forEach(s => {
    console.log(`ID: ${s._id}, Title: ${s.title}, CategoryID: ${s.categoryId}, isActive: ${s.isActive}, cityIds: ${JSON.stringify(s.cityIds)}`);
  });

  await mongoose.disconnect();
}

test().catch(console.error);
