// cron/subscriptionScheduler.js
//
// §16 — the scheduled expiry and renewal-reminder process.
//
// Two jobs, both idempotent so a restart mid-run cannot double-act:
//
//   EXPIRY     finds active subscriptions past their end date, marks them
//              expired and strips paid entitlements from their listings. The
//              listings themselves stay published, and all history is kept.
//
//   REMINDERS  warns subscribers 7, 3 and 1 days out. Each subscription records
//              which reminders it has had, so none is ever sent twice.
//
// Expiry was previously handled only by comparing dates at read time, which
// worked but left stored status permanently stale — a subscription that lapsed
// weeks ago still read as active and was still counted in admin revenue.

import Subscription from '../models/Subscription.js';
import Property from '../models/Property.js';
import { expireSubscription } from '../services/subscriptionActivationService.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';
import {
    SUBSCRIPTION_STATUS,
    RENEWAL_REMINDER_DAYS,
    MS_PER_DAY,
} from '../utils/subscriptionConstants.js';

// Hourly is frequent enough for day-granularity validity, and cheap: both
// queries are covered by the { status, expiryDate } index.
const INTERVAL_MS = 60 * 60 * 1000;

let timer = null;
let running = false;

/** Expires everything whose window has closed. */
export const runExpirySweep = async () => {
    const now = new Date();

    const due = await Subscription.find({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        expiryDate: { $lte: now },
    }).limit(500);

    let expired = 0;
    for (const subscription of due) {
        try {
            await expireSubscription(subscription);
            expired += 1;
        } catch (err) {
            console.error(`[SubscriptionCron] failed to expire ${subscription.subscriptionId}:`, err.message);
        }
    }

    // Safety net: clear any promotion cache left on a listing whose window has
    // passed, even if its subscription row was changed by some other path.
    const stranded = await Property.updateMany(
        { 'promotion.isActive': true, 'promotion.expiryDate': { $lte: now } },
        {
            $set: {
                'promotion.isActive': false,
                'promotion.weight': 0,
                'promotion.showcase': false,
                'promotion.priorityPlacement': false,
                'promotion.verifiedBadge': false,
                isFeatured: false,
            },
        }
    );

    if (expired || stranded.modifiedCount) {
        console.log(`[SubscriptionCron] expired ${expired} subscription(s), cleared ${stranded.modifiedCount} stranded promotion(s)`);
    }
    return { expired, strandedCleared: stranded.modifiedCount };
};

/** Sends renewal reminders at 7, 3 and 1 days out. */
export const runRenewalReminders = async () => {
    const now = new Date();
    let sent = 0;

    for (const daysOut of RENEWAL_REMINDER_DAYS) {
        // Everything expiring within this window that has not had this
        // particular reminder yet. Using $nin rather than a date-equality check
        // means a missed run still catches up on the next pass.
        const windowEnd = new Date(now.getTime() + daysOut * MS_PER_DAY);

        const due = await Subscription.find({
            status: SUBSCRIPTION_STATUS.ACTIVE,
            expiryDate: { $gt: now, $lte: windowEnd },
            remindersSent: { $nin: [daysOut] },
        }).limit(200);

        for (const subscription of due) {
            try {
                const remaining = Math.max(1, Math.ceil((subscription.expiryDate - now) / MS_PER_DAY));

                await createNotification({
                    userId: subscription.userId,
                    type: 'subscription_expiring',
                    title: 'Subscription Expiring Soon',
                    message: `Your ${subscription.planName} subscription ends in ${remaining} day${remaining === 1 ? '' : 's'}. Renew to keep your listing's paid visibility.`,
                    relatedId: subscription._id,
                    relatedType: 'subscription',
                    priority: 'high',
                    pushData: { type: 'subscription_expiring', link: '/my-subscriptions' },
                });

                // Record every threshold at or above this one: a subscription
                // first seen 2 days out should not later fire the 3-day and
                // 7-day reminders as well.
                const covered = RENEWAL_REMINDER_DAYS.filter((d) => d >= daysOut);
                await Subscription.updateOne(
                    { _id: subscription._id },
                    { $addToSet: { remindersSent: { $each: covered } } }
                );

                sent += 1;
            } catch (err) {
                console.error(`[SubscriptionCron] reminder failed for ${subscription.subscriptionId}:`, err.message);
            }
        }
    }

    if (sent) console.log(`[SubscriptionCron] sent ${sent} renewal reminder(s)`);
    return { sent };
};

const tick = async () => {
    if (running) return;          // never overlap two passes
    running = true;
    try {
        await runExpirySweep();
        await runRenewalReminders();
    } catch (err) {
        console.error('[SubscriptionCron] pass failed:', err.message);
    } finally {
        running = false;
    }
};

export const startSubscriptionScheduler = () => {
    if (timer) return;
    console.log('[SubscriptionCron] starting (hourly expiry + renewal reminders)');
    // Give the app a moment to finish connecting before the first pass.
    setTimeout(tick, 15_000);
    timer = setInterval(tick, INTERVAL_MS);
};

export const stopSubscriptionScheduler = () => {
    if (timer) clearInterval(timer);
    timer = null;
};
