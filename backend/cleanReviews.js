import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Review from './models/Review.js';

mongoose.connect('mongodb+srv://sagarchouhan7609_db_user:sagarchouhan7609_db_user@cluster0.od9npjt.mongodb.net/hoomzo')
  .then(async () => {
    const res = await Review.deleteMany({
      $or: [
        { serviceId: { $exists: false } },
        { serviceId: null },
        { vendorId: null }
      ],
      propertyId: { $exists: false }
    });
    console.log('Deleted old orphaned reviews:', res);
    process.exit(0);
  })
  .catch(console.error);
