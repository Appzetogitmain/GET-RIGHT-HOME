import PropertyFormTemplate from '../models/PropertyFormTemplate.js';

const expandedAmenities = [
  'Wi-Fi', 'AC', 'Laundry', 'Housekeeping', 'Food', 'RO Water', 'CCTV', 'Geyser', 'Gym', 'Lift', 'Power Backup', 'Security', 'Parking', 'Fridge', 'TV', 'Triple Occupancy'
];

// Helper to create 4 steps for standard residential properties (Apartments, Villas, etc)
const createResidentialSteps = (isRent) => [
  {
    stepNumber: 1,
    title: 'Property & Location Details',
    description: 'Basic details and location of your property',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Elegant 3 BHK Apartment at Mahalaxmi Nagar', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Provide detailed information about bedrooms, ventilation, balconies, views, and vicinity...', required: true, order: 2 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 3 },
      { name: 'locality', label: 'Locality / Society', type: 'text', placeholder: 'e.g. Mahalaxmi Nagar', required: true, order: 4 },
      { name: 'houseNumber', label: 'House/Flat Number (Optional)', type: 'text', placeholder: 'e.g. 101, A-Block', required: false, order: 5 }
    ]
  },
  {
    stepNumber: 2,
    title: 'Property Profile & Area',
    description: 'Add room, layout, and area details',
    fields: [
      { name: 'bedrooms', label: 'No. of Bedrooms', type: 'pill', options: ['1', '2', '3', '4', '5+'], required: true, order: 1 },
      { name: 'bathrooms', label: 'No. of Bathrooms', type: 'pill', options: ['1', '2', '3', '4+'], required: true, order: 2 },
      { name: 'balconies', label: 'Balconies', type: 'pill', options: ['0', '1', '2', '3+'], required: false, order: 3 },
      { name: 'furnishing', label: 'Furnishing Status', type: 'pill', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 4 },
      { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 10', required: true, order: 5 },
      { name: 'floorNumber', label: 'Property on Floor', type: 'number', placeholder: 'e.g. 4', required: true, order: 6 },
      { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction', 'Pre Launch'], required: true, order: 7 },
      { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 1200', required: true, order: 8 },
      { name: 'carpetAreaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 9 },
      { name: 'superArea', label: 'Super Built-up Area', type: 'number', placeholder: 'e.g. 1500', required: false, order: 10 },
      { name: 'superAreaUnit', label: 'Super Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: false, order: 11 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Pricing & Amenities',
    description: 'Mention expected price and available amenities',
    fields: [
      { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 20000' : 'e.g. 7500000', required: true, order: 1 },
      ...(isRent ? [{ name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 40000', required: true, order: 2 }] : []),
      { name: 'maintenanceCharges', label: 'Monthly Maintenance (₹)', type: 'number', placeholder: 'e.g. 2000', required: false, order: 3 },
      ...(isRent ? [
        { name: 'brokersOk', label: 'Are you ok with brokers contacting you?', type: 'pill', options: ['Yes', 'No'], required: true, order: 4 },
        { name: 'preferredTenants', label: 'Willing to rent out to', type: 'checkbox_group', options: ['Family', 'Single men', 'Single women'], required: true, order: 5 }
      ] : []),
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: expandedAmenities, required: true, order: 6 },
      { name: 'gatedCommunity', label: 'Gated Community?', type: 'pill', options: ['Yes', 'No'], required: true, order: 7 },
      { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['None', 'Partial', 'Full'], required: false, order: 8 },
      { name: 'waterSupply', label: 'Water Supply', type: 'pill', options: ['Corporation', 'Borewell', 'Both'], required: false, order: 9 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'Prime Location', 'Gated Society', 'Corner Property', 'Vastu Compliant', 'Recently Renovated',
        'High Floor View', 'Natural Light & Ventilation', 'Modular Kitchen', 'Spacious Rooms',
        'Low Maintenance', 'Pet Friendly', 'Ready to Move In', 'Investment Opportunity', 'Metro Connectivity'
      ], required: false, order: 10 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Photos & Nearby Places',
    description: 'Add media and nearby landmarks',
    fields: [
      { name: 'propertyImages', label: 'Upload Property Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload Property Videos (Optional)', type: 'file', required: false, order: 2 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 3 }
    ]
  }
];

// Helper for Land/Plot
const createPlotSteps = (isRent, isCommercial) => [
  {
    stepNumber: 1,
    title: 'Property & Location Details',
    description: 'Basic details and location of your plot',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Commercial Plot at Main Road', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Describe the plot location benefits, frontage size, surrounding developments...', required: true, order: 2 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 3 },
      { name: 'locality', label: 'Locality / Society', type: 'text', placeholder: 'e.g. Super Corridor', required: true, order: 4 },
      { name: 'houseNumber', label: 'House/Flat Number (Optional)', type: 'text', placeholder: 'e.g. 101, A-Block', required: false, order: 5 }
    ]
  },
  {
    stepNumber: 2,
    title: 'Plot Profile & Dimensions',
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
    stepNumber: 3,
    title: 'Pricing, Legal & Amenities',
    description: 'Pricing and approval details',
    fields: [
      { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 20000' : 'e.g. 7500000', required: true, order: 1 },
      ...(isRent ? [{ name: 'availableFrom', label: 'Available from', type: 'date', required: true, order: 2 }] : []),
      { name: 'approvalAuthority', label: 'Approval Authority', type: 'text', placeholder: 'e.g. IDA, TNCP', required: false, order: 3 },
      ...(isRent ? [
        { name: 'brokersOk', label: 'Are you ok with brokers contacting you?', type: 'pill', options: ['Yes', 'No'], required: true, order: 4 },
        { name: 'preferredTenants', label: 'Willing to rent out to', type: 'checkbox_group', options: ['Family', 'Single men', 'Single women'], required: true, order: 5 }
      ] : []),
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: expandedAmenities, required: true, order: 6 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'Corner Plot', 'Prime Location', 'Road Facing', 'Vastu Compliant', 'Freehold Land',
        'RERA Approved', 'Wide Road Frontage', 'Commercial Zone', 'Electricity Available', 'Water Connection Available'
      ], required: false, order: 7 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Photos & Nearby Places',
    description: 'Add media and nearby landmarks',
    fields: [
      { name: 'propertyImages', label: 'Upload Property Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload Property Videos (Optional)', type: 'file', required: false, order: 2 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 3 }
    ]
  }
];

// Helper for Retail Space (Commercial Shops & Commercial Showrooms)
const createRetailSteps = (isRent, subType) => [
  {
    stepNumber: 1,
    title: 'Property & Location Details',
    description: 'Add basic commercial details and location',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Premium Commercial Shop in City Center', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Describe your shop/showroom frontage, footfall potential, business amenities...', required: true, order: 2 },
      { name: 'locatedInside', label: 'Your shop is located inside', type: 'dropdown', options: ['Mall', 'Commercial Project', 'Residential Project', 'Retail Complex/Building', 'Market / High Street'], required: true, order: 3 },
      { name: 'buildingName', label: 'Building/Project Name (Optional)', type: 'text', placeholder: 'e.g. Sunrise Plaza', required: false, order: 4 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 5 },
      { name: 'locality', label: 'Locality / Society', type: 'text', placeholder: 'e.g. Chikitsak Nagar', required: true, order: 6 },
      { name: 'houseNumber', label: 'House/Flat Number (Optional)', type: 'text', placeholder: 'e.g. 101, A-Block', required: false, order: 7 },
      { name: 'subLocality', label: 'Sub Locality (Optional)', type: 'text', placeholder: 'e.g. Sector-B', required: false, order: 8 },
      { name: 'mallName', label: 'Mall Name (Optional)', type: 'text', placeholder: 'e.g. Treasure Island Mall', required: false, order: 9 }
    ]
  },
  {
    stepNumber: 2,
    title: 'Retail Profile & Area',
    description: 'Add layout, area and sizing details',
    fields: [
      { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 1700', required: true, order: 1 },
      { name: 'carpetAreaUnit', label: 'Carpet Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 2 },
      { name: 'builtUpArea', label: 'Built-up Area (Optional)', type: 'number', placeholder: 'e.g. 2000', required: false, order: 3 },
      { name: 'builtUpAreaUnit', label: 'Built-up Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: false, order: 4 },
      { name: 'entranceWidth', label: 'Entrance Width (Optional)', type: 'number', placeholder: 'e.g. 15', required: false, order: 5 },
      { name: 'entranceWidthUnit', label: 'Entrance Width Unit', type: 'dropdown', options: ['ft.', 'mt.'], required: false, order: 6 },
      { name: 'ceilingHeight', label: 'Ceiling Height (Optional)', type: 'number', placeholder: 'e.g. 12', required: false, order: 7 },
      { name: 'ceilingHeightUnit', label: 'Ceiling Height Unit', type: 'dropdown', options: ['ft.', 'mt.'], required: false, order: 8 },
      { name: 'washrooms', label: 'Washroom details', type: 'multiselect_pill', options: ['Private washrooms', 'Public washrooms', 'Not Available'], required: true, order: 9 },
      { name: 'totalFloors', label: 'Floor Details - Total Floors (Optional)', type: 'number', placeholder: 'e.g. 5', required: false, order: 10 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Pricing, Availability & Amenities',
    description: 'Pricing, maintenance, and availability details',
    fields: [
      { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 100000' : 'e.g. 50000000', required: true, order: 1 },
      { name: 'priceNegotiable', label: 'Price Negotiable?', type: 'pill', options: ['Yes', 'No'], required: true, order: 2 },
      { name: 'taxExcluded', label: 'Tax and Govt. charges excluded?', type: 'pill', options: ['Yes', 'No'], required: true, order: 3 },
      { name: 'maintenanceCharges', label: 'Monthly Maintenance (₹) (Optional)', type: 'number', placeholder: 'e.g. 5000', required: false, order: 4 },
      { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction', 'Pre Launch'], required: true, order: 5 },
      ...(isRent ? [{ name: 'availableFrom', label: 'Available from', type: 'date', required: true, order: 6 }] : []),
      { name: 'propertyAge', label: 'Age of Property', type: 'pill', options: ['0-1 Years', '1-5 Years', '5-10 Years', '10+ Years'], required: true, dependsOn: { field: 'availability', value: 'Ready to move' }, order: 7 },
      { name: 'expectedBy', label: 'Expected By', type: 'dropdown', options: ['Within 3 Months', 'Within 6 Months', 'By 2026', 'By 2027', 'By 2028', 'By 2029'], required: true, dependsOn: { field: 'availability', value: 'Under construction' }, order: 8 },
      { name: 'isPreLeased', label: 'Is it Pre-leased / Pre-Rented?', type: 'pill', options: ['Yes', 'No'], required: true, order: 9 },
      { name: 'currentRent', label: 'Current Rent Per Month (₹)', type: 'number', placeholder: 'e.g. 45000', required: true, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 10 },
      { name: 'leaseTenure', label: 'Lease Tenure in Years', type: 'number', placeholder: 'e.g. 5', required: true, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 11 },
      { name: 'annualRentIncrease', label: 'Annual rent increase in % (Optional)', type: 'number', placeholder: 'e.g. 5', required: false, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 12 },
      { name: 'leasedToBusiness', label: 'Leased to - Business Type (Optional)', type: 'text', placeholder: 'e.g. Retail Store / Bank', required: false, dependsOn: { field: 'isPreLeased', value: 'Yes' }, order: 13 },
      { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['Yes', 'No'], required: false, order: 14 },
      { name: 'parkingType', label: 'Parking Type', type: 'multiselect_pill', options: ['Private Parking', 'Public Parking', 'Multilevel Parking', 'Not Available'], required: true, order: 15 },
      ...(isRent ? [
        { name: 'brokersOk', label: 'Are you ok with brokers contacting you?', type: 'pill', options: ['Yes', 'No'], required: true, order: 16 },
        { name: 'preferredTenants', label: 'Willing to rent out to', type: 'checkbox_group', options: ['Family', 'Single men', 'Single women'], required: true, order: 17 }
      ] : []),
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'High Street Location', 'Corner Property', 'Prime Visibility', 'High Footfall Area',
        'Pre-leased Investment', 'Ample Parking', 'Ready to Move In', 'Near Metro/Transport Hub',
        'Power Backup Available', 'CCTV Surveillance'
      ], required: false, order: 18 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Photos & Nearby Places',
    description: 'Add media of your property',
    fields: [
      { name: 'propertyImages', label: 'Upload Property Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload Property Videos (Optional)', type: 'file', required: false, order: 2 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 3 }
    ]
  }
];

// Helper for Commercial (Offices, Industry, Storage, Hospitality)
const createCommercialSteps = (isRent, commType, subType) => {
  const isOffice = commType === 'Office' || subType?.includes('office');
  const isCoworking = subType === 'Co-working office space';

  return [
    {
      stepNumber: 1,
      title: 'Property & Location Details',
      description: 'Add title, description and location details',
      fields: [
        { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: `e.g. Modern commercial space at prime road`, required: true, order: 1 },
        { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: `Describe your amenities, footfall potential, business vicinity...`, required: true, order: 2 },
        { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Mumbai', required: true, order: 3 },
        { name: 'locality', label: 'Locality / Society', type: 'text', placeholder: 'e.g. Andheri East', required: true, order: 4 },
        { name: 'houseNumber', label: 'House/Flat Number (Optional)', type: 'text', placeholder: 'e.g. 101, A-Block', required: false, order: 5 },
        { name: 'buildingName', label: 'Building Name', type: 'text', placeholder: 'e.g. Raheja Plaza', required: false, order: 6 }
      ]
    },
    {
      stepNumber: 2,
      title: 'Commercial Profile & Area',
      description: `Add details and dimensions about the commercial space`,
      fields: [
        { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 2000', required: true, order: 1 },
        { name: 'carpetAreaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 2 },
        { name: 'superArea', label: 'Super Built-up Area', type: 'number', placeholder: 'e.g. 2500', required: false, order: 3 },
        { name: 'superAreaUnit', label: 'Super Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: false, order: 4 },
        { name: 'furnishing', label: 'Furnishing Status', type: 'pill', options: ['Bare Shell', 'Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 5 },
        { name: 'washrooms', label: 'Washrooms', type: 'multiselect_pill', options: ['Private washrooms', 'Public washrooms', 'Not Available'], required: true, order: 6 },
        ...(isOffice ? [
          { name: 'pantry', label: 'Pantry/Cafeteria', type: 'pill', options: ['Shared', 'Private', 'None'], required: false, order: 7 },
          { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 15', required: true, order: 8 },
          { name: 'floorNumber', label: 'Property on Floor', type: 'number', placeholder: 'e.g. 4', required: true, order: 9 },
          { name: 'seatsCount', label: 'Number of Seats', type: 'number', placeholder: 'e.g. 50', required: true, order: 10 },
          { name: 'cabinsCount', label: 'Number of Cabins (Optional)', type: 'number', placeholder: 'e.g. 3', required: false, order: 11 },
          { name: 'meetingRoomsCount', label: 'Meeting Rooms / Conference Rooms (Optional)', type: 'number', placeholder: 'e.g. 1', required: false, order: 12 },
          { name: 'propertyAge', label: 'Age of Property', type: 'pill', options: ['0-1 Years', '1-5 Years', '5-10 Years', '10+ Years'], required: true, order: 13 },
          { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction', 'Pre Launch'], required: true, order: 14 },
          { name: 'isPreLeased', label: 'Is Pre-Leased / Pre-Rented?', type: 'pill', options: ['Yes', 'No'], required: true, order: 15 },
          { name: 'suitableFor', label: 'Suitable For', type: 'checkbox_group', options: ['IT/ITES', 'Back Office', 'Call Center/BPO', 'Corporate Office', 'Co-Working Space', 'Clinic/Hospital', 'Consultancy Office', 'Any/General Office'], required: true, order: 16 },
          { name: 'operatingHours', label: 'Operating Hours (Optional)', type: 'pill', options: ['24x7 Allowed', 'Normal Business Hours'], required: false, order: 17 },
          { name: 'officeFacilities', label: 'Office Facilities', type: 'checkbox_group', options: ['Centralized AC', 'Oxygen Duct', 'UPS', 'Fire Safety'], required: false, order: 18 }
        ] : []),
        ...(isCoworking ? [
          { name: 'seatType', label: 'Seat Type', type: 'checkbox_group', options: ['Hot Desks', 'Dedicated Desks', 'Private Cabins', 'Virtual Office'], required: true, order: 19 },
          { name: 'plansPricing', label: 'Plans and Pricing', type: 'checkbox_group', options: ['Daily Pass', 'Weekly Pass', 'Monthly Pass', 'Annual Membership'], required: false, order: 20 },
          { name: 'coworkingServices', label: 'Co-working Services', type: 'checkbox_group', options: ['Reception Services', 'Mail Handling', 'IT Support', 'Admin Support'], required: false, order: 21 },
          { name: 'officeSupplies', label: 'Office Supplies', type: 'checkbox_group', options: ['Printers/Scanners', 'Whiteboards', 'Projectors', 'Stationery'], required: false, order: 22 },
          { name: 'spaceAccess', label: 'Space Access', type: 'checkbox_group', options: ['24/7 Access', 'Biometric/Keycard Entry', 'Lounge Area', 'Phone Booths'], required: false, order: 23 },
          { name: 'foodDrinks', label: 'Food & Drinks', type: 'checkbox_group', options: ['Free Tea/Coffee', 'Cafeteria', 'Snack Vending Machines', 'Microwave/Fridge'], required: false, order: 24 },
          { name: 'activities', label: 'Activities & Events', type: 'checkbox_group', options: ['Networking Events', 'Workshops/Seminars', 'Pitch Sessions'], required: false, order: 25 },
          { name: 'covidReadiness', label: 'Covid Readiness', type: 'checkbox_group', options: ['Sanitization Stations', 'Social Distancing Protocols', 'Temperature Checks'], required: false, order: 26 }
        ] : []),
        ...(commType === 'Industry' ? [
          { name: 'pantry', label: 'Pantry/Cafeteria', type: 'pill', options: ['Shared', 'Private', 'None'], required: false, order: 20 }
        ] : []),
        ...(commType === 'Storage' ? [
          { name: 'ceilingHeight', label: 'Ceiling Height (ft)', type: 'number', placeholder: 'e.g. 25', required: true, order: 20 },
          { name: 'dockDoors', label: 'No. of Dock Doors', type: 'number', placeholder: 'e.g. 4', required: false, order: 21 }
        ] : [])
      ]
    },
    {
      stepNumber: 3,
      title: 'Pricing, Utilities & Amenities',
      description: 'Pricing, utilities and available features',
      fields: [
        { name: isRent ? 'monthlyRent' : 'expectedPrice', label: isRent ? 'Monthly Rent (₹)' : 'Expected Price (₹)', type: 'number', placeholder: isRent ? 'e.g. 100000' : 'e.g. 50000000', required: true, order: 1 },
        ...(isRent ? [{ name: 'availableFrom', label: 'Available from', type: 'date', required: true, order: 2 }] : []),
        ...(isRent ? [
          { name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 500000', required: true, order: 3 },
          { name: 'lockInPeriod', label: 'Lock-in Period (Years)', type: 'number', placeholder: 'e.g. 3', required: false, order: 4 }
        ] : []),
        { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['Yes', 'No'], required: false, order: 5 },
        { name: 'parkingType', label: 'Parking Type', type: 'multiselect_pill', options: ['Private Parking', 'Public Parking', 'Multilevel Parking', 'Not Available'], required: true, order: 6 },
        ...(isRent ? [
          { name: 'brokersOk', label: 'Are you ok with brokers contacting you?', type: 'pill', options: ['Yes', 'No'], required: true, order: 7 },
          { name: 'preferredTenants', label: 'Willing to rent out to', type: 'checkbox_group', options: ['Family', 'Single men', 'Single women'], required: true, order: 8 }
        ] : []),
        { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: expandedAmenities, required: true, order: 9 },
        { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
          'Prime Business Location', 'Modern Infrastructure', 'High-Speed Internet Ready', 'Centrally Air Conditioned',
          'Dedicated Parking', 'Power Backup', '24x7 Security', 'CCTV Surveillance',
          'Ample Natural Light', 'Prestigious Address', 'Near Metro/Airport', 'Dedicated Reception'
        ], required: false, order: 10 }
      ]
    },
    {
      stepNumber: 4,
      title: 'Photos & Nearby Places',
      description: `Add media to showcase your commercial space`,
      fields: [
        { name: 'propertyImages', label: `Upload Photos`, type: 'file', required: true, order: 1 },
        { name: 'propertyVideos', label: `Upload Videos (Optional)`, type: 'file', required: false, order: 2 },
        { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 3 }
      ]
    }
  ];
};

// Helper for PG
const createPGSteps = () => [
  {
    stepNumber: 1,
    title: 'PG & Location Details',
    description: 'Add basic PG details and location',
    fields: [
      { name: 'propertyName', label: 'Property Title / Name', type: 'text', placeholder: 'e.g. Premium Girls PG Koramangala', required: true, order: 1 },
      { name: 'description', label: 'Details of Property', type: 'textarea', placeholder: 'Describe PG rules, cleanliness standards, food variety, security features...', required: true, order: 2 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Bangalore', required: true, order: 3 },
      { name: 'locality', label: 'Locality / Society', type: 'text', placeholder: 'e.g. Koramangala', required: true, order: 4 },
      { name: 'houseNumber', label: 'House/Flat Number (Optional)', type: 'text', placeholder: 'e.g. 101, A-Block', required: false, order: 5 },
      { name: 'pgName', label: 'PG Name', type: 'text', placeholder: 'e.g. Sunrise PG', required: true, order: 6 }
    ]
  },
  {
    stepNumber: 2,
    title: 'PG Details & Rules',
    description: 'Occupancy, rules, and facilities',
    fields: [
      { name: 'tenantType', label: 'Available For', type: 'pill', options: ['Boys', 'Girls', 'Any'], required: true, order: 1 },
      { name: 'occupancy', label: 'Room Types Available', type: 'pill', options: ['Single', 'Double', 'Triple', 'Four+'], required: true, order: 2 },
      { name: 'totalCapacity', label: 'Total Capacity', type: 'number', placeholder: 'e.g. 50', required: true, order: 3 },
      { name: 'foodIncluded', label: 'Food Included?', type: 'pill', options: ['Yes', 'No'], required: true, order: 4 },
      { name: 'noticePeriod', label: 'Notice Period (Days)', type: 'number', placeholder: 'e.g. 30', required: true, order: 5 },
      { name: 'gateClosingTime', label: 'Gate Closing Time', type: 'dropdown', options: ['9 PM', '10 PM', '11 PM', 'No Restriction'], required: false, order: 6 },
      { name: 'attachWashroom', label: 'Attached Washroom', type: 'pill', options: ['Yes', 'No'], required: true, order: 7 },
      { name: 'extraPgServices', label: 'Extra PG Services', type: 'checkbox_group', options: ['Wheelchair Friendly', 'AC Rooms', 'Pet Friendly'], required: false, order: 8 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Pricing & Amenities',
    description: 'Rent and available facilities',
    fields: [
      { name: 'monthlyRent', label: 'Starting Monthly Rent (₹)', type: 'number', placeholder: 'e.g. 8000', required: true, order: 1 },
      { name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 10000', required: true, order: 2 },
      { name: 'wifi', label: 'WiFi', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: true, order: 3 },
      { name: 'laundry', label: 'Laundry', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: false, order: 4 },
      { name: 'cleaning', label: 'Room Cleaning', type: 'pill', options: ['Daily', 'Weekly', 'Not Available'], required: false, order: 5 },
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: expandedAmenities, required: true, order: 6 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'Girls Only PG', 'Boys Only PG', 'Food Included', 'AC Rooms', 'Attached Washroom',
        'High-Speed WiFi', 'CCTV Surveillance', 'Gated Community', 'Near College/Office',
        'Housekeeping Included', 'Power Backup', 'Flexible Notice Period'
      ], required: false, order: 7 }
    ]
  },
  {
    stepNumber: 4,
    title: 'Photos & Nearby Places',
    description: 'Add photos of rooms and facilities',
    fields: [
      { name: 'propertyImages', label: 'Upload PG Photos', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Upload PG Videos (Optional)', type: 'file', required: false, order: 2 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 3 }
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

  // 4. Sell & Rent - Commercial (Specific Sub-types)
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

  ['Sell', 'Rent / Lease'].forEach(txn => {
    const isRent = txn === 'Rent / Lease';
    commercialSubtypes.forEach(({ cat, sub }) => {
      let steps;
      if (cat === 'Retail') {
        steps = createRetailSteps(isRent, sub);
      } else if (cat === 'Plot / Land') {
        steps = createPlotSteps(isRent, true);
      } else {
        steps = createCommercialSteps(isRent, cat, sub);
      }
      templates.push({ transactionType: txn, category: 'Commercial', propertyType: sub, steps });
    });

    // Generic template for 'Other' Commercial type
    templates.push({
      transactionType: txn,
      category: 'Commercial',
      propertyType: 'Other',
      steps: createCommercialSteps(isRent, 'Other', 'Other')
    });
  });

  return templates;
};

// Seed endpoint triggered by route
export const seedTemplatesController = async (req, res) => {
  try {
    console.log('Clearing existing templates...');
    await PropertyFormTemplate.deleteMany({});

    console.log('Generating exact 99acres property templates...');
    const allTemplates = generateAllTemplates();

    console.log(`Inserting ${allTemplates.length} templates...`);
    await PropertyFormTemplate.create(allTemplates);

    res.status(200).json({ success: true, message: "Templates seeded successfully via controller endpoint!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed on startup helper
export const seedOnStartup = async () => {
  try {
    console.log('🌱 Starting Auto-Seeding of 4-Step Templates...');
    await PropertyFormTemplate.deleteMany({});
    const allTemplates = generateAllTemplates();
    await PropertyFormTemplate.create(allTemplates);
    console.log(`🌱 Auto-Seeding Completed: ${allTemplates.length} templates created.`);
  } catch (err) {
    console.error('🌱 Auto-Seeding Failed:', err);
  }
};

// Get a specific template based on transaction, category, and property type
export const getTemplate = async (req, res) => {
    try {
        let { transactionType, category, propertyType } = req.query;

        // If not specific enough, return list of available combinations or error
        if (!transactionType || !category || !propertyType) {
            return res.status(400).json({ success: false, message: "Missing required query parameters: transactionType, category, propertyType" });
        }

        // Allow specific sub-type templates to load (e.g. 'Co-working office space')

        const template = await PropertyFormTemplate.findOne({ 
            transactionType, 
            category, 
            propertyType,
            isActive: true 
        });

        if (!template) {
            return res.status(404).json({ success: false, message: "No form template found for this configuration." });
        }

        res.status(200).json({ success: true, template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Create or Update a template
export const saveTemplate = async (req, res) => {
    try {
        const { transactionType, category, propertyType, steps } = req.body;

        if (!transactionType || !category || !propertyType || !steps) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const template = await PropertyFormTemplate.findOneAndUpdate(
            { transactionType, category, propertyType },
            { steps },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, template, message: "Template saved successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all unique combinations to show in Step 1
export const getAvailableConfigurations = async (req, res) => {
    try {
        // Aggregate to get unique transactionType -> categories -> propertyTypes
        const configs = await PropertyFormTemplate.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: {
                        transactionType: "$transactionType",
                        category: "$category"
                    },
                    propertyTypes: { $addToSet: "$propertyType" }
                }
            },
            {
                $group: {
                    _id: "$_id.transactionType",
                    categories: {
                        $push: {
                            category: "$_id.category",
                            propertyTypes: "$propertyTypes"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    transactionType: "$_id",
                    categories: 1
                }
            }
        ]);

        res.status(200).json({ success: true, configs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Create blank configuration combination
export const createTemplateCombination = async (req, res) => {
    try {
        const { transactionType, category, propertyType } = req.body;
        if (!transactionType || !category || !propertyType) {
            return res.status(400).json({ success: false, message: "Missing required fields: transactionType, category, propertyType" });
        }
        const exists = await PropertyFormTemplate.findOne({ transactionType, category, propertyType });
        if (exists) {
            return res.status(400).json({ success: false, message: "This combination already exists" });
        }
        let steps = [];
        const isRent = transactionType === 'Rent / Lease';
        
        if (category === 'Residential') {
            if (transactionType === 'Paying Guest') {
                steps = createPGSteps();
            } else if (propertyType === 'Plot / Land') {
                steps = createPlotSteps(isRent, false);
            } else {
                steps = createResidentialSteps(isRent);
            }
        } else if (category === 'Commercial') {
            if (propertyType.toLowerCase().includes('shop') || propertyType.toLowerCase().includes('showroom')) {
                steps = createRetailSteps(isRent, propertyType);
            } else if (propertyType.toLowerCase().includes('land') || propertyType.toLowerCase().includes('plot')) {
                steps = createPlotSteps(isRent, true);
            } else {
                let commType = 'Office';
                if (propertyType.toLowerCase().includes('ware') || propertyType.toLowerCase().includes('storage')) commType = 'Storage';
                if (propertyType.toLowerCase().includes('factory') || propertyType.toLowerCase().includes('manufactur')) commType = 'Industry';
                if (propertyType.toLowerCase().includes('hotel') || propertyType.toLowerCase().includes('resort') || propertyType.toLowerCase().includes('guest')) commType = 'Hospitality';
                
                steps = createCommercialSteps(isRent, commType, propertyType);
            }
        } else {
             // Fallback for unknown categories
             steps = [
                { stepNumber: 1, title: 'Property & Location Details', description: 'Add basic details and location', fields: [] },
                { stepNumber: 2, title: 'Property Profile & Area', description: 'Add layout and sizing details', fields: [] },
                { stepNumber: 3, title: 'Pricing & Amenities', description: 'Pricing, maintenance, and availability', fields: [] },
                { stepNumber: 4, title: 'Photos & Nearby Places', description: 'Add media of your property', fields: [] }
             ];
        }

        const newTemplate = new PropertyFormTemplate({
            transactionType,
            category,
            propertyType,
            steps
        });
        await newTemplate.save();
        res.status(201).json({ success: true, template: newTemplate, message: "Configuration created successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin: Rename Level 1 Category (Transaction Type)
export const renameTransactionType = async (req, res) => {
    try {
        const { oldName, newName } = req.body;
        if (!oldName || !newName) {
            return res.status(400).json({ success: false, message: "Missing oldName or newName" });
        }
        await PropertyFormTemplate.updateMany(
            { transactionType: oldName },
            { $set: { transactionType: newName } }
        );
        res.status(200).json({ success: true, message: "Category renamed successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin: Delete Level 1 Category
export const deleteTransactionType = async (req, res) => {
    try {
        const { transactionType } = req.body;
        if (!transactionType) {
            return res.status(400).json({ success: false, message: "Missing transactionType" });
        }
        await PropertyFormTemplate.deleteMany({ transactionType });
        res.status(200).json({ success: true, message: "Category and all its child forms deleted." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin: Rename Level 2 Sub-category (Category)
export const renameCategory = async (req, res) => {
    try {
        const { transactionType, oldCategory, newCategory } = req.body;
        if (!transactionType || !oldCategory || !newCategory) {
            return res.status(400).json({ success: false, message: "Missing transactionType, oldCategory or newCategory" });
        }
        await PropertyFormTemplate.updateMany(
            { transactionType, category: oldCategory },
            { $set: { category: newCategory } }
        );
        res.status(200).json({ success: true, message: "Sub-category renamed successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin: Delete Level 2 Sub-category
export const deleteCategory = async (req, res) => {
    try {
        const { transactionType, category } = req.body;
        if (!transactionType || !category) {
            return res.status(400).json({ success: false, message: "Missing transactionType or category" });
        }
        await PropertyFormTemplate.deleteMany({ transactionType, category });
        res.status(200).json({ success: true, message: "Sub-category and all its child forms deleted." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin: Rename Level 3 Property Type
export const renamePropertyType = async (req, res) => {
    try {
        const { transactionType, category, oldPropertyType, newPropertyType } = req.body;
        if (!transactionType || !category || !oldPropertyType || !newPropertyType) {
            return res.status(400).json({ success: false, message: "Missing transactionType, category, oldPropertyType or newPropertyType" });
        }
        await PropertyFormTemplate.updateMany(
            { transactionType, category, propertyType: oldPropertyType },
            { $set: { propertyType: newPropertyType } }
        );
        res.status(200).json({ success: true, message: "Property type renamed successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin: Delete Level 3 Property Type
export const deletePropertyType = async (req, res) => {
    try {
        const { transactionType, category, propertyType } = req.body;
        if (!transactionType || !category || !propertyType) {
            return res.status(400).json({ success: false, message: "Missing transactionType, category or propertyType" });
        }
        await PropertyFormTemplate.deleteMany({ transactionType, category, propertyType });
        res.status(200).json({ success: true, message: "Property type template deleted." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
