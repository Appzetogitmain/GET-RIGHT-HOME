import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

import HomeServiceService from '../models/HomeServiceService.js';

async function seed() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected!');

  const categoryId = '6a0ae248717c3e85d5fdf190'; // Home Cleaning Services Category ID

  const services = [
    {
      title: 'Bathroom Cleaning',
      slug: 'bathroom-cleaning-service',
      categoryId,
      subheading: 'Shining clean bathrooms',
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
      basePrice: 499,
      discountPrice: 399,
      description: 'Deep cleaning of tiles, fittings, WC, washbasin, and mirrors for a sparkling bathroom.'
    },
    {
      title: 'Kitchen Cleaning',
      slug: 'kitchen-cleaning-service',
      categoryId,
      subheading: 'Grease-free sparkling kitchen',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400',
      basePrice: 1299,
      discountPrice: 999,
      description: 'Grease and stain removal from slab, tiles, exhaust, cabinets externally, and sink.'
    },
    {
      title: 'Premium Cleaning',
      slug: 'premium-cleaning-service',
      categoryId,
      subheading: 'Complete home refresh',
      imageUrl: 'https://images.unsplash.com/photo-1603796846097-bee99e4a60c9?auto=format&fit=crop&q=80&w=400',
      basePrice: 2999,
      discountPrice: 2499,
      description: 'Thorough deep cleaning of your entire home, including rooms, kitchen, and bathrooms.'
    },
    {
      title: 'Sofa Cleaning',
      slug: 'sofa-cleaning-service',
      categoryId,
      subheading: 'Dust and stain-free sofa',
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=400',
      basePrice: 799,
      discountPrice: 599,
      description: 'Dry vacuuming, shampooing, and wet extraction of fabric/leather sofas for a fresh look.'
    }
  ];

  for (const s of services) {
    // Delete existing if any to avoid clashes
    await HomeServiceService.deleteOne({ slug: s.slug });
    const created = await HomeServiceService.create({
      ...s,
      cityIds: ['default']
    });
    console.log('Created service:', created.title, 'with ID:', created._id);
  }

  await mongoose.disconnect();
}

seed().catch(console.error);
