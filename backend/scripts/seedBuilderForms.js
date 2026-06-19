import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import BuilderFormTemplate from '../models/BuilderFormTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://sagarchouhan7609_db_user:sagarchouhan7609_db_user@cluster0.od9npjt.mongodb.net/hoomzo";

const expandedAmenities = [
  'Wi-Fi', 'AC', 'Laundry', 'Housekeeping', 'Food', 'RO Water', 'CCTV', 'Geyser', 'Gym', 'Lift', 'Power Backup', 'Security', 'Parking', 'Fridge', 'TV', 'Triple Occupancy'
];

// Combine standard residential steps with builder project fields
const createBuilderResidentialSteps = (isRent) => [
  {
    stepNumber: 1,
    title: 'Project & Location Details',
    description: 'Basic details, RERA, and location of your project',
    fields: [
      { name: 'propertyName', label: 'Project Title / Name', type: 'text', placeholder: 'e.g. Skyline Heights', required: true, order: 1 },
      { name: 'description', label: 'Project Description', type: 'textarea', placeholder: 'Describe the project vision, lifestyle, and unique selling points...', required: true, order: 2 },
      { name: 'reraRegistrationNumber', label: 'RERA Registration Number', type: 'text', placeholder: 'e.g. PR/KN/12345', required: true, order: 3 },
      { name: 'projectStatus', label: 'Project Status', type: 'pill', options: ['Pre Launch', 'Under construction', 'Ready to move'], required: true, order: 4 },
      { name: 'launchDate', label: 'Launch Date', type: 'date', required: true, order: 5 },
      { name: 'possessionDate', label: 'Possession Date', type: 'date', required: false, order: 6 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 7 },
      { name: 'locality', label: 'Locality / Sector', type: 'text', placeholder: 'e.g. Super Corridor', required: true, order: 8 },
      { name: 'fullAddress', label: 'Complete Project Address', type: 'textarea', placeholder: 'e.g. Plot No 12, Main Road...', required: true, order: 9 }
    ]
  },
  {
    stepNumber: 2,
    title: 'Project Scale & Area Profile',
    description: 'Provide land area, units, and layout details',
    fields: [
      { name: 'totalLandArea', label: 'Total Land Area (Acres)', type: 'number', placeholder: 'e.g. 5.5', required: true, order: 1 },
      { name: 'totalTowers', label: 'Total Towers/Blocks', type: 'number', placeholder: 'e.g. 4', required: true, order: 2 },
      { name: 'totalUnits', label: 'Total Units', type: 'number', placeholder: 'e.g. 200', required: true, order: 3 },
      { name: 'projectType', label: 'Project Type', type: 'multiselect_pill', options: ['Residential', 'Commercial', 'Mixed-Use'], required: true, order: 4 },
      { name: 'furnishing', label: 'Furnishing Status (Standard Unit)', type: 'pill', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 5 },
      { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction', 'Pre Launch'], required: true, order: 6 },
      { 
        name: 'floorPlans', 
        label: 'Floor Plans Configuration', 
        type: 'repeater', 
        required: true, 
        order: 7,
        subFields: [
          { name: 'configName', label: 'Configuration (e.g. 2 BHK, 3 BHK)', type: 'text', required: true, order: 1 },
          { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', required: true, order: 2 },
          { name: 'price', label: 'Starting Price (₹)', type: 'number', required: true, order: 3 },
          { name: 'floorPlanImage', label: 'Floor Plan Layout Image', type: 'file', required: false, order: 4 }
        ]
      }
    ]
  },
  {
    stepNumber: 3,
    title: 'Amenities & Features',
    description: 'Select premium amenities provided in the project',
    fields: [
      { name: 'amenities', label: 'Project Amenities', type: 'checkbox_group', options: [
        'Club House', 'Swimming Pool', 'Gymnasium', 'Kids Play Area', 'Jogging Track', 
        'Indoor Games', 'Multipurpose Hall', 'Landscaped Gardens', 'Tennis Court', 
        'Badminton Court', 'Basketball Court', 'Yoga/Meditation Area', 'Amphitheatre',
        '24x7 Security', 'CCTV Surveillance', 'Power Backup', 'Intercom Facility',
        'Rain Water Harvesting', 'Sewage Treatment Plant', 'Vastu Compliant'
      ], required: true, order: 1 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'IGBC Certified Green Building', 'Premium Specifications', 'High-Speed Elevators',
        'Smart Home Features', 'EV Charging Stations', 'Metro Connectivity',
        'Close to IT Hubs', 'Luxury Finishes', 'Award Winning Design'
      ], required: false, order: 2 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Media & Brochures',
    description: 'Add photos, videos, and project brochure',
    fields: [
      { name: 'propertyImages', label: 'Project Gallery (Photos)', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Project Walkthrough Videos', type: 'file', required: false, order: 2 },
      { name: 'brochure', label: 'Upload e-Brochure (PDF)', type: 'file', required: false, order: 3 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 4 }
    ]
  }
];

const createBuilderCommercialSteps = (isRent, commType, subType) => {
  // We can just use the same base for Commercial Projects as Builder Residential for now, 
  // with slight variations in the projectType or highlights if necessary.
  // The structure is very similar for builder projects.
  return createBuilderResidentialSteps(isRent);
};

const createBuilderPlotSteps = (isRent) => {
  return createBuilderResidentialSteps(isRent);
};

// Builder PG Steps
const createBuilderPGSteps = () => [
  {
    stepNumber: 1,
    title: 'Project & Location Details',
    description: 'Basic details, RERA, and location of your PG project',
    fields: [
      { name: 'propertyName', label: 'Project Title / Name', type: 'text', placeholder: 'e.g. Skyline Co-Living', required: true, order: 1 },
      { name: 'description', label: 'Project Description', type: 'textarea', placeholder: 'Describe the project vision, lifestyle, and unique selling points...', required: true, order: 2 },
      { name: 'reraRegistrationNumber', label: 'RERA Registration Number (If applicable)', type: 'text', placeholder: 'e.g. PR/KN/12345', required: false, order: 3 },
      { name: 'projectStatus', label: 'Project Status', type: 'pill', options: ['Pre Launch', 'Under construction', 'Ready to move'], required: true, order: 4 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 5 },
      { name: 'locality', label: 'Locality / Sector', type: 'text', placeholder: 'e.g. Super Corridor', required: true, order: 6 },
      { name: 'fullAddress', label: 'Complete Project Address', type: 'textarea', placeholder: 'e.g. Plot No 12, Main Road...', required: true, order: 7 }
    ]
  },
  {
    stepNumber: 2,
    title: 'PG Details & Rules',
    description: 'Occupancy, rules, and facilities',
    fields: [
      { name: 'totalLandArea', label: 'Total Land Area (Acres)', type: 'number', placeholder: 'e.g. 5.5', required: false, order: 1 },
      { name: 'totalCapacity', label: 'Total Capacity', type: 'number', placeholder: 'e.g. 500', required: true, order: 2 },
      { name: 'tenantType', label: 'Available For', type: 'pill', options: ['Boys', 'Girls', 'Any'], required: true, order: 3 },
      { name: 'occupancy', label: 'Room Types Available', type: 'pill', options: ['Single', 'Double', 'Triple', 'Four+'], required: true, order: 4 },
      { name: 'foodIncluded', label: 'Food Included?', type: 'pill', options: ['Yes', 'No'], required: true, order: 5 },
      { name: 'noticePeriod', label: 'Notice Period (Days)', type: 'number', placeholder: 'e.g. 30', required: true, order: 6 },
      { name: 'gateClosingTime', label: 'Gate Closing Time', type: 'dropdown', options: ['9 PM', '10 PM', '11 PM', 'No Restriction'], required: false, order: 7 },
      { name: 'attachWashroom', label: 'Attached Washroom', type: 'pill', options: ['Yes', 'No'], required: true, order: 8 },
      { 
        name: 'floorPlans', 
        label: 'PG Room Configurations', 
        type: 'repeater', 
        required: true, 
        order: 9,
        subFields: [
          { name: 'configName', label: 'Configuration (e.g. Single Room, Double Sharing)', type: 'text', required: true, order: 1 },
          { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', required: false, order: 2 },
          { name: 'price', label: 'Monthly Rent (₹)', type: 'number', required: true, order: 3 },
          { name: 'floorPlanImage', label: 'Room Layout Image', type: 'file', required: false, order: 4 }
        ]
      }
    ]
  },
  {
    stepNumber: 3,
    title: 'Amenities & Features',
    description: 'Rent and available facilities',
    fields: [
      { name: 'wifi', label: 'WiFi', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: true, order: 1 },
      { name: 'laundry', label: 'Laundry', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: false, order: 2 },
      { name: 'cleaning', label: 'Room Cleaning', type: 'pill', options: ['Daily', 'Weekly', 'Not Available'], required: false, order: 3 },
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: expandedAmenities, required: true, order: 4 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'Girls Only PG', 'Boys Only PG', 'Food Included', 'AC Rooms', 'Attached Washroom',
        'High-Speed WiFi', 'CCTV Surveillance', 'Gated Community', 'Near College/Office',
        'Housekeeping Included', 'Power Backup', 'Flexible Notice Period'
      ], required: false, order: 5 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Media & Brochures',
    description: 'Add photos, videos, and project brochure',
    fields: [
      { name: 'propertyImages', label: 'Project Gallery (Photos)', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Project Walkthrough Videos', type: 'file', required: false, order: 2 },
      { name: 'brochure', label: 'Upload e-Brochure (PDF)', type: 'file', required: false, order: 3 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 4 }
    ]
  }
];

const generateAllTemplates = () => {
  const templates = [];

  const sellResTypes = ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK/ Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Other'];
  const commercialSubtypes = [
    { cat: 'Office', sub: 'Ready to move office space' },
    { cat: 'Office', sub: 'Bare shell office space' },
    { cat: 'Office', sub: 'Co-working office space' },
    { cat: 'Retail', sub: 'Commercial Shops' },
    { cat: 'Retail', sub: 'Commercial Showrooms' },
    { cat: 'Plot / Land', sub: 'Commercial Land/Inst. Land' },
    { cat: 'Plot / Land', sub: 'Agricultural/Farm Land' },
    { cat: 'Plot / Land', sub: 'Industrial Lands/Plots' },
    { cat: 'Storage', sub: 'Ware House' },
    { cat: 'Storage', sub: 'Cold Storage' },
    { cat: 'Industry', sub: 'Factory' },
    { cat: 'Industry', sub: 'Manufacturing' },
    { cat: 'Hospitality', sub: 'Hotel/Resorts' },
    { cat: 'Hospitality', sub: 'Guest-House/Banquet-Halls' }
  ];

  // 1. Sell & Rent/Lease - Residential & Commercial
  ['Sell', 'Rent / Lease'].forEach(txn => {
    const isRent = txn === 'Rent / Lease';
    
    sellResTypes.forEach(type => {
      templates.push({ transactionType: txn, category: 'Residential', propertyType: type, steps: createBuilderResidentialSteps(isRent) });
    });
    templates.push({ transactionType: txn, category: 'Residential', propertyType: 'Plot / Land', steps: createBuilderPlotSteps(isRent) });

    commercialSubtypes.forEach(({ cat, sub }) => {
      templates.push({ transactionType: txn, category: 'Commercial', propertyType: sub, steps: createBuilderCommercialSteps(isRent, cat, sub) });
    });

    templates.push({
      transactionType: txn,
      category: 'Commercial',
      propertyType: 'Other',
      steps: createBuilderCommercialSteps(isRent, 'Other', 'Other')
    });
  });

  // 2. Paying Guest
  const pgTypes = ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment'];
  pgTypes.forEach(type => {
    templates.push({ transactionType: 'Paying Guest', category: 'Residential', propertyType: type, steps: createBuilderPGSteps() });
  });

  return templates;
};

const seedDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URL);
    console.log('Connected.');

    console.log('Clearing existing builder templates...');
    await BuilderFormTemplate.deleteMany({});

    console.log('Generating exact builder property templates...');
    const allTemplates = generateAllTemplates();

    console.log(`Inserting ${allTemplates.length} builder templates...`);
    await BuilderFormTemplate.create(allTemplates);

    console.log('Seeding builder forms completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
};

seedDB();
