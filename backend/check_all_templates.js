import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import PropertyFormTemplate from './models/PropertyFormTemplate.js';
import BuilderFormTemplate from './models/BuilderFormTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, './.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/get-right-home";

const checkDB = async () => {
  try {
    console.log('Connecting to:', MONGODB_URL);
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to DB');

    const standardCount = await PropertyFormTemplate.countDocuments();
    const builderCount = await BuilderFormTemplate.countDocuments();

    console.log(`Standard templates count: ${standardCount}`);
    console.log(`Builder templates count: ${builderCount}`);

    const sampleStd = await PropertyFormTemplate.findOne({
      transactionType: 'Sell',
      category: 'Residential',
      propertyType: 'Apartment'
    });

    const sampleBldr = await BuilderFormTemplate.findOne({
      transactionType: 'Sell',
      category: 'Residential',
      propertyType: 'Apartment'
    });

    if (sampleStd) {
      console.log('Sample Standard Template (Sell-Residential-Apartment):');
      console.log(`- Steps: ${sampleStd.steps.length}`);
      sampleStd.steps.forEach(s => {
        console.log(`  * Step ${s.stepNumber}: ${s.title} (${s.fields.length} fields)`);
      });
    } else {
      console.log('No Sell-Residential-Apartment standard template found.');
    }

    if (sampleBldr) {
      console.log('Sample Builder Template (Sell-Residential-Apartment):');
      console.log(`- Steps: ${sampleBldr.steps.length}`);
      sampleBldr.steps.forEach(s => {
        console.log(`  * Step ${s.stepNumber}: ${s.title} (${s.fields.length} fields)`);
      });
    } else {
      console.log('No Sell-Residential-Apartment builder template found.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkDB();
