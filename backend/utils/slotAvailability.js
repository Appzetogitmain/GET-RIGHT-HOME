import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Settings from '../models/Settings.js';
import PlatformSettings from '../models/PlatformSettings.js';
import Worker from '../models/Worker.js';
import WorkerOfflineRequest from '../models/WorkerOfflineRequest.js';
import { BOOKING_STATUS } from './constants.js';
import { filterWorkersWithoutActiveJobs, getBusyWorkerIds, isImmediateBooking } from '../services/workerCapacityService.js';

// Platform runs in India; slot times ("09:00") are wall-clock IST.
const IST_OFFSET = '+05:30';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const FALLBACK_SLOT_MINUTES = 60;
export const DEFAULT_BUFFER_MINUTES = 120;
export const DEFAULT_SAME_DAY_LEAD_MINUTES = 60;
export const DEFAULT_ADVANCE_BOOKING_DAYS = 7;
export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

// Older worker documents stored availability as the string "AVAILABLE".
// Treat that value as the old all-days-available setting until the document is
// migrated to the calendar shape. Without this compatibility check, an online
// legacy worker is interpreted as having marked zero dates and every customer
// slot is incorrectly shown as fully booked.
export const isLegacyAvailabilityEnabled = (availability) =>
  typeof availability === 'string' && availability.trim().toUpperCase() === 'AVAILABLE';

// Statuses in which a worker is actually committed to the job. Searching /
// pending / manual-assignment rows have no worker to protect, and completed /
// cancelled ones have freed the worker's time.
export const WORKER_COMMITTED_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.ESTIMATE_PROVIDED,
  BOOKING_STATUS.ESTIMATE_ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS
];

/* ------------------------------------------------------------------ */
/* Admin settings                                                      */
/* ------------------------------------------------------------------ */

/** Admin-configured gap (minutes) a worker needs between two jobs. */
export const getBufferMinutes = async () => {
  const settings = await Settings.findOne({ type: 'global' }).select('bookingBufferMinutes').lean();
  const value = settings?.bookingBufferMinutes;
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_BUFFER_MINUTES;
};

/** Admin-configured minimum notice (minutes) for a scheduled slot. */
export const getSameDayLeadMinutes = async () => {
  const settings = await PlatformSettings.getSettings();
  const value = settings?.operatingHours?.sameDayLeadMinutes;
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_SAME_DAY_LEAD_MINUTES;
};

/** Admin-configured number of days (incl. today) customers can book ahead. */
export const getAdvanceBookingDays = async () => {
  const settings = await Settings.findOne({ type: 'global' }).select('advanceBookingDays').lean();
  const value = settings?.advanceBookingDays;
  return Number.isFinite(value) && value >= 1 ? value : DEFAULT_ADVANCE_BOOKING_DAYS;
};

/* ------------------------------------------------------------------ */
/* Date / window helpers                                               */
/* ------------------------------------------------------------------ */

/** Calendar date (YYYY-MM-DD) of an instant, as seen in IST. */
export const istYmd = (date) => new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Instant at IST midnight of the given YYYY-MM-DD. */
export const istDayStart = (ymd) => new Date(`${ymd}T00:00:00${IST_OFFSET}`);

/** Weekday (0 = Sunday) of a YYYY-MM-DD calendar date. */
export const weekdayOfYmd = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

export const addDaysYmd = (ymd, days) => new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

/** True when the date falls on an IST day after today. */
export const isFutureIstDay = (date) => istYmd(date) > istYmd(new Date());

const toMinutes = (hhmm) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * Absolute [start, end] window of a booking's slot, or null if unschedulable.
 * Accepts anything shaped like { scheduledDate, timeSlot: { start, end } }.
 * Instant bookings ("Now") start at scheduledDate and are assumed to take an hour.
 */
