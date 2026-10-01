import Worker from '../models/Worker.js';
import Settings from '../models/Settings.js';
import PlatformSettings from '../models/PlatformSettings.js';
import WorkerOfflineRequest from '../models/WorkerOfflineRequest.js';
import WorkerAvailabilityRequest from '../models/WorkerAvailabilityRequest.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';
import { getIO } from '../sockets.js';
import {
  ALL_WEEKDAYS,
  istYmd,
  istDayStart,
  addDaysYmd,
  weekdayOfYmd,
  getWorkerFutureBookings,
  getAdvanceBookingDays,
  isLegacyAvailabilityEnabled
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

// Slot-wise leave: one WorkerOfflineRequest per slot (reviewed on the usual
// offline-requests screen). Only an approved one blocks bookings.
const SLOT_OFF_NOTE = 'slot_off';
const activeSlotLeaves = (workerId) => WorkerOfflineRequest.find({
  workerId,
  isFullDay: false,
  notes: SLOT_OFF_NOTE,
  status: { $in: ['pending', 'approved'] },
  dateStr: { $gte: istYmd(new Date()) }
}).sort({ dateStr: 1 }).lean();

const groupSlotLeaves = (list) => list.reduce((acc, l) => {
  (acc[l.dateStr] = acc[l.dateStr] || []).push(l.startSlot?.value);
  return acc;
}, {});

const hhmm12 = (value) => {
  const [h, m] = String(value).split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${suffix}`;
};

/** What the availability calendar needs to render for a worker. */
export const getAvailabilityView = async (workerId) => {
  const [worker, leaves, bookings, advanceBookingDays, hs, platform, activeJob, pendingAvailability, slotLeaves] = await Promise.all([
    Worker.findById(workerId).select('name status isOnline availability').lean(),
    activeLeaves(workerId),
    getWorkerFutureBookings(workerId),
    getAdvanceBookingDays(),
    Settings.findOne({ type: 'global' }).select('workerLeaveAutoApprove requireDailyAvailability availabilityRequiresApproval').lean(),
    PlatformSettings.getSettings(),
    findWorkerActiveJob(workerId),
    WorkerAvailabilityRequest.find({ workerId, status: 'pending', dateStr: { $gte: istYmd(new Date()) } }).select('dateStr').lean(),
    activeSlotLeaves(workerId)
  ]);
  if (!worker) throw new AvailabilityError('Worker not found', 404);

  const days = worker.availability?.availableDays;
  const todayYmd = istYmd(new Date());
  const availableDays = Array.isArray(days) && days.length ? days : ALL_WEEKDAYS;
  const legacyAvailable = isLegacyAvailabilityEnabled(worker.availability);
  // Preserve the meaning of the old `availability: "AVAILABLE"` field in the
  // new date-based calendar. This also lets the worker/admin see and save the
  // migrated dates instead of opening an apparently empty calendar.
  const availableDates = legacyAvailable
    ? Array.from({ length: advanceBookingDays }, (_, offset) => addDaysYmd(todayYmd, offset))
    : (worker.availability?.availableDates || []).filter((d) => d >= todayYmd).sort();
  const requireDailyAvailability = hs?.requireDailyAvailability !== false;
  const leaveByDate = new Map(leaves.map((leave) => [leave.dateStr, leave]));
  const hours = platform?.operatingHours || {};
  const platformSlots = generateTimeSlots(hours.openingTime, hours.closingTime, hours.slotDuration, hours.slotInterval);
  const now = new Date();
  // slot leave the worker asked for: approved ones block, pending ones wait for admin
  const slotLeaveKey = (l) => `${l.dateStr}|${l.startSlot?.value}`;
  const slotLeaveByKey = new Map(slotLeaves.map((l) => [slotLeaveKey(l), l]));

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
      else if (slotLeaveByKey.get(`${date}|${slot.value}`)?.status === 'approved') status = 'slot_off';
      else if (slotLeaveByKey.get(`${date}|${slot.value}`)?.status === 'pending') status = 'slot_pending';
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
    // { 'YYYY-MM-DD': ['09:00', ...] } slots the worker will not work.
    slotOffs: groupSlotLeaves(slotLeaves),
    slotOffsPending: groupSlotLeaves(slotLeaves.filter((l) => l.status === 'pending')),
    // Days the worker asked to be Available that an admin hasn't approved yet.
    pendingAvailableDates: pendingAvailability.map((r) => r.dateStr).sort(),
    availabilityRequiresApproval: hs?.availabilityRequiresApproval !== false,
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
export const applyAvailability = async (workerId, { availableDays, availableDates, leaveDates, reason, slotOffs }, { byAdmin = false, adminId = null } = {}) => {
  const today = istYmd(new Date());
  // Independent reads run together — each one is a round trip to the database.
  const [worker, advanceDays, existing, bookings, cfg, pendingRequests, platformDoc] = await Promise.all([
    Worker.findById(workerId),
    // Workers manage the same window customers can book in (admin setting).
    getAdvanceBookingDays(),
    activeLeaves(workerId),
    getWorkerFutureBookings(workerId),
    Settings.findOne({ type: 'global' }).select('requireDailyAvailability workerLeaveAutoApprove availabilityRequiresApproval').lean(),
    WorkerAvailabilityRequest.find({ workerId, status: 'pending', dateStr: { $gte: today } }).lean(),
    PlatformSettings.getSettings()
  ]);
  if (!worker) throw new AvailabilityError('Worker not found', 404);
  const platformSlotsCfg = platformDoc?.operatingHours;
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
    ? (isLegacyAvailabilityEnabled(worker.availability)
        ? Array.from({ length: advanceDays }, (_, offset) => addDaysYmd(today, offset))
        : (worker.availability?.availableDates || []).filter((d) => d >= today))
    : [...new Set(availableDates)].sort();
  if (availableDates !== undefined) {
    const badDate = markedAvailable.find((d) => !YMD_RE.test(d) || d < today || d > lastAllowed);
    if (badDate) throw new AvailabilityError(`Date ${badDate} is outside the next ${advanceDays} days.`);
  }
  if (requestedLeave) markedAvailable = markedAvailable.filter((d) => !requestedLeave.includes(d));

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

  // ---- availability approval ----
  // A day the worker newly marks Available is only a request until an admin
  // approves it; already-approved days stay as they are. Admin edits and
  // pre-calendar ("AVAILABLE") workers are applied directly.
  const requiresApproval = !byAdmin && cfg?.availabilityRequiresApproval !== false
    && !isLegacyAvailabilityEnabled(worker.availability);
  const pendingDatesSet = new Set(pendingRequests.map((r) => r.dateStr));
  let newRequestDates = [];
  if (requiresApproval && availableDates !== undefined) {
    const approved = new Set(worker.availability?.availableDates || []);
    newRequestDates = markedAvailable.filter((d) => !approved.has(d) && !pendingDatesSet.has(d));
    markedAvailable = markedAvailable.filter((d) => approved.has(d));
  }
  // A day turned into Leave no longer needs its availability request.
  const supersededRequests = pendingRequests.filter((r) => (requestedLeave || []).includes(r.dateStr));

  // ---- slot-wise leave ----
  // `slotOffs` is the full set the worker wants off: { 'YYYY-MM-DD': ['09:00', ...] }.
  // New ones are requests that an admin must approve (nothing is blocked until
  // then); the worker can withdraw a pending one but an approved one is final.
  // Admin edits apply at once.
  let slotLeaveToAdd = [];
  let slotLeaveToCancel = [];
  if (slotOffs && typeof slotOffs === 'object') {
    const existingSlotLeaves = await activeSlotLeaves(workerId);
    const hours = platformSlotsCfg || {};
    const slotList = generateTimeSlots(hours.openingTime, hours.closingTime, hours.slotDuration, hours.slotInterval);
    const slotByStart = new Map(slotList.map((sl) => [sl.value, sl]));
    const wanted = new Map();
    for (const [dateStr, starts] of Object.entries(slotOffs)) {
      if (!YMD_RE.test(dateStr) || dateStr < today || dateStr > lastAllowed) {
        throw new AvailabilityError(`Date ${dateStr} is outside the next ${advanceDays} days.`);
      }
      for (const start of new Set(Array.isArray(starts) ? starts : [])) {
        if (!slotByStart.has(start)) throw new AvailabilityError(`${start} is not a valid time slot.`);
        wanted.set(`${dateStr}|${start}`, { dateStr, slot: slotByStart.get(start) });
      }
    }
    const haveKeys = new Set(existingSlotLeaves.map((l) => `${l.dateStr}|${l.startSlot?.value}`));
    slotLeaveToAdd = [...wanted.entries()].filter(([key]) => !haveKeys.has(key)).map(([, v]) => v);
    slotLeaveToCancel = existingSlotLeaves.filter((l) => !wanted.has(`${l.dateStr}|${l.startSlot?.value}`)
      && (byAdmin || l.status === 'pending'));

    // A slot that already holds a job can't be switched off.
    for (const { dateStr, slot } of slotLeaveToAdd) {
      const w = getBookingWindow({ scheduledDate: istDayStart(dateStr), timeSlot: { start: slot.value, end: slot.end } });
      const clash = bookings.find((b) => w && b.window.start < w.end && b.window.end > w.start);
      if (clash) {
        throw new AvailabilityError(
          `${subject} booking #${clash.bookingNumber} on ${dateStr} in the ${slot.range || slot.display} slot. ${byAdmin ? 'Reassign' : 'Ask admin to reassign'} it first.`,
          409,
          { dates: [dateStr] }
        );
      }
    }
  }

  // ---- apply ----
  worker.availability = { availableDays: days, availableDates: markedAvailable, updatedAt: new Date() };

  if (toRemove.length) {
    await WorkerOfflineRequest.updateMany({ _id: { $in: toRemove.map((l) => l._id) } }, { $set: { status: 'cancelled' } });
  }

  const approveNow = byAdmin || !!cfg?.workerLeaveAutoApprove;
  const leaveDocs = toAdd.map((dateStr) => {
    const start = istDayStart(dateStr);
    return {
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
    };
  });

  // Leave that starts today takes effect now.
  if (approveNow && toAdd.includes(today)) {
    worker.isOnline = false;
    if (worker.status !== 'busy') worker.status = 'offline';
  }

  const slotApproveNow = byAdmin || !!cfg?.workerLeaveAutoApprove;
  const slotLeaveDocs = slotLeaveToAdd.map(({ dateStr, slot }) => {
    const window = getBookingWindow({ scheduledDate: istDayStart(dateStr), timeSlot: { start: slot.value, end: slot.end } });
    return {
      workerId,
      date: istDayStart(dateStr),
      dateStr,
      startSlot: { value: slot.value, display: hhmm12(slot.value) },
      endSlot: { value: slot.end, display: hhmm12(slot.end) },
      startDateTime: window.start,
      endDateTime: window.end,
      reason: reason || 'Slot off',
      notes: SLOT_OFF_NOTE,
      isFullDay: false,
      status: slotApproveNow ? 'approved' : 'pending',
      reviewedBy: slotApproveNow && adminId ? adminId : null,
      reviewedAt: slotApproveNow ? new Date() : null,
      originalSlots: { dateStr }
    };
  });

  await Promise.all([
    worker.save(),
    slotLeaveDocs.length ? WorkerOfflineRequest.insertMany(slotLeaveDocs) : null,
    slotLeaveToCancel.length
      ? WorkerOfflineRequest.updateMany({ _id: { $in: slotLeaveToCancel.map((l) => l._id) } }, { $set: { status: 'cancelled' } })
      : null,
    leaveDocs.length ? WorkerOfflineRequest.insertMany(leaveDocs) : null,
    newRequestDates.length
      ? WorkerAvailabilityRequest.insertMany(newRequestDates.map((dateStr) => ({ workerId, dateStr })))
      : null,
    supersededRequests.length
      ? WorkerAvailabilityRequest.updateMany({ _id: { $in: supersededRequests.map((r) => r._id) } }, { $set: { status: 'cancelled' } })
      : null
  ]);

  // Admin notifications are fire-and-forget: a slow push/socket round trip
  // must not hold up the worker's Save.
  const io = getIO();
  if (leaveDocs.length && !approveNow) {
    const summary = `${worker.name} requested leave on ${toAdd.join(', ')}.`;
    createNotification({
      recipientType: 'admin',
      title: 'New Worker Leave Request',
      message: summary,
      type: 'worker_offline_request',
      data: { workerId: worker._id, workerName: worker.name }
    }).catch((err) => console.warn('Failed to notify admin of leave request:', err.message));
    io?.to('admin_room').emit('worker_offline_request', {
      title: 'New Leave Request',
      workerId: worker._id,
      workerName: worker.name,
      message: summary
    });
  }
  if (slotLeaveDocs.length && !slotApproveNow) {
    const summary = `${worker.name} requested ${slotLeaveDocs.length} slot${slotLeaveDocs.length === 1 ? '' : 's'} off on ${[...new Set(slotLeaveDocs.map((d) => d.dateStr))].join(', ')}.`;
    createNotification({
      recipientType: 'admin',
      title: 'Slot Leave Request',
      message: summary,
      type: 'worker_offline_request',
      data: { workerId: worker._id, workerName: worker.name }
    }).catch((err) => console.warn('Failed to notify admin of slot leave:', err.message));
    io?.to('admin_room').emit('worker_offline_request', {
      title: 'Slot Leave Request',
      workerId: worker._id,
      workerName: worker.name,
      message: summary
    });
  }
  if (newRequestDates.length) {
    const summary = `${worker.name} requested availability for ${newRequestDates.join(', ')}.`;
    createNotification({
      recipientType: 'admin',
      title: 'Availability Approval Needed',
      message: summary,
      type: 'worker_availability_request',
      data: { workerId: worker._id, workerName: worker.name }
    }).catch((err) => console.warn('Failed to notify admin of availability request:', err.message));
    io?.to('admin_room').emit('worker_offline_request', {
      title: 'Availability Approval Needed',
      workerId: worker._id,
      workerName: worker.name,
      message: summary,
      kind: 'availability'
    });
  }
  io?.to('admin_room').emit('offline_request_updated', { workerId: worker._id });

  return getAvailabilityView(workerId);
};

