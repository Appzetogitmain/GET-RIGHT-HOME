import mongoose from 'mongoose';
import User from './models/User.js';
import Booking from './models/Booking.js';

async function check() {
  await mongoose.connect('mongodb+srv://sagarchouhan7609_db_user:sagarchouhan7609_db_user@cluster0.od9npjt.mongodb.net/hoomzo');
  const user = await User.findOne({ phone: '6266925739' });
  console.log('User ID:', user._id);
  const count = await Booking.countDocuments({ userId: user._id, bookingStatus: { $ne: 'cancelled' } });
  console.log('Bookings with bookingStatus:', count);
  const all = await Booking.find({ userId: user._id });
  console.log('All bookings:', all.map(b => ({ id: b._id, status: b.bookingStatus, oldStatus: b.status })));
  process.exit(0);
}

check();