export const getBookingWindow = (booking) => {
  if (!booking?.scheduledDate) return null;
  const base = new Date(booking.scheduledDate);
  if (Number.isNaN(base.getTime())) return null;

  const startMin = toMinutes(booking.timeSlot?.start);
  if (startMin === null) {
    return { start: base, end: new Date(base.getTime() + FALLBACK_SLOT_MINUTES * MINUTE_MS) };
  }

  const dayStart = istDayStart(istYmd(base)).getTime();
  let endMin = toMinutes(booking.timeSlot?.end);
  if (endMin === null || endMin <= startMin) endMin = startMin + FALLBACK_SLOT_MINUTES;

  return {
    start: new Date(dayStart + startMin * MINUTE_MS),
    end: new Date(dayStart + endMin * MINUTE_MS)
  };
};

const overlapsWithBuffer = (a, b, bufferMs) =>
  a.start.getTime() < b.end.getTime() + bufferMs && a.end.getTime() + bufferMs > b.start.getTime();

const overlaps = (a, b) => overlapsWithBuffer(a, b, 0);

/* ------------------------------------------------------------------ */
/* Worker availability context                                         */
/* ------------------------------------------------------------------ */

/**
 * Everything that can make a worker unavailable inside [rangeStart, rangeEnd]:
 * their marked weekdays, approved leave, and committed bookings.
 */
const loadWorkerContext = async (workerIds, rangeStart, rangeEnd, bufferMs, excludeBookingId) => {
  const bookingQuery = {
    // Jobs they lead, and jobs where admin added them as a helper.
    $or: [
      { workerId: { $in: workerIds } },
      { helpers: { $elemMatch: { workerId: { $in: workerIds }, payoutStatus: { $ne: 'cancelled' } } } }
    ],
    status: { $in: WORKER_COMMITTED_STATUSES },
    // scheduledDate is stored at an arbitrary time of day; widen by two days
    // each side and let the precise slot-window check decide.
    scheduledDate: {
      $gte: new Date(rangeStart.getTime() - bufferMs - 2 * DAY_MS),
      $lte: new Date(rangeEnd.getTime() + bufferMs + 2 * DAY_MS)
    }
  };
  if (excludeBookingId) bookingQuery._id = { $ne: excludeBookingId };

  const [bookings, leaves, workers, hsSettings] = await Promise.all([
    HomeServiceBooking.find(bookingQuery).select('workerId helpers bookingNumber scheduledDate timeSlot scheduledTime').lean(),
    WorkerOfflineRequest.find({
      workerId: { $in: workerIds },
      status: 'approved',
      endDateTime: { $gte: rangeStart },
      startDateTime: { $lte: rangeEnd }
    }).select('workerId startDateTime endDateTime').lean(),
    Worker.find({ _id: { $in: workerIds } }).select('availability').lean(),
    Settings.findOne({ type: 'global' }).select('requireDailyAvailability').lean()
  ]);

  const ctx = {
    bufferMs,
    // Default on: workers must mark each day (matches the schema default).
    requireDaily: hsSettings?.requireDailyAvailability !== false,
    bookings: new Map(),
    leaves: new Map(),
    days: new Map(),
    dates: new Map(),
    legacyAvailable: new Set()
  };
  for (const b of bookings) {
    const window = getBookingWindow(b);
    if (!window) continue;
    // The lead and every active helper are all occupied for this window.
    const people = new Set([String(b.workerId)]);
    (b.helpers || []).filter((h) => h.payoutStatus !== 'cancelled').forEach((h) => people.add(String(h.workerId)));
    for (const key of people) {
      if (!ctx.bookings.has(key)) ctx.bookings.set(key, []);
      ctx.bookings.get(key).push({ booking: b, window });
    }
  }
  for (const l of leaves) {
    const key = String(l.workerId);
    if (!ctx.leaves.has(key)) ctx.leaves.set(key, []);
    ctx.leaves.get(key).push({ start: new Date(l.startDateTime), end: new Date(l.endDateTime) });
  }
  for (const w of workers) {
    if (isLegacyAvailabilityEnabled(w.availability)) {
      ctx.legacyAvailable.add(String(w._id));
    }
    const days = w.availability?.availableDays;
    ctx.days.set(String(w._id), Array.isArray(days) && days.length ? days : ALL_WEEKDAYS);
    ctx.dates.set(String(w._id), new Set(w.availability?.availableDates || []));
  }
  return ctx;
};

