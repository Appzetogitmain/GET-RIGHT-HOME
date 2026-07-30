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

// @desc    Get pending builders
// @route   GET /api/admin/builders/pending
// @access  Private (Admin/Manager)
export const getPendingBuilders = async (req, res) => {
  try {
    const builders = await User.find({ 
      role: 'builder',
      'builderProfile.approvalStatus': { $in: ['pending', null, undefined] } 
    }).sort({ createdAt: -1 });
    res.json({ success: true, builders });
  } catch (error) {
    console.error('Get Pending Builders Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching pending builders' });
  }
};

// @desc    Verify builder
// @route   PUT /api/admin/builders/:id/verify
// @access  Private (Admin/Manager)
export const verifyBuilder = async (req, res) => {
  try {
    const { status, message } = req.body;
    const builder = await User.findById(req.params.id);
    if (!builder || builder.role !== 'builder') {
      return res.status(404).json({ success: false, message: 'Builder not found' });
    }

    builder.builderProfile = {
      ...(builder.builderProfile ? builder.builderProfile.toObject() : {}),
      approvalStatus: status,
      verificationMessage: message || ''
    };

    await builder.save();
    res.json({ success: true, builder, message: `Builder ${status} successfully` });
  } catch (error) {
    console.error('Verify Builder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error verifying builder' });
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
    const builder = await User.findById(req.params.id).select('name email phone role builderProfile companyName createdAt');
    if (!builder) {
      return res.status(404).json({ success: false, message: 'Builder not found' });
    }

    // 1. Fetch all properties/projects by this builder
    const projects = await Property.find({
      $or: [{ userId: builder._id }, { partnerId: builder._id }],
      status: 'approved'
    }).populate('builderProjectDetails').lean();

    // 2. Extract operational cities list
    const cityList = [...new Set(projects.map(p => p.address?.city).filter(Boolean))];

    // 3. Categorize Projects into Ongoing vs Ready To Move
    let ongoingCount = 0;
    let readyToMoveCount = 0;

    const formattedProjects = projects.map(p => {
      const bpd = p.builderProjectDetails || {};
      const statusText = String(bpd.possessionStatus || p.dynamicData?.availabilityStatus || p.dynamicData?.possessionStatus || p.possessionStatus || '').toLowerCase();
      
      let isReadyToMove = statusText.includes('ready') || statusText.includes('delivered') || statusText.includes('completed');
      if (isReadyToMove) {
        readyToMoveCount++;
      } else {
        ongoingCount++;
      }

      let rawPrice = p.startingPrice || p.minPrice || p.buyDetails?.expectedPrice || p.dynamicData?.price || p.dynamicData?.expectedPrice || p.dynamicData?.minPrice || p.expectedPrice || null;

      if (!rawPrice && p.dynamicData?.floorPlans && p.dynamicData.floorPlans.length > 0) {
        const prices = p.dynamicData.floorPlans.map(fp => Number(fp.price)).filter(val => !isNaN(val) && val > 0);
        if (prices.length > 0) {
          rawPrice = Math.min(...prices);
        }
      }

      let formattedPriceStr = 'Contact for Price';
      if (rawPrice && !isNaN(Number(rawPrice))) {
        const num = Number(rawPrice);
        if (num >= 10000000) {
          formattedPriceStr = `₹ ${(num / 10000000).toFixed(2)} Cr`;
        } else if (num >= 100000) {
          formattedPriceStr = `₹ ${(num / 100000).toFixed(2)} Lac`;
        } else {
          formattedPriceStr = `₹ ${num.toLocaleString('en-IN')}`;
        }
      }

      return {
        _id: p._id,
        propertyName: p.propertyName || p.projectName,
        propertyType: p.propertyType || p.propertyCategory,
        city: p.address?.city || '',
        area: p.address?.area || p.address?.district || '',
        fullAddress: p.address?.fullAddress || '',
        status: isReadyToMove ? 'Ready to move' : 'Ongoing',
        possessionYear: bpd.possessionYear || p.dynamicData?.possessionYear || p.expectedBy || '2027',
        possessionText: isReadyToMove 
          ? `Ready to move since ${bpd.possessionYear || '2026'}`
          : `Possession in ${bpd.possessionYear || p.dynamicData?.possessionYear || '2028'}`,
        startingPrice: rawPrice,
        priceRangeText: p.dynamicPriceText || formattedPriceStr,
        coverImage: p.coverImage || p.logo || p.propertyImages?.[0] || 'https://images.pexels.com/photos/34590984/pexels-photo-34590984.jpeg',
        logo: p.logo || builder.builderProfile?.logo || builder.builderProfile?.brandLogo || '',
        bhkText: p.bhk ? `${p.bhk} BHK` : (p.dynamicData?.bedrooms ? `${p.dynamicData.bedrooms} BHK` : 'Apartment'),
        constructionQualityRating: bpd.ratings?.constructionQuality || 4.5
      };
    });

    const industryExperience = builder.builderProfile?.experienceYears || builder.builderProfile?.experience || 8;

    res.json({
      success: true,
      builder: {
        _id: builder._id,
        name: builder.name || builder.companyName || 'Emerald Developers',
        companyName: builder.companyName || builder.name,
        phone: builder.phone || builder.builderProfile?.phone || '+91 8884976767',
        logo: builder.builderProfile?.logo || builder.builderProfile?.brandLogo || '',
        coverImage: builder.builderProfile?.coverImage || builder.builderProfile?.banner || '',
        description: builder.builderProfile?.description || builder.builderProfile?.about || 'Leading Real Estate Developer focused on premium projects.',
        experienceYears: industryExperience,
        kycStatus: builder.builderProfile?.approvalStatus || 'verified',
        stats: {
          totalProjects: formattedProjects.length,
          ongoingProjects: ongoingCount,
          readyToMoveProjects: readyToMoveCount,
          totalCities: cityList.length,
          cityList
        },
        projects: formattedProjects
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
