import HomeServiceBooking from '../models/HomeServiceBooking.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';
import Worker from '../models/Worker.js';
import Settings from '../models/Settings.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';
import { findNearbyWorkers } from '../services/locationService.js';

// Fallback wave timeout (60 seconds) used only until Settings.waveDuration is
// read — Admin configures the real value via Settings (worker response
// window), fetched fresh each scheduler tick below. Do NOT reuse this for
// BookingRequest.expiresAt: that field carries a Mongo TTL index
// (expireAfterSeconds: 0), so setting it to this same ~60s value causes every
// BookingRequest to self-delete almost immediately after creation — wiping
// out the "who's already been notified" / "did everyone reject" tracking
// this whole wave system depends on. Use BOOKING_REQUEST_TTL_MS for that.
const DEFAULT_WAVE_TIMEOUT_MS = 60000;
const WORKERS_PER_WAVE = 3;

// How long a BookingRequest record survives before Mongo's TTL index deletes
// it. Matches the 1-hour expiry createBooking() already uses for Wave 1, so
// waves 2+ (created here) don't disappear far sooner than Wave 1 does.
const BOOKING_REQUEST_TTL_MS = 60 * 60 * 1000;

// How long to keep retrying the nearby-worker search when NONE were found at
// booking-creation time, before finally declaring "no workers available".
const INITIAL_SEARCH_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

// Fallback for Settings.manualEscalationDuration — how long a booking may sit
// unassigned before the ops team is pulled in.
const DEFAULT_MANUAL_ESCALATION_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Flags bookings that have gone too long without a worker so the ops team can
 * start assigning by hand.
 *
 * Deliberately does NOT touch the automatic search: outstanding BookingRequests
 * keep their full response window and the wave machinery carries on. This is an
 * escalation, not a takeover — the booking is simply visible to ops as well
 * now, and either path can complete it.
 */
