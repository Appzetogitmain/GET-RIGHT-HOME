import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import PropertyFormTemplate from '../models/PropertyFormTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/get-right-home";

const fullResidentialApartmentTemplate = {
  transactionType: 'Sell',
  category: 'Residential',
  propertyType: 'Apartment',
  steps: [
    {
      stepNumber: 2,
      title: 'Location Details',
      description: 'Where is your property located?',
      fields: [
        { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 1 },
        { name: 'locality', label: 'Locality / Society', type: 'text', placeholder: 'e.g. Mahalaxmi Nagar', required: true, order: 2 },
        { name: 'houseNumber', label: 'House/Flat Number (Optional)', type: 'text', placeholder: 'e.g. 101, A-Block', required: false, order: 3 }
      ]
    },
    {
      stepNumber: 3,
      title: 'Property Profile',
      description: 'Add room and layout details',
      fields: [
        { name: 'bedrooms', label: 'No. of Bedrooms', type: 'pill', options: ['1', '2', '3', '4', '5+'], required: true, order: 1 },
        { name: 'bathrooms', label: 'No. of Bathrooms', type: 'pill', options: ['1', '2', '3', '4+'], required: true, order: 2 },
        { name: 'balconies', label: 'Balconies', type: 'pill', options: ['0', '1', '2', '3+'], required: false, order: 3 },
        { name: 'furnishing', label: 'Furnishing Status', type: 'pill', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 4 },
        { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 10', required: true, order: 5 },
        { name: 'floorNumber', label: 'Property on Floor', type: 'number', placeholder: 'e.g. 4', required: true, order: 6 }
      ]
    },
    {
      stepNumber: 4,
      title: 'Area & Pricing',
      description: 'Mention sizes and expected price',
      fields: [
        { name: 'carpetArea', label: 'Carpet Area (sq.ft.)', type: 'number', placeholder: 'e.g. 1200', required: true, order: 1 },
        { name: 'superArea', label: 'Super Built-up Area (sq.ft.)', type: 'number', placeholder: 'e.g. 1500', required: false, order: 2 },
        { name: 'expectedPrice', label: 'Expected Price (₹)', type: 'number', placeholder: 'e.g. 7500000', required: true, order: 3 },
        { name: 'pricePerSqft', label: 'Price per sq.ft. (₹)', type: 'number', placeholder: 'e.g. 5000', required: false, order: 4 },
        { name: 'maintenanceCharges', label: 'Monthly Maintenance (₹)', type: 'number', placeholder: 'e.g. 2000', required: false, order: 5 }
      ]
    },
    {
      stepNumber: 5,
      title: 'Amenities & Features',
      description: 'What makes your property special?',
      fields: [
        { name: 'parking', label: 'Parking Available', type: 'pill', options: ['None', '1 Covered', '1 Open', '2+ Covered'], required: true, order: 1 },
        { name: 'gatedCommunity', label: 'Gated Community?', type: 'pill', options: ['Yes', 'No'], required: true, order: 2 },
        { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['None', 'Partial', 'Full'], required: false, order: 3 },
        { name: 'waterSupply', label: 'Water Supply', type: 'pill', options: ['Corporation', 'Borewell', 'Both'], required: false, order: 4 },
        { name: 'amenities_lift', label: 'Lift Service?', type: 'pill', options: ['Yes', 'No'], required: false, order: 5 },
        { name: 'amenities_gym', label: 'Gym / Fitness Center?', type: 'pill', options: ['Yes', 'No'], required: false, order: 6 }
      ]
    }
  ]
};

const seedDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URL);
    console.log('Connected.');

    console.log('Clearing existing templates...');
    await PropertyFormTemplate.deleteMany({});

    console.log('Inserting Comprehensive 99acres-style templates...');
    await PropertyFormTemplate.create([
      fullResidentialApartmentTemplate
    ]);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
};

seedDB();
