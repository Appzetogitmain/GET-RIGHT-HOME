import mongoose from 'mongoose';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Service from '../models/HomeServiceService.js';
import HomeServiceCategory from '../models/HomeServiceCategory.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import Settings from '../models/Settings.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';
import { findNearbyWorkers, geocodeAddress } from './locationService.js';
import { filterAvailableWorkers, isFutureIstDay } from '../utils/slotAvailability.js';
import { claimWorkerCapacity, isImmediateBooking, syncWorkerCapacityStatus } from './workerCapacityService.js';
import { sendBookingEmails } from './emailService.js';
import { getIO } from '../sockets.js';

export const NO_WORKERS_MESSAGE = 'No professional is available for this service in your area right now. Your booking has been sent to our team, who will assign a professional shortly.';

// States from which a booking can still be handed to a worker.
const OPEN_FOR_ASSIGNMENT = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.SEARCHING,
  BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
  BOOKING_STATUS.NO_WORKERS,
  BOOKING_STATUS.NO_VENDORS
];

/**
 * Workers who can take this booking right now: right zone / skills / booking
 * type, free for the slot, and not on `excludeWorkerIds` (e.g. whoever just
 * rejected it).
 */
export const findDispatchPartners = async (booking, { excludeWorkerIds = [] } = {}) => {
  const hs = await Settings.findOne({ type: 'global' }).select('searchRadius').lean();
  const category = booking.categoryId
    ? await HomeServiceCategory.findById(booking.categoryId?._id || booking.categoryId).select('title slug').lean()
    : null;

  let location = { lat: booking.address?.lat, lng: booking.address?.lng };
  if (!location.lat || !location.lng) {
    location = await geocodeAddress(`${booking.address?.addressLine1}, ${booking.address?.city}, ${booking.address?.state} ${booking.address?.pincode}`);
  }

  const isInstant = booking.bookingType === 'instant';
  const found = await findNearbyWorkers(location, hs?.searchRadius || 10, {
    service: category?.title || booking.serviceCategory || 'General',
    serviceName: booking.serviceName,
    categoryId: category?._id || booking.categoryId,
    slug: category?.slug,
    bookingMode: isInstant ? 'instant' : 'slot',
    // Future-day bookings also reach workers who are offline right now; their
    // marked days / leave decide availability, not the toggle.
    includeOffline: !isInstant && isFutureIstDay(booking.scheduledDate)
  });

  const excluded = new Set(excludeWorkerIds.map(String));
  const seen = new Set();
  const unique = found.filter((w) => {
    const id = String(w._id);
    if (seen.has(id) || excluded.has(id)) return false;
    seen.add(id);
    return true;
  });

  if (!unique.length) return [];
  return filterAvailableWorkers(unique, booking, { excludeBookingId: booking._id, ignoreBookings: isInstant });
};

/**
 * Hands a slot booking to one specific worker with no accept step: the job is
 * simply theirs, shown in their jobs list. Used by auto-assignment, and by the
 * admin when assigning a slot booking.
 *
 * Returns the updated booking, or null if it could not be assigned (someone
 * else got there first, or the worker is occupied right now).
 */
