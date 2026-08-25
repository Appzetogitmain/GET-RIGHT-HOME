import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../config/payment.config.js';
import Admin from '../models/Admin.js';
import Booking from '../models/Booking.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Offer from '../models/Offer.js';
import Property from '../models/Property.js';
import mongoose from 'mongoose';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import smsService from '../utils/smsService.js';
import referralService from '../services/referralService.js';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import VendorBill from '../models/VendorBill.js';
import { settleOrder, failOrder } from '../services/subscriptionActivationService.js';
import { activateLegacySubscriptionFromWebhook } from './subscriptionController.js';
import { getIO } from '../sockets.js';

// Initialize Razorpay
let razorpay;
try {
  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: PaymentConfig.razorpayKeyId,
      key_secret: PaymentConfig.razorpayKeySecret
    });
  } else {
    // For Development without Keys
    console.warn("⚠️ Razorpay Keys missing. Payment features will fail if used.");
    razorpay = {
      orders: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized")),
        fetch: () => Promise.reject(new Error("Razorpay Not Initialized"))
      },
      payments: {
        fetch: () => Promise.reject(new Error("Razorpay Not Initialized")),
        refund: () => Promise.reject(new Error("Razorpay Not Initialized"))
      }
    };
  }
} catch (err) {
  console.error("Razorpay Init Failed:", err.message);
}

/**
 * @desc    Create Razorpay order for booking payment
 * @route   POST /api/payments/create-order
 * @access  Private
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const { bookingId, isEstimateToken } = req.body;
    let booking = await Booking.findById(bookingId);
    let isHomeService = false;
    
    if (!booking) {
      booking = await HomeServiceBooking.findById(bookingId);
      if (booking) {
        isHomeService = true;
      } else {
        return res.status(404).json({ message: 'Booking not found' });
      }
    }
    
    if (!isEstimateToken && (booking.paymentStatus === 'paid' || booking.paymentStatus === 'SUCCESS')) return res.status(400).json({ message: 'Booking already paid' });

    // Use token amount if isEstimateToken is true, else use final amount
    let baseAmount = 0;
    if (isEstimateToken && isHomeService) {
      if (!booking.isEstimateBased || booking.estimate?.status !== 'PENDING') {
        return res.status(400).json({ message: 'No pending estimate found' });
      }
      baseAmount = booking.estimate.tokenAmount;
    } else {
      baseAmount = isHomeService ? (booking.finalOnlineAmount || booking.finalAmount || booking.totalAmount || 0) : booking.totalAmount;
      if (isHomeService && booking.isEstimateBased && booking.estimate?.tokenAmount) {
        baseAmount = Math.max(0, baseAmount - booking.estimate.tokenAmount);
      }
    }
    
    let amountInPaise = Math.round(baseAmount * 100);
    
    if (!amountInPaise || amountInPaise <= 0) return res.status(400).json({ message: 'Invalid booking amount' });

    // WORKAROUND: Razorpay Test Accounts often have a limit (e.g., ₹15,000).
    // If using Test Keys, cap the request amount to ₹10,000 to allow testing the flow.
    const isTestKey = PaymentConfig.razorpayKeyId?.startsWith('rzp_test');
    const MAX_TEST_AMOUNT = 10000 * 100; // ₹10,000

    if (isTestKey && amountInPaise > MAX_TEST_AMOUNT) {
      console.warn(`⚠️ Capping Test Payment of ₹${baseAmount} to ₹10,000 to avoid Razorpay Limit Check.`);
      amountInPaise = MAX_TEST_AMOUNT;
    }

    const options = {
      amount: amountInPaise,
      currency: PaymentConfig.currency,
      receipt: booking._id.toString(),
      notes: {
        bookingId: booking._id.toString(),
        userId: booking.userId?.toString(),
        isHomeService: isHomeService ? 'true' : 'false',
        propertyId: booking.propertyId?.toString() || 'none'
      }
    };
    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      booking: {
        id: booking._id,
        amount: baseAmount,
        status: isHomeService ? booking.status : booking.bookingStatus,
        paymentStatus: booking.paymentStatus
      },
      razorpayKeyId: PaymentConfig.razorpayKeyId
    });
  } catch (error) {
    console.error('Create Payment Order Error:', error);
    res.status(500).json({
      message: 'Failed to create payment order',
      error: error.error?.description || error.message
    });
  }
};

/**
 * Settles a captured booking payment — the actual "mark it paid and run every
 * side effect" work, shared by the client's POST /verify and the Razorpay
 * webhook.
 *
 * Previously this all lived inline in verifyPayment, reachable only when the
 * browser came back and posted to /verify. The webhook's payment.captured
 * handler settled subscription orders but did nothing at all for ordinary
 * booking payments — every ₹ paid for a home-service or property booking
 * depended entirely on the client round-trip. A closed tab, a crashed app, a
 * dropped network on the redirect back, or the user just not waiting for the
 * "Verifying..." spinner all left Razorpay holding a captured payment with
 * the booking still `pending`/`awaiting_payment` and no record of the
 * payment id anywhere — exactly "payment completed but not updated".
 *
 * Resolves the booking from the Razorpay ORDER's notes (written once, at
 * order-creation time, by createPaymentOrder or bookingController's own order
 * call) rather than trusting a bookingId the caller supplies — the webhook
 * has no request body to trust anyway, and this closes the same
 * client-trust gap the subscription checkout had (§F-2 in the subscription
 * work).
 *
 * Idempotent: checks the booking's own paymentStatus before doing anything,
 * so whichever of the webhook and the browser gets here first does the work
 * and the other is a no-op — no double wallet credits, no duplicate emails.
 *
 * Does NOT cover the isEstimateToken flow or the "deferred creation" branch
 * in verifyPayment (a booking created from order notes at verify time) — the
 * former is a narrow home-service sub-flow and the latter appears to be
 * unreachable in the current checkout (every order-creation path, in both
 * createPaymentOrder and bookingController, already writes `bookingId` into
 * the order notes, so a booking always exists by the time payment is made).
 * Both keep working exactly as before through the client path; only the
 * common "pay for an existing booking" case gained webhook coverage.
 *
 * @returns {ok, alreadySettled, isHomeService, booking}  or  {ok:false, reason}
 */
