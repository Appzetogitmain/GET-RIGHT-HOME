import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import PropertyFormTemplate from './models/PropertyFormTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, './.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/get-right-home";

const checkDB = async () => {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to DB');
    const templates = await PropertyFormTemplate.find({});
    console.log('Templates in DB:', JSON.stringify(templates, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkDB();
