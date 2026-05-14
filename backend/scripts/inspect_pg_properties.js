import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import Property from '../models/Property.js';
import PropertyCategory from '../models/PropertyCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const inspectProperties = async () => {
    await connectDB();
    const logFile = join(__dirname, 'inspection_output.txt');
    let output = '';

    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        log('--- Inspecting PG/Hostel Properties ---');
        // Find all properties that might be relevant
        const properties = await Property.find({
            $or: [
                { propertyType: { $in: ['pg', 'hostel', 'pg/co-living'] } },
                { dynamicCategory: { $exists: true, $ne: null } }
            ]
        }).select('propertyName propertyType dynamicCategory status isLive');

        log(`Found ${properties.length} potentially relevant properties.`);

        for (const prop of properties) {
            log(`\nProperty: ${prop.propertyName} (${prop._id})`);
            log(`  Type: ${prop.propertyType}`);
            log(`  Status: ${prop.status}, Live: ${prop.isLive}`);

            if (prop.dynamicCategory) {
                const cat = await PropertyCategory.findById(prop.dynamicCategory);
                if (cat) {
                    log(`  Dynamic Category ID: ${prop.dynamicCategory}`);
                    log(`  Category Name: ${cat.name}`);
                    log(`  Category DisplayName: ${cat.displayName}`);
                } else {
                    log(`  Dynamic Category: ${prop.dynamicCategory} -> NOT FOUND in DB!`);
                }
            } else {
                log(`  Dynamic Category: Not Set (null/undefined)`);
            }
        }

        log('\n--- Checking Categories ---');
        const categories = await PropertyCategory.find({});
        log('All Categories in DB:');
        categories.forEach(c => {
            log(`  ${c.name} / ${c.displayName} (${c._id})`);
        });

        await fs.writeFile(logFile, output);
        log(`Output written to ${logFile}`);

    } catch (err) {
        console.error('Error inspecting properties:', err);
    } finally {
        mongoose.connection.close();
    }
};

inspectProperties();
