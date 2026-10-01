import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Worker from '../models/Worker.js';
import VendorBill from '../models/VendorBill.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { splitEarning } from '../services/helperPayoutService.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { createNotification } from './notificationControllers/notificationController.js';
import { findWorkerConflict, findWorkerUnavailability } from '../utils/slotAvailability.js';
import { getIO } from '../sockets.js';

// A job can still use extra hands until the work is finished.
const HELPABLE_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.ESTIMATE_PROVIDED,
  BOOKING_STATUS.ESTIMATE_ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS
];

const activeHelpers = (booking) => (booking.helpers || []).filter((h) => h.payoutStatus !== 'cancelled');

/* ------------------------------------------------------------------ */
/* Worker: ask for extra hands                                         */
/* ------------------------------------------------------------------ */

/** POST /api/workers/jobs/:id/helper-request  { count, reason } */
export const requestHelper = async (req, res) => {
  try {
    const workerId = req.user.id;
    const count = Math.max(1, Math.min(10, Math.round(Number(req.body?.count) || 1)));
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 3) {
      return res.status(400).json({ success: false, message: 'Please tell admin why you need extra help.' });
    }

    const booking = await HomeServiceBooking.findOne({ _id: req.params.id, workerId }).select('+helpers +helperRequests');
    if (!booking) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!HELPABLE_STATUSES.includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Extra workers can only be requested while the job is still open.' });
    }
    if ((booking.helperRequests || []).some((r) => r.status === 'pending')) {
      return res.status(409).json({ success: false, message: 'You already have a pending request for this job. Admin will respond soon.' });
    }

    booking.helperRequests.push({ requestedBy: workerId, count, reason });
    await booking.save();

    const worker = await Worker.findById(workerId).select('name phone');
    const summary = `${worker?.name || 'A professional'} needs ${count} extra worker${count > 1 ? 's' : ''} for booking #${booking.bookingNumber} (${booking.serviceName}). Reason: ${reason}`;

    createNotification({
      recipientType: 'admin',
      type: 'helper_requested',
      title: 'Extra Worker Requested',
      message: summary,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    }).catch(() => {});
    getIO()?.to('admin_room').emit('helper_requested', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      workerName: worker?.name,
      count,
      message: summary
    });

    res.status(201).json({ success: true, message: 'Request sent to admin.', data: booking.helperRequests[booking.helperRequests.length - 1] });
  } catch (error) {
    console.error('Request helper error:', error);
    res.status(500).json({ success: false, message: 'Failed to send the request' });
  }
};

/* ------------------------------------------------------------------ */
/* Admin: add / remove helpers                                         */
/* ------------------------------------------------------------------ */

/** GET /api/admin/workers/jobs/:id/helpers — helpers (with payouts) and requests */
export const getJobHelpers = async (req, res) => {
  try {
    const booking = await HomeServiceBooking.findById(req.params.id)
      .select('+helpers +helperRequests')
      .populate('helpers.workerId', 'name phone profilePhoto')
      .populate('helperRequests.requestedBy', 'name phone')
      .lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // What the job pays the people on it: the bill's worker earning once it
    // exists, otherwise the booked price less the platform's cut.
    const [bill, platform, lead] = await Promise.all([
      VendorBill.findOne({ bookingId: booking._id }).select('vendorTotalEarning adminCommission').lean(),
      PlatformSettings.getSettings(),
      booking.workerId ? Worker.findById(booking.workerId).select('name').lean() : null
    ]);
    const booked = Number(booking.basePrice || booking.finalAmount || 0);
    const commissionPct = platform?.defaultCommission ?? 10;
    const estimatedCut = Math.round(booked * commissionPct) / 100;
    const fromBill = !!bill && Number(bill.vendorTotalEarning) > 0;
    const pool = fromBill ? Number(bill.vendorTotalEarning) : Math.max(0, booked - estimatedCut);
    const active = (booking.helpers || []).filter((h) => h.payoutStatus !== 'cancelled');
    const now = splitEarning(active, pool);
    const withOneMore = splitEarning([...active, { payoutStatus: 'pending' }], pool);

    res.json({
      success: true,
      data: {
        hasLead: !!booking.workerId,
        status: booking.status,
        helpers: active,
        helperRequests: booking.helperRequests || [],
        earning: {
          booked,
          platformCut: fromBill ? Number(bill.adminCommission) || 0 : estimatedCut,
          commissionPct,
          pool,
          fromBill,
          leadName: lead?.name || 'Main worker',
          people: now.people,
          share: now.share,
          leadShare: now.leadShare,
          withOneMore: { people: withOneMore.people, share: withOneMore.share, leadShare: withOneMore.leadShare }
        }
      }
    });
  } catch (error) {
    console.error('Get helpers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load helpers' });
  }
};

