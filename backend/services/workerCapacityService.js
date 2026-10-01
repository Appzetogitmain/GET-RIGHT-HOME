import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Worker from '../models/Worker.js';
import Settings from '../models/Settings.js';
import { BOOKING_STATUS, WORKER_STATUS } from '../utils/constants.js';

// A worker may hold only one job at a time *right now*. They become available
// again as soon as work is marked done; billing/payment can continue
// independently.
//
// "Right now" matters: a slot booking for 9 PM that was accepted this morning
// does not make the worker busy at noon. Only an instant job, a job already in
// progress, or a scheduled job that is due within the admin buffer counts.
export const WORKER_BUSY_BOOKING_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.ESTIMATE_PROVIDED,
  BOOKING_STATUS.ESTIMATE_ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS
];

// Past "accepted": the worker has set off or is working, whatever the slot says.
const STARTED_STATUSES = [
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.ESTIMATE_PROVIDED,
  BOOKING_STATUS.ESTIMATE_ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS
];

const DEFAULT_BUFFER_MINUTES = 120;
const JOB_FIELDS = 'workerId bookingNumber serviceName serviceCategory bookingType status scheduledDate scheduledTime timeSlot';

// slotAvailability imports this module, so it is loaded lazily to avoid a cycle.
let slotUtils = null;
const loadSlotUtils = async () => {
  if (!slotUtils) slotUtils = await import('../utils/slotAvailability.js');
  return slotUtils;
};

const getBufferMs = async () => {
  const settings = await Settings.findOne({ type: 'global' }).select('bookingBufferMinutes').lean();
  const minutes = settings?.bookingBufferMinutes;
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_BUFFER_MINUTES) * 60 * 1000;
};

/**
 * Does this booking occupy the worker at the moment? True for instant jobs,
 * jobs already under way, and scheduled jobs starting within the buffer.
 * Works on anything shaped like { status?, bookingType?, scheduledDate, timeSlot }.
 */
export const isImmediateBooking = async (booking, bufferMs = null) => {
  if (!booking) return false;
  if (STARTED_STATUSES.includes(booking.status)) return true;
  if (booking.bookingType === 'instant') return true;
  const { getBookingWindow } = await loadSlotUtils();
  const window = getBookingWindow(booking);
  if (!window) return true;
  const buffer = bufferMs ?? await getBufferMs();
  return window.start.getTime() <= Date.now() + buffer;
};

const findImmediateJobs = async (workerIds, excludeBookingId) => {
  const query = { workerId: { $in: workerIds }, status: { $in: WORKER_BUSY_BOOKING_STATUSES } };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const [candidates, bufferMs] = await Promise.all([
    HomeServiceBooking.find(query).select(JOB_FIELDS).lean(),
    getBufferMs()
  ]);
  const flags = await Promise.all(candidates.map((job) => isImmediateBooking(job, bufferMs)));
  return candidates.filter((_, index) => flags[index]);
};

export const findWorkerActiveJob = async (workerId, excludeBookingId = null) => {
  const jobs = await findImmediateJobs([workerId], excludeBookingId);
  return jobs[0] || null;
};

/** Ids (as strings) of the given workers who hold a job right now. */
export const getBusyWorkerIds = async (workers, excludeBookingId = null) => {
  const ids = (workers || []).map((worker) => worker._id || worker.workerId).filter(Boolean);
  if (!ids.length) return new Set();
  const jobs = await findImmediateJobs(ids, excludeBookingId);
  return new Set(jobs.map((job) => String(job.workerId)));
};

export const filterWorkersWithoutActiveJobs = async (workers, excludeBookingId = null) => {
  if (!workers?.length) return workers || [];
  const busy = await getBusyWorkerIds(workers, excludeBookingId);
  return workers.filter((worker) => !busy.has(String(worker._id || worker.workerId)));
};

/**
 * Atomically reserve a worker before assigning a job. The status predicate is
 * the lock that prevents the same worker accepting two requests concurrently.
 */
export const claimWorkerCapacity = async (workerId, excludeBookingId = null) => {
  const activeJob = await findWorkerActiveJob(workerId, excludeBookingId);
  if (activeJob) {
    await Worker.updateOne({ _id: workerId }, { $set: { status: WORKER_STATUS.BUSY } });
    return { claimed: false, activeJob };
  }

  // No job is occupying them right now, so an old `busy` flag (e.g. left by a
  // job that was only scheduled for later) is stale — clear it before locking.
  // A flag set moments ago may be another accept still in flight (that flag is
  // the lock), so only a flag older than a few seconds is treated as stale.
  const staleBusy = await Worker.exists({
    _id: workerId,
    status: WORKER_STATUS.BUSY,
    updatedAt: { $lt: new Date(Date.now() - 15 * 1000) }
  });
  if (staleBusy) await syncWorkerCapacityStatus(workerId, excludeBookingId);

  const worker = await Worker.findOneAndUpdate(
    {
      _id: workerId,
      isActive: true,
      approvalStatus: 'approved',
      status: { $nin: [WORKER_STATUS.BUSY, WORKER_STATUS.INACTIVE] }
    },
    { $set: { status: WORKER_STATUS.BUSY } },
    { new: true }
  ).select('_id status isOnline');

  return { claimed: !!worker, activeJob: null, worker };
};

/** Recompute persisted status after work-done/cancel/release/reassignment. */
export const syncWorkerCapacityStatus = async (workerId, excludeBookingId = null) => {
  if (!workerId) return null;
  const [worker, activeJob] = await Promise.all([
    Worker.findById(workerId).select('_id status isOnline'),
    findWorkerActiveJob(workerId, excludeBookingId)
  ]);
  if (!worker) return null;

  const nextStatus = activeJob
    ? WORKER_STATUS.BUSY
    : worker.status === WORKER_STATUS.INACTIVE
      ? WORKER_STATUS.INACTIVE
      : (worker.isOnline ? WORKER_STATUS.ONLINE : WORKER_STATUS.OFFLINE);

  if (worker.status !== nextStatus) {
    worker.status = nextStatus;
    await worker.save();
  }

  return { worker, status: nextStatus, isBusy: nextStatus === WORKER_STATUS.BUSY, activeJob };
};
