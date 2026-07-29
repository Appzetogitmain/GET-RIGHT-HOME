import HomeServiceBooking from '../models/HomeServiceBooking.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';
import Worker from '../models/Worker.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';

// The Wave Timeout in milliseconds (60 seconds)
const WAVE_TIMEOUT_MS = 60000;
const WORKERS_PER_WAVE = 3;

export const startWaveScheduler = (io) => {
  if (!io) {
    console.error('[WaveScheduler] Cannot start: Socket.io instance not provided.');
    return;
  }

  console.log('[WaveScheduler] Starting Wave Scheduler (runs every 10s)...');

  setInterval(async () => {
    try {
      // Find bookings that are currently in SEARCHING status and have an active wave
      const activeBookings = await HomeServiceBooking.find({
        status: BOOKING_STATUS.SEARCHING,
        waveStartedAt: { $ne: null }
      });

      for (const booking of activeBookings) {
        const timeElapsed = Date.now() - new Date(booking.waveStartedAt).getTime();
        let shouldAdvanceWave = false;

        // Condition 1: Wave Timeout Reached (60 seconds)
        if (timeElapsed >= WAVE_TIMEOUT_MS) {
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
            // No more workers left to notify
            console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: No more workers available.`);
            booking.status = BOOKING_STATUS.NO_WORKERS;
            booking.waveStartedAt = null;
            await booking.save();

            // Notify User
            io.to(`user_${booking.userId}`).emit('booking_updated', {
              bookingId: booking._id,
              status: BOOKING_STATUS.NO_WORKERS,
              message: 'Our team will shortly contact you directly and assign an Expert.'
            });

            await createNotification({
              userId: booking.userId,
              type: 'booking_failed',
              title: 'No Professionals Available',
              message: 'We couldn\'t find any professionals nearby at the moment. Our team will contact you shortly.',
              relatedId: booking._id,
              relatedType: 'booking',
              priority: 'high',
              pushData: { type: 'booking_failed', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
            });

            continue;
          }

          // We have more workers to notify! Take the next batch.
          const nextBatch = unnotifiedWorkers.slice(0, WORKERS_PER_WAVE);
          const nextWaveNumber = (booking.currentWave || 1) + 1;

          console.log(`[WaveScheduler] Booking ${booking.bookingNumber}: Advancing to Wave ${nextWaveNumber} with ${nextBatch.length} workers.`);

          booking.currentWave = nextWaveNumber;
          booking.waveStartedAt = new Date();
          
          await booking.save();

          // Create Booking Requests
          const newRequests = nextBatch.map(pw => ({
            bookingId: booking._id,
            workerId: pw.workerId,
            status: 'PENDING',
            wave: nextWaveNumber,
            distance: pw.distance,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + WAVE_TIMEOUT_MS)
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
              createdAt: new Date().toISOString()
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
