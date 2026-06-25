import BuilderFormTemplate from '../models/BuilderFormTemplate.js';

const expandedAmenities = [
  'Club House', 'Swimming Pool', 'Gymnasium', 'Kids Play Area', 'Jogging Track', 
  'Indoor Games', 'Multipurpose Hall', 'Landscaped Gardens', 'Tennis Court', 
  'Badminton Court', 'Basketball Court', 'Yoga/Meditation Area', 'Amphitheatre',
  '24x7 Security', 'CCTV Surveillance', 'Power Backup', 'Intercom Facility',
  'Rain Water Harvesting', 'Sewage Treatment Plant', 'Vastu Compliant'
];

const getBuilderStep2Fields = (category, propertyType, isRent) => {
  const commonScaleFields = [
    { name: 'totalLandArea', label: 'Total Land Area (Acres)', type: 'number', placeholder: 'e.g. 5.5', required: true, order: 1 },
    { name: 'totalTowers', label: 'Total Towers/Blocks', type: 'number', placeholder: 'e.g. 4', required: true, order: 2 },
    { name: 'totalUnits', label: 'Total Units', type: 'number', placeholder: 'e.g. 200', required: true, order: 3 },
  ];

  if (category === 'Residential') {
    if (propertyType === 'Plot / Land') {
      return [
        { name: 'totalLandArea', label: 'Total Project Land Area (Acres)', type: 'number', placeholder: 'e.g. 5.5', required: true, order: 1 },
        { name: 'totalUnits', label: 'Total Plots In Project', type: 'number', placeholder: 'e.g. 100', required: true, order: 2 },
        { name: 'plotArea', label: 'Plot Area', type: 'number', placeholder: 'e.g. 1500', required: true, order: 3 },
        { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares', 'biswa', 'guntha', 'aankadam', 'hectares', 'rood', 'chataks', 'perch'], required: true, order: 4 },
        { name: 'length', label: 'Length (ft)', type: 'number', placeholder: 'e.g. 50', required: false, order: 5 },
        { name: 'width', label: 'Width (ft)', type: 'number', placeholder: 'e.g. 30', required: false, order: 6 },
        { name: 'boundaryWall', label: 'Boundary Wall Made?', type: 'pill', options: ['Yes', 'No'], required: true, order: 7 },
        { name: 'facing', label: 'Facing', type: 'dropdown', options: ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'], required: false, order: 8 },
        { name: 'landType', label: 'Land Type', type: 'pill', options: ['Residential', 'Commercial', 'Agricultural', 'Industrial'], required: true, order: 9 },
        { name: 'roadWidth', label: 'Road Width (ft)', type: 'number', placeholder: 'e.g. 40', required: false, order: 10 },
        { name: 'boundaryMarked', label: 'Boundary Marked?', type: 'pill', options: ['Yes', 'No'], required: false, order: 11 },
        { name: 'approvalAuthority', label: 'Approval Authority', type: 'text', placeholder: 'e.g. IDA, TNCP', required: false, order: 12 }
      ];
    } else {
      return [
        ...commonScaleFields,
        { name: 'projectType', label: 'Project Type', type: 'multiselect_pill', options: ['Residential', 'Commercial', 'Mixed-Use'], required: true, order: 4 },
        { name: 'bedrooms', label: 'No. of Bedrooms (Standard Unit)', type: 'pill', options: ['1', '2', '3', '4', '5+'], required: true, order: 5 },
        { name: 'bathrooms', label: 'No. of Bathrooms (Standard Unit)', type: 'pill', options: ['1', '2', '3', '4+'], required: true, order: 6 },
        { name: 'balconies', label: 'Balconies (Standard Unit)', type: 'pill', options: ['0', '1', '2', '3+'], required: false, order: 7 },
        { name: 'furnishing', label: 'Furnishing Status (Standard Unit)', type: 'pill', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 8 },
        { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 10', required: true, order: 9 },
        { name: 'floorNumber', label: 'Property on Floor', type: 'number', placeholder: 'e.g. 4', required: true, order: 10 },
        { name: 'availability', label: 'Availability Status', type: 'pill', options: ['Ready to move', 'Under construction', 'Pre Launch'], required: true, order: 11 },
        { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', placeholder: 'e.g. 1200', required: true, order: 12 },
        { name: 'carpetAreaUnit', label: 'Carpet Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], default: 'sq.ft.', required: true, order: 13 },
        { name: 'superArea', label: 'Super Built-up Area (sq.ft)', type: 'number', placeholder: 'e.g. 1500', required: false, order: 14 },
        { name: 'superAreaUnit', label: 'Super Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], default: 'sq.ft.', required: false, order: 15 },
        { name: 'gatedCommunity', label: 'Gated Community?', type: 'pill', options: ['Yes', 'No'], required: true, order: 16 },
        { name: 'powerBackup', label: 'Power Backup', type: 'pill', options: ['None', 'Partial', 'Full'], required: false, order: 17 },
        { name: 'waterSupply', label: 'Water Supply', type: 'pill', options: ['Corporation', 'Borewell', 'Both'], required: false, order: 18 }
      ];
    }
  } else if (category === 'Commercial') {
    const isRetail = propertyType.toLowerCase().includes('shop') || propertyType.toLowerCase().includes('showroom');
    const isOffice = propertyType.toLowerCase().includes('office') || propertyType.toLowerCase().includes('co-working');
    const isPlot = propertyType.toLowerCase().includes('land') || propertyType.toLowerCase().includes('plot');

    if (isPlot) {
      return [
        { name: 'totalLandArea', label: 'Total Project Land Area (Acres)', type: 'number', placeholder: 'e.g. 5.5', required: true, order: 1 },
        { name: 'totalUnits', label: 'Total Plots In Project', type: 'number', placeholder: 'e.g. 100', required: true, order: 2 },
        { name: 'plotArea', label: 'Plot Area', type: 'number', placeholder: 'e.g. 1500', required: true, order: 3 },
        { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: true, order: 4 },
        { name: 'length', label: 'Length (ft)', type: 'number', placeholder: 'e.g. 50', required: false, order: 5 },
        { name: 'width', label: 'Width (ft)', type: 'number', placeholder: 'e.g. 30', required: false, order: 6 },
        { name: 'boundaryWall', label: 'Boundary Wall Made?', type: 'pill', options: ['Yes', 'No'], required: true, order: 7 },
        { name: 'facing', label: 'Facing', type: 'dropdown', options: ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'], required: false, order: 8 },
        { name: 'landType', label: 'Land Type', type: 'pill', options: ['Commercial', 'Industrial', 'Institutional'], required: true, order: 9 },
        { name: 'roadWidth', label: 'Road Width (ft)', type: 'number', placeholder: 'e.g. 60', required: false, order: 10 },
        { name: 'boundaryMarked', label: 'Boundary Marked?', type: 'pill', options: ['Yes', 'No'], required: false, order: 11 },
        { name: 'approvalAuthority', label: 'Approval Authority', type: 'text', placeholder: 'e.g. IDA, TNCP', required: false, order: 12 }
      ];
    } else if (isRetail) {
      return [
        ...commonScaleFields,
        { name: 'locatedInside', label: 'Retail Space Located Inside', type: 'dropdown', options: ['Mall', 'Commercial Project', 'Residential Project', 'Retail Complex/Building', 'Market / High Street'], required: true, order: 4 },
        { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 1200', required: true, order: 5 },
        { name: 'carpetAreaUnit', label: 'Carpet Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: true, order: 6 },
        { name: 'builtUpArea', label: 'Built-up Area', type: 'number', placeholder: 'e.g. 1500', required: false, order: 7 },
        { name: 'builtUpAreaUnit', label: 'Built-up Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: false, order: 8 },
        { name: 'entranceWidth', label: 'Entrance Width', type: 'number', placeholder: 'e.g. 15', required: false, order: 9 },
        { name: 'entranceWidthUnit', label: 'Entrance Width Unit', type: 'dropdown', options: ['ft.', 'mt.'], required: false, order: 10 },
        { name: 'ceilingHeight', label: 'Ceiling Height', type: 'number', placeholder: 'e.g. 12', required: false, order: 11 },
        { name: 'ceilingHeightUnit', label: 'Ceiling Height Unit', type: 'dropdown', options: ['ft.', 'mt.'], required: false, order: 12 },
        { name: 'washrooms', label: 'Washrooms', type: 'multiselect_pill', options: ['Private washrooms', 'Public washrooms', 'Not Available'], required: true, order: 13 },
        { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 5', required: false, order: 14 }
      ];
    } else if (isOffice) {
      return [
        ...commonScaleFields,
        { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 2000', required: true, order: 4 },
        { name: 'carpetAreaUnit', label: 'Carpet Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: true, order: 5 },
        { name: 'superArea', label: 'Super Built-up Area', type: 'number', placeholder: 'e.g. 2500', required: false, order: 6 },
        { name: 'superAreaUnit', label: 'Super Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: false, order: 7 },
        { name: 'furnishing', label: 'Furnishing Status', type: 'pill', options: ['Bare Shell', 'Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 8 },
        { name: 'washrooms', label: 'Washrooms', type: 'multiselect_pill', options: ['Private washrooms', 'Public washrooms', 'Not Available'], required: true, order: 9 },
        { name: 'pantry', label: 'Pantry/Cafeteria', type: 'pill', options: ['Shared', 'Private', 'None'], required: false, order: 10 },
        { name: 'totalFloors', label: 'Total Floors in Building', type: 'number', placeholder: 'e.g. 15', required: true, order: 11 },
        { name: 'floorNumber', label: 'Property on Floor', type: 'number', placeholder: 'e.g. 4', required: true, order: 12 },
        { name: 'seatsCount', label: 'Number of Seats', type: 'number', placeholder: 'e.g. 50', required: true, order: 13 },
        { name: 'cabinsCount', label: 'Number of Cabins (Optional)', type: 'number', placeholder: 'e.g. 3', required: false, order: 14 },
        { name: 'meetingRoomsCount', label: 'Meeting Rooms (Optional)', type: 'number', placeholder: 'e.g. 1', required: false, order: 15 },
        { name: 'facilities', label: 'Office Facilities', type: 'checkbox_group', options: ['Centralized AC', 'Oxygen Duct', 'UPS', 'Fire Safety'], required: false, order: 16 }
      ];
    } else {
      const isStorage = propertyType.toLowerCase().includes('ware') || propertyType.toLowerCase().includes('storage');
      return [
        ...commonScaleFields,
        { name: 'carpetArea', label: 'Carpet Area', type: 'number', placeholder: 'e.g. 5000', required: true, order: 4 },
        { name: 'carpetAreaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'], required: true, order: 5 },
        { name: 'ceilingHeight', label: 'Ceiling Height (ft)', type: 'number', placeholder: 'e.g. 25', required: false, order: 6 },
        ...(isStorage ? [{ name: 'dockDoors', label: 'Number of Dock Doors', type: 'number', placeholder: 'e.g. 4', required: false, order: 7 }] : []),
        { name: 'powerCapacity', label: 'Power Capacity (kVA)', type: 'number', placeholder: 'e.g. 100', required: false, order: 8 },
        { name: 'officeSpaceArea', label: 'Office Space Area (sq.ft)', type: 'number', placeholder: 'e.g. 500', required: false, order: 9 }
      ];
    }
  }
  return commonScaleFields;
};

const createBuilderSteps = (isRent, category, propertyType) => [
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
      { name: 'contactNumber', label: 'Contact Number', type: 'text', placeholder: 'e.g. 9876543210', required: true, order: 7 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 8 },
      { name: 'locality', label: 'Locality / Sector', type: 'text', placeholder: 'e.g. Super Corridor', required: true, order: 9 },
      { name: 'fullAddress', label: 'Complete Project Address', type: 'textarea', placeholder: 'e.g. Plot No 12, Main Road...', required: true, order: 10 }
    ]
  },
  {
    stepNumber: 2,
    title: 'Property Profile & Area',
    description: 'Provide land area, units, and layout details',
    fields: getBuilderStep2Fields(category, propertyType, isRent)
  },
  {
    stepNumber: 3,
    title: 'Floor Plans & Payment Milestones',
    description: 'Add layout dimensions and milestones details',
    fields: [
      { 
        name: 'floorPlans', 
        label: 'Floor Plans Configuration', 
        type: 'repeater', 
        required: true, 
        order: 1,
        subFields: [
          { name: 'configName', label: 'Configuration (e.g. 2 BHK, 3 BHK)', type: 'text', required: true, order: 1 },
          { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', required: true, order: 2 },
          { name: 'superArea', label: 'Super Built-up Area (sq.ft)', type: 'number', required: true, order: 3 },
          { name: 'price', label: 'Starting Price (₹)', type: 'number', required: true, order: 4 },
          { name: 'possessionStatus', label: 'Possession Status', type: 'pill', options: ['Ready to move', 'Under construction'], required: true, order: 5 },
          { name: 'floorPlanImage', label: 'Floor Plan Layout Image', type: 'file', required: false, order: 6 },
          { 
            name: 'roomDimensions', 
            label: 'Room Dimensions', 
            type: 'repeater', 
            required: false, 
            order: 7,
            subFields: [
              { name: 'roomName', label: 'Room Name (e.g. Master Bedroom)', type: 'text', required: true, order: 1 },
              { name: 'dimensions', label: 'Dimensions (e.g. 14\'0" x 12\'0")', type: 'text', required: true, order: 2 }
            ]
          }
        ]
      },
      {
        name: 'paymentPlans',
        label: 'Payment Plans / Milestones',
        type: 'repeater',
        required: true,
        order: 2,
        subFields: [
          { name: 'planName', label: 'Payment Plan Name (e.g. CLP)', type: 'text', required: true, order: 1 },
          {
            name: 'milestones',
            label: 'Milestones',
            type: 'repeater',
            required: false,
            order: 2,
            subFields: [
              { name: 'percentage', label: 'Percentage (%)', type: 'number', required: true, order: 1 },
              { name: 'description', label: 'Milestone Stage Description', type: 'text', required: true, order: 2 }
            ]
          }
        ]
      }
    ]
  },
  {
    stepNumber: 4,
    title: 'Amenities & Features',
    description: 'Select premium amenities provided in the project',
    fields: [
      { name: 'amenities', label: 'Project Amenities', type: 'checkbox_group', options: expandedAmenities, required: true, order: 1 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'IGBC Certified Green Building', 'Premium Specifications', 'High-Speed Elevators',
        'Smart Home Features', 'EV Charging Stations', 'Metro Connectivity',
        'Close to IT Hubs', 'Luxury Finishes', 'Award Winning Design'
      ], required: false, order: 2 }
    ]
  },
  {
    stepNumber: 5,
    title: 'Master Plan & Construction Specs',
    description: 'Add density, towers info, and detailed construction materials spec sheets',
    fields: [
      { name: 'projectDensity', label: 'Project Density (e.g. 63 units/acre)', type: 'text', placeholder: 'e.g. 63 units/acre', required: false, order: 1 },
      { name: 'densityType', label: 'Density Type', type: 'text', placeholder: 'e.g. Low-density & High-rise', required: false, order: 2 },
      { name: 'openAreaPercentage', label: 'Open Area (%)', type: 'number', placeholder: 'e.g. 65', required: false, order: 3 },
      {
        name: 'towers',
        label: 'Towers Config',
        type: 'repeater',
        required: false,
        order: 4,
        subFields: [
          { name: 'towerName', label: 'Tower Name', type: 'text', required: true, order: 1 },
          { name: 'configurations', label: 'Configurations (e.g. 2 & 3 BHK)', type: 'text', required: true, order: 2 },
          { name: 'phase', label: 'Phase', type: 'text', required: true, order: 3 },
          { name: 'floors', label: 'Total Floors', type: 'number', required: true, order: 4 },
          { name: 'completionDate', label: 'Completion Date', type: 'date', required: true, order: 5 }
        ]
      },
      { name: 'specFlooringMasterBedroom', label: 'Flooring Spec - Master Bedroom', type: 'text', placeholder: 'e.g. Laminated Wooden Flooring', required: false, order: 6 },
      { name: 'specFlooringLivingDining', label: 'Flooring Spec - Living / Dining', type: 'text', placeholder: 'e.g. Double Charged Vitrified Tiles', required: false, order: 7 },
      { name: 'specFlooringKitchen', label: 'Flooring Spec - Kitchen', type: 'text', placeholder: 'e.g. Anti-skid Vitrified Tiles', required: false, order: 8 },
      { name: 'specFlooringToilet', label: 'Flooring Spec - Toilets', type: 'text', placeholder: 'e.g. Anti-skid Ceramic Tiles', required: false, order: 9 },
      { name: 'specFlooringBalcony', label: 'Flooring Spec - Balcony', type: 'text', placeholder: 'e.g. Anti-skid Terrazzo/Ceramic Tiles', required: false, order: 10 },
      { name: 'specToiletFittings', label: 'Toilet fittings & Sanitary Specs', type: 'textarea', placeholder: 'e.g. Kohler/Jaguar Premium Fittings...', required: false, order: 11 },
      { name: 'specDoorsWindows', label: 'Doors & Windows Specs', type: 'textarea', placeholder: 'e.g. Teak wood main door, UPVC sliding windows...', required: false, order: 12 },
      { name: 'specElectrical', label: 'Electrical Wiring & Fittings Specs', type: 'textarea', placeholder: 'e.g. Copper wiring in concealed conduits, Havells switches...', required: false, order: 13 },
      { name: 'specStructural', label: 'Structural / Frame Specs', type: 'textarea', placeholder: 'e.g. Earthquake resistant RCC frame structure...', required: false, order: 14 },
      { name: 'specFinishing', label: 'Finishing & Paints Specs', type: 'textarea', placeholder: 'e.g. Acrylic emulsion interior, weather-proof exterior paint...', required: false, order: 15 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Media & Brochures',
    description: 'Add photos, videos, and project brochure',
    fields: [
      { name: 'propertyImages', label: 'Project Gallery (Photos)', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Project Walkthrough Videos', type: 'file', required: false, order: 2 },
      { name: 'brochure', label: 'Upload e-Brochure (PDF)', type: 'file', required: false, order: 3 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 4 }
    ]
  },
  {
    stepNumber: 7,
    title: 'Locality Pros/Cons & FAQs',
    description: 'Add reviews about the area, FAQs, and Builder insights',
    fields: [
      {
        name: 'localityPros',
        label: 'Locality Pros',
        type: 'repeater',
        required: false,
        order: 1,
        subFields: [
          { name: 'proText', label: 'Pro Point Description', type: 'text', required: true, order: 1 }
        ]
      },
      {
        name: 'localityCons',
        label: 'Locality Cons',
        type: 'repeater',
        required: false,
        order: 2,
        subFields: [
          { name: 'conText', label: 'Con Point Description', type: 'text', required: true, order: 1 }
        ]
      },
      {
        name: 'faqs',
        label: 'Project FAQs',
        type: 'repeater',
        required: false,
        order: 3,
        subFields: [
          { name: 'question', label: 'Question', type: 'text', required: true, order: 1 },
          { name: 'answer', label: 'Answer Description', type: 'textarea', required: true, order: 2 }
        ]
      },
      { name: 'bpd_possessionStatus', label: 'Builder Possession Status', type: 'pill', options: ['Ongoing', 'Ready To Move', 'New Launch'], required: false, order: 4 },
      { name: 'bpd_possessionYear', label: 'Possession Year', type: 'number', placeholder: 'e.g. 2026', required: false, order: 5 },
      { name: 'bpd_constructionQuality', label: 'Construction Quality Rating (1-5)', type: 'number', placeholder: 'e.g. 4.5', required: false, order: 6 },
      { name: 'bpd_aiSummary', label: 'AI Quality Summary', type: 'textarea', placeholder: 'e.g. High quality materials used with modern architectural standards...', required: false, order: 7 },
      { name: 'bpd_currentPricePerSqft', label: 'Current Price Per Sqft (₹)', type: 'number', placeholder: 'e.g. 6500', required: false, order: 8 },
      { name: 'bpd_appreciationLast3Years', label: 'Appreciation Last 3 Years (%)', type: 'number', placeholder: 'e.g. 15', required: false, order: 9 }
    ]
  }
];


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
      { name: 'contactNumber', label: 'Contact Number', type: 'text', placeholder: 'e.g. 9876543210', required: true, order: 5 },
      { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Indore', required: true, order: 6 },
      { name: 'locality', label: 'Locality / Sector', type: 'text', placeholder: 'e.g. Super Corridor', required: true, order: 7 },
      { name: 'fullAddress', label: 'Complete Project Address', type: 'textarea', placeholder: 'e.g. Plot No 12, Main Road...', required: true, order: 8 }
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
      { name: 'attachWashroom', label: 'Attached Washroom', type: 'pill', options: ['Yes', 'No'], required: true, order: 8 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Floor Plans & Payment Milestones',
    description: 'Add room sharing details and milestones details',
    fields: [
      { 
        name: 'floorPlans', 
        label: 'PG Room Configurations', 
        type: 'repeater', 
        required: true, 
        order: 1,
        subFields: [
          { name: 'configName', label: 'Configuration (e.g. Single Room, Double Sharing)', type: 'text', required: true, order: 1 },
          { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', required: false, order: 2 },
          { name: 'price', label: 'Monthly Rent (₹)', type: 'number', required: true, order: 3 },
          { name: 'floorPlanImage', label: 'Room Layout Image', type: 'file', required: false, order: 4 },
          {
            name: 'roomDimensions',
            label: 'Room Dimensions',
            type: 'repeater',
            required: false,
            order: 5,
            subFields: [
              { name: 'roomName', label: 'Room Name', type: 'text', required: true, order: 1 },
              { name: 'dimensions', label: 'Dimensions (e.g. 12\'0" x 10\'0")', type: 'text', required: true, order: 2 }
            ]
          }
        ]
      },
      {
        name: 'paymentPlans',
        label: 'Payment Plans / Milestones',
        type: 'repeater',
        required: true,
        order: 2,
        subFields: [
          { name: 'planName', label: 'Payment Plan Name', type: 'text', required: true, order: 1 },
          {
            name: 'milestones',
            label: 'Milestones',
            type: 'repeater',
            required: false,
            order: 2,
            subFields: [
              { name: 'percentage', label: 'Percentage (%)', type: 'number', required: true, order: 1 },
              { name: 'description', label: 'Milestone Stage Description', type: 'text', required: true, order: 2 }
            ]
          }
        ]
      }
    ]
  },
  {
    stepNumber: 4,
    title: 'Amenities & Features',
    description: 'Select amenities and features',
    fields: [
      { name: 'wifi', label: 'WiFi', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: true, order: 1 },
      { name: 'laundry', label: 'Laundry', type: 'pill', options: ['Included', 'Extra', 'Not Available'], required: false, order: 2 },
      { name: 'cleaning', label: 'Room Cleaning', type: 'pill', options: ['Daily', 'Weekly', 'Not Available'], required: false, order: 3 },
      { name: 'amenities', label: 'Amenities Available', type: 'checkbox_group', options: [
        'Wi-Fi', 'AC', 'Laundry', 'Housekeeping', 'Food', 'RO Water', 'CCTV', 'Geyser', 'Gym', 'Lift', 'Power Backup', 'Security', 'Parking', 'Fridge', 'TV'
      ], required: true, order: 4 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: [
        'Girls Only PG', 'Boys Only PG', 'Food Included', 'AC Rooms', 'Attached Washroom',
        'High-Speed WiFi', 'CCTV Surveillance', 'Gated Community', 'Near College/Office',
        'Housekeeping Included', 'Power Backup', 'Flexible Notice Period'
      ], required: false, order: 5 }
    ]
  },
  {
    stepNumber: 5,
    title: 'Master Plan & Construction Specs',
    description: 'PG Master Plan and Specifications',
    fields: [
      { name: 'projectDensity', label: 'Project Density (e.g. 60 units/acre)', type: 'text', required: false, order: 1 },
      { name: 'densityType', label: 'Density Type', type: 'text', required: false, order: 2 },
      { name: 'openAreaPercentage', label: 'Open Area (%)', type: 'number', required: false, order: 3 },
      {
        name: 'towers',
        label: 'Towers Info',
        type: 'repeater',
        required: false,
        order: 4,
        subFields: [
          { name: 'towerName', label: 'Tower Name', type: 'text', required: true, order: 1 },
          { name: 'configurations', label: 'Configurations', type: 'text', required: true, order: 2 },
          { name: 'phase', label: 'Phase', type: 'text', required: true, order: 3 },
          { name: 'floors', label: 'Total Floors', type: 'number', required: true, order: 4 },
          { name: 'completionDate', label: 'Completion Date', type: 'date', required: true, order: 5 }
        ]
      },
      { name: 'specFlooringMasterBedroom', label: 'Flooring Spec - Rooms', type: 'text', required: false, order: 6 },
      { name: 'specFlooringLivingDining', label: 'Flooring Spec - Lounge/Dining', type: 'text', required: false, order: 7 },
      { name: 'specFlooringKitchen', label: 'Flooring Spec - Kitchen/Pantry', type: 'text', required: false, order: 8 },
      { name: 'specFlooringToilet', label: 'Flooring Spec - Toilets', type: 'text', required: false, order: 9 },
      { name: 'specFlooringBalcony', label: 'Flooring Spec - Balcony', type: 'text', required: false, order: 10 },
      { name: 'specToiletFittings', label: 'Toilet fittings Specs', type: 'textarea', required: false, order: 11 },
      { name: 'specDoorsWindows', label: 'Doors & Windows Specs', type: 'textarea', required: false, order: 12 },
      { name: 'specElectrical', label: 'Electrical Wiring & Fittings Specs', type: 'textarea', required: false, order: 13 },
      { name: 'specStructural', label: 'Structural / Frame Specs', type: 'textarea', required: false, order: 14 },
      { name: 'specFinishing', label: 'Finishing & Paints Specs', type: 'textarea', required: false, order: 15 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Media & Brochures',
    description: 'Add photos, videos, and project brochure',
    fields: [
      { name: 'propertyImages', label: 'Project Gallery (Photos)', type: 'file', required: true, order: 1 },
      { name: 'propertyVideos', label: 'Project Walkthrough Videos', type: 'file', required: false, order: 2 },
      { name: 'brochure', label: 'Upload e-Brochure (PDF)', type: 'file', required: false, order: 3 },
      { name: 'nearbyPlaces', label: 'Nearby Landmarks & Distance', type: 'nearby_places', required: false, order: 4 }
    ]
  },
  {
    stepNumber: 7,
    title: 'Locality Pros/Cons & FAQs',
    description: 'Add reviews about the area, FAQs, and Builder insights',
    fields: [
      {
        name: 'localityPros',
        label: 'Locality Pros',
        type: 'repeater',
        required: false,
        order: 1,
        subFields: [
          { name: 'proText', label: 'Pro Point Description', type: 'text', required: true, order: 1 }
        ]
      },
      {
        name: 'localityCons',
        label: 'Locality Cons',
        type: 'repeater',
        required: false,
        order: 2,
        subFields: [
          { name: 'conText', label: 'Con Point Description', type: 'text', required: true, order: 1 }
        ]
      },
      {
        name: 'faqs',
        label: 'Project FAQs',
        type: 'repeater',
        required: false,
        order: 3,
        subFields: [
          { name: 'question', label: 'Question', type: 'text', required: true, order: 1 },
          { name: 'answer', label: 'Answer Description', type: 'textarea', required: true, order: 2 }
        ]
      },
      { name: 'bpd_possessionStatus', label: 'Builder Possession Status', type: 'pill', options: ['Ongoing', 'Ready To Move', 'New Launch'], required: false, order: 4 },
      { name: 'bpd_possessionYear', label: 'Possession Year', type: 'number', placeholder: 'e.g. 2026', required: false, order: 5 },
      { name: 'bpd_constructionQuality', label: 'Construction Quality Rating (1-5)', type: 'number', placeholder: 'e.g. 4.5', required: false, order: 6 },
      { name: 'bpd_aiSummary', label: 'AI Quality Summary', type: 'textarea', placeholder: 'e.g. High quality materials used with modern architectural standards...', required: false, order: 7 },
      { name: 'bpd_currentPricePerSqft', label: 'Current Price Per Sqft (₹)', type: 'number', placeholder: 'e.g. 6500', required: false, order: 8 },
      { name: 'bpd_appreciationLast3Years', label: 'Appreciation Last 3 Years (%)', type: 'number', placeholder: 'e.g. 15', required: false, order: 9 }
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
      templates.push({ transactionType: txn, category: 'Residential', propertyType: type, steps: createBuilderSteps(isRent, 'Residential', type) });
    });
    // Plot / Land
    templates.push({ transactionType: txn, category: 'Residential', propertyType: 'Plot / Land', steps: createBuilderSteps(isRent, 'Residential', 'Plot / Land') });

    commercialSubtypes.forEach(({ cat, sub }) => {
      templates.push({ transactionType: txn, category: 'Commercial', propertyType: sub, steps: createBuilderSteps(isRent, 'Commercial', sub) });
    });

    templates.push({
      transactionType: txn,
      category: 'Commercial',
      propertyType: 'Other',
      steps: createBuilderSteps(isRent, 'Commercial', 'Other')
    });
  });

  // 2. Paying Guest
  const pgTypes = ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment'];
  pgTypes.forEach(type => {
    templates.push({ transactionType: 'Paying Guest', category: 'Residential', propertyType: type, steps: createBuilderPGSteps() });
  });

  return templates;
};

// Auto-seed function helper
export const ensureSeeded = async () => {
  const count = await BuilderFormTemplate.countDocuments();
  if (count === 0) {
    console.log("No builder templates found. Auto-seeding builder forms...");
    const allTemplates = generateAllTemplates();
    await BuilderFormTemplate.create(allTemplates);
    console.log("Auto-seeding builder forms completed successfully.");
  }
};

// Get a specific template based on transaction, category, and property type
export const getBuilderTemplate = async (req, res) => {
    try {
        let { transactionType, category, propertyType } = req.query;

        if (!transactionType || !category || !propertyType) {
            return res.status(400).json({ success: false, message: "Missing required query parameters: transactionType, category, propertyType" });
        }

        await ensureSeeded();

        const template = await BuilderFormTemplate.findOne({ 
            transactionType, 
            category, 
            propertyType,
            isActive: true 
        });

        if (!template) {
            return res.status(404).json({ success: false, message: "No builder form template found for this configuration." });
        }

        res.status(200).json({ success: true, template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Create or Update a builder template
export const saveBuilderTemplate = async (req, res) => {
    try {
        const { transactionType, category, propertyType, steps } = req.body;

        if (!transactionType || !category || !propertyType || !steps) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const template = await BuilderFormTemplate.findOneAndUpdate(
            { transactionType, category, propertyType },
            { steps },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, template, message: "Builder template saved successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all unique combinations to show in Step 1
export const getAvailableBuilderConfigurations = async (req, res) => {
    try {
        await ensureSeeded();

        const configs = await BuilderFormTemplate.aggregate([
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

export const seedBuilderTemplatesController = async (req, res) => {
    try {
        console.log("Seeding builder forms via API controller...");
        await BuilderFormTemplate.deleteMany({});
        const allTemplates = generateAllTemplates();
        await BuilderFormTemplate.create(allTemplates);
        res.status(200).json({ success: true, message: "Seeding builder forms completed successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
