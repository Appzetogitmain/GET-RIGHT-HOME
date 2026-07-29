import mongoose from 'mongoose';
import Property from '../models/Property.js';
import Project from '../models/Project.js';
import RoomType from '../models/RoomType.js';
import PropertyCategory from '../models/PropertyCategory.js';
import PropertyDocument from '../models/PropertyDocument.js';
import BuilderProjectDetails from '../models/BuilderProjectDetails.js';
import Partner from '../models/Partner.js';
import { PROPERTY_DOCUMENTS } from '../config/propertyDocumentRules.js';
import emailService from '../services/emailService.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Booking from '../models/Booking.js';
import Enquiry from '../models/Enquiry.js';

const notifyAdminOfNewProperty = async (property) => {
  try {
    const admin = await Admin.findOne({ role: { $in: ['admin', 'superadmin'] } });
    if (admin && admin.email) {
      await emailService.sendAdminNewPropertyEmail(admin.email, property);
    }
  } catch (err) {
    console.warn('Could not notify admin about property:', err.message);
  }
};

export const getPublicBuilders = async (req, res) => {
  try {
    const { locality } = req.query;
    
    if (locality) {
      // Aggregate builders based on properties in this locality
      const regexLocality = new RegExp(`^${locality}$`, 'i');
      const sellerAggregation = await Property.aggregate([
          { $match: { 'address.area': regexLocality, status: 'Active', userId: { $exists: true } } },
          { $group: { _id: "$userId", propertyCount: { $sum: 1 } } },
          { $sort: { propertyCount: -1 } }
      ]);

      if (sellerAggregation.length > 0) {
          const sellerIds = sellerAggregation.map(s => s._id);
          const users = await User.find({ _id: { $in: sellerIds }, role: 'builder' }).select('name builderProfile profilePicture');
          
          let builders = users.map(u => {
              const agg = sellerAggregation.find(s => s._id.toString() === u._id.toString());
              return {
                  _id: u._id,
                  name: u.name,
                  brandLogo: u.profilePicture,
                  profile: u.builderProfile,
                  cityProjects: agg ? agg.propertyCount : 0,
                  totalProjects: agg ? agg.propertyCount : 0 // Adjust if needed
              };
          }).sort((a, b) => b.cityProjects - a.cityProjects);

          return res.json({ success: true, builders });
      }
    }

    const builders = await User.find({ role: 'builder' }).select('name builderProfile profilePicture').sort({ createdAt: -1 });
    const formattedBuilders = builders.map(b => ({
      _id: b._id,
      name: b.name,
      brandLogo: b.profilePicture,
      profile: b.builderProfile
    }));
    res.json({ success: true, builders: formattedBuilders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching builders' });
  }
};

export const syncBuilderProjectDetails = async (propertyId, dynamicData) => {
  if (!dynamicData) return;

  const getVal = (key) => {
    if (typeof dynamicData.get === 'function') return dynamicData.get(key);
    return dynamicData[key];
  };

  const possessionStatus = getVal('bpd_possessionStatus') || getVal('possessionStatus');
  const possessionYear = getVal('bpd_possessionYear') || getVal('possessionYear');
  const constructionQuality = getVal('bpd_constructionQuality') || getVal('constructionQuality');
  const aiSummary = getVal('bpd_aiSummary') || getVal('aiSummary');
  const currentPricePerSqft = getVal('bpd_currentPricePerSqft') || getVal('currentPricePerSqft');
  const appreciationLast3Years = getVal('bpd_appreciationLast3Years') || getVal('appreciationLast3Years');

  const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  };

  const parsedPossessionYear = parseNum(possessionYear);
  const parsedConstructionQuality = parseNum(constructionQuality);
  const parsedCurrentPricePerSqft = parseNum(currentPricePerSqft);
  const parsedAppreciationLast3Years = parseNum(appreciationLast3Years);

  if (possessionStatus || parsedPossessionYear || parsedConstructionQuality || aiSummary || parsedCurrentPricePerSqft || parsedAppreciationLast3Years) {
    const details = {
      propertyId,
      possessionStatus: possessionStatus || undefined,
      possessionYear: parsedPossessionYear,
      ratings: {
        constructionQuality: parsedConstructionQuality,
        aiSummary: aiSummary || undefined
      },
      priceHistory: {
        currentPricePerSqft: parsedCurrentPricePerSqft,
        appreciationLast3Years: parsedAppreciationLast3Years
      }
    };
    await BuilderProjectDetails.findOneAndUpdate(
      { propertyId },
      details,
      { upsert: true, new: true }
    );
  } else {
    await BuilderProjectDetails.deleteOne({ propertyId });
  }
};

export const createProperty = async (req, res) => {
  try {
    const isPartner = req.user.role === 'partner';
    const isUser = ['user', 'owner', 'broker', 'builder'].includes(req.user.role);
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    let partner = null;
    let uDoc = null;
    let maxAllowed = Infinity;
    let isSubscriptionRequired = false;

    if (isPartner) {
      isSubscriptionRequired = true;
      partner = await Partner.findById(req.user._id).populate('subscription.planId');
      if (!partner) return res.status(404).json({ message: 'Partner not found' });
    } else if (['owner', 'broker', 'builder'].includes(req.user.role)) {
      isSubscriptionRequired = true;
      uDoc = await User.findById(req.user._id).populate('subscription.planId');
      if (!uDoc) return res.status(404).json({ message: 'User not found' });
    }

    if (isSubscriptionRequired) {
      const subject = partner || uDoc;
      const { subscription } = subject;
      const isSubscriptionActive =
        subscription?.status === 'active' &&
        subscription?.expiryDate &&
        new Date(subscription.expiryDate) > new Date();

      let isFreeTrialMode = false;

      if (isSubscriptionActive) {
        maxAllowed = subscription.planId?.maxProperties || 1;
      } else {
        // Free Trial Mode: Use PlatformSettings to determine listing limit
        const PlatformSettings = (await import('../models/PlatformSettings.js')).default;
        const settings = await PlatformSettings.getSettings();
        maxAllowed = settings.freeTrialListingLimit || 10;
        isFreeTrialMode = true;

        // Also check free trial duration
        const trialDays = settings.freeTrialDurationDays || 30;
        const createdAt = subject.createdAt || subject.partnerSince || new Date();
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        if (new Date() > trialEndDate) {
          return res.status(403).json({
            message: `Your free trial period of ${trialDays} days has expired. Please subscribe to a plan to continue listing properties.`,
            trialExpired: true,
            limitReached: true
          });
        }
      }

      // Count properties listed by this actor
      const query = { userId: req.user._id };
      query.status = { $ne: 'deleted' };

      const currentPropertyCount = await Property.countDocuments(query);

      if (currentPropertyCount >= maxAllowed) {
        return res.status(403).json({
          message: isFreeTrialMode
            ? `Free trial limit reached. You can add up to ${maxAllowed} properties during your trial. Please subscribe to add more.`
            : `Property limit reached. Your plan allows ${maxAllowed} properties. Please upgrade your subscription.`,
          limitReached: true,
          currentCount: currentPropertyCount,
          maxAllowed: maxAllowed,
          isFreeTrialMode
        });
      }
    }

    const { propertyName, contactNumber, propertyType, propertyCategory, dynamicData, description, shortDescription, logo, coverImage, propertyImages, amenities, highlights, topAmenities, otherAmenities, address, location, nearbyPlaces, checkInTime, checkOutTime, cancellationPolicy, houseRules, documents, roomTypes, pgType, hostelType, hostLivesOnProperty, familyFriendly, resortType, activities, hotelCategory, starRating, dynamicCategory, pgDetails, rentDetails, plotDetails, buyDetails, status } = req.body;
    
    // Extract and fallback fields from dynamicData if root is empty
    const finalPropertyName = propertyName || (dynamicData && dynamicData.propertyName) || `${propertyCategory || 'Residential'} ${propertyType} for ${req.body.transactionType || 'Sell'}`;
    
    // Basic validation
    if (!finalPropertyName || !propertyType) return res.status(400).json({ message: 'Missing required fields: propertyName or propertyType' });

    const lowerType = propertyType.toLowerCase();
    const requiredDocs = PROPERTY_DOCUMENTS[lowerType] || [];
    
    const nearbyPlacesArray = Array.isArray(nearbyPlaces) && nearbyPlaces.length > 0 
      ? nearbyPlaces 
      : (dynamicData && Array.isArray(dynamicData.nearbyPlaces) ? dynamicData.nearbyPlaces : []);
      
    const finalAmenities = (amenities && amenities.length > 0) ? amenities : (dynamicData && Array.isArray(dynamicData.amenities) ? dynamicData.amenities : []);
    const finalHighlights = (highlights && highlights.length > 0) ? highlights : (dynamicData && Array.isArray(dynamicData.highlights) ? dynamicData.highlights : []);
    
    // Auto-split amenities into topAmenities (first 6) and otherAmenities (rest) if not explicitly provided
    let finalTopAmenities = (topAmenities && topAmenities.length > 0) ? topAmenities : (dynamicData && Array.isArray(dynamicData.topAmenities) ? dynamicData.topAmenities : []);
    let finalOtherAmenities = (otherAmenities && otherAmenities.length > 0) ? otherAmenities : (dynamicData && Array.isArray(dynamicData.otherAmenities) ? dynamicData.otherAmenities : []);
    if (finalTopAmenities.length === 0 && finalAmenities.length > 0) {
      finalTopAmenities = finalAmenities.slice(0, 6);
      finalOtherAmenities = finalAmenities.slice(6);
    }
    
    const propertyImagesArray = Array.isArray(propertyImages) && propertyImages.length > 0 
      ? propertyImages 
      : (dynamicData && Array.isArray(dynamicData.propertyImages) ? dynamicData.propertyImages : []);
    
    let finalLogo = logo || (dynamicData && dynamicData.logo) || '';
    if (!finalLogo && propertyImagesArray.length > 0) {
      finalLogo = propertyImagesArray[0];
    }
    
    const coverImageValue = coverImage || (dynamicData && dynamicData.coverImage) || (propertyImagesArray.length > 0 ? propertyImagesArray[0] : '');
    
    const addressValue = address || {
      city: (dynamicData && dynamicData.city) || '',
      locality: (dynamicData && dynamicData.locality) || '',
      state: (dynamicData && dynamicData.state) || '',
      fullAddress: (dynamicData && (dynamicData.fullAddress || `${dynamicData.locality || ''}, ${dynamicData.city || ''}`)) || ''
    };

    const finalDescription = description || (dynamicData && (dynamicData.description || dynamicData.detailsOfProperty)) || '';
    const finalShortDescription = shortDescription || (dynamicData && dynamicData.shortDescription) || '';

    const docsArray = Array.isArray(documents) ? documents : [];
    const dynamicCategoryId = dynamicCategory && mongoose.Types.ObjectId.isValid(dynamicCategory) ? new mongoose.Types.ObjectId(dynamicCategory) : undefined;

    let finalContactNumber = contactNumber || '';
    if (typeof finalContactNumber === 'string') finalContactNumber = finalContactNumber.trim();
    
    if (!finalContactNumber && dynamicData) {
      const keys = ['contactNumber', 'mobileNumber', 'phone', 'mobile', 'phoneNumber'];
      for (const k of keys) {
        if (dynamicData[k]) {
          finalContactNumber = String(dynamicData[k]).trim();
          break;
        }
      }
    }

    if (!finalContactNumber) {
      finalContactNumber = req.user?.phone || req.user?.phoneNumber || req.user?.mobile || '';
    }

    let locationValue = (location && location.coordinates && location.coordinates.length > 0) ? location : undefined;
    if (!locationValue && dynamicData && dynamicData.location) {
      locationValue = dynamicData.location;
    }
    if (!locationValue) {
      locationValue = { type: 'Point', coordinates: [0, 0] };
    }

    const isProjectListing = Boolean(
      req.body.isProject || 
      req.user.role === 'builder' || 
      (propertyCategory || '').toLowerCase().includes('project') || 
      (propertyType || '').toLowerCase().includes('project') || 
      (dynamicData && (dynamicData.builderProjectDetails || dynamicData.builderName || (Array.isArray(dynamicData.towers) && dynamicData.towers.length > 0)))
    );

    const doc = new Property({
      propertyName: finalPropertyName,
      contactNumber: finalContactNumber,
      propertyType, // Save exactly as received (e.g. "Apartment")
      transactionType: req.body.transactionType,
      propertyCategory: propertyCategory || 'Residential',
      dynamicData: dynamicData || {},
      status: status || 'pending',
      description: finalDescription,
      shortDescription: finalShortDescription,

      userId: (isUser || isAdmin) ? req.user._id : null,
      isAddedByUser: isUser,
      isAddedByAdmin: isAdmin,
      isProject: isProjectListing,
      listingType: isProjectListing ? 'project' : 'property',
      address: addressValue,
      location: locationValue,
      nearbyPlaces: nearbyPlacesArray,
      amenities: finalAmenities,
      highlights: finalHighlights,
      topAmenities: finalTopAmenities,
      otherAmenities: finalOtherAmenities,
      logo: finalLogo,
      coverImage: coverImageValue,
      propertyImages: propertyImagesArray,
      checkInTime,
      checkOutTime,
      cancellationPolicy,
      houseRules,
      dynamicCategory: dynamicCategoryId,
      pgType: lowerType === 'pg' ? pgType : undefined,
      pgDetails: lowerType === 'pg' ? pgDetails : undefined,
      hostelType: lowerType === 'hostel' ? hostelType : undefined,
      hostLivesOnProperty: lowerType === 'homestay' ? hostLivesOnProperty : undefined,
      familyFriendly: lowerType === 'homestay' ? familyFriendly : undefined,
      resortType: lowerType === 'resort' ? resortType : undefined,
      activities: lowerType === 'resort' ? activities : undefined,
      hotelCategory: lowerType === 'hotel' ? hotelCategory : undefined,
      starRating: lowerType === 'hotel' ? starRating : undefined,
      rentDetails: lowerType === 'rent' ? rentDetails : undefined,
      plotDetails: lowerType === 'plot' ? plotDetails : undefined,
      buyDetails: lowerType === 'buy' ? buyDetails : undefined
    });

    await syncBuilderProjectDetails(doc._id, doc.dynamicData);
    await doc.save();

    // Inline RoomTypes if provided
    if (Array.isArray(roomTypes) && roomTypes.length > 0) {
      await RoomType.insertMany(
        roomTypes.map(rt => ({
          ...rt,
          propertyId: doc._id,
          isActive: true
        }))
      );
    }

    if (docsArray.length) {
      await PropertyDocument.findOneAndUpdate(
        { propertyId: doc._id },
        {
          propertyType: lowerType,
          documents: docsArray.map(d => ({
            type: d.type,
            name: d.name || d.type,
            fileUrl: d.fileUrl,
            isRequired: requiredDocs.includes(d.name || d.type),
          })),
          verificationStatus: 'pending'
        },
        { new: true, upsert: true }
      );
      doc.status = 'pending';
      doc.isLive = false;
      await doc.save();
    }

    if (Array.isArray(roomTypes) && roomTypes.length > 0 && doc.status === 'draft') {
      doc.status = 'pending';
      await doc.save();
    }

    if (doc.status === 'pending') {
      notifyAdminOfNewProperty(doc).catch(e => console.error(e));
    }

    if (isPartner && partner) {
      partner.subscription.propertiesAdded = (partner.subscription.propertiesAdded || 0) + 1;
      partner.totalListingsCount = (partner.totalListingsCount || 0) + 1;
      await partner.save();
    } else if (req.user && req.user._id) {
      const activeUser = uDoc || await User.findById(req.user._id);
      if (activeUser) {
        if (['owner', 'broker', 'builder'].includes(activeUser.role)) {
          if (!activeUser.subscription) {
            activeUser.subscription = {};
          }
          activeUser.subscription.propertiesAdded = (activeUser.subscription.propertiesAdded || 0) + 1;
        }
        activeUser.totalListingsCount = (activeUser.totalListingsCount || 0) + 1;
        await activeUser.save();
      }
    }

    res.status(201).json({ success: true, property: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.userId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const updatableFields = [
      'propertyName',
      'description',
      'shortDescription',
      'address',
      'location',
      'nearbyPlaces',
      'amenities',
      'highlights',
      'topAmenities',
      'otherAmenities',
      'logo',
      'coverImage',
      'propertyImages',
      'checkInTime',
      'checkOutTime',
      'cancellationPolicy',
      'houseRules',
      'dynamicCategory',
      'pgType',
      'pgDetails',
      'rentDetails',
      'plotDetails',
      'buyDetails',
      'hostLivesOnProperty',
      'familyFriendly',
      'resortType',
      'activities',
      'hotelCategory',
      'starRating',
      'contactNumber',
      'isLive',
      'dynamicData'
    ];

    updatableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        property[field] = payload[field];
      }
    });

    // Sync root fields if dynamicData is updated
    if (Object.prototype.hasOwnProperty.call(payload, 'dynamicData') && payload.dynamicData) {
      const dd = payload.dynamicData;
      if (dd.propertyName) {
        property.propertyName = dd.propertyName;
      }
      if (dd.description || dd.detailsOfProperty) {
        property.description = dd.description || dd.detailsOfProperty;
      }
      if (dd.shortDescription) {
        property.shortDescription = dd.shortDescription;
      }
      if (dd.nearbyPlaces && Array.isArray(dd.nearbyPlaces)) {
        property.nearbyPlaces = dd.nearbyPlaces;
      }
      if (dd.amenities && Array.isArray(dd.amenities)) {
        property.amenities = dd.amenities;
        // Auto-split into topAmenities / otherAmenities if not explicitly provided
        if (!dd.topAmenities || !dd.topAmenities.length) {
          property.topAmenities = dd.amenities.slice(0, 6);
          property.otherAmenities = dd.amenities.slice(6);
        }
      }
      if (dd.highlights && Array.isArray(dd.highlights)) {
        property.highlights = dd.highlights;
      }
      if (dd.topAmenities && Array.isArray(dd.topAmenities)) {
        property.topAmenities = dd.topAmenities;
      }
      if (dd.otherAmenities && Array.isArray(dd.otherAmenities)) {
        property.otherAmenities = dd.otherAmenities;
      }
      if (dd.propertyImages && Array.isArray(dd.propertyImages) && dd.propertyImages.length > 0) {
        property.propertyImages = dd.propertyImages;
        if (!property.coverImage || dd.coverImage) {
          property.coverImage = dd.coverImage || dd.propertyImages[0];
        }
        if (!property.logo || dd.logo) {
          property.logo = dd.logo || property.propertyImages[0];
        }
      }
      if (dd.city || dd.locality) {
        property.address = {
          city: dd.city || property.address?.city || '',
          locality: dd.locality || property.address?.locality || '',
          state: dd.state || property.address?.state || '',
          fullAddress: dd.fullAddress || property.address?.fullAddress || `${dd.locality || ''}, ${dd.city || ''}`
        };
      }
      if (dd.contactNumber || dd.mobileNumber || dd.phone || dd.mobile || dd.phoneNumber) {
        property.contactNumber = dd.contactNumber || dd.mobileNumber || dd.phone || dd.mobile || dd.phoneNumber;
      }
      if (dd.location) {
        property.location = dd.location;
      }
    }

    if (typeof property.contactNumber === 'string') {
      property.contactNumber = property.contactNumber.trim();
    }
    if (!property.contactNumber) {
      if (property.dynamicData) {
        const keys = ['contactNumber', 'mobileNumber', 'phone', 'mobile', 'phoneNumber'];
        for (const k of keys) {
          const val = typeof property.dynamicData.get === 'function' ? property.dynamicData.get(k) : property.dynamicData[k];
          if (val) {
            property.contactNumber = String(val).trim();
            break;
          }
        }
      }
    }
    if (!property.contactNumber) {
      property.contactNumber = req.user?.phone || req.user?.phoneNumber || req.user?.mobile || '';
    }

    await syncBuilderProjectDetails(property._id, property.dynamicData);
    await property.save();

    // documents update if provided
    if (payload.documents && Array.isArray(payload.documents)) {
      const lowerType = property.propertyType.toLowerCase();
      const requiredDocs = PROPERTY_DOCUMENTS[lowerType] || [];
      await PropertyDocument.findOneAndUpdate(
        { propertyId: property._id },
        {
          propertyType: lowerType,
          documents: payload.documents.map(d => ({
            type: d.type,
            name: d.name || d.type,
            fileUrl: d.fileUrl,
            isRequired: requiredDocs.includes(d.name || d.type),
          })),
          verificationStatus: 'pending',
          adminRemark: undefined,
          verifiedAt: undefined
        },
        { new: true, upsert: true }
      );
      property.status = 'pending';
      await property.save();
    }

    res.json({ success: true, property });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const addRoomType = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { name, inventoryType, roomCategory, maxAdults, maxChildren, bedsPerRoom, totalInventory, pricePerNight, extraAdultPrice, extraChildPrice, images, amenities } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (!pricePerNight) return res.status(400).json({ message: 'pricePerNight required' });

    // For Villa, inventoryType must be 'entire'
    if (property.propertyType === 'villa' && inventoryType !== 'entire') {
      return res.status(400).json({ message: 'Villa must have inventoryType="entire"' });
    }

    if (property.propertyType === 'hotel' && inventoryType !== 'room') {
      return res.status(400).json({ message: 'Hotel must have inventoryType="room"' });
    }

    if (property.propertyType === 'resort' && inventoryType !== 'room') {
      return res.status(400).json({ message: 'Resort must have inventoryType="room"' });
    }

    // For Hostel, inventoryType must be 'bed'
    if (property.propertyType === 'hostel' && inventoryType !== 'bed') {
      return res.status(400).json({ message: 'Hostel must have inventoryType="bed"' });
    }

    // For PG, inventoryType must be 'bed'
    if (property.propertyType === 'pg' && inventoryType !== 'bed') {
      return res.status(400).json({ message: 'PG must have inventoryType="bed"' });
    }

    if (property.propertyType === 'tent' && inventoryType !== 'tent') {
      return res.status(400).json({ message: 'Tent/Campsite must have inventoryType="tent"' });
    }

    // For Homestay, inventoryType can be 'room' or 'entire'
    if (property.propertyType === 'homestay' && !['room', 'entire'].includes(inventoryType)) {
      return res.status(400).json({ message: 'Homestay must have inventoryType="room" or "entire"' });
    }

    const normalizedImages = Array.isArray(images)
      ? images.filter(Boolean)
      : typeof images === 'string'
        ? images.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const rt = await RoomType.create({
      propertyId,
      name,
      inventoryType,
      roomCategory,
      maxAdults,
      maxChildren,
      bedsPerRoom,
      totalInventory,
      pricePerNight,
      extraAdultPrice,
      extraChildPrice,
      images: normalizedImages,
      amenities
    });
    res.status(201).json({ success: true, roomType: rt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateRoomType = async (req, res) => {
  try {
    const { propertyId, roomTypeId } = req.params;
    const payload = req.body;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.userId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const roomType = await RoomType.findOne({ _id: roomTypeId, propertyId });
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    const updatableFields = [
      'name',
      'inventoryType',
      'roomCategory',
      'maxAdults',
      'maxChildren',
      'bedsPerRoom',
      'totalInventory',
      'pricePerNight',
      'extraAdultPrice',
      'extraChildPrice',
      'images',
      'amenities',
      'isActive'
    ];

    updatableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        roomType[field] = payload[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(payload, 'images')) {
      if (Array.isArray(payload.images)) {
        roomType.images = payload.images.filter(Boolean);
      } else if (typeof payload.images === 'string') {
        roomType.images = payload.images.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        roomType.images = [];
      }
    }

    if (payload.inventoryType) {
      if (property.propertyType === 'villa' && roomType.inventoryType !== 'entire') {
        return res.status(400).json({ message: 'Villa must have inventoryType="entire"' });
      }
      if (property.propertyType === 'hotel' && roomType.inventoryType !== 'room') {
        return res.status(400).json({ message: 'Hotel must have inventoryType="room"' });
      }
      if (property.propertyType === 'resort' && roomType.inventoryType !== 'room') {
        return res.status(400).json({ message: 'Resort must have inventoryType="room"' });
      }
      if (property.propertyType === 'hostel' && roomType.inventoryType !== 'bed') {
        return res.status(400).json({ message: 'Hostel must have inventoryType="bed"' });
      }
      if (property.propertyType === 'pg' && roomType.inventoryType !== 'bed') {
        return res.status(400).json({ message: 'PG must have inventoryType="bed"' });
      }
      if (property.propertyType === 'tent' && roomType.inventoryType !== 'tent') {
        return res.status(400).json({ message: 'Tent/Campsite must have inventoryType="tent"' });
      }
      if (property.propertyType === 'homestay' && !['room', 'entire'].includes(roomType.inventoryType)) {
        return res.status(400).json({ message: 'Homestay must have inventoryType="room" or "entire"' });
      }
    }

    await roomType.save();

    res.json({ success: true, roomType });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteRoomType = async (req, res) => {
  try {
    const { propertyId, roomTypeId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.userId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const roomType = await RoomType.findOneAndDelete({ _id: roomTypeId, propertyId });
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const upsertDocuments = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const required = PROPERTY_DOCUMENTS[property.propertyType] || [];
    const payloadDocs = Array.isArray(req.body.documents) ? req.body.documents : [];
    const doc = await PropertyDocument.findOneAndUpdate(
      { propertyId },
      {
        propertyType: property.propertyType,
        documents: payloadDocs.map(d => ({
          type: d.type,
          name: d.name || d.type,
          fileUrl: d.fileUrl,
          isRequired: required.includes(d.name || d.type)
        })),
        verificationStatus: 'pending',
        adminRemark: undefined,
        verifiedAt: undefined
      },
      { new: true, upsert: true }
    );
    const wasDraft = property.status === 'draft';
    property.status = 'pending';
    property.isLive = false;
    await property.save();

    if (wasDraft) {
      notifyAdminOfNewProperty(property).catch(e => console.error(e));
    }

    res.json({ success: true, property, propertyDocument: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// TEMP DEBUG - Remove after debugging
export const debugProperties = async (req, res) => {
  try {
    const cats = await PropertyCategory.find({}).lean();
    const props = await Property.find({}).select('propertyName propertyType transactionType propertyCategory dynamicCategory status isLive').lean();
    const statusBreakdown = {};
    props.forEach(p => {
      const key = `status:${p.status}|isLive:${p.isLive}`;
      statusBreakdown[key] = (statusBreakdown[key] || 0) + 1;
    });
    res.json({
      categories: cats.map(c => ({ id: c._id, name: c.name, displayName: c.displayName, isActive: c.isActive })),
      totalProperties: props.length,
      statusBreakdown,
      approvedLive: props.filter(p => p.status === 'approved' && p.isLive).map(p => ({
        name: p.propertyName, propertyType: p.propertyType, transactionType: p.transactionType,
        propertyCategory: p.propertyCategory, dynamicCategory: p.dynamicCategory
      })),
      allProperties: props.map(p => ({
        name: p.propertyName, status: p.status, isLive: p.isLive,
        propertyType: p.propertyType, transactionType: p.transactionType,
        propertyCategory: p.propertyCategory, dynamicCategory: p.dynamicCategory
      }))
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPublicProperties = async (req, res) => {

  try {
    const {
      ids,
      search,
      type,
      minPrice,
      maxPrice,
      amenities,
      lat,
      lng,
      radius = 50, // default 50km
      guests,
      sort,
      subType,
      availability,
      city,
      // Rent specific
      bhkType,
      furnishing,
      // PG specific
      gender,
      occupancy,
      // Plot specific
      landType,
      // New filters
      minArea,
      maxArea,
      bathrooms,
      postedBy,
      purchaseType,
      propertyCategory,
      transactionType,
      areas,
      builder,
      excludeAvailability,
      possessionYear,
      userId,
      facing,
      floor,
      projectArea,
      projectDensity
    } = req.query;

    const pipeline = [];

    // 1. Geospatial Search (Must be first if used)
    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          maxDistance: parseFloat(radius) * 1000, // convert km to meters
          spherical: true,
          query: { status: 'approved', isLive: true }
        }
      });
    } else {
      // Basic match if no geo
      pipeline.push({ $match: { status: 'approved', isLive: true } });
    }

    // 2. Text/Filter Match
    const matchConditions = {};

    if (ids) {
      const idsList = ids.split(',').map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
      if (idsList.length > 0) {
        matchConditions._id = { $in: idsList.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    if (type && type !== 'all') {
      const typesList = type.split(',').map(t => t.trim()).filter(Boolean);

      const dynamicTypes = typesList.filter(t => mongoose.Types.ObjectId.isValid(t));
      const staticTypes = typesList.filter(t => !mongoose.Types.ObjectId.isValid(t)).map(t => t.toLowerCase());

      const parentToSubtypesMap = {
        'office': [
          'Ready to move office space',
          'Bare shell office space',
          'Co-working office space'
        ],
        'retail': [
          'Commercial Shops',
          'Commercial Showrooms'
        ],
        'plot / land': [
          'Commercial Land/Inst. Land',
          'Agricultural/Farm Land',
          'Industrial Lands/Plots'
        ],
        'storage': [
          'Ware House',
          'Cold Storage'
        ],
        'industry': [
          'Factory',
          'Manufacturing'
        ],
        'hospitality': [
          'Hotel/Resorts',
          'Guest-House/Banquet-Halls'
        ]
      };

      const expandSubtypes = (list) => {
        const expanded = [...list];
        list.forEach(item => {
          const lower = item.toLowerCase();
          if (parentToSubtypesMap[lower]) {
            expanded.push(...parentToSubtypesMap[lower]);
          }
        });
        return expanded;
      };

      if (dynamicTypes.length > 0 && staticTypes.length > 0) {
        const expandedStaticTypes = expandSubtypes(staticTypes);
        matchConditions.$or = [
          { propertyType: { $in: expandedStaticTypes.map(t => new RegExp('^' + t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')) } },
          { dynamicCategory: { $in: dynamicTypes.map(id => new mongoose.Types.ObjectId(id)) } }
        ];
      } else if (dynamicTypes.length > 0) {
        const categoryIds = dynamicTypes.map(id => new mongoose.Types.ObjectId(id));
        const categories = await PropertyCategory.find({ _id: { $in: categoryIds } }).select('displayName name').lean();
        
        const fallbackPropertyTypes = new Set();
        const fallbackTransactionTypes = new Set();

        for (const cat of categories) {
          const dn = (cat.displayName || cat.name || '').toLowerCase();
          if (dn.includes('pg') || dn.includes('hostel') || dn.includes('co-living') || dn.includes('paying guest')) {
            fallbackPropertyTypes.add('pg').add('hostel').add('paying guest');
            fallbackTransactionTypes.add('PG').add('Paying Guest');
          }
          else if (dn.includes('buy') || dn.includes('sell')) {
            fallbackTransactionTypes.add('Sell');
          }
          else if (dn.includes('rent') || dn.includes('lease')) {
            fallbackTransactionTypes.add('Rent').add('Rent / Lease');
          }
          else if (dn.includes('plot') || dn.includes('land')) {
            fallbackPropertyTypes.add('plot').add('plots').add('plot / land');
          }
          else if (dn === 'villa') fallbackPropertyTypes.add('villa');
          else if (dn === 'hotel') fallbackPropertyTypes.add('hotel');
          else if (dn === 'resort') fallbackPropertyTypes.add('resort');
          else if (dn === 'homestay') fallbackPropertyTypes.add('homestay');
          else if (dn === 'tent') fallbackPropertyTypes.add('tent');
        }

        const fallbackList = [...fallbackPropertyTypes];
        const fallbackTxnList = [...fallbackTransactionTypes];

        const orConditions = [
          { dynamicCategory: { $in: categoryIds } }
        ];

        if (fallbackList.length > 0) {
          const expandedFallbackList = expandSubtypes(fallbackList);
          const regexes = expandedFallbackList.map(type => new RegExp('^' + type.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
          orConditions.push({ propertyType: { $in: regexes } });
        }

        if (fallbackTxnList.length > 0) {
          orConditions.push({ transactionType: { $in: fallbackTxnList } });
        }

        matchConditions.$or = orConditions;
      } else if (staticTypes.length > 0) {
        const fallbackPropertyTypes = new Set();
        const fallbackTransactionTypes = new Set();
        const fallbackStaticTypes = [];

        for (const t of staticTypes) {
          if (t === 'pg' || t === 'hostel' || t === 'co-living' || t === 'paying guest') {
            fallbackPropertyTypes.add('pg').add('hostel').add('paying guest');
            fallbackTransactionTypes.add('PG').add('Paying Guest');
          }
          else if (t === 'buy' || t === 'sell') {
            fallbackTransactionTypes.add('Sell');
          }
          else if (t === 'rent' || t === 'lease') {
            fallbackTransactionTypes.add('Rent').add('Rent / Lease');
          }
          else if (t === 'plot' || t === 'plots' || t === 'land') {
            fallbackPropertyTypes.add('plot').add('plots').add('plot / land');
          }
          else {
            fallbackStaticTypes.push(t);
          }
        }

        const orConditions = [];

        if (fallbackPropertyTypes.size > 0) {
          const expandedFallbackPropertyTypes = expandSubtypes([...fallbackPropertyTypes]);
          const regexes = expandedFallbackPropertyTypes.map(type => new RegExp('^' + type.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
          orConditions.push({ propertyType: { $in: regexes } });
        }

        if (fallbackTransactionTypes.size > 0) {
          orConditions.push({ transactionType: { $in: [...fallbackTransactionTypes] } });
        }

        if (fallbackStaticTypes.length > 0) {
          const expandedFallbackStaticTypes = expandSubtypes(fallbackStaticTypes);
          const regexes = expandedFallbackStaticTypes.map(t => new RegExp('^' + t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
          orConditions.push({ propertyType: { $in: regexes } });
        }

        if (orConditions.length > 0) {
          matchConditions.$or = orConditions;
        }
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      const searchOr = [
        { propertyName: regex },
        { "address.city": regex },
        { "address.area": regex },
        { "address.fullAddress": regex },
        { propertyType: regex },
        { transactionType: regex },
        { propertyCategory: regex },
        { description: regex },
        { shortDescription: regex }
      ];

      if (matchConditions.$or) {
        matchConditions.$and = [
          { $or: matchConditions.$or },
          { $or: searchOr }
        ];
        delete matchConditions.$or;
      } else {
        matchConditions.$or = searchOr;
      }
    }

    if (amenities) {
      const amList = Array.isArray(amenities) ? amenities : amenities.split(',');
      const actualAmenities = [];

      amList.forEach(am => {
        const lowerAm = am.trim().toLowerCase();
        if (lowerAm === 'with photos') {
          matchConditions.propertyImages = { $exists: true, $not: { $size: 0 } };
        } else if (lowerAm === 'with videos') {
          matchConditions.videoUrl = { $exists: true, $ne: '' };
        } else if (lowerAm === 'verified properties' || lowerAm === 'verified') {
          matchConditions.isVerified = true;
        } else {
          actualAmenities.push(am.trim());
        }
      });

      if (actualAmenities.length > 0) {
        const amRegexes = actualAmenities.map(a => new RegExp(a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));
        const amMatch = {
          $or: [
            { amenities: { $in: amRegexes } },
            { 'dynamicData.amenities': { $in: amRegexes } },
            { 'dynamicData.propertyFeatures': { $in: amRegexes } },
            { highlights: { $in: amRegexes } }
          ]
        };

        if (matchConditions.$and) {
          matchConditions.$and.push(amMatch);
        } else if (matchConditions.$or) {
          const existingOr = matchConditions.$or;
          delete matchConditions.$or;
          matchConditions.$and = [{ $or: existingOr }, amMatch];
        } else {
          matchConditions.$or = amMatch.$or;
        }
      }
    }

    // 2.1 Property Specific Filters
    if (bhkType) {
      const bhkValues = bhkType.split(',').map(t => t.trim());
      const bhkRegexList = bhkValues.map(t => {
        const numMatch = t.match(/\d+/);
        if (numMatch) {
          const num = numMatch[0];
          return new RegExp(`${num}\\s*BHK|^${num}$`, 'i');
        }
        return new RegExp(t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      });
      
      const bhkMatch = {
        $or: [
          { 'dynamicData.bhkType': { $in: bhkRegexList } },
          { 'dynamicData.bhk': { $in: bhkRegexList } },
          { 'rentDetails.type': { $in: bhkRegexList } },
          { 'buyDetails.bhkType': { $in: bhkRegexList } },
          { 'buyDetails.type': { $in: bhkRegexList } }
        ]
      };

      if (matchConditions.$and) {
        matchConditions.$and.push(bhkMatch);
      } else if (matchConditions.$or) {
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, bhkMatch];
      } else {
        matchConditions.$or = bhkMatch.$or;
      }
    }

    if (furnishing) {
      const furnishValues = furnishing.split(',').map(f => f.trim());
      const furnishRegexList = furnishValues.map(f => {
        if (/fully/i.test(f)) return /fully|furnished/i;
        if (/semi/i.test(f)) return /semi/i;
        if (/unfurnished/i.test(f)) return /unfurnished/i;
        return new RegExp(f.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      });
      
      const furnishMatch = {
        $or: [
          { 'dynamicData.furnishingStatus': { $in: furnishRegexList } },
          { 'dynamicData.furnishing': { $in: furnishRegexList } },
          { 'rentDetails.furnishing': { $in: furnishRegexList } },
          { 'buyDetails.furnishing': { $in: furnishRegexList } }
        ]
      };

      if (matchConditions.$and) {
        matchConditions.$and.push(furnishMatch);
      } else if (matchConditions.$or) {
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, furnishMatch];
      } else {
        matchConditions.$or = furnishMatch.$or;
      }
    }
    if (gender) {
      const genders = gender.split(',').map(g => g.trim());
      const expandedGenders = [];
      genders.forEach(g => {
        expandedGenders.push(g);
        if (g.toLowerCase() === 'co-ed') expandedGenders.push('unisex');
        if (g.toLowerCase() === 'unisex') expandedGenders.push('co-ed');
      });
      const genderList = expandedGenders.map(g => new RegExp(`^${g}$`, 'i'));
      // Check both pgType (old) and pgDetails.gender (new)
      const genderMatch = {
        $or: [
          { pgType: { $in: genderList } },
          { 'pgDetails.gender': { $in: genderList } }
        ]
      };

      if (matchConditions.$and) {
        matchConditions.$and.push(genderMatch);
      } else if (matchConditions.$or) {
        // If we have a global $or (from search), we must move it to $and to keep boolean logic correct
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, genderMatch];
      } else {
        // No search/other $or, just use genderMatch $or
        matchConditions.$or = genderMatch.$or;
      }
    }
    if (occupancy) {
      const occList = occupancy.split(',').map(o => new RegExp(`^${o.trim()}$`, 'i'));
      matchConditions['pgDetails.occupancy'] = { $in: occList };
    }
    if (landType) {
      const landList = landType.split(',').map(l => new RegExp(`^${l.trim()}$`, 'i'));
      matchConditions['plotDetails.landType'] = { $in: landList };
    }

    if (propertyCategory && propertyCategory !== 'all') {
      if (propertyCategory.toLowerCase() === 'commercial') {
        // Strict filter for Commercial
        matchConditions.propertyCategory = /^Commercial$/i;
      } else if (propertyCategory.toLowerCase() === 'residential') {
        // For Residential, include properties with null/missing propertyCategory (likely residential)
        const residentialCondition = {
          $or: [
            { propertyCategory: /^Residential$/i },
            { propertyCategory: { $exists: false } },
            { propertyCategory: null },
            { propertyCategory: '' }
          ]
        };
        if (matchConditions.$and) {
          matchConditions.$and.push(residentialCondition);
        } else if (matchConditions.$or) {
          const existingOr = matchConditions.$or;
          delete matchConditions.$or;
          matchConditions.$and = [{ $or: existingOr }, residentialCondition];
        } else {
          matchConditions.$or = residentialCondition.$or;
        }
      } else if (propertyCategory.toLowerCase() === 'project' || propertyCategory.toLowerCase() === 'projects') {
        matchConditions.propertyCategory = /^Project$/i;
      } else if (propertyCategory.toLowerCase() === 'property' || propertyCategory.toLowerCase() === 'properties') {
        // A "Property" is any listing that is NOT explicitly a Builder Project
        matchConditions.propertyCategory = { $not: /^Project$/i };
      }
    }

    if (transactionType && transactionType !== 'all') {
      const tokens = transactionType.split(',').map(t => t.trim().toLowerCase());
      const txnRegexes = [];
      tokens.forEach(t => {
        if (t === 'sell' || t === 'buy') {
          txnRegexes.push(/Sell|Buy/i);
        } else if (t === 'rent' || t === 'lease') {
          txnRegexes.push(/Rent|Lease/i);
        } else if (t === 'pg' || t === 'paying guest') {
          txnRegexes.push(/Paying Guest|PG/i);
        } else if (t) {
          txnRegexes.push(new RegExp('^' + t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
        }
      });

      if (txnRegexes.length > 0) {
        const txnMatch = { transactionType: { $in: txnRegexes } };
        if (matchConditions.$and) {
          matchConditions.$and.push(txnMatch);
        } else if (matchConditions.$or) {
          const existingOr = matchConditions.$or;
          delete matchConditions.$or;
          matchConditions.$and = [{ $or: existingOr }, txnMatch];
        } else {
          matchConditions.transactionType = { $in: txnRegexes };
        }
      }
    }

    if (req.query.foodIncluded === 'true') {
      matchConditions['pgDetails.foodIncluded'] = true;
    }

    if (subType) {
      const subTypeList = subType.split(',').map(s => s.trim()).filter(Boolean);
      if (subTypeList.length > 0) {
        const subTypeRegexes = subTypeList.map(s => {
          const escaped = s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          // Replace escaped slash with flexible spacing regex
          const flexSlash = escaped.replace(/\\\/|\\s\*\\\/\\s\*/g, '\\s*\\/\\s*');
          return new RegExp('^' + flexSlash + '$', 'i');
        });
        matchConditions.propertyType = { $in: subTypeRegexes };
      }
    }

    if (availability) {
      const availList = availability.split(',').map(a => a.trim()).filter(Boolean);
      if (availList.length > 0) {
        const availRegexes = availList.map(a => new RegExp('^' + a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
        
        const availabilityOr = [
          { 'dynamicData.availability': { $in: availRegexes } },
          { 'dynamicData.availabilityStatus': { $in: availRegexes } },
          { 'dynamicData.possessionStatus': { $in: availRegexes } },
          { 'buyDetails.availabilityStatus': { $in: availRegexes } },
          { 'rentDetails.availabilityStatus': { $in: availRegexes } },
          { 'possessionStatus': { $in: availRegexes } },
          { 'availabilityStatus': { $in: availRegexes } }
        ];

        // If user selected all main availability statuses, also include properties with missing/null availability so they are not hidden
        if (availList.length >= 3 || (availList.some(a => /ready/i.test(a)) && availList.some(a => /under/i.test(a)))) {
          availabilityOr.push(
            { 'dynamicData.availability': { $exists: false } },
            { 'dynamicData.availability': null },
            { 'buyDetails.availabilityStatus': { $exists: false } }
          );
        }

        const availabilityMatch = { $or: availabilityOr };

        if (matchConditions.$and) {
          matchConditions.$and.push(availabilityMatch);
        } else if (matchConditions.$or) {
          const existingOr = matchConditions.$or;
          delete matchConditions.$or;
          matchConditions.$and = [{ $or: existingOr }, availabilityMatch];
        } else {
          matchConditions.$or = availabilityMatch.$or;
        }
      }
    }

    if (excludeAvailability) {
      const excludeList = excludeAvailability.split(',').map(a => a.trim()).filter(Boolean);
      if (excludeList.length > 0) {
        const excludeRegexes = excludeList.map(a => new RegExp('^' + a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
        const excludeMatch = {
          $and: [
            { 'dynamicData.availability': { $not: { $in: excludeRegexes } } },
            { 'dynamicData.availabilityStatus': { $not: { $in: excludeRegexes } } }
          ]
        };

        if (matchConditions.$and) {
          matchConditions.$and.push(excludeMatch);
        } else if (matchConditions.$or) {
          const existingOr = matchConditions.$or;
          delete matchConditions.$or;
          matchConditions.$and = [{ $or: existingOr }, excludeMatch];
        } else {
          matchConditions.$and = [excludeMatch];
        }
      }
    }

    if (possessionYear) {
      const year = parseInt(possessionYear, 10);
      if (!isNaN(year)) {
        // If exact year or 'after 2030'
        if (possessionYear === '2030+') {
           matchConditions['dynamicData.possessionYear'] = { $gt: 2030 };
        } else {
           matchConditions['dynamicData.possessionYear'] = year;
        }
      } else if (possessionYear === '2030+') {
         matchConditions['dynamicData.possessionYear'] = { $gt: 2030 };
      }
    }

    if (city) {
      const cityRegex = new RegExp('^' + city.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
      const cityMatch = {
        $or: [
          { 'address.city': cityRegex },
          { 'address.district': cityRegex }
        ]
      };

      if (matchConditions.$and) {
        matchConditions.$and.push(cityMatch);
      } else if (matchConditions.$or) {
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, cityMatch];
      } else {
        matchConditions.$or = cityMatch.$or;
      }
    }

    if (areas) {
      const areaQueries = areas.split(',').map(a => {
        const escaped = a.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        return {
          $or: [
            { 'address.area': regex },
            { 'address.city': regex },
            { 'address.district': regex },
            { 'address.state': regex },
            { 'address.fullAddress': regex }
          ]
        };
      });
      const areaMatch = { $or: areaQueries };

      if (matchConditions.$and) {
        matchConditions.$and.push(areaMatch);
      } else if (matchConditions.$or) {
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, areaMatch];
      } else {
        matchConditions.$or = areaMatch.$or;
      }
    }

    // Area filters
    if (minArea || maxArea) {
      const minA = parseInt(minArea);
      const maxA = parseInt(maxArea);
      const areaMatchList = [];
      
      const constructAreaQuery = (field) => {
        const conditions = [];
        if (!isNaN(minA)) {
            conditions.push({ $gte: [ { $convert: { input: `$${field}`, to: "double", onError: null, onNull: null } }, minA ] });
        }
        if (!isNaN(maxA)) {
            conditions.push({ $lte: [ { $convert: { input: `$${field}`, to: "double", onError: null, onNull: null } }, maxA ] });
        }
        return { $expr: { $and: conditions } };
      };

      areaMatchList.push(constructAreaQuery('buyDetails.area.superBuiltUp'));
      areaMatchList.push(constructAreaQuery('buyDetails.area.carpet'));
      areaMatchList.push(constructAreaQuery('plotDetails.plotArea'));
      areaMatchList.push(constructAreaQuery('dynamicData.carpetArea'));
      areaMatchList.push(constructAreaQuery('dynamicData.plotArea'));
      areaMatchList.push(constructAreaQuery('dynamicData.superArea'));

      const areaCondition = { $or: areaMatchList };
      if (matchConditions.$and) {
        matchConditions.$and.push(areaCondition);
      } else if (matchConditions.$or) {
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, areaCondition];
      } else {
        matchConditions.$or = areaCondition.$or;
      }
    }

    // Bathroom filter
    if (bathrooms) {
      const minBath = parseInt(bathrooms);
      if (!isNaN(minBath) && minBath > 0) {
        const bathCondition = {
          $or: [
            { 'dynamicData.bathrooms': minBath },
            { 'dynamicData.bathrooms': String(minBath) },
            { 'dynamicData.bathrooms': { $in: Array.from({ length: 5 }, (_, i) => String(minBath + i)) } },
            { 'dynamicData.bathrooms': '4+' }
          ]
        };
        if (matchConditions.$and) {
          matchConditions.$and.push(bathCondition);
        } else if (matchConditions.$or) {
          const existingOr = matchConditions.$or;
          delete matchConditions.$or;
          matchConditions.$and = [{ $or: existingOr }, bathCondition];
        } else {
          matchConditions.$or = bathCondition.$or;
        }
      }
    }

    // Helper to safely append $and / $or conditions
    const pushCondition = (cond) => {
      if (matchConditions.$and) {
        matchConditions.$and.push(cond);
      } else if (matchConditions.$or) {
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, cond];
      } else {
        matchConditions.$or = cond.$or || [cond];
      }
    };

    // Facing Direction Filter
    if (facing) {
      const facingList = facing.split(',').map(f => f.trim().replace(/ Facing$/i, ''));
      const facingRegexes = facingList.map(f => new RegExp(f.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));
      pushCondition({
        $or: [
          { 'dynamicData.facing': { $in: facingRegexes } },
          { 'dynamicData.facingDirection': { $in: facingRegexes } },
          { 'plotDetails.facing': { $in: facingRegexes } },
          { 'buyDetails.facing': { $in: facingRegexes } },
          { 'rentDetails.facing': { $in: facingRegexes } }
        ]
      });
    }

    // Floor Preference Filter
    if (floor) {
      const floorList = floor.split(',').map(f => f.trim());
      const floorOr = [];
      floorList.forEach(fl => {
        const lower = fl.toLowerCase();
        if (lower.includes('ground')) {
          floorOr.push({ 'dynamicData.floorNumber': { $in: [0, '0', 'Ground', 'ground'] } });
          floorOr.push({ 'dynamicData.floor': { $in: [0, '0', 'Ground', 'ground'] } });
        } else if (lower.includes('1st to 4th')) {
          floorOr.push({ 'dynamicData.floorNumber': { $in: [1, 2, 3, 4, '1', '2', '3', '4'] } });
        } else if (lower.includes('5th to 8th')) {
          floorOr.push({ 'dynamicData.floorNumber': { $in: [5, 6, 7, 8, '5', '6', '7', '8'] } });
        } else if (lower.includes('9th to 12th')) {
          floorOr.push({ 'dynamicData.floorNumber': { $in: [9, 10, 11, 12, '9', '10', '11', '12'] } });
        } else if (lower.includes('top')) {
          floorOr.push({ 'dynamicData.floorPreference': /top/i });
        } else {
          floorOr.push({ 'dynamicData.floorNumber': new RegExp(fl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') });
        }
      });
      if (floorOr.length > 0) pushCondition({ $or: floorOr });
    }

    // Project Area Filter
    if (projectArea) {
      const paList = projectArea.split(',').map(p => p.trim());
      const paOr = [];
      paList.forEach(pa => {
        const lower = pa.toLowerCase();
        if (lower.includes('less than 1')) {
          paOr.push({ 'dynamicData.totalLandArea': { $lt: 1 } });
        } else if (lower.includes('1 to 5')) {
          paOr.push({ 'dynamicData.totalLandArea': { $gte: 1, $lte: 5 } });
        } else if (lower.includes('5 to 10')) {
          paOr.push({ 'dynamicData.totalLandArea': { $gte: 5, $lte: 10 } });
        } else if (lower.includes('more than 10')) {
          paOr.push({ 'dynamicData.totalLandArea': { $gt: 10 } });
        } else {
          paOr.push({ 'dynamicData.projectArea': new RegExp(pa.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') });
        }
      });
      if (paOr.length > 0) pushCondition({ $or: paOr });
    }

    // Project Density Filter
    if (projectDensity) {
      const pdList = projectDensity.split(',').map(p => new RegExp(p.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));
      pushCondition({
        $or: [
          { 'dynamicData.projectDensity': { $in: pdList } },
          { 'dynamicData.density': { $in: pdList } }
        ]
      });
    }

    // Projects Filter
    if (req.query.projects) {
      const projList = req.query.projects.split(',').map(p => p.trim()).filter(Boolean);
      const validProjectIds = projList.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      const projectNames = projList.filter(id => !mongoose.Types.ObjectId.isValid(id)).map(name => new RegExp(name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));

      const projOr = [];
      if (validProjectIds.length > 0) {
        projOr.push({ _id: { $in: validProjectIds } });
        projOr.push({ dynamicCategory: { $in: validProjectIds } });
      }
      if (projectNames.length > 0) {
        projOr.push({ propertyName: { $in: projectNames } });
        projOr.push({ 'dynamicData.projectName': { $in: projectNames } });
      }
      if (projOr.length > 0) pushCondition({ $or: projOr });
    }

    // RERA Approved Filter
    if (req.query.reraApproved === 'Yes' || req.query.reraApproved === 'true') {
      pushCondition({
        $or: [
          { 'dynamicData.reraApproved': { $in: ['Yes', 'yes', true] } },
          { 'dynamicData.isReraApproved': { $in: ['Yes', 'yes', true] } },
          { 'dynamicData.reraNumber': { $exists: true, $ne: '' } },
          { isReraApproved: true }
        ]
      });
    }

    // Age of Property Filter
    if (req.query.ageOfProperty) {
      const ageList = req.query.ageOfProperty.split(',').map(a => new RegExp(a.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));
      pushCondition({
        $or: [
          { 'dynamicData.propertyAge': { $in: ageList } },
          { 'dynamicData.ageOfProperty': { $in: ageList } }
        ]
      });
    }

    // Posted by filter will be applied after user lookup below to correctly filter by user.role (owner, broker, builder)

    // Purchase type filter
    if (purchaseType) {
      const pTypes = purchaseType.split(',').map(p => p.trim().toLowerCase());
      const pMatch = [];
      if (pTypes.includes('resale')) {
        pMatch.push({
          $or: [
            { 'buyDetails.ownership': { $exists: true } },
            { 'dynamicData.purchaseType': 'Resale' },
            { 'dynamicData.propertyAge': { $exists: true } }
          ]
        });
      }
      if (pTypes.includes('new bookings') || pTypes.includes('new') || pTypes.includes('new launch')) {
        pMatch.push({
          $or: [
            { 'dynamicData.purchaseType': 'New Bookings' },
            { 'dynamicData.availability': { $in: ['Under construction', 'Pre Launch'] } },
            { 'dynamicData.availabilityStatus': { $in: ['Under construction', 'Pre Launch'] } }
          ]
        });
      }
      if (pMatch.length > 0) {
        const purchaseMatch = { $or: pMatch };
        if (matchConditions.$and) {
          matchConditions.$and.push(purchaseMatch);
        } else if (matchConditions.$or) {
          const existingOr = matchConditions.$or;
          delete matchConditions.$or;
          matchConditions.$and = [{ $or: existingOr }, purchaseMatch];
        } else {
          matchConditions.$or = purchaseMatch.$or;
        }
      }
    }

    if (builder) {
      const builderIds = builder.split(',').map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
      if (builderIds.length > 0) {
        matchConditions.userId = { $in: builderIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    if (userId) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        matchConditions.userId = new mongoose.Types.ObjectId(userId);
      }
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // --- SUBSCRIPTION RANKING BOOST ---
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'user.subscription.planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          rankingWeight: { $ifNull: ['$plan.rankingWeight', 0] },
          hasVerifiedTag: { $ifNull: ['$plan.hasVerifiedTag', false] }
        }
      }
    );

    // Filter by postedBy role accurately using populated user
    if (postedBy) {
      const postedByList = postedBy.split(',').map(p => p.trim().toLowerCase());
      const roleConditions = [];
      if (postedByList.includes('owner')) {
        roleConditions.push({ 'user.role': { $in: ['user', 'owner'] } });
        roleConditions.push({ 'user.role': { $exists: false } });
        roleConditions.push({ 'user.role': null });
      }
      if (postedByList.includes('broker') || postedByList.includes('dealer')) {
        roleConditions.push({ 'user.role': 'broker' });
      }
      if (postedByList.includes('builder')) {
        roleConditions.push({ 'user.role': 'builder' });
      }
      if (roleConditions.length > 0) {
        pipeline.push({ $match: { $or: roleConditions } });
      }
    }

    // 3. Lookup Room Types (For Price & Guest Capacity)
    // Use dynamic collection name for robustness
    const roomTypeCollection = RoomType.collection.name;

    pipeline.push({
      $lookup: {
        from: roomTypeCollection,
        localField: '_id',
        foreignField: 'propertyId',
        as: 'roomTypes'
      }
    });

    // Lookup Builder Project Details
    const builderProjectDetailsCollection = BuilderProjectDetails.collection.name;
    pipeline.push({
      $lookup: {
        from: builderProjectDetailsCollection,
        localField: '_id',
        foreignField: 'propertyId',
        as: 'builderProjectDetails'
      }
    }, {
      $unwind: {
        path: '$builderProjectDetails',
        preserveNullAndEmptyArrays: true
      }
    });

    // 4. Filter Active Room Types & Guest Capacity
    let roomFilter = { $eq: ['$$rt.isActive', true] };

    if (guests) {
      const guestCount = parseInt(guests);
      // Room must accommodate guests (base adults + children? simplified to maxAdults for now)
      // Usually users search by "2 adults", so check maxAdults
      roomFilter = {
        $and: [
          { $eq: ['$$rt.isActive', true] },
          { $gte: ['$$rt.maxAdults', guestCount] }
        ]
      };
    }

    pipeline.push({
      $addFields: {
        roomTypes: {
          $filter: {
            input: '$roomTypes',
            as: 'rt',
            cond: roomFilter
          }
        }
      }
    });

    // 5. Calculate Starting Price (Min Price of valid rooms)
    pipeline.push({
      $addFields: {
        startingPrice: {
          $convert: {
            input: {
              $cond: {
                if: { $gt: [{ $size: "$roomTypes" }, 0] },
                then: { $min: "$roomTypes.pricePerNight" },
                else: {
                  $ifNull: [
                    "$rentDetails.monthlyRent",
                    {
                      $ifNull: [
                        "$buyDetails.expectedPrice",
                        {
                          $ifNull: [
                            "$plotDetails.expectedPrice",
                            {
                              $ifNull: [
                                "$dynamicData.price",
                                {
                                  $ifNull: [
                                    "$dynamicData.expectedPrice",
                                    {
                                      $ifNull: [
                                        "$dynamicData.rent",
                                        {
                                          $ifNull: [
                                            "$dynamicData.monthlyRent",
                                            null
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            },
            to: "double",
            onError: null,
            onNull: null
          }
        },
        startingArea: {
          $convert: {
            input: {
              $ifNull: [
                "$buyDetails.area.superBuiltUp",
                {
                  $ifNull: [
                    "$buyDetails.area.carpet",
                    {
                      $ifNull: [
                        "$plotDetails.plotArea",
                        {
                          $ifNull: [
                            "$dynamicData.carpetArea",
                            {
                              $ifNull: [
                                "$dynamicData.plotArea",
                                {
                                  $ifNull: [
                                    "$dynamicData.superArea",
                                    null
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            to: "double",
            onError: null,
            onNull: null
          }
        },
        hasMatchingRooms: {
          $cond: {
            if: { $gt: [{ $size: "$roomTypes" }, 0] },
            then: true,
            else: {
              $cond: {
                if: {
                  $or: [
                    { $gt: ["$rentDetails.monthlyRent", null] },
                    { $gt: ["$buyDetails.expectedPrice", null] },
                    { $gt: ["$plotDetails.expectedPrice", null] },
                    { $gt: ["$dynamicData.price", null] },
                    { $gt: ["$dynamicData.expectedPrice", null] },
                    { $gt: ["$dynamicData.rent", null] },
                    { $gt: ["$dynamicData.monthlyRent", null] }
                  ]
                },
                then: true,
                else: false
              }
            }
          }
        }
      }
    });

    // Calculate Price Per Sq.Ft.
    pipeline.push({
      $addFields: {
        pricePerSqft: {
          $cond: {
            if: { $and: [{ $gt: ["$startingArea", 0] }, { $gt: ["$startingPrice", 0] }] },
            then: { $divide: ["$startingPrice", "$startingArea"] },
            else: null
          }
        }
      }
    });

    // 6. Filter by Price Range
    const priceMatch = {};

    // Only require rooms if filtering by price or guests
    if (minPrice || maxPrice || guests) {
      priceMatch.hasMatchingRooms = true;
    }

    if (minPrice) {
      priceMatch.startingPrice = { ...priceMatch.startingPrice, $gte: parseInt(minPrice) };
    }
    if (maxPrice) {
      priceMatch.startingPrice = { ...priceMatch.startingPrice, ...(priceMatch.startingPrice || {}), $lte: parseInt(maxPrice) };
    }

    if (Object.keys(priceMatch).length > 0) {
      pipeline.push({ $match: priceMatch });
    }

    // 7. Sorting
    let sortStage = { rankingWeight: -1, createdAt: -1 }; // Priority: Weight then Newest
    if (sort) {
      if (sort === 'relevance') sortStage = { rankingWeight: -1, createdAt: -1 };
      if (sort === 'newest') sortStage = { createdAt: -1, rankingWeight: -1 };
      if (sort === 'price_low' || sort === 'priceAsc') sortStage = { startingPrice: 1, rankingWeight: -1 };
      if (sort === 'price_high' || sort === 'priceDesc') sortStage = { startingPrice: -1, rankingWeight: -1 };
      if (sort === 'rating') sortStage = { avgRating: -1, rankingWeight: -1 };
      if (sort === 'distance' && lat && lng) sortStage = { distance: 1, rankingWeight: -1 };
      
      // Sort by calculated price per sqft
      if (sort === 'pricePerSqftAsc') sortStage = { pricePerSqft: 1, rankingWeight: -1 };
      if (sort === 'pricePerSqftDesc') sortStage = { pricePerSqft: -1, rankingWeight: -1 };
    }

    pipeline.push({ $sort: sortStage });

    // Execute
    const list = await Property.aggregate(pipeline);
    res.json(list);

  } catch (e) {
    console.error("Error in getPublicProperties:", e);
    res.status(500).json({ message: e.message });
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const query = {
      $or: [
        { userId: req.user._id },
        { userId: req.user._id }
      ],
      status: { $ne: 'draft' }
    };
    if (req.query.type) {
      query.propertyType = String(req.query.type).toLowerCase();
    }
    const properties = await Property.find(query).populate('builderProjectDetails').sort({ createdAt: -1 });
    res.json({ success: true, properties });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPropertyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let property = await Property.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('userId').populate('builderProjectDetails');
    
    // Fallback to Project collection if not found in Property
    if (!property) {
      property = await Project.findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { new: true }
      ).populate('userId');
      
      // If found in project, map embedded fields to builderProjectDetails for frontend compatibility
      if (property) {
        // We create a virtual builderProjectDetails object to satisfy the frontend expectation
        const projectObj = property.toObject();
        projectObj.builderProjectDetails = {
          possessionStatus: projectObj.possessionStatus,
          possessionYear: projectObj.possessionYear,
          ratings: projectObj.ratings,
          priceHistory: projectObj.priceHistory,
          paymentPlanUrl: projectObj.paymentPlanUrl
        };
        property = projectObj;
      }
    }

    if (!property) return res.status(404).json({ message: 'Property/Project not found' });
    const roomTypes = await RoomType.find({ propertyId: id, isActive: true });
    const documents = await PropertyDocument.findOne({ propertyId: id });
    res.json({ success: true, property, roomTypes, documents });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    // Ensure the property belongs to the logged-in partner or user
    const property = await Property.findOne({
      _id: propertyId,
      $or: [

        { userId: req.user._id }
      ]
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    // Delete associated room types
    await RoomType.deleteMany({ propertyId });

    // Delete associated documents
    await PropertyDocument.deleteMany({ propertyId });

    // Delete the property
    await Property.findByIdAndDelete(propertyId);

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
};

/**
 * @desc    Get Property Contact Details (Enforces Lead Capping)
 * @route   GET /api/properties/:id/reveal-contact
 * @access  Public (Optional Login)
 */
export const revealContact = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);

    if (!property) return res.status(404).json({ message: 'Property not found' });

    let partner = null;
    if (property.userId) {
      const userDoc = await User.findById(property.userId).populate('subscription.planId');
      if (userDoc && ['owner', 'broker', 'builder'].includes(userDoc.role)) {
        partner = userDoc;
      }
    }
    if (partner) {
      const sub = partner.subscription;
      const plan = sub?.planId;

      const isSubscriptionActive =
        sub?.status === 'active' &&
        sub?.expiryDate &&
        new Date(sub.expiryDate) > new Date();

      let isTrialActive = false;
      let trialDays = 30;
      if (!isSubscriptionActive) {
        // Check free trial status
        const PlatformSettings = (await import('../models/PlatformSettings.js')).default;
        const settings = await PlatformSettings.getSettings();
        trialDays = settings.freeTrialDurationDays || 30;
        const partnerCreatedAt = partner.createdAt || partner.partnerSince || new Date();
        const trialEndDate = new Date(partnerCreatedAt);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        if (new Date() <= trialEndDate) {
          isTrialActive = true;
        }
      }

      if (!isSubscriptionActive && !isTrialActive) {
        const PlatformSettings = (await import('../models/PlatformSettings.js')).default;
        const settings = await PlatformSettings.getSettings();

        return res.status(200).json({
          success: true,
          subscriptionExpired: true,
          message: `This seller's subscription has expired. Their contact details are currently unavailable.`,
          contactNumber: settings.supportPhone || '+916304471791'
        });
      }

      // If active subscription and has a plan, check limits
      if (isSubscriptionActive && plan) {
        // Logic for Silver Tier Lead Capping
        if (plan.tier === 'silver' && plan.leadCap > 0) {
          if ((sub.leadsUsedThisMonth || 0) >= plan.leadCap) {
            return res.status(403).json({
              success: false,
              message: 'Partner lead limit reached. Try another property.',
              limitReached: true
            });
          }
        }

        // Increment leads count
        partner.subscription.leadsUsedThisMonth = (sub.leadsUsedThisMonth || 0) + 1;
        await partner.save();
      }
    }

    // Increment property enquiryCount for action-based lead tracking
    await Property.findByIdAndUpdate(id, { $inc: { enquiryCount: 1 } });

    res.json({
      success: true,
      contactNumber: property.contactNumber
    });

  } catch (error) {
    console.error('Reveal Contact Error:', error);
    res.status(500).json({ message: 'Failed to reveal contact' });
  }
};

/**
 * @desc    Get Recommended Sellers (Partners with Premium Plans & High Activity)
 * @route   GET /api/properties/recommended-sellers
 * @access  Public
 */
export const getRecommendedSellers = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          partnerApprovalStatus: 'approved',
          'subscription.status': 'active'
        }
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'subscription.planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      { $unwind: '$plan' },
      // Sort by rankingWeight (Diamond=5, etc.) then by creation date
      { $sort: { 'plan.rankingWeight': -1, createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: 'userId',
          pipeline: [{ $match: { status: 'approved', isLive: true } }],
          as: 'activeProperties'
        }
      },
      {
        $addFields: {
          totalListings: { $size: '$activeProperties' },
          experienceYears: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$partnerSince'] },
                1000 * 60 * 60 * 24 * 365
              ]
            }
          }
        }
      },
      {
        $project: {
          password: 0,
          otp: 0,
          otpExpires: 0,
          fcmTokens: 0,
          aadhaarNumber: 0,
          aadhaarFront: 0,
          aadhaarBack: 0,
          panNumber: 0,
          panCardImage: 0,
          activeProperties: 0,
          'subscription.transactionId': 0
        }
      }
    ];

    const partners = await Partner.aggregate(pipeline);
    res.json(partners);
  } catch (err) {
    console.error('getRecommendedSellers error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getAdminPropertiesByLocation = async (req, res) => {
  try {
    const { city, state } = req.query;
    
    // Find all users who are builders
    const builders = await User.find({ role: 'builder' }).select('_id');
    const builderIds = builders.map(b => b._id);

    const query = {
      status: 'approved',
      isLive: true,
      'featuredDetails.isFeatured': true
    };

    if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'any') {
      const cityRegex = new RegExp(city, 'i');
      query.$or = [
        { 'address.city': cityRegex },
        { 'address.district': cityRegex },
        { 'address.fullAddress': cityRegex },
        { 'address.state': cityRegex }
      ];
    }
    if (state) {
      query['address.state'] = { $regex: new RegExp(state, 'i') };
    }

    const projectModelList = await Project.find(query).populate({ path: 'featuredDetails.planId', strictPopulate: false }).populate('userId', 'role').lean().catch(() => []);
    const propertyModelList = await Property.find(query).populate({ path: 'featuredDetails.planId', strictPopulate: false }).populate('userId', 'role').lean().catch(() => []);

    const combinedList = [...projectModelList];
    propertyModelList.forEach(p => {
      if (p && !combinedList.some(existing => existing && String(existing._id) === String(p._id))) {
        combinedList.push(p);
      }
    });

    const properties = combinedList;

    // Sort: 1. Featured Plan Weight -> 2. Hierarchy (Admin > Builder > Broker/Owner) -> 3. Date
    const sortedProperties = properties.sort((a, b) => {
      const getPlanWeight = (p) => (p.featuredDetails?.isFeatured && p.featuredDetails?.planId) ? (p.featuredDetails.planId.weight || 0) : 0;
      const getRoleWeight = (p) => {
         if (p.isAddedByAdmin && !p.userId) return 4; // Admin pure
         const role = p.userId?.role;
         if (role === 'builder') return 3;
         if (role === 'broker' || role === 'owner') return 2;
         return 1;
      };

      const planDiff = getPlanWeight(b) - getPlanWeight(a);
      if (planDiff !== 0) return planDiff;
      
      const roleDiff = getRoleWeight(b) - getRoleWeight(a);
      if (roleDiff !== 0) return roleDiff;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({ success: true, properties: sortedProperties });
  } catch (error) {
    console.error('Get Admin Properties By Location Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Returns all distinct cities (with districts) where admin has added live properties
export const getAdminPropertyCities = async (req, res) => {
  try {
    // Find all users who are builders
    const builders = await User.find({ role: 'builder' }).select('_id');
    const builderIds = builders.map(b => b._id);

    // Step 1: Aggregate both collections to get cities with count
    const matchStage = {
      status: 'approved',
      isLive: true,
      'address.city': { $exists: true, $ne: '' },
      'featuredDetails.isFeatured': true
    };

    const projectCities = await Project.aggregate([
      { $match: matchStage },
      { $group: { _id: { city: '$address.city', district: { $ifNull: ['$address.district', null] } }, state: { $first: '$address.state' }, count: { $sum: 1 } } }
    ]).catch(() => []);

    const propertyCities = await Property.aggregate([
      { $match: matchStage },
      { $group: { _id: { city: '$address.city', district: { $ifNull: ['$address.district', null] } }, state: { $first: '$address.state' }, count: { $sum: 1 } } }
    ]).catch(() => []);

    // Merge city results
    const cityMap = {};
    [...projectCities, ...propertyCities].forEach(item => {
      const cityName = item._id.city;
      if (!cityMap[cityName]) {
        cityMap[cityName] = { city: cityName, state: item.state, count: 0, districts: [] };
      }
      cityMap[cityName].count += item.count;
    });

    const result = Object.values(cityMap);
    res.status(200).json({ success: true, cities: result });
  } catch (error) {
    console.error('Get Admin Property Cities Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get stats for a specific property (for Owner Dashboard)
 * @route   GET /api/properties/:id/stats
 * @access  Private (Owner/Admin)
 */
export const getPropertyStats = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Authorization check
    if (String(property.userId) !== String(req.user._id) &&
        String(property.userId) !== String(req.user._id) &&
        req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized access to property stats' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const propObjectId = new mongoose.Types.ObjectId(id);

    const [totalBookings, monthBookings, totalRevenue, leadsAggregate, monthLeadsAggregate] = await Promise.all([
      Booking.countDocuments({ propertyId: id, bookingStatus: { $ne: 'cancelled' } }),
      Booking.countDocuments({ propertyId: id, bookingStatus: { $ne: 'cancelled' }, createdAt: { $gte: startOfMonth } }),
      Booking.aggregate([
        { $match: { propertyId: propObjectId, bookingStatus: { $in: ['confirmed', 'checked_in', 'checked_out', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      // Aggregate ALL leads (enquiries) for this property, grouped by type
      Enquiry.aggregate([
        { $match: { propertyId: propObjectId } },
        { $group: { _id: '$enquiryType', count: { $sum: 1 } } }
      ]),
      // This month's leads
      Enquiry.aggregate([
        { $match: { propertyId: propObjectId, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: '$enquiryType', count: { $sum: 1 } } }
      ])
    ]);

    // Build leads breakdown object
    const leadsBreakdown = { call: 0, whatsapp: 0, callback: 0, total: 0 };
    leadsAggregate.forEach(item => {
      if (item._id && leadsBreakdown.hasOwnProperty(item._id)) {
        leadsBreakdown[item._id] = item.count;
      }
      leadsBreakdown.total += item.count;
    });

    const monthLeadsBreakdown = { call: 0, whatsapp: 0, callback: 0, total: 0 };
    monthLeadsAggregate.forEach(item => {
      if (item._id && monthLeadsBreakdown.hasOwnProperty(item._id)) {
        monthLeadsBreakdown[item._id] = item.count;
      }
      monthLeadsBreakdown.total += item.count;
    });

    // Conversion rate: leads / views (as percentage)
    const totalViews = property.views || 0;
    const conversionRate = totalViews > 0
      ? Math.round((leadsBreakdown.total / totalViews) * 100 * 10) / 10
      : 0;

    res.json({
      success: true,
      stats: {
        totalBookings,
        bookingsThisMonth: monthBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalReviews: property.totalReviews || 0,
        avgRating: property.avgRating || 0,
        totalViews,
        // Leads — action-based contacts (call, whatsapp, callback enquiries)
        totalLeads: leadsBreakdown.total,
        leadsThisMonth: monthLeadsBreakdown.total,
        leadsBreakdown,
        monthLeadsBreakdown,
        // Contact reveals via revealContact endpoint
        contactReveals: property.enquiryCount || 0,
        conversionRate
      }
    });
  } catch (error) {
    console.error('Get Property Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPartnerPublicDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First try to find a Partner
    let partner = await Partner.findById(id)
      .select('name email phone businessName businessAddress partnerSince profileImage subscription role')
      .populate('subscription.planId');
    
    // If not found, try to find a User (who might be an owner or broker)
    if (!partner) {
      const user = await User.findById(id)
        .select('name email phone businessName partnerSince profileImage subscription role')
        .populate('subscription.planId');
      if (user && ['owner', 'broker', 'builder'].includes(user.role)) {
        partner = user;
      }
    }
    
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    
    // Fetch all live properties of this seller
    const properties = await Property.find({
      $or: [
        { userId: id },
        { userId: id }
      ],
      status: 'approved',
      isLive: true
    });
    
    res.status(200).json({
      success: true,
      partner: {
        _id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        businessName: partner.businessName || '',
        businessAddress: partner.businessAddress || '',
        partnerSince: partner.partnerSince || partner.createdAt,
        profileImage: partner.profileImage || '',
        role: partner.role || 'partner',
        subscriptionTier: partner.subscription?.planId?.tier || 'free'
      },
      properties
    });
  } catch (error) {
    console.error('getPartnerPublicDetails Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching seller profile' });
  }
};


