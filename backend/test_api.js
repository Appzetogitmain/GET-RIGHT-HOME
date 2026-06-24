import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import hsBookingRoutes from './routes/hsBookingRoutes.js';
import { protect } from './middlewares/authMiddleware.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/hs-bookings', hsBookingRoutes);

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to DB');

    // we need to mock a user. Let's find any user.
    const User = (await import('./models/User.js')).default;
    const user = await User.findOne({});
    if (!user) {
      console.log('No user found');
      process.exit(0);
    }
    
    console.log('Found user:', user._id);
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Call the controller directly or via app
    // We will just mock req, res
    const { getUserBookings } = await import('./controllers/hsBookingController.js');
    
    const req = {
      user: user,
      query: {}
    };
    
    const res = {
      status: (code) => {
        console.log('Status set to:', code);
        return res;
      },
      json: (data) => {
        console.log('Response JSON:', JSON.stringify(data).substring(0, 200));
        process.exit(0);
      }
    };
    
    await getUserBookings(req, res);
    
  } catch (err) {
    console.error('Error in test:', err);
    process.exit(1);
  }
};

runTest();
