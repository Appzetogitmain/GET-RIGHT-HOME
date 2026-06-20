import Property from '../models/Property.js';
import User from '../models/User.js';
import FeaturedPlan from '../models/FeaturedPlan.js';

// Get all properties for featured management
export const getAdminFeaturedProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isFeatured === 'true') {
      query['featuredDetails.isFeatured'] = true;
    }

    const properties = await Property.find(query)
      .populate('userId', 'name email role')
      .populate('partnerId', 'name email role')
      .populate('featuredDetails.planId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments(query);

    res.status(200).json({
      success: true,
      properties,
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

    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    let planName = 'None';
    if (planId) {
       const plan = await FeaturedPlan.findById(planId);
       if (plan) planName = plan.name;
    }

    if (!property.featuredDetails) {
      property.featuredDetails = {};
    }

    property.isFeatured = isFeatured; // Sync backward compatibility
    property.featuredDetails.isFeatured = isFeatured;
    property.featuredDetails.planId = planId || null;
    property.featuredDetails.planName = planName;
    property.featuredDetails.adminNotes = adminNotes || '';

    if (isFeatured) {
      property.featuredDetails.startDate = new Date();
      if (durationDays) {
        property.featuredDetails.durationDays = durationDays;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        property.featuredDetails.endDate = endDate;
      } else {
        property.featuredDetails.durationDays = null;
        property.featuredDetails.endDate = null;
      }
      property.featuredDetails.status = 'active';
    } else {
      property.featuredDetails.status = 'expired';
      property.featuredDetails.endDate = new Date();
    }

    await property.save();

    res.status(200).json({ success: true, message: 'Featured status updated successfully', property });
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
