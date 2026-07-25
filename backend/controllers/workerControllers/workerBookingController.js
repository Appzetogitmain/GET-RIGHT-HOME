import HomeServiceBooking from '../../models/HomeServiceBooking.js';
import { validationResult } from 'express-validator';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../../utils/constants.js';
import { createNotification } from '../notificationControllers/notificationController.js';
import Worker from '../../models/Worker.js';
import Vendor from '../../models/Partner.js';
import Transaction from '../../models/Transaction.js';
import BookingRequest from '../../models/HomeServiceBookingRequest.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PlatformSettings from '../../models/PlatformSettings.js';
import Settings from '../../models/Settings.js';
import VendorBill from '../../models/VendorBill.js';
import { checkAndAwardTargetBonus } from '../../utils/targetBonusUtil.js';

/**
 * Get assigned jobs for worker
 */
const getAssignedJobs = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { status, page = 1, limit = 100 } = req.query;

    // Build query
    const query = { workerId };
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await HomeServiceBooking.find(query)
      .select('-serviceImages -requirementImages -workPhotos -reviewImages')
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone')
      .populate('serviceId', 'title iconUrl')
      .populate('categoryId', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await HomeServiceBooking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get assigned jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs. Please try again.'
    });
  }
};

/**
 * Get job details by ID
 */
const getJobById = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId })
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone email address')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job. Please try again.'
    });
  }
};

/**
 * Update job status
 */
const updateJobStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const workerId = req.user.id;
    const { id } = req.params;
    const { status, finalSettlementStatus, workerPaymentStatus } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Validate status transition if status is changing
    if (status && status !== booking.status) {
      const validTransitions = {
        [BOOKING_STATUS.ASSIGNED]: [BOOKING_STATUS.VISITED, BOOKING_STATUS.IN_PROGRESS],
        [BOOKING_STATUS.CONFIRMED]: [BOOKING_STATUS.ASSIGNED, BOOKING_STATUS.IN_PROGRESS],
        [BOOKING_STATUS.VISITED]: [BOOKING_STATUS.WORK_DONE, BOOKING_STATUS.COMPLETED],
        [BOOKING_STATUS.IN_PROGRESS]: [BOOKING_STATUS.WORK_DONE, BOOKING_STATUS.COMPLETED],
        [BOOKING_STATUS.WORK_DONE]: [BOOKING_STATUS.COMPLETED],
        [BOOKING_STATUS.JOURNEY_STARTED]: [BOOKING_STATUS.VISITED, BOOKING_STATUS.IN_PROGRESS]
      };

      if (!validTransitions[booking.status]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${booking.status} to ${status}`
        });
      }

      // Update booking status
      booking.status = status;

      if (status === BOOKING_STATUS.IN_PROGRESS && !booking.startedAt) {
        booking.startedAt = new Date();
      }

      if (status === BOOKING_STATUS.VISITED && !booking.startedAt) {
        booking.startedAt = new Date();
      }

      if (status === BOOKING_STATUS.COMPLETED) {
        booking.completedAt = new Date();
      }

      // Emit socket event for real-time update to user
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${String(booking.userId)}`).emit('booking_updated', {
          bookingId: String(booking._id),
          status: booking.status,
          message: `Job status updated to ${booking.status}`
        });
      }

      // Add Push Notification for User

      if (status === BOOKING_STATUS.IN_PROGRESS) {
        await createNotification({
          userId: booking.userId,
          type: 'work_started',
          title: 'Work In Progress',
          message: 'Professional has started working on your service.',
          relatedId: booking._id,
          relatedType: 'booking',
          priority: 'high',
          pushData: { type: 'in_progress', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
        });
      }

    }

    // Update additional fields
    if (finalSettlementStatus) booking.finalSettlementStatus = finalSettlementStatus;
    if (workerPaymentStatus) {
      booking.workerPaymentStatus = workerPaymentStatus;
      if (workerPaymentStatus === 'PAID' || workerPaymentStatus === 'SUCCESS') {
        booking.isWorkerPaid = true;
        booking.workerPaidAt = booking.workerPaidAt || new Date();
      }
    }

    await booking.save();

    if (status === BOOKING_STATUS.WORK_DONE || status === BOOKING_STATUS.COMPLETED) {
      checkAndAwardTargetBonus(booking.workerId).catch(err => console.error('[Target Bonus] error in updateJobStatus:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Job status updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status. Please try again.'
    });
  }
};

