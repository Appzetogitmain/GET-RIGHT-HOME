import Property from '../models/Property.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import FeaturedPlan from '../models/FeaturedPlan.js';

// Get all projects for featured management
export const getAdminFeaturedProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';

    const baseQuery = { status: 'approved' };
    if (req.query.isFeatured === 'true') {
      baseQuery['featuredDetails.isFeatured'] = true;
    }

    // 1. Fetch from Project model safely
    const dbProjects = await Project.find(baseQuery)
      .populate('userId', 'name email role companyName')
      .sort({ createdAt: -1 })
      .catch(() => []);

    // 2. Fetch Project & Builder listings saved in Property model safely
    const propertyProjectsQuery = { status: 'approved' };
    if (req.query.isFeatured === 'true') {
      propertyProjectsQuery['featuredDetails.isFeatured'] = true;
    }

    const allApprovedProps = await Property.find(propertyProjectsQuery)
      .populate({ path: 'userId', select: 'name email role companyName', strictPopulate: false })
      .populate({ path: 'partnerId', select: 'name email role companyName', strictPopulate: false })
      .sort({ createdAt: -1 })
      .catch(() => []);

    const dbPropertyProjects = allApprovedProps.filter(p => {
      if (!p || p.status !== 'approved') return false;
      const creatorRole = String(p.partnerId?.role || p.userId?.role || p.userId?.userType || '').toLowerCase();
      const catName = String(p.propertyCategory || p.dynamicCategory?.name || p.dynamicCategory?.displayName || '').toLowerCase();

      return p.isProject === true || 
             p.listingType === 'project' || 
             creatorRole === 'builder' ||
             catName.includes('project') ||
             Boolean(p.builderProjectDetails) || 
             Boolean(p.dynamicData?.builderName) || 
             Boolean(p.dynamicData?.builderProjectDetails) || 
             (Array.isArray(p.dynamicData?.towers) && p.dynamicData.towers.length > 0);
    });

    // 3. Merge without duplicates
    let combinedProjects = [...dbProjects];
    dbPropertyProjects.forEach(p => {
      if (p && !combinedProjects.some(existing => existing && String(existing._id) === String(p._id))) {
        combinedProjects.push(p);
      }
    });

    // 4. Apply search filter if provided
    if (search) {
      combinedProjects = combinedProjects.filter(p => {
        const name = (p.projectName || p.propertyName || '').toLowerCase();
        const type = (p.projectType || p.propertyType || '').toLowerCase();
        const owner = (p.userId?.name || p.partnerId?.name || p.userId?.companyName || '').toLowerCase();
        return name.includes(search) || type.includes(search) || owner.includes(search);
      });
    }

    const paginatedProjects = combinedProjects.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      projects: paginatedProjects,
      meta: {
        total: combinedProjects.length,
        page,
        limit,
        totalPages: Math.ceil(combinedProjects.length / limit) || 1
      }
    });
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    res.status(500).json({ success: false, message: 'Server error fetching featured projects', error: error.message });
  }
};

// Update featured status and plan
export const updateFeaturedProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured, planId, durationDays, adminNotes } = req.body;

    let project = await Project.findById(id);
    let isPropertyModel = false;

    if (!project) {
      project = await Property.findById(id);
      isPropertyModel = true;
    }

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
    console.error('Error updating featured project:', error);
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
