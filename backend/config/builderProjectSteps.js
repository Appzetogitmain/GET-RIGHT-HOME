// config/builderProjectSteps.js
//
// Canonical 15-step "Builder Property Listing" wizard.
//
// The 15-step shell is FIXED; the fields inside each step are DYNAMIC.
//
// Step 1 collects the three master selections that drive the whole wizard:
//   transactionType  -> Sell / Rent / Lease   (sale price vs rent + deposit model)
//   propertyType     -> Apartment / Villa / Plot / Land / Commercial
//   projectStatus    -> Pre Launch ... Completed
//
// Every downstream field that is specific to one of those selections carries a
// `dependsOn`, so a single template serves every combination and the form
// re-shapes itself the moment a master selection changes. This is why the
// template is no longer generated per property type.
//
// `dependsOn` forms understood by DynamicFormEngine:
//   { field, value: 'X' }        -> exact match
//   { field, value: ['X','Y'] }  -> OR over that field
//   [ cond, cond ]               -> AND across conditions
//
// NOTE: repeater subField `dependsOn` is evaluated against the *row*, not the
// form, so anything that branches on a master selection must be a top-level
// field (hence the separate villa/plot/commercial/rental inventory repeaters).
//
// Supported field `type` values (all implemented in DynamicFormEngine):
//   text | number | textarea | date | dropdown | pill | multiselect_pill |
//   checkbox_group | file | single_file | slider | progress_group |
//   nearby_places | repeater | review

// --- master selection vocabularies ----------------------------------------

// 'Sell' (not 'Sale') to stay consistent with the transactionType vocabulary
// the rest of the app already filters and searches on.
export const TRANSACTION_TYPES = ['Sell', 'Rent', 'Lease'];
export const BUILDER_PROPERTY_TYPES = ['Apartment', 'Villa', 'Plot', 'Land', 'Commercial'];
export const PROJECT_STATUSES = ['Pre Launch', 'New Launch', 'Under Construction', 'Ready To Move', 'Completed'];
export const RERA_STATUSES = ['Registered', 'Applied', 'Not Registered', 'Not Applicable / Exempt'];

// property-type groupings
const APARTMENT = ['Apartment'];
const VILLA = ['Villa'];
const PLOT = ['Plot', 'Land'];
const COMMERCIAL = ['Commercial'];
// everything that is actually built (i.e. has construction + specifications)
const BUILT = ['Apartment', 'Villa', 'Commercial'];

// transaction groupings
const SALE = ['Sell'];
const RENTAL = ['Rent', 'Lease'];

// dependsOn helpers
const onType = (value) => ({ field: 'propertyType', value });
const onTxn = (value) => ({ field: 'transactionType', value });
const onStatus = (value) => ({ field: 'projectStatus', value });
const onRera = (value) => ({ field: 'reraStatus', value });

export const CONSTRUCTION_STAGES = [
  'Foundation', 'Structure', 'Brick Work', 'Plastering', 'Electrical', 'Plumbing', 'Flooring', 'Painting', 'Finishing'
];

const AREA_UNITS = ['sq.ft.', 'sq.yards', 'sq.m.', 'acres'];
const FACING_OPTIONS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];
const UNIT_STATUS = ['Available', 'Hold', 'Sold', 'Blocked'];

// --- STEP 5 amenity catalogs (per property type) ---------------------------

export const AMENITIES_APARTMENT = [
  'Swimming Pool', 'Club House', 'Gym', 'Indoor Games', 'Jogging Track', 'CCTV Surveillance',
  '24x7 Security', 'Fire Fighting System', 'Lift(s)', 'Car Parking', 'Visitor Parking',
  'EV Charging Point', "Children's Play Area", 'Landscaped Garden', 'Power Backup', 'Intercom',
  'Multipurpose Hall', 'Rain Water Harvesting', 'Sewage Treatment Plant', 'Amphitheatre',
  'Tennis Court', 'Badminton Court', 'Basketball Court', 'Yoga / Meditation Area', 'Vaastu Compliant'
];

export const AMENITIES_VILLA = [
  'Private Garden', 'Private Pool', 'Private Terrace', 'Club House', 'Gym', "Children's Play Area",
  '24x7 Security', 'CCTV Surveillance', 'Car Parking', 'EV Charging Point', 'Landscaped Garden',
  'Jogging Track', 'Power Backup', 'Rain Water Harvesting', 'Gated Community', 'Vaastu Compliant'
];

export const AMENITIES_PLOT = [
  'Blacktop / BT Roads', 'Underground Drainage', 'Water Supply', 'Electricity Connection',
  'Street Lights', 'Parks / Open Spaces', '24x7 Security', 'Compound / Boundary Wall',
  'Club House', 'Avenue Plantation', 'Rain Water Harvesting', 'Vaastu Compliant'
];

export const AMENITIES_COMMERCIAL = [
  'Power Backup', 'Fire Safety System', 'High-Speed Lifts', 'Car Parking', 'Visitor Parking',
  'Central HVAC', 'Loading / Unloading Bay', 'Service Lift', '24x7 Security', 'CCTV Surveillance',
  'Food Court / Cafeteria', 'Conference Facility', 'EV Charging Point', 'DG Backup'
];

export const HIGHLIGHT_OPTIONS = [
  'IGBC Certified Green Building', 'Premium Specifications', 'High-Speed Elevators',
  'Smart Home Features', 'EV Charging Stations', 'Metro Connectivity',
  'Close to IT Hubs', 'Luxury Finishes', 'Award Winning Design', 'Gated Community'
];

// Kept as the union so any older consumer importing AMENITY_OPTIONS still works.
export const AMENITY_OPTIONS = [...new Set([
  ...AMENITIES_APARTMENT, ...AMENITIES_VILLA, ...AMENITIES_PLOT, ...AMENITIES_COMMERCIAL
])];

// --- STEP 3 — Project Summary ---------------------------------------------

