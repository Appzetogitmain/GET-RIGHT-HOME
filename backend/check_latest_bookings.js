import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import HomeServiceBooking from './models/HomeServiceBooking.js';

const MONGO_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/hoomzo';

async function check() {
  try {
    console.log('Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const bookings = await HomeServiceBooking.find({}).sort({ createdAt: -1 }).limit(3);
    console.log(`Retrieved ${bookings.length} bookings:\n`);

    bookings.forEach((b, i) => {
      console.log(`${i+1}. Booking Number: ${b.bookingNumber}`);
      console.log(`   Status: ${b.status}`);
      console.log(`   Model: ${b.bookingModel}`);
      console.log(`   Service Name: ${b.serviceName}`);
      console.log(`   Service Category: ${b.serviceCategory}`);
      console.log(`   Address: ${JSON.stringify(b.address)}`);
      console.log(`   Potential Workers: ${JSON.stringify(b.potentialWorkers)}`);
      console.log(`   Notified Partners: ${JSON.stringify(b.notifiedPartners)}`);
      console.log(`   Worker ID (assigned): ${b.workerId}`);
      console.log(`   Created At: ${b.createdAt}`);
      console.log('----------------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
