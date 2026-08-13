/**
 * Seeds one verified builder test user.
 *
 *   node scratch/seed_test_builder.js
 *
 * Login with phone below + OTP 123456 (dev OTP is always accepted).
 */
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

const PHONE = '9999900001';

async function run() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected!');

  const existing = await User.findOne({ phone: PHONE });
  if (existing) {
    console.log('Builder already exists:', { id: existing._id, name: existing.name, phone: existing.phone, role: existing.role });
  } else {
    const user = await User.create({
      name: 'Test Builder',
      phone: PHONE,
      role: 'builder',
      isVerified: true,
      builderProfile: {
        companyName: 'Test Builder Constructions',
        officeAddress: 'Hyderabad, Telangana',
        reraRegistrationNumber: 'TEST-RERA-0001',
        gstNumber: 'TEST-GST-0001',
        description: 'Seeded test builder account for local testing.',
        establishedYear: 2015,
        approvalStatus: 'approved'
      }
    });
    console.log('Created builder:', { id: user._id, name: user.name, phone: user.phone, role: user.role });
  }

  console.log(`\nLogin with phone ${PHONE} and OTP 123456`);
  await mongoose.disconnect();
}

run().catch(console.error);
