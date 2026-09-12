import Worker from '../../models/Worker.js';
import { validationResult } from 'express-validator';
import cloudinaryService from '../../services/cloudinaryService.js';
import { createNotification } from '../notificationControllers/notificationController.js';

/**
 * Get worker profile
 */
const getProfile = async (req, res) => {
  try {
    const workerId = req.user.id;

    const worker = await Worker.findById(workerId).select('-password -__v');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    res.status(200).json({
      success: true,
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        approvalStatus: worker.approvalStatus,
        serviceCategories: worker.serviceCategories || [],
        pendingServiceCategories: worker.pendingServiceCategories || [],
        rejectedServiceCategories: worker.rejectedServiceCategories || [],
        skillRequests: worker.skillRequests || [],
        verifiedSkillsDetails: worker.verifiedSkillsDetails || [],
        serviceCategory: worker.serviceCategories?.[0] || '', // Legacy support
        skills: worker.skills || [],
        address: worker.address || null,
        rating: worker.rating || 0,
        totalJobs: worker.totalJobs || 0,
        completedJobs: worker.completedJobs || 0,
        status: worker.status,
        profilePhoto: worker.profilePhoto || null,
        settings: worker.settings || { notifications: true, language: 'en' },
        isPhoneVerified: worker.isPhoneVerified || false,
        isEmailVerified: worker.isEmailVerified || false,
        isOnline: worker.isOnline || false,
        aadhar: worker.aadhar || null,
        panCard: worker.panCard || null,
        drivingLicense: worker.drivingLicense || null,
        digitalIdCard: worker.digitalIdCard || null,
        createdAt: worker.createdAt,
        updatedAt: worker.updatedAt
      }
    });
  } catch (error) {
    console.error('Get worker profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile. Please try again.'
    });
  }
};