/**
 * Mark job as started (Journey Started)
 */
const startJob = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (booking.status !== BOOKING_STATUS.ASSIGNED && booking.status !== BOOKING_STATUS.CONFIRMED && booking.status !== BOOKING_STATUS.ACCEPTED) {
      return res.status(400).json({
        success: false,
        message: `Cannot start journey with status: ${booking.status}`
      });
    }

    // Generate Visit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update booking
    booking.status = BOOKING_STATUS.JOURNEY_STARTED;
    booking.journeyStartedAt = new Date();
    booking.visitOtp = otp; // In production, hash this!

    await booking.save();

    // Notify user with OTP
    await createNotification({
      userId: booking.userId,
      type: 'worker_started',
      title: 'Worker Started Journey',
      message: `Worker is on the way! specific OTP for site visit verification is: ${otp}. Please share this with worker upon arrival.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: {
        type: 'journey_started',
        bookingId: booking._id.toString(),
        visitOtp: otp,
        link: `/user/booking/${booking._id}`
      }
    });

    // Notify vendor
    await createNotification({
      vendorId: booking.vendorId,
      type: 'worker_started',
      title: 'Worker Started Journey',
      message: `Your worker has started the journey for booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: {
        type: 'journey_started',
        bookingId: booking._id.toString(),
        link: `/vendor/bookings/${booking._id}`
      }
    });

    // Explicitly emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(booking.userId)}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: BOOKING_STATUS.JOURNEY_STARTED,
        visitOtp: otp
      });

      // Socket notification removed - createNotification already handles this
    }

    res.status(200).json({
      success: true,
      message: 'Journey started, OTP sent to user',
      data: booking
    });
  } catch (error) {
    console.error('Start job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start job. Please try again.'
    });
  }
};

/**
 * Worker Reached Location
 * Notify user to share OTP
 */
const workerReachedLocation = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;

    // Need visitOtp to resend it
    const booking = await HomeServiceBooking.findOne({ _id: id, workerId }).select('+visitOtp');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (booking.status !== BOOKING_STATUS.JOURNEY_STARTED) {
      return res.status(400).json({ success: false, message: 'Journey not started yet' });
    }

    const otp = booking.visitOtp;

    // Notify user
    await createNotification({
      userId: booking.userId,
      type: 'vendor_reached',
      title: 'Professional has Reached!',
      message: `Professional has reached your location. Please share this OTP: ${otp}`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: {
        type: 'vendor_reached',
        bookingId: booking._id.toString(),
        visitOtp: otp,
        link: `/user/booking/${booking._id}`
      }
    });

    // Explicitly emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(booking.userId)}`).emit('worker_reached', {
        bookingId: String(booking._id),
        status: booking.status,
        visitOtp: otp,
        type: 'worker_reached',
        message: 'Professional has reached your location. Please share the OTP.'
      });
      // Also emit general update
      io.to(`user_${String(booking.userId)}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: booking.status,
        visitOtp: otp
      });
    }

    res.status(200).json({ success: true, message: 'User notified that professional reached' });
  } catch (error) {
    console.error('Worker reached location error:', error);
    res.status(500).json({ success: false, message: 'Failed to notify user' });
  }
};

/**
 * Verify Site Visit with OTP
 */
const verifyVisit = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;
    const { otp, location } = req.body;

    // Use query to select visitOtp which is usually hidden
    const booking = await HomeServiceBooking.findOne({ _id: id, workerId }).select('+visitOtp');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (booking.status !== BOOKING_STATUS.JOURNEY_STARTED) {
      return res.status(400).json({ success: false, message: 'Worker has not started journey yet' });
    }

    if (booking.visitOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Update status
    booking.status = BOOKING_STATUS.VISITED;
    booking.visitedAt = new Date();
    booking.startedAt = new Date(); // Legacy compatibility
    booking.visitOtp = undefined; // Clear OTP
    if (location) {
      booking.visitLocation = {
        ...location,
        verifiedAt: new Date()
      };
    }

    await booking.save();

    // Notify user
    // Notify user
    await createNotification({
      userId: booking.userId,
      type: 'visit_verified',
      title: 'Visit Verified',
      message: `The professional has arrived and verified the visit. Service is now in progress.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high', // Ensure high priority
      pushData: {
        type: 'visit_verified',
        bookingId: booking._id.toString(),
        link: `/user/booking/${booking._id}`
      }
    });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(booking.userId)}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: booking.status,
        message: 'Visit verified successful'
      });
      // Socket notification removed - createNotification already handles this
    }

    res.status(200).json({
      success: true,
      message: 'Site visit verified successfully',
      data: booking
    });
  } catch (error) {
    console.error('Verify visit error:', error);
    res.status(500).json({ success: false, message: 'Failed to verifying visit' });
  }
};

