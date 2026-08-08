import mongoose from 'mongoose';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Service from '../models/HomeServiceService.js';
import HomeServiceCategory from '../models/HomeServiceCategory.js';
import Category from '../models/Category.js'; // Keeping this if it's used elsewhere
import UserService from '../models/UserService.js';
import Vendor from '../models/Partner.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';
import VendorBill from '../models/VendorBill.js';
import Plan from '../models/Plan.js';
import Settings from '../models/Settings.js';
import PlatformSettings from '../models/PlatformSettings.js';
import Transaction from '../models/Transaction.js';
import Review from '../models/Review.js';
import { validationResult } from 'express-validator';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { createNotification } from './notificationControllers/notificationController.js';
import { sendNotificationToUser, sendNotificationToWorker } from '../services/firebaseAdmin.js';
import { findNearbyWorkers, geocodeAddress } from '../services/locationService.js';
import { getIO } from '../sockets.js';
import { sendBookingEmails } from '../services/emailService.js';

/**
 * Create a new booking
 */
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    let {
      serviceId,
      address,
      scheduledDate,
      scheduledTime,
      timeSlot,
      userNotes,
      paymentMethod,
      amount,
      isPlusAdded,
      bookedItems, // Array of specific items from cart
      visitingCharges: reqVisitingCharges,
      visitationFee: reqVisitationFee, // Backward compatibility
      basePrice: reqBasePrice,
      discount: reqDiscount,
      tax: reqTax,
      promoCode: reqPromoCode,
      promoDiscount: reqPromoDiscount,
      // Metadata from frontend
      serviceCategory: reqServiceCategory,
      categoryIcon: reqCategoryIcon,
      brandName: reqBrandName,
      brandIcon: reqBrandIcon,
      bookingType, // Extract bookingType
      // Consultancy Fields
      isConsultancyRequest,
      requirementText,
      requirementImages
    } = req.body;

    let visitingCharges = reqVisitingCharges !== undefined ? reqVisitingCharges : (reqVisitationFee || 0);

    // Calculate total value from booked items or fallback to base (Move to top)
    let totalServiceValue = 0;
    if (bookedItems && bookedItems.length > 0) {
      totalServiceValue = bookedItems.reduce((sum, item) => {
        const itemPrice = item.card?.price || item.price || 0;
        return sum + (itemPrice * (item.quantity || 1));
      }, 0);
    }
    // Note: Fallback to service.basePrice is done later if totalServiceValue is 0 AND service is loaded.
    // But we need 'service' to define fallback.
    // 'service' is loaded at line 46.
    // So we must calculate it AFTER loading service but BEFORE usage.
    // Usage is at line 98. Service loaded at 46.
    // So distinct placement: AFTER line 52.

    // Handle serviceId if it's an object (from populated cart data)
    if (typeof serviceId === 'object' && serviceId._id) {
      serviceId = serviceId._id;
    }

    let service = null;
    let user = await User.findById(userId).select('name phone wallet plans');

    if (mongoose.Types.ObjectId.isValid(serviceId)) {
      service = await Service.findById(serviceId).select('title basePrice discountPrice description images iconUrl categoryId category categoryIds').lean();
    } else if (String(serviceId).startsWith('estimate-') || (bookedItems && bookedItems.length > 0)) {
      const item = bookedItems && bookedItems[0] ? bookedItems[0] : {};
      const categoryMatch = await HomeServiceCategory.findOne({ title: reqServiceCategory }).select('_id title icon').lean();
      
      service = {
        _id: serviceId,
        title: item.card?.title || item.title || 'Estimate Service',
        basePrice: item.card?.price || item.price || 0,
        discountPrice: 0,
        description: item.card?.description || item.description || '',
        images: item.card?.imageUrl ? [item.card.imageUrl] : [],
        iconUrl: item.card?.iconUrl || reqCategoryIcon || (categoryMatch ? categoryMatch.icon : ''),
        categoryId: categoryMatch ? categoryMatch._id : null,
        category: categoryMatch ? categoryMatch.title : reqServiceCategory,
        isEstimateBased: true
      };
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 2. Fetch Category if exists
    const categoryId = service.categoryId || service.categoryIds?.[0];
    const category = categoryId ? await HomeServiceCategory.findById(categoryId).select('title icon image slug isEstimateBased').lean() : null;

    // Calculate total value from booked items or fallback to service base price
    if (totalServiceValue === 0) {
      totalServiceValue = service.basePrice || 500;
    }

    // Check for Pending Penalty
    const pendingPenalty = user.wallet?.penalty || 0;

    // --- MOVE SEARCH UP HERE ---
    // Load Global Settings for Flow Control
    const globalSettings = await Settings.findOne({ type: 'global' }).select('searchRadius').lean();
    const bookingModel = 'worker';
    const searchRadius = globalSettings?.searchRadius || 10;

    // Find nearby workers using location service

    // Determine booking location (prioritize frontend coordinates)
    let bookingLocation;
    if (address.lat && address.lng) {
      bookingLocation = { lat: address.lat, lng: address.lng };
      console.log('Using provided coordinates for partner search:', bookingLocation);
    } else {
      bookingLocation = await geocodeAddress(
        `${address.addressLine1}, ${address.city}, ${address.state} ${address.pincode}`
      );
      console.log('Geocoded address for partner search:', bookingLocation);
    }

    let nearbyPartners = await findNearbyWorkers(
      bookingLocation,
      searchRadius,
      { service: category?.title || (service ? service.category : 'General') }
    );

    // Deduplicate nearbyPartners by _id to prevent duplicate notifications
    const uniquePartnerIds = new Set();
    nearbyPartners = nearbyPartners.filter(partner => {
      const idStr = partner._id.toString();
      if (uniquePartnerIds.has(idStr)) return false;
      uniquePartnerIds.add(idStr);
      return true;
    });

    console.log(`[CreateBooking] Found ${nearbyPartners.length} nearby ${bookingModel}s for booking`);
    // Store in a shared variable for background tasks
    const foundPartners = nearbyPartners;
    // --- END SEARCH BLOCK ---

    // Calculate pricing - use amount from frontend if provided, otherwise calculate
    let basePrice, discount, tax, finalAmount;
    let bookingStatus = BOOKING_STATUS.SEARCHING;
    let bookingPaymentStatus = PAYMENT_STATUS.PENDING;

    // -------------------------------------------------------------------------
    // PRICING CALCULATION LOGIC
    // -------------------------------------------------------------------------

    // 1. Determine if we can use Plan Benefits
    let usePlanBenefits = false;
    if (paymentMethod === 'plan_benefit') {
      if (user.plans && user.plans.isActive) {
        if (user.plans.expiry && new Date() > new Date(user.plans.expiry)) {
          // Plan expired - update status and FALLBACK to normal
          console.log(`[CreateBooking] Plan expired for user ${userId}. Falling back to normal booking.`);
          user.plans.isActive = false;
          await user.save();
          paymentMethod = 'pay_at_home'; // Fallback to Pay at Home
        } else {
          usePlanBenefits = true;
        }
      } else {
        // No active plan or invalid status - Fallback
        paymentMethod = 'pay_at_home';
      }
    }

    // 2. Logic Branch: Plan Benefit vs Standard
    if (usePlanBenefits) {
      const userPlan = await Plan.findOne({ name: user.plans.name });

      if (!userPlan) {
        // Fallback if data missing (rare)
        usePlanBenefits = false;
        paymentMethod = 'pay_at_home';
      } else {
        // Check Coverage
        const isCategoryCovered = categoryId && userPlan.freeCategories &&
          userPlan.freeCategories.some(cat => String(cat) === String(categoryId));
        const isServiceCovered = serviceId && userPlan.freeServices &&
          userPlan.freeServices.some(svc => String(svc) === String(serviceId));

        if (isCategoryCovered || isServiceCovered) {
          // >>> APPLY FREE PRICING <<<
          basePrice = totalServiceValue > 0 ? totalServiceValue : (service.basePrice || 500);
          discount = basePrice; // Full discount
          tax = 0;
          visitingCharges = 0;
          finalAmount = pendingPenalty; // User only pays penalty

          bookingStatus = BOOKING_STATUS.SEARCHING;
          bookingPaymentStatus = finalAmount > 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PLAN_COVERED;
        } else {
          // Not covered -> Fallback
          usePlanBenefits = false;
          paymentMethod = 'pay_at_home';
        }
      }
    }

    // 3. Standard Pricing (Fallback) if NOT using Plan Benefits
    if (!usePlanBenefits) {
      if (amount && amount > 0) {
        // Use amount from frontend logic
        if (reqBasePrice !== undefined && reqTax !== undefined) {
          // Use breakdown provided by frontend
          basePrice = reqBasePrice;
          discount = reqDiscount || 0;
          const currentPromoDiscount = reqPromoDiscount || 0;
          tax = reqTax;
          visitingCharges = (reqVisitingCharges !== undefined) ? reqVisitingCharges : (visitingCharges || 0);
          finalAmount = Math.max(0, (basePrice - discount - currentPromoDiscount + tax + visitingCharges) + pendingPenalty);
        } else {
          // Backward compatibility: Reverse calculate
          if (!visitingCharges) visitingCharges = 0;
          basePrice = amount;
          tax = 0;
          discount = 0;
          finalAmount = amount + pendingPenalty;
        }
      } else {
        // Fallback to service pricing (if no amount sent)
        if (!visitingCharges) visitingCharges = 0;
        basePrice = service.basePrice || 500;
        discount = service.discountPrice ? (basePrice - service.discountPrice) : 0;
        tax = 0;
        finalAmount = (basePrice - discount + tax + visitingCharges) + pendingPenalty;
      }
    }

    // NOTE: vendor earnings are NOT calculated at booking creation.
    // They are computed ONLY at bill generation (completeSelfJob) and stored in VendorBill.
    // This prevents inconsistency between Booking and VendorBill.
    console.log(`[CreateBooking] Payment=${paymentMethod}, FinalAmount=${finalAmount}, Penalty=${pendingPenalty}`);

    // Clear penalty from user wallet if we charged it
    if (pendingPenalty > 0) {
      user.wallet.penalty = 0;
      await user.save();
    }

    // Ensure minimum amount for Razorpay (₹1) for paid bookings
    if (finalAmount < 1 && paymentMethod !== 'plan_benefit') {
      finalAmount = 1;
    }

    // Create booking
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Improve Category Fetching if ID is missing (Fallback to title match)
    let finalCategory = category;
    if (!finalCategory && service.category) {
      // Try finding by name if ID lookup failed
      finalCategory = await HomeServiceCategory.findOne({ title: service.category });
    }

    // Map booked items to new schema (sectionTitle -> brandName)
    const formattedBookedItems = (Array.isArray(bookedItems) && bookedItems.length > 0) ? bookedItems.map(item => ({
      brandName: item.brandName || item.sectionTitle || item.brand || '', // Robust fallback
      brandIcon: item.brandIcon || item.sectionIcon || item.icon || null,
      card: item.card || item,
      quantity: item.quantity || 1
    })) : [];

    console.log('[CreateBooking] About to save with formatted items:', JSON.stringify(formattedBookedItems, null, 2));

    // Extract Visual Identity Details
    const categoryIcon = finalCategory?.icon || finalCategory?.image || service.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3500/3500833.png';
    let brandName = null;
    let brandIcon = null;

    if (formattedBookedItems.length > 0) {
      // Try to find a distinct brand name
      const distinctBrands = [...new Set(formattedBookedItems.map(item => item.brandName).filter(Boolean))];
      if (distinctBrands.length > 0) {
        brandName = distinctBrands.join(', ');
      }

      // Try to find brand icon
      brandIcon = formattedBookedItems[0].brandIcon || null;
    }

    const safeServiceId = mongoose.Types.ObjectId.isValid(serviceId) ? serviceId : new mongoose.Types.ObjectId();

    const booking = await HomeServiceBooking.create({
      bookingNumber,
      userId,
      vendorId: null, // Will be assigned when vendor accepts
      serviceId: safeServiceId,
      categoryId: finalCategory?._id || categoryId,
      serviceName: service.title,
      serviceCategory: reqServiceCategory || finalCategory?.title || service.category || 'General',
      isEstimateBased: finalCategory?.isEstimateBased || req.body.isEstimateBased || false,
      // Visual Identity Fields
      categoryIcon: reqCategoryIcon || categoryIcon,
      brandName: reqBrandName || brandName,
      brandIcon: reqBrandIcon || brandIcon,
      bookingType: bookingType || 'scheduled',
      bookingModel: bookingModel,

      isConsultancyRequest: isConsultancyRequest || false,
      requirementText: requirementText || null,
      requirementImages: requirementImages || [],

      description: service.description,
      serviceImages: service.images || [],
      bookedItems: formattedBookedItems,
      basePrice,
      discount,
      promoCode: reqPromoCode || null,
      promoDiscount: reqPromoDiscount || 0,
      tax,
      visitingCharges,
      finalAmount,
      userPayableAmount: finalAmount,
      address: {
        type: address.type || 'home',
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark || '',
        lat: address.lat || null,
        lng: address.lng || null
      },
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      timeSlot: {
        start: timeSlot.start,
        end: timeSlot.end
      },
      // userNotes: userNotes || null, // Removed
      // isPlusAdded: isPlusAdded || false, // Removed
      paymentMethod: paymentMethod || null,
      status: bookingStatus,
      paymentStatus: bookingPaymentStatus
      // notifiedVendors will be set after wave sorting
    });

    // --- IMMEDIATE RESPONSE ---
    // Send immediate response to the client. All subsequent operations will run in the background.
    res.status(201).json({
      success: true,
      message: 'Booking created successfully. We are finding vendors for you.',
      data: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        finalAmount: booking.finalAmount,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        address: booking.address,
        serviceName: booking.serviceName,
        categoryIcon: booking.categoryIcon,
        brandName: booking.brandName,
        brandIcon: booking.brandIcon,
      }
    });

    // --- DEFERRED POST-BOOKING OPERATIONS ---
    // All operations below will run non-blocking after the HTTP response has been sent.
    setImmediate(async () => {
      try {
        // Re-fetch user and booking for background tasks to ensure latest state
        const userForBackground = await User.findById(userId);
        const bookingForBackground = await HomeServiceBooking.findById(booking._id)
          .populate('userId', 'name phone email')
          .populate('serviceId', 'title iconUrl')
          .populate('categoryId', 'title slug');
        const serviceForBackground = await Service.findById(bookingForBackground.serviceId) || {
          title: bookingForBackground.serviceName,
          category: bookingForBackground.serviceCategory
        };

        if (!userForBackground || !bookingForBackground) {
          console.error('[CreateBooking] Background task failed: User or Booking not found after initial creation.');
          return;
        }

        // If Plus membership was added, update user status
        if (isPlusAdded) {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year membership
          userForBackground.plans = {
            isActive: true,
            name: 'Plus Membership',
            expiry: expiryDate,
            price: 999 // Or fetch based on constants if needed, hardcoding placeholder or 0
          };
          await userForBackground.save();
          console.log(`User ${userId} upgraded to Plus Membership until ${expiryDate}`);
        }

        // Partners already found above
        // WAVE-BASED ALERTING: Sort by distance and only notify first wave
        const sortedPartners = foundPartners.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        // Wave 1: First 3 partners
        const WAVE_1_COUNT = 3;
        const wave1Partners = sortedPartners.slice(0, WAVE_1_COUNT);

        // Store potential workers in booking
        bookingForBackground.potentialWorkers = sortedPartners.map(v => ({
          workerId: v._id,
          distance: v.distance || 0
        }));

        bookingForBackground.currentWave = 1;
        bookingForBackground.waveStartedAt = new Date();
        bookingForBackground.notifiedPartners = wave1Partners.map(v => v._id);
        await bookingForBackground.save();

        // Fetch Platform Settings for Dynamic Worker Price
        const platformSettings = await PlatformSettings.getSettings();
        const platformFlatFee = platformSettings.platformFlatFee || 0;
        const workerAmount = Math.max(0, (bookingForBackground.basePrice || 0) - platformFlatFee);
        console.log(`[WorkerAmount Calc] basePrice: ${bookingForBackground.basePrice}, platformFlatFee: ${platformFlatFee}, workerAmount: ${workerAmount}`);

        if (wave1Partners.length > 0) {
          console.log(`[CreateBooking] Wave 1: Alerting ${wave1Partners.length} closest ${bookingModel}s (of ${sortedPartners.length} total)`);

          // Create BookingRequest entries for Wave 1 partners
          const bookingRequests = wave1Partners.map(partner => ({
            bookingId: bookingForBackground._id,
            workerId: partner._id,
            status: 'PENDING',
            wave: 1,
            distance: partner.distance || null,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // Expires in 1 hour
          }));

          try {
            await BookingRequest.insertMany(bookingRequests, { ordered: false });
            console.log(`[CreateBooking] Created ${bookingRequests.length} BookingRequest entries for ${bookingModel}s`);

            // Notify partners about new job
            for (const partner of wave1Partners) {
              await createNotification({
                workerId: partner._id,
                type: 'new_job_available',
                title: 'New Job Available!',
                message: `A new ${bookingForBackground.serviceName} job is available near you. Earn ₹${workerAmount}!`,
                relatedId: bookingForBackground._id,
                relatedType: 'booking',
                priority: 'high',
                pushData: {
                  type: 'new_job',
                  bookingId: bookingForBackground._id.toString(),
                  link: `/worker/job/${bookingForBackground._id}`
                }
              });
            }

            // Also notify User that we are finding professionals
            await createNotification({
              userId: bookingForBackground.userId._id,
              type: 'finding_professional',
              title: 'Booking Received!',
              message: `We have received your booking for ${bookingForBackground.serviceName}. Finding the best professional for you...`,
              relatedId: bookingForBackground._id,
              relatedType: 'booking',
              pushData: {
                type: 'booking_confirmed',
                bookingId: bookingForBackground._id.toString(),
                link: `/user/booking/${bookingForBackground._id}`
              }
            });
          } catch (err) {
            if (err.code !== 11000) console.error('[CreateBooking] BookingRequest insert error:', err);
          }
        } else {
          console.warn(`[CreateBooking] NO ${bookingModel.toUpperCase()}S FOUND on initial search for booking ${bookingForBackground.bookingNumber}. Will keep retrying for up to 3 minutes before giving up.`);

          // Don't fail the booking immediately. Mark it as "still searching" with
          // currentWave = 0 so the wave scheduler keeps re-running the nearby search
          // in the background for up to 3 minutes before declaring "no vendor available".
          bookingForBackground.currentWave = 0;
          bookingForBackground.waveStartedAt = new Date();
          await bookingForBackground.save();

          const io = getIO();
          if (io) {
            io.to(`user_${userId}`).emit('booking_updated', {
              bookingId: bookingForBackground._id,
              status: BOOKING_STATUS.SEARCHING,
              message: `Searching for nearby ${bookingModel}s...`
            });
          }

          await createNotification({
            userId: userId,
            type: 'finding_professional',
            title: 'Booking Received!',
            message: `We're finding the best professional for your ${bookingForBackground.serviceName} booking. This may take a few minutes.`,
            relatedId: bookingForBackground._id,
            relatedType: 'booking',
            pushData: { type: 'booking_confirmed', bookingId: bookingForBackground._id.toString(), link: `/user/booking/${bookingForBackground._id}` }
          });
        }

        // Send notifications to Wave 1 partners
        const io = getIO();

        if (io) {
          console.log(`[CreateBooking] Emitting Socket.IO events to ${wave1Partners.length} ${bookingModel}s in Wave 1...`);
          wave1Partners.forEach(async (partner) => {
            const partnerRoom = `${bookingModel}_${partner._id.toString()}`;
            io.to(partnerRoom).emit('new_booking_request', {
              bookingId: bookingForBackground._id,
              serviceName: serviceForBackground.title,
              customerName: userForBackground.name,
              customerPhone: userForBackground.phone,
              scheduledDate: scheduledDate,
              scheduledTime: scheduledTime,
              price: workerAmount,
              address: address,
              distance: partner.distance,
              serviceCategory: bookingForBackground.serviceCategory,
              brandName: bookingForBackground.brandName,
              brandIcon: bookingForBackground.brandIcon,
              categoryIcon: bookingForBackground.categoryIcon,
              bookedItems: bookingForBackground.bookedItems,
              requirementText: bookingForBackground.requirementText,
              isConsultancyRequest: bookingForBackground.isConsultancyRequest,
              isEstimateBased: bookingForBackground.isEstimateBased,
              createdAt: bookingForBackground.createdAt || new Date(),
              expiresAt: new Date(new Date(bookingForBackground.createdAt || Date.now()).getTime() + (60 * 1000)).toISOString(),
              playSound: true,
              message: `New booking request within ${partner.distance?.toFixed(1) || '?'}km!`
            });
          });
          
          // Notify user about Wave 1 searching
          io.to(`user_${userId}`).emit('booking_updated', {
            bookingId: bookingForBackground._id,
            status: BOOKING_STATUS.SEARCHING,
            message: `Searching professionals near you... (Wave 1)`
          });
        }

        // 2. Send Firebase/FCM notifications
        try {
          const partnerNotifications = wave1Partners.map(partner =>
            createNotification({
              workerId: partner._id,
              type: 'booking_request',
              title: 'New Booking Request',
              message: `New service request for ${serviceForBackground.title} from ${userForBackground.name}`,
              relatedId: bookingForBackground._id,
              relatedType: 'booking',
              data: {
                bookingId: bookingForBackground._id,
                serviceName: serviceForBackground.title,
                customerName: userForBackground.name,
                customerPhone: userForBackground.phone,
                scheduledDate: scheduledDate,
                scheduledTime: scheduledTime,
                location: address,
                price: workerAmount,
                distance: partner.distance
              },
              pushData: {
                type: 'new_booking',
                dataOnly: false,
                link: `/worker/bookings/${bookingForBackground._id}`
              }
            })
          );
          await Promise.all(partnerNotifications);
        } catch (notifError) {
          console.error('[CreateBooking] Firebase/Notification Error:', notifError.message);
        }

        // NOTIFY USER: Send actionable notification so they can track status
        await createNotification({
          userId,
          type: 'booking_requested',
          title: 'Booking Created',
          message: `Your booking ${bookingForBackground.bookingNumber} has been created successfully.`,
          relatedId: bookingForBackground._id,
          relatedType: 'booking',
          pushData: {
            type: 'booking_requested',
            bookingId: bookingForBackground._id.toString(),
            link: `/user/booking/${bookingForBackground._id}`
            // dataOnly: true // Removed to ensure User sees the visual notification
          }
        });
        // Clear cart — single atomic operation
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
        console.log(`[CreateBooking][bg] Cart cleared for user ${userId}`);

        // Send confirmation emails (fire-and-forget — never blocks)
        sendBookingEmails(bookingForBackground, userForBackground, null, serviceForBackground)
          .catch(err => console.error('[CreateBooking][bg] Email error:', err));

      } catch (bgErr) {
        console.error('[CreateBooking][bg] Background task failed:', bgErr);
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking. Please try again.'
    });
  }
};

