// scripts/migrateBuilderProjectDetails.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Property from '../models/Property.js';
import BuilderProjectDetails from '../models/BuilderProjectDetails.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const runMigrationOnStartup = async () => {
  try {
    console.log('Starting migration of builder project details...');
    // Find all properties with builderProjectDetails containing at least one property
    const properties = await Property.find({
      $or: [
        { 'builderProjectDetails.possessionStatus': { $exists: true, $ne: null } },
        { 'builderProjectDetails.possessionYear': { $exists: true, $ne: null } },
        { 'builderProjectDetails.ratings.constructionQuality': { $exists: true, $ne: null } },
        { 'builderProjectDetails.ratings.aiSummary': { $exists: true, $ne: null } },
        { 'builderProjectDetails.priceHistory.currentPricePerSqft': { $exists: true, $ne: null } },
        { 'builderProjectDetails.priceHistory.appreciationLast3Years': { $exists: true, $ne: null } }
      ]
    });

    console.log(`[Migration] Found ${properties.length} properties with builder project details to migrate.`);

    let migratedCount = 0;
    for (const property of properties) {
      const details = property.builderProjectDetails;
      if (!details) continue;

      // Check if details are actually non-empty
      const hasData = details.possessionStatus ||
                      details.possessionYear ||
                      (details.ratings && (details.ratings.constructionQuality || details.ratings.aiSummary)) ||
                      (details.priceHistory && (details.priceHistory.currentPricePerSqft || details.priceHistory.appreciationLast3Years));

      if (!hasData) continue;

      const newDetails = {
        propertyId: property._id,
        possessionStatus: details.possessionStatus,
        possessionYear: details.possessionYear,
        ratings: {
          constructionQuality: details.ratings?.constructionQuality,
          aiSummary: details.ratings?.aiSummary
        },
        priceHistory: {
          currentPricePerSqft: details.priceHistory?.currentPricePerSqft,
          appreciationLast3Years: details.priceHistory?.appreciationLast3Years
        }
      };

      // Upsert into new collection
      await BuilderProjectDetails.findOneAndUpdate(
        { propertyId: property._id },
        newDetails,
        { upsert: true, new: true }
      );

      console.log(`[Migration] Migrated builder project details for Property: "${property.propertyName}" (${property._id})`);
      migratedCount++;
    }

    console.log(`[Migration] Successfully migrated ${migratedCount} properties to the new BuilderProjectDetails collection!`);
  } catch (error) {
    console.error('[Migration] Error during builder project details migration:', error);
    throw error;
  }
};

const runDirectly = async () => {
  try {
    console.log('Connecting to database...');
    const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/getrighthome';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB.');
    await runMigrationOnStartup();
    process.exit(0);
  } catch (error) {
    console.error('Direct run migration failed:', error);
    process.exit(1);
  }
};

if (process.argv[1] && (process.argv[1].endsWith('migrateBuilderProjectDetails.js') || process.argv[1].endsWith('migrateBuilderProjectDetails'))) {
  runDirectly();
}