const projectSummaryFields = () => [
  {
    name: 'totalLandArea',
    label: 'Total Land Area (Acres)',
    type: 'number',
    placeholder: 'e.g. 5.20',
    required: true,
    order: 1
  },

  // ---- Apartment: towers / blocks
  {
    name: 'towers',
    label: 'Towers / Blocks',
    type: 'repeater',
    required: true,
    order: 2,
    dependsOn: onType(APARTMENT),
    subFields: [
      { name: 'towerName', label: 'Tower Name', type: 'text', placeholder: 'e.g. Tower A', required: true, order: 1 },
      { name: 'numberOfFloors', label: 'Number of Floors', type: 'number', placeholder: 'e.g. 14', required: true, order: 2 },
      { name: 'totalUnits', label: 'Total Units', type: 'number', placeholder: 'e.g. 110', required: true, order: 3 }
    ]
  },
  { name: 'clubHouseSize', label: 'Club House Area (sq.ft)', type: 'number', placeholder: 'e.g. 25000', required: false, order: 3, dependsOn: onType(APARTMENT) },
  { name: 'projectDensity', label: 'Project Density', type: 'text', placeholder: 'e.g. 63 units/acre', required: false, order: 4, dependsOn: onType(APARTMENT) },

  // ---- Villa: phases / villa count / villa types
  { name: 'totalPhases', label: 'Number of Phases', type: 'number', placeholder: 'e.g. 2', required: false, order: 2, dependsOn: onType(VILLA) },
  { name: 'totalVillas', label: 'Number of Villas', type: 'number', placeholder: 'e.g. 120', required: true, order: 3, dependsOn: onType(VILLA) },
  { name: 'villaTypes', label: 'Villa Types', type: 'multiselect_pill', options: ['2 BHK', '3 BHK', '4 BHK', '5 BHK'], required: false, order: 4, dependsOn: onType(VILLA) },
  { name: 'communityArea', label: 'Community Area (sq.ft)', type: 'number', placeholder: 'e.g. 15000', required: false, order: 5, dependsOn: onType(VILLA) },

  // ---- Plot / Land: layout / plots / roads
  { name: 'totalLayoutArea', label: 'Total Layout Area (Acres)', type: 'number', placeholder: 'e.g. 12.50', required: false, order: 2, dependsOn: onType(PLOT) },
  { name: 'plotPhases', label: 'Number of Phases', type: 'number', placeholder: 'e.g. 3', required: false, order: 3, dependsOn: onType(PLOT) },
  { name: 'totalPlots', label: 'Total Plots in Project', type: 'number', placeholder: 'e.g. 250', required: true, order: 4, dependsOn: onType(PLOT) },
  { name: 'developmentArea', label: 'Developed Area (Acres)', type: 'number', placeholder: 'e.g. 9.00', required: false, order: 5, dependsOn: onType(PLOT) },
  { name: 'roadNetwork', label: 'Road Network', type: 'text', placeholder: 'e.g. 40 ft & 30 ft BT roads', required: false, order: 6, dependsOn: onType(PLOT) },
  { name: 'approvalAuthority', label: 'Approval Authority', type: 'text', placeholder: 'e.g. HMDA, DTCP', required: false, order: 7, dependsOn: onType(PLOT) },

  // ---- Commercial: buildings / floors / units
  { name: 'totalBuildings', label: 'Buildings / Blocks', type: 'number', placeholder: 'e.g. 2', required: false, order: 2, dependsOn: onType(COMMERCIAL) },
  { name: 'totalFloors', label: 'Number of Floors', type: 'number', placeholder: 'e.g. 12', required: false, order: 3, dependsOn: onType(COMMERCIAL) },
  { name: 'totalCommercialUnits', label: 'Total Commercial Units', type: 'number', placeholder: 'e.g. 180', required: true, order: 4, dependsOn: onType(COMMERCIAL) },
  { name: 'parkingDetails', label: 'Parking', type: 'text', placeholder: 'e.g. 3 basement levels, 600 cars', required: false, order: 5, dependsOn: onType(COMMERCIAL) },

  // ---- shared tail
  { name: 'commonArea', label: 'Common Area (sq.ft)', type: 'number', placeholder: 'e.g. 8000', required: false, order: 6, dependsOn: onType([...PLOT, ...COMMERCIAL]) },
  { name: 'openSpacePercentage', label: 'Open Space (%)', type: 'number', placeholder: 'e.g. 70', required: false, order: 7 },
  { name: 'launchDate', label: 'Launch Date', type: 'date', required: false, order: 8 },
  { name: 'possessionDate', label: 'Possession Date', type: 'date', required: false, order: 9 }
];

// --- STEP 4 — Unit Details & Pricing --------------------------------------

