import HomeServiceBooking from '../../models/HomeServiceBooking.js';
import { validationResult } from 'express-validator';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../../utils/constants.js';
import { createNotification } from '../notificationControllers/notificationController.js';
import Worker from '../../models/Worker.js';
import Vendor from '../../models/Partner.js';
import Transaction from '../../models/Transaction.js';
import BookingRequest from '../../models/HomeServiceBookingRequest.js';
import { getIO } from '../../sockets.js';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import PlatformSettings from '../../models/PlatformSettings.js';
import Settings from '../../models/Settings.js';
import VendorBill from '../../models/VendorBill.js';
import { checkAndAwardTargetBonus } from '../../utils/targetBonusUtil.js';
import referralService from '../../services/referralService.js';
import { findWorkerConflict, findWorkerUnavailability, getBufferMinutes, describeConflict, getBookingWindow } from '../../utils/slotAvailability.js';
import { REMINDABLE_STATUSES, buildReminderPayload } from '../../cron/jobReminderScheduler.js';
import {
  claimWorkerCapacity,
  findWorkerActiveJob,
  syncWorkerCapacityStatus
} from '../../services/workerCapacityService.js';
import { supportsBookingMode } from '../../utils/bookingModes.js';

/**
 * Records how one worker responded to a booking offer.
 *
 * Updates the existing attempt row where there is one (the wave scheduler
 * creates it when the offer goes out) and otherwise appends — bookings created
 * before attempt-tracking existed, and wave-1 offers, have no row yet.
 * Mutates `booking`; the caller saves.
 */
