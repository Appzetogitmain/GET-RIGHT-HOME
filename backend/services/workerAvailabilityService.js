import Worker from '../models/Worker.js';
import Settings from '../models/Settings.js';
import PlatformSettings from '../models/PlatformSettings.js';
import WorkerOfflineRequest from '../models/WorkerOfflineRequest.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';
import { getIO } from '../sockets.js';
import {
  ALL_WEEKDAYS,
  istYmd,
  istDayStart,
  addDaysYmd,
  weekdayOfYmd,
  getWorkerFutureBookings,
  getAdvanceBookingDays
} from '../utils/slotAvailability.js';
import { getBookingWindow } from '../utils/slotAvailability.js';
import { generateTimeSlots } from '../utils/slotGenerator.js';
import { findWorkerActiveJob } from './workerCapacityService.js';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class AvailabilityError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const activeLeaves = (workerId) => WorkerOfflineRequest.find({
  workerId,
  isFullDay: true,
  status: { $in: ['pending', 'approved'] },
  dateStr: { $gte: istYmd(new Date()) }
}).sort({ dateStr: 1 }).lean();

/** What the availability calendar needs to render for a worker. */
export const getAvailabilityView = async (workerId) => {
  const [worker, leaves, bookings, advanceBookingDays, hs, platform, activeJob] = await Promise.all([
    Worker.findById(workerId).select('name status isOnline availability').lean(),
    activeLeaves(workerId),
    getWorkerFutureBookings(workerId),
    getAdvanceBookingDays(),
    Settings.findOne({ type: 'global' }).select('workerLeaveAutoApprove requireDailyAvailability').lean(),
    PlatformSettings.getSettings(),
    findWorkerActiveJob(workerId)
  ]);
  if (!worker) throw new AvailabilityError('Worker not found', 404);

  const days = worker.availability?.availableDays;
  const todayYmd = istYmd(new Date());
  const availableDays = Array.isArray(days) && days.length ? days : ALL_WEEKDAYS;
  const availableDates = (worker.availability?.availableDates || []).filter((d) => d >= todayYmd).sort();
  const requireDailyAvailability = hs?.requireDailyAvailability !== false;
  const leaveByDate = new Map(leaves.map((leave) => [leave.dateStr, leave]));
  const hours = platform?.operatingHours || {};
  const platformSlots = generateTimeSlots(hours.openingTime, hours.closingTime, hours.slotDuration, hours.slotInterval);
  const now = new Date();

  const slotSchedule = Array.from({ length: advanceBookingDays }, (_, offset) => {
    const date = addDaysYmd(todayYmd, offset);
    const leave = leaveByDate.get(date);
    const explicitlyAvailable = availableDates.includes(date);
    const dayAvailable = !leave && (requireDailyAvailability ? explicitlyAvailable : availableDays.includes(weekdayOfYmd(date)));
    const slots = platformSlots.map((slot) => {
      const window = getBookingWindow({
        scheduledDate: istDayStart(date),
        timeSlot: { start: slot.value, end: slot.end }
      });
      const booking = window && bookings.find((item) => item.window.start < window.end && item.window.end > window.start);
      let status = 'unavailable';
      if (booking) status = 'busy';
      else if (activeJob) status = 'capacity_blocked';
      else if (leave) status = 'leave';
      else if (window?.end <= now) status = 'elapsed';
      else if (dayAvailable) status = 'available';
      return {
        value: slot.value,
        end: slot.end,
        display: slot.display,
        range: slot.range,
        status,
        booking: (booking || activeJob) ? {
          id: (booking || activeJob)._id,
          bookingNumber: (booking || activeJob).bookingNumber,
          serviceName: (booking || activeJob).serviceName,
          serviceCategory: (booking || activeJob).serviceCategory,
          bookingType: (booking || activeJob).bookingType,
          status: (booking || activeJob).status
        } : null
      };
    });
    return {
      date,
      isLeave: !!leave,
      isAvailable: dayAvailable,
      summary: {
        busy: slots.filter((slot) => ['busy', 'capacity_blocked'].includes(slot.status)).length,
        available: slots.filter((slot) => slot.status === 'available').length,
        unavailable: slots.filter((slot) => !['busy', 'capacity_blocked', 'available'].includes(slot.status)).length
      },
      slots
    };
  });

  return {
    workerName: worker.name,
    workerStatus: worker.status,
    isOnline: !!worker.isOnline,
    activeJob: activeJob ? {
      id: activeJob._id,
      bookingNumber: activeJob.bookingNumber,
      serviceName: activeJob.serviceName,
      bookingType: activeJob.bookingType,
      status: activeJob.status
    } : null,
    availableDays,
    availableDates,
    requireDailyAvailability,
    leaves: leaves.map((l) => ({ id: l._id, date: l.dateStr, status: l.status, reason: l.reason })),
    bookedDates: [...new Set(bookings.map((b) => istYmd(b.window.start)))].sort(),
    slotSchedule,
    advanceBookingDays,
    leaveAutoApprove: !!hs?.workerLeaveAutoApprove
  };
};

