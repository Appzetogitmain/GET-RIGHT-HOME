import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import Admin from '../models/Admin.js';

const EMAIL = 'getrighthome7@gmail.com';
const NEW_PASSWORD = 'GrhAdmin@123';

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('Connected!');

  const admin = await Admin.findOne({ email: EMAIL }).select('+password');
  if (!admin) {
    console.log('No admin found with that email.');
    return;
  }

  admin.password = await bcrypt.hash(NEW_PASSWORD, 10);
  admin.isActive = true;
  await admin.save();
  console.log('Password reset for:', admin.email, '| role:', admin.role);

  await mongoose.disconnect();
}
run().catch(console.error);
