import WorkerComplaint from '../models/WorkerComplaint.js';
import { createNotification } from './notificationControllers/notificationController.js';

export const createComplaint = async (req, res) => {
  try {
    const { subject, description } = req.body;
    const workerId = req.user._id;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    const complaint = new WorkerComplaint({
      workerId,
      subject,
      description
    });

    await complaint.save();

    await createNotification({
      workerId,
      type: 'complaint_created',
      title: 'Complaint Submitted',
      message: `Your complaint ${complaint.ticketId} has been submitted. We will notify you about every update.`,
      relatedId: complaint._id,
      relatedType: 'complaint',
      pushData: {
        type: 'complaint_created',
        complaintId: complaint._id.toString(),
        link: '/worker/complaints'
      }
    });

    createNotification({
      recipientType: 'admin',
      type: 'worker_complaint_created',
      title: 'New Expert Complaint',
      message: `${req.user.name || 'An expert'} submitted complaint ${complaint.ticketId}: ${subject}`,
      relatedId: complaint._id,
      relatedType: 'complaint',
      pushData: { type: 'worker_complaint_created', complaintId: complaint._id.toString() }
    }).catch((notificationError) => console.error('Admin complaint notification failed:', notificationError));

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: complaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error', stack: error.stack });
  }
};

export const getWorkerComplaints = async (req, res) => {
  try {
    const workerId = req.user._id;
    const complaints = await WorkerComplaint.find({ workerId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: complaints
    });
  } catch (error) {
    console.error('Error fetching worker complaints:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await WorkerComplaint.find()
      .populate('workerId', 'firstName lastName phone email profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: complaints
    });
  } catch (error) {
    console.error('Error fetching all complaints:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const complaint = await WorkerComplaint.findById(id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const previousStatus = complaint.status;
    if (status) complaint.status = status;
    if (adminResponse !== undefined) complaint.adminResponse = adminResponse;

    await complaint.save();

    const responseChanged = adminResponse !== undefined;
    const statusChanged = status && status !== previousStatus;
    if (statusChanged || responseChanged) {
      const responseText = adminResponse ? ` Admin response: ${adminResponse}` : '';
      await createNotification({
        workerId: complaint.workerId,
        type: 'complaint_updated',
        title: `Complaint ${complaint.status}`,
        message: `Complaint ${complaint.ticketId} is now ${complaint.status}.${responseText}`,
        relatedId: complaint._id,
        relatedType: 'complaint',
        priority: complaint.status === 'Resolved' ? 'high' : 'normal',
        pushData: {
          type: 'complaint_updated',
          complaintId: complaint._id.toString(),
          status: complaint.status,
          link: '/worker/complaints'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      data: complaint
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
