import mongoose from 'mongoose';
import {  BOOKING_STATUS, PAYMENT_STATUS  } from '../utils/constants.js';

/**
 * Booking Model
 * Represents service bookings made by users
 * Organized by logical sections for better maintainability
 */
const bookingSchema = new mongoose.Schema({
  // ==========================================
  // 1. IDENTIFIERS
  // ==========================================
  bookingNumber: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: false,
    index: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null,
    index: true
  },
  notifiedVendors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  }],
  notifiedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],
  notifiedPartners: [{
    type: mongoose.Schema.Types.ObjectId
  }],

  // ==========================================
  // ASSIGNMENT LIFECYCLE
  // ==========================================
  //
  // Kept SEPARATE from `status` (the booking lifecycle) on purpose: a booking
  // can be perfectly alive and paid while its assignment is still unresolved.
  // Conflating the two is what made "nobody accepted yet" look like "booking
  // failed" to the customer.
  assignmentStatus: {
    type: String,
    enum: [
      'pending',                     // not started
      'searching',                   // requests going out to workers
      'manual_assignment_required',  // automatic matching exhausted → ops queue
      'awaiting_worker',             // admin picked a worker; waiting for them to accept
      'assigned',                    // a worker holds this booking
      'reassigning',                 // previous worker dropped out, retrying
      'unfulfillable'                // ops determined it cannot be served
    ],
    default: 'pending',
    index: true
  },

  // One row per worker we asked, so ops can see WHY a booking reached the
  // manual queue (rejected vs never responded) instead of guessing.
  assignmentAttempts: [{
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    waveNumber: { type: Number, default: 1 },
    notifiedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
    outcome: {
      type: String,
      enum: ['notified', 'accepted', 'rejected', 'timeout', 'cancelled_by_worker', 'unconfirmed'],
      default: 'notified'
    },
    reason: { type: String, default: '' }
  }],

  // Pre-job reminder handshake (see cron/jobReminderScheduler.js).
  reminderSentAt: { type: Date, default: null },
  reminderConfirmedAt: { type: Date, default: null },
  // Set when the worker ignored the reminder and ops was alerted.
  reminderEscalatedAt: { type: Date, default: null },

  // Set when ops assigns by hand, for accountability.
  manuallyAssignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  manuallyAssignedAt: { type: Date, default: null },

  // ==========================================
  // WAVE-BASED ALERTING
  // ==========================================
  potentialVendors: [{
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    distance: { type: Number } // in km
  }],
  potentialWorkers: [{
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    distance: { type: Number } // in km
  }],
  currentWave: {
    type: Number,
    default: 1
  },
  waveStartedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },

  // ==========================================
  // 2. SERVICE INFORMATION
  // ==========================================
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService',
    required: [true, 'Service is required'],
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
    index: true
  },
  serviceName: {
    type: String,
    required: true
  },
  serviceCategory: {
    type: String,
    required: [true, 'Service category is required']
  },
  isEstimateBased: {
    type: Boolean,
    default: false
  },
  // Visual Identity (For easier UI access)
  categoryIcon: { type: String, default: null }, // URL to category icon
  brandName: { type: String, default: null },    // e.g. "LG", "Samsung"
  brandIcon: { type: String, default: null },    // URL to brand logo
  description: {
    type: String,
    trim: true
  },
  serviceImages: [{
    type: String
  }],
  // Booked Items (Brand > Card snapshot)
  bookedItems: [{
    brandName: { type: String, default: '' },
    brandIcon: { type: String, default: null },
    serviceName: { type: String, default: '' },
    card: {
      title: { type: String },
      subtitle: { type: String },
      price: { type: Number, default: 0 },
      originalPrice: { type: Number },
      duration: { type: String },
      description: { type: String },
      imageUrl: { type: String },
      features: [{ type: String }],
      optionLabel: { type: String }
    },
    quantity: { type: Number, default: 1 }
  }],

  // ==========================================
  // 3. PRICING & BILLING
  // ==========================================
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  promoCode: {
    type: String,
    default: null
  },
  promoDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  visitingCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  penalty: {
    type: Number,
    default: 0,
    min: 0
  },
  extraCharges: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  extraChargesTotal: {
    type: Number,
    default: 0
  },
  // Total Value of the Booking (set after bill generation)
  estimate: {
    amount: { type: Number, default: 0 },
    description: { type: String, default: '' },
    tokenAmount: { type: Number, default: 0 },
    adminCommission: { type: Number, default: 0 },
    workerAdvance: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    generatedAt: { type: Date, default: null }
  },
  finalAmount: {
    type: Number,
    required: [true, 'Final amount is required'],
    min: 0
  },
  finalOnlineAmount: {
    type: Number,
    default: 0
  },
  finalCashAmount: {
    type: Number,
    default: 0
  },
  // Optional customer tip, set on the final-bill screen before paying.
  // Added on top of finalAmount/finalOnlineAmount/finalCashAmount (see
  // hsBookingController.setTip) and credited to the worker 100% — no
  // platform commission is taken on it, unlike the base service fee.
  tipAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Amount specifically payable by the user (might differ from finalAmount in plan cases)
  userPayableAmount: {
    type: Number,
    default: 0
  },
  // Reference to VendorBill (single source of truth for earnings/commission)
  vendorBillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorBill',
    default: null
  },

  // ==========================================
  // 4. PAYMENT INFORMATION
  // ==========================================
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
    index: true
  },
  paymentMethod: {
    type: String, // 'wallet', 'razorpay', 'online', 'cash', 'card', 'plan_benefit'
    default: null
  },
  paymentId: {
    type: String,
    default: null
  },
  razorpayOrderId: {
    type: String,
    default: null,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpayQrId: {
    type: String,
    default: null,
    index: true
  },

  // Cash Collection Details
  cashCollected: {
    type: Boolean,
    default: false
  },
  cashCollectedAt: {
    type: Date,
    default: null
  },
  cashCollectedBy: {
    type: String,
    enum: ['vendor', 'worker'],
    default: null
  },
  cashCollectorId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'cashCollectedBy',
    default: null
  },

  // ==========================================
  // 5. ADDRESS INFORMATION
  // ==========================================
  address: {
    type: { type: String, default: 'home' },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },

  // ==========================================
  // 6. SCHEDULING
  // ==========================================
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    index: true
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required']
  },
  timeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true },
    date: { type: String }, // redundant but kept for frontend convenience format
    time: { type: String }  // redundant but kept for frontend convenience format
  },

  // ==========================================
  // 7. STATUS & TRACKING
  // ==========================================
  bookingType: {
    type: String,
    enum: ['instant', 'scheduled'],
    default: 'scheduled',
    index: true
  },
  isEstimateBased: {
    type: Boolean,
    default: false
  },
  bookingModel: {
    type: String,
    enum: ['vendor', 'worker'],
    default: 'vendor'
  },
  // Consultancy Mode (Lead Generation)
  isConsultancyRequest: {
    type: Boolean,
    default: false
  },
  requirementText: {
    type: String,
    default: null
  },
  requirementImages: [{
    type: String
  }],
  status: {
    type: String,
    enum: Object.values(BOOKING_STATUS),
    default: BOOKING_STATUS.PENDING,
    index: true
  },
  // Worker an admin has offered this booking to but who hasn't accepted yet.
  // `workerId` stays empty until they accept, so the job isn't "assigned" and
  // the worker isn't marked busy before they've said yes.
  adminAssignedWorkerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null
  },
  // How the current worker got the job: 'broadcast' (offer + accept), 'auto'
  // (slot bookings go straight to an available worker) or 'admin'.
  assignmentMode: {
    type: String,
    enum: ['broadcast', 'auto', 'admin'],
    default: 'broadcast'
  },

  // ---- Advance payment (collected before the booking is dispatched) ----
  // 'none'     no advance needed (free / plan covered) — dispatched immediately
  // 'awaiting' advance not paid yet — the booking is NOT sent to any worker
  // 'paid'     advance received — booking has been dispatched
  advanceStatus: {
    type: String,
    enum: ['none', 'awaiting', 'paid'],
    default: 'none',
    index: true
  },
  advanceRequired: { type: Number, default: 0 },   // service part due up front
  advancePaid: { type: Number, default: 0 },       // service part actually paid
  advancePaymentId: { type: String, default: null },
  advancePaidAt: { type: Date, default: null },

  // ---- VIP membership offered at checkout ----
  vipDiscount: { type: Number, default: 0 },       // taken off the service price
  vipFee: { type: Number, default: 0 },            // membership price, paid with the advance
  vip: {
    added: { type: Boolean, default: false },      // bought with this booking
    member: { type: Boolean, default: false },     // already a member (no fee)
    planName: { type: String, default: '' },
    percent: { type: Number, default: 0 },
    durationDays: { type: Number, default: 0 },
    activated: { type: Boolean, default: false }   // membership switched on after payment
  },

  // ---- Extra workers added by admin on the lead worker's request ----
  // Extra workers admin added (and the payout each earns). Hidden from every
  // query unless a caller asks for them with .select('+helpers +helperRequests'),
  // so a payout can't leak through an endpoint that returns a whole booking.
  helperRequests: {
    type: [{
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    count: { type: Number, default: 1 },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'fulfilled', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    handledAt: { type: Date, default: null },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    note: { type: String, default: '' }
  }],
    select: false
  },
  helpers: {
    type: [{
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    addedAt: { type: Date, default: Date.now },
    // What the helper earns for this job. Only the admin ever sees it; it is
    // credited to the helper's wallet when the job completes.
    payoutAmount: { type: Number, default: 0 },
    payoutStatus: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
    paidAt: { type: Date, default: null }
  }],
    select: false
  },

  workerResponse: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'ADMIN_ASSIGNED', 'AUTO_ASSIGNED'],
    default: 'PENDING'
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    default: null,
    index: true
  },
  zoneName: {
    type: String,
    default: null,
    index: true
  },
  rejectionReason: {
    type: String,
    default: null
  },
  // Timestamps
  acceptedAt: { type: Date, default: null },
  workerAcceptedAt: { type: Date, default: null },
  assignedAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  journeyStartedAt: { type: Date, default: null },
  visitedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },

  // ==========================================
  // 8. SECURITY & OTPs
  // ==========================================
  visitOtp: {
    type: String,
    select: false
  },
  paymentOtp: {
    type: String,
    select: false
  },
  customerConfirmationOTP: {
    type: String,
    default: null
  },
  customerConfirmed: {
    type: Boolean,
    default: false
  },

  // ==========================================
  // 9. WORK COMPLETION
  // ==========================================
  // ==========================================
  // 9. WORK COMPLETION
  // ==========================================
  workPhotos: [{
    type: String
  }],
  visitLocation: {
    lat: Number,
    lng: Number,
    address: String,
    verifiedAt: Date
  },
  workDoneDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Note: Detailed billing (items/parts) is now handled by VendorBill model
  // workDoneDetails and extraCharges are deprecated in favor of VendorBill

  // ==========================================
  // 10. CANCELLATION
  // ==========================================
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  cancelledBy: { type: String, default: null },

  // ==========================================
  // 11. REVIEW & RATING
  // ==========================================
  rating: { type: Number, default: null, min: 1, max: 5 },
  review: { type: String, default: null },
  reviewImages: [{ type: String }],
  reviewedAt: { type: Date, default: null },

  // ==========================================
  // 12. SETTLEMENT (Worker/User)
  // ==========================================
  // What the lead worker was credited for the service after the helper split
  // (null until credited). Lets completion reconcile if a helper joined later.
  leadPayoutCredited: { type: Number, default: null },
  workerPaymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'SUCCESS'],
    default: 'PENDING'
  },
  isWorkerPaid: { type: Boolean, default: false },
  workerPaidAt: { type: Date, default: null },
  finalSettlementStatus: {
    type: String,
    enum: ['PENDING', 'DONE'],
    default: 'PENDING'
  },

  // ==========================================
  // 13. NOTES
  // ==========================================
  vendorNotes: { type: String, default: null },
  workerNotes: { type: String, default: null }

}, {
  timestamps: true
});

