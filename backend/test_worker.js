import mongoose from 'mongoose';
import Worker from './models/Worker.js';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const workers = await Worker.find({});
    console.log(`Found ${workers.length} workers in DB.`);

    workers.forEach(w => {
      console.log('--------------------------------------------------');
      console.log(`Worker: ${w.name} (${w.email})`);
      console.log(`- Status: ${w.status}, Online: ${w.isOnline}, Approved: ${w.approvalStatus}`);
      console.log(`- Categories:`, w.serviceCategories);
      console.log(`- Location (lat, lng):`, w.location?.lat, w.location?.lng);
      console.log(`- GeoLocation:`, JSON.stringify(w.geoLocation));
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
