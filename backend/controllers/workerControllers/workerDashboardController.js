import HomeServiceBooking from '../../models/HomeServiceBooking.js';
import Worker from '../../models/Worker.js';
import PlatformSettings from '../../models/PlatformSettings.js';
import Admin from '../../models/Admin.js';
import { BOOKING_STATUS } from '../../utils/constants.js';
import { createNotification } from '../notificationControllers/notificationController.js';

/**
 * Get worker dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const workerId = req.user.id;

    // Fetch independent roots together and avoid the worker's large document fields.
    const [worker, platformSettings] = await Promise.all([
      Worker.findById(workerId).select('name rating referralCode').lean(),
      PlatformSettings.getSettings()
    ]);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // 2. Calculate Earnings (Total, Today, This Week, This Month)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthlyTarget = platformSettings.monthlyTarget || 30;
    const monthlyTargetBonus = platformSettings.monthlyTargetBonus || 5000;
    
    // Determine the date range for target evaluation (no default fallback)
    const targetStartDate = platformSettings.targetStartDate ? new Date(platformSettings.targetStartDate) : null;
    const targetEndDate = platformSettings.targetEndDate ? new Date(platformSettings.targetEndDate) : null;

    const completedStatuses = [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE];
    const activeStatuses = [BOOKING_STATUS.ASSIGNED, BOOKING_STATUS.VISITED, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.CONFIRMED];
    const acceptedStatuses = [
      BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.JOURNEY_STARTED,
      BOOKING_STATUS.VISITED, BOOKING_STATUS.ESTIMATE_PROVIDED,
      BOOKING_STATUS.ESTIMATE_ACCEPTED, BOOKING_STATUS.IN_PROGRESS
    ];
    const targetCount = targetStartDate && targetEndDate
      ? HomeServiceBooking.countDocuments({
          workerId: worker._id,
          status: { $in: completedStatuses },
          updatedAt: { $gte: targetStartDate, $lte: targetEndDate }
        })
      : Promise.resolve(0);

    // All booking reads are independent. Serial awaits made endpoint latency
    // equal to the sum of every query instead of the slowest query.
    const [
      earningStats, activeJobsCount, completedJobsCount, targetCompletedJobsCount,
      pendingJobsCount, acceptedJobsCount, cancelledJobsCount, ratingStats,
      recentJobs, emergencyJobs, helperJobsCount
    ] = await Promise.all([
      HomeServiceBooking.aggregate([
        { $match: { workerId: worker._id, status: { $in: completedStatuses } } },
        { $group: {
          _id: null,
          total: { $sum: '$finalAmount' },
          todayEarnings: { $sum: { $cond: [{ $gte: ['$updatedAt', today] }, '$finalAmount', 0] } },
          thisWeekEarnings: { $sum: { $cond: [{ $gte: ['$updatedAt', startOfWeek] }, '$finalAmount', 0] } },
          thisMonthEarnings: { $sum: { $cond: [{ $gte: ['$updatedAt', startOfMonth] }, '$finalAmount', 0] } }
        } }
      ]),
      HomeServiceBooking.countDocuments({ workerId: worker._id, status: { $in: activeStatuses } }),
      HomeServiceBooking.countDocuments({ workerId: worker._id, status: { $in: completedStatuses } }),
      targetCount,
      HomeServiceBooking.countDocuments({ workerId: worker._id, status: BOOKING_STATUS.ASSIGNED }),
      HomeServiceBooking.countDocuments({ workerId: worker._id, status: { $in: acceptedStatuses } }),
      HomeServiceBooking.countDocuments({ workerId: worker._id, status: { $in: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] } }),
      HomeServiceBooking.aggregate([
        { $match: { workerId: worker._id, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]),
      HomeServiceBooking.find({ workerId: worker._id })
        .select('-serviceImages -requirementImages -workPhotos -reviewImages')
        .sort({ createdAt: -1 }).limit(5)
        .populate('userId', 'name').populate('serviceId', 'title').lean(),
      HomeServiceBooking.find({
        workerId: worker._id,
        status: BOOKING_STATUS.ASSIGNED,
        workerResponse: { $nin: ['ACCEPTED', 'AUTO_ASSIGNED', 'ADMIN_ASSIGNED'] }
      })
        .select('-serviceImages -requirementImages -workPhotos -reviewImages')
        .sort({ createdAt: -1 })
        .populate('userId', 'name profilePicture').populate('serviceId', 'title').lean(),
      HomeServiceBooking.countDocuments({
        helpers: { $elemMatch: { workerId: worker._id, payoutStatus: { $ne: 'cancelled' } } },
        status: { $in: [
          BOOKING_STATUS.ASSIGNED, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACCEPTED,
          BOOKING_STATUS.JOURNEY_STARTED, BOOKING_STATUS.VISITED, BOOKING_STATUS.IN_PROGRESS
        ] }
      })
    ]);

    const earnings = earningStats[0] || { total: 0, todayEarnings: 0, thisWeekEarnings: 0, thisMonthEarnings: 0 };
    const totalEarnings = earnings.total;
    const todayEarnings = earnings.todayEarnings;
    const thisWeekEarnings = earnings.thisWeekEarnings;
    const thisMonthEarnings = earnings.thisMonthEarnings;
    const averageRating = ratingStats.length > 0
      ? parseFloat(ratingStats[0].avgRating.toFixed(1))
      : (worker.rating || 0);

    // Generate referral code if not present (for backward compatibility)
    let workerReferralCode = worker.referralCode;
    if (!workerReferralCode) {
      const namePrefix = worker.name ? worker.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'W') : 'WORK';
      workerReferralCode = `GRH-${namePrefix}${Math.floor(1000 + Math.random() * 9000)}`;
      await Worker.updateOne({ _id: worker._id }, { $set: { referralCode: workerReferralCode } });
    }

    res.status(200).json({
      success: true,
      data: {
        helperJobs: helperJobsCount,
        totalEarnings,
        todayEarnings,
        thisWeekEarnings,
        thisMonthEarnings,
        activeJobs: activeJobsCount,
        pendingJobs: pendingJobsCount,
        acceptedJobs: acceptedJobsCount,
        cancelledJobs: cancelledJobsCount,
        completedJobs: completedJobsCount,
        targetCompletedJobs: targetCompletedJobsCount,
        targetTitle: platformSettings.targetTitle || 'Monthly Target',
        monthlyTarget,
        monthlyTargetBonus,
        targetStartDate,
        targetEndDate,
        workerAchievements: platformSettings.workerAchievements,
        supportContact: platformSettings.supportContact,
        trainingVideos: platformSettings.trainingVideos,
        workerReferralBonusReferrer: platformSettings.workerReferralBonusReferrer || 0,
        workerReferralCode: workerReferralCode,
        rating: averageRating,
        recentJobs,
        emergencyJobs
      }
    });

  } catch (error) {
    console.error('Get worker dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * Get public platform settings (Support Contact, Privacy Policy, etc.)
 */