const recordAssignmentOutcome = (booking, workerId, outcome, reason = '') => {
  booking.assignmentAttempts = booking.assignmentAttempts || [];
  const existing = booking.assignmentAttempts.find(
    (a) => String(a.workerId) === String(workerId) && a.outcome === 'notified'
  );
  if (existing) {
    existing.outcome = outcome;
    existing.respondedAt = new Date();
    if (reason) existing.reason = reason;
    return;
  }
  booking.assignmentAttempts.push({
    workerId,
    notifiedAt: new Date(),
    respondedAt: new Date(),
    outcome,
    reason
  });
};

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

    // This list showed the raw booking `finalAmount` — the customer's full
    // bill — as if it were what the worker earns, which overstates it by
    // the platform's commission cut. Every other worker-facing screen
    // (job-alert preview, pending-requests list, createBill) already shows
    // the commission-adjusted amount; this was the one place still showing
    // the customer's number instead of the worker's own.
    const platformSettings = await PlatformSettings.getSettings();
    const commissionPercentage = platformSettings?.defaultCommission ?? 10;
    const bookingIds = bookings.map(b => b._id);
    const bills = await VendorBill.find({ bookingId: { $in: bookingIds } }).select('bookingId vendorTotalEarning').lean();
    const billByBookingId = new Map(bills.map(b => [String(b.bookingId), b]));

    const bookingsWithWorkerAmount = bookings.map(b => {
      const obj = b.toObject();
      const bill = billByBookingId.get(String(b._id));
      // A finalized bill (job billed/completed) is the real, authoritative
      // earning — parts/extra items can make it differ from the plain
      // percentage estimate. Otherwise fall back to the same estimate the
      // worker already saw before accepting.
      obj.workerAmount = bill
        ? bill.vendorTotalEarning
        : Math.max(0, parseFloat((((b.basePrice || b.finalAmount || 0) * (100 - commissionPercentage)) / 100).toFixed(2)));
      return obj;
    });

    res.status(200).json({
      success: true,
      data: bookingsWithWorkerAmount,
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
 * Get this worker's still-open job offers (BookingRequests they were sent
 * that are still PENDING and unexpired) — the fetch-on-load counterpart to
 * the real-time 'new_booking_request'/'new_job_assigned' socket events.
 * The popup a worker sees for a new job is normally pushed live over
 * socket.io the moment a booking is created, but that only reaches a worker
 * whose app happened to already be open and fully connected at that exact
 * instant; a page that was still loading, backgrounded, or reconnecting
 * misses it with no way to recover. Calling this on app mount (and on
 * window focus/reconnect) lets the worker "catch up" on anything they
 * missed instead of the offer silently vanishing until the next new job.
 */
const getPendingRequests = async (req, res) => {
  try {
    const workerId = req.user.id;

    // A worker holding a job must not see any other offer until WORK_DONE.
    const activeJob = await findWorkerActiveJob(workerId);
    if (activeJob) {
      await syncWorkerCapacityStatus(workerId);
      return res.status(200).json({ success: true, data: [], isBusy: true, activeBookingId: activeJob._id });
    }

    const requests = await BookingRequest.find({
      workerId,
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    }).sort({ sentAt: -1 }).lean();

    if (requests.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const bookingIds = requests.map(r => r.bookingId);
    // Show offers for bookings that are still LOOKING for a worker. Once one is
    // accepted or cancelled the status moves on and the offer disappears, even
    // if this worker's own request row hasn't expired yet.
    //
    // manual_assignment_required (and its legacy names) must be included: the
    // booking is still active and still needs a professional — ops is just
    // helping. Restricting this to SEARCHING meant that ~2 minutes after
    // booking, once the waves were exhausted, the job vanished from every
    // worker's panel and only an admin could assign it. A worker who came free
    // shortly afterwards could no longer pick it up.
    const openForWorkStatuses = [
      BOOKING_STATUS.SEARCHING,
      BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
      BOOKING_STATUS.NO_WORKERS,
      BOOKING_STATUS.NO_VENDORS
    ];
    const bookings = await HomeServiceBooking.find({
      _id: { $in: bookingIds },
      status: { $in: openForWorkStatuses }
    }).populate('userId', 'name phone').lean();
    // Don't surface offers this worker couldn't accept anyway because they
    // already hold a job inside the slot buffer.
    const bufferMinutes = await getBufferMinutes();
    const offerable = [];
    for (const b of bookings) {
      if (!(await findWorkerConflict(workerId, b, { bufferMinutes }))) offerable.push(b);
    }
    const bookingMap = new Map(offerable.map(b => [String(b._id), b]));

    const platformSettings = await PlatformSettings.getSettings();
    const commissionPercentage = platformSettings.defaultCommission ?? 10;

    // The worker's response window is Settings.waveDuration, counted from when
    // this wave went out — NOT BookingRequest.expiresAt, which is the record's
    // 1-hour TTL. The alert card used to hard-code 60s and auto-reject at zero,
    // so a worker lost the job four minutes before the server actually gave up
    // on them.
    const globalSettings = await Settings.findOne({ type: 'global' }).select('waveDuration').lean();
    const responseWindowSec = globalSettings?.waveDuration || 300;

    const data = requests
      .map(r => {
        const booking = bookingMap.get(String(r.bookingId));
        if (!booking) return null;
        const workerAmount = Math.max(0, parseFloat((((booking.basePrice || 0) * (100 - commissionPercentage)) / 100).toFixed(2)));
        return {
          bookingId: booking._id,
          serviceName: booking.serviceName,
          customerName: booking.userId?.name || 'Customer',
          customerPhone: booking.userId?.phone,
          scheduledDate: booking.scheduledDate,
          price: booking.finalAmount || booking.basePrice || workerAmount,
          workerAmount: workerAmount,
          totalAmount: booking.finalAmount || booking.basePrice,
          address: booking.address,
          distance: r.distance,
          serviceCategory: booking.serviceCategory,
          brandName: booking.brandName,
          brandIcon: booking.brandIcon,
          categoryIcon: booking.categoryIcon,
          bookedItems: booking.bookedItems,
          requirementText: booking.requirementText,
          isConsultancyRequest: booking.isConsultancyRequest,
          isEstimateBased: booking.isEstimateBased,
          createdAt: booking.createdAt,
          expiresAt: r.expiresAt,
          // Seconds this worker actually has left to respond, so the countdown
          // reflects the server's real window instead of a hard-coded 60.
          respondBySeconds: Math.max(
            0,
            Math.round(
              (new Date(booking.waveStartedAt || r.sentAt).getTime() + responseWindowSec * 1000 - Date.now()) / 1000
            )
          ),
          responseWindowSeconds: responseWindowSec
        };
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests. Please try again.'
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

    // Same fix as getAssignedJobs: the raw booking amount is what the
    // CUSTOMER pays, not what the worker actually earns after the
    // platform's commission cut. Add the commission-adjusted figure
    // alongside it rather than replacing finalAmount, since the customer's
    // total is still legitimately useful for the worker to see (e.g. when
    // collecting payment) — it's just not their own earning.
    const bookingObj = booking.toObject();
    const bill = await VendorBill.findOne({ bookingId: booking._id }).select('vendorTotalEarning').lean();
    if (bill) {
      bookingObj.workerAmount = bill.vendorTotalEarning;
    } else {
      const platformSettings = await PlatformSettings.getSettings();
      const commissionPercentage = platformSettings?.defaultCommission ?? 10;
      bookingObj.workerAmount = Math.max(0, parseFloat((((booking.basePrice || booking.finalAmount || 0) * (100 - commissionPercentage)) / 100).toFixed(2)));
    }

    res.status(200).json({
      success: true,
      data: bookingObj
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
    if ([BOOKING_STATUS.WORK_DONE, BOOKING_STATUS.COMPLETED].includes(status)) {
      const capacity = await syncWorkerCapacityStatus(workerId);
      req.app.get('io')?.to(`worker_${workerId}`).emit('worker_capacity_changed', {
        status: capacity?.status,
        isBusy: capacity?.isBusy || false,
        reason: 'work_done'
      });
    }

    if (status === BOOKING_STATUS.WORK_DONE || status === BOOKING_STATUS.COMPLETED) {
      checkAndAwardTargetBonus(booking.workerId).catch(err => console.error('[Target Bonus] error in updateJobStatus:', err));
    }

    if (status === BOOKING_STATUS.COMPLETED) {
      referralService.processHomeServiceBookingCompletion(booking.userId, booking._id)
        .catch(err => console.error('[Referral Completion] error in updateJobStatus:', err));
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
    const capacity = await syncWorkerCapacityStatus(workerId);
    req.app.get('io')?.to(`worker_${workerId}`).emit('worker_capacity_changed', {
      status: capacity?.status,
      isBusy: capacity?.isBusy || false,
      reason: 'work_done'
    });

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
    
    // IMPORTANT: booking.basePrice = FULL original service price (e.g. 500)
    // booking.discount / booking.promoDiscount = discount amount
    // Discount applies ONLY to the admin's cut — NOT to the worker's.
    const trueOriginalServiceBase = booking.basePrice || booking.totalAmount || 0;
    const baseDiscount = booking.discount || 0;
    const promoDiscount = booking.promoDiscount || 0;
    const totalDiscount = baseDiscount + promoDiscount;

    // Fetch Platform Settings
    //
    // Commission is a PERCENTAGE of the original booked service price, not a
    // flat ₹ fee — a ₹500 job at the admin-configured rate (e.g. 20%) splits
    // ₹100 to admin / ₹400 to worker; a ₹5,000 job at the same rate splits
    // ₹1,000 / ₹4,000. If `defaultCommission` isn't set, we fall back to a
    // 10% default rather than silently taking a ₹0 cut.
    // Applies only to the ORIGINAL booked price — a worker's own added
    // extras/parts (below) stay 100% theirs, same as before.
    const isEstimate = booking.isEstimateBased;
    const commissionPercentage = isEstimate ? 0 : (platformSettings?.defaultCommission ?? 10);
    const cashExtraFee = isEstimate ? 0 : (platformSettings?.cashCollectionFee ?? 20);

    const grossAdminCommission = isEstimate ? 0 : parseFloat(((trueOriginalServiceBase * commissionPercentage) / 100).toFixed(2));

    // Worker sees: basePrice - commission = 500 - 100 = 400 (at 20%)
    const originalServiceBase = Math.max(0, parseFloat((trueOriginalServiceBase - grossAdminCommission).toFixed(2)));
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
    
    // Discount reduces the admin's cut only: ₹100 commission - ₹10 discount = ₹90
    const adjustedAdminCommission = Math.max(0, parseFloat((grossAdminCommission - totalDiscount).toFixed(2)));

    // Final online = worker's earnings + adjusted commission = 400 + 90 = 490
    const finalOnlineAmount = parseFloat((grandTotal + adjustedAdminCommission).toFixed(2));
    const finalCashAmount = parseFloat((finalOnlineAmount + cashExtraFee).toFixed(2));

    // Worker earning = grand total (their service cut)
    const workerEarning = grandTotal;

    bill.vendorTotalEarning = workerEarning;
    bill.adminCommission = adjustedAdminCommission;
    bill.payoutConfig = bill.payoutConfig || {};
    bill.payoutConfig.commissionPercentage = commissionPercentage;
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
    const capacity = await syncWorkerCapacityStatus(workerId);
    req.app.get('io')?.to(`worker_${workerId}`).emit('worker_capacity_changed', {
      status: capacity?.status,
      isBusy: capacity?.isBusy || false,
      reason: 'work_done'
    });

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
 * Verify the customer's OTP to confirm they've seen & approved the extra
 * items/parts a worker has added to the bill so far (createBill must have
 * already run to generate/refresh this OTP and notify the customer).
 *
 * Deliberately does NOT touch booking status or complete the job — this is
 * only a checkpoint gate before the worker is allowed to move on to Review.
 * The same OTP is reused again later, unchanged, to actually close out the
 * job (collectCash / confirmManualOnlineCollection).
 */
const verifyItemsOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const workerId = req.user.id;

    const booking = await HomeServiceBooking.findOne({ _id: id }).select('+paymentOtp');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const workerIdStr = String(booking.workerId?._id || booking.workerId || '');
    const vendorIdStr = String(booking.vendorId?._id || booking.vendorId || '');
    if (workerIdStr !== String(workerId) && vendorIdStr !== String(workerId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (!booking.paymentOtp || String(booking.paymentOtp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    res.status(200).json({ success: true, message: 'Extra items verified by customer' });
  } catch (error) {
    console.error('Verify items OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
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

    // Only AWAITING_PAYMENT may be closed out here. createBill generates
    // paymentOtp/customerConfirmationOTP as soon as the bill exists — while
    // the booking is still WORK_DONE — purely so the customer can confirm
    // extra items (see verifyItemsOtp). Allowing that same OTP to close the
    // job straight from WORK_DONE/VISITED/IN_PROGRESS meant a worker could
    // mark a booking paid & completed using an OTP the customer only ever
    // gave to approve line items — no payment (cash or online) had to occur
    // at all. The worker must explicitly request payment first
    // (initiateCashCollection / initiateOnlineCollection), which is what
    // actually moves the booking into AWAITING_PAYMENT.
    const allowedStatuses = [BOOKING_STATUS.AWAITING_PAYMENT];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Payment hasn't been requested yet for this booking (status: ${booking.status})` });
    }

    if (String(booking.paymentOtp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // The customer already settled this online — the OTP is only closing the
    // job now, so record it as an online payment and skip the cash bookkeeping
    // (crediting the wallet twice would pay the job out twice).
    if (booking.isWorkerPaid === true || booking.paymentStatus === PAYMENT_STATUS.PAID) {
      booking.status = BOOKING_STATUS.COMPLETED;
      booking.completedAt = new Date();
      booking.paymentOtp = undefined;
      booking.customerConfirmationOTP = null;
      await booking.save();

      // Trigger Referral completion if this was referee's first Home Service booking
      try {
        await referralService.processHomeServiceBookingCompletion(booking.userId, booking._id);
      } catch (refErr) {
        console.warn('[Referral Hook Error]:', refErr.message);
      }

      const ioPaid = req.app.get('io');
      if (ioPaid) {
        ioPaid.to(`user_${String(booking.userId?._id || booking.userId)}`).emit('booking_updated', {
          bookingId: String(booking._id),
          status: BOOKING_STATUS.COMPLETED,
          paymentStatus: booking.paymentStatus
        });
      }

      return res.status(200).json({ success: true, message: 'Booking closed — payment was already received online' });
    }

    // Payment mode is online-only — a booking that isn't already paid
    // (checked above via isWorkerPaid/paymentStatus) has nothing to collect
    // in cash anymore. Ask the customer to pay online instead of running the
    // old cash-collection bookkeeping.
    return res.status(400).json({
      success: false,
      message: 'This booking has not been paid yet. Please ask the customer to pay online before closing the job.'
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
  let capacityClaimed = false;

  console.log(`[WorkerAction] respondToJob - ID: ${id}, Status: ${status}, Worker: ${workerId}`);

  try {
    if (id === 'test-id') {
      const safeStatus = status ? status.toLowerCase() : 'unknown';
      return res.status(200).json({ success: true, message: `Job ${safeStatus} (test mode)` });
    }

    // Find the booking by ID
    // In Direct Worker Model, workerId might not be set yet on the Booking itself
    let booking = await HomeServiceBooking.findById(id);

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

    if (!booking.workerId && request && (
      request.status !== 'PENDING' ||
      (request.expiresAt && new Date(request.expiresAt) <= new Date())
    )) {
      return res.status(409).json({
        success: false,
        code: 'OFFER_CLOSED',
        message: 'This booking offer is no longer active.'
      });
    }

    if (status === 'ACCEPTED') {
      const acceptingWorker = await Worker.findById(workerId).select('name bookingModes').lean();
      const bookingMode = booking.bookingType === 'instant' ? 'instant' : 'slot';
      if (!supportsBookingMode(acceptingWorker, bookingMode)) {
        return res.status(409).json({
          success: false,
          code: 'WORKER_BOOKING_MODE_NOT_ALLOWED',
          message: `Your profile is not enabled for ${bookingMode === 'instant' ? 'Instant' : 'Slot'} bookings.`
        });
      }
      // Slot buffer: refuse if this worker already holds a job too close to
      // this one (admin-configured gap). Authoritative check — the offer may
      // have been sent before the worker accepted their other job.
      const unavailableMsg = await findWorkerUnavailability(workerId, booking);
      if (unavailableMsg) {
        return res.status(409).json({ success: false, code: 'WORKER_UNAVAILABLE', message: unavailableMsg });
      }
      const conflict = await findWorkerConflict(workerId, booking);
      if (conflict) {
        const bufferMinutes = await getBufferMinutes();
        return res.status(409).json({
          success: false,
          code: 'SLOT_CONFLICT',
          message: describeConflict(conflict, bufferMinutes).replace('Worker already has', 'You already have')
        });
      }

      const capacity = await claimWorkerCapacity(workerId, booking._id);
      if (!capacity.claimed) {
        return res.status(409).json({
          success: false,
          code: 'WORKER_BUSY',
          message: capacity.activeJob
            ? `You are already busy with booking #${capacity.activeJob.bookingNumber}. Mark that work done before accepting another booking.`
            : 'You are currently busy. Mark your current work done before accepting another booking.'
        });
      }
      capacityClaimed = true;

      // First valid accept wins atomically; two workers can never both claim
      // the same booking even if their requests arrive together.
      const claimedBooking = await HomeServiceBooking.findOneAndUpdate(
        {
          _id: id,
          workerId: null,
          status: {
            $in: [
              BOOKING_STATUS.SEARCHING,
              BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
              BOOKING_STATUS.NO_WORKERS,
              BOOKING_STATUS.NO_VENDORS
            ]
          }
        },
        {
          $set: {
            workerId,
            status: BOOKING_STATUS.ASSIGNED,
            bookingModel: 'worker',
            workerResponse: 'ACCEPTED',
            assignmentStatus: 'assigned',
            workerAcceptedAt: new Date(),
            acceptedAt: new Date(),
            assignedAt: new Date(),
            waveStartedAt: null
          }
        },
        { new: true }
      );
      if (!claimedBooking) {
        await syncWorkerCapacityStatus(workerId);
        capacityClaimed = false;
        return res.status(409).json({
          success: false,
          code: 'BOOKING_ALREADY_CLAIMED',
          message: 'This booking has already been accepted by another professional.'
        });
      }
      booking = claimedBooking;

      // A fresh acceptance restarts the reminder cycle. If the job is already
      // inside the reminder window, accepting it now IS the confirmation.
      const reminderSettings = await Settings.findOne({ type: 'global' }).select('jobReminderLeadMinutes').lean();
      const reminderLeadMs = (reminderSettings?.jobReminderLeadMinutes || 120) * 60 * 1000;
      const slotWindow = getBookingWindow(booking);
      const insideReminderWindow = slotWindow && Date.now() >= slotWindow.start.getTime() - reminderLeadMs;
      booking.reminderSentAt = insideReminderWindow ? new Date() : null;
      booking.reminderConfirmedAt = insideReminderWindow ? new Date() : null;
      booking.reminderEscalatedAt = null;

      booking.status = BOOKING_STATUS.ASSIGNED;
      booking.workerId = workerId; // Assign the worker
      booking.bookingModel = 'worker'; // Ensure model is set
      booking.workerAcceptedAt = new Date();
      booking.acceptedAt = new Date();
      booking.assignedAt = booking.assignedAt || new Date();
      booking.workerResponse = 'ACCEPTED';
      booking.assignmentStatus = 'assigned';
      booking.waveStartedAt = null;
      recordAssignmentOutcome(booking, workerId, 'accepted');

      // Update this worker's request entry to ACCEPTED
      await BookingRequest.findOneAndUpdate(
        { bookingId: id, workerId },
        { $set: { status: 'ACCEPTED', respondedAt: new Date() } }
      );

      // Expire other workers' pending requests for this booking
      await BookingRequest.updateMany(
        { bookingId: id, workerId: { $ne: workerId }, status: 'PENDING' },
        { $set: { status: 'EXPIRED', respondedAt: new Date() } }
      );

      // This worker is now busy. Withdraw every other open offer so old cards
      // cannot be accepted from another tab/device while the job is active.
      await BookingRequest.updateMany(
        { bookingId: { $ne: id }, workerId, status: 'PENDING' },
        { $set: { status: 'EXPIRED', respondedAt: new Date() } }
      );

      // Notify Vendor if applicable
      if (booking.vendorId) {
        await createNotification({
          vendorId: booking.vendorId,
          type: 'job_accepted',
          title: 'Worker Accepted Job',
          message: `Worker has accepted job ${booking.bookingNumber}`,
          relatedId: booking._id,
          relatedType: 'booking'
        });
      }

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
      const io = req.app.get('io') || getIO();
      if (io) {
        // 1. Notify customer that booking is accepted
        if (worker) {
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

        // 2. Broadcast to other in-zone workers that job is taken so their alert closes immediately
        io.emit('booking_claimed_by_other', {
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          claimedBy: workerId
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
        reqEntry.rejectionReason = req.body?.reason || 'Worker rejected the booking request';
        await reqEntry.save();
      }

      recordAssignmentOutcome(booking, workerId, 'rejected', req.body?.reason);

      const rejectingWorker = await Worker.findById(workerId).select('name phone');

      // Check how many other workers still have a PENDING request for this booking
      const remainingPending = await BookingRequest.countDocuments({
        bookingId: id,
        status: 'PENDING',
        expiresAt: { $gt: new Date() }
      });

      console.log(`[WorkerAction] Job ${id} rejected by ${workerId}. Remaining pending workers: ${remainingPending}`);

      // If no other workers in the zone have a pending offer (or if this was an assigned single worker):
      // escalate to admin for manual assignment
      if (remainingPending === 0 || (booking.workerId && String(booking.workerId) === String(workerId))) {
        booking.workerId = null;
        booking.status = BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED;
        booking.assignmentStatus = 'manual_assignment_required';
        booking.waveStartedAt = null;
        booking.rejectionReason = req.body?.reason || `Worker ${rejectingWorker?.name || ''} declined`;

        await createNotification({
          vendorId: booking.vendorId,
          type: 'worker_rejected_booking',
          title: 'Booking Requires Manual Assignment',
          message: `Worker ${rejectingWorker?.name || ''} declined booking #${booking.bookingNumber}. Please manually assign a worker.`,
          relatedId: booking._id,
          relatedType: 'booking',
          priority: 'high',
          pushData: { type: 'manual_assignment_required', bookingId: booking._id.toString() }
        });

        const io = req.app.get('io') || getIO();
        if (io) {
          io.emit('booking_updated', {
            bookingId: booking._id,
            status: BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
            assignmentStatus: 'manual_assignment_required',
            message: 'All in-zone workers declined or unavailable. Waiting for admin manual assignment.'
          });
          io.to('admin_room').emit('booking_rejected_by_worker', {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            worker: rejectingWorker ? { id: rejectingWorker._id, name: rejectingWorker.name } : null,
            reason: booking.rejectionReason
          });
        }
      } else {
        console.log(`[WorkerAction] Booking ${id} remains open for ${remainingPending} other in-zone worker(s).`);
      }
    }

    await booking.save();
    if (status === 'ACCEPTED') {
      const io = req.app.get('io') || getIO();
      io?.to(`worker_${workerId}`).emit('worker_capacity_changed', {
        status: 'busy',
        isBusy: true,
        activeBookingId: booking._id.toString()
      });
    } else if (status === 'REJECTED') {
      const capacity = await syncWorkerCapacityStatus(workerId);
      (req.app.get('io') || getIO())?.to(`worker_${workerId}`).emit('worker_capacity_changed', {
        status: capacity?.status,
        isBusy: capacity?.isBusy || false,
        reason: 'offer_rejected'
      });
    }
    res.status(200).json({ success: true, message: `Job ${status.toLowerCase()}`, data: booking });

  } catch (error) {
    if (capacityClaimed) await syncWorkerCapacityStatus(workerId).catch(() => {});
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
    // Move into AWAITING_PAYMENT so the customer's "Payment Required" card
    // actually renders — it is gated on this status, but nothing in the
    // codebase ever assigned it. Bookings went straight from work_done to
    // completed, so the customer could never pay in-app.
    if (booking.status === BOOKING_STATUS.WORK_DONE) {
      booking.status = BOOKING_STATUS.AWAITING_PAYMENT;
    }
    await booking.save();

    const amount = booking.finalAmount || 0;
    const upiUrl = `upi://pay?pa=hoomzoteam@ybl&pn=Hoomzo&am=${amount}&cu=INR&tn=HoomzoBooking_${booking.bookingNumber}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: BOOKING_STATUS.AWAITING_PAYMENT,
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

    // 'SUCCESS' is not a PAYMENT_STATUS value — that arm never matched. Use the
    // real constants, and count vendor-collected cash as paid.
    const isPaid = [
      PAYMENT_STATUS.PAID,
      PAYMENT_STATUS.COLLECTED_BY_VENDOR,
      PAYMENT_STATUS.PLAN_COVERED
    ].includes(booking.paymentStatus);
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

// Cash payment mode has been removed — payment is online-only now. Kept as
// a stub (rather than deleting the route) so any old client build still
// gets a clear, actionable error instead of a raw 404.
const initiateCashCollection = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Cash collection is no longer supported. Please request payment online instead.'
  });
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

    // Same reasoning as collectCash above — don't accept WORK_DONE here.
    // Payment must have actually been requested (status = AWAITING_PAYMENT)
    // before this OTP is allowed to close the job.
    if (booking.status !== BOOKING_STATUS.AWAITING_PAYMENT) {
      return res.status(400).json({ success: false, message: `Payment hasn't been requested yet for this booking (status: ${booking.status})` });
    }

    if (booking.paymentOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const bill = await VendorBill.findOne({ bookingId: booking._id });
    if (!bill) {
      return res.status(500).json({ success: false, message: 'Bill not found — cannot process payment' });
    }

    const grandTotal = Number(bill.grandTotal) || 0;
    // Tip goes 100% to the worker on top of their commissioned earning —
    // matches the Razorpay path's crediting in paymentController.
    const vendorEarning = (Number(bill.vendorTotalEarning) || 0) + (Number(booking.tipAmount) || 0);

    // The customer may already have paid in-app (paymentController credits the
    // worker at that point). Crediting again here would pay the job out twice,
    // so settle only if nobody has.
    const alreadySettled = booking.isWorkerPaid === true;

    booking.status = BOOKING_STATUS.COMPLETED;
    booking.paymentMethod = 'online';
    booking.paymentStatus = 'paid';
    booking.completedAt = new Date();
    booking.paymentOtp = undefined;
    booking.customerConfirmationOTP = null;
    booking.isWorkerPaid = true;
    await booking.save();

    // Trigger Referral completion if this was referee's first Home Service booking
    try {
      await referralService.processHomeServiceBookingCompletion(booking.userId, booking._id);
    } catch (refErr) {
      console.warn('[Referral Hook Error]:', refErr.message);
    }

    bill.status = 'paid';
    bill.paidAt = new Date();
    await bill.save();

    // Update Wallet based on Booking Model
    if (alreadySettled) {
      // no-op: wallet was credited when the online payment was verified
    } else if (booking.bookingModel === 'worker') {
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

    // Token logic: 30% of total estimate is collected upfront; admin's cut of
    // that token now follows the same admin-configured commission rate as a
    // regular booking (was hardcoded to 20% here, independent of Settings).
    const platformSettings = await PlatformSettings.getSettings();
    const commissionPercentage = platformSettings?.defaultCommission ?? 10;
    const tokenAmount = Math.round(Number(estimatedAmount) * 0.3);
    const adminCommission = Math.round((Number(estimatedAmount) * commissionPercentage) / 100);
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

/**
 * Jobs for which this worker has an open pre-job reminder (sent, unconfirmed).
 * Poll counterpart of the 'job_reminder' socket event, so a worker who opens
 * the app after it was sent still sees the popup.
 */
const getJobReminders = async (req, res) => {
  try {
    const workerId = req.user.id;
    const s = await Settings.findOne({ type: 'global' }).select('jobReminderConfirmMinutes').lean();
    const confirmMinutes = s?.jobReminderConfirmMinutes || 15;

    const bookings = await HomeServiceBooking.find({
      workerId,
      status: { $in: REMINDABLE_STATUSES },
      reminderSentAt: { $ne: null },
      reminderConfirmedAt: null
    }).select('bookingNumber serviceName scheduledDate scheduledTime timeSlot address reminderSentAt').lean();

    // A reminder for a slot that has already begun is moot.
    const now = Date.now();
    const data = bookings
      .filter((b) => { const w = getBookingWindow(b); return !w || now < w.end.getTime(); })
      .map((b) => buildReminderPayload(b, confirmMinutes));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[WorkerAction] getJobReminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
  }
};

/** Worker confirms they'll make the job. */
const confirmJobReminder = async (req, res) => {
  try {
    const booking = await HomeServiceBooking.findOneAndUpdate(
      { _id: req.params.id, workerId: req.user.id, status: { $in: REMINDABLE_STATUSES } },
      { $set: { reminderConfirmedAt: new Date() } },
      { new: true }
    ).select('bookingNumber');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found or no longer assigned to you' });
    }
    res.status(200).json({ success: true, message: 'Thanks for confirming!' });
  } catch (error) {
    console.error('[WorkerAction] confirmJobReminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm' });
  }
};

/**
 * Worker drops a job they had already accepted.
 *
 * Deliberately does NOT cancel the customer's booking. The booking goes back
 * into assignment: first a fresh search, and if that finds nobody it lands in
 * the ops team's manual-assignment queue. Only ops (or the customer) may
 * actually cancel — a worker changing their mind must never end someone's
 * paid booking.
 */
const releaseJob = async (req, res) => {
  const { id } = req.params;
  const { reason = '' } = req.body || {};
  const workerId = req.user.id;

  try {
    const booking = await HomeServiceBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(booking.workerId || '') !== String(workerId)) {
      return res.status(403).json({ success: false, message: 'This job is not assigned to you' });
    }

    // Once the work is done (or being paid for) releasing it would strand the
    // customer mid-service — that needs an ops decision, not a self-service drop.
    const tooLate = [
      BOOKING_STATUS.WORK_DONE,
      BOOKING_STATUS.AWAITING_PAYMENT,
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.CANCELLED
    ];
    if (tooLate.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot release a job that is already ${booking.status}. Please contact support.`
      });
    }

    // Record it against this worker's attempt so ops can see who dropped out.
    booking.assignmentAttempts = booking.assignmentAttempts || [];
    const attempt = booking.assignmentAttempts.find(
      (a) => String(a.workerId) === String(workerId) && a.outcome !== 'cancelled_by_worker'
    );
    if (attempt) {
      attempt.outcome = 'cancelled_by_worker';
      attempt.respondedAt = new Date();
      attempt.reason = reason;
    } else {
      booking.assignmentAttempts.push({
        workerId,
        notifiedAt: new Date(),
        respondedAt: new Date(),
        outcome: 'cancelled_by_worker',
        reason
      });
    }

    // Don't offer it back to the worker who just dropped it.
    booking.notifiedWorkers = (booking.notifiedWorkers || []).filter(
      (w) => String(w) !== String(workerId)
    );
    booking.potentialWorkers = (booking.potentialWorkers || []).filter(
      (p) => String(p.workerId) !== String(workerId)
    );

    booking.workerId = null;
    booking.assignmentStatus = 'manual_assignment_required';
    booking.status = BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED;
    booking.waveStartedAt = null;
    booking.reminderSentAt = null;
    booking.reminderConfirmedAt = null;
    booking.reminderEscalatedAt = null;

    await booking.save();
    const capacity = await syncWorkerCapacityStatus(workerId);
    getIO()?.to(`worker_${workerId}`).emit('worker_capacity_changed', {
      status: capacity?.status,
      isBusy: capacity?.isBusy || false,
      reason: 'job_released'
    });

    try {
      const io = getIO();
      if (io) {
        io.emit('booking_updated', {
          bookingId: booking._id,
          status: BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
          assignmentStatus: 'manual_assignment_required',
          message: 'Job was released by worker. Awaiting admin assignment.'
        });
        io.to('admin_room').emit('booking_rejected_by_worker', {
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          reason: reason || 'Worker released job'
        });
      }
    } catch { /* socket optional */ }

    await createNotification({
      userId: booking.userId,
      type: 'assignment_pending',
      title: 'Assigning Your Professional',
      message: 'We are currently assigning a service professional to your booking. You will receive the professional details shortly.',
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'assignment_pending', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    }).catch(() => {});

    res.json({ success: true, message: 'Job released. It has been returned for reassignment.' });
  } catch (error) {
    console.error('[WorkerAction] releaseJob error:', error);
    res.status(500).json({ success: false, message: 'Failed to release job' });
  }
};

export {
  getAssignedJobs,
  getPendingRequests,
  getJobById,
  updateJobStatus,
  startJob,
  completeJob,
  releaseJob,
  getJobReminders,
  confirmJobReminder,
  addWorkerNotes,
  verifyVisit,
  workerReachedLocation,
  collectCash,
  respondToJob,
  getBill,
  createBill,
  verifyItemsOtp,
  initiateOnlineCollection,
  verifyOnlineCollection,
  initiateCashCollection,
  confirmManualOnlineCollection,
  generateEstimate
 };
