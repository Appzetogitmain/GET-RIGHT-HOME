import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const reelSchema = new mongoose.Schema({
    videoPublicId: String,
    createdAt: Date
});

const Reel = mongoose.model('Reel', reelSchema);

async function deleteLatestReels() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        const latest = await Reel.find().sort({ createdAt: -1 }).limit(2);
        console.log('Latest 2 reels to be deleted:', latest.map(r => r._id));
        
        if (latest.length > 0) {
            const ids = latest.map(r => r._id);
            const res = await Reel.deleteMany({ _id: { $in: ids } });
            console.log('Deleted count:', res.deletedCount);
        } else {
            console.log('No reels found to delete.');
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

deleteLatestReels();
