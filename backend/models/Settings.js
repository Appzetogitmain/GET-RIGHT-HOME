import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'global',
    unique: true
  },
  visitedCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  serviceGstPercentage: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  partsGstPercentage: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  servicePayoutPercentage: {
    type: Number,
    default: 90, // Vendor gets 90% of service base price
    min: 0,
    max: 100
  },
  partsPayoutPercentage: {
    type: Number,
    default: 100, // Vendor gets 100% of parts base price
    min: 0,
    max: 100
  },
  tdsPercentage: {
    type: Number,
    default: 1, // 1% default TDS u/s 194-O
    min: 0,
    max: 100
  },
  platformFeePercentage: {
    type: Number,
    default: 1, // 1% default platform fee
    min: 0,
    max: 100
  },
  cancellationPenalty: {
    type: Number,
    default: 49,
    min: 0
  },
  maxSearchTime: {
    type: Number,
    default: 5, // 5 minutes default
    min: 1
  },
  waveDuration: {
    type: Number,
    // How long a notified worker has to accept before the job moves to the
    // next wave. 60s was too short in practice — a phone in a pocket misses
    // the whole window.
    default: 300, // 5 minutes
    min: 10
  },
  // How long after a booking is created we hand it to the ops team if no
  // worker has accepted yet.
  //
  // Runs in PARALLEL with waveDuration rather than replacing it: at this point
  // the booking also appears in the admin's manual-assignment queue, while any
  // outstanding worker request stays live until its own window expires.
  // Whoever gets there first — the worker accepting or ops assigning — wins.
  // That's only safe because workers can still see and accept bookings that
  // are in the manual-assignment queue.
  manualEscalationDuration: {
    type: Number,
    default: 180, // 3 minutes
    min: 30
  },
  // Minimum gap (minutes) a worker needs between two jobs. A worker holding a
  // slot is not offered / cannot accept another slot that starts within this
  // many minutes before its start or after its end. 0 disables the buffer
  // (exact overlaps are still blocked).
  bookingBufferMinutes: {
    type: Number,
    default: 120,
    min: 0,
    max: 1440
  },
  // How many days ahead (including today) a customer can schedule a service.
  advanceBookingDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 60
  },
  // When true, a worker's marked leave days take effect immediately; when
  // false they wait for admin approval (and only approved leave blocks slots).
  // When true, a worker must explicitly mark each upcoming date as Available
  // (or Leave). Dates left unmarked receive no bookings. When false, the
  // weekly-days pattern covers dates they haven't marked.
  requireDailyAvailability: {
    type: Boolean,
    default: true
  },
  workerLeaveAutoApprove: {
    type: Boolean,
    default: false
  },
  // Pre-job reminder: this many minutes before an assigned job starts, the
  // worker gets a popup asking them to confirm they're on their way.
  jobReminderLeadMinutes: {
    type: Number,
    default: 120,
    min: 1,
    max: 1440
  },
  // How long the worker has to confirm that reminder before ops is alerted
  // and can re-broadcast the booking to other workers.
  jobReminderConfirmMinutes: {
    type: Number,
    default: 15,
    min: 1,
    max: 240
  },
  searchRadius: {
    type: Number,
    default: 10, // 10 km default search radius
    min: 1
  },
  // Razorpay Settings
  razorpayKeyId: {
    type: String,
    default: null
  },
  razorpayKeySecret: {
    type: String,
    default: null
  },
  razorpayWebhookSecret: {
    type: String,
    default: null
  },
  // Cloudinary Settings
  cloudinaryCloudName: {
    type: String,
    default: null
  },
  cloudinaryApiKey: {
    type: String,
    default: null
  },
  cloudinaryApiSecret: {
    type: String,
    default: null
  },
  // Future extensible fields
  currency: {
    type: String,
    default: 'INR'
  },

  // Billing & Invoice Configuration
  companyName: {
    type: String,
    default: 'TodayMyDream'
  },
  companyGSTIN: {
    type: String,
    default: ''
  },
  companyPAN: {
    type: String,
    default: ''
  },
  companyAddress: {
    type: String,
    default: ''
  },
  companyCity: {
    type: String,
    default: ''
  },
  companyState: {
    type: String,
    default: ''
  },
  companyPincode: {
    type: String,
    default: ''
  },
  companyPhone: {
    type: String,
    default: ''
  },
  companyEmail: {
    type: String,
    default: ''
  },

  // Invoice Settings
  invoicePrefix: {
    type: String,
    default: 'INV'
  },
  sacCode: {
    type: String,
    default: '998599'  // Event services SAC code
  },
  currentInvoiceNumber: {
    type: Number,
    default: 0
  },

  // Support Settings
  supportEmail: {
    type: String,
    default: ''
  },
  supportPhone: {
    type: String,
    default: ''
  },
  supportWhatsapp: {
    type: String,
    default: ''
  },
  isOnlinePaymentEnabled: {
    type: Boolean,
    default: true
  },
  bookingModel: {
    type: String,
    enum: ['vendor', 'worker'],
    default: 'worker'
  }
}, { timestamps: true });

settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ type: 'global' });
  if (!settings) {
    settings = await this.create({ type: 'global' });
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);
