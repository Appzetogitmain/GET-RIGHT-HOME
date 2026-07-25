import PlatformSettings from '../models/PlatformSettings.js';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Transaction from '../models/Transaction.js';
import Worker from '../models/Worker.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';

/**
 * Checks if the worker has achieved the current target within the configured date range.
 * If achieved and not yet awarded, credits their wallet and sends a push notification.
 * 
 * @param {string} workerId - The worker's ID (ObjectId string)
 */
export const checkAndAwardTargetBonus = async (workerId) => {
  try {
    // 1. Fetch current platform settings
    const platformSettings = await PlatformSettings.getSettings();
    const monthlyTarget = platformSettings.monthlyTarget || 0;
    const monthlyTargetBonus = platformSettings.monthlyTargetBonus || 0;
    
    const targetStartDate = platformSettings.targetStartDate ? new Date(platformSettings.targetStartDate) : null;
    const targetEndDate = platformSettings.targetEndDate ? new Date(platformSettings.targetEndDate) : null;

    // 2. If no target date range is active, or target is 0, skip evaluation
    if (!targetStartDate || !targetEndDate || monthlyTarget <= 0 || monthlyTargetBonus <= 0) {
      return;
    }

    // 3. Count COMPLETED / WORK_DONE jobs for this worker within the date range
    const completedJobsCount = await HomeServiceBooking.countDocuments({
      workerId: workerId,
      status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE] },
      updatedAt: { $gte: targetStartDate, $lte: targetEndDate }
    });

    // 4. Check if target is achieved
    if (completedJobsCount >= monthlyTarget) {
      // 5. Check if the bonus for this specific date range has already been awarded
      const uniqueReference = `target_bonus_${targetStartDate.getTime()}_${targetEndDate.getTime()}`;
      
      const existingTransaction = await Transaction.findOne({
        workerId: workerId,
        category: 'target_bonus',
        reference: uniqueReference,
        status: 'completed'
      });

      // 6. If not awarded yet, proceed with credit
      if (!existingTransaction) {
        // Find the worker
        const worker = await Worker.findById(workerId);
        
        if (worker) {
          // Initialize wallet if it doesn't exist
          if (!worker.wallet) {
            worker.wallet = { balance: 0, earnings: 0, totalCashCollected: 0, totalWithdrawn: 0, dues: 0 };
          }
          
          // Credit the worker's wallet
          worker.wallet.balance = (worker.wallet.balance || 0) + monthlyTargetBonus;
          worker.wallet.earnings = (worker.wallet.earnings || 0) + monthlyTargetBonus;
          await worker.save();

          // Create transaction record
          await Transaction.create({
            workerId: worker._id,
            modelType: 'Worker',
            type: 'credit',
            category: 'target_bonus',
            amount: monthlyTargetBonus,
            balanceAfter: worker.wallet.balance,
            description: 'Target Achieved Bonus',
            reference: uniqueReference,
            status: 'completed'
          });

          console.log(`[Target Bonus] Awarded ₹${monthlyTargetBonus} to Worker ${workerId} for reference ${uniqueReference}`);

          // Send Push Notification to Worker
          await createNotification({
            userId: workerId,
            type: 'wallet_credit',
            title: 'Target Achieved! 🎉',
            message: `Congratulations! You've achieved your target of ${monthlyTarget} jobs. ₹${monthlyTargetBonus} has been added to your wallet.`,
            relatedId: worker._id,
            relatedType: 'wallet',
            priority: 'high',
            pushData: {
              type: 'wallet_credit',
              link: '/worker/wallet'
            }
          }).catch(e => console.error('Notification error in target bonus:', e));
        }
      }
    }
  } catch (error) {
    console.error(`[Target Bonus Error] Failed to evaluate target bonus for Worker ${workerId}:`, error);
  }
};
