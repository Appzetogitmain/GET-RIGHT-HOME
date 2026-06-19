import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || "mongodb+srv://rukkooin:rukkooin@cluster0.6mzfrnp.mongodb.net/?appName=Cluster0");
    console.log('MongoDB connected');
    
    // Import dynamically after connection
    const VendorBill = (await import('../backend/models/VendorBill.js')).default;
    const HomeServiceBooking = (await import('../backend/models/HomeServiceBooking.js')).default;
    
    // Find the latest booking that is in "work_done" status
    const latestBooking = await HomeServiceBooking.findOne({ status: 'work_done' }).sort({ createdAt: -1 });
    console.log('Latest Work Done Booking:');
    console.log(latestBooking ? latestBooking._id : 'None');
    
    if (latestBooking) {
      const bill = await VendorBill.findOne({ bookingId: latestBooking._id });
      console.log('Corresponding Vendor Bill:');
      console.log(bill);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

connectDB();
