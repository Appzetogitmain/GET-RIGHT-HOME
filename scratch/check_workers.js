import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

import Worker from '../backend/models/Worker.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoomzo';

async function check() {
  try {
    console.log('Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const workers = await Worker.find({});
    console.log(`\nTotal workers in database: ${workers.length}\n`);

    workers.forEach((w, index) => {
      console.log(`${index + 1}. Name: ${w.name}`);
      console.log(`   Phone: ${w.phone}`);
      console.log(`   Approval Status: ${w.approvalStatus}`);
      console.log(`   Is Active: ${w.isActive}`);
      console.log(`   Is Online: ${w.isOnline}`);
      console.log(`   Categories: ${JSON.stringify(w.serviceCategories)}`);
      console.log(`   Location: ${JSON.stringify(w.location)}`);
      console.log(`   GeoLocation: ${JSON.stringify(w.geoLocation)}`);
      console.log('-------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error in check:', err);
    process.exit(1);
  }
}

check();