const getPublicSettings = async (req, res) => {
  try {
    const platformSettings = await PlatformSettings.getSettings();
    res.status(200).json({
      success: true,
      data: {
        supportContact: platformSettings.supportContact,
        privacyPolicy: platformSettings.privacyPolicy
      }
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public settings'
    });
  }
};

/**
 * Silent SOS — worker sends an emergency alert to admin. Never places a
 * call; just logs the alert and notifies every admin account (in-app +
 * push, via the existing createNotification pipeline) so someone sees it
 * even if a specific admin is offline.
 */
const sendEmergencyAlert = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { message, location } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A message is required to send an alert' });
    }

    const worker = await Worker.findById(workerId).select('name phone');
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const admins = await Admin.find({ role: { $in: ['admin', 'superadmin', 'super_admin'] } });

    const hasLocation = location && typeof location.lat === 'number' && typeof location.lng === 'number';
    // Keep this short — it's rendered inline (2-line clamp) in the foreground
    // toast, and the map link previously pushed it well past that, cutting
    // the worker's own message off mid-sentence. Location is still kept,
    // just moved into the notification's structured `data` instead of the
    // display text.
    const body = `${worker.name} (${worker.phone}): "${message.trim()}"`;

    await Promise.all(admins.map((admin) =>
      createNotification({
        userId: admin._id,
        userType: 'admin',
        type: 'worker_emergency',
        title: '🚨 Worker Emergency Alert',
        body,
        priority: 'high',
        data: hasLocation ? { location, mapUrl: `https://maps.google.com/?q=${location.lat},${location.lng}` } : {},
        // Without this the foreground toast's category badge falls back to
        // a literal "DEFAULT" — it reads pushData.type, not the top-level
        // `type` above (that one only labels the DB record).
        pushData: { type: 'worker_emergency' }
      }).catch((err) => console.error('[EmergencyAlert] notify admin failed:', err))
    ));

    res.status(200).json({ success: true, message: 'Emergency alert sent to admin' });
  } catch (error) {
    console.error('Send emergency alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to send emergency alert' });
  }
};

export {
  getDashboardStats,
  getPublicSettings,
  sendEmergencyAlert
};
