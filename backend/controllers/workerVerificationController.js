import mongoose from 'mongoose';
import Worker from '../models/Worker.js';
import VerificationOffice from '../models/VerificationOffice.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { createNotification } from './notificationControllers/notificationController.js';
import {
  getOfflineVerificationSettings,
  getOfficesForWorker,
  processWorkerReferralBonus
} from '../services/workerVerificationService.js';

const OFFICE_FIELDS = [
  'name', 'address', 'landmark', 'city', 'state', 'pincode', 'mapUrl',
  'contactPerson', 'contactPhone', 'workingHours', 'instructions', 'isActive', 'sortOrder'
];

const pickOffice = (body = {}) => {
  const data = {};
  OFFICE_FIELDS.forEach((k) => {
    if (body[k] !== undefined) data[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
  });
  ['lat', 'lng'].forEach((k) => {
    if (body[k] === undefined) return;
    const n = body[k] === '' || body[k] === null ? null : Number(body[k]);
    data[k] = Number.isFinite(n) ? n : null;
  });
  if (Array.isArray(body.zoneIds)) {
    data.zoneIds = body.zoneIds.filter((z) => mongoose.isValidObjectId(z));
  }
  if (data.sortOrder !== undefined) data.sortOrder = Number(data.sortOrder) || 0;
  if (data.isActive !== undefined) data.isActive = Boolean(data.isActive);
  return data;
};

/* ───────────────────────── Admin: offices ───────────────────────── */

export const listVerificationOffices = async (req, res) => {
  try {
    const offices = await VerificationOffice.find()
      .populate('zoneIds', 'name')
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, data: offices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createVerificationOffice = async (req, res) => {
  try {
    const data = pickOffice(req.body);
    if (!data.name || !data.address) {
      return res.status(400).json({ success: false, message: 'Office name and address are required' });
    }
    const office = await VerificationOffice.create(data);
    res.status(201).json({ success: true, message: 'Office added', data: office });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVerificationOffice = async (req, res) => {
  try {
    const data = pickOffice(req.body);
    if (data.name === '' || data.address === '') {
      return res.status(400).json({ success: false, message: 'Office name and address cannot be empty' });
    }
    const office = await VerificationOffice.findByIdAndUpdate(req.params.officeId, data, { new: true, runValidators: true });
    if (!office) return res.status(404).json({ success: false, message: 'Office not found' });
    res.json({ success: true, message: 'Office updated', data: office });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVerificationOffice = async (req, res) => {
  try {
    const office = await VerificationOffice.findByIdAndDelete(req.params.officeId);
    if (!office) return res.status(404).json({ success: false, message: 'Office not found' });
    // Workers assigned to this office fall back to the general office list.
    await Worker.updateMany(
      { 'offlineVerification.officeId': office._id },
      { $set: { 'offlineVerification.officeId': null } }
    );
    res.json({ success: true, message: 'Office deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ───────────────────────── Admin: settings ───────────────────────── */

export const getVerificationSettings = async (req, res) => {
  try {
    res.json({ success: true, data: await getOfflineVerificationSettings() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVerificationSettings = async (req, res) => {
  try {
    const { enabled, requiredDocuments, instructions } = req.body || {};
    const settings = await PlatformSettings.getSettings();
    const current = settings.workerOfflineVerification || {};
    settings.workerOfflineVerification = {
      enabled: enabled !== undefined ? Boolean(enabled) : current.enabled !== false,
      requiredDocuments: Array.isArray(requiredDocuments)
        ? requiredDocuments.map((d) => String(d).trim()).filter(Boolean)
        : current.requiredDocuments,
      instructions: instructions !== undefined ? String(instructions).trim() : current.instructions
    };
    settings.markModified('workerOfflineVerification');
    await settings.save();
    res.json({ success: true, message: 'Verification settings saved', data: await getOfflineVerificationSettings() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ───────────────────────── Admin: per-worker actions ───────────────────────── */

/** Admin confirms the worker's original documents were checked at the office. */
export const completeOfflineVerification = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    if (worker.approvalStatus !== 'approved') {
      return res.status(400).json({ success: false, message: 'Approve the online verification first.' });
    }
    if (worker.offlineVerification?.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Offline verification is already completed.' });
    }

    if (!worker.offlineVerification) worker.offlineVerification = {};
    worker.offlineVerification.status = 'completed';
    worker.offlineVerification.completedAt = new Date();
    worker.offlineVerification.completedBy = req.user?._id || null;
    if (req.body?.remarks !== undefined) worker.offlineVerification.remarks = String(req.body.remarks).trim();
    await worker.save();

    await createNotification({
      workerId: worker._id,
      type: 'account_approved',
      title: 'Account Fully Verified 🎉',
      message: 'Your office verification is complete. You can now go online and start receiving jobs.',
      relatedId: worker._id,
      relatedType: 'worker',
      priority: 'high',
      pushData: { type: 'account_approved', link: '/worker/dashboard' }
    }).catch((error) => console.error('Offline verification notification failed:', error));

    await processWorkerReferralBonus(worker).catch((e) => console.error('Referral bonus failed:', e));

    res.json({ success: true, message: 'Offline verification completed. Worker is fully verified.', data: worker.offlineVerification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Admin sends a worker back to (or into) the office-verification queue. */
export const markOfflineVerificationPending = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    if (!worker.offlineVerification) worker.offlineVerification = {};
    worker.offlineVerification.status = 'pending';
    worker.offlineVerification.requestedAt = new Date();
    worker.offlineVerification.completedAt = null;
    worker.offlineVerification.completedBy = null;
    if (req.body?.remarks !== undefined) worker.offlineVerification.remarks = String(req.body.remarks).trim();
    // A worker waiting for office verification must not stay online.
    worker.isOnline = false;
    await worker.save();

    await createNotification({
      workerId: worker._id,
      type: 'offline_verification_pending',
      title: 'Office Verification Required',
      message: 'Please visit our office with your original documents to complete verification.',
      relatedId: worker._id,
      relatedType: 'worker',
      priority: 'high',
      pushData: { type: 'offline_verification_pending', link: '/worker/verification-pending' }
    }).catch((error) => console.error('Offline verification notification failed:', error));

    res.json({ success: true, message: 'Worker moved to office verification pending.', data: worker.offlineVerification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Assign a specific office to a worker (null = show the general list). */
export const assignVerificationOffice = async (req, res) => {
  try {
    const { officeId } = req.body || {};
    if (officeId && !(await VerificationOffice.exists({ _id: officeId }))) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { $set: { 'offlineVerification.officeId': officeId || null } },
      { new: true }
    ).select('offlineVerification');
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Office assigned', data: worker.offlineVerification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ───────────────────────── Worker ───────────────────────── */

/** Everything the worker's "verification pending" screen needs. */
export const getMyVerificationStatus = async (req, res) => {
  try {
    const worker = await Worker.findById(req.user.id)
      .select('name approvalStatus offlineVerification zoneIds')
      .lean();
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    const status = worker.offlineVerification?.status || null;
    const pending = worker.approvalStatus === 'approved' && status === 'pending';
    const settings = await getOfflineVerificationSettings();

    res.json({
      success: true,
      data: {
        approvalStatus: worker.approvalStatus,
        onlineVerification: worker.approvalStatus === 'approved' ? 'approved' : worker.approvalStatus,
        offlineVerification: {
          status: status || 'not_required',
          requestedAt: worker.offlineVerification?.requestedAt || null,
          completedAt: worker.offlineVerification?.completedAt || null
        },
        fullyVerified: worker.approvalStatus === 'approved' && !pending,
        offices: pending ? await getOfficesForWorker(worker) : [],
        requiredDocuments: settings.requiredDocuments,
        instructions: settings.instructions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