/**
 * With daily availability required, a worker who hasn't marked today as
 * Available can't be online. Going online is already refused by toggleOnline;
 * this covers a worker who was left online from a previous day (the date rolled
 * over) by switching them offline the next time their status is read.
 * Busy workers keep their capacity status. Returns { requireDaily, todayMarked }.
 */
export const syncOnlineWithTodayAvailability = async (workerId) => {
  const [worker, hs] = await Promise.all([
    Worker.findById(workerId).select('isOnline status availability'),
    Settings.findOne({ type: 'global' }).select('requireDailyAvailability').lean()
  ]);
  const requireDaily = hs?.requireDailyAvailability !== false;
  if (!worker || !requireDaily) return { requireDaily, todayMarked: true, todayPending: false };

  const todayYmd = istYmd(new Date());
  const todayMarked = isLegacyAvailabilityEnabled(worker.availability)
    || (worker.availability?.availableDates || []).includes(todayYmd);
  const todayPending = !todayMarked
    && !!(await WorkerAvailabilityRequest.exists({ workerId, dateStr: todayYmd, status: 'pending' }));

  if (!todayMarked && worker.isOnline) {
    const update = { isOnline: false };
    if (worker.status === 'online') update.status = 'offline';
    await Worker.updateOne({ _id: workerId }, update);
  }
  return { requireDaily, todayMarked, todayPending };
};
