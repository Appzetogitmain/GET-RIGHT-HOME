import PlatformSettings from '../models/PlatformSettings.js';
import Settings from '../models/Settings.js';
import Worker from '../models/Worker.js';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import User from '../models/User.js';
import VendorBill from '../models/VendorBill.js';
import { createNotification } from './notificationControllers/notificationController.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { findWorkerIneligibility } from '../services/locationService.js';
import { computeSplit, splitConfig } from '../utils/settlement.js';
import { creditedAdvance } from '../utils/vipAndAdvance.js';
import { safeRegex } from '../utils/escapeRegex.js';
import { findWorkerConflict, findWorkerUnavailability, getBufferMinutes, describeConflict } from '../utils/slotAvailability.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';
import { getIO } from '../sockets.js';
import { claimWorkerCapacity, findWorkerActiveJob, isImmediateBooking, syncWorkerCapacityStatus } from '../services/workerCapacityService.js';
import { directAssign, reassignSlotBooking } from '../services/bookingDispatchService.js';
import { normalizeBookingModes, supportsBookingMode } from '../utils/bookingModes.js';

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

    const isFiltered = Boolean(search || (approvalStatus && approvalStatus !== 'all') || (zoneId && zoneId !== 'all') || (zone && zone !== 'all'));

    const [workers, allZones, metaWorkers] = await Promise.all([
      Worker.find(query)
        .select('-aadhar.document -aadhar.backDocument -panCard.document -drivingLicense.document -documents -otherDocuments')
        .populate('zoneIds', 'name status')
        .populate('subscription.planId', 'title price durationDays features')
        .sort({ createdAt: -1 })
        .lean(),
      Zone.find().select('_id name status').sort({ name: 1 }).lean(),
      isFiltered ? Worker.find().select('approvalStatus pendingServiceCategories zoneIds zones').lean() : Promise.resolve(null)
    ]);

    // Build counts and zone summary from memory
    const sourceForCounts = metaWorkers || workers;
    const totalCount = sourceForCounts.length;
    const pendingCount = sourceForCounts.filter(w => w.approvalStatus === 'pending').length;
    const approvedCount = sourceForCounts.filter(w => w.approvalStatus === 'approved').length;
    const rejectedCount = sourceForCounts.filter(w => w.approvalStatus === 'rejected').length;
    const pendingSkillsCount = sourceForCounts.filter(w => w.pendingServiceCategories && w.pendingServiceCategories.length > 0).length;

    const zonesSummary = [
      { id: 'all', name: 'All Zones', count: totalCount },
      ...allZones.map(z => {
        const c = sourceForCounts.filter(w => {
          const hasId = w.zoneIds && w.zoneIds.some(zid => String(zid?._id || zid) === String(z._id));
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
      professionIds,
      bookingModes,
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
    if (Array.isArray(professionIds)) worker.professionIds = professionIds;
    if (bookingModes !== undefined) worker.bookingModes = normalizeBookingModes(bookingModes);

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
      professionIds = [],
      bookingModes = ['slot'],
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
      professionIds: Array.isArray(professionIds) ? professionIds : [],
      bookingModes: normalizeBookingModes(bookingModes),
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
    const worker = await Worker.findById(req.params.id)
      .populate('zoneIds', 'name status')
      .populate('subscription.planId', 'title price durationDays features')
      .lean();
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    // Sent once under `data`: the same worker also under `worker` doubled a payload that
    // carries multi-MB document scans (the admin page reads `res.data || res.worker`).
    res.json({ success: true, data: worker });
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

    await createNotification({
      workerId: worker._id,
      type: 'account_approved',
      title: 'Account Approved',
      message: 'Your expert account has been approved. You can now go online and receive orders.',
      relatedId: worker._id,
      relatedType: 'worker',
      priority: 'high',
      pushData: { type: 'account_approved', link: '/worker/dashboard' }
    }).catch((error) => console.error('Worker approval notification failed:', error));

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
    await createNotification({
      workerId: worker._id,
      type: 'account_rejected',
      title: 'Account Verification Update',
      message: 'Your expert account verification was not approved. Please contact support for details.',
      relatedId: worker._id,
      relatedType: 'worker',
      priority: 'high',
      pushData: { type: 'account_rejected', link: '/worker/support' }
    }).catch((error) => console.error('Worker rejection notification failed:', error));
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
    await createNotification({
      workerId: worker._id,
      type: 'account_suspended',
      title: 'Account Suspended',
      message: 'Your expert account has been suspended. Please contact support for assistance.',
      relatedId: worker._id,
      relatedType: 'worker',
      priority: 'high',
      pushData: { type: 'account_suspended', link: '/worker/support' }
    }).catch((error) => console.error('Worker suspension notification failed:', error));
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
    await createNotification({
      workerId: worker._id,
      type: isActive ? 'account_activated' : 'account_deactivated',
      title: isActive ? 'Account Activated' : 'Account Deactivated',
      message: isActive
        ? 'Your expert account has been activated.'
        : 'Your expert account has been deactivated. Please contact support for assistance.',
      relatedId: worker._id,
      relatedType: 'worker',
      priority: 'high',
      pushData: { type: isActive ? 'account_activated' : 'account_deactivated', link: '/worker/support' }
    }).catch((error) => console.error('Worker status notification failed:', error));
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
        .select('+helpers +helperRequests')
        .populate('userId', 'name email phone')
        .populate('workerId', 'name email phone profilePhoto rating')
        .populate('adminAssignedWorkerId', 'name phone profilePhoto rating')
        .populate('helpers.workerId', 'name phone profilePhoto')
        .populate('helperRequests.requestedBy', 'name phone')
        .populate('vendorId', 'name businessName phone email profilePhoto')
        .populate('zoneId', 'name status')
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

    jobs.forEach(job => {
      if (!job.zoneName) {
        job.zoneName = job.zoneId?.name || job.address?.city || null;
      }
    });

    res.json({ success: true, data: jobs, total, page, limit, stats });
  } catch (error) {
    console.error("GET ALL JOBS ERROR:", error);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

/**
 * Money picture of one booking for the admin: what the customer paid, and who gets
 * what. Uses the split frozen on the bill when there is one, otherwise an estimate
 * from today's settings (flagged `estimated`).
 */
const buildBookingFinancials = async (booking, bill) => {
  const n = (v) => Number(v) || 0;
  const r = (v) => Math.round(n(v) * 100) / 100;
  const platform = await PlatformSettings.getSettings();

  const discounts = { offer: n(booking.discount), promo: n(booking.promoDiscount), vip: n(booking.vipDiscount) };
  const totalDiscount = discounts.offer + discounts.promo + discounts.vip;
  const settlement = bill?.settlement || computeSplit({
    price: n(booking.basePrice),
    discount: totalDiscount,
    config: splitConfig(platform, booking.isEstimateBased ? 0 : booking.moverDetails?.commissionPercent)
  });

  const extras = bill ? {
    services: r(n(bill.totalServiceValue) + n(bill.totalServiceGST)),
    parts: r(n(bill.totalPartsValue) + n(bill.totalPartsGST)),
    transport: r(bill.transportCharges)
  } : { services: 0, parts: 0, transport: 0 };
  // grandTotal = worker's base + base GST + everything the worker added, so it is the
  // reliable total even for older bills whose per-type fields were never filled in.
  const extrasFromBill = bill ? Math.max(0, n(bill.grandTotal) - n(bill.originalServiceBase) - n(bill.originalGST)) : 0;
  const extrasTotal = r(Math.max(extras.services + extras.parts + extras.transport, extrasFromBill));
  const tip = n(booking.tipAmount);

  const billTotal = n(bill?.finalOnlineAmount) || n(booking.finalOnlineAmount) || n(booking.finalAmount);
  const paidOnline = n(booking.advancePaid);
  const isPaid = ['paid', 'collected_by_vendor', 'plan_covered'].includes(booking.paymentStatus);
  const credited = creditedAdvance(booking);

  return {
    estimated: !bill?.settlement,
    customer: {
      servicePrice: r(booking.basePrice),
      discounts,
      totalDiscount: r(totalDiscount),
      extras,
      tax: r(booking.tax),
      visitingCharges: r(booking.visitingCharges),
      tip: r(tip),
      billTotal: r(billTotal),
      advancePaid: r(paidOnline),
      balanceDue: isPaid ? 0 : r(Math.max(0, billTotal - credited)),
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod
    },
    settlement,
    admin: {
      share: settlement.adminShare,
      discountFromAdmin: settlement.discountFromAdmin,
      gst: settlement.gst,
      netProfit: settlement.adminNet,
      platformCommission: settlement.platformCommission,
      totalIncome: settlement.adminTotalIncome
    },
    worker: {
      share: settlement.workerShare,
      sgst: settlement.sgst,
      cgst: settlement.cgst,
      platformCommission: settlement.platformCommission,
      netForService: settlement.workerNet,
      extras: extrasTotal,
      tip: r(tip),
      totalEarning: r(settlement.workerNet + extrasTotal + tip)
    },
    taxesPayable: settlement.taxesPayable
  };
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
      .populate('zoneId', 'name status')
      // Work photos are base64 (MBs); the admin detail page doesn't need them inline.
      .select('-workPhotos')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.zoneName) {
      booking.zoneName = booking.zoneId?.name || booking.address?.city || null;
    }

    const bill = await VendorBill.findOne({ bookingId: booking._id }).lean();
    if (bill) {
      booking.bill = bill;
    }

    booking.financials = await buildBookingFinancials(booking, bill);

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
      // Money actually collected from customers: the full bill once paid, or
      // just the advance while the booking is only partially paid. This used
      // to sum VendorBill platform earnings, which only exist after a bill is
      // raised, so an advance/instant payment never showed up.
      HomeServiceBooking.aggregate([
        { $match: { ...dateFilter, status: { $ne: BOOKING_STATUS.CANCELLED }, paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIAL] } } },
        { $group: { _id: null, collected: { $sum: { $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$finalAmount', '$advancePaid'] } } } }
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

    const totalRevenue = revenueAgg[0]?.collected || 0;

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
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: withdrawals.map((w) => ({
        ...w,
        utrNumber: w.processingDetails?.utrNumber || null,
        rejectionReason: w.status === 'failed' ? (w.processingDetails?.remarks || null) : null
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Withdrawal flow: pending (worker asked) -> processing (admin approved, paying) ->
// completed (admin paid and recorded the UTR) | failed (rejected, amount refunded).
const notifyWorker = (workerId, type, title, message, withdrawalId) => createNotification({
  workerId,
  type,
  title,
  message,
  relatedId: withdrawalId,
  relatedType: 'withdrawal',
  priority: 'high',
  pushData: { type: 'withdrawal', withdrawalId: String(withdrawalId), link: '/worker/wallet' }
}).catch((err) => console.error('Withdrawal notification failed:', err.message));

/** Step 1: admin accepts the request and will pay it. Nothing is marked paid yet. */
export const approveWorkerWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'processing', 'processingDetails.initiatedAt': new Date() } },
      { new: true }
    );
    if (!withdrawal) {
      const existing = await Withdrawal.findById(req.params.id).select('status');
      return res.status(existing ? 400 : 404).json({
        success: false,
        message: existing ? `Cannot approve a ${existing.status} withdrawal` : 'Withdrawal request not found'
      });
    }
    await Transaction.updateOne(
      { reference: String(withdrawal._id), category: 'withdrawal' },
      { $set: { status: 'processing', description: 'Withdrawal approved - admin is paying you' } }
    );
    await notifyWorker(withdrawal.workerId, 'withdrawal_approved', 'Withdrawal Approved ✅',
      `Your withdrawal of ₹${withdrawal.amount} is approved. The money will be sent to you shortly.`, withdrawal._id);
    res.json({ success: true, message: 'Approved. Pay the worker, then mark it as paid with the UTR.', data: withdrawal });
  } catch (error) {
    console.error('Approve Withdrawal Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/** Step 2: admin has actually paid the worker. A UTR / reference is mandatory. */
export const completeWorkerWithdrawal = async (req, res) => {
  try {
    const utrNumber = String(req.body?.utrNumber || '').trim();
    const remarks = String(req.body?.remarks || '').trim();
    if (utrNumber.length < 6) {
      return res.status(400).json({ success: false, message: 'Enter the UTR / transaction reference of the payment you made (at least 6 characters).' });
    }

    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'processing' },
      {
        $set: {
          status: 'completed',
          'processingDetails.utrNumber': utrNumber,
          'processingDetails.remarks': remarks || undefined,
          'processingDetails.processedAt': new Date(),
          'processingDetails.completedAt': new Date()
        }
      },
      { new: true }
    );
    if (!withdrawal) {
      const existing = await Withdrawal.findById(req.params.id).select('status');
      return res.status(existing ? 400 : 404).json({
        success: false,
        message: !existing ? 'Withdrawal request not found'
          : existing.status === 'pending' ? 'Approve the request first, then mark it paid.'
            : `This withdrawal is already ${existing.status}.`
      });
    }

    await Worker.updateOne({ _id: withdrawal.workerId }, { $inc: { 'wallet.totalWithdrawn': withdrawal.amount } });
    await Transaction.updateOne(
      { reference: String(withdrawal._id), category: 'withdrawal' },
      { $set: { status: 'completed', description: `Withdrawal paid (UTR: ${utrNumber})`, 'metadata.bankTransferUTR': utrNumber } }
    );
    await notifyWorker(withdrawal.workerId, 'withdrawal_completed', 'Withdrawal Paid 💸',
      `₹${withdrawal.amount} has been sent to you. UTR: ${utrNumber}`, withdrawal._id);
    res.json({ success: true, message: 'Marked as paid', data: withdrawal });
  } catch (error) {
    console.error('Complete Withdrawal Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

/** Admin declines (before or while paying). The held amount goes back to the wallet. */
export const rejectWorkerWithdrawal = async (req, res) => {
  try {
    const reason = String(req.body?.reason || req.body?.remarks || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }

    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'processing'] } },
      { $set: { status: 'failed', 'processingDetails.failedAt': new Date(), 'processingDetails.processedAt': new Date(), 'processingDetails.remarks': reason } },
      { new: true }
    );
    if (!withdrawal) {
      const existing = await Withdrawal.findById(req.params.id).select('status');
      return res.status(existing ? 400 : 404).json({
        success: false,
        message: existing ? `Cannot reject a ${existing.status} withdrawal` : 'Withdrawal request not found'
      });
    }

    const refunded = await Worker.findByIdAndUpdate(
      withdrawal.workerId,
      { $inc: { 'wallet.balance': withdrawal.amount } },
      { new: true }
    ).select('wallet.balance');
    await Transaction.updateOne(
      { reference: String(withdrawal._id), category: 'withdrawal' },
      { $set: { status: 'cancelled', description: `Withdrawal rejected: ${reason}` } }
    );
    await Transaction.create({
      workerId: withdrawal.workerId,
      type: 'credit',
      category: 'refund',
      amount: withdrawal.amount,
      balanceAfter: refunded?.wallet?.balance ?? 0,
      status: 'completed',
      reference: String(withdrawal._id),
      description: 'Withdrawal rejected - amount returned to your wallet',
      metadata: { withdrawalId: String(withdrawal._id) }
    });
    await notifyWorker(withdrawal.workerId, 'withdrawal_rejected', 'Withdrawal Rejected ❌',
      `Your withdrawal of ₹${withdrawal.amount} was rejected: ${reason}. The amount is back in your wallet.`, withdrawal._id);
    res.json({ success: true, message: 'Withdrawal rejected and amount refunded', data: withdrawal });
  } catch (error) {
    console.error('Reject Withdrawal Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

const ADMIN_ASSIGN_RESPONSE_SECONDS = 60;

export const assignWorkerToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    // `override` lets the admin knowingly assign a worker outside the booking's
    // zone / profession / booking-type rules — the usual reason a booking is in
    // the manual queue is that nobody inside those rules was available.
    const { workerId, override } = req.body;

    const booking = await HomeServiceBooking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    const ineligible = !override && await findWorkerIneligibility(worker, booking);
    if (ineligible) {
      return res.status(409).json({ success: false, code: 'WORKER_NOT_ELIGIBLE', message: ineligible });
    }

    const bookingMode = booking.bookingType === 'instant' ? 'instant' : 'slot';
    if (!override && !supportsBookingMode(worker, bookingMode)) {
      return res.status(409).json({
        success: false,
        code: 'WORKER_BOOKING_MODE_NOT_ALLOWED',
        message: `${worker.name} is not enabled for ${bookingMode === 'instant' ? 'Instant' : 'Slot'} bookings.`
      });
    }

    if (booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, message: `Cannot assign worker, booking is already ${booking.status}` });
    }
    if (booking.advanceStatus === 'awaiting') {
      return res.status(400).json({ success: false, message: 'The customer has not paid the advance yet, so this booking cannot be assigned.' });
    }

    // Day-off / leave / nearby-job warnings are advisory for the admin: with
    // `override` they are acknowledged and the assignment goes ahead. A worker
    // who is mid-job (capacity claim below) still can't be double-assigned.
    const unavailableMsg = !override && await findWorkerUnavailability(worker._id, booking);
    if (unavailableMsg) {
      return res.status(409).json({ success: false, code: 'WORKER_UNAVAILABLE', message: unavailableMsg.replace('you have', 'the worker has').replace('you are', 'the worker is') });
    }
    const conflict = !override && await findWorkerConflict(worker._id, booking);
    if (conflict) {
      return res.status(409).json({
        success: false,
        code: 'SLOT_CONFLICT',
        message: describeConflict(conflict, await getBufferMinutes())
      });
    }

    // The worker is only *offered* the job here. They become busy / assigned
    // when they accept, so a worker already holding another job can't be offered
    // a second one.
    const activeJob = await isImmediateBooking(booking) ? await findWorkerActiveJob(worker._id, booking._id) : null;
    if (activeJob) {
      return res.status(409).json({
        success: false,
        code: 'WORKER_BUSY',
        message: `${worker.name} is busy with booking #${activeJob.bookingNumber}.`
      });
    }

    const previousWorkerId = booking.workerId;

    // Slot bookings are given straight to the worker: no offer, no accept popup.
    // They see it in their jobs, and can still reject it with a reason.
    if (booking.bookingType !== 'instant') {
      if (previousWorkerId && String(previousWorkerId) === String(worker._id)) {
        return res.status(400).json({ success: false, message: `${worker.name} is already assigned to this booking.` });
      }
      if (previousWorkerId) {
        // Take it back from the current worker first.
        booking.workerId = null;
        booking.status = BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED;
        booking.assignmentStatus = 'manual_assignment_required';
        await booking.save();
        await syncWorkerCapacityStatus(previousWorkerId);
        const ioPrev = req.app.get('io') || getIO();
        ioPrev?.to(`worker_${previousWorkerId}`).emit('job_cancelled', {
          bookingId: booking._id.toString(),
          message: `Booking #${booking.bookingNumber} has been reassigned by admin`
        });
        createNotification({
          workerId: previousWorkerId,
          type: 'job_reassigned',
          title: 'Job Reassigned',
          message: `Booking #${booking.bookingNumber} has been given to another professional.`,
          relatedId: booking._id,
          relatedType: 'booking',
          priority: 'high'
        }).catch(() => {});
      }
      const assigned = await directAssign(booking._id, worker._id, { mode: 'admin', adminId: req.user.id });
      if (!assigned) {
        return res.status(409).json({ success: false, code: 'WORKER_BUSY', message: `${worker.name} could not be assigned right now (busy or the booking changed).` });
      }
      getIO()?.to('admin_room').emit('offline_request_updated', {});
      return res.json({ success: true, message: `Assigned to ${worker.name}.`, data: assigned });
    }

    // Withdraw any offer still open to other workers; this one replaces them.
    await BookingRequest.updateMany(
      { bookingId: booking._id, workerId: { $ne: worker._id }, status: 'PENDING' },
      { $set: { status: 'EXPIRED', respondedAt: new Date() } }
    );
    const platformSettings = await PlatformSettings.getSettings();
    // A direct admin assignment is a one-to-one ask, so the worker gets a short,
    // fixed window; if it lapses the booking returns to the manual queue.
    const responseWindowSec = ADMIN_ASSIGN_RESPONSE_SECONDS;
    const commissionPct = platformSettings?.defaultCommission ?? 10;
    await BookingRequest.findOneAndUpdate(
      { bookingId: booking._id, workerId: worker._id },
      {
        $set: {
          status: 'PENDING',
          wave: 0,
          sentAt: new Date(),
          respondedAt: null,
          // Long-lived: this is a direct admin assignment, not a timed broadcast.
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    booking.workerId = null;
    booking.status = BOOKING_STATUS.SEARCHING;
    booking.assignmentStatus = 'awaiting_worker';
    booking.adminAssignedWorkerId = worker._id;
    booking.workerResponse = 'ADMIN_ASSIGNED';
    booking.waveStartedAt = null;
    booking.currentWave = 0;
    booking.workerAcceptedAt = null;
    booking.acceptedAt = null;
    booking.assignedAt = null;
    // New worker → fresh pre-job reminder cycle.
    booking.reminderSentAt = null;
    booking.reminderConfirmedAt = null;
    booking.reminderEscalatedAt = null;
    await booking.save();

    if (previousWorkerId && String(previousWorkerId) !== String(worker._id)) {
      await syncWorkerCapacityStatus(previousWorkerId);
    }

    const populated = await HomeServiceBooking.findById(booking._id).populate('userId', 'name phone');

    // Ask the worker (push + in-app + live popup)
    await createNotification({
      workerId: worker._id,
      type: 'job_assigned',
      title: 'New Job Assigned to You',
      message: `Admin has assigned booking #${booking.bookingNumber} (${booking.serviceName}) to you. Please accept to confirm.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'new_job', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
    });

    // Customer is told a professional is being confirmed — not yet assigned.
    await createNotification({
      userId: booking.userId,
      type: 'assignment_pending',
      title: 'Professional Being Confirmed',
      message: `We have requested ${worker.name} for your booking #${booking.bookingNumber}. You will be notified once they confirm.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: { type: 'assignment_pending', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    });

    const io = req.app.get('io') || getIO();
    if (io) {
      io.to(`worker_${worker._id}`).emit('new_booking_request', {
        bookingId: booking._id,
        serviceName: booking.serviceName,
        customerName: populated?.userId?.name,
        customerPhone: populated?.userId?.phone,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        price: booking.finalAmount || booking.basePrice,
        totalAmount: booking.finalAmount || booking.basePrice,
        workerAmount: Math.max(0, parseFloat((((booking.basePrice || 0) * (100 - (booking.moverDetails?.commissionPercent ?? commissionPct))) / 100).toFixed(2))),
        address: booking.address,
        serviceCategory: booking.serviceCategory,
        brandName: booking.brandName,
        brandIcon: booking.brandIcon,
        categoryIcon: booking.categoryIcon,
        bookedItems: booking.bookedItems,
        requirementText: booking.requirementText,
        isConsultancyRequest: booking.isConsultancyRequest,
        isEstimateBased: booking.isEstimateBased,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + responseWindowSec * 1000).toISOString(),
        respondBySeconds: responseWindowSec,
        responseWindowSeconds: responseWindowSec,
        assignedByAdmin: true,
        playSound: true,
        message: 'Admin assigned you a booking'
      });
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: booking.status,
        assignmentStatus: 'awaiting_worker',
        message: 'We are confirming a professional for your booking.'
      });
    }

    res.json({ success: true, message: `Booking offered to ${worker.name}. It will show as accepted once they confirm.`, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin cancels a booking on the customer's behalf. Cancelling is the admin's
 * call, so no cancellation fee is charged; a prepaid (wallet/online) booking is
 * refunded in full to the customer's wallet.
 */
export const adminCancelBooking = async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Please provide a cancellation reason.' });

    const booking = await HomeServiceBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed booking' });
    }

    const isPaid = [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PLAN_COVERED].includes(booking.paymentStatus);
    const isPrepaid = ['wallet', 'razorpay', 'upi', 'card'].includes(booking.paymentMethod);
    let refundAmount = 0;
    if (isPaid && isPrepaid && booking.finalAmount > 0) {
      const user = await User.findById(booking.userId);
      if (user) {
        refundAmount = booking.finalAmount;
        user.wallet.balance = (user.wallet.balance || 0) + refundAmount;
        await user.save();
        await Transaction.create({
          userId: user._id,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          paymentMethod: 'wallet',
          description: `Refund for booking #${booking.bookingNumber} (cancelled by admin)`,
          bookingId: booking._id,
          balanceAfter: user.wallet.balance
        });
        booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
      }
    }

    const previousWorkerId = booking.workerId;
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'admin';
    booking.cancellationReason = reason;
    booking.waveStartedAt = null;
    await booking.save();

    const io = getIO();
    const pending = await BookingRequest.find({ bookingId: booking._id, status: 'PENDING' }).select('workerId').lean();
    await BookingRequest.updateMany({ bookingId: booking._id, status: 'PENDING' }, { $set: { status: 'CANCELLED' } });
    for (const request of pending) {
      io?.to(`worker_${request.workerId}`).emit('job_cancelled', {
        bookingId: booking._id.toString(),
        message: 'Booking cancelled by admin'
      });
    }

    if (previousWorkerId) {
      const capacity = await syncWorkerCapacityStatus(previousWorkerId);
      io?.to(`worker_${previousWorkerId}`).emit('job_cancelled', {
        bookingId: booking._id.toString(),
        message: 'Booking cancelled by admin'
      });
      io?.to(`worker_${previousWorkerId}`).emit('worker_capacity_changed', {
        status: capacity?.status,
        isBusy: capacity?.isBusy || false,
        reason: 'booking_cancelled'
      });
      await createNotification({
        workerId: previousWorkerId,
        type: 'booking_cancelled',
        title: 'Job Cancelled',
        message: `Booking #${booking.bookingNumber} was cancelled by admin. Reason: ${reason}`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      });
    }

    io?.to(`user_${booking.userId}`).emit('booking_updated', {
      bookingId: booking._id,
      status: booking.status,
      message: 'Your booking was cancelled by the admin.'
    });
    await createNotification({
      userId: booking.userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `Your booking #${booking.bookingNumber} was cancelled by admin. Reason: ${reason}.${refundAmount > 0 ? ` ₹${refundAmount} has been refunded to your wallet.` : ''}`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: { type: 'booking_cancelled', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    });

    res.json({
      success: true,
      message: refundAmount > 0 ? `Booking cancelled. ₹${refundAmount} refunded to the customer's wallet.` : 'Booking cancelled.',
      data: booking
    });
  } catch (error) {
    console.error('Admin cancel booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Take a booking away from its current worker (e.g. one who ignored the
 * pre-job reminder) and offer it to every other eligible worker again.
 * The search restarts exactly like a brand-new booking, minus the worker being
 * replaced; if nobody takes it, it falls back to the manual-assignment queue.
 */
export const rebroadcastBooking = async (req, res) => {
  try {
    const booking = await HomeServiceBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const rebroadcastable = [
      BOOKING_STATUS.SEARCHING,
      BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED,
      BOOKING_STATUS.NO_WORKERS,
      BOOKING_STATUS.NO_VENDORS,
      BOOKING_STATUS.ASSIGNED,
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.ACCEPTED
    ];
    if (!rebroadcastable.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot re-broadcast a booking that is ${booking.status}`
      });
    }

    const previousWorkerId = booking.workerId;
    const reason = (req.body?.reason || '').trim() ||
      (booking.reminderEscalatedAt ? 'Did not confirm the pre-job reminder' : 'Removed by admin');

    if (previousWorkerId) {
      booking.assignmentAttempts = booking.assignmentAttempts || [];
      const attempt = booking.assignmentAttempts.find(
        (a) => String(a.workerId) === String(previousWorkerId) && !['cancelled_by_worker', 'unconfirmed'].includes(a.outcome)
      );
      if (attempt) {
        attempt.outcome = 'unconfirmed';
        attempt.respondedAt = new Date();
        attempt.reason = reason;
      } else {
        booking.assignmentAttempts.push({
          workerId: previousWorkerId,
          notifiedAt: new Date(),
          respondedAt: new Date(),
          outcome: 'unconfirmed',
          reason
        });
      }
    }

    // Old offers (any worker, any wave) are void; the fresh search recreates them.
    await BookingRequest.deleteMany({ bookingId: booking._id });

    // Slot bookings are never broadcast: they are auto-assigned to an available
    // worker below. Instant ones restart the wave search.
    const isSlotBooking = booking.bookingType !== 'instant';
    booking.workerId = null;
    booking.status = isSlotBooking ? BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED : BOOKING_STATUS.SEARCHING;
    booking.assignmentStatus = isSlotBooking ? 'manual_assignment_required' : 'searching';
    booking.workerResponse = 'PENDING';
    booking.currentWave = 0; // scheduler re-runs the geo search and starts wave 1
    booking.waveStartedAt = isSlotBooking ? null : new Date();
    booking.potentialWorkers = [];
    booking.notifiedWorkers = [];
    booking.notifiedPartners = [];
    booking.workerAcceptedAt = null;
    booking.acceptedAt = null;
    booking.assignedAt = null;
    booking.reminderSentAt = null;
    booking.reminderConfirmedAt = null;
    booking.reminderEscalatedAt = null;
    await booking.save();
    if (previousWorkerId) {
      const capacity = await syncWorkerCapacityStatus(previousWorkerId);
      getIO()?.to(`worker_${previousWorkerId}`).emit('worker_capacity_changed', {
        status: capacity?.status,
        isBusy: capacity?.isBusy || false,
        reason: 'booking_rebroadcast'
      });
    }

    const io = getIO();
    if (previousWorkerId) {
      io?.to(`worker_${previousWorkerId}`).emit('job_cancelled', {
        bookingId: booking._id.toString(),
        message: `Booking #${booking.bookingNumber} has been reassigned to another professional`
      });
      createNotification({
        workerId: previousWorkerId,
        type: 'job_reassigned',
        title: 'Job Reassigned',
        message: `Booking #${booking.bookingNumber} was taken back because it wasn't confirmed in time.`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      }).catch(() => {});
    }
    io?.to(`user_${booking.userId}`).emit('booking_updated', {
      bookingId: booking._id,
      status: BOOKING_STATUS.SEARCHING,
      message: 'We are assigning a service professional to your booking.'
    });

    if (isSlotBooking) {
      const result = await reassignSlotBooking(booking._id);
      const fresh = await HomeServiceBooking.findById(booking._id);
      return res.json({
        success: true,
        message: result.assigned
          ? 'Booking assigned to another available professional.'
          : 'No other professional is available for this slot. It stays in the manual queue.',
        data: fresh
      });
    }

    res.json({ success: true, message: 'Booking re-broadcast to other professionals', data: booking });
  } catch (error) {
    console.error('Rebroadcast booking error:', error);
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

