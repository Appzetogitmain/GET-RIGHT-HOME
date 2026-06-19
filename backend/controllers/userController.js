import User from '../models/User.js';
import Partner from '../models/Partner.js';
import bcrypt from 'bcryptjs';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        partnerSince: user.partnerSince,
        isVip: user.isVip || false,
        vipExpiry: user.vipExpiry || null
      };
      res.json({
        success: true,
        user: userData,
        // Also spread fields at root level for backward compatibility
        ...userData
      });
    } else {
      // Check if it's a partner
      const partner = await Partner.findById(req.user._id);
      if (partner) {
        const partnerData = {
          _id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          role: partner.role,
          isPartner: partner.isPartner,
          partnerApprovalStatus: partner.partnerApprovalStatus,
          profileImage: partner.profileImage,
          createdAt: partner.createdAt,
          partnerSince: partner.partnerSince,
          address: partner.address,
          aadhaarNumber: partner.aadhaarNumber,
          panNumber: partner.panNumber
        };
        res.json({
          success: true,
          user: partnerData,
          ...partnerData
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get checkout data (user profile + app settings)
// @route   GET /api/users/checkout-data
// @access  Private
export const getCheckoutData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addresses: user.addresses || [],
        isVip: user.isVip || false,
        vipExpiry: user.vipExpiry || null,
        plans: user.plans || null
      },
      settings: {
        visitedCharges: 29,
        serviceGstPercentage: 18
      },
      bookingModel: 'worker'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    let isPartner = false;

    if (!user) {
      user = await Partner.findById(req.user._id);
      isPartner = true;
    }

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.email) user.email = req.body.email;
      if (req.body.phone) user.phone = req.body.phone;

      if (req.body.password) {
        user.password = await bcrypt.hash(req.body.password, 10);
      }

      if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;
      if (req.body.profileImagePublicId !== undefined) user.profileImagePublicId = req.body.profileImagePublicId;
      if (req.body.isVip !== undefined) user.isVip = req.body.isVip;
      if (req.body.vipExpiry !== undefined) user.vipExpiry = req.body.vipExpiry;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isPartner: isPartner ? updatedUser.isPartner : user.isPartner,
        profileImage: updatedUser.profileImage,
        createdAt: updatedUser.createdAt,
        partnerSince: updatedUser.partnerSince,
        isVip: updatedUser.isVip || false,
        vipExpiry: updatedUser.vipExpiry || null,
        token: req.headers.authorization.split(' ')[1] // Keep existing token
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get user's saved hotels
 * @route   GET /api/users/saved-hotels
 * @access  Private
 */
export const getSavedHotels = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedHotels',
      select: 'propertyName address coverImage avgRating totalReviews minPrice propertyType status isLive',
      match: { status: 'approved' } // Only return approved hotels
    });

    if (!user) {
      return res.json({
        success: true,
        savedHotels: []
      });
    }

    // Get minimum prices for these properties
    const savedHotelIds = user.savedHotels.map(h => h._id);
    const RoomType = (await import('../models/RoomType.js')).default;

    const priceMap = await RoomType.aggregate([
      { $match: { propertyId: { $in: savedHotelIds }, isActive: true } },
      { $group: { _id: '$propertyId', minPrice: { $min: '$pricePerNight' } } }
    ]);

    const prices = {};
    priceMap.forEach(p => {
      prices[p._id.toString()] = p.minPrice;
    });

    // Format the response to match PropertyCard expectations
    const savedHotels = user.savedHotels.map(hotel => ({
      _id: hotel._id,
      propertyName: hotel.propertyName,
      address: hotel.address, // Pass full address object
      coverImage: hotel.coverImage,
      propertyType: hotel.propertyType,
      avgRating: hotel.avgRating,
      totalReviews: hotel.totalReviews,
      minPrice: prices[hotel._id.toString()] || hotel.minPrice || 0,
      status: hotel.status
    }));

    res.json({
      success: true,
      savedHotels
    });

  } catch (error) {
    console.error('Get Saved Hotels Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Toggle Saved Hotel (Wishlist)
 * @route   POST /api/users/saved-hotels/:id
 * @access  Private
 */
export const toggleSavedHotel = async (req, res) => {
  try {
    const hotelId = req.params.id;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(403).json({ message: 'Only standard users can save properties' });
    }

    // Check if hotel is already saved
    const isSaved = user.savedHotels.some(id => id.toString() === hotelId);

    if (isSaved) {
      // Remove
      user.savedHotels = user.savedHotels.filter(id => id.toString() !== hotelId);
    } else {
      // Add
      user.savedHotels.push(hotelId);
    }

    await user.save();

    res.json({
      success: true,
      message: isSaved ? 'Removed from saved' : 'Added to saved',
      savedHotels: user.savedHotels
    });

  } catch (error) {
    console.error('Toggle Saved Hotel Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update FCM Token
// @route   POST /api/users/fcm-token
// @access  Private
export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'Please provide FCM token' });
    }

    const targetPlatform = platform === 'app' ? 'app' : 'web';

    // Try to find user first
    let user = await User.findById(req.user._id);

    // If not found, check Partner model
    if (!user) {
      user = await Partner.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.fcmTokens) {
      user.fcmTokens = {
        app: null,
        web: null
      };
    }

    // Update the token for the specific platform
    user.fcmTokens[targetPlatform] = fcmToken;
    await user.save();

    res.json({
      success: true,
      message: `FCM token updated successfully for ${targetPlatform} platform`,
      data: {
        platform: targetPlatform,
        tokenUpdated: true
      }
    });

  } catch (error) {
    console.error('Update FCM Token Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/users/notifications
 * @access  Private
 */
export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const Notification = (await import('../models/Notification.js')).default;

    // Create filter for the current user
    const filter = {
      userId: req.user._id,
      userType: req.user.role === 'partner' ? 'partner' : 'user'
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.json({
      success: true,
      notifications,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Initialize/Mark Notification as Read (optional, but requested implicitly functionality usually goes with this)
 * @route   PUT /api/users/notifications/:id/read
 * @access  Private
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const Notification = (await import('../models/Notification.js')).default;

    const notification = await Notification.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    await notification.save();

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Mark Read Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete Notifications (Single or Bulk)
 * @route   DELETE /api/users/notifications
 * @access  Private
 * @body    { ids: ["id1", "id2"] } or implicit query for single
 */
export const deleteNotifications = async (req, res) => {
  try {
    const { ids } = req.body;
    const Notification = (await import('../models/Notification.js')).default;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No notification IDs provided' });
    }

    const result = await Notification.deleteMany({
      _id: { $in: ids },
      userId: req.user._id
    }); // end deleteMany

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Delete Notifications Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Mark All Notifications as Read
 * @route   PUT /api/users/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const Notification = (await import('../models/Notification.js')).default;

    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
/**
 * @desc    Update user role (Owner/Broker)
 * @route   PUT /api/users/role
 * @access  Private
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role, builderData } = req.body;
    if (!['owner', 'broker', 'builder'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be owner, broker or builder.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    
    if (role === 'builder' && builderData) {
      user.builderProfile = {
        companyName: builderData.companyName || '',
        reraRegistrationNumber: builderData.reraRegistrationNumber || '',
        gstNumber: builderData.gstNumber || ''
      };
    }

    await user.save();

    res.json({
      success: true,
      message: `Role updated to ${role} successfully`,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        builderProfile: user.builderProfile
      }
    });
  } catch (error) {
    console.error('Update User Role Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Validate promo code (e.g. First Booking)
 * @route   POST /api/users/validate-promo
 * @access  Private
 */
export const validatePromo = async (req, res) => {
  try {
    const { code, cityId, serviceType } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required' });
    }

    // 1. Check HomeContent for first booking promo
    const HomeContent = (await import('../models/HomeContent.js')).default;
    const homeContent = await HomeContent.findOne(cityId ? { cityId } : {});
    
    if (!homeContent) {
      return res.status(404).json({ success: false, message: 'No promotions available for this city' });
    }

    // Is it the first booking code?
    if (homeContent.isFirstBookingVisible && homeContent.firstBookingCode && code.toUpperCase() === homeContent.firstBookingCode.toUpperCase()) {
      const Booking = (await import('../models/Booking.js')).default;
      const bookingCount = await Booking.countDocuments({ 
        userId: req.user._id, 
        bookingStatus: { $nin: ['cancelled', 'rejected', 'no_show', 'CANCELLED', 'no_vendors'] } 
      });

      console.log(`[PROMO] User: ${req.user._id}, Service: ${serviceType}, Bookings Found: ${bookingCount}`);

      if (bookingCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'This promo code is only valid for your first booking.' 
        });
      }

      // Valid first booking promo!
      return res.json({
        success: true,
        message: 'Promo code applied successfully!',
        discountPercentage: homeContent.firstBookingDiscount || 10,
        promoType: 'first_booking',
        code: homeContent.firstBookingCode
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid or expired promo code' });

  } catch (error) {
    console.error('Validate Promo Error:', error);
    res.status(500).json({ success: false, message: 'Server error validating promo' });
  }
};
