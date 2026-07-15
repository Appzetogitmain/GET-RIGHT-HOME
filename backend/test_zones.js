import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import Zone from './models/Zone.js';

mongoose.connect(process.env.MONGODB_URL).then(async () => {
  console.log('Connected to DB');
  const zones = await Zone.find();
  console.log('Zones count:', zones.length);
  console.log('Zones:', JSON.stringify(zones, null, 2));
  mongoose.disconnect();
}).catch(console.error);