/**
 * Replace a worker's marked weekdays and full-day leave dates.
 * Leave dates missing from `leaveDates` are cancelled, new ones created.
 * Refuses changes that would strand a job the worker already holds.
 */
export const applyAvailability = async (workerId, { availableDays, availableDates, leaveDates, reason }, { byAdmin = false, adminId = null } = {}) => {
  const worker = await Worker.findById(workerId);
  if (!worker) throw new AvailabilityError('Worker not found', 404);

  const today = istYmd(new Date());
  // Workers manage the same window customers can book in (admin setting).
  const advanceDays = await getAdvanceBookingDays();
  const lastAllowed = addDaysYmd(today, advanceDays - 1);
  const subject = byAdmin ? 'This worker has' : 'You have';

  // ---- validate input ----
  const days = availableDays === undefined
    ? (worker.availability?.availableDays?.length ? worker.availability.availableDays : ALL_WEEKDAYS)
    : [...new Set(availableDays)].sort();
  if (!days.length || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new AvailabilityError('Select at least one available weekday.');
  }

  const requestedLeave = leaveDates === undefined ? null : [...new Set(leaveDates)].sort();
  if (requestedLeave) {
    const bad = requestedLeave.find((d) => !YMD_RE.test(d) || d < today || d > lastAllowed);
    if (bad) throw new AvailabilityError(`Leave date ${bad} is invalid. Choose a day within the next ${advanceDays} days.`);
  }

  // Dates explicitly marked Available. A date is either Available or Leave,
  // never both — leave wins.
  let markedAvailable = availableDates === undefined
    ? (worker.availability?.availableDates || []).filter((d) => d >= today)
    : [...new Set(availableDates)].sort();
  if (availableDates !== undefined) {
    const badDate = markedAvailable.find((d) => !YMD_RE.test(d) || d < today || d > lastAllowed);
    if (badDate) throw new AvailabilityError(`Date ${badDate} is outside the next ${advanceDays} days.`);
  }
  if (requestedLeave) markedAvailable = markedAvailable.filter((d) => !requestedLeave.includes(d));

  const existing = await activeLeaves(workerId);
  const existingByDate = new Map(existing.map((l) => [l.dateStr, l]));
  // A day a worker has already marked (Available or Leave) is final — only the
  // admin can change it. Workers can still mark days that are not marked yet.
  if (!byAdmin) {
    const savedAvailable = (worker.availability?.availableDates || []).filter((d) => d >= today);
    const lockedAvailable = savedAvailable.filter((d) => !markedAvailable.includes(d));
    const lockedLeave = requestedLeave ? existing.map((l) => l.dateStr).filter((d) => !requestedLeave.includes(d)) : [];
    const changed = [...new Set([...lockedAvailable, ...lockedLeave])].sort();
    if (changed.length) {
      throw new AvailabilityError(
        `${changed.join(', ')} ${changed.length === 1 ? 'is' : 'are'} already marked and can't be changed. Contact admin to change a marked day.`,
        409,
        { dates: changed }
      );
    }
  }

  const toAdd = requestedLeave ? requestedLeave.filter((d) => !existingByDate.has(d)) : [];
  const toRemove = requestedLeave ? existing.filter((l) => !requestedLeave.includes(l.dateStr)) : [];

  // ---- don't strand jobs the worker already holds ----
  const bookings = await getWorkerFutureBookings(workerId);
  const bookedYmds = bookings.map((b) => istYmd(b.window.start));
  const leaveClash = toAdd.filter((d) => bookedYmds.includes(d));
  if (leaveClash.length) {
    throw new AvailabilityError(
      `${subject} a booking on ${leaveClash.join(', ')}. ${byAdmin ? 'Reassign' : 'Ask admin to reassign or release'} it before marking leave.`,
      409,
      { dates: leaveClash }
    );
  }
  const removedWeekdays = ALL_WEEKDAYS.filter((d) => !days.includes(d));
  const dayClash = [...new Set(bookedYmds.filter((d) => removedWeekdays.includes(weekdayOfYmd(d))))];
  if (dayClash.length) {
    throw new AvailabilityError(
      `${subject} bookings on ${dayClash.join(', ')} which fall on unavailable weekdays (${removedWeekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')}).`,
      409,
      { dates: dayClash }
    );
  }

  // In daily-marking mode a day the worker already has a job on must stay available.
  const cfg = await Settings.findOne({ type: 'global' }).select('requireDailyAvailability').lean();
  if (cfg?.requireDailyAvailability !== false && availableDates !== undefined) {
    const dropped = [...new Set(bookedYmds.filter((d) => d >= today && !markedAvailable.includes(d) && !(requestedLeave || []).includes(d)))];
    if (dropped.length) {
      throw new AvailabilityError(
        `${subject} bookings on ${dropped.join(', ')}. Those days must stay marked available.`,
        409,
        { dates: dropped }
      );
    }
  }

  // ---- apply ----
  worker.availability = { availableDays: days, availableDates: markedAvailable, updatedAt: new Date() };

  if (toRemove.length) {
    await WorkerOfflineRequest.updateMany({ _id: { $in: toRemove.map((l) => l._id) } }, { $set: { status: 'cancelled' } });
  }

  const hs = await Settings.findOne({ type: 'global' }).select('workerLeaveAutoApprove').lean();
  const approveNow = byAdmin || !!hs?.workerLeaveAutoApprove;
  const created = [];
  for (const dateStr of toAdd) {
    const start = istDayStart(dateStr);
    created.push(await WorkerOfflineRequest.create({
      workerId,
      date: start,
      dateStr,
      startSlot: { value: '00:00', display: 'Full day' },
      endSlot: { value: '23:59', display: 'Full day' },
      startDateTime: start,
      endDateTime: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000),
      reason: reason || 'Day off',
      isFullDay: true,
      status: approveNow ? 'approved' : 'pending',
      reviewedBy: approveNow && adminId ? adminId : null,
      reviewedAt: approveNow ? new Date() : null,
      originalSlots: { dateStr }
    }));
  }

  // Leave that starts today takes effect now.
  if (approveNow && toAdd.includes(today)) {
    worker.isOnline = false;
    if (worker.status !== 'busy') worker.status = 'offline';
  }
  await worker.save();

  if (created.length && !approveNow) {
    try {
      const summary = `${worker.name} requested leave on ${toAdd.join(', ')}.`;
      await createNotification({
        recipientType: 'admin',
        title: 'New Worker Leave Request',
        message: summary,
        type: 'worker_offline_request',
        data: { workerId: worker._id, workerName: worker.name }
      });
      getIO()?.to('admin_room').emit('worker_offline_request', {
        title: 'New Leave Request',
        workerId: worker._id,
        workerName: worker.name,
        message: summary
      });
    } catch (err) {
      console.warn('Failed to notify admin of leave request:', err.message);
    }
  }
  getIO()?.to('admin_room').emit('offline_request_updated', { workerId: worker._id });

  return getAvailabilityView(workerId);
};
