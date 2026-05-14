import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Partner from './models/Partner.js';
import Booking from './models/Booking.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL || "mongodb+srv://rukkooin:rukkooin@cluster0.6mzfrnp.mongodb.net/?appName=Cluster0");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const smartFix = async () => {
  await connectDB();

  try {
    console.log("Starting smart analysis of bookings...");
    const bookings = await Booking.find({});

    let userCount = 0;
    let partnerCount = 0;
    let notFoundCount = 0;

    for (const booking of bookings) {
      const id = booking.userId;
      if (!id) continue;

      // Check User
      const userExists = await User.findById(id);
      if (userExists) {
        if (booking.userModel !== 'User') {
          booking.userModel = 'User';
          await booking.save();
          console.log(`Booking ${booking.bookingId}: Identified as User`);
        }
        userCount++;
        continue;
      }

      // Check Partner
      const partnerExists = await Partner.findById(id);
      if (partnerExists) {
        if (booking.userModel !== 'Partner') {
          booking.userModel = 'Partner';
          await booking.save();
          console.log(`Booking ${booking.bookingId}: Identified as Partner`);
        }
        partnerCount++;
        continue;
      }

      console.log(`Booking ${booking.bookingId}: User ID ${id} not found in User or Partner collections.`);
      notFoundCount++;
    }

    console.log("------------------------------------------------");
    console.log(`Summary:`);
    console.log(`Confirmed Users: ${userCount}`);
    console.log(`Confirmed Partners: ${partnerCount}`);
    console.log(`Orphaned IDs: ${notFoundCount}`);

  } catch (error) {
    console.error("Smart fix failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit();
  }
};

smartFix();