/**
 * Mark job as completed (Work Done) & Generate Payment OTP
 */
const completeJob = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;
    const { workPhotos, workDoneDetails } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (booking.status !== BOOKING_STATUS.VISITED && booking.status !== BOOKING_STATUS.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete job with status: ${booking.status}`
      });
    }

    // Update booking
    booking.status = BOOKING_STATUS.WORK_DONE;

    if (workPhotos && Array.isArray(workPhotos)) {
      booking.workPhotos = workPhotos;
    }
    if (workDoneDetails) {
      booking.workDoneDetails = workDoneDetails;
    }

    await booking.save();

    // 1. Notify user that work is completed and billing is being prepared
    await createNotification({
      userId: booking.userId,
      type: 'work_completed',
      title: 'Work Completed',
      message: `Work finished! Please wait while the professional prepares the final bill.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: {
        type: 'work_completed',
        bookingId: booking._id.toString(),
        link: `/user/booking/${booking._id}`
      }
    });

    // Notify vendor
    await createNotification({
      vendorId: booking.vendorId,
      type: 'worker_completed',
      title: 'Work Done',
      message: `Your worker has marked work as done for booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: {
        type: 'worker_completed',
        bookingId: booking._id.toString(),
        link: `/vendor/bookings/${booking._id}`
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(booking.userId)}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: BOOKING_STATUS.WORK_DONE
      });
    }

    res.status(200).json({
      success: true,
      message: 'Work done marked, OTP sent to user',
      data: booking
    });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete job. Please try again.'
    });
  }
};

/**
 * Get Bill for Booking
 */
const getBill = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const bill = await VendorBill.findOne({ bookingId: booking._id });
    
    // Fetch Platform Settings
    const platformSettings = await PlatformSettings.getSettings();

    res.status(200).json({ success: true, bill, platformSettings });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bill' });
  }
};

/**
 * Create or Update Bill
 */
const createBill = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;
    const { services, parts, customItems, transportCharges, applyPartsGST } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId }).select('+paymentOtp');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Calculate totals (simplified version of frontend logic)
    let totalServiceValue = 0;
    let totalPartsValue = 0;
    let totalServiceGST = 0;
    let totalPartsGST = 0;

    const [financialSettings, platformSettings] = await Promise.all([
      Settings.findOne({ type: 'global' }),
      PlatformSettings.getSettings()
    ]);
    const serviceGstPct = financialSettings?.serviceGstPercentage || 0;
    const partsGstPct = financialSettings?.partsGstPercentage || 0;
    const globalApplyGst = platformSettings?.applyGst || false;

    if (services) {
      services.forEach(s => {
        const val = (Number(s.price) || 0) * (Number(s.quantity) || 1);
        totalServiceValue += val;
        totalServiceGST += globalApplyGst ? (val * serviceGstPct) / 100 : 0;
      });
    }

    if (parts) {
      parts.forEach(p => {
        const val = (Number(p.price) || 0) * (Number(p.quantity) || 1);
        totalPartsValue += val;
        if (applyPartsGST && globalApplyGst) totalPartsGST += (val * partsGstPct) / 100;
      });
    }

    if (customItems) {
      customItems.forEach(c => {
        const val = (Number(c.price) || 0) * (Number(c.quantity) || 1);
        if (c.type === 'service') {
          totalServiceValue += val;
          totalServiceGST += globalApplyGst ? (val * serviceGstPct) / 100 : 0;
        } else {
          totalPartsValue += val;
          if (applyPartsGST && globalApplyGst) totalPartsGST += (val * partsGstPct) / 100;
        }
      });
    }

    const visitingCharges = 0;
    const transport = Number(transportCharges) || 0;
    
    // IMPORTANT: booking.basePrice = FULL original service price (e.g. 100)
    // booking.discount / booking.promoDiscount = discount amount (e.g. 10)
    // Discount applies ONLY to platform fee — NOT to the worker's cut.
    const trueOriginalServiceBase = booking.basePrice || booking.totalAmount || 0;
    const baseDiscount = booking.discount || 0;
    const promoDiscount = booking.promoDiscount || 0;
    const totalDiscount = baseDiscount + promoDiscount;
    
    // Fetch Platform Settings
    const isEstimate = booking.isEstimateBased;
    const platformFlatFee = isEstimate ? 0 : (platformSettings?.platformFlatFee ?? 20);
    const cashExtraFee = isEstimate ? 0 : (platformSettings?.cashCollectionFee ?? 20);

    // Worker sees: basePrice - platformFee = 100 - 20 = 80
    const originalServiceBase = Math.max(0, trueOriginalServiceBase - platformFlatFee);
    const originalServiceGST = booking.tax || 0;
    
    // Grand total = worker's cut + extras + parts
    const grandTotal = originalServiceBase + originalServiceGST + totalServiceValue + totalServiceGST + totalPartsValue + totalPartsGST + transport;

    // Save Bill
    let bill = await VendorBill.findOne({ bookingId: booking._id });
    if (!bill) {
      bill = new VendorBill({
        bookingId: booking._id,
        workerId: workerId,
        vendorId: booking.vendorId,
        bookingNumber: booking.bookingNumber
      });
    }

    bill.services = services || [];
    bill.parts = parts || [];
    bill.customItems = customItems || [];
    bill.transportCharges = transport;
    bill.applyPartsGST = applyPartsGST;
    
    bill.originalServiceBase = originalServiceBase;
    bill.originalGST = originalServiceGST;
    
    bill.totalServiceValue = totalServiceValue;
    bill.totalPartsValue = totalPartsValue;
    bill.totalServiceGST = totalServiceGST;
    bill.totalPartsGST = totalPartsGST;
    bill.visitingCharges = visitingCharges;
    bill.grandTotal = grandTotal;
    
    // Discount reduces platform fee only: 20 - 10 = 10
    const adjustedPlatformFee = Math.max(0, platformFlatFee - totalDiscount);

    // Final online = worker's earnings + adjusted platform fee = 80 + 10 = 90
    const finalOnlineAmount = parseFloat((grandTotal + adjustedPlatformFee).toFixed(2));
    const finalCashAmount = parseFloat((finalOnlineAmount + cashExtraFee).toFixed(2));
    
    // Worker earning = grand total (their service cut)
    const workerEarning = grandTotal;

    bill.vendorTotalEarning = workerEarning;
    bill.adminCommission = adjustedPlatformFee;
    bill.cashCollectionFee = cashExtraFee;
    bill.finalOnlineAmount = finalOnlineAmount;
    bill.finalCashAmount = finalCashAmount;

    await bill.save();

    // Reuse existing Payment OTP or generate new one
    const payOtp = booking.paymentOtp || Math.floor(1000 + Math.random() * 9000).toString();
    booking.paymentOtp = payOtp;
    booking.customerConfirmationOTP = payOtp;

    // Set status to WORK_DONE and update final amounts on booking
    booking.finalAmount = finalOnlineAmount; // Default to online
    booking.finalOnlineAmount = finalOnlineAmount;
    booking.finalCashAmount = finalCashAmount;
    booking.status = BOOKING_STATUS.WORK_DONE;
    await booking.save();

    // Notify user with Final Bill and OTP
    await createNotification({
      userId: booking.userId,
      type: 'work_done',
      title: 'Billing Ready',
      message: `Bill Generated: ₹${grandTotal}. Your verification OTP is ${payOtp}. Please verify and share OTP to complete.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: {
        type: 'work_done',
        bookingId: booking._id.toString(),
        paymentOtp: payOtp,
        link: `/user/booking/${booking._id}`
      }
    }).catch(e => console.error('FCM/Notification error in createBill:', e));

    const io = req.app.get('io');
    if (io) {
      const userIdStr = String(booking.userId?._id || booking.userId);
      console.log(`[Socket] Emitting booking_updated to room: user_${userIdStr}`);
      io.to(`user_${userIdStr}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: BOOKING_STATUS.WORK_DONE,
        customerConfirmationOTP: payOtp,
        paymentOtp: payOtp
      });
      console.log('[Socket] Emit successful');
    } else {
      console.log('[Socket] ERROR: io is undefined in createBill');
    }

    // Trigger target bonus evaluation asynchronously
    checkAndAwardTargetBonus(booking.workerId).catch(err => console.error('[Target Bonus] error:', err));

    res.status(200).json({ success: true, bill, message: 'Bill created successfully' });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ success: false, message: 'Failed to create bill' });
  }
};

/**
 * Collect Cash & Complete Booking
 * Uses VendorBill as the single source of truth for earnings.
 */
const collectCash = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id }).select('+paymentOtp');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const workerIdStr = String(booking.workerId?._id || booking.workerId || '');
    const vendorIdStr = String(booking.vendorId?._id || booking.vendorId || '');
    const currentUserId = String(req.user.id);
    if (workerIdStr !== currentUserId && vendorIdStr !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    // If booking is already completed (double-call), return success gracefully
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(200).json({ success: true, message: 'Payment already collected' });
    }

    const allowedStatuses = [BOOKING_STATUS.WORK_DONE, BOOKING_STATUS.VISITED, BOOKING_STATUS.IN_PROGRESS];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot collect payment with status: ${booking.status}` });
    }

    if (String(booking.paymentOtp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Fetch VendorBill (single source of truth)
    const bill = await VendorBill.findOne({ bookingId: booking._id });
    if (!bill) {
      return res.status(500).json({ success: false, message: 'Bill not found — cannot process payment' });
    }

    const grandTotal = Number(bill.grandTotal) || 0;
    const vendorEarning = Number(bill.vendorTotalEarning) || 0;

    // Update Booking Status
    booking.status = BOOKING_STATUS.COMPLETED;
    booking.paymentMethod = 'cash collected'; // Standardized label
    booking.paymentStatus = PAYMENT_STATUS.COLLECTED_BY_VENDOR;
    booking.cashCollected = true;
    booking.cashCollectedBy = 'worker';
    booking.cashCollectorId = workerId;
    booking.cashCollectedAt = new Date();
    booking.completedAt = new Date();
    booking.paymentOtp = undefined;
    booking.customerConfirmationOTP = null;
    await booking.save();

    // Mark bill as paid
    bill.status = 'paid';
    bill.paidAt = new Date();
    await bill.save();

    // Update Wallet based on Booking Model
    if (booking.bookingModel === 'worker') {
      const workerDoc = await Worker.findById(workerId);
      if (workerDoc) {
        const cashCollected = bill.finalCashAmount || grandTotal;
        const workerEarning = bill.vendorTotalEarning || grandTotal;
        const platformFees = (bill.adminCommission || 0) + (bill.cashCollectionFee || 0);

        workerDoc.wallet.totalCashCollected = (workerDoc.wallet.totalCashCollected || 0) + cashCollected;
        workerDoc.wallet.earnings = (workerDoc.wallet.earnings || 0) + workerEarning;
        workerDoc.wallet.dues = (workerDoc.wallet.dues || 0) + platformFees;
        await workerDoc.save();

        // Create a transaction record for the cash collection
        const Transaction = (await import('../../models/Transaction.js')).default;
        await Transaction.create({
          workerId: workerId,
          amount: cashCollected,
          type: 'credit',
          category: 'cash_collected',
          balanceAfter: workerDoc.wallet.earnings, // Earnings act as the balance scale here
          status: 'completed',
          description: `Cash Collected for booking #${booking.bookingNumber}`,
          bookingId: booking._id,
          reference: booking._id.toString()
        });
      }
    } else if (booking.vendorId) {
      // Legacy Vendor Logic (already exists)
      const vendorDoc = await Vendor.findById(booking.vendorId).select('wallet');
      if (vendorDoc) {
        const currentDues = (vendorDoc.wallet.dues || 0) + grandTotal;
        const cashLimit = vendorDoc.wallet.cashLimit || 10000;
        const netOwed = currentDues - ((vendorDoc.wallet.earnings || 0) + vendorEarning);
        const isBlocked = netOwed > cashLimit;

        const updateQuery = {
          $inc: {
            'wallet.dues': grandTotal,
            'wallet.earnings': vendorEarning,
            'wallet.totalCashCollected': grandTotal
          }
        };

        if (isBlocked) {
          updateQuery.$set = {
            'wallet.isBlocked': true,
            'wallet.blockedAt': new Date(),
            'wallet.blockReason': `Cash limit exceeded. Net owed: ₹${netOwed.toFixed(2)}, Limit: ₹${cashLimit}`
          };
        }

        await Vendor.findByIdAndUpdate(booking.vendorId, updateQuery);

        // Transaction tracking for cash collection is currently unsupported by the Transaction schema
        // and throws 500 error due to schema validation. Wallet balances are updated directly above via findByIdAndUpdate.
      }
    }

    // Notify User
    const userIdForNotif = String(booking.userId?._id || booking.userId);
    await createNotification({
      userId: userIdForNotif,
      type: 'payment_received',
      title: 'Payment Received (Cash)',
      message: `Payment of ₹${grandTotal} received in cash for booking ${booking.bookingNumber}. Job Completed. Thanks!`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    });

    // Emit socket event to user for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userIdForNotif}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: BOOKING_STATUS.COMPLETED,
        paymentStatus: PAYMENT_STATUS.COLLECTED_BY_VENDOR,
        cashCollected: true,
        message: 'Payment received. Job completed!'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cash collected and job completed',
      data: booking
    });

  } catch (error) {
    console.error('Collect cash error:', error);
    res.status(500).json({ success: false, message: 'Failed to collect cash' });
  }
};

