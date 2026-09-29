import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Worker from '../models/Worker.js';
import { BOOKING_STATUS, WORKER_STATUS } from '../utils/constants.js';

// A worker may hold only one job at a time. They become available again as
// soon as work is marked done; billing/payment can continue independently.
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

const activeJobQuery = (workerId, excludeBookingId) => {
  const query = {
    workerId,
    status: { $in: WORKER_BUSY_BOOKING_STATUSES }
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  return query;
};

export const findWorkerActiveJob = (workerId, excludeBookingId = null) =>
  HomeServiceBooking.findOne(activeJobQuery(workerId, excludeBookingId))
    .select('_id bookingNumber serviceName serviceCategory bookingType status scheduledDate scheduledTime')
    .lean();

export const filterWorkersWithoutActiveJobs = async (workers, excludeBookingId = null) => {
  if (!workers?.length) return workers || [];
  const ids = workers.map((worker) => worker._id || worker.workerId).filter(Boolean);
  const query = {
    workerId: { $in: ids },
    status: { $in: WORKER_BUSY_BOOKING_STATUSES }
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const [activeBookingWorkerIds, persistedBusyWorkers] = await Promise.all([
    HomeServiceBooking.distinct('workerId', query),
    Worker.find({ _id: { $in: ids }, status: WORKER_STATUS.BUSY }).select('_id').lean()
  ]);
  const busyIds = new Set([
    ...activeBookingWorkerIds.map(String),
    ...persistedBusyWorkers.map((worker) => String(worker._id))
  ]);

  return workers.filter((worker) => {
    const id = String(worker._id || worker.workerId);
    return worker.status !== WORKER_STATUS.BUSY && !busyIds.has(id);
  });
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
