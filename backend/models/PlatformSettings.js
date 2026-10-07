import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    platformOpen: {
      type: Boolean,
      default: true
    },
    operatingHours: {
      isOpen: {
        type: Boolean,
        default: true
      },
      openingTime: {
        type: String,
        default: '09:00'
      },
      closingTime: {
        type: String,
        default: '21:00'
      },
      slotDuration: {
        type: Number,
        default: 60 // In minutes
      },
      // Gap between consecutive slot start times (minutes). 0 = same as
      // slotDuration (back-to-back slots). E.g. duration 60 + interval 30
      // gives 9-10, 9:30-10:30, 10-11 ...
      slotInterval: {
        type: Number,
        default: 0,
        min: 0
      },
      // For same-day bookings, only slots starting at least this many minutes
      // from now are offered (gives the worker time to be assigned and travel).
      sameDayLeadMinutes: {
        type: Number,
        default: 60,
        min: 0
      }
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
    // ── Builder / lister free access (admin-controlled) ───────────────────────
    // How long / how many listings a lister may post without a subscription.
    //   none               → subscription required from day one
    //   time               → free for `freeAccessDurationDays` days (from signup)
    //   listings           → first `freeAccessListingLimit` listings are free, no time limit
    //   time_and_listings  → both limits apply; whichever is hit first ends it
    //   lifetime           → always free, unlimited
    // Defaults reproduce the previous hard-coded behaviour (30 days / 10 listings).
    freeAccessEnabled: {
      type: Boolean,
      default: true
    },
    freeAccessMode: {
      type: String,
      enum: ['none', 'time', 'listings', 'time_and_listings', 'lifetime'],
      default: 'time_and_listings'
    },
    freeAccessDurationDays: {
      type: Number,
      min: 0
    },
    freeAccessListingLimit: {
      type: Number,
      min: 0
    },
    // Roles the free-access rule applies to; other metered roles need a plan.
    freeAccessRoles: {
      type: [String],
      default: ['partner', 'owner', 'broker', 'builder']
    },
    // true  → a rule change applies to every lister.
    // false → listers who signed up before the change keep the previous rule.
    freeAccessApplyToExisting: {
      type: Boolean,
      default: true
    },
    // Snapshot of the rule that was live before the latest change, plus when the
    // change happened — used to grandfather older accounts.
    freeAccessPrevious: {
      enabled: Boolean,
      mode: String,
      durationDays: Number,
      listingLimit: Number,
      roles: [String]
    },
    freeAccessChangedAt: {
      type: Date
    },
    // Optional admin-editable paywall copy (blank → mode-aware default text).
    freeAccessPaywallTitle: {
      type: String,
      default: ''
    },
    freeAccessPaywallMessage: {
      type: String,
      default: ''
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
      email: { type: String, default: 'support@getrighthome.com' },
      address: { type: String, default: 'Get Right Home Office, Address' }
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
    },
    supportEmail: {
      type: String,
      default: 'getrighthome7@gmail.com'
    },
    supportPhone: {
      type: String,
      default: '+91 63044 71791'
    },
    supportWhatsapp: {
      type: String,
      default: '+916304471791'
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