/**
 * Add worker notes to booking
 */
const addWorkerNotes = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const workerId = req.user.id;
    const { id } = req.params;
    const { notes } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Update booking
    booking.workerNotes = notes;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Notes added successfully',
      data: booking
    });
  } catch (error) {
    console.error('Add worker notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add notes. Please try again.'
    });
  }
};
/**
 * Respond to job (Accept/Reject)
 */
const respondToJob = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const workerId = req.user.id;

  console.log(`[WorkerAction] respondToJob - ID: ${id}, Status: ${status}, Worker: ${workerId}`);

  try {
    if (id === 'test-id') {
      const safeStatus = status ? status.toLowerCase() : 'unknown';
      return res.status(200).json({ success: true, message: `Job ${safeStatus} (test mode)` });
    }

    // Find the booking by ID
    // In Direct Worker Model, workerId might not be set yet on the Booking itself
    const booking = await HomeServiceBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Check if job is already taken by someone else
    if (booking.workerId && booking.workerId.toString() !== workerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'This job has already been accepted by another professional.'
      });
    }

    // Security: Check if this worker was actually notified/requested for this booking
    // Optional but recommended for production
    const request = await BookingRequest.findOne({ bookingId: id, workerId });
    if (!request && !booking.workerId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this job.'
      });
    }

    // Idempotency check: If already in desired state, return success without re-notifying
    if (status === 'ACCEPTED' && booking.workerResponse === 'ACCEPTED') {
      return res.status(200).json({ success: true, message: 'Job already accepted', data: booking });
    }

    if (status === 'REJECTED' && booking.workerResponse === 'REJECTED') {
      return res.status(200).json({ success: true, message: 'Job already rejected', data: booking });
    }

    if (status === 'ACCEPTED') {
      booking.status = BOOKING_STATUS.ASSIGNED;
      booking.workerId = workerId; // Assign the worker
      booking.bookingModel = 'worker'; // Ensure model is set
      booking.workerAcceptedAt = new Date();
      booking.workerResponse = 'ACCEPTED';


      // Notify Vendor
      await createNotification({
        vendorId: booking.vendorId,
        type: 'job_accepted',
        title: 'Worker Accepted Job',
        message: `Worker has accepted job ${booking.bookingNumber}`,
        relatedId: booking._id,
        relatedType: 'booking'
      });

      // Fetch worker details for personalized notification
      const worker = await Worker.findById(workerId).select('name phone profilePhoto rating');

      // Notify User
      await createNotification({
        userId: booking.userId,
        type: 'worker_accepted',
        title: 'Professional Confirmed!',
        message: `${worker?.name || 'A professional'} has accepted your booking and is preparing for the job.`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high',
        pushData: { type: 'worker_accepted', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
      });

      // --- SOCKET EMISSION ---
      // Notify user via socket so the searching modal closes
      const io = req.app.get('io');
      if (io && worker) {
        io.to(`user_${booking.userId}`).emit('booking_accepted', {
          bookingId: booking._id,
          worker: {
            id: worker._id,
            name: worker.name,
            phone: worker.phone,
            profilePhoto: worker.profilePhoto,
            rating: worker.rating
          }
        });
      }

      // Notify worker for confirmation
      await createNotification({
        workerId: workerId,
        type: 'job_accepted',
        title: 'Job Confirmed!',
        message: `You have successfully accepted booking #${booking.bookingNumber}. Scheduled for ${new Date(booking.scheduledDate).toLocaleDateString()} at ${booking.scheduledTime}.`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high',
        pushData: { type: 'job_accepted', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
      });


    } else if (status === 'REJECTED') {
      // Find the specific request and mark it REJECTED
      const reqEntry = await BookingRequest.findOne({ bookingId: id, workerId });
      if (reqEntry) {
        reqEntry.status = 'REJECTED';
        reqEntry.respondedAt = new Date();
        await reqEntry.save();
      }

      booking.workerId = null;
      // Do NOT set to CONFIRMED. Keep it SEARCHING so the Wave Scheduler can pick it up.
      // The only exception is if ALL waves have exhausted, which the scheduler will handle.
      booking.status = BOOKING_STATUS.SEARCHING;

      await createNotification({
        vendorId: booking.vendorId,
        type: 'job_rejected',
        title: 'Worker Declined Job',
        message: `A worker declined job ${booking.bookingNumber}, finding next available.`,
        relatedId: booking._id,
        relatedType: 'booking'
      });
    }

    await booking.save();
    res.status(200).json({ success: true, message: `Job ${status.toLowerCase()}`, data: booking });

  } catch (error) {
    console.error('Respond job error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to job' });
  }
};

const initiateOnlineCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await HomeServiceBooking.findById(id).select('+paymentOtp');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payOtp = booking.paymentOtp || Math.floor(1000 + Math.random() * 9000).toString();
    booking.paymentOtp = payOtp;
    booking.customerConfirmationOTP = payOtp;
    booking.qrPaymentInitiated = true;
    await booking.save();

    const amount = booking.finalAmount || 0;
    const upiUrl = `upi://pay?pa=hoomzoteam@ybl&pn=Hoomzo&am=${amount}&cu=INR&tn=HoomzoBooking_${booking.bookingNumber}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: BOOKING_STATUS.WORK_DONE,
        customerConfirmationOTP: payOtp,
        paymentOtp: payOtp,
        qrPaymentInitiated: true,
        finalAmount: amount
      });
    }

    res.status(200).json({
      success: true,
      data: {
        qrImageUrl,
        qrCodeData: upiUrl
      }
    });
  } catch (error) {
    console.error('Initiate online collection error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate online payment' });
  }
};

const verifyOnlineCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await HomeServiceBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isPaid = booking.paymentStatus === 'paid' || booking.paymentStatus === 'SUCCESS';
    if (isPaid) {
      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Payment not yet confirmed' });
    }
  } catch (error) {
    console.error('Verify online collection error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment status' });
  }
};

const initiateCashCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await HomeServiceBooking.findById(id).select('+paymentOtp');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payOtp = booking.paymentOtp || Math.floor(1000 + Math.random() * 9000).toString();
    booking.paymentOtp = payOtp;
    booking.customerConfirmationOTP = payOtp;
    await booking.save();

    const io = req.app.get('io');
    if (io) {
      const userIdStr = String(booking.userId?._id || booking.userId);
      io.to(`user_${userIdStr}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: BOOKING_STATUS.WORK_DONE,
        customerConfirmationOTP: payOtp,
        paymentOtp: payOtp
      });
    } else {
      console.log('[Socket] ERROR: io is undefined in collectCash');
    }

    // Trigger target bonus evaluation asynchronously
    checkAndAwardTargetBonus(booking.workerId).catch(err => console.error('[Target Bonus] error:', err));

    res.status(200).json({ success: true, message: 'Cash collection initiated, OTP sent' });
  } catch (error) {
    console.error('Initiate cash collection error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate cash collection' });
  }
};

const confirmManualOnlineCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id }).select('+paymentOtp');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.workerId?.toString() !== req.user.id && booking.vendorId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (booking.status !== BOOKING_STATUS.WORK_DONE) {
      return res.status(400).json({ success: false, message: 'Work is not marked as done yet' });
    }

    if (booking.paymentOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const bill = await VendorBill.findOne({ bookingId: booking._id });
    if (!bill) {
      return res.status(500).json({ success: false, message: 'Bill not found — cannot process payment' });
    }

    const grandTotal = Number(bill.grandTotal) || 0;
    const vendorEarning = Number(bill.vendorTotalEarning) || 0;

    booking.status = BOOKING_STATUS.COMPLETED;
    booking.paymentMethod = 'online';
    booking.paymentStatus = 'paid';
    booking.completedAt = new Date();
    booking.paymentOtp = undefined;
    booking.customerConfirmationOTP = null;
    await booking.save();

    bill.status = 'paid';
    bill.paidAt = new Date();
    await bill.save();

    // Update Wallet based on Booking Model
    if (booking.bookingModel === 'worker') {
      const workerDoc = await Worker.findById(booking.workerId);
      if (workerDoc) {
        workerDoc.wallet.balance = (workerDoc.wallet.balance || 0) + vendorEarning;
        workerDoc.wallet.earnings = (workerDoc.wallet.earnings || 0) + vendorEarning;
        await workerDoc.save();
      }
    } else if (booking.vendorId) {
      const vendorDoc = await Vendor.findById(booking.vendorId);
      if (vendorDoc) {
        vendorDoc.wallet.balance = (vendorDoc.wallet.balance || 0) + vendorEarning;
        vendorDoc.wallet.earnings = (vendorDoc.wallet.earnings || 0) + vendorEarning;
        await vendorDoc.save();
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(booking.userId?._id || booking.userId)}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: BOOKING_STATUS.COMPLETED,
        paymentStatus: 'paid'
      });
    }

    res.status(200).json({ success: true, message: 'Payment manually confirmed successfully' });
  } catch (error) {
    console.error('Confirm manual online error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm manual payment' });
  }
};

