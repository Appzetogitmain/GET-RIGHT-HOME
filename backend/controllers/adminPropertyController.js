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

    // type=all lists every approved property so admin can handpick any listing
    // (owner/broker too); type=projects keeps the project/builder-only view.
    const includeAll = req.query.type === 'all';

    const dbPropertyProjects = allApprovedProps.filter(p => {
      if (!p || p.status !== 'approved') return false;
      if (includeAll) return true;
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
// HOME-SCREEN "FEATURED PROPERTIES"
// ==========================================

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HOME_FEATURED_LIST_FIELDS =
  'propertyName slug propertyType propertyCategory address coverImage propertyImages images status isLive homeFeatured createdAt userId partnerId isAddedByAdmin';

// GET /admin/home-featured?search=&page=&limit=&filter=all|featured
export const getHomeFeaturedCandidates = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const search = req.query.search ? String(req.query.search).trim() : '';
    const onlyFeatured = req.query.filter === 'featured';

    const query = { status: 'approved' };
    if (onlyFeatured) query['homeFeatured.isActive'] = true;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { propertyName: rx },
        { propertyType: rx },
        { 'address.city': rx },
        { 'address.area': rx }
      ];
    }

    const [projects, properties] = await Promise.all([
      Project.find(query).select(HOME_FEATURED_LIST_FIELDS)
        .populate({ path: 'userId', select: 'name companyName role', strictPopulate: false })
        .lean().catch(() => []),
      Property.find(query).select(HOME_FEATURED_LIST_FIELDS)
        .populate({ path: 'userId', select: 'name companyName role', strictPopulate: false })
        .populate({ path: 'partnerId', select: 'name companyName role', strictPopulate: false })
        .lean().catch(() => [])
    ]);

    const seen = new Set();
    const combined = [];
    [...projects.map(p => ({ ...p, sourceModel: 'Project' })), ...properties.map(p => ({ ...p, sourceModel: 'Property' }))]
      .forEach(p => {
        const id = String(p._id);
        if (seen.has(id)) return;
        seen.add(id);
        combined.push(p);
      });

    // Featured ones first (by display order), then newest.
    combined.sort((a, b) => {
      const af = a.homeFeatured?.isActive ? 1 : 0;
      const bf = b.homeFeatured?.isActive ? 1 : 0;
      if (af !== bf) return bf - af;
      if (af && bf) {
        const od = (a.homeFeatured.order || 0) - (b.homeFeatured.order || 0);
        if (od !== 0) return od;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const total = combined.length;
    const featuredCount = combined.filter(p => p.homeFeatured?.isActive).length;
    const items = combined.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      properties: items,
      meta: { total, featuredCount, page, limit, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    console.error('Error fetching home featured candidates:', error);
    res.status(500).json({ success: false, message: 'Server error fetching properties' });
  }
};

// PUT /admin/home-featured/:id  { isActive, durationDays?, order? }
export const updateHomeFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, durationDays, order } = req.body;

    let Model = Property;
    let doc = await Property.findById(id).select('homeFeatured').lean();
    if (!doc) {
      Model = Project;
      doc = await Project.findById(id).select('homeFeatured').lean();
    }
    if (!doc) return res.status(404).json({ success: false, message: 'Property not found' });

    const current = doc.homeFeatured || {};
    const next = {
      isActive: Boolean(isActive),
      order: order !== undefined && order !== null && order !== '' ? Number(order) || 0 : (current.order || 0),
      startDate: current.startDate || null,
      endDate: current.endDate || null
    };

    if (next.isActive) {
      if (!current.isActive) next.startDate = new Date();
      if (durationDays !== undefined) {
        const days = parseInt(durationDays);
        next.endDate = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
      }
    } else {
      next.endDate = null;
      next.startDate = null;
    }

    // updateOne skips full-document validation, so legacy listings with
    // missing required fields can still be featured.
    await Model.updateOne({ _id: id }, { $set: { homeFeatured: next } });

    res.status(200).json({
      success: true,
      message: next.isActive ? 'Property added to Featured' : 'Property removed from Featured',
      homeFeatured: next
    });
  } catch (error) {
    console.error('Error updating home featured:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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