/**
 * Update worker profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const workerId = req.user.id;
    const { name, serviceCategories, serviceCategory, skills, address, status, profilePhoto, digitalIdCard, aadharFront, aadharBack, panCard, drivingLicense, skillRequests, skillsMetadata } = req.body;

    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Update fields
    if (name) worker.name = name.trim();

    let newPendingSkillsAdded = [];
    let customSuccessMessage = 'Profile updated successfully';

    // Handle categories with verification flow
    if (serviceCategories !== undefined || serviceCategory !== undefined) {
      const incoming = (serviceCategories && Array.isArray(serviceCategories))
        ? serviceCategories.map(c => typeof c === 'string' ? c.trim() : '').filter(Boolean)
        : (serviceCategory ? [serviceCategory.trim()] : []);

      // If worker is already approved by admin, apply verification workflow
      if (worker.approvalStatus === 'approved') {
        const existingApproved = worker.serviceCategories || [];
        // Only keep categories that were already approved and still selected
        const retainedApproved = incoming.filter(c =>
          existingApproved.some(e => e.toLowerCase() === c.toLowerCase())
        );

        // New categories that need verification
        const newlyAdded = incoming.filter(c =>
          !existingApproved.some(e => e.toLowerCase() === c.toLowerCase())
        );

        worker.serviceCategories = retainedApproved;

        // Current pending categories
        const currentPending = worker.pendingServiceCategories || [];
        // If worker unselected something that was previously pending, remove it; add newly added
        const updatedPending = Array.from(new Set([
          ...currentPending.filter(c => incoming.some(inc => inc.toLowerCase() === c.toLowerCase())),
          ...newlyAdded
        ]));

        worker.pendingServiceCategories = updatedPending;
        newPendingSkillsAdded = newlyAdded;

        if (newlyAdded.length > 0) {
          customSuccessMessage = `Profile updated. New skill(s) [${newlyAdded.join(', ')}] submitted for admin verification. Your existing verified skills remain active.`;

          // Notify Admin
          try {
            await createNotification({
              type: 'worker_skill_pending',
              title: 'New Skill Verification Requested 🛠️',
              message: `Worker ${worker.name} (${worker.phone}) requested verification for new skill(s): ${newlyAdded.join(', ')}.`,
              relatedId: worker._id,
              relatedType: 'worker',
              priority: 'normal',
              adminOnly: true
            });
          } catch (notifErr) {
            console.error('Failed to send admin notification for new worker skill:', notifErr);
          }
        }
      } else {
        // Worker is still pending initial account approval
        worker.serviceCategories = incoming;
        worker.pendingServiceCategories = [];
      }
    }

    // Handle skills metadata (experienceYears, experienceLetter)
    const incomingSkillMeta = skillRequests || skillsMetadata;
    if (incomingSkillMeta) {
      const metaList = Array.isArray(incomingSkillMeta)
        ? incomingSkillMeta
        : Object.entries(incomingSkillMeta).map(([category, data]) => ({ category, ...(typeof data === 'object' ? data : {}) }));

      if (!Array.isArray(worker.skillRequests)) worker.skillRequests = [];

      for (const item of metaList) {
        if (!item.category) continue;
        const catName = typeof item.category === 'string' ? item.category.trim() : '';
        if (!catName) continue;

        let letterUrl = item.experienceLetter || null;
        if (letterUrl && typeof letterUrl === 'string' && letterUrl.startsWith('data:')) {
          try {
            const upRes = await cloudinaryService.uploadFile(letterUrl, { folder: 'workers/documents' });
            if (upRes.success) letterUrl = upRes.url;
          } catch (e) {
            console.error('Failed to upload experience letter:', e);
          }
        }

        const expYears = Number(item.experienceYears) || 0;
        const existingIdx = worker.skillRequests.findIndex(
          r => r.category && r.category.toLowerCase() === catName.toLowerCase()
        );

        if (existingIdx >= 0) {
          worker.skillRequests[existingIdx].experienceYears = expYears;
          if (letterUrl !== undefined) {
            worker.skillRequests[existingIdx].experienceLetter = letterUrl;
          }
          worker.skillRequests[existingIdx].status = 'pending';
          worker.skillRequests[existingIdx].requestedAt = new Date();
        } else {
          worker.skillRequests.push({
            category: catName,
            experienceYears: expYears,
            experienceLetter: letterUrl,
            status: 'pending',
            requestedAt: new Date()
          });
        }
      }
    }

    if (skills && Array.isArray(skills)) worker.skills = skills;
    if (address) {
      worker.address = {
        addressLine1: address.addressLine1 || worker.address?.addressLine1 || '',
        addressLine2: address.addressLine2 || worker.address?.addressLine2 || '',
        city: address.city || worker.address?.city || '',
        state: address.state || worker.address?.state || '',
        pincode: address.pincode || worker.address?.pincode || '',
        landmark: address.landmark || worker.address?.landmark || ''
      };
    }
    if (status) worker.status = status;
    // Update profile photo - upload to Cloudinary if it's a base64 string
    if (profilePhoto !== undefined) {
      if (profilePhoto && profilePhoto.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(profilePhoto, { folder: 'workers/profiles' });
        if (uploadRes.success) {
          worker.profilePhoto = uploadRes.url;
        }
      } else {
        worker.profilePhoto = profilePhoto;
      }
    }

    // Update Digital ID Card
    if (digitalIdCard !== undefined) {
      if (digitalIdCard && digitalIdCard.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(digitalIdCard, { folder: 'workers/documents' });
        if (uploadRes.success) {
          worker.digitalIdCard = uploadRes.url;
        }
      } else {
        worker.digitalIdCard = digitalIdCard;
      }
    }

    // Update Aadhar Front
    if (aadharFront !== undefined) {
      if (aadharFront && aadharFront.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(aadharFront, { folder: 'workers/documents' });
        if (uploadRes.success) {
          if (!worker.aadhar) worker.aadhar = {};
          worker.aadhar.document = uploadRes.url;
        }
      } else {
        if (!worker.aadhar) worker.aadhar = {};
        worker.aadhar.document = aadharFront;
      }
    }

    // Update Aadhar Back
    if (aadharBack !== undefined) {
      if (aadharBack && aadharBack.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(aadharBack, { folder: 'workers/documents' });
        if (uploadRes.success) {
          if (!worker.aadhar) worker.aadhar = {};
          worker.aadhar.backDocument = uploadRes.url;
        }
      } else {
        if (!worker.aadhar) worker.aadhar = {};
        worker.aadhar.backDocument = aadharBack;
      }
    }

    // Update PAN Card
    if (panCard !== undefined) {
      if (panCard && panCard.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(panCard, { folder: 'workers/documents' });
        if (uploadRes.success) {
          if (!worker.panCard) worker.panCard = {};
          worker.panCard.document = uploadRes.url;
        }
      } else {
        if (!worker.panCard) worker.panCard = {};
        worker.panCard.document = panCard;
      }
    }

    // Update Driving License
    if (drivingLicense !== undefined) {
      if (drivingLicense && drivingLicense.startsWith('data:')) {
        const uploadRes = await cloudinaryService.uploadFile(drivingLicense, { folder: 'workers/documents' });
        if (uploadRes.success) {
          if (!worker.drivingLicense) worker.drivingLicense = {};
          worker.drivingLicense.document = uploadRes.url;
        }
      } else {
        if (!worker.drivingLicense) worker.drivingLicense = {};
        worker.drivingLicense.document = drivingLicense;
      }
    }

    if (req.body.settings) {
      worker.settings = {
        notifications: req.body.settings.notifications !== undefined ? req.body.settings.notifications : (worker.settings?.notifications ?? true),
        soundAlerts: req.body.settings.soundAlerts !== undefined ? req.body.settings.soundAlerts : (worker.settings?.soundAlerts ?? true),
        language: req.body.settings.language || worker.settings?.language || 'en'
      };
    }

    await worker.save();

    res.status(200).json({
      success: true,
      message: customSuccessMessage,
      newSkillsPending: newPendingSkillsAdded.length > 0,
      newlyAddedSkills: newPendingSkillsAdded,
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        approvalStatus: worker.approvalStatus,
        serviceCategories: worker.serviceCategories,
        pendingServiceCategories: worker.pendingServiceCategories || [],
        rejectedServiceCategories: worker.rejectedServiceCategories || [],
        skillRequests: worker.skillRequests || [],
        verifiedSkillsDetails: worker.verifiedSkillsDetails || [],
        serviceCategory: worker.serviceCategories?.[0] || '',
        skills: worker.skills,
        address: worker.address,
        rating: worker.rating,
        totalJobs: worker.totalJobs,
        completedJobs: worker.completedJobs,
        status: worker.status,
        profilePhoto: worker.profilePhoto, // Include in response
        aadhar: worker.aadhar || null,
        panCard: worker.panCard || null,
        drivingLicense: worker.drivingLicense || null,
        digitalIdCard: worker.digitalIdCard || null,
        settings: worker.settings,
        isPhoneVerified: worker.isPhoneVerified,
        isEmailVerified: worker.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Update worker profile error:', error);
    res.status(500).json({
      success: false,
      message: error.stack
    });
  }
};

/**
 * Update worker real-time location (called periodically when online)
 */
