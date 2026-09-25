import Worker from '../models/Worker.js';

/**
 * Periodically checks active worker offline schedules
 * - Automatically sets worker offline when approved offline schedule starts
 * - Deactivates offline schedule when scheduled window expires
 */
export const checkOfflineSchedules = async () => {
  try {
    const now = new Date();

    // 1. Workers with active schedules that have started and worker is still online -> set offline
    const workersToTurnOffline = await Worker.find({
      'currentOfflineSchedule.isActive': true,
      'currentOfflineSchedule.startDateTime': { $lte: now },
      'currentOfflineSchedule.endDateTime': { $gte: now },
      isOnline: true
    });

    for (const worker of workersToTurnOffline) {
      worker.isOnline = false;
      await worker.save();
      console.log(`[OfflineScheduler] Set worker ${worker._id} (${worker.name}) OFFLINE due to scheduled leave.`);
    }

    // 2. Workers with active schedules that have expired -> mark schedule inactive
    const expiredScheduleWorkers = await Worker.find({
      'currentOfflineSchedule.isActive': true,
      'currentOfflineSchedule.endDateTime': { $lt: now }
    });

    for (const worker of expiredScheduleWorkers) {
      if (worker.currentOfflineSchedule) {
        worker.currentOfflineSchedule.isActive = false;
        await worker.save();
        console.log(`[OfflineScheduler] Scheduled offline period expired for worker ${worker._id} (${worker.name}).`);
      }
    }
  } catch (error) {
    console.error('[OfflineScheduler] Error checking offline schedules:', error.message);
  }
};

let schedulerInterval = null;

export const startOfflineScheduleScheduler = () => {
  if (schedulerInterval) return;

  // Run initial check
  checkOfflineSchedules();

  // Run every 60 seconds
  schedulerInterval = setInterval(checkOfflineSchedules, 60 * 1000);
  console.log('[OfflineScheduler] Worker offline schedule scheduler started (runs every 60s)');
};

export const stopOfflineScheduleScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
};