/** Why `workerId` can't take `window`, or null if they can. */
const getBlock = (workerId, window, ctx, { ignoreBookings = false } = {}) => {
  const key = String(workerId);
  const ymd = istYmd(window.start);

  if ((ctx.leaves.get(key) || []).some((l) => overlaps(window, l))) return { type: 'leave' };

  if (ctx.requireDaily) {
    // Every date must be explicitly marked Available by the worker.
    if (!ctx.legacyAvailable.has(key) && !(ctx.dates.get(key) || new Set()).has(ymd)) return { type: 'day_off' };
  } else {
    const days = ctx.days.get(key) || ALL_WEEKDAYS;
    const marked = (ctx.dates.get(key) || new Set()).has(ymd);
    if (!marked && !days.includes(weekdayOfYmd(ymd))) return { type: 'day_off' };
  }

  if (ignoreBookings) return null;
  const clash = (ctx.bookings.get(key) || []).find((e) => overlapsWithBuffer(window, e.window, ctx.bufferMs));
  if (clash) return { type: 'booking', booking: clash.booking };
  return null;
};

/* ------------------------------------------------------------------ */
/* Public checks used by booking / accept / assign / reschedule        */
/* ------------------------------------------------------------------ */

const blockFor = async (workerId, booking, { bufferMinutes, excludeBookingId } = {}) => {
  const window = getBookingWindow(booking);
  if (!window) return null;
  const buffer = bufferMinutes ?? await getBufferMinutes();
  const ctx = await loadWorkerContext([workerId], window.start, window.end, buffer * MINUTE_MS, excludeBookingId || booking._id);
  return getBlock(workerId, window, ctx);
};

/** The conflicting booking if another job is within the buffer, else null. */
export const findWorkerConflict = async (workerId, booking, opts) => {
  const block = await blockFor(workerId, booking, opts);
  return block?.type === 'booking' ? block.booking : null;
};

/** Message if the worker is on a day off / leave for this slot, else null. */
export const findWorkerUnavailability = async (workerId, booking, opts) => {
  const block = await blockFor(workerId, booking, opts);
  if (block?.type === 'day_off') return 'This job falls on a day you have not marked as available.';
  if (block?.type === 'leave') return 'This job falls on a day/time you are on leave.';
  return null;
};

/** Drops workers who are on a day off, on leave, or double-booked for `booking`'s slot. */
export const filterAvailableWorkers = async (workers, booking, { excludeBookingId, ignoreBookings = false } = {}) => {
  if (!workers?.length) return workers || [];
  // Capacity is global: once a worker accepts any job, no new booking should
  // reach them until that job is marked WORK_DONE. This gate deliberately
  // still applies to instant bookings even when slot-overlap checks are skipped.
  // Only a booking that starts now-ish needs a worker who is free right now; a
  // slot for tonight is governed by the buffer check below, not by whether the
  // worker happens to be on a job this minute.
  const needsFreeWorker = await isImmediateBooking(booking);
  const capacityAvailable = needsFreeWorker
    ? await filterWorkersWithoutActiveJobs(workers, excludeBookingId || booking?._id)
    : workers;
  if (!capacityAvailable.length) return [];
  const window = getBookingWindow(booking);
  if (!window) return capacityAvailable;

  const bufferMs = (await getBufferMinutes()) * MINUTE_MS;
  const ids = capacityAvailable.map((w) => w._id || w.workerId);
  const ctx = await loadWorkerContext(ids, window.start, window.end, bufferMs, excludeBookingId || booking._id);
  return capacityAvailable.filter((w) => !getBlock(w._id || w.workerId, window, ctx, { ignoreBookings }));
};

/**
 * Per-date, per-slot availability for a customer picking a time.
 * A slot is available if the lead-time rule allows it and at least one of
 * `workers` is free for it. For today only workers currently online count
 * (someone offline right now can't take a job starting within hours); for
 * later days the worker's marked days/leave decide, not the toggle.
 */
