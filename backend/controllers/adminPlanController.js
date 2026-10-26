import Plan from '../models/Plan.js';

// Default user subscription plans matching the frontend tiers
const DEFAULT_PLANS = [
  {
    name: 'Silver',
    price: 499,
    tagline: 'Essential Home Maintenance',
    description: 'Basic coverage for regular home maintenance and standard repair visits.',
    duration: '1',
    validityMonths: 1,
    freeCategories: [],
    freeServices: [],
    bonusServices: [],
    isActive: true
  },
  {
    name: 'Gold',
    price: 999,
    tagline: 'Most Popular for Families',
    description: 'Comprehensive coverage with priority service, free visits and maintenance.',
    duration: '3',
    validityMonths: 3,
    freeCategories: [],
    freeServices: [],
    bonusServices: [],
    isActive: true
  },
  {
    name: 'Diamond',
    price: 1999,
    tagline: 'Complete Peace of Mind',
    description: 'Premium service with zero visit charges, free seasonal checkups and rapid response.',
    duration: '6',
    validityMonths: 6,
    freeCategories: [],
    freeServices: [],
    bonusServices: [],
    isActive: true
  },
  {
    name: 'Platinum',
    price: 3499,
    tagline: 'VIP Full-Year Protection',
    description: 'All-inclusive annual home protection with dedicated manager and VIP perks.',
    duration: '12',
    validityMonths: 12,
    freeCategories: [],
    freeServices: [],
    bonusServices: [],
    isActive: true
  }
];

/**
 * @desc    Get all user subscription plans (Admin view)
 * @route   GET /api/admin/plans
 */
export const getPlans = async (req, res) => {
  try {
    let plans = await Plan.find()
      .populate('freeCategories', 'title name icon image')
      .populate('freeServices', 'title name price categoryId')
      .populate('bonusServices.categoryId', 'title name')
      .populate('bonusServices.serviceId', 'title name price')
      .sort({ price: 1 });

    // Seed defaults if empty so admin has starting tiers to configure
    if (!plans || plans.length === 0) {
      try {
        await Plan.insertMany(DEFAULT_PLANS);
        plans = await Plan.find()
          .populate('freeCategories', 'title name icon image')
          .populate('freeServices', 'title name price categoryId')
          .populate('bonusServices.categoryId', 'title name')
          .populate('bonusServices.serviceId', 'title name price')
          .sort({ price: 1 });
      } catch (seedErr) {
        console.error('Error auto-seeding default plans:', seedErr);
      }
    }

    res.json({ success: true, data: plans || [] });
  } catch (error) {
    console.error('Get user plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to load plans' });
  }
};

/**
 * @desc    Create a new user plan
 * @route   POST /api/admin/plans
 */
export const createPlan = async (req, res) => {
  try {
    const {
      name,
      price,
      tagline,
      description,
      duration,
      validityMonths,
      freeCategories,
      freeServices,
      bonusServices,
      isActive
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }
    if (price == null || isNaN(Number(price))) {
      return res.status(400).json({ success: false, message: 'Valid price is required' });
    }

    const plan = await Plan.create({
      name: name.trim(),
      price: Number(price),
      tagline: tagline || '',
      description: description || '',
      duration: duration || String(validityMonths || 1),
      freeCategories: Array.isArray(freeCategories) ? freeCategories.filter(Boolean) : [],
      freeServices: Array.isArray(freeServices) ? freeServices.filter(Boolean) : [],
      bonusServices: Array.isArray(bonusServices)
        ? bonusServices.filter(bs => bs && (bs.categoryId || bs.serviceId))
        : [],
      isActive: isActive !== false
    });

    const populatedPlan = await Plan.findById(plan._id)
      .populate('freeCategories', 'title name icon image')
      .populate('freeServices', 'title name price categoryId')
      .populate('bonusServices.categoryId', 'title name')
      .populate('bonusServices.serviceId', 'title name price');

    res.status(201).json({ success: true, data: populatedPlan });
  } catch (error) {
    console.error('Create plan error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A plan with this name already exists' });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to create plan' });
  }
};

/**
 * @desc    Update an existing user plan
 * @route   PUT /api/admin/plans/:id
 */
export const updatePlan = async (req, res) => {
  try {
    const {
      name,
      price,
      tagline,
      description,
      duration,
      validityMonths,
      freeCategories,
      freeServices,
      bonusServices,
      isActive
    } = req.body;

    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    if (name !== undefined) plan.name = name.trim();
    if (price !== undefined) plan.price = Number(price);
    if (tagline !== undefined) plan.tagline = tagline;
    if (description !== undefined) plan.description = description;
    if (duration !== undefined) plan.duration = String(duration);
    else if (validityMonths !== undefined) plan.duration = String(validityMonths);

    if (freeCategories !== undefined) {
      plan.freeCategories = Array.isArray(freeCategories) ? freeCategories.filter(Boolean) : [];
    }
    if (freeServices !== undefined) {
      plan.freeServices = Array.isArray(freeServices) ? freeServices.filter(Boolean) : [];
    }
    if (bonusServices !== undefined) {
      plan.bonusServices = Array.isArray(bonusServices)
        ? bonusServices.filter(bs => bs && (bs.categoryId || bs.serviceId))
        : [];
    }
    if (isActive !== undefined) plan.isActive = !!isActive;

    await plan.save();

    const populatedPlan = await Plan.findById(plan._id)
      .populate('freeCategories', 'title name icon image')
      .populate('freeServices', 'title name price categoryId')
      .populate('bonusServices.categoryId', 'title name')
      .populate('bonusServices.serviceId', 'title name price');

    res.json({ success: true, data: populatedPlan });
  } catch (error) {
    console.error('Update plan error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A plan with this name already exists' });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to update plan' });
  }
};

/**
 * @desc    Delete a user plan
 * @route   DELETE /api/admin/plans/:id
 */
export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete plan' });
  }
};

export default {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan
};
