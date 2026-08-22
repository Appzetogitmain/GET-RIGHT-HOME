
export const BOOKING_STATUS = {
  PENDING: 'pending',
  SEARCHING: 'searching',
  ASSIGNED: 'assigned',
  // Automatic matching found nobody. The booking stays ACTIVE and moves to the
  // ops team's manual-assignment queue — it is not a cancellation. Kept
  // alongside the older no_workers/no_vendors values, which existing rows
  // still use and which mean the same thing.
  MANUAL_ASSIGNMENT_REQUIRED: 'manual_assignment_required',
  CONFIRMED: 'confirmed',
  ACCEPTED: 'accepted',
  JOURNEY_STARTED: 'journey_started',
  VISITED: 'visited',
  ESTIMATE_PROVIDED: 'estimate_provided',
  ESTIMATE_ACCEPTED: 'estimate_accepted',
  IN_PROGRESS: 'in_progress',
  WORK_DONE: 'work_done',
  AWAITING_PAYMENT: 'awaiting_payment',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_VENDORS: 'no_vendors',
  NO_WORKERS: 'no_workers',
  REJECTED: 'rejected',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  PLAN_COVERED: 'plan_covered',
  FAILED: 'failed',
  COLLECTED_BY_VENDOR: 'collected_by_vendor',
};

export const WORKER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  INACTIVE: 'inactive',
};

export const USER_ROLES = {
  USER: 'user',
  WORKER: 'worker',
  ADMIN: 'admin',
  VENDOR: 'vendor',
};

export const SERVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
};

export const BILL_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};
