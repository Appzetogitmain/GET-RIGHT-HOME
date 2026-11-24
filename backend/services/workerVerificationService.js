import PlatformSettings from '../models/PlatformSettings.js';
import Worker from '../models/Worker.js';
import Transaction from '../models/Transaction.js';
import VerificationOffice from '../models/VerificationOffice.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';

/**
 * Mongo filter matching workers that are NOT waiting for office verification.
 * Legacy workers have no status at all, so `$ne` keeps them eligible.
 */
export const OFFLINE_VERIFIED_FILTER = { 'offlineVerification.status': { $ne: 'pending' } };

export const isOfflineVerificationPending = (worker) => worker?.offlineVerification?.status === 'pending';

export const OFFLINE_PENDING_MESSAGE =
  'Your office (offline) document verification is pending. You will receive jobs once it is completed.';

export const getOfflineVerificationSettings = async () => {
  const settings = await PlatformSettings.getSettings();
  const cfg = settings.workerOfflineVerification || {};
  return {
    enabled: cfg.enabled !== false,
    requiredDocuments: Array.isArray(cfg.requiredDocuments) ? cfg.requiredDocuments : [],
    instructions: cfg.instructions || ''
  };
};

/**
 * Called when the admin approves a worker's online registration.
 * Puts the worker in the office-verification queue when the step is enabled.
 * Mutates `worker` (caller saves). Returns true when the step was started.
 */
export const startOfflineVerificationIfRequired = async (worker) => {
  const { enabled } = await getOfflineVerificationSettings();
  if (worker.offlineVerification?.status === 'completed') return false;
  if (!worker.offlineVerification) worker.offlineVerification = {};
  if (!enabled) {
    worker.offlineVerification.status = 'not_required';
    return false;
  }
  worker.offlineVerification.status = 'pending';
  worker.offlineVerification.requestedAt = new Date();
  worker.offlineVerification.completedAt = null;
  worker.offlineVerification.completedBy = null;
  return true;
};

/**
 * Offices a worker should see: the office the admin assigned, otherwise active
 * offices for the worker's zones (offices without zones are shown to everyone).
 */
export const getOfficesForWorker = async (worker) => {
  const assignedId = worker?.offlineVerification?.officeId;
  if (assignedId) {
    const assigned = await VerificationOffice.findOne({ _id: assignedId, isActive: true }).lean();
    if (assigned) return [assigned];
  }
  const zoneIds = (worker?.zoneIds || []).map((z) => z?._id || z);
  const offices = await VerificationOffice.find({
    isActive: true,
    $or: [
      { zoneIds: { $size: 0 } },
      { zoneIds: { $exists: false } },
      ...(zoneIds.length ? [{ zoneIds: { $in: zoneIds } }] : [])
    ]
  }).sort({ sortOrder: 1, createdAt: 1 }).lean();
  if (offices.length) return offices;
  // Zone-specific offices only and none match: show all rather than nothing.
  return VerificationOffice.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
};

/**
 * Credits referral bonuses once a worker becomes fully verified.
 * Idempotent through `referralBonusCredited`. Saves both workers.
 */
export const processWorkerReferralBonus = async (worker) => {
  if (!worker.referredBy || worker.referralBonusCredited) return;

  const platformSettings = await PlatformSettings.getSettings();
  const bonusReferrer = platformSettings.workerReferralBonusReferrer || 0;
  const bonusReferee = platformSettings.workerReferralBonusReferee || 0;
  if (bonusReferrer <= 0 && bonusReferee <= 0) return;

  const referrer = await Worker.findById(worker.referredBy);
  if (referrer) {
    if (bonusReferrer > 0) {
      if (!referrer.wallet) referrer.wallet = { balance: 0, earnings: 0, totalCashCollected: 0, totalWithdrawn: 0, dues: 0 };
      referrer.wallet.balance = (referrer.wallet.balance || 0) + bonusReferrer;
      referrer.wallet.earnings = (referrer.wallet.earnings || 0) + bonusReferrer;
      await referrer.save();

      await Transaction.create({
        workerId: referrer._id,
        modelType: 'Worker',
        type: 'credit',
        category: 'referral_bonus',
        amount: bonusReferrer,
        balanceAfter: referrer.wallet.balance,
        description: `Referral bonus for inviting ${worker.name}`,
        reference: `ref_${worker._id}`,
        status: 'completed'
      });

      await createNotification({
        workerId: referrer._id,
        type: 'referral_bonus',
        title: 'Referral Bonus! 🎉',
        message: `You received ₹${bonusReferrer} for referring ${worker.name}.`,
        relatedId: referrer._id,
        relatedType: 'wallet',
        priority: 'high',
        pushData: { type: 'referral_bonus', link: '/worker/wallet' }
      }).catch(e => console.error(e));
    }

    if (bonusReferee > 0) {
      if (!worker.wallet) worker.wallet = { balance: 0, earnings: 0, totalCashCollected: 0, totalWithdrawn: 0, dues: 0 };
      worker.wallet.balance = (worker.wallet.balance || 0) + bonusReferee;
      worker.wallet.earnings = (worker.wallet.earnings || 0) + bonusReferee;

      await Transaction.create({
        workerId: worker._id,
        modelType: 'Worker',
        type: 'credit',
        category: 'referral_bonus',
        amount: bonusReferee,
        balanceAfter: worker.wallet.balance,
        description: `Welcome referral bonus via ${referrer.name}`,
        reference: `ref_welcome_${worker._id}`,
        status: 'completed'
      });

      await createNotification({
        workerId: worker._id,
        type: 'referral_bonus',
        title: 'Welcome Bonus! 🎉',
        message: `You received ₹${bonusReferee} referral bonus for joining via ${referrer.name}.`,
        relatedId: worker._id,
        relatedType: 'wallet',
        priority: 'high',
        pushData: { type: 'referral_bonus', link: '/worker/wallet' }
      }).catch(e => console.error(e));
    }
  }

  worker.referralBonusCredited = true;
  await worker.save();
};
