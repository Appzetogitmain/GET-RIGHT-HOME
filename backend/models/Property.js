// models/Property.js
import mongoose from "mongoose";

const nearbyPlaceSchema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    // enum removed to allow flexibilty (bus_stop, restaurant, other, etc.)
  },
  distanceKm: Number
});

// --- Builder project listing sub-schemas (15-step wizard) ---

const unitConfigurationSchema = new mongoose.Schema({
  unitType: String,          // "3 BHK", "200 sq.yards", "Office Suite A"
  carpetArea: Number,
  superArea: Number,
  areaUnit: { type: String, default: 'sq.ft.' },
  price: Number,
  pricePerSqft: Number,
  availableUnits: Number,
  facing: String
}, { _id: false });

const constructionProgressSchema = new mongoose.Schema({
  stage: String,             // "Foundation", "Structure", ...
  percentage: { type: Number, min: 0, max: 100 }
}, { _id: false });

const projectDocumentSchema = new mongoose.Schema({
  type: String,              // "reraCertificate", "brochure", ...
  name: String,              // human label, e.g. "RERA Certificate"
  fileUrl: String
}, { _id: false });

const propertySchema = new mongoose.Schema({

  // BASIC INFO
  propertyName: { type: String, required: true },
  contactNumber: { type: String },
  propertyType: {
    type: String, // Enum removed to allow dynamic property types (e.g., Flat/Apartment, Office Space)
    required: true
  },
  
  transactionType: {
    type: String,
    required: false // Optional for now to not break existing data
  },
  
  propertyCategory: {
    type: String,
    required: false
  },

  // Storage for ALL dynamic fields captured through the new form builder
  dynamicData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Dynamic Category (Optional)
  dynamicCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyCategory",
    default: null
  },

  // Flexible Category-Specific Details (Added for Tent/Glamping support)
  structureDetails: {
    type: Object,
    default: {} // Stores: tentType, bathroomType, electricityInfo, etc.
  },

  pgType: {
    type: String,
    enum: ["boys", "girls", "unisex"]
  },

  hostelType: {
    type: String,
    enum: ["boys", "girls", "mixed"]
  },

  hostLivesOnProperty: { type: Boolean, default: false },
  familyFriendly: { type: Boolean, default: false },

  resortType: {
    type: String,
    enum: ["beach", "hill", "jungle", "desert"]
  },

  hotelCategory: {
    type: String,
    enum: ["Budget", "Premium", "Luxury"]
  },
  starRating: {
    type: Number,
    min: 1,
    max: 7
  },

  activities: [String],

  description: String,
  shortDescription: String,

  // OWNER (optional for admin-added properties)

  // Added for C2C (User added properties)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isAddedByUser: { type: Boolean, default: false },

  // LOCATION
  address: {
    country: String,
    state: String,
    city: String,
    district: String,
    area: String,
    fullAddress: String,
    pincode: String
  },

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number]
  },

  nearbyPlaces: {
    type: [nearbyPlaceSchema],
    default: []
  },

  // MEDIA
  logo: { type: String, default: '' },
  coverImage: { type: String, default: '' },

  propertyImages: [String],

  // AMENITIES (PROPERTY LEVEL)
  amenities: [String],
  highlights: [String],
  topAmenities: [String],
  otherAmenities: [String],

  // POLICIES
  checkInTime: String,
  checkOutTime: String,
  cancellationPolicy: String,
  houseRules: [String],

  // --- NEW PROPERTY SPECIFIC FIELDS ---

  // PG/Co-Living Details
  pgDetails: {
    occupancy: { type: String, enum: ['Single', 'Double', 'Triple', 'Other'] },
    gender: { type: String, enum: ['Boys', 'Girls', 'Co-ed'] },
    minStay: String,
    noticePeriod: String,
    securityDeposit: Number,
    availableFrom: Date,
    foodIncluded: Boolean,
    rules: {
      smoking: Boolean,
      drinking: Boolean,
      visitors: Boolean,
      curfew: String,
      ageRange: String
    }
  },

  // Rent Details
  rentDetails: {
    type: { type: String }, // 1BHK, 2BHK etc.
    monthlyRent: { type: Number }, // Added Price
    furnishing: { type: String, enum: ['Fully', 'Semi', 'Unfurnished'] },
    tenantPreference: { type: String }, // Family, Bachelors, etc.
    builtYear: Number,
    maintenanceCharges: Number,
    electricityIncluded: Boolean,
    waterSupply: String,
    societyName: String,
    lift: Boolean
  },

  // Buy Details
  buyDetails: {
    type: { type: String }, // Apartment, Villa
    expectedPrice: { type: Number }, // Added Price
    area: {
      superBuiltUp: Number,
      carpet: Number,
      unit: { type: String, default: 'sqft' }
    },
    ownership: String,
    propertyAge: String,
    floor: {
      current: Number,
      total: Number
    },
    facing: String,
    registrationIncluded: Boolean,
    stampDutyIncluded: Boolean,
    propertyTax: Number,
    legalVerified: Boolean,
    loanEligible: Boolean,
    builderName: String
  },

  // Plot Details
  plotDetails: {
    expectedPrice: { type: Number }, // Added Price
    plotArea: { type: Number },
    unit: { type: String, default: 'sqyrd' },
    dimensions: { length: Number, breadth: Number }, // ft
    facing: String,
    landType: { type: String }, // Residential, Commercial
    roadWidth: String,
    boundaryMarked: Boolean,
    approvalAuthority: String,
    soilType: String,
    electricityAvailable: Boolean,
    waterSource: String,
    nearbyLandmark: String
  },

  // builderProjectDetails decoupled into separate BuilderProjectDetails collection

  // --- BUILDER PROJECT LISTING (15-step wizard) ---
  // Promoted out of dynamicData so these stay queryable (SEO URLs, price
  // filters, possession filters). dynamicData still holds the raw answers.

  // SEO-friendly URL, e.g. "sujay-global-elara-nallagandla-hyderabad"
  slug: { type: String, unique: true, sparse: true, index: true },

  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },

  unitConfigurations: {
    type: [unitConfigurationSchema],
    default: []
  },

  constructionStatus: {
    currentStatus: {
      type: String,
      enum: ['Not Started', 'Under Construction', 'Finishing Stage', 'Completed']
    },
    completionPercentage: { type: Number, min: 0, max: 100 },
    expectedPossession: Date,
    progress: {
      type: [constructionProgressSchema],
      default: []
    }
  },

  projectSummary: {
    totalLandArea: Number,
    totalTowers: Number,
    totalFloors: Number,
    totalUnits: Number,
    openSpacePercentage: Number,
    clubHouseSize: Number,
    launchDate: Date,
    possessionDate: Date
  },

  projectDocuments: {
    type: [projectDocumentSchema],
    default: []
  },

  specifications: {
    type: Object,
    default: {}
  },

  builderProfile: {
    companyName: String,
    establishedYear: Number,
    companyType: String,
    totalProjects: Number,
    logo: String,
    officeAddress: String,
    workingHours: String,
    about: String
  },

  contactDetails: {
    contactPerson: String,
    mobile: String,
    altMobile: String,
    email: String,
    officeAddress: String,
    website: String,
    social: {
      facebook: String,
      instagram: String,
      linkedin: String,
      youtube: String
    }
  },

  reraNumber: { type: String },
  reraVerified: { type: Boolean, default: false },

  // Denormalised price range, derived from unitConfigurations on save
  priceRange: {
    min: Number,
    max: Number
  },

  // Universal / Pro Fields
  videoUrl: String,
  isVerified: { type: Boolean, default: false },
  
  // Featured Details
  isFeatured: { type: Boolean, default: false },
  featuredDetails: {
    isFeatured: { type: Boolean, default: false },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeaturedPlan' },
    planName: { type: String, default: 'None' }, // Used for quick querying/fallback
    startDate: { type: Date },
    endDate: { type: Date },
    durationDays: { type: Number },
    status: { type: String, enum: ['active', 'paused', 'expired'], default: 'active' },
    pausedAt: { type: Date },
    adminNotes: { type: String }
  },
  isUrgent: { type: Boolean, default: false },
  isNegotiable: { type: Boolean, default: false },
  virtualTourLink: String,
  isAddedByAdmin: { type: Boolean, default: false },
  availabilityStatus: { type: String, enum: ['Available', 'Sold', 'Rented'], default: 'Available' },


  // STATUS
  status: {
    type: String,
    enum: ["draft", "pending", "approved", "rejected"],
    default: "draft"
  },

  isLive: { type: Boolean, default: false },

  // RATINGS
  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  enquiryCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

propertySchema.virtual('builderProjectDetails', {
  ref: 'BuilderProjectDetails',
  localField: '_id',
  foreignField: 'propertyId',
  justOne: true
});

propertySchema.index({ location: "2dsphere" });

// Search-path compound indexes. Price isn't indexed directly — startingPrice
// is computed at query time from several possible source fields (rent vs.
// buy vs. plot vs. dynamicData), not stored as one real column, so it can't
// be covered by a plain index without normalizing price into its own field
// first (a separate, larger change).
propertySchema.index({ status: 1, isLive: 1, transactionType: 1, propertyType: 1 });
propertySchema.index({ status: 1, isLive: 1, 'address.city': 1 });
propertySchema.index({ status: 1, isLive: 1, createdAt: -1 });
propertySchema.index({ dynamicCategory: 1, status: 1, isLive: 1 });

export default mongoose.model("Property", propertySchema);
