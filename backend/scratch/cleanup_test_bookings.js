import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dns.setServers(['8.8.8.8', '1.1.1.1']);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import HomeServiceBooking from '../models/HomeServiceBooking.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';

const TEST_USER_ID = '6a741fba2e3483ee380bc422'; // Test User / 8643041429

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('Connected!');

  const bookings = await HomeServiceBooking.find({ userId: TEST_USER_ID })
    .select('bookingNumber status createdAt');
  console.log(`Found ${bookings.length} booking(s) for the test user:`);
  bookings.forEach(b => console.log(`  ${b.bookingNumber} | ${b.status} | ${b.createdAt.toISOString()}`));

  if (process.argv[2] === 'delete') {
    const ids = bookings.map(b => b._id);
    const reqRes = await BookingRequest.deleteMany({ bookingId: { $in: ids } });
    const bRes = await HomeServiceBooking.deleteMany({ userId: TEST_USER_ID });
    console.log(`\nDeleted ${bRes.deletedCount} booking(s) and ${reqRes.deletedCount} booking request(s).`);
  } else {
    console.log('\n(dry run — pass "delete" to remove them)');
  }

  await mongoose.disconnect();
}
run().catch(e => { console.error(e.message); process.exit(1); });
