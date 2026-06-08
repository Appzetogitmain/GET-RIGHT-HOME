import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env' });

import Enquiry from './backend/models/Enquiry.js';
import Property from './backend/models/Property.js';
import RoomType from './backend/models/RoomType.js';

async function check() {
    try {
        console.log('Connecting to', process.env.MONGODB_URL);
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to DB');

        const enquiries = await Enquiry.find()
            .populate({
                path: 'propertyId',
                select: 'propertyName coverImage address propertyType buyDetails rentDetails plotDetails pgDetails dynamicData price startingPrice userId partnerId'
            })
            .limit(5);

        console.log('\n--- Enquiries ---');
        for (const e of enquiries) {
            console.log(`Enquiry ID: ${e.enquiryId}`);
            if (e.propertyId) {
                const p = e.propertyId;
                console.log(`  Property ID: ${p._id}`);
                console.log(`  Property Name: ${p.propertyName}`);
                console.log(`  Property Type: ${p.propertyType}`);
                console.log(`  buyDetails:`, JSON.stringify(p.buyDetails));
                console.log(`  rentDetails:`, JSON.stringify(p.rentDetails));
                console.log(`  pgDetails:`, JSON.stringify(p.pgDetails));
                console.log(`  plotDetails:`, JSON.stringify(p.plotDetails));
                console.log(`  dynamicData:`, JSON.stringify(p.dynamicData));
                console.log(`  price:`, p.price);
                console.log(`  startingPrice:`, p.startingPrice);
                
                // Let's run attachPropertyStartingPrice logic
                const propDoc = JSON.parse(JSON.stringify(p));
                const roomTypes = await RoomType.find({ propertyId: propDoc._id, isActive: true }).select('pricePerNight');
                let startingPrice = null;
                if (roomTypes.length > 0) {
                    startingPrice = Math.min(...roomTypes.map(rt => rt.pricePerNight));
                } else {
                    const dd = propDoc.dynamicData || {};
                    startingPrice =
                        propDoc.startingPrice ??
                        propDoc.rentDetails?.monthlyRent ??
                        propDoc.pgDetails?.monthlyRent ??
                        propDoc.buyDetails?.expectedPrice ??
                        propDoc.plotDetails?.expectedPrice ??
                        dd.price ??
                        dd.expectedPrice ??
                        dd.rent ??
                        dd.monthlyRent ??
                        propDoc.price;
                }
                console.log(`  Calculated startingPrice:`, startingPrice);
            } else {
                console.log('  No propertyId populated');
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
