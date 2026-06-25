import User from '../models/User.js';
import Property from '../models/Property.js';
import BuilderProjectDetails from '../models/BuilderProjectDetails.js';
import bcrypt from 'bcryptjs';

// @desc    Get all builders
// @route   GET /api/admin/builders
// @access  Private (Admin/Manager)
export const getBuilders = async (req, res) => {
  try {
    const builders = await User.find({ role: 'builder' }).sort({ createdAt: -1 });
    res.json({ success: true, builders });
  } catch (error) {
    console.error('Get Builders Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching builders' });
  }
};

// @desc    Add new builder (from admin)
// @route   POST /api/admin/builders
// @access  Private (Admin/Manager)
export const addBuilder = async (req, res) => {
  try {
    const { name, email, phone, builderProfile } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    // check if user already exists
    const query = [{ phone }];
    if (email) query.push({ email });
    const existingUser = await User.findOne({ $or: query });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this phone or email already exists' });
    }

    const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
    
    const builder = new User({
      name,
      email: email || undefined,
      phone,
      role: 'builder',
      isVerified: true,
      password: passwordHash,
      builderProfile: builderProfile || {}
    });

    await builder.save();
    res.status(201).json({ success: true, builder, message: 'Builder created successfully' });
  } catch (error) {
    console.error('Add Builder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating builder' });
  }
};

// @desc    Update builder
// @route   PUT /api/admin/builders/:id
// @access  Private (Admin/Manager)
export const updateBuilder = async (req, res) => {
  try {
    const builder = await User.findById(req.params.id);
    if (!builder || builder.role !== 'builder') {
      return res.status(404).json({ success: false, message: 'Builder not found' });
    }

    builder.name = req.body.name || builder.name;
    if (req.body.email) builder.email = req.body.email;
    if (req.body.phone) builder.phone = req.body.phone;

    if (req.body.builderProfile) {
      builder.builderProfile = {
        ...(builder.builderProfile ? builder.builderProfile.toObject() : {}),
        ...req.body.builderProfile
      };
    }

    await builder.save();
    res.json({ success: true, builder, message: 'Builder updated successfully' });
  } catch (error) {
    console.error('Update Builder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating builder' });
  }
};

// @desc    Delete builder
// @route   DELETE /api/admin/builders/:id
// @access  Private (Admin/Manager)
export const deleteBuilder = async (req, res) => {
  try {
    const builder = await User.findById(req.params.id);
    if (!builder || builder.role !== 'builder') {
      return res.status(404).json({ success: false, message: 'Builder not found' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Builder deleted successfully' });
  } catch (error) {
    console.error('Delete Builder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error deleting builder' });
  }
};

// @desc    Get public builder profile details & aggregate project stats
// @route   GET /api/public/builders/:id
// @access  Public
export const getPublicBuilderDetails = async (req, res) => {
  try {
    const builder = await User.findById(req.params.id).select('name builderProfile createdAt');
    if (!builder) {
      return res.status(404).json({ success: false, message: 'Builder not found' });
    }

    // Aggregate stats from properties
    const builderProperties = await Property.find({ userId: builder._id }).select('_id');
    const propertyIds = builderProperties.map(p => p._id);

    const ongoingCount = await BuilderProjectDetails.countDocuments({
      propertyId: { $in: propertyIds },
      possessionStatus: 'Ongoing'
    });

    const readyCount = await BuilderProjectDetails.countDocuments({
      propertyId: { $in: propertyIds },
      possessionStatus: 'Ready To Move'
    });
    
    const projects = await Property.find({ userId: builder._id }).select('address.city').populate('builderProjectDetails');
    
    // Get unique cities
    const cities = [...new Set(projects.map(p => p.address?.city).filter(Boolean))];

    // Calculate rating distribution and new metrics
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalAppreciation = 0;
    let appreciationCount = 0;
    let latestAiSummary = '';
    let totalConstructionQuality = 0;
    let qualityCount = 0;

    projects.forEach(p => {
      const rating = p.builderProjectDetails?.ratings?.constructionQuality;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[Math.floor(rating)]++;
        totalConstructionQuality += rating;
        qualityCount++;
      }
      
      const appreciation = p.builderProjectDetails?.priceHistory?.appreciationLast3Years;
      if (appreciation && typeof appreciation === 'number') {
        totalAppreciation += appreciation;
        appreciationCount++;
      }
      
      const aiSummary = p.builderProjectDetails?.ratings?.aiSummary;
      if (aiSummary && typeof aiSummary === 'string' && !latestAiSummary) {
        latestAiSummary = aiSummary;
      }
    });

    const averageAppreciation = appreciationCount > 0 ? Number((totalAppreciation / appreciationCount).toFixed(2)) : 0;
    const averageConstructionQuality = qualityCount > 0 ? Number((totalConstructionQuality / qualityCount).toFixed(1)) : 0;

    res.json({
      success: true,
      builder: {
        _id: builder._id,
        name: builder.name,
        profile: builder.builderProfile,
        stats: {
          ongoingProjects: ongoingCount,
          readyToMoveProjects: readyCount,
          cities: cities.length,
          cityList: cities,
          ratingDistribution,
          averageAppreciation,
          averageConstructionQuality,
          aiSummary: latestAiSummary
        }
      }
    });
  } catch (error) {
    console.error('Get Public Builder Details Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching builder details' });
  }
};

// @desc    Get all public builders
// @route   GET /api/public/builders
// @access  Public
export const getPublicBuilders = async (req, res) => {
  try {
    const builders = await User.find({ role: 'builder' }).select('name builderProfile createdAt');
    
    const buildersWithStats = await Promise.all(builders.map(async (builder) => {
      const builderProperties = await Property.find({ userId: builder._id }).select('_id');
      const propertyIds = builderProperties.map(p => p._id);

      const ongoingCount = await BuilderProjectDetails.countDocuments({
        propertyId: { $in: propertyIds },
        possessionStatus: 'Ongoing'
      });

      const readyCount = await BuilderProjectDetails.countDocuments({
        propertyId: { $in: propertyIds },
        possessionStatus: 'Ready To Move'
      });
      
      const projects = await Property.find({ userId: builder._id }).select('address.city');
      const cities = [...new Set(projects.map(p => p.address?.city).filter(Boolean))];

      return {
        _id: builder._id,
        name: builder.name,
        profile: builder.builderProfile,
        stats: {
          ongoingProjects: ongoingCount,
          readyToMoveProjects: readyCount,
          cities: cities.length,
          cityList: cities,
          totalProjects: ongoingCount + readyCount
        }
      };
    }));

    res.json({ success: true, builders: buildersWithStats });
  } catch (error) {
    console.error('Get Public Builders Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching public builders' });
  }
};
