import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import HomeServiceCategory from '../models/HomeServiceCategory.js';
import HomeServiceSubCategory from '../models/HomeServiceSubCategory.js';
import HomeServiceService from '../models/HomeServiceService.js';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('Connected to MongoDB!');

  const category = await HomeServiceCategory.findOne({ slug: 'cleaning' });
  if (!category) {
    console.error('Cleaning category not found!');
    process.exit(1);
  }
  const categoryId = category._id;
  console.log('Using Cleaning Category ID:', categoryId);

  // 1. Existing Subcategory: "Bathroom services"
  const bathroomSub = await HomeServiceSubCategory.findOne({ slug: 'bathroom-services' });
  if (bathroomSub) {
    // Authorized bathroom cleaner child
    const authCleaner = await HomeServiceSubCategory.findOne({ slug: 'authorized-bathroom-cleaner' });
    if (authCleaner) {
      // Add "Post Interior Work" and "Elite Deep Cleaning"
      const servicesToAdd = [
        {
          title: 'Post Interior Work',
          slug: 'post-interior-work-cleaning',
          categoryId,
          subCategoryId: authCleaner._id,
          badge: '✨',
          rating: 4.65,
          reviewCount: '63',
          duration: '6 hrs',
          basePrice: 5499,
          discountPrice: 4699,
          imageUrl: 'https://images.unsplash.com/photo-1502005229762-ee1b4434ec30?auto=format&fit=crop&q=80&w=400',
          features: [
            'Includes everything in Premium Plan',
            'Includes sticker, gum and garbage removal',
            'Paint and stain removal with the best possible efficiency (100% removal not guaranteed)'
          ],
          cityIds: ['default'],
          bookingModes: ['slot'],
          isActive: true
        },
        {
          title: 'Elite Deep Cleaning',
          slug: 'elite-bathroom-deep-cleaning',
          categoryId,
          subCategoryId: authCleaner._id,
          badge: '👑',
          rating: 4.88,
          reviewCount: '12.4K+',
          duration: '4 hrs',
          basePrice: 2499,
          discountPrice: 1899,
          imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&q=80&w=400',
          features: [
            'Hard water stain & scale removal from tiles and taps',
            'Tile scrubbing & grout line whitening',
            'Disinfection of WC, sink, drain traps & exhaust',
            'Mirror polishing and chrome buffing'
          ],
          cityIds: ['default'],
          bookingModes: ['slot'],
          isActive: true
        }
      ];

      for (const s of servicesToAdd) {
        await HomeServiceService.findOneAndUpdate(
          { slug: s.slug },
          s,
          { upsert: true, new: true }
        );
        console.log('Upserted service under Authorized bathroom cleaner:', s.title);
      }
    }

    // Add another child subcategory under "Bathroom services": "Express & Touch-up"
    const expressSub = await HomeServiceSubCategory.findOneAndUpdate(
      { slug: 'express-bathroom-touchup' },
      {
        title: 'Express & Touch-up',
        slug: 'express-bathroom-touchup',
        categoryId,
        parentSubCategoryId: bathroomSub._id,
        imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=300',
        icon: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=150',
        rating: 4.75,
        reviewCount: '7.8K+',
        cityIds: ['default'],
        bookingModes: ['slot'],
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('Upserted child subcategory: Express & Touch-up');

    // Services under Express & Touch-up
    const expressServices = [
      {
        title: 'Quick Bathroom Refresh',
        slug: 'quick-bathroom-refresh',
        categoryId,
        subCategoryId: expressSub._id,
        badge: '⚡',
        rating: 4.70,
        reviewCount: '5.2K+',
        duration: '45 mins',
        basePrice: 399,
        discountPrice: 299,
        imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
        features: [
          'Surface sanitization of washbasin & toilet',
          'Floor sweeping & scented wet mopping',
          'Mirror streak-free wipe down & tap cleaning'
        ],
        cityIds: ['default'],
        bookingModes: ['slot'],
        isActive: true
      },
      {
        title: 'Hard Water Descaling',
        slug: 'hard-water-descaling',
        categoryId,
        subCategoryId: expressSub._id,
        badge: '🚿',
        rating: 4.80,
        reviewCount: '8.9K+',
        duration: '1 hr 15 mins',
        basePrice: 599,
        discountPrice: 449,
        imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&q=80&w=400',
        features: [
          'Acid-free chemical descaling of taps & shower head',
          'Glass partition white water-stain removal',
          'Anti-limescale protection coat'
        ],
        cityIds: ['default'],
        bookingModes: ['slot'],
        isActive: true
      }
    ];

    for (const s of expressServices) {
      await HomeServiceService.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
      console.log('Upserted service under Express & Touch-up:', s.title);
    }
  }

  // 2. Existing Subcategory: "Home cleaning"
  const homeCleaningSub = await HomeServiceSubCategory.findOne({ slug: 'home-cleaning' });
  if (homeCleaningSub) {
    // Add child subcategories: "Furnished Apartment" & "Unfurnished Apartment"
    const furnishedChild = await HomeServiceSubCategory.findOneAndUpdate(
      { slug: 'furnished-apartment-cleaning' },
      {
        title: 'Furnished Apartment',
        slug: 'furnished-apartment-cleaning',
        categoryId,
        parentSubCategoryId: homeCleaningSub._id,
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=300',
        icon: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=150',
        rating: 4.82,
        reviewCount: '19.4K+',
        cityIds: ['default'],
        bookingModes: ['slot'],
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('Upserted child subcategory: Furnished Apartment');

    const furnishedServices = [
      {
        title: 'Essential Furnished Cleaning',
        slug: 'essential-furnished-cleaning',
        categoryId,
        subCategoryId: furnishedChild._id,
        badge: '★',
        rating: 4.75,
        reviewCount: '14.2K+',
        duration: '4 hrs',
        basePrice: 2499,
        discountPrice: 1999,
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400',
        features: [
          'Living room, bedroom, kitchen & bathroom dusting',
          'Dry vacuuming of rugs, sofa & mattress surfaces',
          'Wet mopping with anti-bacterial disinfectant'
        ],
        cityIds: ['default'],
        bookingModes: ['slot'],
        isActive: true
      },
      {
        title: 'Premium Furnished Deep Cleaning',
        slug: 'premium-furnished-deep-cleaning',
        categoryId,
        subCategoryId: furnishedChild._id,
        badge: '💎',
        rating: 4.85,
        reviewCount: '22.6K+',
        duration: '5 hrs 30 mins',
        basePrice: 3899,
        discountPrice: 2999,
        imageUrl: 'https://images.unsplash.com/photo-1502005229762-ee1b4434ec30?auto=format&fit=crop&q=80&w=400',
        features: [
          'Includes everything in Essential Plan',
          'Cupboard & wardrobe interior vacuuming and wiping',
          'Balcony washing & window grill scrub',
          'Kitchen slab degreasing & appliance external wipe'
        ],
        cityIds: ['default'],
        bookingModes: ['slot'],
        isActive: true
      }
    ];

    for (const s of furnishedServices) {
      await HomeServiceService.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
      console.log('Upserted service under Furnished Apartment:', s.title);
    }
  }

  // 3. New Subcategory: "Kitchen Cleaning"
  const kitchenSub = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'kitchen-cleaning' },
    {
      title: 'Kitchen Cleaning',
      slug: 'kitchen-cleaning',
      categoryId,
      parentSubCategoryId: null,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=150',
      bannerUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=800',
      description: 'Expert degreasing, tile scrubbing, chimney wash and deep kitchen sanitization.',
      rating: 4.84,
      reviewCount: '18.2K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('Upserted top-level subcategory: Kitchen Cleaning');

  // Child subcategory: "Full Kitchen Deep Clean"
  const kitchenDeepChild = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'full-kitchen-deep-clean' },
    {
      title: 'Full Kitchen Deep Clean',
      slug: 'full-kitchen-deep-clean',
      categoryId,
      parentSubCategoryId: kitchenSub._id,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=150',
      rating: 4.85,
      reviewCount: '12.1K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );

  const kitchenServices = [
    {
      title: 'Essential Kitchen Cleaning',
      slug: 'essential-kitchen-cleaning',
      categoryId,
      subCategoryId: kitchenDeepChild._id,
      badge: '★',
      rating: 4.74,
      reviewCount: '10.8K+',
      duration: '2 hrs',
      basePrice: 1299,
      discountPrice: 999,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400',
      features: [
        'Gas stove, slab & wall tile degreasing',
        'External wipe down of cabinets & chimney hood',
        'Sink scrubbing & drain pipe disinfection'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    {
      title: 'Premium Kitchen Degreasing',
      slug: 'premium-kitchen-degreasing',
      categoryId,
      subCategoryId: kitchenDeepChild._id,
      badge: '💎',
      rating: 4.86,
      reviewCount: '16.7K+',
      duration: '3 hrs 30 mins',
      basePrice: 1899,
      discountPrice: 1449,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400',
      features: [
        'Includes everything in Essential Plan',
        'Inside & outside cupboard cleaning (empty)',
        'Trolley removal and corner vacuuming',
        'Exhaust fan deep cleaning and oil removal'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    }
  ];

  for (const s of kitchenServices) {
    await HomeServiceService.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
    console.log('Upserted service under Kitchen Cleaning:', s.title);
  }

  // Child subcategory under Kitchen: "Appliance Cleaning"
  const kitchenApplianceChild = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'kitchen-appliance-cleaning' },
    {
      title: 'Appliance Cleaning',
      slug: 'kitchen-appliance-cleaning',
      categoryId,
      parentSubCategoryId: kitchenSub._id,
      imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=150',
      rating: 4.80,
      reviewCount: '6.5K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );

  const applianceServices = [
    {
      title: 'Chimney Deep Cleaning',
      slug: 'chimney-deep-cleaning-service',
      categoryId,
      subCategoryId: kitchenApplianceChild._id,
      badge: '🔥',
      rating: 4.79,
      reviewCount: '8.4K+',
      duration: '1 hr 15 mins',
      basePrice: 699,
      discountPrice: 499,
      imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=400',
      features: [
        'Filter mesh baffle degreasing with hot soak',
        'Blower & motor housing oil removal',
        'Oil collector cup cleaning & chrome polish'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    {
      title: 'Refrigerator Internal Sanitization',
      slug: 'fridge-internal-sanitization-service',
      categoryId,
      subCategoryId: kitchenApplianceChild._id,
      badge: '❄️',
      rating: 4.82,
      reviewCount: '5.9K+',
      duration: '45 mins',
      basePrice: 499,
      discountPrice: 349,
      imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=400',
      features: [
        'Tray & vegetable crisper box removal and wash',
        'Food-safe deodorization & bacterial wipe',
        'Door rubber gasket mold cleaning & drying'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    }
  ];

  for (const s of applianceServices) {
    await HomeServiceService.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
    console.log('Upserted service under Appliance Cleaning:', s.title);
  }

  // 4. New Subcategory: "Sofa & Upholstery"
  const sofaSub = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'sofa-upholstery-cleaning' },
    {
      title: 'Sofa & Upholstery',
      slug: 'sofa-upholstery-cleaning',
      categoryId,
      parentSubCategoryId: null,
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=150',
      bannerUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=800',
      description: 'Shampooing, vacuuming and wet extraction for sofas, mattresses and rugs.',
      rating: 4.82,
      reviewCount: '22.1K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('Upserted top-level subcategory: Sofa & Upholstery');

  // Child subcategory: "Sofa Shampooing"
  const sofaChild = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'sofa-shampooing-sub' },
    {
      title: 'Sofa Shampooing',
      slug: 'sofa-shampooing-sub',
      categoryId,
      parentSubCategoryId: sofaSub._id,
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=150',
      rating: 4.84,
      reviewCount: '15.3K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );

  const sofaServices = [
    {
      title: '3-Seater Sofa Spa',
      slug: '3-seater-sofa-spa',
      categoryId,
      subCategoryId: sofaChild._id,
      badge: '🛋️',
      rating: 4.80,
      reviewCount: '11.2K+',
      duration: '1 hr 30 mins',
      basePrice: 799,
      discountPrice: 599,
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=400',
      features: [
        'Dry vacuuming of crevices & cushions',
        'Foam shampooing to lift deep-seated grime',
        'Wet extraction machine drying'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    {
      title: '5-Seater Sofa Deep Wash',
      slug: '5-seater-sofa-deep-wash',
      categoryId,
      subCategoryId: sofaChild._id,
      badge: '💎',
      rating: 4.88,
      reviewCount: '18.9K+',
      duration: '2 hrs 15 mins',
      basePrice: 1299,
      discountPrice: 949,
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=400',
      features: [
        'Fabric stain spot-treatment',
        'Multi-surface foam shampoo & extraction',
        'Anti-allergen perfume mist finish'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    }
  ];

  for (const s of sofaServices) {
    await HomeServiceService.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
    console.log('Upserted service under Sofa Shampooing:', s.title);
  }

  // Child subcategory: "Carpet & Mattress"
  const carpetChild = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'carpet-mattress-cleaning' },
    {
      title: 'Carpet & Mattress',
      slug: 'carpet-mattress-cleaning',
      categoryId,
      parentSubCategoryId: sofaSub._id,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=150',
      rating: 4.78,
      reviewCount: '9.2K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );

  const carpetServices = [
    {
      title: 'Large Carpet Shampoo Wash',
      slug: 'large-carpet-shampoo-wash',
      categoryId,
      subCategoryId: carpetChild._id,
      badge: '🧼',
      rating: 4.76,
      reviewCount: '6.4K+',
      duration: '1 hr',
      basePrice: 699,
      discountPrice: 499,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400',
      features: [
        'High-power rotary brush cleaning',
        'Fiber stain extraction & dust mite removal',
        'Quick-dry moisture extraction'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    {
      title: 'Double Bed Mattress Sanitization',
      slug: 'double-bed-mattress-sanitization',
      categoryId,
      subCategoryId: carpetChild._id,
      badge: '🛏️',
      rating: 4.84,
      reviewCount: '7.8K+',
      duration: '1 hr 15 mins',
      basePrice: 899,
      discountPrice: 699,
      imageUrl: 'https://images.unsplash.com/photo-1502005229762-ee1b4434ec30?auto=format&fit=crop&q=80&w=400',
      features: [
        'UV-C light & vacuum dust mite removal',
        'Stain lightening treatment',
        'Bacterial neutralization spray'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    }
  ];

  for (const s of carpetServices) {
    await HomeServiceService.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
    console.log('Upserted service under Carpet & Mattress:', s.title);
  }

  // 5. New Subcategory: "Full House Deep Cleaning"
  const fullHouseSub = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'full-house-deep-cleaning-cat' },
    {
      title: 'Full House Deep Cleaning',
      slug: 'full-house-deep-cleaning-cat',
      categoryId,
      parentSubCategoryId: null,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=150',
      bannerUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
      description: 'Comprehensive top-to-bottom sanitization of all rooms, bathrooms, kitchen, balconies and floors.',
      rating: 4.89,
      reviewCount: '31.5K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('Upserted top-level subcategory: Full House Deep Cleaning');

  // Child subcategory: "Standard Full Home"
  const standardHomeChild = await HomeServiceSubCategory.findOneAndUpdate(
    { slug: 'standard-full-home-sub' },
    {
      title: 'Standard Full Home',
      slug: 'standard-full-home-sub',
      categoryId,
      parentSubCategoryId: fullHouseSub._id,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=300',
      icon: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=150',
      rating: 4.89,
      reviewCount: '20.1K+',
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    { upsert: true, new: true }
  );

  const fullHomeServices = [
    {
      title: 'Essential Full House Cleaning',
      slug: 'essential-full-house-cleaning',
      categoryId,
      subCategoryId: standardHomeChild._id,
      badge: '★',
      rating: 4.81,
      reviewCount: '18.4K+',
      duration: '5 hrs',
      basePrice: 3499,
      discountPrice: 2799,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400',
      features: [
        'All rooms dry and wet dusting',
        'Bathrooms & kitchen deep cleaning',
        'Floor scrubbing and balcony wash'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    },
    {
      title: 'Premium Full House Deep Cleaning',
      slug: 'premium-full-house-deep-cleaning',
      categoryId,
      subCategoryId: standardHomeChild._id,
      badge: '💎',
      rating: 4.91,
      reviewCount: '27.8K+',
      duration: '7 hrs 30 mins',
      basePrice: 4999,
      discountPrice: 3899,
      imageUrl: 'https://images.unsplash.com/photo-1502005229762-ee1b4434ec30?auto=format&fit=crop&q=80&w=400',
      features: [
        'Includes everything in Essential Plan',
        'Cabinet & wardrobe interior cleaning (empty)',
        'Machine single-disc floor polishing & scrub',
        'Window glass buffing and fan blades wipe'
      ],
      cityIds: ['default'],
      bookingModes: ['slot'],
      isActive: true
    }
  ];

  for (const s of fullHomeServices) {
    await HomeServiceService.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
    console.log('Upserted service under Full House Deep Cleaning:', s.title);
  }

  console.log('\n--- All subcategories and services seeded successfully! ---');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