export const directAssign = async (bookingId, workerId, { mode = 'auto', adminId = null } = {}) => {
  const current = await HomeServiceBooking.findById(bookingId);
  if (!current) return null;

  // A slot for later doesn't occupy the worker now; one starting soon does.
  let capacityClaimed = false;
  if (await isImmediateBooking(current)) {
    const capacity = await claimWorkerCapacity(workerId, bookingId);
    if (!capacity.claimed) return null;
    capacityClaimed = true;
  }

  const now = new Date();
  const claimed = await HomeServiceBooking.findOneAndUpdate(
    { _id: bookingId, workerId: null, status: { $in: OPEN_FOR_ASSIGNMENT } },
    {
      $set: {
        workerId,
        bookingModel: 'worker',
        status: BOOKING_STATUS.ASSIGNED,
        assignmentStatus: 'assigned',
        assignmentMode: mode,
        workerResponse: mode === 'admin' ? 'ADMIN_ASSIGNED' : 'AUTO_ASSIGNED',
        workerAcceptedAt: now,
        acceptedAt: now,
        assignedAt: now,
        waveStartedAt: null,
        adminAssignedWorkerId: null,
        reminderSentAt: null,
        reminderConfirmedAt: null,
        reminderEscalatedAt: null,
        ...(adminId ? { manuallyAssignedBy: adminId, manuallyAssignedAt: now } : {})
      },
      $push: {
        assignmentAttempts: {
          workerId,
          notifiedAt: now,
          respondedAt: now,
          outcome: 'accepted',
          reason: mode === 'admin' ? 'Assigned by admin' : 'Auto-assigned'
        }
      }
    },
    { new: true }
  );

  if (!claimed) {
    if (capacityClaimed) await syncWorkerCapacityStatus(workerId).catch(() => {});
    return null;
  }

  // Any outstanding offers for this booking are void now.
  await BookingRequest.updateMany(
    { bookingId, status: 'PENDING' },
    { $set: { status: 'EXPIRED', respondedAt: now } }
  ).catch(() => {});

  try {
    const [worker, populated] = await Promise.all([
      Worker.findById(workerId).select('name phone profilePhoto rating'),
      HomeServiceBooking.findById(bookingId).populate('userId', 'name phone')
    ]);
    const io = getIO();

    // Worker: appears in their jobs, with a soft alert — no accept/reject popup.
    createNotification({
      workerId,
      type: 'job_assigned',
      title: 'New Job Assigned',
      message: `${claimed.serviceName} on ${new Date(claimed.scheduledDate).toLocaleDateString('en-IN')} at ${claimed.scheduledTime}. Open My Jobs for details.`,
      relatedId: claimed._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'slot_job_assigned', bookingId: claimed._id.toString(), link: `/worker/job/${claimed._id}` }
    }).catch(() => {});
    io?.to(`worker_${workerId}`).emit('slot_job_assigned', {
      bookingId: claimed._id,
      bookingNumber: claimed.bookingNumber,
      serviceName: claimed.serviceName,
      scheduledDate: claimed.scheduledDate,
      scheduledTime: claimed.scheduledTime,
      customerName: populated?.userId?.name,
      address: claimed.address,
      message: `New job assigned: ${claimed.serviceName}`
    });

    // Customer: a professional is confirmed.
    createNotification({
      userId: claimed.userId,
      type: 'worker_accepted',
      title: 'Professional Confirmed!',
      message: `${worker?.name || 'A professional'} has been assigned to your booking #${claimed.bookingNumber}.`,
      relatedId: claimed._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'worker_accepted', bookingId: claimed._id.toString(), link: `/user/booking/${claimed._id}` }
    }).catch(() => {});
    if (worker) {
      io?.to(`user_${claimed.userId}`).emit('booking_accepted', {
        bookingId: claimed._id,
        worker: { id: worker._id, name: worker.name, phone: worker.phone, profilePhoto: worker.profilePhoto, rating: worker.rating }
      });
    }
    io?.emit('booking_claimed_by_other', { bookingId: claimed._id, bookingNumber: claimed.bookingNumber, claimedBy: workerId });
  } catch (err) {
    console.error('[directAssign] notification failed:', err.message);
  }

  return claimed;
};

/**
 * Picks the best available worker for a slot booking (nearest first) and
 * assigns it directly. Returns the chosen worker id, or null if nobody could
 * take it. `partners` should already be filtered for availability.
 */
export const assignSlotAutomatically = async (booking, partners) => {
  const ranked = [...(partners || [])].sort((a, b) => (a.distance || 0) - (b.distance || 0));
  for (const partner of ranked) {
    const claimed = await directAssign(booking._id, partner._id, { mode: 'auto' });
    if (claimed) return partner._id;
  }
  return null;
};

