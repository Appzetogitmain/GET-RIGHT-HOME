import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User.js';

const MONGO_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/hoomzo';

async function check() {
  try {
    console.log('Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const users = await User.find({}).limit(5);
    console.log(`Total users fetched: ${users.length}\n`);

    users.forEach((u, i) => {
      console.log(`${i+1}. Name: ${u.name}`);
      console.log(`   Phone: ${u.phone}`);
      console.log(`   Addresses: ${JSON.stringify(u.addresses, null, 2)}`);
      console.log('----------------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
