import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Property from '../models/Property.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

const query = async () => {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to DB');

    const total = await Property.countDocuments();
    console.log('Total properties:', total);

    const approved = await Property.countDocuments({ status: 'approved' });
    const live = await Property.countDocuments({ isLive: true });
    console.log('Approved properties:', approved);
    console.log('Live properties:', live);

    const types = await Property.aggregate([
      { $group: { _id: '$propertyType', count: { $sum: 1 } } }
    ]);
    console.log('\nProperty Types breakdown:', types);

    const txns = await Property.aggregate([
      { $group: { _id: '$transactionType', count: { $sum: 1 } } }
    ]);
    console.log('\nTransaction Types breakdown:', txns);

    const categories = await Property.aggregate([
      { $group: { _id: '$propertyCategory', count: { $sum: 1 } } }
    ]);
    console.log('\nProperty Categories breakdown:', categories);

    // List a few live properties with their details
    const liveProps = await Property.find({ isLive: true }).limit(5);
    console.log('\nSample Live Properties:');
    liveProps.forEach(p => {
      console.log(`- ${p.propertyName} | Type: ${p.propertyType} | Txn: ${p.transactionType} | Category: ${p.propertyCategory} | Price: ${p.rentDetails?.monthlyRent || p.buyDetails?.expectedPrice || p.plotDetails?.expectedPrice}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

query();
