import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Worker from '../models/Worker.js';
import Transaction from '../models/Transaction.js';
import VendorBill from '../models/VendorBill.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';
import { getIO } from '../sockets.js';

// Money-related fields a helper must never see. A helper only needs to know
// where to go, when, and what the job is.
const MONEY_FIELDS = [
  'basePrice', 'discount', 'tax', 'visitingCharges', 'finalAmount', 'userPayableAmount',
  'finalOnlineAmount', 'finalCashAmount', 'promoCode', 'promoDiscount', 'vipDiscount', 'vipFee', 'vip',
  'advanceRequired', 'advancePaid', 'advancePaymentId', 'advancePaidAt', 'advanceStatus',
  'paymentStatus', 'paymentMethod', 'paymentId', 'razorpayOrderId', 'razorpayPaymentId',
  'customerConfirmationOTP', 'paymentOtp', 'tipAmount', 'workerAmount', 'totalAmount',
  'workerPaymentStatus', 'isWorkerPaid', 'workerPaidAt', 'finalSettlementStatus', 'estimate'
];

// Packers & Movers details keep the route and inventory for workers, but not
// the customer's price breakdown, token or the platform's commission.
const stripMoverMoney = (obj) => {
  const m = obj.moverDetails;
  if (!m) return;
  obj.moverDetails = {
    relocationType: m.relocationType,
    from: m.from,
    to: m.to,
    notes: m.notes,
    distanceKm: m.distanceKm,
    inventory: m.inventory,
    addOns: (m.addOns || []).map((a) => ({ key: a.key, name: a.name, group: a.group }))
  };
};

/**
 * A booking as a helper sees it: read-only job details with every amount
 * removed — including what the helper themself will be paid.
 */
export const sanitizeBookingForHelper = (booking, helperWorkerId) => {
  const obj = typeof booking.toObject === 'function' ? booking.toObject() : { ...booking };
  MONEY_FIELDS.forEach((field) => { delete obj[field]; });
  stripMoverMoney(obj);

  if (Array.isArray(obj.bookedItems)) {
    obj.bookedItems = obj.bookedItems.map((item) => {
      const card = { ...(item.card || {}) };
      delete card.price;
      delete card.originalPrice;
      return { ...item, card };
    });
  }

  const lead = obj.workerId && typeof obj.workerId === 'object' ? obj.workerId : null;
  obj.leadWorker = lead ? { name: lead.name, phone: lead.phone, profilePhoto: lead.profilePhoto } : null;
  obj.workerId = lead?._id || obj.workerId;
  obj.isHelper = true;
  obj.helperWorkerId = String(helperWorkerId);

  // Only the people on the job, never payouts.
  obj.helpers = (obj.helpers || [])
    .filter((h) => h.payoutStatus !== 'cancelled')
    .map((h) => ({ workerId: h.workerId, name: h.workerId?.name, phone: h.workerId?.phone }));
  delete obj.helperRequests;
  return obj;
};

