import {
  getAvailabilityView,
  applyAvailability,
  AvailabilityError
} from '../../services/workerAvailabilityService.js';

const fail = (res, error, label) => {
  if (error instanceof AvailabilityError) {
    return res.status(error.status).json({ success: false, message: error.message, ...error.extra });
  }
  console.error(`${label} error:`, error);
  return res.status(500).json({ success: false, message: 'Server error' });
};

/** Worker: their marked weekdays, leave days and booked days. */
export const getMyAvailability = async (req, res) => {
  try {
    res.json({ success: true, data: await getAvailabilityView(req.user.id) });
  } catch (error) {
    fail(res, error, 'Get availability');
  }
};

/** Worker: save marked weekdays and leave days. Body: { availableDays, leaveDates, reason } */
export const updateMyAvailability = async (req, res) => {
  try {
    const { availableDays, availableDates, leaveDates, reason } = req.body || {};
    const data = await applyAvailability(req.user.id, { availableDays, availableDates, leaveDates, reason });
    res.json({
      success: true,
      message: data.leaveAutoApprove ? 'Availability saved.' : 'Availability saved. New leave days are awaiting admin approval.',
      data
    });
  } catch (error) {
    fail(res, error, 'Update availability');
  }
};

/** Admin: view a worker's availability. */
export const getWorkerAvailabilityAdmin = async (req, res) => {
  try {
    res.json({ success: true, data: await getAvailabilityView(req.params.id) });
  } catch (error) {
    fail(res, error, 'Admin get availability');
  }
};

/** Admin: edit a worker's availability (leave takes effect immediately). */
export const updateWorkerAvailabilityAdmin = async (req, res) => {
  try {
    const { availableDays, availableDates, leaveDates, reason } = req.body || {};
    const data = await applyAvailability(req.params.id, { availableDays, availableDates, leaveDates, reason }, { byAdmin: true, adminId: req.user?.id });
    res.json({ success: true, message: 'Worker availability updated.', data });
  } catch (error) {
    fail(res, error, 'Admin update availability');
  }
};
