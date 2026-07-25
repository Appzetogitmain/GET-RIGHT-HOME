import HomeServiceBooking from '../../models/HomeServiceBooking.js';
import Worker from '../../models/Worker.js';
import PlatformSettings from '../../models/PlatformSettings.js';
import { BOOKING_STATUS } from '../../utils/constants.js';

/**
 * Get worker dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const workerId = req.user.id;

    // Get Worker Profile for Rating (fallback)
    const worker = await Worker.findById(workerId);

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

    // Aggregate from completed bookings where workerId matches
    const earningStats = await HomeServiceBooking.aggregate([
      {
        $match: {
          workerId: worker._id,
          status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$finalAmount" },
          todayEarnings: {
            $sum: {
              $cond: [{ $gte: ["$updatedAt", today] }, "$finalAmount", 0]
            }
          },
          thisWeekEarnings: {
            $sum: {
              $cond: [{ $gte: ["$updatedAt", startOfWeek] }, "$finalAmount", 0]
            }
          },
          thisMonthEarnings: {
            $sum: {
              $cond: [{ $gte: ["$updatedAt", startOfMonth] }, "$finalAmount", 0]
            }
          }
        }
      }
    ]);

    const stats = earningStats.length > 0 ? earningStats[0] : { total: 0, todayEarnings: 0, thisWeekEarnings: 0, thisMonthEarnings: 0 };
    const totalEarnings = stats.total;
    const todayEarnings = stats.todayEarnings;
    const thisWeekEarnings = stats.thisWeekEarnings;
    const thisMonthEarnings = stats.thisMonthEarnings;

    // 3. Count Active Jobs (Assigned, Visited, In Progress)
    const activeJobsCount = await HomeServiceBooking.countDocuments({
      workerId: worker._id,
      status: {
        $in: [
          BOOKING_STATUS.ASSIGNED,
          BOOKING_STATUS.VISITED,
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.CONFIRMED
        ]
      }
    });

    // 4. Get Platform Settings for Monthly Target
    const platformSettings = await PlatformSettings.getSettings();
    const monthlyTarget = platformSettings.monthlyTarget || 30;
    const monthlyTargetBonus = platformSettings.monthlyTargetBonus || 5000;
    
    // Determine the date range for target evaluation (no default fallback)
    const targetStartDate = platformSettings.targetStartDate ? new Date(platformSettings.targetStartDate) : null;
    const targetEndDate = platformSettings.targetEndDate ? new Date(platformSettings.targetEndDate) : null;

    // 4. Count Completed Jobs (Lifetime for performance dashboard)
    const completedJobsCount = await HomeServiceBooking.countDocuments({
      workerId: worker._id,
      status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE] }
    });

    // 4a. Count Target Completed Jobs (Within Target Date)
    let targetCompletedJobsCount = 0;
    if (targetStartDate && targetEndDate) {
      targetCompletedJobsCount = await HomeServiceBooking.countDocuments({
        workerId: worker._id,
        status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE] },
        updatedAt: { $gte: targetStartDate, $lte: targetEndDate }
      });
    }

    // 4a. Count Pending Jobs (Assigned but not started)
    const pendingJobsCount = await HomeServiceBooking.countDocuments({
      workerId: worker._id,
      status: BOOKING_STATUS.ASSIGNED
    });

    // 4b. Count Accepted/In-progress Jobs
    const acceptedJobsCount = await HomeServiceBooking.countDocuments({
      workerId: worker._id,
      status: {
        $in: [
          BOOKING_STATUS.ACCEPTED,
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.JOURNEY_STARTED,
          BOOKING_STATUS.VISITED,
          BOOKING_STATUS.ESTIMATE_PROVIDED,
          BOOKING_STATUS.ESTIMATE_ACCEPTED,
          BOOKING_STATUS.IN_PROGRESS
        ]
      }
    });

    // 4c. Count Cancelled/Rejected Jobs
    const cancelledJobsCount = await HomeServiceBooking.countDocuments({
      workerId: worker._id,
      status: { $in: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] }
    });

    // 5. Calculate Average Rating
    const ratingStats = await HomeServiceBooking.aggregate([
      {
        $match: {
          workerId: worker._id,
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" }
        }
      }
    ]);

    const averageRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].avgRating.toFixed(1)) : (worker.rating || 0);

    // 6. Get Recent Jobs
    const recentJobs = await HomeServiceBooking.find({ workerId: worker._id })
      .select('-serviceImages -requirementImages -workPhotos -reviewImages')
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name')
      .populate('serviceId', 'title');

    // 7. Get Emergency Jobs (Assigned/Pending acceptance)
    const emergencyJobs = await HomeServiceBooking.find({
      workerId: worker._id,
      status: BOOKING_STATUS.ASSIGNED
    })
    .select('-serviceImages -requirementImages -workPhotos -reviewImages')
    .sort({ createdAt: -1 })
    .populate('userId', 'name profilePicture')
    .populate('serviceId', 'title');

    // Generate referral code if not present (for backward compatibility)
    let workerReferralCode = worker.referralCode;
    if (!workerReferralCode) {
      const namePrefix = worker.name ? worker.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'W') : 'WORK';
      workerReferralCode = `GRH-${namePrefix}${Math.floor(1000 + Math.random() * 9000)}`;
      worker.referralCode = workerReferralCode;
      await worker.save();
    }

    res.status(200).json({
      success: true,
      data: {
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

export { 
  getDashboardStats,
  getPublicSettings
};
