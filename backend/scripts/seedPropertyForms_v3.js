import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import PropertyFormTemplate from '../models/PropertyFormTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/get-right-home";

// Helper to create steps for standard residential properties (Apartments, Villas, etc)
const createResidentialSteps = (isRent) => [
  {
    stepNumber: 2,
    title: 'Property Details',
    description: 'Add a title and detailed description',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Elegant 3 BHK Apartment at Mahalaxmi Nagar', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Provide detailed information about bedrooms, ventilation, balconies, views, and vicinity...', required: true, order: 2 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Location Details',
    description: 'Where is your property located?',
    fields: [
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 1 },
      { name: 'locality', label: 'Locality / Society', type: 'text', placeholder: 'e.g. Mahalaxmi Nagar', required: true, order: 2 },
      { name: 'houseNumber', label: 'House/Flat Number (Optional)', type: 'text', placeholder: 'e.g. 101, A-Block', required: false, order: 3 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Property Profile',
    description: 'Add room and layout details',
    fields: [
      { name: 'bedrooms', label: 'No. of Bedrooms', type: 'pill', options: ['1', '2', '3', '4', '5+'], required: true, order: 1 },
      { name: 'bathrooms', label: 'No. of Bathrooms', type: 'pill', options: ['1', '2', '3', '4+'], required: true, order: 2 },
      { name: 'balconies', label: 'Balconies', type: 'pill', options: ['0', '1', '2', '3+'], required: false, order: 3 },
      { name: 'furnishing', label: 'Furnishing Status', type: 'pill', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 4 },
      { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 10', required: true, order: 5 },
      { name: 'floorNumber', label: 'Property on Floor', type: 'number', placeholder: 'e.g. 4', required: true, order: 6 },
      { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction'], required: true, order: 7 }
    ]
  },
  {
    stepNumber: 5,
    title: 'Area & Pricing',
    description: 'Mention sizes and expected price',
    fields: [
      { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 1200', required: true, order: 1 },
      { name: 'carpetAreaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 2 },
      { name: 'superArea', label: 'Super Built-up Area', type: 'number', placeholder: 'e.g. 1500', required: false, order: 3 },
      { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 20000' : 'e.g. 7500000', required: true, order: 4 },
      ...(isRent ? [{ name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 40000', required: true, order: 5 }] : []),
      { name: 'maintenanceCharges', label: 'Monthly Maintenance (₹)', type: 'number', placeholder: 'e.g. 2000', required: false, order: 6 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Amenities & Features',
    description: 'Select available amenities & features',
    fields: [
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: ['Lift', 'Swimming Pool', 'Room Service', 'Parking', 'Spa', 'Restaurant', 'Bar', 'Gym'], required: true, order: 1 },
      { name: 'gatedCommunity', label: 'Gated Community?', type: 'pill', options: ['Yes', 'No'], required: true, order: 2 },
      { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['None', 'Partial', 'Full'], required: false, order: 3 },
      { name: 'waterSupply', label: 'Water Supply', type: 'pill', options: ['Corporation', 'Borewell', 'Both'], required: false, order: 4 }
    ]
  },
  {
    stepNumber: 7,
    title: 'Photos & Videos',
    description: 'Add media of your property',
    fields: [
      { name: 'propertyImages', label: 'Upload Property Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload Property Videos (Optional)', type: 'file', required: false, order: 2 }
    ]
  },
  {
    stepNumber: 8,
    title: 'Nearby Places',
    description: 'Add nearby landmarks, markets, transit points, schools',
    fields: [
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 1 }
    ]
  }
];

// Helper for Land/Plot
const createPlotSteps = (isRent, isCommercial) => [
  {
    stepNumber: 2,
    title: 'Property Details',
    description: 'Add a title and detailed description',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Commercial Plot at Main Road', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Describe the plot location benefits, frontage size, surrounding developments...', required: true, order: 2 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Location Details',
    description: 'Where is the plot located?',
    fields: [
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 1 },
      { name: 'locality', label: 'Locality', type: 'text', placeholder: 'e.g. Super Corridor', required: true, order: 2 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Plot Profile',
    description: 'Provide plot dimensions and details',
    fields: [
      { name: 'plotArea', label: 'Plot Area', type: 'number', placeholder: 'e.g. 1500', required: true, order: 1 },
      { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 2 },
      { name: 'length', label: 'Length (ft)', type: 'number', placeholder: 'e.g. 50', required: false, order: 3 },
      { name: 'width', label: 'Width (ft)', type: 'number', placeholder: 'e.g. 30', required: false, order: 4 },
      { name: 'boundaryWall', label: 'Boundary Wall Made?', type: 'pill', options: ['Yes', 'No'], required: true, order: 5 },
      { name: 'facing', label: 'Facing', type: 'dropdown', options: ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'], required: false, order: 6 }
    ]
  },
  {
    stepNumber: 5,
    title: 'Pricing & Legal',
    description: 'Pricing and approval details',
    fields: [
      { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 20000' : 'e.g. 7500000', required: true, order: 1 },
      { name: 'approvalAuthority', label: 'Approval Authority', type: 'text', placeholder: 'e.g. IDA, TNCP', required: false, order: 2 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Amenities & Features',
    description: 'Select available amenities & features',
    fields: [
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: ['Lift', 'Swimming Pool', 'Room Service', 'Parking', 'Spa', 'Restaurant', 'Bar', 'Gym'], required: true, order: 1 }
    ]
  },
  {
    stepNumber: 7,
    title: 'Photos & Videos',
    description: 'Add media of your property',
    fields: [
      { name: 'propertyImages', label: 'Upload Property Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload Property Videos (Optional)', type: 'file', required: false, order: 2 }
    ]
  },
  {
    stepNumber: 8,
    title: 'Nearby Places',
    description: 'Add nearby landmarks, markets, transit points, schools',
    fields: [
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 1 }
    ]
  }
];

// Helper for Retail Space (Commercial Shops & Commercial Showrooms)
const createRetailSteps = (isRent) => [
  {
    stepNumber: 2,
    title: 'Property Details',
    description: 'Add basic commercial details',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Premium Commercial Shop in City Center', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Describe your shop/showroom frontage, footfall potential, business amenities...', required: true, order: 2 },
      { name: 'retailSpaceType', label: 'What type of retail space do you have?', type: 'pill', options: ['Commercial Shops', 'Commercial Showrooms'], required: true, order: 3 },
      { name: 'locatedInside', label: 'Your shop is located inside', type: 'dropdown', options: ['Mall', 'Commercial Project', 'Residential Project', 'Retail Complex/Building', 'Market / High Street'], required: true, order: 4 },
      { name: 'buildingName', label: 'Building/Project Name (Optional)', type: 'text', placeholder: 'e.g. Sunrise Plaza', required: false, order: 5 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Location Details',
    description: 'Where is your property located?',
    fields: [
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 1 },
      { name: 'locality', label: 'Locality / Area', type: 'text', placeholder: 'e.g. Chikitsak Nagar', required: true, order: 2 },
      { name: 'subLocality', label: 'Sub Locality (Optional)', type: 'text', placeholder: 'e.g. Sector-B', required: false, order: 3 },
      { name: 'mallName', label: 'Mall Name (Optional)', type: 'text', placeholder: 'e.g. Treasure Island Mall', required: false, order: 4 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Retail Profile',
    description: 'Add layout, area and sizing details',
    fields: [
      { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 1700', required: true, order: 1 },
      { name: 'carpetAreaUnit', label: 'Carpet Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 2 },
      { name: 'builtUpArea', label: 'Built-up Area (Optional)', type: 'number', placeholder: 'e.g. 2000', required: false, order: 3 },
      { name: 'builtUpAreaUnit', label: 'Built-up Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: false, order: 4 },
      { name: 'entranceWidth', label: 'Entrance Width (Optional)', type: 'number', placeholder: 'e.g. 15', required: false, order: 5 },
      { name: 'entranceWidthUnit', label: 'Entrance Width Unit', type: 'dropdown', options: ['ft.', 'mt.'], required: false, order: 6 },
      { name: 'ceilingHeight', label: 'Ceiling Height (Optional)', type: 'number', placeholder: 'e.g. 12', required: false, order: 7 },
      { name: 'ceilingHeightUnit', label: 'Ceiling Height Unit', type: 'dropdown', options: ['ft.', 'mt.'], required: false, order: 8 },
      { name: 'washrooms', label: 'Washroom details', type: 'pill', options: ['Private washrooms', 'Public washrooms', 'Not Available'], required: true, order: 9 },
      { name: 'totalFloors', label: 'Floor Details - Total Floors (Optional)', type: 'number', placeholder: 'e.g. 5', required: false, order: 10 },
      { name: 'parkingType', label: 'Parking Type', type: 'pill', options: ['Private Parking', 'Public Parking', 'Multilevel Parking', 'Not Available'], required: true, order: 11 }
    ]
  },
  {
    stepNumber: 5,
    title: 'Pricing & Availability',
    description: 'Pricing, maintenance, and availability details',
    fields: [
      { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 100000' : 'e.g. 50000000', required: true, order: 1 },
      { name: 'priceNegotiable', label: 'Price Negotiable?', type: 'pill', options: ['Yes', 'No'], required: true, order: 2 },
      { name: 'taxExcluded', label: 'Tax and Govt. charges excluded?', type: 'pill', options: ['Yes', 'No'], required: true, order: 3 },
      { name: 'maintenanceCharges', label: 'Monthly Maintenance (₹) (Optional)', type: 'number', placeholder: 'e.g. 5000', required: false, order: 4 },
      { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction'], required: true, order: 5 },
      { name: 'propertyAge', label: 'Age of Property', type: 'pill', options: ['0-1 Years', '1-5 Years', '5-10 Years', '10+ Years'], required: true, dependsOn: { field: 'availability', value: 'Ready to move' }, order: 6 },
      { name: 'expectedBy', label: 'Expected By', type: 'dropdown', options: ['Within 3 Months', 'Within 6 Months', 'By 2026', 'By 2027', 'By 2028', 'By 2029'], required: true, dependsOn: { field: 'availability', value: 'Under construction' }, order: 7 },
      { name: 'isPreLeased', label: 'Is it Pre-leased / Pre-Rented?', type: 'pill', options: ['Yes', 'No'], required: true, order: 8 },
      { name: 'currentRent', label: 'Current Rent Per Month (₹)', type: 'number', placeholder: 'e.g. 45000', required: true, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 9 },
      { name: 'leaseTenure', label: 'Lease Tenure in Years', type: 'number', placeholder: 'e.g. 5', required: true, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 10 },
      { name: 'annualRentIncrease', label: 'Annual rent increase in % (Optional)', type: 'number', placeholder: 'e.g. 5', required: false, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 11 },
      { name: 'leasedToBusiness', label: 'Leased to - Business Type (Optional)', type: 'text', placeholder: 'e.g. Retail Store / Bank', required: false, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 12 },
      { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['Yes', 'No'], required: false, order: 13 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Photos & Videos',
    description: 'Add media of your property',
    fields: [
      { name: 'propertyImages', label: 'Upload Property Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload Property Videos (Optional)', type: 'file', required: false, order: 2 }
    ]
  },
  {
    stepNumber: 7,
    title: 'Nearby Places',
    description: 'Add nearby landmarks, markets, transit points, schools',
    fields: [
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 1 }
    ]
  }
];

// Helper for Commercial (Offices, Retail, Industry, Storage, Hospitality)
const createCommercialSteps = (isRent, commType) => [
  {
    stepNumber: 2,
    title: 'Property Details',
    description: 'Add a title and detailed description',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: `e.g. Modern commercial ${commType} at prime road`, required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: `Describe your ${commType} amenities, footfall potential, business vicinity...`, required: true, order: 2 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Location Details',
    description: `Where is your ${commType} located?`,
    fields: [
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Mumbai', required: true, order: 1 },
      { name: 'locality', label: 'Locality / Area', type: 'text', placeholder: 'e.g. Andheri East', required: true, order: 2 },
      { name: 'buildingName', label: 'Building Name', type: 'text', placeholder: 'e.g. Raheja Plaza', required: false, order: 3 }
    ]
  },
  {
    stepNumber: 4,
    title: `${commType} Profile`,
    description: `Add details about the ${commType}`,
    fields: [
      { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 2000', required: true, order: 1 },
      { name: 'carpetAreaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 2 },
      { name: 'superArea', label: 'Super Built-up Area', type: 'number', placeholder: 'e.g. 2500', required: false, order: 3 },
      { name: 'furnishing', label: 'Furnishing Status', type: 'pill', options: ['Bare Shell', 'Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 4 },
      ...(commType === 'Office' ? [
        { name: 'washrooms', label: 'Washrooms', type: 'pill', options: ['Shared', 'Private', 'None'], required: true, order: 5 },
        { name: 'pantry', label: 'Pantry/Cafeteria', type: 'pill', options: ['Shared', 'Private', 'None'], required: false, order: 6 },
        { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 15', required: true, order: 7 },
        { name: 'floorNumber', label: 'Property on Floor', type: 'number', placeholder: 'e.g. 4', required: true, order: 8 },
        { name: 'seatsCount', label: 'Number of Seats', type: 'number', placeholder: 'e.g. 50', required: true, order: 9 },
        { name: 'cabinsCount', label: 'Number of Cabins (Optional)', type: 'number', placeholder: 'e.g. 3', required: false, order: 10 },
        { name: 'meetingRoomsCount', label: 'Meeting Rooms / Conference Rooms (Optional)', type: 'number', placeholder: 'e.g. 1', required: false, order: 11 },
        { name: 'propertyAge', label: 'Age of Property', type: 'pill', options: ['0-1 Years', '1-5 Years', '5-10 Years', '10+ Years'], required: true, order: 12 },
        { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction'], required: true, order: 13 },
        { name: 'isPreLeased', label: 'Is Pre-Leased / Pre-Rented?', type: 'pill', options: ['Yes', 'No'], required: true, order: 14 },
        { name: 'suitableFor', label: 'Suitable For', type: 'checkbox_group', options: ['IT/ITES', 'Back Office', 'Call Center/BPO', 'Corporate Office', 'Co-Working Space', 'Clinic/Hospital', 'Consultancy Office', 'Any/General Office'], required: true, order: 15 },
        { name: 'operatingHours', label: 'Operating Hours (Optional)', type: 'pill', options: ['24x7 Allowed', 'Normal Business Hours'], required: false, order: 16 }
      ] : []),
      ...(commType === 'Industry' ? [
        { name: 'washrooms', label: 'Washrooms', type: 'pill', options: ['Shared', 'Private', 'None'], required: true, order: 5 },
        { name: 'pantry', label: 'Pantry/Cafeteria', type: 'pill', options: ['Shared', 'Private', 'None'], required: false, order: 6 }
      ] : []),
      ...(commType === 'Retail' ? [
        { name: 'frontage', label: 'Shop Frontage (ft)', type: 'number', placeholder: 'e.g. 20', required: false, order: 5 },
        { name: 'locationType', label: 'Location Type', type: 'pill', options: ['Mall', 'High Street Retail', 'Standalone Building'], required: true, order: 6 }
      ] : []),
      ...(commType === 'Storage' ? [
        { name: 'ceilingHeight', label: 'Ceiling Height (ft)', type: 'number', placeholder: 'e.g. 25', required: true, order: 5 },
        { name: 'dockDoors', label: 'No. of Dock Doors', type: 'number', placeholder: 'e.g. 4', required: false, order: 6 }
      ] : [])
    ]
  },
  {
    stepNumber: 5,
    title: 'Pricing & Utilities',
    description: 'Pricing and utility details',
    fields: [
      { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 100000' : 'e.g. 50000000', required: true, order: 1 },
      ...(isRent ? [
        { name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 500000', required: true, order: 2 },
        { name: 'lockInPeriod', label: 'Lock-in Period (Years)', type: 'number', placeholder: 'e.g. 3', required: false, order: 3 }
      ] : []),
      { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['Yes', 'No'], required: false, order: 4 },
      { name: 'parking', label: 'Parking', type: 'pill', options: ['None', '1-2 Cars', '3-5 Cars', '5+ Cars'], required: true, order: 5 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Amenities & Features',
    description: 'Select available amenities & features',
    fields: [
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: ['Lift', 'Swimming Pool', 'Room Service', 'Parking', 'Spa', 'Restaurant', 'Bar', 'Gym'], required: true, order: 1 }
    ]
  },
  {
    stepNumber: 7,
    title: 'Photos & Videos',
    description: `Add media to showcase your ${commType}`,
    fields: [
      { name: 'propertyImages', label: `Upload ${commType} Photos`, type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: `Upload ${commType} Videos (Optional)`, type: 'file', required: false, order: 2 }
    ]
  },
  {
    stepNumber: 8,
    title: 'Nearby Places',
    description: 'Add nearby landmarks, markets, transit points, schools',
    fields: [
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 1 }
    ]
  }
];

// Helper for PG
const createPGSteps = () => [
  {
    stepNumber: 2,
    title: 'Property Details',
    description: 'Add a title and detailed description',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Premium Girls PG Koramangala', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Describe PG rules, cleanliness standards, food variety, security features...', required: true, order: 2 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Location Details',
    description: 'Where is the PG located?',
    fields: [
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Bangalore', required: true, order: 1 },
      { name: 'locality', label: 'Locality', type: 'text', placeholder: 'e.g. Koramangala', required: true, order: 2 },
      { name: 'pgName', label: 'PG Name', type: 'text', placeholder: 'e.g. Sunrise PG', required: true, order: 3 }
    ]
  },
  {
    stepNumber: 4,
    title: 'PG Details & Rules',
    description: 'Occupancy and tenant rules',
    fields: [
      { name: 'tenantType', label: 'Available For', type: 'pill', options: ['Boys', 'Girls', 'Any'], required: true, order: 1 },
      { name: 'occupancy', label: 'Room Types Available', type: 'pill', options: ['Single', 'Double', 'Triple', 'Four+'], required: true, order: 2 },
      { name: 'foodIncluded', label: 'Food Included?', type: 'pill', options: ['Yes', 'No'], required: true, order: 3 },
      { name: 'noticePeriod', label: 'Notice Period (Days)', type: 'number', placeholder: 'e.g. 30', required: true, order: 4 },
      { name: 'gateClosingTime', label: 'Gate Closing Time', type: 'dropdown', options: ['9 PM', '10 PM', '11 PM', 'No Restriction'], required: false, order: 5 }
    ]
  },
  {
    stepNumber: 5,
    title: 'Pricing & Amenities',
    description: 'Rent and available facilities',
    fields: [
      { name: 'monthlyRent', label: 'Starting Monthly Rent (₹)', type: 'number', placeholder: 'e.g. 8000', required: true, order: 1 },
      { name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 10000', required: true, order: 2 },
      { name: 'wifi', label: 'WiFi', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: true, order: 3 },
      { name: 'laundry', label: 'Laundry', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: false, order: 4 },
      { name: 'cleaning', label: 'Room Cleaning', type: 'pill', options: ['Daily', 'Weekly', 'Not Available'], required: false, order: 5 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Amenities & Features',
    description: 'Select available amenities & features',
    fields: [
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: ['Lift', 'Swimming Pool', 'Room Service', 'Parking', 'Spa', 'Restaurant', 'Bar', 'Gym'], required: true, order: 1 }
    ]
  },
  {
    stepNumber: 7,
    title: 'Photos & Videos',
    description: 'Add photos of rooms and facilities',
    fields: [
      { name: 'propertyImages', label: 'Upload PG Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload PG Videos (Optional)', type: 'file', required: false, order: 2 }
    ]
  },
  {
    stepNumber: 8,
    title: 'Nearby Places',
    description: 'Add nearby landmarks, markets, transit points, schools',
    fields: [
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 1 }
    ]
  }
];

const generateAllTemplates = () => {
  const templates = [];

  // 1. Sell - Residential
  const sellResTypes = ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK/ Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Other'];
  sellResTypes.forEach(type => {
    templates.push({ transactionType: 'Sell', category: 'Residential', propertyType: type, steps: createResidentialSteps(false) });
  });
  templates.push({ transactionType: 'Sell', category: 'Residential', propertyType: 'Plot / Land', steps: createPlotSteps(false, false) });

  // 2. Rent - Residential
  const rentResTypes = ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK/ Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Other'];
  rentResTypes.forEach(type => {
    templates.push({ transactionType: 'Rent / Lease', category: 'Residential', propertyType: type, steps: createResidentialSteps(true) });
  });

  // 3. PG - Residential
  const pgTypes = ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment'];
  pgTypes.forEach(type => {
    templates.push({ transactionType: 'Paying Guest', category: 'Residential', propertyType: type, steps: createPGSteps() });
  });

  // 4. Sell & Rent - Commercial
  const commTypes = ['Office', 'Retail', 'Industry', 'Storage', 'Hospitality', 'Other'];
  ['Sell', 'Rent / Lease'].forEach(txn => {
    const isRent = txn === 'Rent / Lease';
    commTypes.forEach(type => {
      if (type === 'Retail') {
        templates.push({ transactionType: txn, category: 'Commercial', propertyType: type, steps: createRetailSteps(isRent) });
      } else {
        templates.push({ transactionType: txn, category: 'Commercial', propertyType: type, steps: createCommercialSteps(isRent, type) });
      }
    });
    // Commercial Plot
    templates.push({ transactionType: txn, category: 'Commercial', propertyType: 'Plot / Land', steps: createPlotSteps(isRent, true) });
  });

  return templates;
};

const seedDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URL);
    console.log('Connected.');

    console.log('Clearing existing templates...');
    await PropertyFormTemplate.deleteMany({});

    console.log('Generating exact 99acres property templates...');
    const allTemplates = generateAllTemplates();

    console.log(`Inserting ${allTemplates.length} templates...`);
    await PropertyFormTemplate.create(allTemplates);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
};

seedDB();