const updateLocation = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    // Update both location formats:
    // - location: simple lat/lng for display
    // - geoLocation: GeoJSON Point for 2dsphere spatial queries (booking matching)
    await Worker.findByIdAndUpdate(workerId, {
      location: { lat, lng, updatedAt: new Date() },
      geoLocation: {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON format: [longitude, latitude]
      },
      lastSeenAt: new Date()
    });

    res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Toggle worker online/offline status
 * When going ONLINE: requires lat/lng to set current position
 * When going OFFLINE: clears online status
 */
const toggleOnline = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { isOnline, lat, lng } = req.body;

    const updateData = {
      isOnline: !!isOnline,
      lastSeenAt: new Date()
    };

    // When going online, also update live location
    if (isOnline && lat !== undefined && lng !== undefined) {
      updateData.location = { lat, lng, updatedAt: new Date() };
      updateData.geoLocation = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }





    const worker = await Worker.findByIdAndUpdate(workerId, updateData, { new: true })
      .select('isOnline geoLocation location');

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    console.log(`[Worker] ${workerId} is now ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}${isOnline ? ` at [${lat}, ${lng}]` : ''}`);

    res.status(200).json({
      success: true,
      message: isOnline ? 'You are now online! You will receive job alerts.' : 'You are now offline.',
      data: { isOnline: worker.isOnline }
    });
  } catch (error) {
    console.error('Toggle online error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get worker referrals
 */
const getReferrals = async (req, res) => {
  try {
    const workerId = req.user.id;
    const worker = await Worker.findById(workerId);
    
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const referredWorkers = await Worker.find({ referredBy: workerId })
      .select('name phone status approvalStatus createdAt profilePhoto')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        referralCode: worker.referralCode,
        totalReferrals: referredWorkers.length,
        referrals: referredWorkers
      }
    });
  } catch (error) {
    console.error('Get worker referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrals'
    });
  }
};

export { 
  getProfile,
  updateProfile,
  updateLocation,
  toggleOnline,
  getReferrals
 };
