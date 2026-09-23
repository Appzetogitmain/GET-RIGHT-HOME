import PlatformSettings from '../models/PlatformSettings.js';
import Worker from '../models/Worker.js';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import User from '../models/User.js';
import VendorBill from '../models/VendorBill.js';
import { createNotification } from './notificationControllers/notificationController.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { safeRegex } from '../utils/escapeRegex.js';

import Zone from '../models/Zone.js';
import WorkerSubscriptionPlan from '../models/WorkerSubscriptionPlan.js';

// Buckets the raw BOOKING_STATUS values into the groups the admin dashboard
// cards show. "Manual Assignment Required" is the status this dashboard exists
// to surface — bookings where no worker auto-accepted and admin must step in.
const JOB_STATUS_BUCKETS = {
  pending: [BOOKING_STATUS.PENDING, BOOKING_STATUS.SEARCHING],
  // MANUAL_ASSIGNMENT_REQUIRED is the current value; no_workers/no_vendors are
  // the legacy ones existing rows still carry and mean exactly the same thing.
  manualAssignmentRequired: [
    BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
    BOOKING_STATUS.NO_WORKERS,
    BOOKING_STATUS.NO_VENDORS
  ],
  inProgress: [
    BOOKING_STATUS.ASSIGNED, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.JOURNEY_STARTED, BOOKING_STATUS.VISITED, BOOKING_STATUS.ESTIMATE_PROVIDED,
    BOOKING_STATUS.ESTIMATE_ACCEPTED, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.WORK_DONE,
    BOOKING_STATUS.AWAITING_PAYMENT
  ],
  completed: [BOOKING_STATUS.COMPLETED],
  cancelled: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED]
};

