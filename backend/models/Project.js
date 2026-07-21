// models/Project.js
import mongoose from "mongoose";

const nearbyPlaceSchema = new mongoose.Schema({
  name: String,
  type: String,
  distanceKm: Number
});

const projectSchema = new mongoose.Schema({
  // BASIC INFO
  propertyName: { type: String, required: true },
  contactNumber: { type: String },
  propertyType: { type: String, required: true },
  transactionType: { type: String },
  propertyCategory: { type: String },

  dynamicData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  dynamicCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyCategory",
    default: null
  },

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
  videoUrl: String,
  virtualTourLink: String,

  // AMENITIES
  amenities: [String],
  highlights: [String],
  topAmenities: [String],
  otherAmenities: [String],

  description: String,
  shortDescription: String,

  // CREATOR
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isAddedByUser: { type: Boolean, default: false },
  isAddedByAdmin: { type: Boolean, default: false },

  // BUY & PLOT DETAILS (Relevant for Projects)
  buyDetails: {
    type: { type: String },
    expectedPrice: { type: Number },
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

  plotDetails: {
    expectedPrice: { type: Number },
    plotArea: { type: Number },
    unit: { type: String, default: 'sqyrd' },
    dimensions: { length: Number, breadth: Number },
    facing: String,
    landType: { type: String },
    roadWidth: String,
    boundaryMarked: Boolean,
    approvalAuthority: String,
    soilType: String,
    electricityAvailable: Boolean,
    waterSource: String,
    nearbyLandmark: String
  },

  // NEW DEDICATED PROJECT DETAILS
  reraNumber: { type: String }, // Future-proofing
  totalArea: { type: Number }, // Acres etc.
  totalUnits: { type: Number },

  // EMBEDDED BUILDER PROJECT DETAILS (Merged from old BuilderProjectDetails)
  possessionStatus: {
    type: String,
    enum: ['Ongoing', 'Ready To Move', 'New Launch']
  },
  possessionYear: {
    type: Number
  },
  ratings: {
    constructionQuality: { type: Number, min: 1, max: 5 },
    aiSummary: { type: String }
  },
  priceHistory: {
    currentPricePerSqft: { type: Number },
    appreciationLast3Years: { type: Number }
  },
  paymentPlanUrl: { type: String }, // Future-proofing

  // VERIFICATION & MARKETING
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  featuredDetails: {
    isFeatured: { type: Boolean, default: false },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeaturedPlan' },
    planName: { type: String, default: 'None' },
    startDate: { type: Date },
    endDate: { type: Date },
    durationDays: { type: Number },
    status: { type: String, enum: ['active', 'paused', 'expired'], default: 'active' },
    pausedAt: { type: Date },
    adminNotes: { type: String }
  },
  isUrgent: { type: Boolean, default: false },
  isNegotiable: { type: Boolean, default: false },
  availabilityStatus: { type: String, enum: ['Available', 'Sold', 'Rented'], default: 'Available' },

  // STATUS
  status: {
    type: String,
    enum: ["draft", "pending", "approved", "rejected"],
    default: "draft"
  },
  isLive: { type: Boolean, default: false },

  // METRICS
  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  enquiryCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

projectSchema.index({ location: "2dsphere" });

export default mongoose.model("Project", projectSchema);
