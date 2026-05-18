import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

import HomeServiceCategory from '../models/HomeServiceCategory.js';

async function check() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected!');

  try {
    const title = 'Home Cleaning Services';
    const slug = 'home-cleaning-services';
    console.log('Attempting to create category with slug:', slug);
    const category = await HomeServiceCategory.create({
      title,
      slug,
      homeIconUrl: null,
      homeBadge: null,
      hasSaleBadge: false,
      showOnHome: true,
      homeOrder: 11,
      cityIds: ['default'],
      isDirectService: true
    });
    console.log('SUCCESS created category:', category);
  } catch (err) {
    console.error('ERROR during HomeServiceCategory.create:');
    console.error(err);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
