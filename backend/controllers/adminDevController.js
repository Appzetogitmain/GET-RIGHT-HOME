import HomeServiceBooking from '../models/HomeServiceBooking.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';
import VendorBill from '../models/VendorBill.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import Settlement from '../models/Settlement.js';
import SubscriptionOrder from '../models/SubscriptionOrder.js';
import Worker from '../models/Worker.js';
import User from '../models/User.js';
import { syncWorkerCapacityStatus } from '../services/workerCapacityService.js';

const CONFIRM_PHRASE = 'DELETE';

// Each target is a named group of data the dev tools can wipe.
const TARGETS = {
  bookings: {
    label: 'Home-service bookings',
    description: 'All bookings, worker job offers, bills and slot ledger entries.',
    models: [HomeServiceBooking, BookingRequest, VendorBill, AvailabilityLedger]
  },
  transactions: {
    label: 'Financial records',
    description: 'All transactions, withdrawals, settlements and subscription orders.',
    models: [Transaction, Withdrawal, Settlement, SubscriptionOrder]
  },
  wallets: {
    label: 'Wallet balances',
    description: 'Resets every worker and user wallet balance, earnings and dues to zero.',
    models: []
  }
};

const countTarget = async (key) => {
  if (key === 'wallets') {
    const [workers, users] = await Promise.all([
      Worker.countDocuments({ $or: [{ 'wallet.balance': { $ne: 0 } }, { 'wallet.earnings': { $ne: 0 } }, { 'wallet.dues': { $ne: 0 } }] }),
      User.countDocuments({ $or: [{ 'wallet.balance': { $ne: 0 } }, { 'wallet.penalty': { $gt: 0 } }] })
    ]);
    return { workers, users, total: workers + users };
  }
  const counts = {};
  for (const model of TARGETS[key].models) counts[model.modelName] = await model.estimatedDocumentCount();
  return { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
};

/** Superadmin: how much data each purge target currently holds. */
export const getDevStats = async (req, res) => {
  try {
    const data = await Promise.all(Object.entries(TARGETS).map(async ([key, t]) => ({
      key,
      label: t.label,
      description: t.description,
      counts: await countTarget(key)
    })));
    res.json({ success: true, confirmPhrase: CONFIRM_PHRASE, data });
  } catch (error) {
    console.error('Dev stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};

/** Superadmin: permanently delete the chosen data groups. Body: { targets: [], confirm: 'DELETE' } */
export const purgeData = async (req, res) => {
  try {
    const { targets, confirm } = req.body || {};
    if (confirm !== CONFIRM_PHRASE) {
      return res.status(400).json({ success: false, message: `Type ${CONFIRM_PHRASE} to confirm.` });
    }
    const keys = [...new Set(Array.isArray(targets) ? targets : [])];
    if (!keys.length || keys.some((k) => !TARGETS[k])) {
      return res.status(400).json({ success: false, message: 'Select at least one valid data group.' });
    }

    const result = {};
    for (const key of keys) {
      if (key === 'wallets') {
        const workers = await Worker.updateMany({}, { $set: { 'wallet.balance': 0, 'wallet.earnings': 0, 'wallet.totalCashCollected': 0, 'wallet.totalWithdrawn': 0, 'wallet.dues': 0 } });
        const users = await User.updateMany({}, { $set: { 'wallet.balance': 0, 'wallet.penalty': 0 } });
        result[key] = { workers: workers.modifiedCount, users: users.modifiedCount };
        continue;
      }
      result[key] = {};
      for (const model of TARGETS[key].models) {
        result[key][model.modelName] = (await model.deleteMany({})).deletedCount;
      }
    }

    // Workers busy on a now-deleted job must not stay stuck as "busy".
    if (keys.includes('bookings')) {
      const busy = await Worker.find({ status: 'busy' }).select('_id').lean();
      await Promise.all(busy.map((w) => syncWorkerCapacityStatus(w._id).catch(() => {})));
    }

    console.warn(`[DevPurge] ${req.user?.id} purged: ${keys.join(', ')}`, JSON.stringify(result));
    res.json({ success: true, message: 'Selected data deleted.', data: result });
  } catch (error) {
    console.error('Dev purge error:', error);
    res.status(500).json({ success: false, message: 'Purge failed: ' + error.message });
  }
};
