// scripts/seedLocations.js
// Run: node scripts/seedLocations.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import Location from '../models/Location.js';

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://sagarchouhan7609_db_user:sagarchouhan7609_db_user@cluster0.od9npjt.mongodb.net/hoomzo";

const seed = async () => {
  await mongoose.connect(MONGODB_URL);
  console.log('✅ Connected to MongoDB');

  // Clear existing location data
  await Location.deleteMany({});
  console.log('🗑  Cleared existing locations');

  // ── Country ─────────────────────────────────────────────
  const india = await Location.create({ name: 'India', type: 'country', breadcrumb: {}, sortOrder: 1 });
  console.log('✅ India created');

  // ── State ────────────────────────────────────────────────
  const karnataka = await Location.create({
    name: 'Karnataka',
    type: 'state',
    parentId: india._id,
    breadcrumb: { country: 'India' },
    sortOrder: 1
  });
  console.log('✅ Karnataka created');

  // ── Districts ────────────────────────────────────────────
  const districtData = [
    'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
    'Bidar', 'Chamarajanagar', 'Chikballapur', 'Chikkamagaluru', 'Chitradurga',
    'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
    'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
    'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
    'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir', 'Vijayanagara'
  ];

  const districtDocs = {};
  for (let i = 0; i < districtData.length; i++) {
    const d = await Location.create({
      name: districtData[i],
      type: 'district',
      parentId: karnataka._id,
      breadcrumb: { country: 'India', state: 'Karnataka' },
      sortOrder: i + 1
    });
    districtDocs[districtData[i]] = d;
  }
  console.log(`✅ ${districtData.length} districts created`);

  // ── Cities/Areas for Bengaluru Urban ─────────────────────
  const bengaluruUrban = districtDocs['Bengaluru Urban'];
  const urbanAreas = [
    'Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Anekal', 'Yelahanka'
  ];
  for (let i = 0; i < urbanAreas.length; i++) {
    await Location.create({
      name: urbanAreas[i],
      type: 'city',
      parentId: bengaluruUrban._id,
      breadcrumb: { country: 'India', state: 'Karnataka', district: 'Bengaluru Urban' },
      sortOrder: i + 1
    });
  }
  console.log(`✅ ${urbanAreas.length} Bengaluru Urban areas created`);

  // ── Cities/Areas for Bengaluru Rural ─────────────────────
  const bengaluruRural = districtDocs['Bengaluru Rural'];
  const ruralAreas = [
    'Devanahalli', 'Doddaballapura', 'Hosakote', 'Nelamangala'
  ];
  for (let i = 0; i < ruralAreas.length; i++) {
    await Location.create({
      name: ruralAreas[i],
      type: 'city',
      parentId: bengaluruRural._id,
      breadcrumb: { country: 'India', state: 'Karnataka', district: 'Bengaluru Rural' },
      sortOrder: i + 1
    });
  }
  console.log(`✅ ${ruralAreas.length} Bengaluru Rural areas created`);

  console.log('\n🎉 Location seed complete!');
  await mongoose.disconnect();
};

seed().catch(e => { console.error('❌ Seed failed:', e); process.exit(1); });
