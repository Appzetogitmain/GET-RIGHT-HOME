import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

async function check() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected!');

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  const cities = await mongoose.connection.db.collection('cities').find().toArray();
  console.log('Cities:', cities);

  await mongoose.disconnect();
}

check().catch(console.error);