const escalateStaleBookingsToOps = async (manualEscalationMs, io) => {
  try {
    const cutoff = new Date(Date.now() - manualEscalationMs);

    const stale = await HomeServiceBooking.find({
      status: BOOKING_STATUS.SEARCHING,
      workerId: null,
      createdAt: { $lte: cutoff },
      // Only escalate once.
      assignmentStatus: { $ne: 'manual_assignment_required' }
    }).select('_id userId bookingNumber');

    for (const booking of stale) {
      await HomeServiceBooking.updateOne(
        { _id: booking._id },
        { $set: { assignmentStatus: 'manual_assignment_required' } }
      );

      console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: unassigned past the escalation window → ops queue (automatic search continues).`);

      try {
        io.to(`user_${booking.userId}`).emit('booking_updated', {
          bookingId: booking._id,
          // The customer-facing state doesn't change — they're still waiting
          // for a professional, and how we find one isn't their concern.
          status: BOOKING_STATUS.SEARCHING,
          message: 'We are assigning a service professional to your booking.'
        });
      } catch { /* socket optional */ }
    }
  } catch (err) {
    console.error('[WaveScheduler] Ops escalation check failed:', err);
  }
};

/**
 * Handles bookings that had ZERO nearby partners at creation time (currentWave === 0).
 * Re-runs the geo search on every scheduler tick (10s) for up to 3 minutes.
 * If partners show up in that window, kicks off Wave 1 normally.
 * If the 3-minute window elapses with still nothing found, marks the booking failed.
 */
const handleInitialSearchRetry = async (booking, io) => {
  try {
    const timeElapsed = Date.now() - new Date(booking.waveStartedAt).getTime();
    const bookingModel = 'worker';

    // Same admin-configured response window the main loop uses, so a worker
    // alerted from this retry path gets an identical countdown.
    const windowSettings = await Settings.findOne({ type: 'global' }).select('waveDuration').lean();
    const RETRY_RESPONSE_WINDOW_SEC = windowSettings?.waveDuration || Math.round(DEFAULT_WAVE_TIMEOUT_MS / 1000);

    const bookingLocation = { lat: booking.address?.lat, lng: booking.address?.lng };
    let partners = [];

    if (bookingLocation.lat && bookingLocation.lng) {
      const globalSettings = await Settings.findOne({ type: 'global' }).select('searchRadius').lean();
      const searchRadius = globalSettings?.searchRadius || 10;
      const filters = { service: booking.serviceCategory };

      partners = await findNearbyWorkers(bookingLocation, searchRadius, filters);

      // Dedupe by id
      const seen = new Set();
      partners = partners.filter(p => {
        const idStr = p._id.toString();
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      });
    }

    if (partners.length > 0) {
      // Found some! Kick off Wave 1 exactly like a normal successful search.
      const sortedPartners = partners.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      const wave1Partners = sortedPartners.slice(0, WORKERS_PER_WAVE);

      booking.potentialWorkers = sortedPartners.map(v => ({ workerId: v._id, distance: v.distance || 0 }));
      booking.currentWave = 1;
      booking.waveStartedAt = new Date();
      booking.notifiedPartners = wave1Partners.map(v => v._id);
      await booking.save();

      const newRequests = wave1Partners.map(pw => ({
        bookingId: booking._id,
        workerId: pw._id,
        status: 'PENDING',
        wave: 1,
        distance: pw.distance || null,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + BOOKING_REQUEST_TTL_MS)
      }));

      try {
        await BookingRequest.insertMany(newRequests, { ordered: false });
      } catch (err) {
        if (err.code !== 11000) console.error('[WaveScheduler] BookingRequest insert error:', err);
      }

      wave1Partners.forEach(pw => {
        const room = `worker_${pw._id.toString()}`;
        io.to(room).emit('new_job_assigned', {
          bookingId: booking._id,
          serviceName: booking.serviceName,
          address: booking.address,
          price: booking.finalAmount,
          serviceCategory: booking.serviceCategory,
          brandName: booking.brandName,
          brandIcon: booking.brandIcon,
          categoryIcon: booking.categoryIcon,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          createdAt: new Date().toISOString(),
          respondBySeconds: RETRY_RESPONSE_WINDOW_SEC,
          responseWindowSeconds: RETRY_RESPONSE_WINDOW_SEC
        });

        createNotification({
          workerId: pw._id,
          type: 'new_job_assigned',
          title: 'New Job Alert',
          message: `New booking for ${booking.serviceName} is available near you.`,
          relatedId: booking._id,
          relatedType: 'booking',
          priority: 'high',
          pushData: { type: 'new_job', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
        });
      });

      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: BOOKING_STATUS.SEARCHING,
        message: 'Found nearby professionals! Sending your request now...'
      });

      console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: Found ${wave1Partners.length} ${bookingModel}(s) during retry search (after ${Math.round(timeElapsed / 1000)}s).`);
      return;
    }

    // Still nothing found this tick.
    if (timeElapsed >= INITIAL_SEARCH_WINDOW_MS) {
      // 3 minutes of retrying with zero partners found. This is NOT a failed
      // booking — it hands over to the ops team's manual-assignment queue and
      // the booking stays active.
      booking.status = BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED;
      booking.assignmentStatus = 'manual_assignment_required';
      booking.waveStartedAt = null;
      await booking.save();

      console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: No ${bookingModel}s found after 3 minutes. Handing to manual assignment.`);

      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
        message: 'We are assigning a service professional to your booking.'
      });

      await createNotification({
        userId: booking.userId,
        type: 'assignment_pending',
        title: 'Assigning Your Professional',
        // Deliberately says nothing about workers rejecting, timing out, or
        // the team calling around — internal detail the customer shouldn't see.
        message: 'Your order has been taken successfully. We are currently assigning a service professional to your booking. You will receive the professional details shortly.',
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high',
        pushData: { type: 'assignment_pending', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
      });
    }
    // else: still within the 3-minute window — do nothing, next tick (10s) will retry again.
  } catch (err) {
    console.error(`[WaveScheduler] Initial search retry failed for booking ${booking.bookingNumber}:`, err);
  }
};

export const startWaveScheduler = (io) => {
  if (!io) {
    console.error('[WaveScheduler] Cannot start: Socket.io instance not provided.');
    return;
  }

  console.log('[WaveScheduler] Starting Wave Scheduler (runs every 10s)...');

  setInterval(async () => {
    try {
      // Admin-configurable worker response window (Settings.waveDuration,
      // seconds) — read once per tick rather than per-booking. Falls back to
      // the 60s default if Settings hasn't been created/configured yet.
      const globalSettings = await Settings.findOne({ type: 'global' })
        .select('waveDuration manualEscalationDuration')
        .lean();
      const waveTimeoutMs = globalSettings?.waveDuration ? globalSettings.waveDuration * 1000 : DEFAULT_WAVE_TIMEOUT_MS;
      const manualEscalationMs = globalSettings?.manualEscalationDuration
        ? globalSettings.manualEscalationDuration * 1000
        : DEFAULT_MANUAL_ESCALATION_MS;

      // Find bookings that are currently in SEARCHING status and have an active wave
      const activeBookings = await HomeServiceBooking.find({
        status: BOOKING_STATUS.SEARCHING,
        waveStartedAt: { $ne: null }
      });

      // Hand long-unassigned bookings to the ops team, WITHOUT stopping the
      // automatic search. The worker who was already notified keeps their full
      // response window; ops just starts working the same booking in parallel,
      // and whoever lands first wins. Without this the customer waits out every
      // wave before anyone human looks at it.
      await escalateStaleBookingsToOps(manualEscalationMs, io);

      for (const booking of activeBookings) {
        // currentWave === 0 means the initial search found zero partners — keep
        // retrying the geo search (instead of advancing/expiring a wave) until
        // either partners show up or the 3-minute window elapses.
        if (booking.currentWave === 0) {
          await handleInitialSearchRetry(booking, io);
          continue;
        }

        const timeElapsed = Date.now() - new Date(booking.waveStartedAt).getTime();
        let shouldAdvanceWave = false;

        // Condition 1: Wave Timeout Reached (admin-configured response window)
        if (timeElapsed >= waveTimeoutMs) {
          shouldAdvanceWave = true;
        } else {
          // Condition 2: Check if all notified workers for the CURRENT wave have REJECTED
          const currentWaveRequests = await BookingRequest.find({
            bookingId: booking._id,
            wave: booking.currentWave
          });

          if (currentWaveRequests.length > 0) {
            const allRejected = currentWaveRequests.every(req => req.status === 'REJECTED' || req.status === 'EXPIRED');
            if (allRejected) {
              shouldAdvanceWave = true;
              console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: All workers in Wave ${booking.currentWave} rejected early.`);
            }
          }
        }

        if (shouldAdvanceWave) {
          // Expire pending requests from the old wave
          await BookingRequest.updateMany(
            { bookingId: booking._id, wave: booking.currentWave, status: 'PENDING' },
            { $set: { status: 'EXPIRED' } }
          );

          // Find the next batch of workers
          const potentialWorkers = booking.potentialWorkers || [];
          
          // Robust check: Get all workers who have already been notified for this booking across ALL waves
          const pastRequests = await BookingRequest.find({ bookingId: booking._id });
          const notifiedWorkerIds = pastRequests.map(req => String(req.workerId));

          // Filter workers who haven't been notified yet
          const unnotifiedWorkers = potentialWorkers.filter(
            pw => !notifiedWorkerIds.includes(String(pw.workerId))
          );

          if (unnotifiedWorkers.length === 0) {
            // Everyone eligible has been asked and nobody took it. Hand over to
            // the ops team — the booking remains active.
            console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: all eligible workers exhausted → manual assignment.`);

            // Anyone still sitting on an unanswered request timed out; record
            // it so ops can see the attempt history rather than guessing.
            (booking.assignmentAttempts || []).forEach((att) => {
              if (att.outcome === 'notified') {
                att.outcome = 'timeout';
                att.respondedAt = new Date();
              }
            });

            booking.status = BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED;
            booking.assignmentStatus = 'manual_assignment_required';
            booking.waveStartedAt = null;
            await booking.save();

            // Re-open the offer to everyone who didn't explicitly decline.
            //
            // Advancing a wave expires that wave's PENDING requests, so by the
            // time the last wave was exhausted EVERY request was EXPIRED and
            // the job was invisible in every worker's panel — roughly two
            // minutes after booking. The booking still needs a worker, so any
            // request still inside its TTL goes back to PENDING; workers who
            // actually pressed reject stay rejected.
            await BookingRequest.updateMany(
              {
                bookingId: booking._id,
                status: 'EXPIRED',
                expiresAt: { $gt: new Date() }
              },
              { $set: { status: 'PENDING' } }
            );

            io.to(`user_${booking.userId}`).emit('booking_updated', {
              bookingId: booking._id,
              status: BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
              message: 'We are assigning a service professional to your booking.'
            });

            await createNotification({
              userId: booking.userId,
              type: 'assignment_pending',
              title: 'Assigning Your Professional',
              message: 'Your order has been taken successfully. We are currently assigning a service professional to your booking. You will receive the professional details shortly.',
              relatedId: booking._id,
              relatedType: 'booking',
              priority: 'high',
              pushData: { type: 'assignment_pending', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
            });

            continue;
          }

          // We have more workers to notify! Take the next batch.
          const nextBatch = unnotifiedWorkers.slice(0, WORKERS_PER_WAVE);
          const nextWaveNumber = (booking.currentWave || 1) + 1;

          console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: Advancing to Wave ${nextWaveNumber} with ${nextBatch.length} workers.`);

          booking.currentWave = nextWaveNumber;
          booking.waveStartedAt = new Date();
          booking.assignmentStatus = 'searching';

          // Log every worker we ask, so the manual-assignment queue can show
          // ops what was already tried instead of them re-calling the same
          // people.
          booking.assignmentAttempts = booking.assignmentAttempts || [];
          nextBatch.forEach((pw) => {
            booking.assignmentAttempts.push({
              workerId: pw.workerId,
              waveNumber: nextWaveNumber,
              notifiedAt: new Date(),
              outcome: 'notified'
            });
          });

          await booking.save();

          // Create Booking Requests
          const newRequests = nextBatch.map(pw => ({
            bookingId: booking._id,
            workerId: pw.workerId,
            status: 'PENDING',
            wave: nextWaveNumber,
            distance: pw.distance,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + BOOKING_REQUEST_TTL_MS)
          }));

          await BookingRequest.insertMany(newRequests, { ordered: false });

          // Fetch full booking details to send to worker
          const fullBooking = await HomeServiceBooking.findById(booking._id)
            .populate('userId', 'name phone')
            .lean();

          // Emit to new workers
          nextBatch.forEach(pw => {
            const workerRoom = `worker_${pw.workerId}`;
            io.to(workerRoom).emit('new_job_assigned', {
              bookingId: booking._id,
              serviceName: fullBooking.serviceName,
              customerName: fullBooking.userId?.name || 'Customer',
              customerPhone: fullBooking.userId?.phone,
              address: fullBooking.address,
              price: fullBooking.finalAmount,
              serviceCategory: fullBooking.serviceCategory,
              brandName: fullBooking.brandName,
              brandIcon: fullBooking.brandIcon,
              categoryIcon: fullBooking.categoryIcon,
              scheduledDate: fullBooking.scheduledDate,
              scheduledTime: fullBooking.scheduledTime,
              createdAt: new Date().toISOString(),
              // Real response window, so the worker's countdown matches what
              // the server actually allows. The alert card hard-coded 60s and
              // AUTO-REJECTED at zero, losing the job minutes early.
              respondBySeconds: Math.round(waveTimeoutMs / 1000),
              responseWindowSeconds: Math.round(waveTimeoutMs / 1000)
            });

            createNotification({
              workerId: pw.workerId,
              type: 'new_job_assigned',
              title: 'New Job Alert',
              message: `New booking for ${fullBooking.serviceName} is available near you.`,
              relatedId: booking._id,
              relatedType: 'booking',
              priority: 'high',
              pushData: { type: 'new_job', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
            });
          });

          // Notify User about the ongoing search progress
          io.to(`user_${booking.userId}`).emit('booking_updated', {
            bookingId: booking._id,
            status: BOOKING_STATUS.SEARCHING,
            message: `Expanding search to more professionals (Wave ${nextWaveNumber})... Please hold on.`
          });
        }
      }
    } catch (error) {
      console.error('[WaveScheduler] Error running scheduler cycle:', error);
    }
  }, 10000); // Run every 10 seconds
};
