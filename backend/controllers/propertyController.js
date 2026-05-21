import mongoose from 'mongoose';
import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import PropertyCategory from '../models/PropertyCategory.js';
import PropertyDocument from '../models/PropertyDocument.js';
import Partner from '../models/Partner.js';
import { PROPERTY_DOCUMENTS } from '../config/propertyDocumentRules.js';
import emailService from '../services/emailService.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Booking from '../models/Booking.js';

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

export const createProperty = async (req, res) => {
  try {
    const isPartner = req.user.role === 'partner';
    const isUser = ['user', 'owner', 'broker'].includes(req.user.role);
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    let partner = null;
    if (isPartner) {
      // --- SUBSCRIPTION GUARD: Check if partner can add more properties ---
      partner = await Partner.findById(req.user._id).populate('subscription.planId');
      if (!partner) return res.status(404).json({ message: 'Partner not found' });

      const { subscription } = partner;
      const isSubscriptionActive =
        subscription?.status === 'active' &&
        subscription?.expiryDate &&
        new Date(subscription.expiryDate) > new Date();

      let maxAllowed = isSubscriptionActive ? (subscription.planId?.maxProperties || 1) : 9999;

      const currentPropertyCount = await Property.countDocuments({
        partnerId: req.user._id,
        status: { $ne: 'deleted' }
      });

      if (currentPropertyCount >= maxAllowed) {
        return res.status(403).json({
          message: `Property limit reached. Your plan allows ${maxAllowed} properties. Please upgrade your subscription.`,
          limitReached: true,
          currentCount: currentPropertyCount,
          maxAllowed: maxAllowed
        });
      }
    }

    const { propertyName, contactNumber, propertyType, propertyCategory, dynamicData, description, shortDescription, logo, coverImage, propertyImages, amenities, address, location, nearbyPlaces, checkInTime, checkOutTime, cancellationPolicy, houseRules, documents, roomTypes, pgType, hostelType, hostLivesOnProperty, familyFriendly, resortType, activities, hotelCategory, starRating, dynamicCategory, pgDetails, rentDetails, plotDetails, buyDetails, status } = req.body;
    
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
      partnerId: isPartner ? req.user._id : null,
      userId: (isUser || isAdmin) ? req.user._id : null,
      isAddedByUser: isUser,
      isAddedByAdmin: isAdmin,
      address: addressValue,
      location: locationValue,
      nearbyPlaces: nearbyPlacesArray,
      amenities: finalAmenities,
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

    if (partner) {
      partner.subscription.propertiesAdded = (partner.subscription.propertiesAdded || 0) + 1;
      await partner.save();
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

    if (String(property.partnerId) !== String(req.user._id) && String(property.userId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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

export const getPublicProperties = async (req, res) => {
  try {
    const {
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
      landType
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

    if (type && type !== 'all') {
      const typesList = type.split(',').map(t => t.trim()).filter(Boolean);

      const dynamicTypes = typesList.filter(t => mongoose.Types.ObjectId.isValid(t));
      const staticTypes = typesList.filter(t => !mongoose.Types.ObjectId.isValid(t)).map(t => t.toLowerCase());

      if (dynamicTypes.length > 0 && staticTypes.length > 0) {
        matchConditions.$or = [
          { propertyType: { $in: staticTypes } },
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
          const regexes = fallbackList.map(type => new RegExp('^' + type.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
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
          const regexes = [...fallbackPropertyTypes].map(type => new RegExp('^' + type.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
          orConditions.push({ propertyType: { $in: regexes } });
        }

        if (fallbackTransactionTypes.size > 0) {
          orConditions.push({ transactionType: { $in: [...fallbackTransactionTypes] } });
        }

        if (fallbackStaticTypes.length > 0) {
          const regexes = fallbackStaticTypes.map(t => new RegExp('^' + t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
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
        { "address.fullAddress": regex }
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
      if (amList.length > 0) {
        matchConditions.amenities = { $all: amList };
      }
    }

    // 2.1 Property Specific Filters
    if (bhkType) {
      const bhkList = bhkType.split(',').map(t => new RegExp(`^${t.trim()}$`, 'i'));
      matchConditions['rentDetails.type'] = { $in: bhkList };
    }
    if (furnishing) {
      const furnishList = furnishing.split(',').map(f => new RegExp(`^${f.trim()}$`, 'i'));
      matchConditions['rentDetails.furnishing'] = { $in: furnishList };
    }
    if (gender) {
      const genderList = gender.split(',').map(g => new RegExp(`^${g.trim()}$`, 'i'));
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

    if (req.query.foodIncluded === 'true') {
      matchConditions['pgDetails.foodIncluded'] = true;
    }

    if (subType) {
      const subTypeList = subType.split(',').map(s => s.trim()).filter(Boolean);
      if (subTypeList.length > 0) {
        const subTypeRegexes = subTypeList.map(s => new RegExp('^' + s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
        matchConditions.propertyType = { $in: subTypeRegexes };
      }
    }

    if (availability) {
      const availList = availability.split(',').map(a => a.trim()).filter(Boolean);
      if (availList.length > 0) {
        const availRegexes = availList.map(a => new RegExp('^' + a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'));
        const availabilityMatch = {
          $or: [
            { 'dynamicData.availability': { $in: availRegexes } },
            { 'dynamicData.availabilityStatus': { $in: availRegexes } }
          ]
        };

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

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // --- SUBSCRIPTION RANKING BOOST ---
    pipeline.push(
      {
        $lookup: {
          from: 'partners',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partner'
        }
      },
      { $unwind: { path: '$partner', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'partner.subscription.planId',
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
          $cond: {
            if: { $gt: [{ $size: "$roomTypes" }, 0] },
            then: { $min: "$roomTypes.pricePerNight" },
            else: null // Will filter out properties with no matching rooms later if strictly needed
          }
        },
        hasMatchingRooms: { $gt: [{ $size: "$roomTypes" }, 0] }
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
      if (sort === 'newest') sortStage = { rankingWeight: -1, createdAt: -1 };
      if (sort === 'price_low') sortStage = { startingPrice: 1, rankingWeight: -1 };
      if (sort === 'price_high') sortStage = { startingPrice: -1, rankingWeight: -1 };
      if (sort === 'rating') sortStage = { avgRating: -1, rankingWeight: -1 };
      if (sort === 'distance' && lat && lng) sortStage = { distance: 1, rankingWeight: -1 };
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
        { partnerId: req.user._id },
        { userId: req.user._id }
      ],
      status: { $ne: 'draft' }
    };
    if (req.query.type) {
      query.propertyType = String(req.query.type).toLowerCase();
    }
    const properties = await Property.find(query).sort({ createdAt: -1 });
    res.json({ success: true, properties });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPropertyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('partnerId').populate('userId');
    if (!property) return res.status(404).json({ message: 'Property not found' });
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
        { partnerId: req.user._id },
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
    const property = await Property.findById(id).populate({
      path: 'partnerId',
      populate: { path: 'subscription.planId' }
    });

    if (!property) return res.status(404).json({ message: 'Property not found' });

    const partner = property.partnerId;
    if (!partner) return res.status(404).json({ message: 'Partner details missing' });

    const sub = partner.subscription;
    const plan = sub?.planId;

    // Check if partner is active and has a plan
    if (sub?.status === 'active' && plan) {
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
          foreignField: 'partnerId',
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
    const query = {
      isAddedByAdmin: true,
      status: 'approved',
      isLive: true
    };

    if (city) {
      query['address.city'] = { $regex: new RegExp(city, 'i') };
    }
    if (state) {
      query['address.state'] = { $regex: new RegExp(state, 'i') };
    }

    const properties = await Property.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, properties });
  } catch (error) {
    console.error('Get Admin Properties By Location Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Returns all distinct cities (with districts) where admin has added live properties
export const getAdminPropertyCities = async (req, res) => {
  try {
    // Step 1: Aggregate all properties to get cities with count
    const result = await Property.aggregate([
      {
        $match: {
          status: 'approved',
          isLive: true,
          'address.city': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            city: '$address.city',
            district: { $ifNull: ['$address.district', null] }
          },
          state: { $first: '$address.state' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.city': 1, 'count': -1 } },
      {
        $group: {
          _id: '$_id.city',
          state: { $first: '$state' },
          totalCount: { $sum: '$count' },
          districts: {
            $push: {
              $cond: [
                { $ne: ['$_id.district', null] },
                { name: '$_id.district', count: '$count' },
                '$$REMOVE'
              ]
            }
          }
        }
      },
      { $sort: { totalCount: -1 } },
      {
        $project: {
          _id: 0,
          city: '$_id',
          state: 1,
          count: '$totalCount',
          districts: 1
        }
      }
    ]);

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
    if (String(property.partnerId) !== String(req.user._id) && 
        String(property.userId) !== String(req.user._id) && 
        req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized access to property stats' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalBookings, monthBookings, totalRevenue, totalReviews] = await Promise.all([
      Booking.countDocuments({ propertyId: id, bookingStatus: { $ne: 'cancelled' } }),
      Booking.countDocuments({ propertyId: id, bookingStatus: { $ne: 'cancelled' }, createdAt: { $gte: startOfMonth } }),
      Booking.aggregate([
        { $match: { propertyId: new mongoose.Types.ObjectId(id), bookingStatus: { $in: ['confirmed', 'checked_in', 'checked_out', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      // Assuming a Review model exists and is imported, if not just default to 0 for now or fetch from property
      Promise.resolve(property.totalReviews || 0)
    ]);

    res.json({
      success: true,
      stats: {
        totalBookings,
        bookingsThisMonth: monthBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalReviews,
        avgRating: property.avgRating || 0,
        totalViews: property.views || 0 // Assuming a views field exists
      }
    });
  } catch (error) {
    console.error('Get Property Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
};

