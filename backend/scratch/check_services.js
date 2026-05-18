import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

import HomeServiceService from '../models/HomeServiceService.js';

async function check() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected!');

  const svcs = await HomeServiceService.find();
  console.log('Found services in database:');
  svcs.forEach(s => {
    console.log({
      id: s._id,
      title: s.title,
      categoryId: s.categoryId,
      subCategoryId: s.subCategoryId,
      isActive: s.isActive
    });
  });

  await mongoose.disconnect();
}

check().catch(console.error);
