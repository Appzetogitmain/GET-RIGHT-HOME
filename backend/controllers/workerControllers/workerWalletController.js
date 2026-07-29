import Worker from '../../models/Worker.js';
import Transaction from '../../models/Transaction.js';
import HomeServiceBooking from '../../models/HomeServiceBooking.js';
import {  sendPushNotification  } from '../../services/firebaseAdmin.js';
import {  createNotification  } from '../notificationControllers/notificationController.js';
import Withdrawal from '../../models/Withdrawal.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../../config/payment.config.js';

// Initialize Razorpay
let razorpay;
try {
  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: PaymentConfig.razorpayKeyId,
      key_secret: PaymentConfig.razorpayKeySecret
    });
  }
} catch (err) {
  console.error("Razorpay Init Failed:", err.message);
}

/**
 * Get worker wallet with ledger balance
 */
const getWallet = async (req, res) => {
  try {
    const workerId = req.user.id;
    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // List of bookings pending payment
    const pendingBookings = await HomeServiceBooking.find({
      workerId: workerId,
      status: 'completed', // Only completed jobs
      workerPaymentStatus: 'PENDING'
    })
      .select('bookingNumber serviceName completedAt vendorId finalAmount vendorBillId')
      .sort({ completedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        balance: worker.wallet?.balance || 0,
        dues: worker.wallet?.dues || 0,
        earnings: worker.wallet?.earnings || 0,
        totalWithdrawn: worker.wallet?.totalWithdrawn || 0,
        totalCashCollected: worker.wallet?.totalCashCollected || 0,
        pendingBookings: pendingBookings
      }
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet info' });
  }
};

/**
 * Get worker transactions
 */
const getTransactions = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const query = { workerId };

    // Filter by type if provided
    if (type && type !== 'all') {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

/**
 * Request payout from vendor for a specific booking
 */
const requestPayout = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { bookingId } = req.body;
    const worker = await Worker.findById(workerId);

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const booking = await HomeServiceBooking.findOne({
      _id: bookingId,
      workerId: workerId,
      status: 'completed',
      workerPaymentStatus: 'PENDING'
    }).populate('vendorId'); // Ensure vendor is populated to access tokens

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or already paid' });
    }

    if (!booking.vendorId) {
      return res.status(400).json({ success: false, message: 'No vendor associated with this booking' });

    }

    const vendor = booking.vendorId;
    const message = `Worker ${worker.name} has requested payment for Booking #${booking.bookingNumber}.`;
    const title = '💸 Payout Request';

    // Use createNotification helper for proper notification delivery
    try {
      await createNotification({
        userId: vendor._id,
        userType: 'partner',
        type: 'payout_requested',
        title: title,
        body: message,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high',
        data: {
          type: 'payout_requested',
          bookingId: booking._id.toString(),
          link: `/vendor/booking/${booking._id}`
        }
      });
    } catch (notifErr) {
      console.error('Failed to notify vendor:', notifErr);
    }

    res.status(200).json({ success: true, message: 'Payment request sent to vendor' });

  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ success: false, message: 'Failed to send payout request' });
  }
};


/**
 * Request withdrawal of entire wallet balance to admin
 */
const requestWithdrawal = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { amount, bankDetails } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    if (worker.wallet.balance < withdrawAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Check for existing pending withdrawal
    const existingPending = await Withdrawal.findOne({ 
      workerId, 
      status: 'pending' 
    });
    
    if (existingPending) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a pending withdrawal request' 
      });
    }

    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      workerId,
      amount: withdrawAmount,
      bankDetails: bankDetails || worker.bankDetails, // Use provided or saved bank details
      status: 'pending',
      requestDate: new Date()
    });

    // Deduct from worker balance
    worker.wallet.balance -= withdrawAmount;
    await worker.save();

    // Notify Admin (fetch super_admin or admin to get a userId if needed)
    try {
      const Admin = (await import('../../models/Admin.js')).default;
      const adminUser = await Admin.findOne({ role: { $in: ['superadmin', 'super_admin', 'admin'] } });
      
      if (adminUser) {
        await createNotification({
          userId: adminUser._id,
          userType: 'admin',
          type: 'withdrawal_requested',
          title: '💰 New Withdrawal Request',
          body: `Worker ${worker.name} has requested a withdrawal of ₹${withdrawAmount}.`,
          relatedId: withdrawal._id,
          relatedType: 'withdrawal',
          priority: 'high'
        });
      }

      // Notify Worker
      await createNotification({
        workerId: worker._id,
        type: 'withdrawal_requested',
        title: 'Withdrawal Requested',
        message: `Your withdrawal request for ₹${withdrawAmount} has been submitted successfully.`,
        relatedId: withdrawal._id,
        relatedType: 'withdrawal',
        priority: 'high',
        pushData: { type: 'withdrawal', withdrawalId: withdrawal._id.toString(), link: '/worker/wallet' }
      });
    } catch (notifErr) {
      console.error('Failed to notify admin:', notifErr);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Withdrawal request submitted successfully',
      data: withdrawal
    });

  } catch (error) {
    console.error('Request withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit withdrawal request' });
  }
};

/**
 * Initiate payment to clear admin dues
 */
const payAdminDuesInitiate = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { amount } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    if (!razorpay) {
       return res.status(500).json({ success: false, message: 'Payment gateway not initialized' });
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      notes: {
        workerId: worker._id.toString(),
        type: 'clear_dues'
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: PaymentConfig.razorpayKeyId
      }
    });

  } catch (error) {
    console.error('Pay admin dues initiate error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
};

/**
 * Verify payment for admin dues
 */
const payAdminDuesVerify = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', PaymentConfig.razorpayKeySecret)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const paidAmount = Number(amount);

    // Reduce dues
    worker.wallet.dues = Math.max(0, (worker.wallet.dues || 0) - paidAmount);
    await worker.save();

    // Create a transaction record
    await Transaction.create({
      workerId: worker._id,
      amount: paidAmount,
      type: 'debit',
      category: 'adjustment',
      balanceAfter: worker.wallet.balance || 0,
      status: 'completed',
      description: 'Paid admin dues for cash collections',
      reference: razorpay_payment_id
    });

    res.json({
      success: true,
      message: 'Dues paid successfully',
      newDues: worker.wallet.dues
    });

  } catch (error) {
    console.error('Pay admin dues verify error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

export { 
  getWallet,
  getTransactions,
  requestPayout,
  requestWithdrawal,
  payAdminDuesInitiate,
  payAdminDuesVerify
};