export const settleBookingPayment = async (razorpayOrderId, paymentId, prefetchedOrder = null) => {
  const order = prefetchedOrder || await razorpay.orders.fetch(razorpayOrderId);
  const notes = order?.notes || {};
  const bookingId = notes.bookingId;
  if (!bookingId || notes.type === 'subscription_purchase') {
    // Not a booking-payment order at all (subscription orders are handled by
    // the webhook's own settleOrder/legacy-subscription arms before this is
    // ever called; anything else genuinely isn't ours).
    return { ok: false, reason: 'Not a booking payment order' };
  }

  const isHomeService = notes.isHomeService === 'true';
  let booking = isHomeService
    ? await HomeServiceBooking.findById(bookingId).select('+paymentOtp')
    : await Booking.findById(bookingId);
  if (!booking) return { ok: false, reason: 'Booking not found' };

  if (booking.paymentStatus === 'paid') {
    return { ok: true, alreadySettled: true, isHomeService, booking };
  }

  if (isHomeService) {
    booking.paymentStatus = 'paid';
    booking.paymentMethod = 'online';
    // Paying does NOT close the job — see the identical comment on the
    // client path below for why this isn't `completed`.
    if (booking.status !== 'completed') {
      booking.status = 'awaiting_payment';
    }
    booking.workerPaymentStatus = 'PAID';
    booking.isWorkerPaid = true;
    booking.finalSettlementStatus = 'DONE';
    booking.paymentId = paymentId;

    // The worker still needs a final OTP from the customer to close the job
    // (see confirmManualOnlineCollection / collectCash) — normally createBill
    // generates this before payment. But nothing stops a customer from paying
    // here before the worker ever prepares a bill, in which case paymentOtp/
    // customerConfirmationOTP were never set: the customer's app fell back to
    // a fake, never-matching '0000', and the worker's "ENTER OTP" button never
    // rendered at all (both are gated on this field being truthy) — the
    // worker could never close out a job paid this way. Guarantee it exists
    // here too, reusing whatever createBill may have already generated.
    const payOtp = booking.paymentOtp || Math.floor(1000 + Math.random() * 9000).toString();
    booking.paymentOtp = payOtp;
    booking.customerConfirmationOTP = payOtp;

    await booking.save();

    try {
      const bill = await VendorBill.findOne({ bookingId: booking._id });
      if (bill) {
        let payout = bill.vendorTotalEarning || 0;
        if (booking.isEstimateBased && booking.estimate?.tokenAmount) {
          payout = Math.max(0, payout - booking.estimate.tokenAmount);
        }
        // Tip goes 100% to the worker — no commission is taken on it,
        // unlike the base service fee above.
        const tipAmount = Number(booking.tipAmount) || 0;
        payout += tipAmount;
        const workerId = booking.workerId;

        if (payout > 0 && workerId) {
          const Worker = mongoose.model('Worker');
          const workerDoc = await Worker.findById(workerId);
          if (workerDoc) {
            workerDoc.wallet = workerDoc.wallet || {};
            workerDoc.wallet.balance = (workerDoc.wallet.balance || 0) + payout;
            workerDoc.wallet.earnings = (workerDoc.wallet.earnings || 0) + payout;
            await workerDoc.save();

            // Transaction.type only accepts 'credit'/'debit' — 'earnings_credit'
            // isn't a valid enum value, and `balanceAfter` is a required field
            // with no default. Every worker-earnings transaction created this
            // way has therefore always failed schema validation and never
            // actually saved (confirmed: 0 documents in the collection carry
            // type 'earnings_credit', despite workers holding real non-zero
            // wallet.earnings). The wallet balance above still updated fine —
            // only the transaction HISTORY entry for it was silently lost,
            // which is why a worker's transaction list never showed their
            // online-payment earnings.
            await Transaction.create({
              workerId,
              amount: payout,
              type: 'credit',
              category: 'booking_payment',
              balanceAfter: workerDoc.wallet.balance,
              status: 'completed',
              description: tipAmount > 0
                ? `Online Payment received for Booking #${booking.bookingNumber} (incl. ₹${tipAmount} tip)`
                : `Online Payment received for Booking #${booking.bookingNumber}`,
              reference: booking.bookingNumber,
            });
          }
        }

        const commission = bill.adminCommission || 0;
        if (commission > 0) {
          // Admin accounts live in the Admin collection, not User — this was
          // querying the wrong model and always got null, so admin has never
          // actually been credited via this path (the whole block is wrapped
          // in a try/catch, so it failed silently on every booking, forever).
          const AdminUser = Admin;
          const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
          if (adminUser) {
            let adminWallet = await Wallet.findOne({ role: 'admin' });
            if (!adminWallet) {
              adminWallet = await Wallet.create({ partnerId: adminUser._id, modelType: 'Admin', role: 'admin', balance: 0 });
            }
            await adminWallet.credit(commission, `Platform Fee for Booking #${booking.bookingNumber}`, booking.bookingNumber, 'commission_tax');
          }
        }
      }
    } catch (walletErr) {
      console.error('[settleBookingPayment] Worker/Admin wallet credit failed:', walletErr.message);
    }

    try {
      const io = getIO();
      if (io) {
        const userIdStr = String(booking.userId?._id || booking.userId);
        // bookingId MUST be stringified — JobDetails.jsx (and other
        // listeners) match this against the URL's :id param with `===`, and
        // a raw Mongoose ObjectId here compares unequal to that string, so
        // the event is silently ignored and the worker's screen never
        // reflects the payment (stuck showing whatever it had before,
        // including no "ENTER OTP" button) until they manually reload.
        io.to(`user_${userIdStr}`).emit('payment_success', {
          bookingId: String(booking._id), paymentStatus: 'paid', status: booking.status, paymentMethod: 'online', type: 'payment_success',
          customerConfirmationOTP: booking.customerConfirmationOTP, paymentOtp: booking.paymentOtp
        });
        io.to(`worker_${String(booking.workerId?._id || booking.workerId)}`).emit('payment_success', {
          bookingId: String(booking._id), paymentStatus: 'paid', status: booking.status, type: 'payment_success',
          customerConfirmationOTP: booking.customerConfirmationOTP, paymentOtp: booking.paymentOtp
        });
        // The customer's BookingTrack screen only listens for 'booking_updated'
        // (not 'payment_success'), same as the createBill/initiateOnlineCollection
        // paths — without this, the customer's OTP card never live-updates and
        // only shows the real OTP after a manual refresh.
        io.to(`user_${userIdStr}`).emit('booking_updated', {
          bookingId: String(booking._id), status: booking.status, paymentStatus: 'paid',
          customerConfirmationOTP: booking.customerConfirmationOTP, paymentOtp: booking.paymentOtp
        });
      }
    } catch (ioErr) {
      console.error('[settleBookingPayment] Socket emit failed:', ioErr.message);
    }
  } else {
    booking.paymentStatus = 'paid';
    booking.bookingStatus = 'confirmed';
    booking.paymentId = paymentId;
    booking.paymentMethod = 'razorpay';
    await booking.save();

    try {
      const fullBooking = await Booking.findById(booking._id).populate('propertyId');
      const partnerId = fullBooking.propertyId?.partnerId;
      if (partnerId) {
        let partnerWallet = await Wallet.findOne({ partnerId, role: 'partner' });
        if (!partnerWallet) {
          partnerWallet = await Wallet.create({ partnerId, role: 'partner', balance: 0 });
        }
        const payout = Number(notes.partnerPayout) || booking.partnerPayout || 0;
        if (payout > 0) {
          await partnerWallet.credit(payout, `Payment for Booking #${booking.bookingId}`, booking.bookingId, 'booking_payment');
        }
      }
    } catch (err) { console.error('[settleBookingPayment] Partner wallet credit failed:', err.message); }

    try {
      const commission = Number(notes.adminCommission) || booking.adminCommission || 0;
      const taxes = Number(notes.taxes) || booking.taxes || 0;
      const totalAdminCredit = commission + taxes;
      if (totalAdminCredit > 0) {
        const AdminUser = Admin;
        const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
        if (adminUser) {
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            adminWallet = await Wallet.create({ partnerId: adminUser._id, modelType: 'Admin', role: 'admin', balance: 0 });
          }
          await adminWallet.credit(totalAdminCredit, `Commission (₹${commission}) & Tax (₹${taxes}) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_tax');
        }
      }
    } catch (err) { console.error('[settleBookingPayment] Admin wallet credit failed:', err.message); }

    const populatedBooking = await Booking.findById(booking._id)
      .populate('propertyId')
      .populate('roomTypeId')
      .populate('userId', 'name email phone');

    try {
      const user = populatedBooking.userId;
      const property = populatedBooking.propertyId;
      if (user && user.email) {
        emailService.sendBookingConfirmationEmail(user, populatedBooking).catch(err => console.error('Email trigger failed:', err));
      }
      if (user) {
        notificationService.sendToUser(user._id, {
          title: 'Booking Confirmed!',
          body: `You are going to ${property?.name || 'Hotel'}.`
        }, { type: 'booking', bookingId: populatedBooking._id }, 'user').catch(err => console.error('User Push failed:', err));
      }
      if (property && property.partnerId) {
        notificationService.sendToUser(property.partnerId, {
          title: 'New Booking Alert!',
          body: `1 Night, ${populatedBooking.guests?.adults} Guests. Check App.`
        }, { type: 'new_booking', bookingId: populatedBooking._id }, 'partner').catch(err => console.error('Partner Push failed:', err));

        const PartnerModel = mongoose.model('Partner');
        const partnerUser = await PartnerModel.findById(property.partnerId);
        if (partnerUser && partnerUser.phone) {
          smsService.sendSMS(partnerUser.phone, `New Booking Alert! Booking #${populatedBooking.bookingId} at ${property.name}. Check App for details.`)
            .catch(err => console.error('Partner SMS failed:', err));
        }
      }
    } catch (notifErr) {
      console.error('[settleBookingPayment] Notification trigger failed:', notifErr.message);
    }

    if (populatedBooking.userId) {
      const uId = populatedBooking.userId._id || populatedBooking.userId;
      referralService.processBookingCompletion(uId, populatedBooking._id).catch(e => console.error('Referral Trigger Error (Online):', e));
    }

    booking = populatedBooking;
  }

  return { ok: true, alreadySettled: false, isHomeService, booking };
};

