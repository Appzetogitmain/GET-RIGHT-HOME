// controllers/adminWorkerPlanController.js
//
// Admin CRUD for WorkerSubscriptionPlan — the plans workers buy to receive
// job alerts (see frontend/.../admin/pages/Plans/WorkerPlans.jsx).
//
// This is the missing half of a feature that was otherwise fully built: the
// model existed, the admin screen existed and called `/admin/worker-plans`,
// but no route or controller ever answered that path — every request 404'd
// and the page always showed "No worker plans found."

import WorkerSubscriptionPlan from '../models/WorkerSubscriptionPlan.js';

/**
 * @desc    List every worker plan (active and inactive — this is the admin view)
 * @route   GET /api/admin/worker-plans
 */
export const getWorkerPlans = async (req, res) => {
  try {
    const plans = await WorkerSubscriptionPlan.find().sort({ createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get worker plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to load worker plans' });
  }
};

/**
 * @desc    Create a worker plan
 * @route   POST /api/admin/worker-plans
 */
export const createWorkerPlan = async (req, res) => {
  try {
    const { title, description, price, durationDays, features, isActive } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Give the plan a title' });
    }
    if (price == null || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'Set a price (0 is allowed for a free plan)' });
    }
    if (!durationDays || Number(durationDays) < 1) {
      return res.status(400).json({ success: false, message: 'Set a validity of at least 1 day' });
    }

    const plan = await WorkerSubscriptionPlan.create({
      title: title.trim(),
      description: description || '',
      price: Number(price),
      durationDays: Number(durationDays),
      features: Array.isArray(features) ? features : [],
      isActive: isActive !== false,
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('Create worker plan error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create worker plan' });
  }
};

/**
 * @desc    Update a worker plan
 * @route   PUT /api/admin/worker-plans/:id
 */
export const updateWorkerPlan = async (req, res) => {
  try {
    const { title, description, price, durationDays, features, isActive } = req.body;

    const plan = await WorkerSubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    if (title !== undefined) plan.title = title.trim();
    if (description !== undefined) plan.description = description;
    if (price !== undefined) plan.price = Number(price);
    if (durationDays !== undefined) plan.durationDays = Number(durationDays);
    if (features !== undefined) plan.features = Array.isArray(features) ? features : plan.features;
    if (isActive !== undefined) plan.isActive = !!isActive;

    await plan.save();
    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Update worker plan error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update worker plan' });
  }
};

/**
 * @desc    Delete a worker plan
 * @route   DELETE /api/admin/worker-plans/:id
 *
 * Hard-deleted rather than soft-deactivated — unlike the property/subscription
 * plans, nothing else references a WorkerSubscriptionPlan by id (the whole
 * worker-subscription system is dormant; there are currently 0 subscribers),
 * so there is no purchased record whose history this would orphan.
 */
export const deleteWorkerPlan = async (req, res) => {
  try {
    const plan = await WorkerSubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete worker plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete worker plan' });
  }
};
