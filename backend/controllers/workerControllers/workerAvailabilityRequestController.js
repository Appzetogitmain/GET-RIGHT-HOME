import WorkerAvailabilityRequest from '../../models/WorkerAvailabilityRequest.js';
import WorkerOfflineRequest from '../../models/WorkerOfflineRequest.js';
import Worker from '../../models/Worker.js';
import { createNotification } from '../notificationControllers/notificationController.js';
import { istYmd, getWorkerFutureBookings } from '../../utils/slotAvailability.js';
import { syncWorkerCapacityStatus } from '../../services/workerCapacityService.js';
import { getIO } from '../../sockets.js';

/** Admin: list availability requests (status filter + worker search). */
export const getAvailabilityRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    if (search) {
      const workers = await Worker.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      query.workerId = { $in: workers.map((w) => w._id) };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total, pending] = await Promise.all([
      WorkerAvailabilityRequest.find(query)
        .populate('workerId', 'name phone serviceCategories isOnline')
        .populate('reviewedBy', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      WorkerAvailabilityRequest.countDocuments(query),
      WorkerAvailabilityRequest.countDocuments({ status: 'pending' })
    ]);

    // History stays visible: pending first, then everything else by latest activity.
    requests.sort((a, b) => (b.status === 'pending') - (a.status === 'pending'));
    res.json({ success: true, data: requests, counts: { pending }, pagination: { total, page: Number(page) } });
  } catch (error) {
    console.error('Get availability requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const tell = (workerId, payload, push) => {
  createNotification({ workerId, ...payload, relatedType: 'availability', priority: 'high', pushData: push })
    .catch((err) => console.warn('Availability notification failed:', err.message));
  getIO()?.to(`worker_${workerId}`).emit('worker_availability_changed', { ...payload });
};

/**
 * Admin: approve one request (`:id`) or several (`ids` in the body). Approved
 * dates are added to the worker's availability, which is what makes them
 * bookable / lets the worker go online that day.
 */
export const approveAvailabilityRequests = async (req, res) => {
  try {
    const ids = req.params.id ? [req.params.id] : (Array.isArray(req.body?.ids) ? req.body.ids : []);
    if (!ids.length) return res.status(400).json({ success: false, message: 'No requests selected' });

    // A rejected / revoked request can be approved later — the admin can change their mind.
    const requests = await WorkerAvailabilityRequest.find({ _id: { $in: ids }, status: { $in: ['pending', 'rejected', 'revoked'] } });
    if (!requests.length) {
      return res.status(400).json({ success: false, message: 'These requests are already approved or closed' });
    }

    const today = istYmd(new Date());
    const adminId = req.user.id;
    const approvedByWorker = new Map();
    let skipped = 0;

    for (const request of requests) {
      if (request.dateStr < today) {
        request.status = 'cancelled';
        await request.save();
        skipped += 1;
        continue;
      }
      // A day the worker has since put on leave can't also be Available.
      const leave = await WorkerOfflineRequest.exists({
        workerId: request.workerId,
        dateStr: request.dateStr,
        isFullDay: true,
        status: { $in: ['pending', 'approved'] }
      });
      if (leave) {
        request.status = 'cancelled';
        await request.save();
        skipped += 1;
        continue;
      }
      request.status = 'approved';
      request.rejectionReason = '';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save();
      const key = String(request.workerId);
      approvedByWorker.set(key, [...(approvedByWorker.get(key) || []), request.dateStr]);
    }

    await Promise.all([...approvedByWorker.entries()].map(async ([workerId, dates]) => {
      await Worker.updateOne(
        { _id: workerId },
        { $addToSet: { 'availability.availableDates': { $each: dates } }, $set: { 'availability.updatedAt': new Date() } }
      );
      tell(
        workerId,
        {
          type: 'availability_approved',
          title: 'Availability Approved',
          message: `Your availability for ${dates.join(', ')} has been approved. You can now go online and receive bookings.`
        },
        { type: 'availability_approved', link: '/worker/dashboard' }
      );
    }));

    const approved = [...approvedByWorker.values()].reduce((n, d) => n + d.length, 0);
    getIO()?.to('admin_room').emit('offline_request_updated', {});
    res.json({
      success: true,
      message: `${approved} ${approved === 1 ? 'day' : 'days'} approved${skipped ? `, ${skipped} expired or skipped` : ''}`,
      approved,
      skipped
    });
  } catch (error) {
    console.error('Approve availability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Admin: reject a request; the worker is told why and can request again. */
export const rejectAvailabilityRequest = async (req, res) => {
  try {
    const request = await WorkerAvailabilityRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject a ${request.status} request` });
    }
    const reason = String(req.body?.reason || '').trim();
    request.status = 'rejected';
    request.rejectionReason = reason;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    tell(
      request.workerId,
      {
        type: 'availability_rejected',
        title: 'Availability Not Approved',
        message: `Your availability for ${request.dateStr} was not approved${reason ? `: ${reason}` : '.'} You can submit it again.`
      },
      { type: 'availability_rejected', link: '/worker/dashboard' }
    );
    getIO()?.to('admin_room').emit('offline_request_updated', {});
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Reject availability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Admin: take back an approval. The date is removed from the worker's
 * availability (they take no bookings that day and, if it is today, go
 * offline). Refused while the worker holds a booking that day.
 */
export const revokeAvailabilityRequest = async (req, res) => {
  try {
    const request = await WorkerAvailabilityRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only an approved day can be revoked' });
    }

    const bookings = await getWorkerFutureBookings(request.workerId);
    if (bookings.some((b) => istYmd(b.window.start) === request.dateStr)) {
      return res.status(409).json({
        success: false,
        message: 'This worker has a booking on that day. Reassign or release it before revoking the day.'
      });
    }

    const reason = String(req.body?.reason || '').trim();
    request.status = 'revoked';
    request.rejectionReason = reason;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    await Worker.updateOne(
      { _id: request.workerId },
      { $pull: { 'availability.availableDates': request.dateStr }, $set: { 'availability.updatedAt': new Date() } }
    );
    if (request.dateStr === istYmd(new Date())) {
      await Worker.updateOne({ _id: request.workerId, status: { $ne: 'busy' } }, { $set: { isOnline: false, status: 'offline' } });
      await syncWorkerCapacityStatus(request.workerId);
    }

    tell(
      request.workerId,
      {
        type: 'availability_rejected',
        title: 'Availability Changed',
        message: `Admin has removed your availability for ${request.dateStr}${reason ? `: ${reason}` : '.'}`
      },
      { type: 'availability_rejected', link: '/worker/dashboard' }
    );
    getIO()?.to('admin_room').emit('offline_request_updated', {});
    res.json({ success: true, message: 'Approval revoked' });
  } catch (error) {
    console.error('Revoke availability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
