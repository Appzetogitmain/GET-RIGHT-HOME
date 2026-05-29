import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Property from '../models/Property.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/get-right-home";

const checkPlotImages = async () => {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to DB');
    
    const plots = await Property.find({
      $or: [
        { propertyCategory: /plot/i },
        { propertyCategory: /land/i },
        { propertyType: /plot/i },
        { propertyType: /land/i }
      ]
    });
    
    console.log(`Found ${plots.length} plot/land properties.`);
    plots.forEach(p => {
      console.log(`Property ID: ${p._id}`);
      console.log(`Name: ${p.propertyName}`);
      console.log(`CoverImage: ${p.coverImage}`);
      console.log(`PropertyImages:`, p.propertyImages);
      console.log(`DynamicData Images:`, p.dynamicData?.get?.('propertyImages'));
      console.log('---');
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkPlotImages();
