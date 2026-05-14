import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const reelSchema = new mongoose.Schema({
    category: String,
    caption: String,
    createdAt: Date
});

const Reel = mongoose.model('Reel', reelSchema);

async function checkReels() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        const total = await Reel.countDocuments();
        console.log('Total Reels:', total);
        
        const categories = await Reel.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        console.log('Reels by category:', categories);
        
        const latest = await Reel.find().sort({ createdAt: -1 }).limit(5);
        console.log('Latest 5 reels:', latest.map(r => ({ caption: r.caption, category: r.category, date: r.createdAt })));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkReels();