/**
 * @desc    Verify Razorpay payment signature
 * @route   POST /api/payments/verify
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, isEstimateToken } = req.body;

    // 1. Verify Signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', PaymentConfig.razorpayKeySecret)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    let booking;
    let isHomeService = false;

    if (bookingId) {
      if (mongoose.Types.ObjectId.isValid(bookingId)) {
        booking = await Booking.findById(bookingId);
        if (!booking) {
          booking = await HomeServiceBooking.findById(bookingId);
          if (booking) isHomeService = true;
        }
      }

      // Fallback for custom string IDs (e.g. BK...)
      if (!booking) {
        booking = await Booking.findOne({ bookingId: bookingId });
        if (!booking) {
          booking = await HomeServiceBooking.findOne({ bookingNumber: bookingId });
          if (booking) isHomeService = true;
        }
      }

      if (!booking) return res.status(404).json({ message: 'Booking not found' });

      if (isEstimateToken && isHomeService) {
        booking.estimate.status = 'APPROVED';
        booking.basePrice = booking.estimate.amount;
        booking.finalAmount = booking.estimate.amount;
        booking.userPayableAmount = booking.estimate.amount - booking.estimate.tokenAmount;
        booking.status = 'in_progress';
        
        await booking.save();
        
        // Use the commission already frozen onto the estimate at
        // generateEstimate time — recomputing "20% of total" here
        // independently (the old code) meant this could silently drift from
        // whatever rate the worker's estimate was actually generated under,
        // the moment PlatformSettings.defaultCommission changed in between.
        const adminCommission = booking.estimate.adminCommission ?? (booking.estimate.amount * 0.20);
        const workerPayout = booking.estimate.tokenAmount - adminCommission;
        
        try {
            if (workerPayout > 0 && booking.workerId) {
                const Worker = mongoose.model('Worker');
                const workerDoc = await Worker.findById(booking.workerId);
                if (workerDoc) {
                    workerDoc.wallet = workerDoc.wallet || {};
                    workerDoc.wallet.balance = (workerDoc.wallet.balance || 0) + workerPayout;
                    workerDoc.wallet.earnings = (workerDoc.wallet.earnings || 0) + workerPayout;
                    await workerDoc.save();
                    
                    // Same invalid-enum bug as the other earnings_credit call
                    // in this file — 'earnings_credit' isn't a valid
                    // Transaction.type and balanceAfter is required, so this
                    // create() has always thrown and been swallowed by the
                    // catch below. Token payments therefore updated the
                    // worker's wallet balance but never appeared in their
                    // transaction history either.
                    const Transaction = mongoose.model('Transaction');
                    await Transaction.create({
                        workerId: booking.workerId,
                        amount: workerPayout,
                        type: 'credit',
                        category: 'estimate_token',
                        balanceAfter: workerDoc.wallet.balance,
                        status: 'completed',
                        description: `Token Payment received for Booking #${booking.bookingNumber}`,
                        reference: booking.bookingNumber,
                    });
                }
            }
        } catch (walletErr) {
            console.error("Worker Wallet Credit Failed:", walletErr);
        }
        
        // Let socket know
        const io = req.app?.get('io');
        if (io) {
            io.to(`worker_${String(booking.workerId)}`).emit('booking_updated', {
                bookingId: String(booking._id),
                status: booking.status,
                estimateStatus: 'APPROVED'
            });
        }
        
        return res.json({ success: true, message: 'Token payment verified and estimate approved', booking });
      }

      // Everything that used to happen inline here (mark paid, credit
      // wallets, notify, refer) now lives in settleBookingPayment so the
      // webhook can run the exact same settlement when the browser never
      // makes it back to this endpoint. Delegating rather than duplicating
      // also means this path can no longer drift out of sync with the
      // webhook's version of "what does a paid booking look like".
      const settled = await settleBookingPayment(razorpay_order_id, razorpay_payment_id);
      if (!settled.ok) {
        return res.status(404).json({ message: settled.reason || 'Booking not found' });
      }
      return res.json({
        success: true,
        message: settled.alreadySettled ? 'Payment already verified' : 'Payment verified successfully',
        booking: settled.booking
      });

    } else {
      // --- NEW FLOW (Deferred Creation) ---
      // Fetch Order to retrieve Notes containing booking details
      const order = await razorpay.orders.fetch(razorpay_order_id);
      if (!order || !order.notes || order.notes.type !== 'booking_init') {
        // Fallback: If notes missing, we can't create booking properly.
        // But we have payment. This is a critical edge case.
        return res.status(400).json({ message: 'Order context missing. Cannot create booking.' });
      }

      const notes = order.notes;

      // Fetch Booking Property to get Type
      const property = await Property.findById(notes.propertyId).select('propertyType');
      const propertyType = property ? property.propertyType : 'Hotel';

      const newBookingId = 'BK' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      booking = await Booking.create({
        userId: notes.userId,
        bookingId: newBookingId,
        propertyId: notes.propertyId,
        propertyType: propertyType,
        roomTypeId: notes.roomTypeId,
        bookingUnit: notes.bookingUnit,
        checkInDate: notes.checkInDate,
        checkOutDate: notes.checkOutDate,
        totalNights: Number(notes.totalNights),
        guests: JSON.parse(notes.guests),
        pricePerNight: Number(notes.pricePerNight),
        baseAmount: Number(notes.baseAmount),
        extraCharges: Number(notes.extraCharges),
        taxes: Number(notes.taxes),
        discount: Number(notes.discount),
        couponCode: notes.couponCode || null,
        adminCommission: Number(notes.adminCommission),
        partnerPayout: Number(notes.partnerPayout),
        totalAmount: Number(notes.totalAmount),
        paymentStatus: 'paid', // Immediately Paid
        bookingStatus: 'confirmed',
        paymentMethod: 'online', // or 'razorpay'
        paymentId: razorpay_payment_id,
        amountPaid: Number(notes.totalAmount), // Full amount paid
        remainingAmount: 0 // Full amount paid
      });

      const walletUsedAmount = Number(notes.walletUsedAmount) || 0;
      // Debit User Wallet if used (Partial Online Payment)
      if (walletUsedAmount > 0) {
        const userWallet = await Wallet.findOne({ partnerId: notes.userId, role: 'user' });
        if (userWallet) {
          await userWallet.debit(walletUsedAmount, `Partial Wallet Payment for Booking #${newBookingId}`, newBookingId, 'booking_payment');
        }
      }

      // Ledger created in bookingController
      // await AvailabilityLedger.create({...});

      // Increment Offer Usage
      if (notes.couponCode) {
        await Offer.findOneAndUpdate({ code: notes.couponCode }, { $inc: { usageCount: 1 } });
      }
    }

    // --- PREPARE PAYMENT DATA FOR WALLET CREDIT ---
    if (!isHomeService) {
      // Extract financial details safely from either 'notes' (New Flow) or 'booking' (Legacy Flow)
      const paymentMeta = {};
      if (typeof notes !== 'undefined') {
        paymentMeta.partnerPayout = Number(notes.partnerPayout);
        paymentMeta.adminCommission = Number(notes.adminCommission);
        paymentMeta.taxes = Number(notes.taxes);
      } else if (booking) {
        paymentMeta.partnerPayout = booking.partnerPayout;
        paymentMeta.adminCommission = booking.adminCommission;
        paymentMeta.taxes = booking.taxes;
      }

      // --- PARTNER WALLET CREDIT LOGIC (Common) ---
      try {
        const fullBooking = await Booking.findById(booking._id).populate('propertyId');
        const partnerId = fullBooking.propertyId?.partnerId;

        if (partnerId) {
          let partnerWallet = await Wallet.findOne({ partnerId: partnerId, role: 'partner' });
          if (!partnerWallet) {
            partnerWallet = await Wallet.create({
              partnerId: partnerId,
              role: 'partner',
              balance: 0
            });
          }

          const payout = paymentMeta.partnerPayout || 0;

          if (payout > 0) {
            await partnerWallet.credit(payout, `Payment for Booking #${booking.bookingId}`, booking.bookingId, 'booking_payment');
            console.log(`[Payment] Credited ₹${payout} to Partner ${partnerId}`);
          }
        }
      } catch (err) { console.error("Wallet Credit Failed", err); }

      // --- ADMIN WALLET CREDIT LOGIC ---
      try {
        const commission = paymentMeta.adminCommission || 0;
        const taxes = paymentMeta.taxes || 0;
        const totalAdminCredit = commission + taxes;

        if (totalAdminCredit > 0) {
          // Admin accounts live in the Admin collection, not User — this was
          // querying the wrong model and always got null, so admin has never
          // actually been credited via this path (the whole block is wrapped
          // in a try/catch, so it failed silently on every booking, forever).
          const AdminUser = Admin;
          // Find *any* admin to associate the system wallet with (since Wallet requires a partnerId/userId)
          // In a real system, you'd have a specific "System User" or "Super Admin".
          const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });

          if (adminUser) {
            let adminWallet = await Wallet.findOne({ role: 'admin' });

            if (!adminWallet) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                modelType: 'Admin',
                role: 'admin',
                balance: 0
              });
            }

            // Credit the wallet (Commission + Tax)
            await adminWallet.credit(totalAdminCredit, `Commission (₹${commission}) & Tax (₹${taxes}) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_tax');
            console.log(`[Payment] Credited ₹${totalAdminCredit} (Comm: ${commission}, Tax: ${taxes}) to Admin Wallet`);
          } else {
            console.warn("⚠️ No Admin user found. Cannot credit commission/tax.");
          }
        }
      } catch (err) { console.error("Admin Wallet Credit Failed", err); }

      // Return full populated booking for confirmation page
      const populatedBooking = await Booking.findById(booking._id)
        .populate('propertyId')
        .populate('roomTypeId')
        .populate('userId', 'name email phone');

      // TRIGGER NOTIFICATIONS (ONLINE PAYMENT SUCCESS)
      try {
        const user = populatedBooking.userId;
        const property = populatedBooking.propertyId;

        // 1. User Email
        if (user && user.email) {
          emailService.sendBookingConfirmationEmail(user, populatedBooking).catch(err => console.error('Email trigger failed:', err));
        }

        // 2. User Push
        if (user) {
          notificationService.sendToUser(user._id, {
            title: 'Booking Confirmed!',
            body: `You are going to ${property.name || 'Hotel'}.`
          }, { type: 'booking', bookingId: populatedBooking._id }, 'user').catch(err => console.error('User Push failed:', err));
        }

        // 3. Partner Notifications
        if (property && property.partnerId) {
          // Push
          notificationService.sendToUser(property.partnerId, {
            title: 'New Booking Alert!',
            body: `1 Night, ${populatedBooking.guests.adults} Guests. Check App.`
          }, { type: 'new_booking', bookingId: populatedBooking._id }, 'partner').catch(err => console.error('Partner Push failed:', err));

          // SMS
          // Fetch partner user to get phone
          const PartnerModel = mongoose.model('Partner');
          const partnerUser = await PartnerModel.findById(property.partnerId);
          if (partnerUser && partnerUser.phone) {
            smsService.sendSMS(partnerUser.phone, `New Booking Alert! Booking #${populatedBooking.bookingId} at ${property.name}. Check App for details.`)
              .catch(err => console.error('Partner SMS failed:', err));
          }
        }
      } catch (notifErr) {
        console.error('Notification Trigger Custom Error:', notifErr);
      }

      // REFERRAL: Trigger Referral Reward
      if (populatedBooking.userId) {
        // userId might be an object or ID depending on population. Since we used populate('userId', 'name...'), it is an object.
        const uId = populatedBooking.userId._id || populatedBooking.userId;
        referralService.processBookingCompletion(uId, populatedBooking._id).catch(e => console.error('Referral Trigger Error (Online):', e));
      }

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        booking: populatedBooking
      });
    } else {
      // Home Service Booking response
      return res.json({
        success: true,
        message: 'Payment verified successfully',
        booking: booking
      });
    }
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
};

/**
 * @desc    Handle Razorpay webhook
 * @route   POST /api/payments/webhook
 * @access  Public (Razorpay)
 */
