import mongoose from 'mongoose';
import Reel from '../models/Reel.js';
import dotenv from 'dotenv';

dotenv.config();

const printReels = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URL);
        console.log('Connected to DB');
        const reels = await Reel.find({}).sort({ createdAt: -1 }).limit(10).lean();
        console.log(JSON.stringify(reels, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

printReels();
