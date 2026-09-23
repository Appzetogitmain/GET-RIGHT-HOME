import WorkerOfflineRequest from '../../models/WorkerOfflineRequest.js';
import Worker from '../../models/Worker.js';
import PlatformSettings from '../../models/PlatformSettings.js';
import { createNotification } from '../notificationControllers/notificationController.js';
import { generateTimeSlots } from '../../utils/slotGenerator.js';
import { getIO } from '../../sockets.js';

/**
 * Worker: Submit an offline request
 * Body: { date, dateStr, startSlot, endSlot, reason }
 */
export const createOfflineRequest = async (req, res) => {
  try {
    const workerId = req.user.id;
    let { date, dateStr, startSlot, endSlot, reason } = req.body;

    if (!dateStr && date) {
      dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    }

    if (typeof startSlot === 'string') {
      startSlot = { value: startSlot, display: startSlot };
    }
    if (typeof endSlot === 'string') {
      endSlot = { value: endSlot, display: endSlot };
    }

    if (!dateStr || !startSlot?.value || !endSlot?.value) {
      return res.status(400).json({
        success: false,
        message: 'Date, start slot, and end slot are required'
      });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Check if worker already has a pending offline request
    const existingPending = await WorkerOfflineRequest.findOne({
      workerId,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending offline request awaiting admin review.',
        data: existingPending
      });
    }

    // Construct startDateTime and endDateTime
    // dateStr format: YYYY-MM-DD
    const [startH, startM] = startSlot.value.split(':').map(Number);
    const [endH, endM] = endSlot.value.split(':').map(Number);

    const startDateTime = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const endDateTime = new Date(`${dateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date or slot values' });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        message: 'End slot must be after start slot'
      });
    }

    const offlineRequest = await WorkerOfflineRequest.create({
      workerId,
      date: new Date(date || dateStr),
      dateStr,
      startSlot: {
        value: startSlot.value,
        display: startSlot.display || startSlot.value
      },
      endSlot: {
        value: endSlot.value,
        display: endSlot.display || endSlot.value
      },
      startDateTime,
      endDateTime,
      reason: reason || 'Personal Leave',
      originalSlots: {
        startSlot,
        endSlot,
        dateStr
      },
      status: 'pending'
    });

    // Notify admins about the new offline request
    try {
      await createNotification({
        recipientType: 'admin',
        title: 'New Worker Offline Request',
        message: `${worker.name} requested to go offline on ${dateStr} from ${startSlot.display || startSlot.value} to ${endSlot.display || endSlot.value}.`,
        type: 'worker_offline_request',
        data: {
          requestId: offlineRequest._id,
          workerId: worker._id,
          workerName: worker.name
        }
      });

      // Real-time socket broadcast to Admin room
      const io = getIO();
      if (io) {
        io.to('admin_room').emit('worker_offline_request', {
          title: 'New Offline Request',
          workerId: worker._id,
          workerName: worker.name,
          dateStr,
          startSlot: startSlot.display || startSlot.value,
          endSlot: endSlot.display || endSlot.value,
          message: `${worker.name} requested offline leave for ${dateStr} (${startSlot.display || startSlot.value} - ${endSlot.display || endSlot.value})`,
          requestId: offlineRequest._id
        });
      }
    } catch (notifErr) {
      console.warn('Failed to send admin notification for offline request:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Offline request submitted successfully. Awaiting admin approval.',
      data: offlineRequest
    });
  } catch (error) {
    console.error('Create offline request error:', error);
    res.status(500).json({ success: false, message: 'Server error creating offline request' });
  }
};

/**
 * Worker: Get active/pending offline request
 */
export const getActiveOfflineRequest = async (req, res) => {
  try {
    const workerId = req.user.id;

    // Check for pending request
    const pendingRequest = await WorkerOfflineRequest.findOne({
      workerId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    const worker = await Worker.findById(workerId).select('currentOfflineSchedule isOnline approvalStatus');

    res.status(200).json({
      success: true,
      data: pendingRequest || null,
      pendingRequest: pendingRequest || null,
      activeSchedule: worker?.currentOfflineSchedule || null,
      isOnline: worker?.isOnline || false,
      approvalStatus: worker?.approvalStatus || 'pending'
    });
  } catch (error) {
    console.error('Get active offline request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Worker: Cancel a pending offline request
 */
export const cancelOfflineRequest = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { id } = req.params;

    const request = await WorkerOfflineRequest.findOne({
      _id: id,
      workerId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Pending offline request not found or already processed'
      });
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Offline request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel offline request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Admin: Get all worker offline requests with filters
 */
export const getAllOfflineRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      // Find workers matching search by name or phone
      const matchingWorkers = await Worker.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      query.workerId = { $in: matchingWorkers.map((w) => w._id) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      WorkerOfflineRequest.find(query)
        .populate('workerId', 'name phone email serviceCategories isOnline currentOfflineSchedule approvalStatus')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      WorkerOfflineRequest.countDocuments(query)
    ]);

    const pendingCount = await WorkerOfflineRequest.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      },
      counts: {
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('Get all offline requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Admin: Approve offline request (with optional adjusted slots/time)
 * Body: { adjustedStartSlot, adjustedEndSlot, adjustedDateStr, notes }
 */
export const approveOfflineRequest = async (req, res) => {
  try {
    const { id } = req.params;
    let { adjustedStartSlot, adjustedEndSlot, adjustedDateStr, notes } = req.body;
    const adminId = req.user.id;

    const request = await WorkerOfflineRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status '${request.status}'`
      });
    }

    if (typeof adjustedStartSlot === 'string') {
      adjustedStartSlot = { value: adjustedStartSlot, display: adjustedStartSlot };
    }
    if (typeof adjustedEndSlot === 'string') {
      adjustedEndSlot = { value: adjustedEndSlot, display: adjustedEndSlot };
    }

    // Determine final values (either original or admin adjusted)
    const finalDateStr = adjustedDateStr || request.dateStr;
    const finalStartSlot = adjustedStartSlot || request.startSlot;
    const finalEndSlot = adjustedEndSlot || request.endSlot;

    const isAdjusted = Boolean(
      adjustedDateStr ||
      adjustedStartSlot?.value !== request.startSlot?.value ||
      adjustedEndSlot?.value !== request.endSlot?.value
    );

    const [startH, startM] = finalStartSlot.value.split(':').map(Number);
    const [endH, endM] = finalEndSlot.value.split(':').map(Number);

    const startDateTime = new Date(`${finalDateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const endDateTime = new Date(`${finalDateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        message: 'End slot must be after start slot'
      });
    }

    request.status = 'approved';
    request.adminAdjusted = isAdjusted;
    request.dateStr = finalDateStr;
    request.date = new Date(finalDateStr);
    request.startSlot = finalStartSlot;
    request.endSlot = finalEndSlot;
    request.startDateTime = startDateTime;
    request.endDateTime = endDateTime;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    if (notes) request.notes = notes;

    await request.save();

    // Update worker's current offline schedule
    const worker = await Worker.findById(request.workerId);
    if (worker) {
      const now = new Date();
      const isCurrentlyOfflineWindow = now >= startDateTime && now <= endDateTime;

      worker.currentOfflineSchedule = {
        requestId: request._id,
        startDateTime,
        endDateTime,
        dateStr: finalDateStr,
        startSlot: finalStartSlot.display || finalStartSlot.value,
        endSlot: finalEndSlot.display || finalEndSlot.value,
        reason: request.reason,
        isActive: true
      };

      // If current time falls inside the offline window, immediately toggle worker OFF
      if (isCurrentlyOfflineWindow) {
        worker.isOnline = false;
      }

      await worker.save();

      // Send notification to worker
      try {
        await createNotification({
          userId: worker._id,
          recipientType: 'worker',
          title: 'Offline Request Approved',
          message: isAdjusted
            ? `Admin approved your offline request with adjusted time: ${finalDateStr} (${finalStartSlot.display} - ${finalEndSlot.display}).`
            : `Admin approved your offline request for ${finalDateStr} (${finalStartSlot.display} - ${finalEndSlot.display}).`,
          type: 'worker_offline_approved',
          data: {
            requestId: request._id,
            startDateTime,
            endDateTime
          }
        });
      } catch (notifErr) {
        console.warn('Worker notification failed:', notifErr.message);
      }

      // Send real-time socket event to worker
      try {
        const io = getIO();
        if (io) {
          const approvedMsg = isAdjusted
            ? `Admin approved your offline request with adjusted time: ${finalDateStr} (${finalStartSlot.display} - ${finalEndSlot.display}).`
            : `Admin approved your offline request for ${finalDateStr} (${finalStartSlot.display} - ${finalEndSlot.display}).`;

          io.to(`worker_${worker._id}`).emit('worker_offline_approved', {
            title: 'Offline Request Approved',
            message: approvedMsg,
            requestId: request._id,
            dateStr: finalDateStr,
            startSlot: finalStartSlot.display,
            endSlot: finalEndSlot.display,
            isAdjusted,
            isOnline: worker.isOnline
          });

          io.to('admin_room').emit('offline_request_updated', {
            requestId: request._id,
            status: 'approved'
          });
        }
      } catch (socketErr) {
        console.warn('Worker socket event failed:', socketErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: isAdjusted
        ? 'Offline request approved with adjusted time.'
        : 'Offline request approved successfully.',
      data: request,
      workerOnline: worker ? worker.isOnline : false
    });
  } catch (error) {
    console.error('Approve offline request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Admin: Reject offline request
 * Body: { reason }
 */
export const rejectOfflineRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    const request = await WorkerOfflineRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'rejected';
    request.rejectionReason = reason || 'Request rejected by admin';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    // Send notification to worker
    try {
      await createNotification({
        userId: request.workerId,
        recipientType: 'worker',
        title: 'Offline Request Rejected',
        message: `Your offline request for ${request.dateStr} was rejected. ${reason ? `Reason: ${reason}` : ''}`,
        type: 'worker_offline_rejected',
        data: { requestId: request._id }
      });

      // Send real-time socket event to worker
      const io = getIO();
      if (io) {
        io.to(`worker_${request.workerId}`).emit('worker_offline_rejected', {
          title: 'Offline Request Rejected',
          message: `Your offline request for ${request.dateStr} was rejected by Admin. ${reason ? `Reason: ${reason}` : ''}`,
          requestId: request._id,
          dateStr: request.dateStr,
          reason: reason || ''
        });

        io.to('admin_room').emit('offline_request_updated', {
          requestId: request._id,
          status: 'rejected'
        });
      }
    } catch (notifErr) {
      console.warn('Worker notification failed:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Offline request rejected.',
      data: request
    });
  } catch (error) {
    console.error('Reject offline request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Admin: Adjust time of an already approved request ("kam ya jyda karna")
 * Body: { startSlot, endSlot, dateStr }
 */
export const adjustOfflineRequestTime = async (req, res) => {
  try {
    const { id } = req.params;
    let { startSlot, endSlot, dateStr } = req.body;

    const request = await WorkerOfflineRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (typeof startSlot === 'string') {
      startSlot = { value: startSlot, display: startSlot };
    }
    if (typeof endSlot === 'string') {
      endSlot = { value: endSlot, display: endSlot };
    }

    const finalDateStr = dateStr || request.dateStr;
    const finalStartSlot = startSlot || request.startSlot;
    const finalEndSlot = endSlot || request.endSlot;

    const [startH, startM] = finalStartSlot.value.split(':').map(Number);
    const [endH, endM] = finalEndSlot.value.split(':').map(Number);

    const startDateTime = new Date(`${finalDateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const endDateTime = new Date(`${finalDateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        message: 'End slot must be after start slot'
      });
    }

    request.dateStr = finalDateStr;
    request.date = new Date(finalDateStr);
    request.startSlot = finalStartSlot;
    request.endSlot = finalEndSlot;
    request.startDateTime = startDateTime;
    request.endDateTime = endDateTime;
    request.adminAdjusted = true;
    await request.save();

    // Sync worker schedule
    const worker = await Worker.findById(request.workerId);
    if (worker) {
      const now = new Date();
      const isCurrentlyOffline = now >= startDateTime && now <= endDateTime;

      worker.currentOfflineSchedule = {
        requestId: request._id,
        startDateTime,
        endDateTime,
        dateStr: finalDateStr,
        startSlot: finalStartSlot.display || finalStartSlot.value,
        endSlot: finalEndSlot.display || finalEndSlot.value,
        reason: request.reason,
        isActive: true
      };

      if (isCurrentlyOffline) {
        worker.isOnline = false;
      }

      await worker.save();

      // Send real-time socket event to worker
      try {
        const io = getIO();
        if (io) {
          io.to(`worker_${worker._id}`).emit('worker_offline_adjusted', {
            title: 'Offline Leave Time Adjusted',
            message: `Admin updated your offline leave to: ${finalDateStr} (${finalStartSlot.display || finalStartSlot.value} - ${finalEndSlot.display || finalEndSlot.value})`,
            requestId: request._id,
            dateStr: finalDateStr,
            startSlot: finalStartSlot.display || finalStartSlot.value,
            endSlot: finalEndSlot.display || finalEndSlot.value,
            isOnline: worker.isOnline
          });
          io.to('admin_room').emit('offline_request_updated', {
            requestId: request._id,
            status: request.status
          });
        }
      } catch (socketErr) {
        console.warn('Worker socket event failed:', socketErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Offline time adjusted successfully.',
      data: request
    });
  } catch (error) {
    console.error('Adjust offline request time error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Admin: Force Worker Online Anytime
 * Authority to override any offline state and bring worker online immediately
 */
export const forceWorkerOnline = async (req, res) => {
  try {
    const { id } = req.params; // workerId

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    worker.isOnline = true;
    if (worker.currentOfflineSchedule) {
      worker.currentOfflineSchedule.isActive = false;
    }
    worker.lastSeenAt = new Date();
    await worker.save();

    // If there is an active offline request, we can mark it completed/ended
    await WorkerOfflineRequest.updateMany(
      {
        workerId: worker._id,
        status: 'approved',
        endDateTime: { $gte: new Date() }
      },
      {
        $set: { notes: 'Ended early by admin (Force Online)' }
      }
    );

    // Send notification to worker
    try {
      await createNotification({
        userId: worker._id,
        recipientType: 'worker',
        title: 'Status Updated to Online',
        message: 'Admin has set your status to Online.',
        type: 'worker_status_update',
        data: { isOnline: true }
      });

      // Send real-time socket event to worker
      const io = getIO();
      if (io) {
        io.to(`worker_${worker._id}`).emit('worker_forced_online', {
          title: 'Status Updated: Online',
          message: 'Admin has set your status to Online.',
          isOnline: true
        });
        io.to('admin_room').emit('worker_status_changed', {
          workerId: worker._id,
          isOnline: true
        });
      }
    } catch (notifErr) {
      console.warn('Worker notification failed:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `${worker.name} is now set to Online.`,
      data: {
        workerId: worker._id,
        isOnline: worker.isOnline,
        currentOfflineSchedule: worker.currentOfflineSchedule
      }
    });
  } catch (error) {
    console.error('Force worker online error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Public: Get Platform Operating Hours and dynamic Slots
 */
export const getPlatformOperatingHours = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const operatingHours = settings.operatingHours || {
      isOpen: true,
      openingTime: '09:00',
      closingTime: '21:00',
      slotDuration: 60
    };

    const slots = generateTimeSlots(
      operatingHours.openingTime,
      operatingHours.closingTime,
      operatingHours.slotDuration
    );

    res.status(200).json({
      success: true,
      platformOpen: settings.platformOpen,
      operatingHours,
      slots
    });
  } catch (error) {
    console.error('Get operating hours error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
