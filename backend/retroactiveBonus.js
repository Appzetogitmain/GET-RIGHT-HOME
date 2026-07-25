import mongoose from 'mongoose';
import Worker from './models/Worker.js';
import dotenv from 'dotenv';
import { checkAndAwardTargetBonus } from './utils/targetBonusUtil.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const workers = await Worker.find({ isActive: true });
    
    for (const worker of workers) {
      await checkAndAwardTargetBonus(worker._id);
    }
    
    console.log('Finished checking bonuses for all workers');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
