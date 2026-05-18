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

  const db = mongoose.connection.db;
  const collection = db.collection('homeservicecategories');
  const indexes = await collection.indexes();
  console.log('Indexes on homeservicecategories:');
  console.log(indexes);

  await mongoose.disconnect();
}

check().catch(console.error);
