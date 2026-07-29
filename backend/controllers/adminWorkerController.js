import PlatformSettings from '../models/PlatformSettings.js';
import Worker from '../models/Worker.js';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import { createNotification } from './notificationControllers/notificationController.js';
import { BOOKING_STATUS } from '../utils/constants.js';

export const getAllWorkers = async (req, res) => {
  try {
    const { search, approvalStatus } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (approvalStatus && approvalStatus !== 'all') {
      query.approvalStatus = approvalStatus;
    }

    const workers = await Worker.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkerDetails = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved' },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    // Process Referral Bonus
    if (worker.referredBy && !worker.referralBonusCredited) {
      const platformSettings = await PlatformSettings.getSettings();
      const bonusReferrer = platformSettings.workerReferralBonusReferrer || 0;
      const bonusReferee = platformSettings.workerReferralBonusReferee || 0;

      if (bonusReferrer > 0 || bonusReferee > 0) {
        const referrer = await Worker.findById(worker.referredBy);
        
        if (referrer) {
          // 1. Credit Referrer
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
              userId: referrer._id,
              type: 'wallet_credit',
              title: 'Referral Bonus! 🎉',
              message: `You received ₹${bonusReferrer} for referring ${worker.name}.`,
              relatedId: referrer._id,
              relatedType: 'wallet',
              priority: 'high'
            }).catch(e => console.error(e));
          }

          // 2. Credit Referee (New Worker)
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
              userId: worker._id,
              type: 'wallet_credit',
              title: 'Welcome Bonus! 🎉',
              message: `You received ₹${bonusReferee} referral bonus for joining via ${referrer.name}.`,
              relatedId: worker._id,
              relatedType: 'wallet',
              priority: 'high'
            }).catch(e => console.error(e));
          }
        }
        
        // Mark as credited
        worker.referralBonusCredited = true;
        await worker.save();
      }
    }

    res.json({ success: true, message: 'Worker approved successfully', worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'rejected' },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Worker rejected successfully', worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const suspendWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'suspended' },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Worker suspended successfully', worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: `Worker ${isActive ? 'activated' : 'deactivated'} successfully`, worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkerJobs = async (req, res) => {
  try {
    const jobs = await HomeServiceBooking.find({ workerId: req.params.id })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await HomeServiceBooking.countDocuments({});

    const jobs = await HomeServiceBooking.find({}, null, { allowDiskUse: true })
      .populate('userId', 'name email phone')
      .populate('workerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ success: true, data: jobs, total, page, limit });
  } catch (error) {
    console.error("GET ALL JOBS ERROR:", error);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

export const getWorkerEarnings = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    const transactions = await Transaction.find({ workerId: req.params.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        balance: worker.wallet?.balance || 0,
        earnings: worker.wallet?.earnings || 0,
        totalWithdrawn: worker.wallet?.totalWithdrawn || 0,
        transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const payWorker = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    worker.wallet = worker.wallet || { balance: 0, earnings: 0, totalWithdrawn: 0 };
    worker.wallet.balance = Math.max(0, worker.wallet.balance - amount);
    worker.wallet.totalWithdrawn = (worker.wallet.totalWithdrawn || 0) + amount;
    await worker.save();

    // Create payout transaction
    await Transaction.create({
      workerId: worker._id,
      amount,
      type: 'debit',
      category: 'withdrawal',
      balanceAfter: worker.wallet.balance,
      status: 'completed',
      description: notes || 'Payout from Admin'
    });

    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const totalWorkers = await Worker.countDocuments(dateFilter);
    const pendingWorkers = await Worker.countDocuments({ ...dateFilter, approvalStatus: 'pending' });
    const approvedWorkers = await Worker.countDocuments({ ...dateFilter, approvalStatus: 'approved' });

    // Status can be multiple depending on definition of active/pending
    const activeJobs = await HomeServiceBooking.countDocuments({ ...dateFilter, status: { $in: ['pending', 'confirmed', 'in_progress', 'assigned'] } });
    const completedJobs = await HomeServiceBooking.countDocuments({ ...dateFilter, status: 'completed' });

    // Top 5 workers by completed jobs (using dateFilter for completion date if possible, but createdAt is fine)
    const topWorkers = await HomeServiceBooking.aggregate([
      { $match: { ...dateFilter, status: 'completed', workerId: { $exists: true, $ne: null } } },
      { $group: { _id: '$workerId', completedJobs: { $sum: 1 } } },
      { $sort: { completedJobs: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'workers',
          localField: '_id',
          foreignField: '_id',
          as: 'workerInfo'
        }
      },
      { $unwind: '$workerInfo' },
      {
        $project: {
          name: '$workerInfo.name',
          completedJobs: 1
        }
      }
    ]);

    // Worker availability distribution
    const availabilityDistribution = await Worker.aggregate([
      { $match: { approvalStatus: 'approved' } },
      { $group: { _id: '$isOnline', count: { $sum: 1 } } }
    ]);

    // Import VendorBill at top implicitly or explicitly, assume it's available or we can use mongoose.model
    const mongoose = await import('mongoose');
    const VendorBill = mongoose.model('VendorBill');

    const revenueAgg = await VendorBill.aggregate([
      { $match: { ...dateFilter, status: 'paid' } },
      { $group: { _id: null, companyRevenue: { $sum: '$companyRevenue' }, adminCommission: { $sum: '$adminCommission' } } }
    ]);

    // total revenue is the sum of companyRevenue (vendors) and adminCommission (workers)
    const totalRevenue = revenueAgg.length > 0 ? (revenueAgg[0].companyRevenue + revenueAgg[0].adminCommission) : 0;

    // Fetch recent bookings for the charts (limit to 100 to prevent large payloads)
    const recentBookings = await HomeServiceBooking.find(dateFilter)
      .populate('userId', 'name email phone')
      .populate('workerId', 'name phone')
      .populate('vendorId', 'businessName')
      .sort({ createdAt: -1 })
      .limit(100);

    // Some charts expect serviceType instead of serviceName, let's map it safely on the fly or let the frontend handle it if it matches
    const mappedBookings = recentBookings.map(b => ({
      ...b.toObject(),
      serviceType: b.serviceName // Map serviceName to serviceType for TopServices compatibility
    }));

    res.json({
      success: true,
      data: {
        totalWorkers,
        pendingWorkers,
        approvedWorkers,
        activeJobs,
        completedJobs,
        topWorkers,
        availabilityDistribution,
        totalRevenue,
        recentBookings: mappedBookings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.stack });
  }
};


export const getWorkerPayments = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: 'withdrawal' })
      .populate('workerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// WITHDRAWAL REQUESTS MANAGEMENT
// ==========================================

export const getWorkerWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { workerId: { $exists: true } };

    if (status && status !== 'all') {
      query.status = status;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate('workerId', 'name phone email wallet')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveWorkerWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { utrNumber, remarks } = req.body || {};

    const withdrawal = await Withdrawal.findById(id).populate('workerId');
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot approve ${withdrawal.status} withdrawal` });
    }

    // Mark withdrawal as completed
    const updatedWithdrawal = await Withdrawal.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'completed',
          processingDetails: {
            ...withdrawal.processingDetails,
            completedAt: new Date(),
            processedAt: new Date(),
            utrNumber,
            remarks
          }
        }
      },
      { new: true }
    );

    // Update worker's total withdrawn
    if (withdrawal.workerId && withdrawal.workerId._id) {
      const worker = withdrawal.workerId;
      await Worker.findByIdAndUpdate(
        worker._id,
        {
          $inc: { 'wallet.totalWithdrawn': withdrawal.amount }
        }
      );

      // Create transaction record
      await Transaction.create({
        workerId: worker._id,
        amount: withdrawal.amount,
        type: 'debit',
        category: 'withdrawal',
        balanceAfter: worker.wallet ? worker.wallet.balance : 0,
        status: 'completed',
        description: remarks || `Withdrawal Approved (UTR: ${utrNumber || 'N/A'})`
      });

      // Notify Worker
      await createNotification({
        workerId: worker._id,
        type: 'withdrawal_approved',
        title: 'Withdrawal Approved ✅',
        message: `Your withdrawal request for ₹${withdrawal.amount} has been approved. UTR: ${utrNumber || 'N/A'}`,
        relatedId: withdrawal._id,
        relatedType: 'withdrawal',
        priority: 'high',
        pushData: { type: 'withdrawal', withdrawalId: withdrawal._id.toString(), link: '/worker/wallet' }
      });
    }

    res.json({ success: true, message: 'Withdrawal approved successfully', data: updatedWithdrawal });
  } catch (error) {
    console.error('Approve Withdrawal Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export const rejectWorkerWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body || {};

    const withdrawal = await Withdrawal.findById(id).populate('workerId');
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject ${withdrawal.status} withdrawal` });
    }

    // Mark as rejected
    const updatedWithdrawal = await Withdrawal.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'failed',
          processingDetails: {
            ...withdrawal.processingDetails,
            failedAt: new Date(),
            processedAt: new Date(),
            remarks: remarks || 'Rejected by admin'
          }
        }
      },
      { new: true }
    );

    // Refund the amount back to worker's balance!
    if (withdrawal.workerId && withdrawal.workerId._id) {
      const worker = withdrawal.workerId;
      await Worker.findByIdAndUpdate(
        worker._id,
        {
          $inc: { 'wallet.balance': withdrawal.amount }
        }
      );

      // Notify Worker
      await createNotification({
        workerId: worker._id,
        type: 'withdrawal_rejected',
        title: 'Withdrawal Rejected ❌',
        message: `Your withdrawal request for ₹${withdrawal.amount} was rejected. Amount has been refunded.`,
        relatedId: withdrawal._id,
        relatedType: 'withdrawal',
        priority: 'high',
        pushData: { type: 'withdrawal', withdrawalId: withdrawal._id.toString(), link: '/worker/wallet' }
      });
    }

    res.json({ success: true, message: 'Withdrawal rejected and amount refunded', data: updatedWithdrawal });
  } catch (error) {
    console.error('Reject Withdrawal Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export const assignWorkerToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    const booking = await HomeServiceBooking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    if (booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, message: `Cannot assign worker, booking is already ${booking.status}` });
    }

    booking.status = BOOKING_STATUS.ASSIGNED;
    booking.workerId = worker._id;
    booking.workerAcceptedAt = new Date();
    booking.workerResponse = 'ADMIN_ASSIGNED';
    
    await booking.save();

    // Notify User
    await createNotification({
      userId: booking.userId,
      type: 'worker_assigned',
      title: 'Worker Assigned',
      message: `Admin has assigned ${worker.name} for your booking #${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'worker_assigned', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    });

    // Notify Worker
    await createNotification({
      workerId: worker._id,
      type: 'job_assigned',
      title: 'New Job Assigned',
      message: 'Admin has manually assigned a new job to you.',
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'new_job', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_accepted', {
        bookingId: booking._id,
        status: booking.status,
        worker: { id: worker._id, name: worker.name, phone: worker.phone }
      });
      io.to(`worker_${worker._id}`).emit('new_job_alert', {
        type: 'job_assigned',
        bookingId: booking._id,
        message: 'Admin assigned a new job to you.'
      });
    }

    res.json({ success: true, message: 'Worker successfully assigned to booking', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
