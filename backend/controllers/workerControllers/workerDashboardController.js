import HomeServiceBooking from '../../models/HomeServiceBooking.js';
import Worker from '../../models/Worker.js';
import {  BOOKING_STATUS  } from '../../utils/constants.js';

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

    // 2. Calculate Total Earnings
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
          total: { $sum: "$finalAmount" }
        }
      }
    ]);

    const totalEarnings = earningStats.length > 0 ? earningStats[0].total : 0;

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

    // 4. Count Completed Jobs
    const completedJobsCount = await HomeServiceBooking.countDocuments({
      workerId: worker._id,
      status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE] }
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
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name')
      .populate('serviceId', 'title');

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        activeJobs: activeJobsCount,
        completedJobs: completedJobsCount,
        rating: averageRating,
        recentJobs
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

export { 
  getDashboardStats
 };