/**
 * Re-runs automatic assignment for a slot booking, skipping workers who
 * already turned it down. Falls back to the manual queue if nobody is free.
 * Used when a worker rejects an auto-assigned job and when an admin
 * "broadcasts" a slot booking again.
 */
export const reassignSlotBooking = async (bookingId, { excludeWorkerIds = [] } = {}) => {
  const booking = await HomeServiceBooking.findById(bookingId);
  if (!booking) return { assigned: false };
  // Never hand it back to someone who rejected it or didn't confirm.
  const turnedDown = (booking.assignmentAttempts || [])
    .filter((a) => ['cancelled_by_worker', 'unconfirmed', 'rejected'].includes(a.outcome))
    .map((a) => String(a.workerId));
  const partners = await findDispatchPartners(booking, { excludeWorkerIds: [...excludeWorkerIds, ...turnedDown] });
  const workerId = await assignSlotAutomatically(booking, partners);
  if (workerId) return { assigned: true, workerId };

  await HomeServiceBooking.updateOne(
    { _id: bookingId, workerId: null },
    { $set: { status: BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED, assignmentStatus: 'manual_assignment_required', waveStartedAt: null } }
  );
  try {
    getIO()?.to('admin_room').emit('booking_needs_assignment', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      serviceName: booking.serviceName,
      bookingType: booking.bookingType,
      zoneName: booking.zoneName,
      reason: 'No other professional is available for this slot'
    });
  } catch { /* socket optional */ }
  return { assigned: false };
};

/**
 * Sends a paid (or free) booking to professionals.
 *   - slot bookings  -> straight to an available worker (no accept popup)
 *   - instant        -> broadcast to every eligible worker in the zone
 * With nobody available the booking goes to the admin's manual queue.
 */
