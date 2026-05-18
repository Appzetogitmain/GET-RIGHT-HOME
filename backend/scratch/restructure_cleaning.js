import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL;

import HomeServiceCategory from '../models/HomeServiceCategory.js';
import HomeServiceSubCategory from '../models/HomeServiceSubCategory.js';
import HomeServiceService from '../models/HomeServiceService.js';

async function restructure() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected to DB!');

  // 1. Clean up potential duplicate/confusing categories
  console.log('Cleaning up duplicate categories...');
  await HomeServiceCategory.deleteMany({
    slug: { $in: ['bathroom-cleaning', 'home-cleaning'] }
  });

  // Ensure Parent Category "Home Cleaning Services" exists
  let parentCategory = await HomeServiceCategory.findOne({ slug: 'home-cleaning-services' });
  if (!parentCategory) {
    parentCategory = await HomeServiceCategory.create({
      title: 'Home Cleaning Services',
      slug: 'home-cleaning-services',
      isDirectService: true, // Mark it so we identify it below curations video
      showOnHome: true,
      isActive: true,
      homeOrder: 10,
      cityIds: ['default']
    });
    console.log('Created parent category:', parentCategory.title);
  } else {
    parentCategory.isDirectService = true;
    parentCategory.showOnHome = true;
    await parentCategory.save();
    console.log('Found and updated parent category:', parentCategory.title);
  }

  const categoryId = parentCategory._id;

  // 2. Clean up any existing seeded direct services to avoid clashing
  await HomeServiceService.deleteMany({
    slug: { $in: [
      'bathroom-cleaning-service', 
      'kitchen-cleaning-service', 
      'premium-cleaning-service', 
      'sofa-cleaning-service',
      'bathroom-deep-cleaning',
      'kitchen-deep-cleaning',
      'full-house-deep-cleaning',
      'sofa-shampoo-cleaning'
    ]}
  });

  // 3. Define the Sub-categories we want to create under "Home Cleaning Services"
  const subCatsToCreate = [
    {
      title: 'Bathroom Cleaning',
      slug: 'bathroom-cleaning-sub',
      categoryId,
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
      icon: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=200',
      description: 'Expert deep cleaning for sparkling, hygienic bathrooms.'
    },
    {
      title: 'Kitchen Cleaning',
      slug: 'kitchen-cleaning-sub',
      categoryId,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400',
      icon: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=200',
      description: 'Grease and stain-free kitchen cleaning services.'
    },
    {
      title: 'Premium Cleaning',
      slug: 'premium-cleaning-sub',
      categoryId,
      imageUrl: 'https://images.unsplash.com/photo-1603796846097-bee99e4a60c9?auto=format&fit=crop&q=80&w=400',
      icon: 'https://images.unsplash.com/photo-1603796846097-bee99e4a60c9?auto=format&fit=crop&q=80&w=200',
      description: 'Thorough house refresh deep cleaning.'
    },
    {
      title: 'Sofa Cleaning',
      slug: 'sofa-cleaning-sub',
      categoryId,
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=400',
      icon: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=200',
      description: 'Vacuuming, shampooing and dry cleaning for fabric/leather sofas.'
    }
  ];

  // Map to hold created sub-category IDs
  const createdSubCats = {};

  for (const sc of subCatsToCreate) {
    await HomeServiceSubCategory.deleteOne({ slug: sc.slug });
    const subCat = await HomeServiceSubCategory.create({
      ...sc,
      cityIds: ['default']
    });
    console.log('Created sub-category:', subCat.title, 'with ID:', subCat._id);
    createdSubCats[subCat.title] = subCat._id;
  }

  // 4. Create actual Services under these newly created Sub-categories!
  const servicesToCreate = [
    {
      title: 'Bathroom Deep Cleaning',
      slug: 'bathroom-deep-cleaning',
      categoryId,
      subCategoryId: createdSubCats['Bathroom Cleaning'],
      subheading: 'Shining clean bathrooms',
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
      basePrice: 499,
      discountPrice: 399,
      description: 'Deep cleaning of tiles, fittings, WC, washbasin, and mirrors for a sparkling bathroom.'
    },
    {
      title: 'Kitchen Deep Cleaning',
      slug: 'kitchen-deep-cleaning',
      categoryId,
      subCategoryId: createdSubCats['Kitchen Cleaning'],
      subheading: 'Grease-free sparkling kitchen',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400',
      basePrice: 1299,
      discountPrice: 999,
      description: 'Grease and stain removal from slab, tiles, exhaust, cabinets externally, and sink.'
    },
    {
      title: 'Full House Deep Cleaning',
      slug: 'full-house-deep-cleaning',
      categoryId,
      subCategoryId: createdSubCats['Premium Cleaning'],
      subheading: 'Complete home refresh',
      imageUrl: 'https://images.unsplash.com/photo-1603796846097-bee99e4a60c9?auto=format&fit=crop&q=80&w=400',
      basePrice: 2999,
      discountPrice: 2499,
      description: 'Thorough deep cleaning of your entire home, including rooms, kitchen, and bathrooms.'
    },
    {
      title: 'Sofa Shampoo & Cleaning',
      slug: 'sofa-shampoo-cleaning',
      categoryId,
      subCategoryId: createdSubCats['Sofa Cleaning'],
      subheading: 'Dust and stain-free sofa',
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=400',
      basePrice: 799,
      discountPrice: 599,
      description: 'Dry vacuuming, shampooing, and wet extraction of fabric/leather sofas for a fresh look.'
    }
  ];

  for (const s of servicesToCreate) {
    const createdSvc = await HomeServiceService.create({
      ...s,
      cityIds: ['default']
    });
    console.log('Created service:', createdSvc.title, 'under Sub-category ID:', createdSvc.subCategoryId);
  }

  console.log('Restructure and seeding completed successfully!');
  await mongoose.disconnect();
}

restructure().catch(console.error);
