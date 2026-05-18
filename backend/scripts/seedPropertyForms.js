import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import PropertyFormTemplate from '../models/PropertyFormTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/get-right-home";

const sellResidentialFlatTemplate = {
  transactionType: 'Sell',
  category: 'Residential',
  propertyType: 'Apartment',
  steps: [
    {
      stepNumber: 2,
      title: 'Location Details',
      description: 'Where is your property located?',
      fields: [
        { name: 'city', label: 'City', type: 'text', placeholder: 'Search City', required: true, order: 1 },
        { name: 'locality', label: 'Locality / Apartment', type: 'text', placeholder: 'Search Locality', required: true, order: 2 }
      ]
    },
    {
      stepNumber: 3,
      title: 'Property Profile',
      description: 'Add Room Details',
      fields: [
        { name: 'bedrooms', label: 'No. of Bedrooms', type: 'pill', options: ['1', '2', '3', '4', '5+'], required: true, order: 1 },
        { name: 'bathrooms', label: 'No. of Bathrooms', type: 'pill', options: ['1', '2', '3', '4', '4+'], required: true, order: 2 },
        { name: 'carpetArea', label: 'Carpet Area (sq.ft.)', type: 'number', placeholder: 'e.g. 1000', required: true, order: 3 },
        { name: 'expectedPrice', label: 'Expected Price (₹)', type: 'number', placeholder: 'e.g. 5000000', required: true, order: 4 }
      ]
    }
  ]
};

const rentResidentialApartmentTemplate = {
  transactionType: 'Rent / Lease',
  category: 'Residential',
  propertyType: 'Apartment',
  steps: [
    {
      stepNumber: 2,
      title: 'Location Details',
      description: 'Where is your property located?',
      fields: [
        { name: 'city', label: 'City', type: 'text', placeholder: 'Search City', required: true, order: 1 },
        { name: 'locality', label: 'Locality / Apartment', type: 'text', placeholder: 'Search Locality', required: true, order: 2 }
      ]
    },
    {
      stepNumber: 3,
      title: 'Rental Details',
      description: 'Add Rental Info',
      fields: [
        { name: 'bedrooms', label: 'No. of Bedrooms', type: 'pill', options: ['1', '2', '3', '4', '5+'], required: true, order: 1 },
        { name: 'monthlyRent', label: 'Monthly Rent (₹)', type: 'number', placeholder: 'e.g. 20000', required: true, order: 2 },
        { name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 60000', required: true, order: 3 },
        { name: 'availableFrom', label: 'Available From', type: 'text', placeholder: 'Immediate / Date', required: true, order: 4 }
      ]
    }
  ]
};

const rentCommercialOfficeTemplate = {
  transactionType: 'Rent / Lease',
  category: 'Commercial',
  propertyType: 'Office',
  steps: [
    {
      stepNumber: 2,
      title: 'Location Details',
      description: 'Where is your office located?',
      fields: [
        { name: 'city', label: 'City', type: 'text', placeholder: 'Search City', required: true, order: 1 },
        { name: 'locality', label: 'Locality / Business Park', type: 'text', placeholder: 'Search Locality', required: true, order: 2 }
      ]
    },
    {
      stepNumber: 3,
      title: 'Office Profile',
      description: 'Add Space Details',
      fields: [
        { name: 'carpetArea', label: 'Carpet Area (sq.ft.)', type: 'number', placeholder: 'e.g. 2000', required: true, order: 1 },
        { name: 'seats', label: 'No. of Seats', type: 'number', placeholder: 'e.g. 20', required: false, order: 2 },
        { name: 'monthlyRent', label: 'Monthly Rent (₹)', type: 'number', placeholder: 'e.g. 100000', required: true, order: 3 }
      ]
    }
  ]
};

const pgResidentialApartmentTemplate = {
  transactionType: 'Paying Guest',
  category: 'Residential',
  propertyType: 'Apartment',
  steps: [
    {
      stepNumber: 2,
      title: 'Location Details',
      description: 'Where is the PG located?',
      fields: [
        { name: 'city', label: 'City', type: 'text', placeholder: 'Search City', required: true, order: 1 },
        { name: 'locality', label: 'Locality', type: 'text', placeholder: 'Search Locality', required: true, order: 2 }
      ]
    },
    {
      stepNumber: 3,
      title: 'PG Details',
      description: 'Add PG Info',
      fields: [
        { name: 'occupancy', label: 'Occupancy Type', type: 'pill', options: ['Single', 'Double', 'Triple', 'Any'], required: true, order: 1 },
        { name: 'monthlyRent', label: 'Monthly Rent (₹)', type: 'number', placeholder: 'e.g. 10000', required: true, order: 2 },
        { name: 'foodIncluded', label: 'Food Included?', type: 'pill', options: ['Yes', 'No'], required: true, order: 3 }
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

    console.log('Inserting default templates...');
    await PropertyFormTemplate.create([
      sellResidentialFlatTemplate,
      rentResidentialApartmentTemplate,
      rentCommercialOfficeTemplate,
      pgResidentialApartmentTemplate
    ]);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedDB();
