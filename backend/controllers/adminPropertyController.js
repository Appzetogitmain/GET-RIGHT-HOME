import Property from '../models/Property.js';
import User from '../models/User.js';

// Get all properties for featured management
export const getAdminFeaturedProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isFeatured === 'true') {
      query['featuredDetails.isFeatured'] = true;
    }

    const properties = await Property.find(query)
      .populate('userId', 'name email role')
      .populate('partnerId', 'name email role')
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
    const { isFeatured, planType, durationDays, adminNotes } = req.body;

    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    if (!property.featuredDetails) {
      property.featuredDetails = {};
    }

    property.isFeatured = isFeatured; // Sync backward compatibility
    property.featuredDetails.isFeatured = isFeatured;
    property.featuredDetails.planType = planType || 'None';
    property.featuredDetails.adminNotes = adminNotes || '';

    if (isFeatured) {
      property.featuredDetails.startDate = new Date();
      if (durationDays) {
        property.featuredDetails.durationDays = durationDays;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        property.featuredDetails.endDate = endDate;
      } else {
        // Infinite duration if not provided
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