/**
 * Get user bookings with filters
 */
const getUserBookings = async (req, res) => {
  const MAX_RETRIES = 2;
  console.log(`[getUserBookings] Request started for user: ${req.user.id}`);

  const attempt = async () => {
    const userId = req.user.id;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    console.log(`[getUserBookings] Query params parsed: status=${status}, page=${page}, limit=${limit}`);

    // Build query
    const query = { userId };
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        query.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        query.status = status;
      }
    } else {
      // "All Bookings": exclude internal dispatch statuses
      query.status = {
        $nin: ['searching', 'SEARCHING', 'no_vendors', 'no_workers']
      };
    }
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    console.log(`[getUserBookings] Executing MongoDB query:`, JSON.stringify(query));

    console.log(`[getUserBookings] Executing countDocuments...`);
    const total = await HomeServiceBooking.countDocuments(query).exec();
    console.log(`[getUserBookings] countDocuments completed: total=${total}`);

    console.log(`[getUserBookings] Executing find() without populate...`);
    // Exclude potentially massive arrays (like base64 images) that cause network timeouts
    const bookings = await HomeServiceBooking.find(query)
      .select('-serviceImages -requirementImages -workPhotos -reviewImages')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
      .exec();
      
    console.log(`[getUserBookings] find() completed. Now populating vendorId...`);
    await HomeServiceBooking.populate(bookings, { path: 'vendorId', select: 'name businessName phone profilePhoto' });
    
    console.log(`[getUserBookings] Populating serviceId...`);
    await HomeServiceBooking.populate(bookings, { path: 'serviceId', select: 'title iconUrl' });
    
    console.log(`[getUserBookings] Populating categoryId...`);
    await HomeServiceBooking.populate(bookings, { path: 'categoryId', select: 'title slug' });
    
    console.log(`[getUserBookings] Populating workerId...`);
    await HomeServiceBooking.populate(bookings, { path: 'workerId', select: 'name phone profilePhoto' });
    
    console.log(`[getUserBookings] All populates completed!`);

    return { bookings, total, pageNum, limitNum };
  };

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`[getUserBookings] Attempt ${i + 1}`);
      const { bookings, total, pageNum, limitNum } = await attempt();
      console.log(`[getUserBookings] Sending success response...`);
      return res.status(200).json({
        success: true,
        data: bookings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error(`[getUserBookings] Error on attempt ${i + 1}:`, error);
      const isNetworkError = error.name === 'MongoNetworkTimeoutError' ||
        error.name === 'MongoServerSelectionError' ||
        error.message?.includes('timed out');

      if (isNetworkError && i < MAX_RETRIES - 1) {
        console.warn(`[getUserBookings] Network timeout on attempt ${i + 1}, retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        continue; // retry
      }

      console.error('Get user bookings error:', error);
      return res.status(500).json({
        success: false,
        message: isNetworkError
          ? 'Database connection is slow. Please try again in a moment.'
          : 'Failed to fetch bookings. Please try again.'
      });
    }
  }
};

/**
 * Get booking details by ID
 */
const getBookingById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const booking = await HomeServiceBooking.findOne({ _id: id, userId })
      .select('+visitOtp +paymentOtp +customerConfirmationOTP') // Include secure OTPs for the user
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone email address profilePhoto')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug')
      .populate('workerId', 'name phone rating totalJobs location profilePhoto')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Fetch Vendor Bill if exists
    const bill = await VendorBill.findOne({ bookingId: booking._id });

    // Convert to object to attach bill
    const bookingData = booking;
    if (bill) {
      bookingData.bill = bill;
    }

    res.status(200).json({
      success: true,
      data: bookingData
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking. Please try again.'
    });
  }
};

/**
 * Cancel booking
 */
const cancelBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    // --- REFUND & CANCELLATION FEE LOGIC ---
    let refundAmount = 0;
    let cancellationFee = 0;
    let refundMessage = '';

    // Fetch dynamic cancellation penalty from Settings
    let settingsPenalty = 49; // Default
    try {
      const globalSettings = await Settings.findOne({ type: 'global' });
      if (globalSettings && globalSettings.cancellationPenalty !== undefined) {
        settingsPenalty = globalSettings.cancellationPenalty;
      }
    } catch (err) {
      console.error('Error fetching settings for cancellation penalty:', err);
    }

    const hasStartedJourney = !!booking.journeyStartedAt;
    const isPaid = booking.paymentStatus === PAYMENT_STATUS.SUCCESS;
    const isWalletOrOnline = ['wallet', 'razorpay', 'upi', 'card'].includes(booking.paymentMethod);
    const isCash = booking.paymentMethod === 'cash';

    if (hasStartedJourney) {
      // SCENARIO: Worker/Vendor already started journey

      const hasReached = !!booking.visitedAt || booking.status === 'visited';

      if (hasReached) {
        // Professional Reached -> Full Visiting Charges
        cancellationFee = booking.visitingCharges || 49;
      } else {
        // Before Arrival (Journey Started) -> Dynamic Penalty
        cancellationFee = settingsPenalty;
      }

      if (isPaid && isWalletOrOnline) {
        // User paid upfront -> Refund (Total - Fee)
        refundAmount = Math.max(0, booking.finalAmount - cancellationFee);
        refundMessage = `Booking cancelled after ${hasReached ? 'professional arrival' : 'journey start'}. Refund of ₹${refundAmount} initiated (Cancellation Fee: ₹${cancellationFee} deducted).`;
      } else {
        // User hasn't paid (e.g. COD or pending) -> Add Penalty to Wallet for Next Booking
        refundAmount = 0;
        refundMessage = `Booking cancelled after ${hasReached ? 'professional arrival' : 'journey start'}. A cancellation fee of ₹${cancellationFee} has been added to your account and will be charged on your next booking.`;

        // We will add this to user.wallet.penalty below
      }
    } else {
      // SCENARIO: Cancelled before journey start
      // Policy: Full Refund
      cancellationFee = 0;

      if (isPaid && isWalletOrOnline) {
        refundAmount = booking.finalAmount;
        refundMessage = `Booking cancelled successfully. Full refund of ₹${refundAmount} initiated to your wallet.`;
      } else {
        refundAmount = 0;
        refundMessage = 'Booking cancelled successfully.';
      }
    }

    // Update User Wallet
    if (refundAmount > 0 || (cancellationFee > 0 && !isPaid)) {

      const user = await User.findById(userId);

      // 1. Process Refund
      if (refundAmount > 0) {
        user.wallet.balance = (user.wallet.balance || 0) + refundAmount;

        await Transaction.create({
          userId: user._id,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          paymentMethod: 'wallet',
          description: `Refund for booking #${booking.bookingNumber}`,
          bookingId: booking._id,
          balanceAfter: user.wallet.balance
        });

        booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
      }

      // 2. Process Cancellation Fee (Add to Penalty Bucket if Unpaid)
      if (cancellationFee > 0 && !isPaid) {
        // Use wallet.penalty bucket
        user.wallet.penalty = (user.wallet.penalty || 0) + cancellationFee;
        // Do NOT create a 'debit' transaction yet, as money hasn't left. 
        // Or create a 'penalty_added' transaction?
        // User didn't ask for transaction record logic, just functionality.
        // We will skip transaction for penalty addition to keep it simple, 
        // as the actual CHARGE happens on next booking creation.

        console.log(`[CancelBooking] Added penalty of ₹${cancellationFee} to user ${userId}. Total Penalty: ${user.wallet.penalty}`);
      }

      await user.save();
    }

    // Update booking status
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'user';
    booking.cancellationReason = cancellationReason || 'Cancelled by user';

    await booking.save();

    // Find all pending booking requests for this booking to notify workers and clean up
    try {
      const io = getIO();
      const pendingRequests = await BookingRequest.find({ bookingId: booking._id, status: 'PENDING' });
      
      for (const req of pendingRequests) {
        // Emit cancellation to worker so their alert modal disappears
        io.to(`worker_${req.workerId}`).emit('job_cancelled', {
          bookingId: booking._id.toString(),
          message: 'Booking cancelled by customer'
        });
      }

      // Mark these requests as cancelled
      await BookingRequest.updateMany(
        { bookingId: booking._id, status: 'PENDING' },
        { $set: { status: 'CANCELLED' } }
      );
    } catch (err) {
      console.error('[CancelBooking] Error notifying workers about cancellation:', err);
    }

    // Send notification to user
    await createNotification({
      userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: refundMessage || `Your booking ${booking.bookingNumber} has been cancelled.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: {
        type: 'booking_cancelled',
        bookingId: booking._id.toString(),
        link: `/user/booking/${booking._id}`
      }
    });

    // Manual FCM push removed (handled by createNotification)

    // Send notification to vendor
    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Booking ${booking.bookingNumber} has been cancelled by the customer.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: {
          type: 'booking_cancelled',
          bookingId: booking._id.toString(),
          link: `/vendor/bookings/${booking._id}`
        }
      });
      // Manual FCM push removed
    }

    // Notify worker if assigned
    if (booking.workerId) {
      await createNotification({
        workerId: booking.workerId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Job ${booking.bookingNumber} has been cancelled by the customer.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: {
          type: 'job_cancelled',
          bookingId: booking._id.toString(),
          link: `/worker/job/${booking._id}`
        }
      });
      // Manual FCM push removed
    }

    res.status(200).json({
      success: true,
      message: refundMessage || 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking. Please try again.'
    });
  }
};

/**
 * Reschedule booking
 */
const rescheduleBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { scheduledDate, scheduledTime, timeSlot } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be rescheduled
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule completed booking'
      });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule cancelled booking'
      });
    }

    // Update booking
    booking.scheduledDate = new Date(scheduledDate);
    booking.scheduledTime = scheduledTime;
    booking.timeSlot = {
      start: timeSlot.start,
      end: timeSlot.end
    };

    // Reset status to pending if it was confirmed
    if (booking.status === BOOKING_STATUS.CONFIRMED) {
      booking.status = BOOKING_STATUS.PENDING;
    }

    await booking.save();

    // Send notification to vendor
    await createNotification({
      vendorId: booking.vendorId,
      type: 'booking_created', // Keeping type as is for now
      title: 'Booking Rescheduled',
      message: `Booking ${booking.bookingNumber} has been rescheduled.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: {
        type: 'booking_rescheduled',
        bookingId: booking._id.toString(),
        link: `/vendor/bookings/${booking._id}`
      }
    });

    res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Reschedule booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule booking. Please try again.'
    });
  }
};