export const getSlotAvailability = async ({ workers, ymds, slots }) => {
  const leadMs = (await getSameDayLeadMinutes()) * MINUTE_MS;
  const earliest = Date.now() + leadMs;
  const today = istYmd(new Date());
  const capacityWorkers = workers;
  // Workers on a job right now only lose the slots that start soon; later slots
  // are decided by the buffer check against their bookings.
  const busyNow = await getBusyWorkerIds(workers);
  const bufferMs = (await getBufferMinutes()) * MINUTE_MS;

  const cells = [];
  for (const ymd of ymds) {
    const noon = new Date(`${ymd}T12:00:00${IST_OFFSET}`);
    for (const slot of slots) {
      cells.push({ ymd, slot, window: getBookingWindow({ scheduledDate: noon, timeSlot: { start: slot.value, end: slot.end } }) });
    }
  }

  let ctx = null;
  if (capacityWorkers.length && cells.length) {
    const starts = cells.map((c) => c.window.start.getTime());
    const ends = cells.map((c) => c.window.end.getTime());
    ctx = await loadWorkerContext(
      capacityWorkers.map((w) => w._id),
      new Date(Math.min(...starts)),
      new Date(Math.max(...ends)),
      bufferMs
    );
  }

  return ymds.map((ymd) => {
    const daySlots = cells.filter((c) => c.ymd === ymd).map((c) => {
      let available = false;
      if (ctx && c.window.start.getTime() >= earliest) {
        const pool = ymd === today ? capacityWorkers.filter((w) => w.isOnline) : capacityWorkers;
        const soon = c.window.start.getTime() <= Date.now() + bufferMs;
        available = pool.some((w) => !(soon && busyNow.has(String(w._id))) && !getBlock(w._id, c.window, ctx));
      }
      return { value: c.slot.value, end: c.slot.end, display: c.slot.display, range: c.slot.range, available };
    });
    return { date: ymd, available: daySlots.some((s) => s.available), slots: daySlots };
  });
};

/** Committed bookings of a worker on/after `fromDate` (for leave / day-off guards). */
export const getWorkerFutureBookings = async (workerId, fromDate = new Date()) => {
  const rows = await HomeServiceBooking.find({
    $or: [
      { workerId },
      { helpers: { $elemMatch: { workerId, payoutStatus: { $ne: 'cancelled' } } } }
    ],
    status: { $in: WORKER_COMMITTED_STATUSES },
    scheduledDate: { $gte: new Date(fromDate.getTime() - DAY_MS) }
  }).select('bookingNumber serviceName serviceCategory bookingType status scheduledDate timeSlot scheduledTime').lean();
  return rows
    .map((b) => ({ ...b, window: getBookingWindow(b) }))
    .filter((b) => b.window && b.window.end.getTime() > fromDate.getTime());
};

/* ------------------------------------------------------------------ */
/* Messages / lead-time gate                                           */
/* ------------------------------------------------------------------ */

/**
 * Error message if a scheduled slot starts sooner than the admin-set minimum
 * notice (that window is reserved for instant bookings), else null.
 */
export const checkSlotLeadTime = async (booking) => {
  const window = getBookingWindow(booking);
  if (!window) return null;
  const leadMinutes = await getSameDayLeadMinutes();
  if (window.start.getTime() >= Date.now() + leadMinutes * MINUTE_MS) return null;
  const hours = leadMinutes / 60;
  const lead = leadMinutes % 60 === 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${leadMinutes} minutes`;
  return `Scheduled slots need at least ${lead} notice. Please pick a later time slot or book an instant service.`;
};

/** Error message if the date is beyond the admin-set booking horizon, else null. */
export const checkAdvanceWindow = async (booking) => {
  const window = getBookingWindow(booking);
  if (!window) return null;
  const days = await getAdvanceBookingDays();
  const lastDay = addDaysYmd(istYmd(new Date()), days - 1);
  if (istYmd(window.start) <= lastDay) return null;
  return `Bookings can be made up to ${days} day${days === 1 ? '' : 's'} in advance. Please choose an earlier date.`;
};

/** Human-readable explanation for a conflict, for API responses. */
export const describeConflict = (conflict, bufferMinutes) => {
  const hours = bufferMinutes / 60;
  const gap = bufferMinutes % 60 === 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${bufferMinutes} minutes`;
  return `Worker already has booking #${conflict.bookingNumber} at ${conflict.scheduledTime || 'a nearby time'}; ` +
    `a ${gap} gap is required between jobs.`;
};
