import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    platformOpen: {
      type: Boolean,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    bookingDisabledMessage: {
      type: String,
      default: 'Bookings are temporarily disabled. Please try again later.'
    },
    maintenanceTitle: {
      type: String,
      default: 'We will be back soon.'
    },
    maintenanceMessage: {
      type: String,
      default: 'The platform is under scheduled maintenance. Please check back in some time.'
    },
    defaultCommission: {
      type: Number,
      default: 10 // Percentage
    },
    platformFlatFee: {
      type: Number,
      default: 20 // Flat platform fee
    },
    cashCollectionFee: {
      type: Number,
      default: 20 // Flat extra fee for cash collection
    },
    taxRate: {
      type: Number,
      default: 12 // Percentage (GST)
    },
    applyGst: {
      type: Boolean,
      default: false // Whether to apply GST on service/parts bills
    },
    reelCouponTarget: {
      type: Number,
      default: 1000 // Default target likes
    },
    reelCouponDiscount: {
      type: Number,
      default: 500 // Default flat discount
    },
    freeTrialListingLimit: {
      type: Number,
      default: 10
    },
    freeTrialDurationDays: {
      type: Number,
      default: 30
    },
    targetTitle: {
      type: String,
      default: 'Monthly Target'
    },
    monthlyTarget: {
      type: Number,
      default: 30
    },
    monthlyTargetBonus: {
      type: Number,
      default: 5000
    },
    targetStartDate: {
      type: Date
    },
    targetEndDate: {
      type: Date
    },
    workerAchievements: [{
      title: String,
      icon: {
        type: String,
        enum: ['FiStar', 'FiAward', 'FiClock', 'FiCheckCircle', 'FiTrendingUp', 'FiThumbsUp']
      },
      tier: {
        type: String,
        enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
      },
      jobThreshold: Number
    }],
    supportContact: {
      phone: { type: String, default: '+1234567890' },
      email: { type: String, default: 'support@hoomzo.com' },
      address: { type: String, default: 'Hoomzo Office, Address' }
    },
    privacyPolicy: {
      type: String,
      default: 'Privacy Policy terms will appear here.'
    },
    trainingVideos: [{
      title: String,
      youtubeUrl: String,
      gifUrl: String
    }],
    workerReferralBonusReferrer: {
      type: Number,
      default: 0
    },
    workerReferralBonusReferee: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

export default PlatformSettings;

