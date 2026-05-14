import mongoose from 'mongoose';
import 'dotenv/config';
import Property from './backend/models/Property.js';
import RoomType from './backend/models/RoomType.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb+srv://rukkooin:rukkooin@cluster0.6mzfrnp.mongodb.net/?appName=Cluster0');
        console.log('Connected to DB');

        const properties = await Property.find({}, 'propertyName status isLive propertyType');
        console.log('\n--- Properties ---');
        if (properties.length === 0) {
            console.log('No properties found.');
        }
        for (const p of properties) {
            const rtCount = await RoomType.countDocuments({ propertyId: p._id, isActive: true });
            console.log(`Name: ${p.propertyName} | Status: ${p.status} | Live: ${p.isLive} | Type: ${p.propertyType} | Active RoomTypes: ${rtCount}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