export const dispatchBooking = async (bookingId) => {
  try {
    const booking = await HomeServiceBooking.findById(bookingId);
    if (!booking) return null;
    if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED].includes(booking.status) || booking.workerId) return null;

    // The advance has just been paid: the booking is now live.
    if (booking.status === BOOKING_STATUS.PENDING) {
      booking.status = BOOKING_STATUS.SEARCHING;
      await HomeServiceBooking.updateOne({ _id: booking._id, status: BOOKING_STATUS.PENDING }, { $set: { status: BOOKING_STATUS.SEARCHING } });
    }

    const userId = booking.userId;
    const bookingType = booking.bookingType;
    const scheduledDate = booking.scheduledDate;
    const scheduledTime = booking.scheduledTime;
    const address = booking.address;
    const bookingModel = 'worker';

    let foundPartners = await findDispatchPartners(booking);

    // Re-fetch user and booking for background tasks to ensure latest state
    const userForBackground = await User.findById(userId);
    const bookingForBackground = await HomeServiceBooking.findById(bookingId)
      .populate('userId', 'name phone email')
      .populate('serviceId', 'title iconUrl')
      .populate('categoryId', 'title slug');
    const serviceForBackground = await Service.findById(bookingForBackground.serviceId) || {
      title: bookingForBackground.serviceName,
      category: bookingForBackground.serviceCategory
    };

    if (!userForBackground || !bookingForBackground) {
      console.error('[Dispatch] User or booking not found.');
      return;
    }

    // Slot bookings are not broadcast: the booking goes straight to an available
    // worker, who sees it in their jobs (no accept popup) and can still reject
    // it with a reason.
    if (bookingForBackground.bookingType !== 'instant') {
      const assignedTo = await assignSlotAutomatically(bookingForBackground, foundPartners);
      if (assignedTo) {
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
        sendBookingEmails(bookingForBackground, userForBackground, null, serviceForBackground)
          .catch(err => console.error('[Dispatch] Email error:', err));
        return { assigned: true, workerId: assignedTo };
      }
      // Nobody could take it — fall through to the manual-assignment queue below.
      foundPartners = [];
    }

    // Partners already found above
    // WAVE-BASED ALERTING: Prioritize actively connected workers (app/dashboard open), then sort by distance
    const io = getIO();
    const isWorkerActiveOnSocket = (id) => {
      if (!io) return false;
      const room = io.sockets.adapter.rooms.get(`worker_${id}`);
      return room ? room.size > 0 : false;
    };
    // Search and notification happen in different ticks. A worker may have
    // accepted another job in between, so re-check global capacity before
    // creating requests or emitting any alert.
    const stillAvailablePartners = await filterAvailableWorkers(
      foundPartners,
      bookingForBackground,
      { ignoreBookings: bookingForBackground.bookingType === 'instant' }
    );

    const sortedPartners = stillAvailablePartners.sort((a, b) => {
      const aActive = isWorkerActiveOnSocket(a._id) ? 1 : 0;
      const bActive = isWorkerActiveOnSocket(b._id) ? 1 : 0;
      if (aActive !== bActive) {
        return bActive - aActive; // Actively connected workers get priority in Wave 1
      }
      return (a.distance || 0) - (b.distance || 0);
    });

    // BROADCAST TO ALL IN-ZONE PARTNERS:
    // As requested: all matching workers in the same zone receive the booking offer simultaneously
    const targetPartners = sortedPartners;

    // Store potential workers in booking
    bookingForBackground.potentialWorkers = targetPartners.map(v => ({
      workerId: v._id,
      distance: v.distance || 0
    }));

    bookingForBackground.currentWave = 1;
    bookingForBackground.waveStartedAt = new Date();
    bookingForBackground.notifiedPartners = targetPartners.map(v => v._id);
    bookingForBackground.notifiedWorkers = targetPartners.map(v => v._id);
    bookingForBackground.assignmentStatus = 'searching';

    // Log attempt history for all notified workers
    bookingForBackground.assignmentAttempts = bookingForBackground.assignmentAttempts || [];
    targetPartners.forEach((p) => {
      bookingForBackground.assignmentAttempts.push({
        workerId: p._id,
        waveNumber: 1,
        notifiedAt: new Date(),
        outcome: 'notified'
      });
    });

    await bookingForBackground.save();

    // Fetch Platform Settings for Dynamic Worker Price — this is only the
    // "Earn ₹X" preview shown in the job-alert notification, before the
    // worker has even accepted; createBill computes the real, final split
    // at job completion using this same percentage, so the two can't
    // drift apart the way a separately-hardcoded flat fee could.
    const platformSettings = await PlatformSettings.getSettings();
    const commissionPercentage = platformSettings.defaultCommission ?? 10;
    const workerAmount = Math.max(0, parseFloat((((bookingForBackground.basePrice || 0) * (100 - commissionPercentage)) / 100).toFixed(2)));
    console.log(`[WorkerAmount Calc] basePrice: ${bookingForBackground.basePrice}, commission%: ${commissionPercentage}, workerAmount: ${workerAmount}`);

    const waveSettings = await Settings.findOne({ type: 'global' }).select('waveDuration').lean();
    const responseWindowSec = waveSettings?.waveDuration || 300;

    if (targetPartners.length > 0) {
      console.log(`[CreateBooking] Alerting ALL ${targetPartners.length} matching in-zone ${bookingModel}s simultaneously`);

      // Create BookingRequest entries for ALL in-zone partners
      const bookingRequests = targetPartners.map(partner => ({
        bookingId: bookingForBackground._id,
        workerId: partner._id,
        status: 'PENDING',
        wave: 1,
        distance: partner.distance || null,
        sentAt: new Date(),
        // Instant/same-day offers lapse in 1h; future-day ones stay open
        // longer so an offline worker still sees them when they're back.
        expiresAt: new Date(Date.now() + (bookingType !== 'instant' && isFutureIstDay(scheduledDate) ? 12 : 1) * 60 * 60 * 1000)
      }));

      try {
        await BookingRequest.insertMany(bookingRequests, { ordered: false });
        console.log(`[CreateBooking] Created ${bookingRequests.length} BookingRequest entries for in-zone ${bookingModel}s`);

        // Notify all in-zone partners about new job
        for (const partner of targetPartners) {
          await createNotification({
            workerId: partner._id,
            type: 'new_job_available',
            title: 'New Job Available in Your Zone!',
            message: `A new ${bookingForBackground.serviceName} job is available in your zone. Earn ₹${workerAmount}!`,
            relatedId: bookingForBackground._id,
            relatedType: 'booking',
            priority: 'high',
            pushData: {
              type: 'new_job',
              bookingId: bookingForBackground._id.toString(),
              link: `/worker/job/${bookingForBackground._id}`
            }
          });
        }

        // Also notify User that we are finding professionals
        await createNotification({
          userId: bookingForBackground.userId._id,
          type: 'finding_professional',
          title: 'Booking Received!',
          message: `We have received your booking for ${bookingForBackground.serviceName}. Finding the best professional for you...`,
          relatedId: bookingForBackground._id,
          relatedType: 'booking',
          pushData: {
            type: 'booking_confirmed',
            bookingId: bookingForBackground._id.toString(),
            link: `/user/booking/${bookingForBackground._id}`
          }
        });
      } catch (err) {
        if (err.code !== 11000) console.error('[CreateBooking] BookingRequest insert error:', err);
      }
    } else {
      // No eligible worker. The booking was already created in the manual
      // assignment queue (see noWorkersAvailable); no retry window.
      console.warn(`[CreateBooking] NO ${bookingModel.toUpperCase()}S available for booking ${bookingForBackground.bookingNumber}. Sent to admin manual assignment.`);

      bookingForBackground.status = BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED;
      bookingForBackground.assignmentStatus = 'manual_assignment_required';
      bookingForBackground.currentWave = 0;
      bookingForBackground.waveStartedAt = null;
      await bookingForBackground.save();

      const io = getIO();
      if (io) {
        io.to(`user_${userId}`).emit('booking_updated', {
          bookingId: bookingForBackground._id,
          status: BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
          assignmentStatus: 'manual_assignment_required',
          message: NO_WORKERS_MESSAGE
        });
        io.to('admin_room').emit('booking_needs_assignment', {
          bookingId: bookingForBackground._id,
          bookingNumber: bookingForBackground.bookingNumber,
          serviceName: bookingForBackground.serviceName,
          bookingType: bookingForBackground.bookingType,
          zoneName: bookingForBackground.zoneName,
          reason: 'No eligible professional available in the zone'
        });
      }

      await createNotification({
        userId: userId,
        type: 'assignment_pending',
        title: 'Assigning Your Professional',
        message: NO_WORKERS_MESSAGE,
        relatedId: bookingForBackground._id,
        relatedType: 'booking',
        priority: 'high',
        pushData: { type: 'assignment_pending', bookingId: bookingForBackground._id.toString(), link: `/user/booking/${bookingForBackground._id}` }
      });
      await createNotification({
        recipientType: 'admin',
        type: 'manual_assignment_required',
        title: 'Booking Needs Assignment',
        message: `Booking #${bookingForBackground.bookingNumber} (${bookingForBackground.serviceName}) has no available professional in ${bookingForBackground.zoneName || 'its zone'}. Please assign one manually.`,
        relatedId: bookingForBackground._id,
        relatedType: 'booking',
        priority: 'high'
      });
    }

    // Send notifications to all target in-zone partners
    if (io) {
      console.log(`[CreateBooking] Emitting Socket.IO events to all ${targetPartners.length} in-zone ${bookingModel}s...`);
      targetPartners.forEach(async (partner) => {
        const partnerRoom = `${bookingModel}_${partner._id.toString()}`;
        io.to(partnerRoom).emit('new_booking_request', {
          bookingId: bookingForBackground._id,
          serviceName: serviceForBackground.title,
          customerName: userForBackground.name,
          customerPhone: userForBackground.phone,
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime,
          price: bookingForBackground.finalAmount || bookingForBackground.basePrice || workerAmount,
          workerAmount: workerAmount,
          workerEarnings: workerAmount,
          totalAmount: bookingForBackground.finalAmount || bookingForBackground.basePrice,
          address: address,
          distance: partner.distance,
          serviceCategory: bookingForBackground.serviceCategory,
          brandName: bookingForBackground.brandName,
          brandIcon: bookingForBackground.brandIcon,
          categoryIcon: bookingForBackground.categoryIcon,
          bookedItems: bookingForBackground.bookedItems,
          requirementText: bookingForBackground.requirementText,
          isConsultancyRequest: bookingForBackground.isConsultancyRequest,
          isEstimateBased: bookingForBackground.isEstimateBased,
          createdAt: bookingForBackground.createdAt || new Date(),
          expiresAt: new Date(Date.now() + responseWindowSec * 1000).toISOString(),
          respondBySeconds: responseWindowSec,
          responseWindowSeconds: responseWindowSec,
          playSound: true,
          message: `New booking request in ${bookingForBackground.zoneName || 'your zone'}!`
        });
      });
      
      // Notify user about searching
      io.to(`user_${userId}`).emit('booking_updated', {
        bookingId: bookingForBackground._id,
        status: BOOKING_STATUS.SEARCHING,
        message: `Searching professionals in your zone...`
      });
    }

    // 2. Send Firebase/FCM notifications
    try {
      const partnerNotifications = targetPartners.map(partner =>
        createNotification({
          workerId: partner._id,
          type: 'booking_request',
          title: 'New Booking Request',
          message: `New service request for ${serviceForBackground.title} from ${userForBackground.name}`,
          relatedId: bookingForBackground._id,
          relatedType: 'booking',
          data: {
            bookingId: bookingForBackground._id,
            serviceName: serviceForBackground.title,
            customerName: userForBackground.name,
            customerPhone: userForBackground.phone,
            scheduledDate: scheduledDate,
            scheduledTime: scheduledTime,
            location: address,
            price: bookingForBackground.finalAmount || bookingForBackground.basePrice || workerAmount,
            workerAmount: workerAmount,
            totalAmount: bookingForBackground.finalAmount || bookingForBackground.basePrice,
            distance: partner.distance
          },
          pushData: {
            type: 'new_booking',
            dataOnly: false,
            link: `/worker/bookings/${bookingForBackground._id}`
          }
        })
      );
      await Promise.all(partnerNotifications);
    } catch (notifError) {
      console.error('[CreateBooking] Firebase/Notification Error:', notifError.message);
    }

    // NOTIFY USER: Send actionable notification so they can track status
    await createNotification({
      userId,
      type: 'booking_requested',
      title: 'Booking Created',
      message: `Your booking ${bookingForBackground.bookingNumber} has been created successfully.`,
      relatedId: bookingForBackground._id,
      relatedType: 'booking',
      pushData: {
        type: 'booking_requested',
        bookingId: bookingForBackground._id.toString(),
        link: `/user/booking/${bookingForBackground._id}`
        // dataOnly: true // Removed to ensure User sees the visual notification
      }
    });
    // Clear cart — single atomic operation
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
    console.log(`[CreateBooking][bg] Cart cleared for user ${userId}`);

    // Send confirmation emails (fire-and-forget — never blocks)
    sendBookingEmails(bookingForBackground, userForBackground, null, serviceForBackground)
      .catch(err => console.error('[CreateBooking][bg] Email error:', err));
    return { assigned: false };
  } catch (bgErr) {
    console.error('[Dispatch] failed:', bgErr);
    return null;
  }
};
