import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Property from './models/Property.js';
import User from './models/User.js';
import Partner from './models/Partner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/get-right-home";

const checkDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URL);
    console.log('Connected successfully!');

    const count = await Property.countDocuments();
    console.log(`\n========================================`);
    console.log(`TOTAL PROPERTIES IN DB: ${count}`);
    console.log(`========================================`);

    const latestProperties = await Property.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('userId', 'name email role mobile');

    if (latestProperties.length === 0) {
      console.log('No properties found in the database.');
    } else {
      console.log('\n--- LATEST 3 PROPERTIES CREATED ---');
      latestProperties.forEach((p, index) => {
        console.log(`\n[Property #${index + 1}]`);
        console.log(`ID: ${p._id}`);
        console.log(`Name: ${p.propertyName}`);
        console.log(`Category: ${p.propertyCategory}`);
        console.log(`Type: ${p.propertyType}`);
        console.log(`Transaction: ${p.transactionType}`);
        console.log(`Status: ${p.status}`);
        console.log(`Added By User Role: ${p.userId?.role || 'N/A'} (${p.userId?.email || 'No email'})`);
        console.log(`Dynamic Data Saved:`, JSON.stringify(p.dynamicData, null, 2));
        console.log(`----------------------------------------`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  }
};

checkDB();
