// config/builderProjectSteps.js
//
// Canonical 15-step "Builder Property Listing" wizard.
//
// These step definitions are seeded into the BuilderFormTemplate collection and
// rendered generically by frontend/src/pages/user/DynamicFormEngine.jsx. The step
// skeleton (the 15 titles, in order) is identical for every property type so the
// stepper reads the same everywhere; only the *fields* inside steps 3, 4 and 6
// adapt to plots / commercial / residential.
//
// Supported field `type` values (all implemented in DynamicFormEngine):
//   text | number | textarea | date | dropdown | pill | multiselect_pill |
//   checkbox_group | file | single_file | slider | progress_group |
//   nearby_places | repeater | review

export const AMENITY_OPTIONS = [
  'Swimming Pool', 'Club House', 'Gym', 'Power Backup', "Children's Play Area",
  'Landscaped Garden', 'Indoor Games', 'Jogging Track', '24x7 Security',
  'CCTV Surveillance', 'Rain Water Harvesting', 'Car Parking', 'Visitor Parking',
  'Fire Fighting System', 'Intercom', 'Multipurpose Hall', 'EV Charging Point',
  'Vaastu Compliant', 'Lift(s)', 'Sewage Treatment Plant', 'Amphitheatre',
  'Tennis Court', 'Badminton Court', 'Basketball Court', 'Yoga / Meditation Area'
];

export const HIGHLIGHT_OPTIONS = [
  'IGBC Certified Green Building', 'Premium Specifications', 'High-Speed Elevators',
  'Smart Home Features', 'EV Charging Stations', 'Metro Connectivity',
  'Close to IT Hubs', 'Luxury Finishes', 'Award Winning Design', 'Gated Community'
];

export const CONSTRUCTION_STAGES = [
  'Foundation', 'Structure', 'Brick Work', 'Plastering', 'Flooring', 'Painting'
];

const AREA_UNITS = ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'];

// --- property-type helpers -------------------------------------------------

const typeFlags = (category, propertyType = '') => {
  const t = propertyType.toLowerCase();
  return {
    isPlot: t.includes('plot') || t.includes('land'),
    isCommercial: category === 'Commercial',
    isOffice: t.includes('office') || t.includes('co-working'),
    isRetail: t.includes('shop') || t.includes('showroom'),
    isStorage: t.includes('ware') || t.includes('storage')
  };
};

// STEP 3 — Project Summary (scale of the project)
const projectSummaryFields = (category, propertyType) => {
  const { isPlot } = typeFlags(category, propertyType);

  const common = [
    { name: 'totalLandArea', label: 'Total Land Area (Acres)', type: 'number', placeholder: 'e.g. 5.20', required: true, order: 1 },
    { name: 'launchDate', label: 'Launch Date', type: 'date', required: false, order: 8 },
    { name: 'possessionDate', label: 'Possession Date', type: 'date', required: false, order: 9 }
  ];

  if (isPlot) {
    return [
      ...common,
      { name: 'totalUnits', label: 'Total Plots in Project', type: 'number', placeholder: 'e.g. 250', required: true, order: 2 },
      { name: 'totalPhases', label: 'Total Phases', type: 'number', placeholder: 'e.g. 3', required: false, order: 3 },
      { name: 'openSpacePercentage', label: 'Open Space (%)', type: 'number', placeholder: 'e.g. 40', required: false, order: 4 },
      { name: 'roadWidth', label: 'Internal Road Width (ft)', type: 'number', placeholder: 'e.g. 40', required: false, order: 5 },
      { name: 'approvalAuthority', label: 'Approval Authority', type: 'text', placeholder: 'e.g. HMDA, DTCP', required: false, order: 6 },
      { name: 'clubHouseSize', label: 'Club House Size (sq.ft)', type: 'number', placeholder: 'e.g. 5000', required: false, order: 7 }
    ];
  }

  return [
    ...common,
    { name: 'totalTowers', label: 'Total Towers / Blocks', type: 'number', placeholder: 'e.g. 5', required: true, order: 2 },
    { name: 'totalFloors', label: 'Floors per Tower', type: 'number', placeholder: 'e.g. 14', required: true, order: 3 },
    { name: 'totalUnits', label: 'Total Units', type: 'number', placeholder: 'e.g. 550', required: true, order: 4 },
    { name: 'openSpacePercentage', label: 'Open Space (%)', type: 'number', placeholder: 'e.g. 80', required: false, order: 5 },
    { name: 'clubHouseSize', label: 'Club House Size (sq.ft)', type: 'number', placeholder: 'e.g. 25000', required: false, order: 6 },
    { name: 'projectDensity', label: 'Project Density', type: 'text', placeholder: 'e.g. 63 units/acre', required: false, order: 7 }
  ];
};

