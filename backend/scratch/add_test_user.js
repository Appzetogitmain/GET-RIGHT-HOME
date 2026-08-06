import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

import User from '../models/User.js';

const PHONE = '8643041429';

async function run() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected!');

  const existing = await User.findOne({ phone: PHONE });
  if (existing) {
    console.log('User already exists:', { id: existing._id, name: existing.name, phone: existing.phone });
  } else {
    const user = await User.create({
      name: 'Test User',
      phone: PHONE,
      role: 'user',
      isVerified: true
    });
    console.log('Created user:', { id: user._id, name: user.name, phone: user.phone });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
