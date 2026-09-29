import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Settings from '../models/Settings.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { getBookingWindow } from '../utils/slotAvailability.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';

const TICK_MS = 30 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const DEFAULT_LEAD_MIN = 120;
const DEFAULT_CONFIRM_MIN = 15;

// Jobs a worker holds but hasn't started travelling to yet.
export const REMINDABLE_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED
];

/** Payload the worker popup needs, shared by the socket event and the poll endpoint. */
export const buildReminderPayload = (booking, confirmMinutes) => ({
  bookingId: booking._id,
  bookingNumber: booking.bookingNumber,
  serviceName: booking.serviceName,
  scheduledDate: booking.scheduledDate,
  scheduledTime: booking.scheduledTime,
  address: booking.address,
  reminderSentAt: booking.reminderSentAt,
  confirmBySeconds: Math.max(
    0,
    Math.round(((new Date(booking.reminderSentAt).getTime() || Date.now()) + confirmMinutes * MINUTE_MS - Date.now()) / 1000)
  )
});

export const sendDueReminders = async (io, leadMin, confirmMin) => {
  const now = Date.now();
  const candidates = await HomeServiceBooking.find({
    workerId: { $ne: null },
    status: { $in: REMINDABLE_STATUSES },
    reminderSentAt: null,
    scheduledDate: { $gte: new Date(now - DAY_MS), $lte: new Date(now + leadMin * MINUTE_MS + 2 * DAY_MS) }
  }).select('workerId bookingNumber serviceName scheduledDate scheduledTime timeSlot address');

  for (const booking of candidates) {
    const window = getBookingWindow(booking);
    if (!window) continue;
    const start = window.start.getTime();
    // Due once inside the lead window; never for a slot that already started.
    if (now < start - leadMin * MINUTE_MS || now >= start) continue;

    // Claim atomically so two ticks / instances can't both send it.
    const claimed = await HomeServiceBooking.findOneAndUpdate(
      { _id: booking._id, reminderSentAt: null, workerId: booking.workerId, status: { $in: REMINDABLE_STATUSES } },
      { $set: { reminderSentAt: new Date() } },
      { new: true }
    ).select('workerId bookingNumber serviceName scheduledDate scheduledTime address reminderSentAt');
    if (!claimed) continue;

    const payload = buildReminderPayload(claimed, confirmMin);
    io?.to(`worker_${claimed.workerId}`).emit('job_reminder', payload);

    createNotification({
      workerId: claimed.workerId,
      type: 'job_reminder',
      title: 'Upcoming Job — Please Confirm',
      message: `Booking #${claimed.bookingNumber} (${claimed.serviceName}) starts at ${claimed.scheduledTime}. Confirm within ${confirmMin} min that you'll be there.`,
      relatedId: claimed._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'job_reminder', bookingId: claimed._id.toString(), link: `/worker/job/${claimed._id}` }
    }).catch(() => {});
  }
};

export const escalateUnconfirmed = async (io, confirmMin) => {
  const cutoff = new Date(Date.now() - confirmMin * MINUTE_MS);
  const overdue = await HomeServiceBooking.find({
    workerId: { $ne: null },
    status: { $in: REMINDABLE_STATUSES },
    reminderSentAt: { $ne: null, $lte: cutoff },
    reminderConfirmedAt: null,
    reminderEscalatedAt: null
  }).select('_id workerId bookingNumber serviceName scheduledTime').populate('workerId', 'name phone');

  for (const booking of overdue) {
    const claimed = await HomeServiceBooking.updateOne(
      { _id: booking._id, reminderEscalatedAt: null, reminderConfirmedAt: null },
      { $set: { reminderEscalatedAt: new Date() } }
    );
    if (!claimed.modifiedCount) continue;

    const workerName = booking.workerId?.name || 'The assigned professional';
    const message = `${workerName} has not confirmed booking #${booking.bookingNumber} (${booking.serviceName}, ${booking.scheduledTime}). You can re-broadcast it to other professionals.`;

    io?.to('admin_room').emit('worker_reminder_unconfirmed', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      workerName,
      workerPhone: booking.workerId?.phone,
      scheduledTime: booking.scheduledTime,
      message
    });

    createNotification({
      recipientType: 'admin',
      type: 'worker_unconfirmed',
      title: 'Professional Not Responding',
      message,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    }).catch(() => {});
  }
};

export const startJobReminderScheduler = (io) => {
  console.log('[JobReminder] Starting job reminder scheduler (runs every 30s)...');
  let running = false;

  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const s = await Settings.findOne({ type: 'global' }).select('jobReminderLeadMinutes jobReminderConfirmMinutes').lean();
      const leadMin = s?.jobReminderLeadMinutes || DEFAULT_LEAD_MIN;
      const confirmMin = s?.jobReminderConfirmMinutes || DEFAULT_CONFIRM_MIN;

      await sendDueReminders(io, leadMin, confirmMin);
      await escalateUnconfirmed(io, confirmMin);
    } catch (err) {
      console.error('[JobReminder] tick failed:', err);
    } finally {
      running = false;
    }
  }, TICK_MS);
};