/**
 * Generate Estimate (Option 2)
 */
const generateEstimate = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;
    const { estimatedAmount, estimateDescription } = req.body;

    if (!estimatedAmount || estimatedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid estimated amount is required' });
    }

    const booking = await HomeServiceBooking.findOne({ _id: id, workerId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or not assigned to you' });
    }

    if (booking.status !== BOOKING_STATUS.VISITED && booking.status !== BOOKING_STATUS.IN_PROGRESS && booking.status !== BOOKING_STATUS.ESTIMATE_PROVIDED) {
      return res.status(400).json({ success: false, message: 'Estimate can only be generated when status is visited or in_progress' });
    }

    // Token logic: 30% of total estimate
    const tokenAmount = Math.round(Number(estimatedAmount) * 0.3);
    const adminCommission = Math.round(Number(estimatedAmount) * 0.2); // 20% of total
    const workerAdvance = tokenAmount - adminCommission;

    booking.estimate = {
      amount: Number(estimatedAmount),
      description: estimateDescription,
      tokenAmount: tokenAmount,
      adminCommission: adminCommission,
      workerAdvance: workerAdvance,
      status: 'PENDING',
      generatedAt: new Date()
    };

    // We don't overwrite basePrice or finalAmount yet. 
    // They get updated ONLY when the customer approves.
    booking.status = BOOKING_STATUS.ESTIMATE_PROVIDED;
    
    await booking.save();

    // Notify User
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(booking.userId?._id || booking.userId)}`).emit('booking_updated', {
        bookingId: String(booking._id),
        status: BOOKING_STATUS.ESTIMATE_PROVIDED,
        estimatedAmount: booking.finalAmount,
        tokenAmount: booking.userPayableAmount
      });
      // push notification to user
      try {
        const notificationService = (await import('../../../services/notificationService.js')).default;
        await notificationService.sendToUser(booking.userId, {
          title: 'Estimate Received',
          body: `Worker has provided an estimate of ₹${booking.finalAmount} for your job. Please pay the token to start work.`,
          data: { type: 'estimate', bookingId: String(booking._id) }
        });
      } catch (err) {
        console.error('Error sending push notification for estimate:', err);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Estimate sent successfully',
      booking
    });
  } catch (error) {
    console.error('Generate estimate error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate estimate' });
  }
};

export { 
  getAssignedJobs,
  getJobById,
  updateJobStatus,
  startJob,
  completeJob,
  addWorkerNotes,
  verifyVisit,
  workerReachedLocation,
  collectCash,
  respondToJob,
  getBill,
  createBill,
  initiateOnlineCollection,
  verifyOnlineCollection,
  initiateCashCollection,
  confirmManualOnlineCollection,
  generateEstimate
 };
