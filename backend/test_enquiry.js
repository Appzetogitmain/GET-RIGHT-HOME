import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Enquiry from './models/Enquiry.js';
import Property from './models/Property.js';
import RoomType from './models/RoomType.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const MONGO_URL = process.env.MONGODB_URL;

const attachPropertyStartingPrice = async (property) => {
    if (!property) return null;
    
    let propDoc;
    if (typeof property.toObject === 'function') {
        propDoc = property.toObject({ flattenMaps: true });
    } else {
        propDoc = JSON.parse(JSON.stringify(property));
        if (property.dynamicData) {
            if (typeof property.dynamicData.get === 'function') {
                propDoc.dynamicData = Object.fromEntries(property.dynamicData);
            } else if (property.dynamicData instanceof Map) {
                propDoc.dynamicData = Object.fromEntries(property.dynamicData);
            } else {
                propDoc.dynamicData = property.dynamicData;
            }
        }
    }
    
    // 1. Try to find RoomTypes
    const roomTypes = await RoomType.find({ propertyId: propDoc._id, isActive: true }).select('pricePerNight');
    if (roomTypes.length > 0) {
        propDoc.startingPrice = Math.min(...roomTypes.map(rt => rt.pricePerNight));
        return propDoc;
    }
    
    // 2. Try to get from dynamicData if it exists
    const dd = propDoc.dynamicData || {};
    const getVal = (key) => {
        if (typeof dd.get === 'function') return dd.get(key);
        return dd[key];
    };
    
    const priceVal =
        propDoc.startingPrice ??
        propDoc.rentDetails?.monthlyRent ??
        propDoc.pgDetails?.monthlyRent ??
        propDoc.buyDetails?.expectedPrice ??
        propDoc.plotDetails?.expectedPrice ??
        getVal('price') ??
        getVal('expectedPrice') ??
        getVal('rent') ??
        getVal('monthlyRent') ??
        propDoc.price;
        
    propDoc.startingPrice = priceVal || null;
    return propDoc;
};

async function test() {
  console.log('Connecting to:', MONGO_URL);
  await mongoose.connect(MONGO_URL);
  console.log('Connected to MongoDB successfully!');

  // Find latest enquiry
  const enquiry = await Enquiry.findOne().sort({ createdAt: -1 });
  if (!enquiry) {
    console.log('No enquiries found');
    await mongoose.disconnect();
    return;
  }

  console.log('Found enquiry:', enquiry._id, enquiry.enquiryId);

  // Let\'s try to simulate adminUpdateEnquiry
  try {
    const id = enquiry._id;
    const updateBody = {
      status: 'contacted',
      message: 'Updated message'
    };

    const doc = await Enquiry.findById(id);
    if (!doc) {
       throw new Error('Enquiry not found');
    }

    if (updateBody.status !== undefined) {
      doc.status = updateBody.status;
    }
    if (updateBody.message !== undefined) {
      doc.message = updateBody.message;
    }

    console.log('Saving enquiry...');
    await doc.save();
    console.log('Enquiry saved successfully');

    console.log('Populating...');
    const updated = await Enquiry.findById(id)
        .populate('userId', 'name email phone avatar')
        .populate('propertyId', 'propertyName coverImage address buyDetails rentDetails plotDetails propertyType transactionType dynamicData price startingPrice');

    console.log('Populated successfully, updated:', !!updated);
    if (updated) {
       console.log('Calling attachPropertyStartingPrice...');
       let enrichedEnquiry = updated.toObject();
       if (enrichedEnquiry.propertyId) {
           enrichedEnquiry.propertyId = await attachPropertyStartingPrice(enrichedEnquiry.propertyId);
       }
       console.log('Enriched successfully:', enrichedEnquiry.enquiryId);
    }

  } catch (error) {
    console.error('Error simulating update:', error);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
