import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const propertySchema = new mongoose.Schema({}, { strict: false });
const Property = mongoose.model('Property', propertySchema, 'properties');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    const total = await Property.countDocuments();
    console.log(`Total properties: ${total}`);

    const properties = await Property.find({}, 'name dynamicData availability status propertyType').lean();
    
    const availabilityCounts = {};
    const statuses = {};
    const types = {};

    properties.forEach(p => {
      const avail = p.dynamicData?.availability || p.availability || 'N/A';
      availabilityCounts[avail] = (availabilityCounts[avail] || 0) + 1;
      
      const stat = p.status || 'N/A';
      statuses[stat] = (statuses[stat] || 0) + 1;

      const type = p.propertyType || 'N/A';
      types[type] = (types[type] || 0) + 1;
    });

    console.log('Availability Counts:', availabilityCounts);
    console.log('Statuses:', statuses);
    console.log('Property Types:', types);

    if (properties.length > 0) {
      console.log('\nSample Properties:');
      properties.slice(0, 5).forEach(p => {
        console.log(`- ${p.name} (${p.propertyType}): Status=${p.status}, Avail=${p.dynamicData?.availability || p.availability}`);
      });
    }

  } catch (error) {
    console.error('Error running inspection:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
