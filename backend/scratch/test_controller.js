import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

import { createCategory } from '../controllers/homeServiceController.js';

async function test() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected!');

  // Mock Request and Response
  const req = {
    body: {
      title: 'Home Cleaning Test Category',
      homeIconUrl: null,
      homeBadge: null,
      hasSaleBadge: false,
      showOnHome: true,
      homeOrder: 15,
      cityIds: [],
      isDirectService: true
    }
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('RESPONSE STATUS:', this.statusCode);
      console.log('RESPONSE JSON:', data);
    }
  };

  try {
    await createCategory(req, res);
  } catch (err) {
    console.error('Controller threw error:', err);
  }

  // Clean up
  await mongoose.connection.db.collection('homeservicecategories').deleteOne({ slug: 'home-cleaning-test-category' });
  await mongoose.disconnect();
}

test().catch(console.error);
