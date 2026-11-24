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

// Usage: node scratch/reset_admin_password.js <admin-email> <new-password>
// SECURITY: the email and password used to be hardcoded here (and that
// password is probably still the live superadmin password — change it).
const [, , EMAIL, NEW_PASSWORD] = process.argv;

async function run() {
  if (!EMAIL || !NEW_PASSWORD || NEW_PASSWORD.length < 12) {
    console.error('Usage: node scratch/reset_admin_password.js <admin-email> <new-password (12+ chars)>');
    process.exit(1);
  }
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