const unitPricingFields = () => [
  // ---- Apartment (Sale)
  {
    name: 'unitConfigurations',
    label: 'Unit Configuration & Pricing',
    type: 'repeater',
    required: true,
    order: 1,
    dependsOn: [onType(APARTMENT), onTxn(SALE)],
    subFields: [
      { name: 'towerName', label: 'Tower', type: 'text', placeholder: 'e.g. Tower A', required: false, order: 1 },
      { name: 'floorNumber', label: 'Floor Number', type: 'number', placeholder: 'e.g. 5', required: false, order: 2 },
      { name: 'unitType', label: 'Unit Type', type: 'dropdown', options: ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', 'Penthouse', 'Duplex'], required: true, order: 3 },
      { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', placeholder: 'e.g. 1650', required: true, order: 4 },
      { name: 'builtUpArea', label: 'Built-up Area (sq.ft)', type: 'number', placeholder: 'e.g. 1900', required: false, order: 5 },
      { name: 'superArea', label: 'Super Built-up Area (sq.ft)', type: 'number', placeholder: 'e.g. 2100', required: false, order: 6 },
      { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: AREA_UNITS, required: false, order: 7 },
      { name: 'facing', label: 'Facing', type: 'dropdown', options: FACING_OPTIONS, required: false, order: 8 },
      { name: 'price', label: 'Price (₹)', type: 'number', placeholder: 'e.g. 12500000', required: true, order: 9 },
      { name: 'pricePerSqft', label: 'Rate (₹/sq.ft)', type: 'number', placeholder: 'e.g. 6500', required: false, order: 10 },
      { name: 'totalUnits', label: 'Total Units', type: 'number', placeholder: 'e.g. 60', required: false, order: 11 },
      { name: 'availableUnits', label: 'Available Units', type: 'number', placeholder: 'e.g. 48', required: true, order: 12 },
      { name: 'status', label: 'Status', type: 'dropdown', options: UNIT_STATUS, required: false, order: 13 }
    ]
  },

  // ---- Villa (Sale)
  {
    name: 'villaConfigurations',
    label: 'Villa Configuration & Pricing',
    type: 'repeater',
    required: true,
    order: 1,
    dependsOn: [onType(VILLA), onTxn(SALE)],
    subFields: [
      { name: 'villaType', label: 'Villa Type', type: 'pill', options: ['2 BHK', '3 BHK', '4 BHK', '5 BHK'], required: true, order: 1 },
      { name: 'villaNumber', label: 'Villa Number', type: 'text', placeholder: 'e.g. V-14', required: true, order: 2 },
      { name: 'plotArea', label: 'Plot Area (sq.ft)', type: 'number', placeholder: 'e.g. 2400', required: true, order: 3 },
      { name: 'builtUpArea', label: 'Built-up Area (sq.ft)', type: 'number', placeholder: 'e.g. 3200', required: true, order: 4 },
      { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', placeholder: 'e.g. 2800', required: false, order: 5 },
      { name: 'numberOfFloors', label: 'Number of Floors', type: 'number', placeholder: 'e.g. 2', required: false, order: 6 },
      { name: 'facing', label: 'Facing', type: 'dropdown', options: FACING_OPTIONS, required: false, order: 7 },
      { name: 'isCornerVilla', label: 'Corner Villa?', type: 'pill', options: ['Yes', 'No'], required: false, order: 8 },
      { name: 'hasPrivateGarden', label: 'Private Garden?', type: 'pill', options: ['Yes', 'No'], required: false, order: 9 },
      { name: 'hasPrivatePool', label: 'Private Pool?', type: 'pill', options: ['Yes', 'No'], required: false, order: 10 },
      { name: 'parking', label: 'Parking', type: 'text', placeholder: 'e.g. 2 Covered', required: false, order: 11 },
      { name: 'price', label: 'Price (₹)', type: 'number', placeholder: 'e.g. 25000000', required: true, order: 12 },
      { name: 'availableUnits', label: 'Available', type: 'number', placeholder: 'e.g. 5', required: true, order: 13 },
      { name: 'status', label: 'Status', type: 'dropdown', options: UNIT_STATUS, required: false, order: 14 }
    ]
  },

  // ---- Plot / Land — dimensions + per-plot status. Never BHK, tower or floor.
  {
    name: 'plotConfigurations',
    label: 'Plot Inventory & Pricing',
    type: 'repeater',
    required: true,
    order: 1,
    dependsOn: onType(PLOT),
    subFields: [
      { name: 'plotNumber', label: 'Plot Number', type: 'text', placeholder: 'e.g. 42', required: true, order: 1 },
      { name: 'length', label: 'Length (ft)', type: 'number', placeholder: 'e.g. 40', required: false, order: 2 },
      { name: 'width', label: 'Width (ft)', type: 'number', placeholder: 'e.g. 60', required: false, order: 3 },
      { name: 'plotArea', label: 'Plot Area', type: 'number', placeholder: 'e.g. 1800', required: true, order: 4 },
      { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: ['sq.yards', 'sq.ft.', 'sq.m.', 'acres'], required: true, order: 5 },
      { name: 'facing', label: 'Facing', type: 'dropdown', options: FACING_OPTIONS, required: false, order: 6 },
      { name: 'roadWidth', label: 'Road Width (ft)', type: 'number', placeholder: 'e.g. 30', required: false, order: 7 },
      { name: 'isCornerPlot', label: 'Corner Plot?', type: 'pill', options: ['Yes', 'No'], required: false, order: 8 },
      { name: 'pricePerSqft', label: 'Rate (₹ per unit area)', type: 'number', placeholder: 'e.g. 2500', required: false, order: 9 },
      { name: 'premium', label: 'Premium (₹)', type: 'number', placeholder: 'e.g. 50000', required: false, order: 10 },
      { name: 'price', label: 'Total Price (₹)', type: 'number', placeholder: 'e.g. 4500000', required: true, order: 11 },
      { name: 'status', label: 'Status', type: 'dropdown', options: UNIT_STATUS, required: false, order: 12 }
    ]
  },

  // ---- Commercial (Sale)
  {
    name: 'commercialConfigurations',
    label: 'Commercial Unit Configuration & Pricing',
    type: 'repeater',
    required: true,
    order: 1,
    dependsOn: [onType(COMMERCIAL), onTxn(SALE)],
    subFields: [
      { name: 'unitType', label: 'Unit Type', type: 'dropdown', options: ['Office Suite', 'Shop', 'Showroom', 'Warehouse', 'Restaurant Space', 'Anchor Store', 'Co-working Seat'], required: true, order: 1 },
      { name: 'unitNumber', label: 'Unit Number', type: 'text', placeholder: 'e.g. G-12', required: false, order: 2 },
      { name: 'floorNumber', label: 'Floor', type: 'number', placeholder: 'e.g. 3', required: false, order: 3 },
      { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', placeholder: 'e.g. 850', required: true, order: 4 },
      { name: 'superArea', label: 'Super Built-up Area (sq.ft)', type: 'number', placeholder: 'e.g. 1200', required: false, order: 5 },
      { name: 'areaUnit', label: 'Area Unit', type: 'dropdown', options: AREA_UNITS, required: false, order: 6 },
      { name: 'price', label: 'Price (₹)', type: 'number', placeholder: 'e.g. 9500000', required: true, order: 7 },
      { name: 'pricePerSqft', label: 'Rate (₹/sq.ft)', type: 'number', placeholder: 'e.g. 8000', required: false, order: 8 },
      { name: 'availableUnits', label: 'Available Units', type: 'number', placeholder: 'e.g. 20', required: true, order: 9 },
      { name: 'status', label: 'Status', type: 'dropdown', options: UNIT_STATUS, required: false, order: 10 }
    ]
  },

  // ---- Rent / Lease — monthly rent + deposit, never the sale-price model.
  {
    name: 'rentalConfigurations',
    label: 'Rental Configuration & Pricing',
    type: 'repeater',
    required: true,
    order: 1,
    dependsOn: [onType(BUILT), onTxn(RENTAL)],
    subFields: [
      { name: 'unitType', label: 'Unit Type', type: 'text', placeholder: 'e.g. 3 BHK / Office Suite', required: true, order: 1 },
      { name: 'carpetArea', label: 'Carpet Area (sq.ft)', type: 'number', placeholder: 'e.g. 1650', required: true, order: 2 },
      { name: 'superArea', label: 'Super Built-up Area (sq.ft)', type: 'number', placeholder: 'e.g. 2100', required: false, order: 3 },
      { name: 'furnishing', label: 'Furnishing', type: 'dropdown', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], required: true, order: 4 },
      { name: 'facing', label: 'Facing', type: 'dropdown', options: FACING_OPTIONS, required: false, order: 5 },
      { name: 'monthlyRent', label: 'Monthly Rent (₹)', type: 'number', placeholder: 'e.g. 45000', required: true, order: 6 },
      { name: 'securityDeposit', label: 'Security Deposit (₹)', type: 'number', placeholder: 'e.g. 200000', required: true, order: 7 },
      { name: 'maintenanceCharges', label: 'Maintenance (₹/month)', type: 'number', placeholder: 'e.g. 3500', required: false, order: 8 },
      { name: 'lockInPeriod', label: 'Lock-in Period (months)', type: 'number', placeholder: 'e.g. 11', required: false, order: 9 },
      { name: 'availableFrom', label: 'Available From', type: 'date', required: false, order: 10 },
      { name: 'availableUnits', label: 'Available Units', type: 'number', placeholder: 'e.g. 6', required: true, order: 11 }
    ]
  },

  // Position / facing premiums only make sense against a sale rate.
  {
    name: 'positionFacingRates',
    label: 'Position / Facing Rate (Optional)',
    type: 'repeater',
    required: false,
    order: 2,
    dependsOn: onTxn(SALE),
    subFields: [
      { name: 'position', label: 'Position / Facing', type: 'dropdown', options: [...FACING_OPTIONS, 'Corner', 'Park Facing', 'Road Facing'], required: true, order: 1 },
      { name: 'additionalRate', label: 'Additional Rate (₹/sq.ft)', type: 'number', placeholder: 'e.g. 150', required: true, order: 2 }
    ]
  }
];

// --- STEP 6 — Specifications ----------------------------------------------

const specificationFields = () => [
  // ---- Built property (Apartment / Villa / Commercial share the core shell)
  { name: 'specStructure', label: 'Structure', type: 'dropdown', options: ['RCC Framed Structure', 'Load Bearing Structure', 'Steel Framed Structure', 'Pre-Cast Structure'], required: false, order: 1, dependsOn: onType(BUILT) },
  { name: 'specWalls', label: 'Walls', type: 'dropdown', options: ['Red Brick', 'AAC Blocks', 'Fly Ash Bricks', 'Solid Concrete Blocks'], required: false, order: 2, dependsOn: onType(BUILT) },
  { name: 'specFlooring', label: 'Flooring', type: 'dropdown', options: ['Vitrified Tiles', 'Double Charged Vitrified Tiles', 'Italian Marble', 'Granite', 'Laminated Wooden Flooring', 'Ceramic Tiles'], required: false, order: 3, dependsOn: onType(BUILT) },
  { name: 'specDoors', label: 'Doors', type: 'dropdown', options: ['Teak Wood Frame', 'Engineered Wood', 'Flush Doors', 'UPVC Doors'], required: false, order: 4, dependsOn: onType(BUILT) },
  { name: 'specWindows', label: 'Windows', type: 'dropdown', options: ['UPVC', 'Aluminium', 'Wooden', 'Powder Coated Aluminium'], required: false, order: 5, dependsOn: onType(BUILT) },
  { name: 'specPaint', label: 'Paint', type: 'dropdown', options: ['Acrylic Emulsion', 'Plastic Emulsion', 'Oil Bound Distemper', 'Luxury Emulsion'], required: false, order: 6, dependsOn: onType(BUILT) },
  { name: 'specElectrical', label: 'Electrical', type: 'dropdown', options: ['Concealed Copper Wiring', 'Concealed Copper Wiring with Modular Switches', 'Surface Wiring'], required: false, order: 7, dependsOn: onType(BUILT) },
  { name: 'specWaterSupply', label: 'Water Supply', type: 'dropdown', options: ['Corporation', 'Borewell', 'Both', 'Corporation + Borewell + STP Water'], required: false, order: 8, dependsOn: onType(BUILT) },

  // ---- Residential-only interiors
  { name: 'specKitchen', label: 'Kitchen', type: 'dropdown', options: ['Modular Kitchen', 'Granite Platform with SS Sink', 'Semi-Modular Kitchen', 'Bare Kitchen'], required: false, order: 9, dependsOn: onType([...APARTMENT, ...VILLA]) },
  { name: 'specToiletFittings', label: 'Toilet & Sanitary Fittings', type: 'textarea', placeholder: 'e.g. Kohler / Jaquar premium CP fittings, wall-hung EWC...', required: false, order: 10, dependsOn: onType([...APARTMENT, ...VILLA]) },

  // ---- Villa extras
  { name: 'specCompoundWall', label: 'Compound Wall', type: 'dropdown', options: ['Full Compound Wall', 'Partial Compound Wall', 'Fencing', 'Not Available'], required: false, order: 11, dependsOn: onType(VILLA) },
  { name: 'specGarden', label: 'Garden / Landscaping', type: 'text', placeholder: 'e.g. Private landscaped garden', required: false, order: 12, dependsOn: onType(VILLA) },
  { name: 'specTerrace', label: 'Terrace', type: 'text', placeholder: 'e.g. Private terrace with pergola', required: false, order: 13, dependsOn: onType(VILLA) },
  { name: 'specSolar', label: 'Solar Provision', type: 'dropdown', options: ['Solar Water Heater', 'Solar Power', 'Both', 'Not Available'], required: false, order: 14, dependsOn: onType(VILLA) },
  { name: 'specAutomation', label: 'Home Automation', type: 'dropdown', options: ['Full Home Automation', 'Partial Automation', 'Automation Ready', 'Not Available'], required: false, order: 15, dependsOn: onType(VILLA) },

  // ---- Commercial extras
  { name: 'specCeilingHeight', label: 'Ceiling Height', type: 'text', placeholder: 'e.g. 3.6 m floor-to-floor', required: false, order: 16, dependsOn: onType(COMMERCIAL) },
  { name: 'specHvac', label: 'HVAC', type: 'dropdown', options: ['Central HVAC', 'VRV / VRF', 'Split AC Provision', 'Not Provided'], required: false, order: 17, dependsOn: onType(COMMERCIAL) },
  { name: 'specPowerLoad', label: 'Power Load', type: 'text', placeholder: 'e.g. 1 KVA per 100 sq.ft', required: false, order: 18, dependsOn: onType(COMMERCIAL) },
  { name: 'specFireSystem', label: 'Fire System', type: 'text', placeholder: 'e.g. Addressable fire alarm + sprinklers', required: false, order: 19, dependsOn: onType(COMMERCIAL) },
  { name: 'specWashrooms', label: 'Washrooms', type: 'text', placeholder: 'e.g. Common washrooms on every floor', required: false, order: 20, dependsOn: onType(COMMERCIAL) },
  { name: 'specAccess', label: 'Access / Loading', type: 'text', placeholder: 'e.g. Dedicated service lift and loading bay', required: false, order: 21, dependsOn: onType(COMMERCIAL) },

  // ---- Plot / Land development specifications
  { name: 'specBoundaryWall', label: 'Boundary Wall', type: 'dropdown', options: ['Compound Wall - Full', 'Compound Wall - Partial', 'Fencing', 'Not Available'], required: false, order: 1, dependsOn: onType(PLOT) },
  { name: 'specInternalRoads', label: 'Internal Roads', type: 'text', placeholder: 'e.g. 40 ft BT Roads', required: false, order: 2, dependsOn: onType(PLOT) },
  { name: 'specPlotWaterSupply', label: 'Water Supply', type: 'dropdown', options: ['Corporation', 'Borewell', 'Both', 'Not Available'], required: false, order: 3, dependsOn: onType(PLOT) },
  { name: 'specPlotElectrical', label: 'Electrical Infrastructure', type: 'text', placeholder: 'e.g. Underground electrical cabling', required: false, order: 4, dependsOn: onType(PLOT) },
  { name: 'specDrainage', label: 'Drainage / Sewerage', type: 'text', placeholder: 'e.g. Underground drainage system', required: false, order: 5, dependsOn: onType(PLOT) },
  { name: 'specStreetLighting', label: 'Street Lighting', type: 'dropdown', options: ['Available', 'Not Available'], required: false, order: 6, dependsOn: onType(PLOT) },
  { name: 'specLandscaping', label: 'Landscaping / Avenue Plantation', type: 'text', placeholder: 'e.g. Avenue plantation on all roads', required: false, order: 7, dependsOn: onType(PLOT) },

  { name: 'specCustom', label: 'Additional Specifications', type: 'textarea', placeholder: 'Anything else worth calling out...', required: false, order: 30 }
];

// --- STEP 7 — Images & Gallery --------------------------------------------

const galleryFields = () => [
  { name: 'propertyImages', label: 'Gallery Images', type: 'file', required: true, order: 1 },

  // Status-specific media (built property)
  { name: 'conceptImages', label: 'Concept / Elevation / Master Plan Images', type: 'file', required: false, order: 2, dependsOn: [onStatus(['Pre Launch', 'New Launch']), onType(BUILT)] },
  { name: 'constructionImages', label: 'Construction Progress Images', type: 'file', required: false, order: 3, dependsOn: [onStatus(['Under Construction']), onType(BUILT)] },
  { name: 'completedImages', label: 'Completed Exterior & Actual Interior Images', type: 'file', required: false, order: 4, dependsOn: [onStatus(['Ready To Move', 'Completed']), onType(BUILT)] },

  // Plot / Land media
  { name: 'layoutImages', label: 'Master Layout & Plot Map Images', type: 'file', required: false, order: 5, dependsOn: onType(PLOT) },
  { name: 'infrastructureImages', label: 'Roads & Infrastructure Site Photos', type: 'file', required: false, order: 6, dependsOn: onType(PLOT) },

  { name: 'amenityImages', label: 'Amenity Images', type: 'file', required: false, order: 7 },
  { name: 'propertyVideos', label: 'Walkthrough Videos', type: 'file', required: false, order: 8 }
];

// --- STEP 8 — Floor Plans / Layout ----------------------------------------

const floorPlanFields = () => [
  // Apartment / Commercial: per-configuration plans + master plan
  {
    name: 'floorPlans',
    label: 'Floor Plans',
    type: 'repeater',
    required: false,
    order: 1,
    dependsOn: onType([...APARTMENT, ...COMMERCIAL]),
    subFields: [
      { name: 'configName', label: 'Configuration (e.g. 2 BHK / Office Suite)', type: 'text', required: true, order: 1 },
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
  },

  // Villa: per villa type, ground / first floor / site plan
  {
    name: 'villaFloorPlans',
    label: 'Villa Plans',
    type: 'repeater',
    required: false,
    order: 1,
    dependsOn: onType(VILLA),
    subFields: [
      { name: 'villaType', label: 'Villa Type', type: 'pill', options: ['2 BHK', '3 BHK', '4 BHK', '5 BHK'], required: true, order: 1 },
      { name: 'builtUpArea', label: 'Built-up Area (sq.ft)', type: 'number', required: false, order: 2 },
      { name: 'groundFloorPlan', label: 'Ground Floor Plan', type: 'file', required: false, order: 3 },
      { name: 'firstFloorPlan', label: 'First Floor Plan', type: 'file', required: false, order: 4 },
      { name: 'sitePlan', label: 'Site Plan', type: 'file', required: false, order: 5 }
    ]
  },

  // Plot / Land: master layout + plot number map + road layout
  { name: 'plotMasterLayout', label: 'Master Layout Plan', type: 'single_file', required: false, order: 1, dependsOn: onType(PLOT) },
  { name: 'plotNumberMap', label: 'Plot Number Map', type: 'single_file', required: false, order: 2, dependsOn: onType(PLOT) },
  { name: 'plotRoadLayout', label: 'Road Layout Plan', type: 'single_file', required: false, order: 3, dependsOn: onType(PLOT) },

  { name: 'masterPlan', label: 'Project Master Plan', type: 'single_file', required: false, order: 4, dependsOn: onType(BUILT) }
];

// --- the 15 steps ----------------------------------------------------------

export const createBuilderSteps = () => [
  {
    stepNumber: 1,
    title: 'Project Information',
    description: 'Basic details about your project',
    fields: [
      // ---- MASTER SELECTIONS: these three drive every later step ----
      { name: 'transactionType', label: 'Transaction Type', type: 'pill', options: TRANSACTION_TYPES, required: true, order: 1 },
      { name: 'propertyType', label: 'Property Type', type: 'pill', options: BUILDER_PROPERTY_TYPES, required: true, order: 2 },
      { name: 'projectStatus', label: 'Project Status', type: 'pill', options: PROJECT_STATUSES, required: true, order: 3 },

      { name: 'propertyName', label: 'Project Name', type: 'text', placeholder: 'e.g. Sujay Global Elara', required: true, order: 4 },
      { name: 'builderName', label: 'Builder / Developer Name', type: 'text', placeholder: 'e.g. Sujay Constructions', required: true, order: 5 },
      { name: 'description', label: 'Project Description', type: 'textarea', placeholder: 'Describe the project vision, lifestyle and unique selling points...', required: true, order: 6, validation: { minLength: 100, maxLength: 5000, customErrorMessage: 'Project description must be between 100 and 5000 characters' } },
      { name: 'logo', label: 'Project Logo', type: 'single_file', required: false, order: 7 },
      { name: 'coverImage', label: 'Project Cover Image', type: 'single_file', required: false, order: 8 },

      // ---- RERA compliance branch ----
      { name: 'reraStatus', label: 'RERA Status', type: 'pill', options: RERA_STATUSES, required: true, order: 9 },
      { name: 'reraNumber', label: 'RERA Registration Number', type: 'text', placeholder: 'e.g. P02400008905', required: true, order: 9.1, dependsOn: onRera('Registered') },
      { name: 'reraCertificate', label: 'RERA Certificate', type: 'single_file', required: false, order: 9.2, dependsOn: onRera('Registered') },
      { name: 'reraVerified', label: 'RERA Verified?', type: 'pill', options: ['Yes', 'No'], required: false, order: 9.3, dependsOn: onRera('Registered') },
      { name: 'reraApplicationNumber', label: 'RERA Application Number', type: 'text', placeholder: 'e.g. APP/2026/00871', required: true, order: 9.4, dependsOn: onRera('Applied') },
      { name: 'reraApplicationDate', label: 'Application Date', type: 'date', required: false, order: 9.5, dependsOn: onRera('Applied') },
      { name: 'reraComplianceReason', label: 'Reason / Compliance Information', type: 'textarea', placeholder: 'Explain why RERA registration is not applicable or pending...', required: true, order: 9.6, dependsOn: onRera(['Not Registered', 'Not Applicable / Exempt']) },

      { name: 'possessionDate', label: 'Possession Date', type: 'date', required: false, order: 10, dependsOn: onTxn(SALE) }
    ]
  },
  {
    stepNumber: 2,
    title: 'Location Details',
    description: 'Where is your project located?',
    showLocationSelector: true,
    // Country -> State -> District -> City -> Locality -> Map are rendered by the
    // LocationSelector as a cascade. Per spec there is deliberately NO pincode field.
    fields: [
      { name: 'landmark', label: 'Landmark', type: 'text', placeholder: 'e.g. Near Nallagandla Tellapur Road', required: false, order: 1 },
      { name: 'latitude', label: 'Latitude', type: 'text', placeholder: 'e.g. 17.5024', required: false, order: 2 },
      { name: 'longitude', label: 'Longitude', type: 'text', placeholder: 'e.g. 78.3067', required: false, order: 3 }
    ]
  },
  {
    stepNumber: 3,
    title: 'Project Summary',
    description: 'Scale and structure of the project',
    fields: projectSummaryFields()
  },
  {
    stepNumber: 4,
    title: 'Unit Details & Pricing',
    description: 'Add every configuration you are selling',
    fields: unitPricingFields()
  },
  {
    stepNumber: 5,
    title: 'Amenities',
    description: 'Select the amenities available in this project',
    fields: [
      { name: 'amenities', label: 'Select Amenities', type: 'checkbox_group', options: AMENITIES_APARTMENT, required: true, order: 1, dependsOn: onType(APARTMENT) },
      { name: 'amenities', label: 'Select Amenities', type: 'checkbox_group', options: AMENITIES_VILLA, required: true, order: 1, dependsOn: onType(VILLA) },
      { name: 'amenities', label: 'Select Amenities', type: 'checkbox_group', options: AMENITIES_PLOT, required: true, order: 1, dependsOn: onType(PLOT) },
      { name: 'amenities', label: 'Select Amenities', type: 'checkbox_group', options: AMENITIES_COMMERCIAL, required: true, order: 1, dependsOn: onType(COMMERCIAL) },
      { name: 'highlights', label: 'Key Highlights', type: 'checkbox_group', options: HIGHLIGHT_OPTIONS, required: false, order: 2 }
    ]
  },
  {
    stepNumber: 6,
    title: 'Specifications',
    description: 'Construction and development specifications',
    fields: specificationFields()
  },
  {
    stepNumber: 7,
    title: 'Images & Gallery',
    description: 'Upload project photos',
    fields: galleryFields()
  },
  {
    stepNumber: 8,
    title: 'Floor Plans',
    description: 'Upload a layout for each configuration',
    fields: floorPlanFields()
  },
  {
    stepNumber: 9,
    title: 'Documents',
    description: 'Upload approvals and project documents',
    fields: [
      { name: 'docReraCertificate', label: 'RERA Certificate', type: 'single_file', required: false, order: 1, dependsOn: onRera('Registered') },
      { name: 'docReraApplication', label: 'RERA Application / Supporting Document', type: 'single_file', required: false, order: 2, dependsOn: onRera('Applied') },
      { name: 'docApprovalLetter', label: 'Approval Letter', type: 'single_file', required: false, order: 3 },
      { name: 'docLayoutApproval', label: 'Layout Approval', type: 'single_file', required: false, order: 4, dependsOn: onType(PLOT) },
      { name: 'docBrochure', label: 'e-Brochure', type: 'single_file', required: false, order: 5 },
      { name: 'docMasterPlan', label: 'Master Plan', type: 'single_file', required: false, order: 6 },
      { name: 'docPriceSheet', label: 'Price Sheet', type: 'single_file', required: false, order: 7 },
      { name: 'docOther', label: 'Other Document', type: 'single_file', required: false, order: 8 }
    ]
  },
  {
    stepNumber: 10,
    title: 'Construction Status',
    description: 'Current project progress',
    fields: [
      // Branches purely off Step 1's `projectStatus` — each block only shows for its status.
      { name: 'expectedLaunchDate', label: 'Expected Launch Date', type: 'date', required: true, order: 1, dependsOn: onStatus('Pre Launch') },
      { name: 'expectedPossessionPL', label: 'Expected Possession', type: 'date', required: false, order: 2, dependsOn: onStatus('Pre Launch') },
      { name: 'priceStartingFrom', label: 'Price Starting From (₹)', type: 'number', placeholder: 'e.g. 5500000', required: false, order: 3, dependsOn: [onStatus('Pre Launch'), onTxn(SALE)] },
      { name: 'bookingEoiStatus', label: 'Booking / EOI Status', type: 'dropdown', options: ['Not Started', 'EOI Open', 'Booking Open'], required: false, order: 4, dependsOn: onStatus('Pre Launch') },
      { name: 'plannedDevelopment', label: 'Planned Development', type: 'textarea', placeholder: 'Describe the planned phases and timelines...', required: false, order: 5, dependsOn: onStatus('Pre Launch') },

      { name: 'launchDate', label: 'Launch Date', type: 'date', required: true, order: 1, dependsOn: onStatus('New Launch') },
      { name: 'bookingOpen', label: 'Booking Open?', type: 'pill', options: ['Yes', 'No'], required: false, order: 2, dependsOn: onStatus('New Launch') },
      { name: 'launchPrice', label: 'Launch Price (₹)', type: 'number', placeholder: 'e.g. 6000000', required: false, order: 3, dependsOn: [onStatus('New Launch'), onTxn(SALE)] },
      { name: 'launchOffer', label: 'Launch Offer', type: 'text', placeholder: 'e.g. No GST till March', required: false, order: 4, dependsOn: onStatus('New Launch') },
      { name: 'availableInventory', label: 'Available Inventory', type: 'number', placeholder: 'e.g. 80', required: false, order: 5, dependsOn: onStatus('New Launch') },
      { name: 'expectedPossessionNL', label: 'Expected Possession', type: 'date', required: false, order: 6, dependsOn: onStatus('New Launch') },

      { name: 'completionPercentage', label: 'Completion (%)', type: 'slider', required: false, order: 1, dependsOn: onStatus('Under Construction') },
      { name: 'constructionProgress', label: 'Construction Stage Progress', type: 'progress_group', options: CONSTRUCTION_STAGES, required: false, order: 2, dependsOn: [onStatus('Under Construction'), onType(BUILT)] },
      { name: 'developmentProgress', label: 'Development Progress', type: 'textarea', placeholder: 'e.g. Roads laid in Phase 1, drainage 70% complete...', required: false, order: 2, dependsOn: [onStatus('Under Construction'), onType(PLOT)] },
      { name: 'expectedPossession', label: 'Expected Possession', type: 'date', required: false, order: 3, dependsOn: onStatus('Under Construction') },
      { name: 'milestones', label: 'Milestones', type: 'textarea', placeholder: 'e.g. Structure completed Jan 2026, Finishing by Aug 2026...', required: false, order: 4, dependsOn: onStatus('Under Construction') },

      { name: 'projectCompletionConfirmed', label: 'Project Completion', type: 'pill', options: ['100%'], required: true, order: 1, dependsOn: onStatus(['Ready To Move', 'Completed']) },
      { name: 'possessionAvailable', label: 'Possession Available?', type: 'pill', options: ['Yes', 'No'], required: false, order: 2, dependsOn: onStatus(['Ready To Move', 'Completed']) },
      { name: 'availableUnitsAtPossession', label: 'Available Units', type: 'number', placeholder: 'e.g. 12', required: false, order: 3, dependsOn: onStatus(['Ready To Move', 'Completed']) },
      { name: 'completionDocuments', label: 'Completion Documents', type: 'single_file', required: false, order: 4, dependsOn: onStatus(['Ready To Move', 'Completed']) },

      // Rent / Lease availability terms, independent of construction stage.
      { name: 'availableFrom', label: 'Available From', type: 'date', required: false, order: 10, dependsOn: onTxn(RENTAL) },
      { name: 'occupancyStatus', label: 'Occupancy Status', type: 'dropdown', options: ['Vacant', 'Partially Occupied', 'Occupied'], required: false, order: 11, dependsOn: onTxn(RENTAL) },
      { name: 'leaseTerms', label: 'Lease Terms', type: 'textarea', placeholder: 'e.g. 11-month lease, 5% annual escalation, 6-month lock-in...', required: false, order: 12, dependsOn: onTxn(RENTAL) }
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
      { name: 'builderWebsite', label: 'Website', type: 'text', placeholder: 'e.g. https://sujayconstructions.com', required: false, order: 6 },
      { name: 'builderOfficeAddress', label: 'Office Address', type: 'textarea', placeholder: 'e.g. Nallagandla, Hyderabad, Telangana 500019', required: false, order: 7 },
      { name: 'builderWorkingHours', label: 'Working Hours', type: 'text', placeholder: 'e.g. 10:00 AM - 7:00 PM', required: false, order: 8 },
      { name: 'builderAbout', label: 'About the Builder', type: 'textarea', placeholder: 'e.g. Sujay Constructions is a trusted real estate brand with 14+ years of experience...', required: false, order: 9 },
      {
        name: 'builderPreviousProjects',
        label: 'Previous Projects',
        type: 'repeater',
        required: false,
        order: 10,
        subFields: [
          { name: 'projectName', label: 'Project Name', type: 'text', required: true, order: 1 },
          { name: 'location', label: 'Location', type: 'text', required: false, order: 2 },
          { name: 'completionYear', label: 'Completion Year', type: 'number', required: false, order: 3 }
        ]
      }
    ]
  },
  {
    stepNumber: 13,
    title: 'Contact Details',
    description: 'How buyers reach you',
    fields: [
      { name: 'contactPerson', label: 'Sales Contact Person', type: 'text', placeholder: 'e.g. Ramesh Kumar', required: true, order: 1 },
      { name: 'contactNumber', label: 'Mobile Number', type: 'text', placeholder: 'e.g. 9876543210', required: true, order: 2 },
      { name: 'contactWhatsapp', label: 'WhatsApp Number', type: 'text', placeholder: 'e.g. 9876543210', required: false, order: 3 },
      { name: 'contactAltNumber', label: 'Alternate Number', type: 'text', placeholder: 'e.g. 9876543211', required: false, order: 4 },
      { name: 'contactEmail', label: 'Email Address', type: 'text', placeholder: 'e.g. sales@sujayconstructions.com', required: false, order: 5 },
      { name: 'contactOfficeAddress', label: 'Office Address', type: 'textarea', placeholder: 'e.g. Sujay Constructions, Nallagandla, Hyderabad', required: false, order: 6 },
      { name: 'contactWorkingHours', label: 'Working Hours', type: 'text', placeholder: 'e.g. 10:00 AM - 7:00 PM', required: false, order: 7 },
      { name: 'leadRouting', label: 'Lead Routing', type: 'pill', options: ['Direct to Builder', 'Platform Sales Team', 'Masked / Controlled'], required: false, order: 8 },
      { name: 'contactWebsite', label: 'Website', type: 'text', placeholder: 'e.g. https://sujayconstructions.com', required: false, order: 9 },
      { name: 'socialFacebook', label: 'Facebook URL', type: 'text', placeholder: 'https://facebook.com/...', required: false, order: 10 },
      { name: 'socialInstagram', label: 'Instagram URL', type: 'text', placeholder: 'https://instagram.com/...', required: false, order: 11 },
      { name: 'socialLinkedin', label: 'LinkedIn URL', type: 'text', placeholder: 'https://linkedin.com/...', required: false, order: 12 },
      { name: 'socialYoutube', label: 'YouTube URL', type: 'text', placeholder: 'https://youtube.com/...', required: false, order: 13 }
    ]
  },
  {
    stepNumber: 14,
    title: 'SEO Details',
    description: 'SEO & marketing information',
    fields: [
      { name: 'seoTitle', label: 'SEO Title', type: 'text', placeholder: 'e.g. Sujay Global Elara - 2, 3 & 4 BHK Apartments in Nallagandla', required: false, order: 1, validation: { maxLength: 70, customErrorMessage: 'SEO title should be 70 characters or fewer' } },
      { name: 'seoDescription', label: 'Meta Description', type: 'textarea', placeholder: 'e.g. Buy premium 2, 3 & 4 BHK apartments at Sujay Global Elara, Nallagandla, Hyderabad...', required: false, order: 2, validation: { maxLength: 160, customErrorMessage: 'SEO description should be 160 characters or fewer' } },
      { name: 'seoKeywords', label: 'SEO Keywords', type: 'multiselect_pill', options: ['apartments in hyderabad', 'flats in nallagandla', '3 bhk apartments', 'new projects hyderabad', 'ready to move flats', 'villas for sale', 'open plots', 'commercial space'], required: false, order: 3 },
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
