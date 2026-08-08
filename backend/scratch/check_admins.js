import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import Admin from '../models/Admin.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  const admins = await Admin.find().select('name email phone role isActive createdAt');
  console.log(JSON.stringify(admins, null, 2));
  await mongoose.disconnect();
}
run().catch(console.error);
