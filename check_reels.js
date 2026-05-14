
import mongoose from 'mongoose';
import Reel from './backend/models/Reel.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const checkReels = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const count = await Reel.countDocuments();
        console.log(`Total Reels in DB: ${count}`);

        const reels = await Reel.find({}).sort({ createdAt: -1 }).limit(5).lean();
        console.log('Latest 5 reels:');
        reels.forEach(r => {
            console.log(`- ID: ${r._id}, User: ${r.user}, Created: ${r.createdAt}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkReels();
