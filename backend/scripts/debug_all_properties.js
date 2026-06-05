import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Property from '../models/Property.js';
import PropertyCategory from '../models/PropertyCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URL);
console.log('Connected');

// 1. All Categories in DB
const cats = await PropertyCategory.find({}).lean();
console.log('\n=== CATEGORIES IN DB ===');
cats.forEach(c => {
  console.log(`  ID: ${c._id} | name: "${c.name}" | displayName: "${c.displayName}" | isActive: ${c.isActive}`);
});

// 2. All Properties summary
const props = await Property.find({}).select('propertyName propertyType transactionType propertyCategory dynamicCategory status isLive').lean();
console.log(`\n=== ALL PROPERTIES (${props.length} total) ===`);
props.forEach(p => {
  console.log(`  [${p.status}|live:${p.isLive}] "${p.propertyName}" => type:"${p.propertyType}" | txn:"${p.transactionType}" | cat:"${p.propertyCategory}" | dynCat:${p.dynamicCategory || 'null'}`);
});

// 3. Approved+Live properties
const live = props.filter(p => p.status === 'approved' && p.isLive === true);
console.log(`\n=== APPROVED + LIVE (${live.length}) ===`);
live.forEach(p => {
  console.log(`  "${p.propertyName}" => type:"${p.propertyType}" | txn:"${p.transactionType}" | cat:"${p.propertyCategory}" | dynCat:${p.dynamicCategory || 'null'}`);
});

// 4. Status breakdown
const statusMap = {};
props.forEach(p => {
  const key = `status:${p.status}|isLive:${p.isLive}`;
  statusMap[key] = (statusMap[key] || 0) + 1;
});
console.log('\n=== STATUS BREAKDOWN ===');
Object.entries(statusMap).forEach(([k, v]) => console.log(`  ${k} => ${v} properties`));

await mongoose.connection.close();
console.log('\nDone.');