/**
 * Add review and rating after completion
 */
const addReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { rating, review, reviewImages } = req.body;

    const booking = await HomeServiceBooking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is completed or work is done
    if (booking.status !== BOOKING_STATUS.COMPLETED && booking.status !== BOOKING_STATUS.WORK_DONE) {
      return res.status(400).json({
        success: false,
        message: 'Can only review bookings after work is done'
      });
    }

    // Check if already reviewed
    if (booking.rating) {
      return res.status(400).json({
        success: false,
        message: 'Booking already reviewed'
      });
    }

    // Update booking
    booking.rating = rating;
    booking.review = review || null;
    booking.reviewImages = reviewImages || [];
    booking.reviewedAt = new Date();

    await booking.save();

    // Create a new Review document for the Review model (used by Admin)
    try {
      await Review.create({
        bookingId: booking._id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        vendorId: booking.vendorId,
        workerId: booking.workerId,
        rating: rating,
        review: review || '',
        images: reviewImages || [],
        status: 'active'
      });
    } catch (reviewErr) {
      console.error('Error creating separate review document:', reviewErr);
      // We don't fail the request if the separate review creation fails
    }

    // Helper to update cumulative rating on Model
    const updateCumulativeRating = async (Model, docId, newRating) => {
      try {
        const doc = await Model.findById(docId);
        if (!doc) return;

        const oldTotal = doc.totalReviews || 0;
        const oldRating = doc.rating || 0;

        const newTotal = oldTotal + 1;
        const updatedRating = ((oldRating * oldTotal) + newRating) / newTotal;

        doc.rating = Number(updatedRating.toFixed(2));
        doc.totalReviews = newTotal;
        await doc.save();
      } catch (err) {
        console.error(`Error updating rating for ${Model.modelName}:`, err);
      }
    };

    // Update Vendor Rating (Always)
    if (booking.vendorId) {
      await updateCumulativeRating(Vendor, booking.vendorId, rating);
    }

    // Update Worker Rating (Only if worker was assigned)
    if (booking.workerId) {
      await updateCumulativeRating(Worker, booking.workerId, rating);
    }

    // Send notification to vendor
    await createNotification({
      vendorId: booking.vendorId,
      type: 'review_submitted',
      title: 'New Review Received',
      message: `You have received a ${rating}-star review for booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });

    res.status(200).json({
      success: true,
      message: 'Review added successfully',
      data: booking
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review. Please try again.'
    });
  }
};

/**
 * Get user ratings and reviews (given by the user)
 */
const getUserRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch bookings where rating is not null
    const bookings = await HomeServiceBooking.find({ userId, rating: { $ne: null } })
      .populate('vendorId', 'name businessName profilePhoto')
      .populate('serviceId', 'title iconUrl')
      .populate('workerId', 'name profilePhoto')
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await HomeServiceBooking.countDocuments({ userId, rating: { $ne: null } });

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your ratings'
    });
  }
};

// @desc    Approve estimate and pay token
// @route   POST /api/v1/hs-bookings/:id/approve-estimate
// @access  Private (User)
const approveEstimate = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await HomeServiceBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.isEstimateBased || booking.estimate?.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'No pending estimate found for this booking' });
    }

    // Update estimate status
    booking.estimate.status = 'APPROVED';
    
    // Set actual pricing now that estimate is approved
    booking.basePrice = booking.estimate.amount;
    booking.finalAmount = booking.estimate.amount;
    
    // Deduct token from what's left to pay later
    booking.userPayableAmount = booking.estimate.amount - booking.estimate.tokenAmount;
    
    // Status can remain visited or go to in_progress depending on business logic
    // Let's set it to IN_PROGRESS so the worker can start the job
    booking.status = BOOKING_STATUS.IN_PROGRESS;

    await booking.save();

    // Notify worker via Socket
    const io = req.app.get('io');
    if (io && booking.workerId) {
      io.to(`worker_${String(booking.workerId)}`).emit('booking_updated', {
        bookingId: booking._id,
        status: booking.status,
        estimateStatus: 'APPROVED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Estimate approved successfully',
      data: booking
    });
  } catch (error) {
    console.error('Approve estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve estimate'
    });
  }
};

export {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  addReview,
  getUserRatings,
  approveEstimate
};