export const handleWebhook = async (req, res) => {
  try {
    const secret = PaymentConfig.razorpayKeySecret;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`📨 Webhook received: ${event}`);

    // Handle different events.
    //
    // These arms used to only log. That meant a customer who paid and then
    // closed the tab was charged and received nothing, because activation
    // depended entirely on the browser returning to /verify. Settlement is
    // idempotent, so whichever of the webhook and the browser arrives first
    // does the work and the other is a no-op.
    switch (event) {
      case 'payment.captured':
      case 'order.paid': {
        const entity = payload?.payment?.entity || payload?.order?.entity || {};
        const razorpayOrderId = entity.order_id || entity.id;
        const paymentId = payload?.payment?.entity?.id || null;

        console.log(`Payment captured: ${paymentId} (order ${razorpayOrderId})`);

        if (razorpayOrderId) {
          try {
            const result = await settleOrder(razorpayOrderId, {
              paymentId,
              settledVia: 'webhook',
            });
            if (result.ok && !result.alreadySettled) {
              console.log(`[Webhook] activated subscription ${result.subscription?.subscriptionId}`);
            } else if (!result.ok) {
              // Not a new-system order. Fetch it once and figure out which of
              // the other order types this is — legacy subscription, or an
              // ordinary booking payment. Every order carries a `type`/shape
              // in its notes that was written once at order-creation time, so
              // this never has to guess.
              const rzpOrder = await razorpay.orders.fetch(razorpayOrderId);

              if (rzpOrder?.notes?.type === 'subscription_purchase') {
                const legacy = await activateLegacySubscriptionFromWebhook(rzpOrder, paymentId);
                if (legacy.ok && !legacy.alreadySettled) {
                  console.log(`[Webhook] activated legacy subscription for account ${rzpOrder.notes.partnerId}`);
                } else if (!legacy.ok) {
                  console.error('[Webhook] legacy subscription activation failed:', legacy.reason);
                }
              } else if (rzpOrder?.notes?.bookingId) {
                // An ordinary home-service or property booking payment. This
                // is the fix for "payment completed but not updated" — until
                // now this branch didn't exist at all, so a browser that
                // never made it back to /verify left a captured payment with
                // the booking still unpaid, no matter what Razorpay's own
                // records said.
                const settled = await settleBookingPayment(razorpayOrderId, paymentId, rzpOrder);
                if (settled.ok && !settled.alreadySettled) {
                  console.log(`[Webhook] settled booking payment for ${settled.isHomeService ? 'home-service' : 'property'} booking ${settled.booking?._id}`);
                } else if (!settled.ok) {
                  console.error('[Webhook] booking settlement failed:', settled.reason);
                }
              }
            }
          } catch (err) {
            // Never fail the webhook on our own error — Razorpay would retry
            // and we would rather investigate from the log than churn.
            console.error('[Webhook] payment settlement failed:', err.message);
          }
        }
        break;
      }

      case 'payment.failed': {
        const entity = payload?.payment?.entity || {};
        console.log('Payment failed:', entity.id);
        if (entity.order_id) {
          await failOrder(entity.order_id, entity.error_description || 'Payment failed')
            .catch((err) => console.error('[Webhook] failOrder error:', err.message));
        }
        break;
      }

      default:
        console.log('Unhandled event:', event);
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * @desc    Get payment details
 * @route   GET /api/payments/:paymentId
 * @access  Private
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Get Payment Details Error:', error);
    res.status(500).json({ message: 'Failed to fetch payment details' });
  }
};

/**
 * @desc    Process refund
 * @route   POST /api/payments/refund/:bookingId
 * @access  Private
 */
export const processRefund = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { amount, reason } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.paymentStatus !== 'paid') return res.status(400).json({ message: 'Booking not paid' });
    const refundAmount = Math.round((amount || booking.totalAmount) * 100);
    const paymentId = booking.paymentId;
    if (!paymentId) return res.status(400).json({ message: 'Payment ID not found on booking' });
    const refund = await razorpay.payments.refund(paymentId, {
      amount: refundAmount,
      notes: { reason, bookingId: booking._id.toString() }
    });
    booking.paymentStatus = 'refunded';
    booking.bookingStatus = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    await AvailabilityLedger.deleteMany({
      source: 'platform',
      referenceId: booking._id
    });
    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Process Refund Error:', error);
    res.status(500).json({ message: 'Refund processing failed', error: error.message });
  }
};
