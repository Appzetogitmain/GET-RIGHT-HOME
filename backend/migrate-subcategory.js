import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const MONGO_URL = process.env.MONGODB_URL || 'mongodb+srv://rukkooin:rukkooin@cluster0.6mzfrnp.mongodb.net/?appName=Cluster0';

async function migrate() {
  await mongoose.connect(MONGO_URL);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('homeservicesubcategories');

  // Find all docs that don't have cityIds array (old schema had cityId string)
  const docs = await collection.find({}).toArray();
  console.log(`Total sub-categories in DB: ${docs.length}`);
  
  let migrated = 0;
  for (const doc of docs) {
    const update = {};
    
    // If cityIds is missing or not an array, migrate it
    if (!Array.isArray(doc.cityIds)) {
      const oldCityId = doc.cityId || 'default';
      update.cityIds = [oldCityId];
    }
    
    // If badge is missing, set empty string
    if (doc.badge === undefined) {
      update.badge = '';
    }
    
    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: update });
      console.log(`Migrated: ${doc.title} -> cityIds: ${update.cityIds || doc.cityIds}`);
      migrated++;
    }
  }
  
  console.log(`\n✅ Migration complete! ${migrated}/${docs.length} documents updated.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
