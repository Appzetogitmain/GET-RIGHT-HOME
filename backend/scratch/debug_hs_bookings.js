import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import User from '../models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URL || "mongodb+srv://sagarchouhan7609_db_user:sagarchouhan7609_db_user@cluster0.od9npjt.mongodb.net/hoomzo";

async function debug() {
  try {
    console.log('Connecting to MongoDB using:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected successfully!');

    // 1. Test the query that throws 500
    console.log('\n--- 1. Testing getUserBookings query ---');
    const user = await User.findOne({ email: /devendra/i });
    if (!user) {
      console.log('No user found with email devendra to test getUserBookings.');
    } else {
      console.log(`Using test userId: ${user._id} (${user.name})`);
      const statusStr = 'journey_started,visited,in_progress,work_done';
      const statusArr = statusStr.split(',').map(s => s.trim());
      const query = {
        userId: user._id,
        status: { $in: statusArr }
      };
      
      console.log('Executing find(query)...');
      try {
        const bookings = await HomeServiceBooking.find(query)
          .populate('vendorId', 'name businessName phone profilePhoto')
          .populate('serviceId', 'title iconUrl')
          .populate('categoryId', 'title slug')
          .populate('workerId', 'name phone profilePhoto')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
        console.log(`Success! Found ${bookings.length} bookings.`);
      } catch (err) {
        console.error('ERROR in getUserBookings find query:', err);
      }
    }

    // 2. Test the worker assigned jobs query
    console.log('\n--- 2. Testing worker jobs query (slowness) ---');
    const workerBookingCount = await HomeServiceBooking.countDocuments();
    console.log(`Total bookings in DB: ${workerBookingCount}`);

    console.log('Disconnecting...');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Connection/Debug Error:', err);
  }
}

debug();
