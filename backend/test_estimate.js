import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const HomeServiceCategory = (await import('./models/HomeServiceCategory.js')).default;
    const cats = await HomeServiceCategory.find({});
    console.log('--- Categories ---');
    cats.forEach(c => console.log(c.title, 'isEstimateBased:', c.isEstimateBased));
    
    const Booking = (await import('./models/HomeServiceBooking.js')).default;
    const lastBooking = await Booking.findOne().sort({ createdAt: -1 });
    console.log('--- Last Booking ---');
    if (lastBooking) {
      console.log('Service:', lastBooking.serviceName);
      console.log('Category:', lastBooking.serviceCategory);
      console.log('isEstimateBased:', lastBooking.isEstimateBased);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