// STEP 4 — Unit Details & Pricing
const unitPricingFields = (category, propertyType) => {
  const { isPlot, isCommercial } = typeFlags(category, propertyType);

  const positionRepeater = {
    name: 'positionFacingRates',
    label: 'Position / Facing Rate (Optional)',
    type: 'repeater',
    required: false,
    order: 2,
    subFields: [
      { name: 'position', label: 'Position / Facing', type: 'dropdown', options: ['East Facing', 'West Facing', 'North Facing', 'South Facing', 'North-East', 'North-West', 'South-East', 'South-West', 'Corner', 'Park Facing', 'Road Facing'], required: true, order: 1 },
      { name: 'additionalRate', label: 'Additional Rate (₹/sq.ft)', type: 'number', placeholder: 'e.g. 150', required: true, order: 2 }
    ]
  };

  if (isPlot) {
    return [
      {
        name: 'unitConfigurations',
        label: 'Plot Configuration & Pricing',
        type: 'repeater',
        required: true,
        order: 1,
        subFields: [
          { name: 'unitType', label: 'Plot Size (e.g. 200 sq.yards)', type: 'text', placeholder: 'e.g. 200 sq.yards', required: true, order: 1 },
          { name: 'carpetArea', label: 'Plot Area', type: 'number', placeholder: 'e.g. 1800', required: true, order: 2 },
          { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.yards', 'sq.ft.', 'sq.m.', 'acres'], required: true, order: 3 },
          { name: 'price', label: 'Price (₹)', type: 'number', placeholder: 'e.g. 4500000', required: true, order: 4 },
          { name: 'pricePerSqft', label: 'Rate (₹ per unit area)', type: 'number', placeholder: 'e.g. 2500', required: false, order: 5 },
          { name: 'availableUnits', label: 'Available Plots', type: 'number', placeholder: 'e.g. 40', required: true, order: 6 }
        ]
      },
      positionRepeater
    ];
  }

  return [
    {
      name: 'unitConfigurations',
      label: 'Unit Configuration & Pricing',
      type: 'repeater',
      required: true,
      order: 1,
      subFields: [
        {
          name: 'unitType',
          label: isCommercial ? 'Unit Type (e.g. Suite, Shop)' : 'Unit Type (e.g. 2 BHK)',
          type: 'text',
          placeholder: isCommercial ? 'e.g. Office Suite A' : 'e.g. 3 BHK',
          required: true,
          order: 1
        },
        { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', placeholder: 'e.g. 1650', required: true, order: 2 },
        { name: 'superArea', label: 'Super Built-up Area (sq.ft)', type: 'number', placeholder: 'e.g. 2100', required: false, order: 3 },
        { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: AREA_UNITS, required: false, order: 4 },
        { name: 'price', label: 'Price (₹)', type: 'number', placeholder: 'e.g. 12500000', required: true, order: 5 },
        { name: 'pricePerSqft', label: 'Rate (₹/sq.ft)', type: 'number', placeholder: 'e.g. 6500', required: false, order: 6 },
        { name: 'availableUnits', label: 'Available Units', type: 'number', placeholder: 'e.g. 48', required: true, order: 7 },
        { name: 'facing', label: 'Facing', type: 'dropdown', options: ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'], required: false, order: 8 }
      ]
    },
    positionRepeater
  ];
};

// STEP 6 — Specifications
const specificationFields = (category, propertyType) => {
  const { isPlot } = typeFlags(category, propertyType);

  if (isPlot) {
    return [
      { name: 'specBoundaryWall', label: 'Boundary Wall', type: 'dropdown', options: ['Compound Wall - Full', 'Compound Wall - Partial', 'Fencing', 'Not Available'], required: false, order: 1 },
      { name: 'specInternalRoads', label: 'Internal Roads', type: 'text', placeholder: 'e.g. 40 ft BT Roads', required: false, order: 2 },
      { name: 'specWaterSupply', label: 'Water Supply', type: 'dropdown', options: ['Corporation', 'Borewell', 'Both', 'Not Available'], required: false, order: 3 },
      { name: 'specElectrical', label: 'Electrical Infrastructure', type: 'text', placeholder: 'e.g. Underground electrical cabling', required: false, order: 4 },
      { name: 'specDrainage', label: 'Drainage / Sewerage', type: 'text', placeholder: 'e.g. Underground drainage system', required: false, order: 5 },
      { name: 'specStreetLighting', label: 'Street Lighting', type: 'dropdown', options: ['Available', 'Not Available'], required: false, order: 6 },
      { name: 'specLandscaping', label: 'Landscaping / Avenue Plantation', type: 'text', placeholder: 'e.g. Avenue plantation on all roads', required: false, order: 7 }
    ];
  }

  return [
    { name: 'specStructure', label: 'Structure', type: 'dropdown', options: ['RCC Framed Structure', 'Load Bearing Structure', 'Steel Framed Structure', 'Pre-Cast Structure'], required: false, order: 1 },
    { name: 'specWalls', label: 'Walls', type: 'dropdown', options: ['Red Brick', 'AAC Blocks', 'Fly Ash Bricks', 'Solid Concrete Blocks'], required: false, order: 2 },
    { name: 'specFlooring', label: 'Flooring', type: 'dropdown', options: ['Vitrified Tiles', 'Double Charged Vitrified Tiles', 'Italian Marble', 'Granite', 'Laminated Wooden Flooring', 'Ceramic Tiles'], required: false, order: 3 },
    { name: 'specKitchen', label: 'Kitchen', type: 'dropdown', options: ['Modular Kitchen', 'Granite Platform with SS Sink', 'Semi-Modular Kitchen', 'Bare Kitchen'], required: false, order: 4 },
    { name: 'specDoors', label: 'Doors', type: 'dropdown', options: ['Teak Wood Frame', 'Engineered Wood', 'Flush Doors', 'UPVC Doors'], required: false, order: 5 },
    { name: 'specWindows', label: 'Windows', type: 'dropdown', options: ['UPVC', 'Aluminium', 'Wooden', 'Powder Coated Aluminium'], required: false, order: 6 },
    { name: 'specPaint', label: 'Paint', type: 'dropdown', options: ['Acrylic Emulsion', 'Plastic Emulsion', 'Oil Bound Distemper', 'Luxury Emulsion'], required: false, order: 7 },
    { name: 'specElectrical', label: 'Electrical', type: 'dropdown', options: ['Concealed Copper Wiring', 'Concealed Copper Wiring with Modular Switches', 'Surface Wiring'], required: false, order: 8 },
    { name: 'specWaterSupply', label: 'Water Supply', type: 'dropdown', options: ['Corporation', 'Borewell', 'Both', 'Corporation + Borewell + STP Water'], required: false, order: 9 },
    { name: 'specToiletFittings', label: 'Toilet & Sanitary Fittings', type: 'textarea', placeholder: 'e.g. Kohler / Jaquar premium CP fittings, wall-hung EWC...', required: false, order: 10 }
  ];
};

// --- the 15 steps ----------------------------------------------------------

export const createBuilderSteps = (category = 'Residential', propertyType = 'Apartment') => [
  {
    stepNumber: 1,
    title: 'Project Information',
    description: 'Basic details about your project',
    fields: [
      { name: 'propertyName', label: 'Project Name', type: 'text', placeholder: 'e.g. Sujay Global Elara', required: true, order: 1 },
      { name: 'builderName', label: 'Builder / Developer Name', type: 'text', placeholder: 'e.g. Sujay Constructions', required: true, order: 2 },
      { name: 'projectStatus', label: 'Project Status', type: 'pill', options: ['Pre Launch', 'New Launch', 'Under Construction', 'Ready To Move', 'Completed'], required: true, order: 3 },
      { name: 'reraNumber', label: 'RERA Registration Number', type: 'text', placeholder: 'e.g. P02400008905', required: true, order: 4 },
      { name: 'possessionDate', label: 'Possession Date', type: 'date', required: false, order: 5 },
      { name: 'description', label: 'Project Description', type: 'textarea', placeholder: 'Describe the project vision, lifestyle and unique selling points...', required: true, order: 6, validation: { minLength: 100, maxLength: 5000, customErrorMessage: 'Project description must be between 100 and 5000 characters' } },
      { name: 'coverImage', label: 'Project Cover Image', type: 'single_file', required: false, order: 7 }
    ]
  },
  {
    stepNumber: 2,
    title: 'Location Details',
    description: 'Where is your project located?',
    showLocationSelector: true,
    fields: [
      { name: 'landmark', label: 'Landmark', type: 'text', placeholder: 'e.g. Near Nallagandla Tellapur Road', required: false, order: 1 },
      { name: 'pincode', label: 'Pincode', type: 'text', placeholder: 'e.g. 500019', required: true, order: 2 },
      { name: 'latitude', label: 'Latitude', type: 'text', placeholder: 'e.g. 17.5024', required: false, order: 3 },
      { name: 'longitude', label: 'Longitude', type: 'text', placeholder: 'e.g. 78.3067', required: false, order: 4 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Project Summary',
    description: 'Scale and timeline of the project',
    fields: projectSummaryFields(category, propertyType)
  },
  {
    stepNumber: 4,
    title: 'Unit Details & Pricing',
    description: 'Add every configuration you are selling',
    fields: unitPricingFields(category, propertyType)
  },
  {
    stepNumber: 5,
    title: 'Amenities',
    description: 'Select the amenities available in this project',
    fields: [
      { name: 'amenities', label: 'Select Amenities', type: 'checkbox_group', options: AMENITY_OPTIONS, required: true, order: 1 },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: HIGHLIGHT_OPTIONS, required: false, order: 2 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Specifications',
    description: 'Construction specifications',
    fields: specificationFields(category, propertyType)
  },
  {
    stepNumber: 7,
    title: 'Images & Gallery',
    description: 'Upload project photos',
    fields: [
      { name: 'propertyImages', label: 'Gallery Images', type: 'file', required: true, order: 1 },
      { name: 'constructionImages', label: 'Construction Images', type: 'file', required: false, order: 2 },
      { name: 'propertyVideos', label: 'Walkthrough Videos', type: 'file', required: false, order: 3 }
    ]
  },
  {
    stepNumber: 8,
    title: 'Floor Plans',
    description: 'Upload a layout for each configuration',
    fields: [
      {
        name: 'floorPlans',
        label: 'Floor Plans',
        type: 'repeater',
        required: false,
        order: 1,
        subFields: [
          { name: 'configName', label: 'Configuration (e.g. 2 BHK)', type: 'text', required: true, order: 1 },
          { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', required: false, order: 2 },
          { name: 'superArea', label: 'Super Built-up Area (sq.ft)', type: 'number', required: false, order: 3 },
          { name: 'price', label: 'Starting Price (₹)', type: 'number', required: false, order: 4 },
          { name: 'floorPlanImage', label: 'Floor Plan Image', type: 'file', required: false, order: 5 },
          {
            name: 'roomDimensions',
            label: 'Room Dimensions',
            type: 'repeater',
            required: false,
            order: 6,
            subFields: [
              { name: 'roomName', label: 'Room Name', type: 'text', required: true, order: 1 },
              { name: 'dimensions', label: 'Dimensions', type: 'text', required: true, order: 2 }
            ]
          }
        ]
      }
    ]
  },
  {
    stepNumber: 9,
    title: 'Documents',
    description: 'Upload approvals and project documents',
    fields: [
      { name: 'docReraCertificate', label: 'RERA Certificate', type: 'single_file', required: false, order: 1 },
      { name: 'docApprovalLetter', label: 'Approval Letter', type: 'single_file', required: false, order: 2 },
      { name: 'docBrochure', label: 'e-Brochure', type: 'single_file', required: false, order: 3 },
      { name: 'docMasterPlan', label: 'Master Plan', type: 'single_file', required: false, order: 4 },
      { name: 'docPriceSheet', label: 'Price Sheet', type: 'single_file', required: false, order: 5 },
      { name: 'docOther', label: 'Other Document', type: 'single_file', required: false, order: 6 }
    ]
  },
  {
    stepNumber: 10,
    title: 'Construction Status',
    description: 'Current construction progress',
    fields: [
      { name: 'currentConstructionStatus', label: 'Current Status', type: 'pill', options: ['Not Started', 'Under Construction', 'Finishing Stage', 'Completed'], required: true, order: 1 },
      { name: 'completionPercentage', label: 'Completion (%)', type: 'slider', required: false, order: 2 },
      { name: 'expectedPossession', label: 'Expected Possession', type: 'date', required: false, order: 3 },
      { name: 'constructionProgress', label: 'Construction Progress', type: 'progress_group', options: CONSTRUCTION_STAGES, required: false, order: 4 }
    ]
  },
  {
    stepNumber: 11,
    title: 'Location Advantages',
    description: 'Nearby landmarks and their distances',
    fields: [
      { name: 'nearbyPlaces', label: 'Nearby Places', type: 'nearby_places', required: true, order: 1 }
    ]
  },
  {
    stepNumber: 12,
    title: 'Builder Profile',
    description: 'About the developer',
    fields: [
      { name: 'builderCompanyName', label: 'Company Name', type: 'text', placeholder: 'e.g. Sujay Constructions', required: true, order: 1 },
      { name: 'builderEstablishedYear', label: 'Established Year', type: 'number', placeholder: 'e.g. 2010', required: false, order: 2 },
      { name: 'builderCompanyType', label: 'Company Type', type: 'dropdown', options: ['Private Limited', 'Public Limited', 'Partnership', 'LLP', 'Proprietorship'], required: false, order: 3 },
      { name: 'builderTotalProjects', label: 'Total Projects Delivered', type: 'number', placeholder: 'e.g. 18', required: false, order: 4 },
      { name: 'builderLogo', label: 'Company Logo', type: 'single_file', required: false, order: 5 },
      { name: 'builderOfficeAddress', label: 'Office Address', type: 'textarea', placeholder: 'e.g. Nallagandla, Hyderabad, Telangana 500019', required: false, order: 6 },
      { name: 'builderWorkingHours', label: 'Working Hours', type: 'text', placeholder: 'e.g. 10:00 AM - 7:00 PM', required: false, order: 7 },
      { name: 'builderAbout', label: 'About the Builder', type: 'textarea', placeholder: 'e.g. Sujay Constructions is a trusted real estate brand with 14+ years of experience...', required: false, order: 8 }
    ]
  },
  {
    stepNumber: 13,
    title: 'Contact Details',
    description: 'How buyers reach you',
    fields: [
      { name: 'contactPerson', label: 'Contact Person', type: 'text', placeholder: 'e.g. Ramesh Kumar', required: true, order: 1 },
      { name: 'contactNumber', label: 'Mobile Number', type: 'text', placeholder: 'e.g. 9876543210', required: true, order: 2 },
      { name: 'contactAltNumber', label: 'Alternate Number', type: 'text', placeholder: 'e.g. 9876543211', required: false, order: 3 },
      { name: 'contactEmail', label: 'Email Address', type: 'text', placeholder: 'e.g. sales@sujayconstructions.com', required: false, order: 4 },
      { name: 'contactOfficeAddress', label: 'Office Address', type: 'textarea', placeholder: 'e.g. Sujay Constructions, Nallagandla, Hyderabad', required: false, order: 5 },
      { name: 'contactWebsite', label: 'Website', type: 'text', placeholder: 'e.g. https://sujayconstructions.com', required: false, order: 6 },
      { name: 'socialFacebook', label: 'Facebook URL', type: 'text', placeholder: 'https://facebook.com/...', required: false, order: 7 },
      { name: 'socialInstagram', label: 'Instagram URL', type: 'text', placeholder: 'https://instagram.com/...', required: false, order: 8 },
      { name: 'socialLinkedin', label: 'LinkedIn URL', type: 'text', placeholder: 'https://linkedin.com/...', required: false, order: 9 },
      { name: 'socialYoutube', label: 'YouTube URL', type: 'text', placeholder: 'https://youtube.com/...', required: false, order: 10 }
    ]
  },
  {
    stepNumber: 14,
    title: 'SEO Details',
    description: 'SEO & marketing information',
    fields: [
      { name: 'seoTitle', label: 'SEO Title', type: 'text', placeholder: 'e.g. Sujay Global Elara - 2, 3 & 4 BHK Apartments in Nallagandla', required: false, order: 1, validation: { maxLength: 70, customErrorMessage: 'SEO title should be 70 characters or fewer' } },
      { name: 'seoDescription', label: 'SEO Description', type: 'textarea', placeholder: 'e.g. Buy premium 2, 3 & 4 BHK apartments at Sujay Global Elara, Nallagandla, Hyderabad...', required: false, order: 2, validation: { maxLength: 160, customErrorMessage: 'SEO description should be 160 characters or fewer' } },
      { name: 'seoKeywords', label: 'SEO Keywords', type: 'multiselect_pill', options: ['apartments in hyderabad', 'flats in nallagandla', '3 bhk apartments', 'new projects hyderabad', 'ready to move flats'], required: false, order: 3 },
      { name: 'seoSlug', label: 'URL Slug', type: 'text', placeholder: 'e.g. sujay-global-elara-nallagandla-hyderabad', required: false, order: 4, validation: { maxLength: 120 } }
    ]
  },
  {
    stepNumber: 15,
    title: 'Review & Submit',
    description: 'Review your project details before submitting',
    fields: [
      { name: 'finalReview', label: 'Project Summary', type: 'review', required: false, order: 1 }
    ]
  }
];

export const BUILDER_STEP_TITLES = createBuilderSteps().map(s => s.title);
