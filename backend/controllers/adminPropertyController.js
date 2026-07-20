import Property from '../models/Property.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import FeaturedPlan from '../models/FeaturedPlan.js';

// Get all properties for featured management
export const getAdminFeaturedProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const query = { status: 'approved' };
    if (req.query.isFeatured === 'true') {
      query['featuredDetails.isFeatured'] = true;
    }
// fghjk
    const projects = await Project.find(query)
      .populate('userId', 'name email role')
      .populate('partnerId', 'name email role')
      .populate('featuredDetails.planId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      projects,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching featured properties:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update featured status and plan
export const updateFeaturedProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured, planId, durationDays, adminNotes } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    let planName = 'None';
    if (planId) {
       const plan = await FeaturedPlan.findById(planId);
       if (plan) planName = plan.name;
    }

    if (!project.featuredDetails) {
      project.featuredDetails = {};
    }

    project.isFeatured = isFeatured; // Sync backward compatibility
    project.featuredDetails.isFeatured = isFeatured;
    project.featuredDetails.planId = planId || null;
    project.featuredDetails.planName = planName;
    project.featuredDetails.adminNotes = adminNotes || '';

    if (isFeatured) {
      project.featuredDetails.startDate = new Date();
      if (durationDays) {
        project.featuredDetails.durationDays = durationDays;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        project.featuredDetails.endDate = endDate;
      } else {
        project.featuredDetails.durationDays = null;
        project.featuredDetails.endDate = null;
      }
      project.featuredDetails.status = 'active';
    } else {
      project.featuredDetails.status = 'expired';
      project.featuredDetails.endDate = new Date();
    }

    await project.save();

    res.status(200).json({ success: true, message: 'Featured status updated successfully', project });
  } catch (error) {
    console.error('Error updating featured property:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==========================================
// FEATURED PLAN TAGS CRUD
// ==========================================

export const getFeaturedPlans = async (req, res) => {
  try {
    const plans = await FeaturedPlan.find().sort({ weight: -1, createdAt: -1 });
    res.status(200).json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
};

export const createFeaturedPlan = async (req, res) => {
  try {
    const plan = await FeaturedPlan.create(req.body);
    res.status(201).json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create plan' });
  }
};

export const updateFeaturedPlan = async (req, res) => {
  try {
    const plan = await FeaturedPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    
    // Also update planName in existing properties if name changed
    if (req.body.name) {
      await Property.updateMany(
        { "featuredDetails.planId": req.params.id },
        { "featuredDetails.planName": req.body.name }
      );
    }
    
    res.status(200).json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update plan' });
  }
};

export const deleteFeaturedPlan = async (req, res) => {
  try {
    const plan = await FeaturedPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    
    // Remove references from properties
    await Property.updateMany(
      { "featuredDetails.planId": req.params.id },
      { 
         "featuredDetails.planId": null,
         "featuredDetails.planName": "Standard" 
      }
    );
    
    res.status(200).json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete plan' });
  }
};