export const getAllWorkers = async (req, res) => {
  try {
    const { search, approvalStatus, zoneId, zone } = req.query;
    const query = {};

    if (search) {
      const regex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { businessName: regex },
        { serviceCategories: regex }
      ];
    }

    if (approvalStatus && approvalStatus !== 'all') {
      if (approvalStatus === 'pending_skills') {
        query['pendingServiceCategories.0'] = { $exists: true };
      } else if (approvalStatus === 'signup_only') {
        query.approvalStatus = 'pending';
      } else {
        query.approvalStatus = approvalStatus;
      }
    }

    if (zoneId && zoneId !== 'all') {
      query.zoneIds = zoneId;
    } else if (zone && zone !== 'all') {
      query.zones = { $regex: zone, $options: 'i' };
    }

    const [workers, allZones, totalCount, pendingCount, approvedCount, rejectedCount, pendingSkillsCount] = await Promise.all([
      Worker.find(query)
        .populate('zoneIds', 'name status')
        .populate('subscription.planId', 'title price durationDays features')
        .sort({ createdAt: -1 })
        .lean(),
      Zone.find().select('_id name status').sort({ name: 1 }).lean(),
      Worker.countDocuments(),
      Worker.countDocuments({ approvalStatus: 'pending' }),
      Worker.countDocuments({ approvalStatus: 'approved' }),
      Worker.countDocuments({ approvalStatus: 'rejected' }),
      Worker.countDocuments({ 'pendingServiceCategories.0': { $exists: true } })
    ]);

    // Build Zone summary counts
    const allWorkersForZoneCount = await Worker.find().select('zoneIds zones').lean();
    const zonesSummary = [
      { id: 'all', name: 'All Zones', count: totalCount },
      ...allZones.map(z => {
        const c = allWorkersForZoneCount.filter(w => {
          const hasId = w.zoneIds && w.zoneIds.some(zid => String(zid) === String(z._id));
          const hasName = w.zones && w.zones.some(zName => zName && zName.toLowerCase() === z.name.toLowerCase());
          return hasId || hasName;
        }).length;
        return {
          id: String(z._id),
          name: z.name,
          count: c
        };
      })
    ];

    // Compute formatted subscription details and days left
    const now = new Date();
    const formattedWorkers = workers.map(w => {
      let daysLeft = 0;
      let planTitle = 'NO PLAN';
      let isPlanActive = false;

      if (w.subscription) {
        if (w.subscription.planId && w.subscription.planId.title) {
          planTitle = w.subscription.planId.title;
        } else if (w.subscription.planTitle) {
          planTitle = w.subscription.planTitle;
        }
        if (w.subscription.expiryDate) {
          const diffMs = new Date(w.subscription.expiryDate).getTime() - now.getTime();
          daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isPlanActive = diffMs > 0 && w.subscription.isActive !== false;
        }
      }

      return {
        ...w,
        subscription: {
          ...w.subscription,
          planTitle,
          daysLeft,
          isActive: isPlanActive
        }
      };
    });

    res.json({
      success: true,
      data: formattedWorkers,
      counts: {
        total: totalCount,
        pending: pendingCount,
        signupOnly: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        pendingSkills: pendingSkillsCount
      },
      zonesSummary,
      zones: allZones
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      businessName,
      serviceCategories,
      zoneIds,
      zones,
      approvalStatus,
      isActive,
      isOnline,
      mcqLevel,
      experienceYears,
      vendorType,
      gstin,
      profilePhoto,
      nameOnAadhar,
      aadharNumber,
      panNumber,
      documents,
      otherDocuments
    } = req.body;

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (name !== undefined) worker.name = name;
    if (phone !== undefined) worker.phone = phone;
    if (email !== undefined) worker.email = email || null;
    if (businessName !== undefined) worker.businessName = businessName;
    if (mcqLevel !== undefined) worker.mcqLevel = mcqLevel;
    if (experienceYears !== undefined) worker.experienceYears = Number(experienceYears) || 0;
    if (isActive !== undefined) worker.isActive = Boolean(isActive);
    if (isOnline !== undefined) worker.isOnline = Boolean(isOnline);
    if (vendorType !== undefined) worker.vendorType = vendorType;
    if (gstin !== undefined) worker.gstin = gstin;
    if (profilePhoto !== undefined) worker.profilePhoto = profilePhoto;

    // Aadhar Card
    if (!worker.aadhar) worker.aadhar = {};
    if (nameOnAadhar !== undefined) worker.aadhar.nameOnAadhar = nameOnAadhar;
    if (aadharNumber !== undefined) worker.aadhar.number = aadharNumber;
    if (documents?.aadhar !== undefined) worker.aadhar.document = documents.aadhar;
    if (documents?.aadharBack !== undefined) worker.aadhar.backDocument = documents.aadharBack;

    // PAN Card
    if (!worker.panCard) worker.panCard = {};
    if (panNumber !== undefined) worker.panCard.number = panNumber;
    if (documents?.pan !== undefined) worker.panCard.document = documents.pan;

    // Driving License
    if (!worker.drivingLicense) worker.drivingLicense = {};
    if (documents?.drivingLicense !== undefined) worker.drivingLicense.document = documents.drivingLicense;

    // Other documents
    if (Array.isArray(otherDocuments)) {
      worker.otherDocuments = otherDocuments;
    } else if (documents?.other1 !== undefined || documents?.other2 !== undefined) {
      const others = [documents?.other1, documents?.other2].filter(Boolean);
      if (others.length > 0) worker.otherDocuments = others;
    }

    if (Array.isArray(serviceCategories)) {
      worker.serviceCategories = serviceCategories;
    }

    // Handle zones
    if (Array.isArray(zoneIds)) {
      worker.zoneIds = zoneIds;
      const foundZones = await Zone.find({ _id: { $in: zoneIds } }).select('name');
      worker.zones = foundZones.map(z => z.name);
    } else if (Array.isArray(zones)) {
      worker.zones = zones;
    }

    if (approvalStatus && ['pending', 'approved', 'rejected', 'suspended'].includes(approvalStatus)) {
      worker.approvalStatus = approvalStatus;
      if (approvalStatus === 'approved' && worker.pendingServiceCategories?.length > 0) {
        worker.serviceCategories = Array.from(new Set([...(worker.serviceCategories || []), ...worker.pendingServiceCategories]));
        worker.pendingServiceCategories = [];
      }
    }

    await worker.save();

    const updatedWorker = await Worker.findById(id)
      .populate('zoneIds', 'name status')
      .populate('subscription.planId', 'title price durationDays features');

    res.json({
      success: true,
      message: 'Worker updated successfully',
      data: updatedWorker
    });
  } catch (error) {
    console.error('Update worker error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignWorkerPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, durationDays = 30, customPlanTitle } = req.body;

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    let plan = null;
    let daysToAdd = Number(durationDays) || 30;

    if (planId) {
      plan = await WorkerSubscriptionPlan.findById(planId);
      if (plan && plan.durationDays) {
        daysToAdd = Number(durationDays) || plan.durationDays;
      }
    }

    const now = new Date();
    // If worker already has an active subscription, extend from existing expiry date
    const currentExpiry = (worker.subscription?.expiryDate && new Date(worker.subscription.expiryDate) > now)
      ? new Date(worker.subscription.expiryDate)
      : now;

    const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    worker.subscription = {
      isActive: true,
      planId: plan ? plan._id : (worker.subscription?.planId || null),
      startDate: worker.subscription?.startDate || now,
      expiryDate: newExpiry,
      transactionId: `ADMIN_${Date.now()}`
    };

    await worker.save();

    const updated = await Worker.findById(id)
      .populate('zoneIds', 'name status')
      .populate('subscription.planId', 'title price durationDays features');

    res.json({
      success: true,
      message: `Subscription plan ${plan?.title || customPlanTitle || ''} updated successfully until ${newExpiry.toLocaleDateString()}`,
      data: updated
    });
  } catch (error) {
    console.error('Assign plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createWorkerByAdmin = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      businessName,
      password = 'Worker@123',
      serviceCategories = [],
      zoneIds = [],
      approvalStatus = 'approved'
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const existing = await Worker.findOne({ phone });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A worker with this phone number already exists' });
    }

    // Lookup zones
    let zoneNames = [];
    if (zoneIds && zoneIds.length > 0) {
      const foundZones = await Zone.find({ _id: { $in: zoneIds } }).select('name');
      zoneNames = foundZones.map(z => z.name);
    }

    const newWorker = await Worker.create({
      name,
      phone,
      email: email || null,
      businessName: businessName || name,
      password,
      serviceCategories,
      zoneIds,
      zones: zoneNames,
      approvalStatus,
      isActive: true,
      isOnline: false
    });

    res.status(201).json({
      success: true,
      message: 'Worker registered successfully by Admin',
      data: newWorker
    });
  } catch (error) {
    console.error('Create worker error:', error);
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
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    worker.approvalStatus = 'approved';
    // If worker had pending categories during initial registration, approve them now
    if (worker.pendingServiceCategories && worker.pendingServiceCategories.length > 0) {
      const existing = worker.serviceCategories || [];
      worker.serviceCategories = Array.from(new Set([...existing, ...worker.pendingServiceCategories]));
      worker.pendingServiceCategories = [];
    }
    await worker.save();

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
    const { status, search, startDate, endDate, bookingType } = req.query;

    const query = {};

    if (bookingType && bookingType !== 'all') {
      query.bookingType = bookingType.toLowerCase();
    }

    if (status) {
      // Frontend sends the raw BOOKING_STATUS value (lowercase, e.g. "no_workers").
      const requested = status.toLowerCase();

      // "Manual assignment required" is one queue spread over three status
      // values (the current one plus two legacy ones existing rows still use),
      // so filtering on any of them must return the whole queue — otherwise
      // ops silently misses bookings depending on when they were created.
      const manualBucket = JOB_STATUS_BUCKETS.manualAssignmentRequired;
      if (manualBucket.includes(requested)) {
        // A booking can need manual assignment while its booking status is
        // still `searching`: the ops escalation timer fires before the
        // automatic waves finish, so the two run in parallel. Match on either.
        query.$or = [
          { status: { $in: manualBucket } },
          { assignmentStatus: 'manual_assignment_required' }
        ];
      } else {
        query.status = requested;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (search) {
      const searchRegex = safeRegex(search);
      const users = await User.find({
        $or: [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }]
      }).select('_id');

      const matchingWorkers = await Worker.find({
        $or: [{ name: searchRegex }, { phone: searchRegex }]
      }).select('_id');

      query.$or = [
        { bookingNumber: searchRegex },
        { userId: { $in: users.map(u => u._id) } },
        { workerId: { $in: matchingWorkers.map(w => w._id) } }
      ];
    }

    const [total, jobs, statsAgg, escalatedNotYetTerminal, instantCount, scheduledCount] = await Promise.all([
      HomeServiceBooking.countDocuments(query),
      HomeServiceBooking.find(query, null, { allowDiskUse: true })
        .populate('userId', 'name email phone')
        .populate('workerId', 'name email phone profilePhoto rating')
        .populate('vendorId', 'name businessName phone email profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HomeServiceBooking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Escalated bookings whose booking status is still `searching` — they
      // belong in the manual-assignment count but a status-only group misses
      // them entirely, so the ops card would under-report the real queue.
      HomeServiceBooking.countDocuments({
        assignmentStatus: 'manual_assignment_required',
        status: { $nin: JOB_STATUS_BUCKETS.manualAssignmentRequired }
      }),
      HomeServiceBooking.countDocuments({ bookingType: 'instant' }),
      HomeServiceBooking.countDocuments({ bookingType: 'scheduled' })
    ]);

    const countByStatus = Object.fromEntries(statsAgg.map(s => [s._id, s.count]));
    const bucketCount = (statuses) => statuses.reduce((sum, s) => sum + (countByStatus[s] || 0), 0);
    const stats = {
      pending: bucketCount(JOB_STATUS_BUCKETS.pending),
      manualAssignmentRequired: bucketCount(JOB_STATUS_BUCKETS.manualAssignmentRequired) + escalatedNotYetTerminal,
      inProgress: bucketCount(JOB_STATUS_BUCKETS.inProgress),
      completed: bucketCount(JOB_STATUS_BUCKETS.completed),
      cancelled: bucketCount(JOB_STATUS_BUCKETS.cancelled),
      instant: instantCount,
      scheduled: scheduledCount,
      total: statsAgg.reduce((sum, s) => sum + s.count, 0)
    };

    res.json({ success: true, data: jobs, total, page, limit, stats });
  } catch (error) {
    console.error("GET ALL JOBS ERROR:", error);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await HomeServiceBooking.findById(id)
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone email address profilePhoto')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug')
      .populate('workerId', 'name phone rating totalJobs location profilePhoto')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const bill = await VendorBill.findOne({ bookingId: booking._id });
    if (bill) {
      booking.bill = bill;
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("GET JOB BY ID ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
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

let cachedWorkerAnalytics = null;
let lastWorkerAnalyticsFetch = 0;
const WORKER_ANALYTICS_CACHE_TTL = 30 * 1000;

export const getWorkerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const now = Date.now();
    const hasDateFilter = !!(startDate && endDate);

    if (!hasDateFilter && cachedWorkerAnalytics && (now - lastWorkerAnalyticsFetch < WORKER_ANALYTICS_CACHE_TTL) && !req.query.fresh) {
      return res.json(cachedWorkerAnalytics);
    }

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [
      totalWorkers,
      pendingWorkers,
      approvedWorkers,
      activeJobs,
      completedJobs,
      topWorkers,
      availabilityDistribution,
      revenueAgg,
      recentBookings
    ] = await Promise.all([
      Worker.countDocuments(dateFilter),
      Worker.countDocuments({ ...dateFilter, approvalStatus: 'pending' }),
      Worker.countDocuments({ ...dateFilter, approvalStatus: 'approved' }),
      HomeServiceBooking.countDocuments({ ...dateFilter, status: { $in: ['pending', 'confirmed', 'in_progress', 'assigned'] } }),
      HomeServiceBooking.countDocuments({ ...dateFilter, status: 'completed' }),
      HomeServiceBooking.aggregate([
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
      ]),
      Worker.aggregate([
        { $match: { approvalStatus: 'approved' } },
        { $group: { _id: '$isOnline', count: { $sum: 1 } } }
      ]),
      VendorBill.aggregate([
        { $match: { ...dateFilter, status: 'paid' } },
        { $group: { _id: null, companyRevenue: { $sum: '$companyRevenue' }, adminCommission: { $sum: '$adminCommission' } } }
      ]),
      HomeServiceBooking.find(dateFilter)
        .select('serviceName status createdAt totalAmount address bookingNumber')
        .populate('userId', 'name email phone')
        .populate('workerId', 'name phone')
        .populate('vendorId', 'businessName')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const totalRevenue = revenueAgg.length > 0 ? ((revenueAgg[0].companyRevenue || 0) + (revenueAgg[0].adminCommission || 0)) : 0;

    const mappedBookings = recentBookings.map(b => ({
      ...b,
      serviceType: b.serviceName
    }));

    const responsePayload = {
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
    };

    if (!hasDateFilter) {
      cachedWorkerAnalytics = responsePayload;
      lastWorkerAnalyticsFetch = Date.now();
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Get Worker Analytics Error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    booking.acceptedAt = new Date();
    booking.assignedAt = new Date();
    booking.assignmentStatus = 'assigned';
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

/**
 * Approve worker pending skill(s)
 */
export const approveWorkerSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const categoriesToApprove = Array.isArray(category) ? category : [category];

    if (!Array.isArray(worker.serviceCategories)) worker.serviceCategories = [];
    if (!Array.isArray(worker.pendingServiceCategories)) worker.pendingServiceCategories = [];

    const approvedList = [];
    for (const cat of categoriesToApprove) {
      const trimmed = typeof cat === 'string' ? cat.trim() : '';
      if (!trimmed) continue;

      // Remove from pending
      worker.pendingServiceCategories = worker.pendingServiceCategories.filter(
        c => c.trim().toLowerCase() !== trimmed.toLowerCase()
      );

      // Add to verified if not already present
      const alreadyHas = worker.serviceCategories.some(
        c => c.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyHas) {
        worker.serviceCategories.push(trimmed);
        approvedList.push(trimmed);
      }

      // Update skillRequests & verifiedSkillsDetails metadata
      if (Array.isArray(worker.skillRequests)) {
        const reqItem = worker.skillRequests.find(
          r => r.category && r.category.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (reqItem) {
          reqItem.status = 'approved';
          reqItem.reviewedAt = new Date();

          if (!Array.isArray(worker.verifiedSkillsDetails)) worker.verifiedSkillsDetails = [];
          const vIdx = worker.verifiedSkillsDetails.findIndex(
            v => v.category && v.category.trim().toLowerCase() === trimmed.toLowerCase()
          );
          if (vIdx >= 0) {
            worker.verifiedSkillsDetails[vIdx].experienceYears = reqItem.experienceYears || 0;
            worker.verifiedSkillsDetails[vIdx].experienceLetter = reqItem.experienceLetter || null;
            worker.verifiedSkillsDetails[vIdx].approvedAt = new Date();
          } else {
            worker.verifiedSkillsDetails.push({
              category: trimmed,
              experienceYears: reqItem.experienceYears || 0,
              experienceLetter: reqItem.experienceLetter || null,
              approvedAt: new Date()
            });
          }
        }
      }
    }

    await worker.save();

    // Notify Worker
    if (approvedList.length > 0) {
      await createNotification({
        userId: worker._id,
        workerId: worker._id,
        type: 'skill_approved',
        title: 'Skill Verified! 🎉',
        message: `Your skill(s) "${approvedList.join(', ')}" have been verified by admin. You can now receive job requests for these categories!`,
        relatedId: worker._id,
        relatedType: 'worker',
        priority: 'high',
        pushData: { type: 'skill_approved', link: '/worker/profile' }
      }).catch(e => console.error('Skill approved notification error:', e));
    }

    res.json({
      success: true,
      message: `Skill(s) "${categoriesToApprove.join(', ')}" approved successfully`,
      worker
    });
  } catch (error) {
    console.error('Approve worker skill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject worker pending skill(s)
 */
export const rejectWorkerSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, reason } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const categoriesToReject = Array.isArray(category) ? category : [category];

    if (!Array.isArray(worker.pendingServiceCategories)) worker.pendingServiceCategories = [];
    if (!Array.isArray(worker.rejectedServiceCategories)) worker.rejectedServiceCategories = [];

    for (const cat of categoriesToReject) {
      const trimmed = typeof cat === 'string' ? cat.trim() : '';
      if (!trimmed) continue;

      worker.pendingServiceCategories = worker.pendingServiceCategories.filter(
        c => c.trim().toLowerCase() !== trimmed.toLowerCase()
      );

      worker.rejectedServiceCategories.push({
        category: trimmed,
        reason: reason || 'Not approved by admin',
        rejectedAt: new Date()
      });

      if (Array.isArray(worker.skillRequests)) {
        const reqItem = worker.skillRequests.find(
          r => r.category && r.category.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (reqItem) {
          reqItem.status = 'rejected';
          reqItem.reviewedAt = new Date();
        }
      }
    }

    await worker.save();

    // Notify Worker
    await createNotification({
      userId: worker._id,
      workerId: worker._id,
      type: 'skill_rejected',
      title: 'Skill Verification Update',
      message: `Your request for skill "${categoriesToReject.join(', ')}" was rejected${reason ? `: ${reason}` : '.'}`,
      relatedId: worker._id,
      relatedType: 'worker',
      priority: 'normal',
      pushData: { type: 'skill_rejected', link: '/worker/profile' }
    }).catch(e => console.error('Skill rejected notification error:', e));

    res.json({
      success: true,
      message: `Skill(s) "${categoriesToReject.join(', ')}" rejected`,
      worker
    });
  } catch (error) {
    console.error('Reject worker skill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove an existing verified skill from worker
 */
export const removeWorkerSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const trimmed = typeof category === 'string' ? category.trim() : '';
    worker.serviceCategories = (worker.serviceCategories || []).filter(
      c => c.trim().toLowerCase() !== trimmed.toLowerCase()
    );

    await worker.save();

    res.json({
      success: true,
      message: `Skill "${trimmed}" removed successfully`,
      worker
    });
  } catch (error) {
    console.error('Remove worker skill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