/** POST /api/admin/workers/jobs/:id/helpers  { workerId, payoutAmount, override? } */
export const addHelper = async (req, res) => {
  try {
    const { workerId, override } = req.body;
    // The earning is split equally on completion; nothing is typed in by admin.
    const payoutAmount = 0;
    if (!workerId) return res.status(400).json({ success: false, message: 'Choose a worker to add.' });

    const booking = await HomeServiceBooking.findById(req.params.id).select('+helpers +helperRequests');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!booking.workerId) {
      return res.status(400).json({ success: false, message: 'Assign a main worker first, then add helpers.' });
    }
    if (!HELPABLE_STATUSES.includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Helpers can't be added to a booking that is ${booking.status}.` });
    }
    if (String(booking.workerId) === String(workerId)) {
      return res.status(400).json({ success: false, message: 'This worker is already the main worker on the job.' });
    }
    if (activeHelpers(booking).some((h) => String(h.workerId) === String(workerId))) {
      return res.status(409).json({ success: false, message: 'This worker is already helping on this job.' });
    }

    const worker = await Worker.findById(workerId).select('name phone approvalStatus isActive');
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    if (worker.approvalStatus !== 'approved' || worker.isActive === false) {
      return res.status(400).json({ success: false, message: `${worker.name} is not an active, approved worker.` });
    }

    if (!override) {
      const probe = { _id: booking._id, scheduledDate: booking.scheduledDate, timeSlot: booking.timeSlot, bookingType: booking.bookingType };
      const unavailable = await findWorkerUnavailability(worker._id, probe, { excludeBookingId: booking._id });
      if (unavailable) return res.status(409).json({ success: false, code: 'WORKER_UNAVAILABLE', message: unavailable });
      const conflict = await findWorkerConflict(worker._id, probe, { excludeBookingId: booking._id });
      if (conflict) {
        return res.status(409).json({
          success: false,
          code: 'SLOT_CONFLICT',
          message: `${worker.name} already has booking #${conflict.bookingNumber} around that time.`
        });
      }
    }

    booking.helpers.push({ workerId: worker._id, addedBy: req.user.id, payoutAmount });

    // A request is fulfilled once enough helpers were added since it was made.
    const open = (booking.helperRequests || []).filter((r) => r.status === 'pending').sort((a, b) => a.requestedAt - b.requestedAt)[0];
    if (open) {
      const addedSince = activeHelpers(booking).filter((h) => h.addedAt >= open.requestedAt).length;
      if (addedSince >= open.count) {
        open.status = 'fulfilled';
        open.handledAt = new Date();
        open.handledBy = req.user.id;
      }
    }
    await booking.save();

    const lead = await Worker.findById(booking.workerId).select('name phone');
    const when = `${new Date(booking.scheduledDate).toLocaleDateString('en-IN')} ${booking.scheduledTime || ''}`.trim();
    const io = req.app.get('io') || getIO();

    // The helper is told where / when / who to work with — never an amount.
    createNotification({
      workerId: worker._id,
      type: 'helper_added',
      title: 'You Have Been Added to a Job',
      message: `You will be helping ${lead?.name || 'a professional'} on ${booking.serviceName} — ${when}. Open My Jobs for the address.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'slot_job_assigned', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
    }).catch(() => {});
    io?.to(`worker_${worker._id}`).emit('slot_job_assigned', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      serviceName: booking.serviceName,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      address: booking.address,
      isHelper: true,
      message: `You were added as a helper: ${booking.serviceName}`
    });

    createNotification({
      workerId: booking.workerId,
      type: 'helper_added',
      title: 'Extra Worker Added',
      message: `${worker.name} will work with you on booking #${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'helper_added', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
    }).catch(() => {});
    io?.to(`worker_${booking.workerId}`).emit('helper_changed', { bookingId: booking._id });

    res.json({ success: true, message: `${worker.name} added to the job.`, data: booking });
  } catch (error) {
    console.error('Add helper error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add the helper' });
  }
};

/** DELETE /api/admin/workers/jobs/:id/helpers/:workerId */
export const removeHelper = async (req, res) => {
  try {
    const booking = await HomeServiceBooking.findById(req.params.id).select('+helpers +helperRequests');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const helper = activeHelpers(booking).find((h) => String(h.workerId) === String(req.params.workerId));
    if (!helper) return res.status(404).json({ success: false, message: 'This worker is not a helper on the job.' });
    if (helper.payoutStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This helper has already been paid.' });
    }

    helper.payoutStatus = 'cancelled';
    await booking.save();

    const io = req.app.get('io') || getIO();
    createNotification({
      workerId: helper.workerId,
      type: 'helper_removed',
      title: 'Removed From a Job',
      message: `You are no longer helping on booking #${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    }).catch(() => {});
    io?.to(`worker_${helper.workerId}`).emit('job_cancelled', { bookingId: booking._id.toString(), message: 'You were removed from this job' });
    io?.to(`worker_${booking.workerId}`).emit('helper_changed', { bookingId: booking._id });

    res.json({ success: true, message: 'Helper removed.', data: booking });
  } catch (error) {
    console.error('Remove helper error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove the helper' });
  }
};

/** POST /api/admin/workers/jobs/:id/helper-requests/:requestId/reject  { note } */
export const rejectHelperRequest = async (req, res) => {
  try {
    const booking = await HomeServiceBooking.findById(req.params.id).select('+helpers +helperRequests');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const request = booking.helperRequests.id(req.params.requestId);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'No pending request found.' });
    }
    request.status = 'rejected';
    request.note = String(req.body?.note || '').trim();
    request.handledAt = new Date();
    request.handledBy = req.user.id;
    await booking.save();

    createNotification({
      workerId: request.requestedBy,
      type: 'helper_request_declined',
      title: 'Extra Worker Request Declined',
      message: `Admin could not add an extra worker to booking #${booking.bookingNumber}${request.note ? `: ${request.note}` : '.'}`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    }).catch(() => {});
    getIO()?.to(`worker_${request.requestedBy}`).emit('helper_changed', { bookingId: booking._id });

    res.json({ success: true, message: 'Request declined.', data: booking });
  } catch (error) {
    console.error('Reject helper request error:', error);
    res.status(500).json({ success: false, message: 'Failed to decline the request' });
  }
};