// Generate unique booking number
bookingSchema.post('save', function (doc) {
  // Helpers are paid when the job completes; a cancelled job pays nobody. Both
  // are no-ops (one cheap query) for bookings without helpers.
  const status = doc.status;
  if (!doc.$locals?.statusChanged || !['completed', 'cancelled'].includes(status)) return;
  import('../services/helperPayoutService.js')
    .then((m) => (status === 'completed' ? m.settleHelperPayouts(doc._id) : m.cancelHelperPayouts(doc._id)))
    .catch((err) => console.error('[HelperPayout] hook failed:', err.message));
});

bookingSchema.pre('save', async function () {
  this.$locals.statusChanged = this.isModified('status');
  if (this.isNew && !this.bookingNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingNumber = `BK${timestamp}${random}`;
  }
});

// Core compound indexes
bookingSchema.index({ userId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ workerId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });
bookingSchema.index({ paymentStatus: 1, status: 1 });

// ── PERFORMANCE INDEXES (added for wave-scheduler & dashboard queries) ──
// Scheduler: Booking.find({ status: 'searching', waveStartedAt: { $ne: null } })
bookingSchema.index({ status: 1, waveStartedAt: 1 });
// Reject/Accept: Booking.findOne({ notifiedVendors: vendorId, status: ... })
bookingSchema.index({ notifiedVendors: 1, status: 1 });
// Wave filter: potentialVendors.vendorId lookup
bookingSchema.index({ 'potentialVendors.vendorId': 1 });
// Dashboard: $or on { vendorId: null, serviceCategory: ..., status: ... }
bookingSchema.index({ vendorId: 1, serviceCategory: 1, status: 1 });
// Sort by createdAt
bookingSchema.index({ createdAt: -1 });

const HomeServiceBooking = mongoose.model('HomeServiceBooking', bookingSchema);

export default HomeServiceBooking;