/** A booking as the lead worker sees it: helper names yes, helper payouts no. */
export const sanitizeBookingForLead = (obj) => {
  stripMoverMoney(obj);
  obj.helpers = (obj.helpers || [])
    .filter((h) => h.payoutStatus !== 'cancelled')
    .map((h) => ({ workerId: h.workerId?._id || h.workerId, name: h.workerId?.name, phone: h.workerId?.phone, profilePhoto: h.workerId?.profilePhoto }));
  obj.helperRequests = (obj.helperRequests || []).map((r) => ({
    _id: r._id, count: r.count, reason: r.reason, status: r.status, requestedAt: r.requestedAt, note: r.note
  }));
  return obj;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * The service earning (what is left after the platform's cut, e.g. ₹160 of a
 * ₹200 job) is shared equally by everyone on the job: the lead and each active
 * helper. The lead absorbs any paisa left over from rounding.
 */
export const splitEarning = (helpers, pool) => {
  const active = (helpers || []).filter((h) => h.payoutStatus !== 'cancelled');
  const people = active.length + 1;
  const share = Math.floor((Math.max(0, Number(pool) || 0) / people) * 100) / 100;
  const helperTotal = round2(share * active.length);
  return { people, share, helperTotal, leadShare: round2(Math.max(0, (Number(pool) || 0) - helperTotal)) };
};

/**
 * The lead's share of `pool`, remembered on the booking. Used wherever the
 * lead's earning is credited so helpers are never paid out of thin air.
 */
export const leadShareOf = async (bookingId, pool) => {
  const booking = await HomeServiceBooking.findById(bookingId).select('+helpers').lean();
  const { leadShare } = splitEarning(booking?.helpers, pool);
  await HomeServiceBooking.updateOne({ _id: bookingId }, { $set: { leadPayoutCredited: leadShare } });
  return leadShare;
};

/**
 * Pays every pending helper on a completed booking: wallet credit plus a
 * transaction row, then a notification. Safe to call more than once — each
 * helper is flipped to `paid` atomically before the money moves.
 */
export const settleHelperPayouts = async (bookingId) => {
  const booking = await HomeServiceBooking.findById(bookingId).select('+helpers').lean();
  if (!booking || booking.status !== 'completed') return;

  // Equal split of the worker earning between the lead and every helper.
  const bill = await VendorBill.findOne({ bookingId }).select('vendorTotalEarning').lean();
  const pool = Number(bill?.vendorTotalEarning) || 0;
  const split = splitEarning(booking.helpers, pool);

  // The lead may have been credited the full amount before a helper joined:
  // take back the difference so the total paid out equals the pool.
  if (pool > 0 && typeof booking.leadPayoutCredited === 'number' && booking.leadPayoutCredited > split.leadShare + 0.001) {
    const diff = round2(booking.leadPayoutCredited - split.leadShare);
    const claimedLead = await HomeServiceBooking.findOneAndUpdate(
      { _id: bookingId, leadPayoutCredited: booking.leadPayoutCredited },
      { $set: { leadPayoutCredited: split.leadShare } },
      { new: true }
    ).select('workerId bookingNumber');
    if (claimedLead && claimedLead.workerId) {
      const lead = await Worker.findByIdAndUpdate(
        claimedLead.workerId,
        { $inc: { 'wallet.balance': -diff, 'wallet.earnings': -diff } },
        { new: true }
      );
      if (lead) {
        await Transaction.create({
          workerId: lead._id,
          amount: diff,
          type: 'debit',
          category: 'helper_split',
          balanceAfter: lead.wallet?.balance || 0,
          status: 'completed',
          description: `Shared with helper(s) on Booking #${booking.bookingNumber}`,
          reference: booking.bookingNumber
        }).catch(() => {});
        getIO()?.to(`worker_${lead._id}`).emit('wallet_updated', { balance: lead.wallet?.balance });
      }
    }
  }

  for (const helper of booking.helpers || []) {
    if (helper.payoutStatus !== 'pending') continue;

    // Claim this helper's payout so two triggers can't both pay it.
    const claimed = await HomeServiceBooking.findOneAndUpdate(
      { _id: bookingId, helpers: { $elemMatch: { _id: helper._id, payoutStatus: 'pending' } } },
      { $set: { 'helpers.$.payoutStatus': 'paid', 'helpers.$.paidAt': new Date() } },
      { new: true }
    ).select('_id');
    if (!claimed) continue;

    // Equal share; an older admin-typed amount is only a fallback when there is no bill.
    const amount = pool > 0 ? split.share : Math.max(0, Number(helper.payoutAmount) || 0);
    if (amount <= 0) continue;
    await HomeServiceBooking.updateOne({ _id: bookingId, 'helpers._id': helper._id }, { $set: { 'helpers.$.payoutAmount': amount } });

    try {
      const worker = await Worker.findById(helper.workerId);
      if (!worker) continue;
      worker.wallet = worker.wallet || {};
      worker.wallet.balance = (worker.wallet.balance || 0) + amount;
      worker.wallet.earnings = (worker.wallet.earnings || 0) + amount;
      await worker.save();

      await Transaction.create({
        workerId: worker._id,
        amount,
        type: 'credit',
        category: 'helper_payment',
        balanceAfter: worker.wallet.balance,
        status: 'completed',
        description: `Helper payment for Booking #${booking.bookingNumber}`,
        reference: booking.bookingNumber
      });

      createNotification({
        workerId: worker._id,
        type: 'wallet_credit',
        title: 'Payment Added to Wallet',
        message: `₹${amount} for helping on booking #${booking.bookingNumber} has been added to your wallet.`,
        relatedId: bookingId,
        relatedType: 'booking',
        priority: 'high',
        pushData: { type: 'wallet_credit', link: '/worker/wallet' }
      }).catch(() => {});
      getIO()?.to(`worker_${worker._id}`).emit('wallet_updated', { balance: worker.wallet.balance });
    } catch (err) {
      console.error('[HelperPayout] failed for helper', String(helper.workerId), err.message);
      // Put it back so a later completion/retry can pay it.
      await HomeServiceBooking.updateOne(
        { _id: bookingId, 'helpers._id': helper._id },
        { $set: { 'helpers.$.payoutStatus': 'pending', 'helpers.$.paidAt': null } }
      );
    }
  }
};

/** A cancelled booking pays nobody. */
export const cancelHelperPayouts = async (bookingId) => {
  await HomeServiceBooking.updateOne(
    { _id: bookingId },
    { $set: { 'helpers.$[h].payoutStatus': 'cancelled' } },
    { arrayFilters: [{ 'h.payoutStatus': 'pending' }] }
  );
};
