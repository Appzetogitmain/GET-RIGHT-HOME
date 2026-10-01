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
import { filterAvailableWorkers, findWorkerConflict, findWorkerUnavailability, checkSlotLeadTime, checkAdvanceWindow, isFutureIstDay, getSlotAvailability, getAdvanceBookingDays, istYmd, addDaysYmd } from '../utils/slotAvailability.js';
import { generateTimeSlots } from '../utils/slotGenerator.js';


import Zone from '../models/Zone.js';
import { getIO } from '../sockets.js';
import { sendBookingEmails } from '../services/emailService.js';
import { computeBookingPricing, pricingMatchesClient } from '../utils/bookingPricing.js';
import referralService from '../services/referralService.js';
import { syncWorkerCapacityStatus } from '../services/workerCapacityService.js';
import { supportsBookingMode } from '../utils/bookingModes.js';
import { computeVip, splitAdvance } from '../utils/vipAndAdvance.js';
import { dispatchBooking, NO_WORKERS_MESSAGE } from '../services/bookingDispatchService.js';

/**
 * Which dates/slots can be booked for a service at an address.
 * A slot is offered only if at least one approved worker who provides this
 * service in the address's zone is free for it (marked day, no leave, no clash
 * with another job inside the buffer). Query: serviceId, lat, lng.
 */
const getSlotAvailabilityForUser = async (req, res) => {
  try {
    const { serviceId } = req.query;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!serviceId || Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'serviceId, lat and lng are required' });
    }

    const [platform, advanceDays, hsSettings] = await Promise.all([
      PlatformSettings.getSettings(),
      getAdvanceBookingDays(),
      Settings.findOne({ type: 'global' }).select('searchRadius').lean()
    ]);
    const hours = platform.operatingHours || {};
    const slots = generateTimeSlots(hours.openingTime, hours.closingTime, hours.slotDuration, hours.slotInterval);
    const today = istYmd(new Date());
    const ymds = Array.from({ length: advanceDays }, (_, i) => addDaysYmd(today, i));
    const base = { success: true, advanceBookingDays: advanceDays };

    // Same zone gate as createBooking.
    if (await Zone.countDocuments({ status: 'active' }) > 0) {
      const zone = await Zone.findOne({
        status: 'active',
        area: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [lng, lat] } } }
      }).select('_id').lean();
      if (!zone) {
        return res.json({ ...base, serviceable: false, dates: ymds.map((date) => ({ date, available: false, slots: [] })) });
      }
    }

    let service = null;
    if (mongoose.Types.ObjectId.isValid(serviceId)) {
      service = await Service.findById(serviceId).select('title categoryId categoryIds category').lean();
    }
    const categoryId = service?.categoryId || service?.categoryIds?.[0];
    const category = categoryId ? await HomeServiceCategory.findById(categoryId).select('title slug').lean() : null;

    const candidates = await findNearbyWorkers(
      { lat, lng },
      hsSettings?.searchRadius || 10,
      {
        service: category?.title || service?.category || req.query.category || 'General',
        serviceName: service?.title,
        categoryId: category?._id || categoryId,
        slug: category?.slug,
        bookingMode: 'slot',
        includeOffline: true
      }
    );
    const seen = new Set();
    const workers = candidates.filter((w) => {
      const id = String(w._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const dates = await getSlotAvailability({ workers, ymds, slots });
    res.json({ ...base, serviceable: true, dates });
  } catch (error) {
    console.error('[SlotAvailability] error:', error);
    res.status(500).json({ success: false, message: 'Could not load slot availability' });
  }
};



// serviceId -> price, plus "serviceId|option" -> price for services with options.
const buildTrustedPrices = (services) => {
  const map = new Map();
  for (const p of services) {
    map.set(String(p._id), p.discountPrice > 0 ? p.discountPrice : p.basePrice);
    for (const o of p.options || []) {
      map.set(`${p._id}|${o.label}`, o.discountPrice > 0 ? o.discountPrice : o.price);
    }
  }
  return map;
};

/**
 * Price preview for checkout: what the booking costs, what VIP would change,
 * and how much is paid now vs after the work. Mirrors createBooking's rules but
 * writes nothing. Body: { serviceId, bookedItems, visitingCharges, promoDiscount }
 */
const quoteBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    let { serviceId, bookedItems, visitingCharges, promoDiscount } = req.body;
    if (serviceId && typeof serviceId === 'object') serviceId = serviceId._id || serviceId.id;

    const [user, hs] = await Promise.all([
      User.findById(userId).select('wallet hsVip'),
      Settings.findOne({ type: 'global' }).lean()
    ]);

    let service = null;
    if (mongoose.Types.ObjectId.isValid(serviceId)) {
      service = await Service.findById(serviceId).select('basePrice discountPrice').lean();
    } else if (Array.isArray(bookedItems) && bookedItems.length > 0) {
      const item = bookedItems[0];
      service = { basePrice: item.card?.price || item.price || 0, discountPrice: 0 };
    }
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    let trustedPrices = null;
    if (Array.isArray(bookedItems) && bookedItems.length > 0) {
      const itemIds = bookedItems
        .map((it) => String(it?.serviceId?._id || it?.serviceId || it?.card?._id || it?._id || ''))
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (itemIds.length > 0) {
        const priced = await Service.find({ _id: { $in: itemIds } }).select('basePrice discountPrice options').lean();
        trustedPrices = buildTrustedPrices(priced);
      }
    }

    const pricing = computeBookingPricing({
      service,
      bookedItems,
      trustedPrices,
      visitingCharges,
      promoDiscount,
      pendingPenalty: user?.wallet?.penalty || 0
    });

    const vip = computeVip({
      settings: hs,
      user,
      taxableBase: pricing.basePrice - pricing.discount - pricing.promoDiscount
    });
    const online = hs?.isOnlinePaymentEnabled !== false;

    const optionFor = (serviceTotal, fee) => {
      const split = splitAdvance({ settings: hs, serviceTotal });
      return {
        serviceTotal,
        vipFee: fee,
        payNow: online ? split.payNow + fee : 0,
        payLater: online ? split.payLater : split.total,
        fullUpfront: split.full,
        advancePercent: split.percent
      };
    };

    // A member already gets the discount; everyone else sees it as an offer.
    const withoutVip = optionFor(pricing.finalAmount, 0);
    const afterDiscount = Math.max(0, pricing.finalAmount - vip.discount);
    const withVip = vip.eligible ? optionFor(afterDiscount, vip.fee) : null;
    // What the customer pays under each plan on offer (the discount is the same).
    const planOptions = vip.eligible && !vip.isMember
      ? vip.plans.map((p) => ({ ...p, option: optionFor(afterDiscount, p.price), netSaving: vip.discount - p.price }))
      : [];

    res.json({
      success: true,
      amount: { subtotal: pricing.basePrice - pricing.discount - pricing.promoDiscount, total: pricing.finalAmount },
      isMember: vip.isMember,
      memberExpiry: vip.isMember ? user.hsVip.expiry : null,
      vip: vip.enabled ? {
        eligible: vip.eligible,
        planName: vip.planName,
        price: vip.price,
        originalPrice: vip.originalPrice,
        tiers: vip.tiers,
        maxPercent: vip.maxPercent,
        durationDays: vip.durationDays,
        plans: planOptions,
        percent: vip.percent,
        discount: vip.discount,
        netSaving: vip.netSaving
      } : null,
      // What the customer pays if they take / skip the offer. For a member,
      // `skip` already includes their discount.
      options: vip.isMember && withVip ? { skip: withVip, vip: null } : { skip: withoutVip, vip: withVip },
      advanceRule: { threshold: hs?.advancePaymentThreshold ?? 2000, percent: hs?.advancePaymentPercent ?? 30 }
    });
  } catch (error) {
    console.error('Quote booking error:', error);
    res.status(500).json({ success: false, message: 'Could not calculate the price' });
  }
};

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
      requirementImages,
      addVip, // customer chose to add the VIP membership offered at checkout
      vipPlanKey // which VIP plan they picked
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
    let user = await User.findById(userId).select('name phone wallet plans hsVip');

    if (mongoose.Types.ObjectId.isValid(serviceId)) {
      service = await Service.findById(serviceId).select('title basePrice discountPrice description images iconUrl categoryId category categoryIds bookingModes isInstant').lean();
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
    const category = categoryId ? await HomeServiceCategory.findById(categoryId).select('title icon image slug isEstimateBased bookingModes').lean() : null;
    const requestedBookingMode = bookingType === 'instant' ? 'instant' : 'slot';
    const serviceSupportsMode = service.isEstimateBased
      ? supportsBookingMode(category, requestedBookingMode)
      : (requestedBookingMode === 'instant' && service.isInstant === true) || supportsBookingMode(service, requestedBookingMode);
    if (!serviceSupportsMode) {
      return res.status(400).json({
        success: false,
        code: 'BOOKING_MODE_NOT_ALLOWED',
        message: `This service is not available for ${requestedBookingMode === 'instant' ? 'Instant' : 'Slot'} booking.`
      });
    }

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

    // --- SAME-DAY LEAD TIME GATE ---
    if (bookingType !== 'instant') {
      const leadError = await checkSlotLeadTime({ scheduledDate, timeSlot });
      if (leadError) {
        return res.status(400).json({ success: false, code: 'SLOT_TOO_SOON', message: leadError });
      }
      const advanceError = await checkAdvanceWindow({ scheduledDate, timeSlot });
      if (advanceError) {
        return res.status(400).json({ success: false, code: 'SLOT_TOO_FAR', message: advanceError });
      }
    }

    // --- ZONE AVAILABILITY GATE ---
    // If the platform has active service zones configured, the booking
    // address must fall inside one of them. Previously this was only
    // checked deep inside findNearbyWorkers() *after* the booking had
    // already been created, so users outside every zone would still get a
    // booking stuck in "searching" for 3 minutes before being told no
    // vendor was available. Reject upfront instead, before anything is
    // created or charged.
    let matchingZone = null;
    const activeZoneCount = await Zone.countDocuments({ status: 'active' });
    if (activeZoneCount > 0) {
      matchingZone = await Zone.findOne({
        status: 'active',
        area: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [bookingLocation.lng, bookingLocation.lat]
            }
          }
        }
      }).select('_id name').lean();

      if (!matchingZone) {
        console.log(`[CreateBooking] Rejected: address [${bookingLocation.lng}, ${bookingLocation.lat}] is outside all active zones.`);
        return res.status(400).json({
          success: false,
          code: 'OUT_OF_SERVICE_AREA',
          message: 'Service is not available in your area yet. Please try a different address or check back soon.'
        });
      }
    }

    let nearbyPartners = await findNearbyWorkers(
      bookingLocation,
      searchRadius,
      {
        service: category?.title || reqServiceCategory || (service ? service.category : 'General'),
        serviceName: service?.title,
        categoryId: category?._id || categoryId,
        slug: category?.slug,
        bookingMode: bookingType === 'instant' ? 'instant' : 'slot',
        // Future-day bookings also reach workers who are offline right now;
        // their marked days / leave decide availability, not the toggle.
        includeOffline: bookingType !== 'instant' && isFutureIstDay(scheduledDate)
      }
    );

    // Deduplicate nearbyPartners by _id to prevent duplicate notifications
    const uniquePartnerIds = new Set();
    nearbyPartners = nearbyPartners.filter(partner => {
      const idStr = partner._id.toString();
      if (uniquePartnerIds.has(idStr)) return false;
      uniquePartnerIds.add(idStr);
      return true;
    });

    // --- SLOT BUFFER GATE ---
    // Drop workers who already hold a job whose slot is within the admin-set
    // buffer of the requested one. If the zone has workers but every one of
    // them is tied up, a scheduled booking is rejected now instead of being
    // accepted and then sitting unassigned.
    const workersBeforeSlotCheck = nearbyPartners.length;
    if (workersBeforeSlotCheck > 0 && bookingType !== 'instant') {
      nearbyPartners = await filterAvailableWorkers(nearbyPartners, { scheduledDate, timeSlot });
      if (nearbyPartners.length === 0) {
        return res.status(409).json({
          success: false,
          code: 'SLOT_UNAVAILABLE',
          message: 'Fully booked for this slot due to high demand. Please choose another slot or date.'
        });
      }
    }

    // Instant bookings: online/day-off/leave rules still apply. The shared
    // capacity gate inside filterAvailableWorkers also removes every worker
    // holding an accepted job until that work is marked done.
    if (bookingType === 'instant' && nearbyPartners.length > 0) {
      nearbyPartners = await filterAvailableWorkers(nearbyPartners, { scheduledDate: new Date(), timeSlot }, { ignoreBookings: true });
    }

    console.log(`[CreateBooking] Found ${nearbyPartners.length} nearby ${bookingModel}s for booking`);
    // Store in a shared variable for background tasks
    const foundPartners = nearbyPartners;

    // Nobody in the zone can take this service (no matching worker, or none
    // allowed for this booking type). There's nothing to search for, so don't
    // make the customer wait through a retry window: the booking goes straight
    // to the admin's manual-assignment queue and the customer is told so now.
    const noWorkersAvailable = foundPartners.length === 0;
    // --- END SEARCH BLOCK ---

    // Calculate pricing - use amount from frontend if provided, otherwise calculate
    let basePrice, discount, tax, finalAmount;
    // VIP membership (offered at checkout) and advance payment settings.
    const hsFull = await Settings.findOne({ type: 'global' }).lean();
    let vipDiscount = 0;
    let vipFee = 0;
    let vipInfo = { added: false, member: false, planName: '', percent: 0, durationDays: 0, activated: false };
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
      // SECURITY: pricing is recomputed from the service records the server
      // loaded. The client's basePrice/tax/discount/promoDiscount used to be
      // written straight onto the booking, so a request claiming
      // `basePrice: 1` booked a ₹629 service for ₹1. Those fields are now only
      // compared against the server's own figure.
      //
      // Cart lines are priced from a server-side lookup keyed by serviceId, so
      // a tampered per-item `price` can't inflate or deflate the total either.
      let trustedPrices = null;
      if (Array.isArray(bookedItems) && bookedItems.length > 0) {
        const itemIds = bookedItems
          .map((it) => String(it?.serviceId?._id || it?.serviceId || it?.card?._id || it?._id || ''))
          .filter((id) => mongoose.Types.ObjectId.isValid(id));

        if (itemIds.length > 0) {
          const priced = await Service.find({ _id: { $in: itemIds } })
            .select('basePrice discountPrice options')
            .lean();
          trustedPrices = buildTrustedPrices(priced);
        }
      }

      const pricing = computeBookingPricing({
        service,
        bookedItems,
        trustedPrices,
        visitingCharges,
        // Promo validation lives upstream; clamp here so a promo can never
        // exceed the service value regardless of what was sent.
        promoDiscount: reqPromoDiscount,
        pendingPenalty
      });

      basePrice = pricing.basePrice;
      discount = pricing.discount;
      tax = pricing.tax;
      visitingCharges = pricing.visitingCharges;
      finalAmount = pricing.finalAmount;

      // VIP: a member gets the % off for free; anyone else gets it only if they
      // chose to add the membership (fee is charged with the advance below).
      const vipCalc = computeVip({
        settings: hsFull,
        user,
        taxableBase: pricing.basePrice - pricing.discount - pricing.promoDiscount,
        planKey: vipPlanKey
      });
      if (vipCalc.eligible && (vipCalc.isMember || addVip === true)) {
        vipDiscount = vipCalc.discount;
        vipFee = vipCalc.fee;
        vipInfo = {
          added: !vipCalc.isMember,
          member: vipCalc.isMember,
          planName: vipCalc.planName,
          percent: vipCalc.percent,
          durationDays: vipCalc.durationDays,
          activated: vipCalc.isMember
        };
        finalAmount = Math.max(0, finalAmount - vipDiscount);
      }

      if (!pricingMatchesClient(finalAmount, amount)) {
        console.warn(
          `[CreateBooking] Client/server price mismatch for user ${userId}: client=${amount}, server=${finalAmount} (service ${service._id}). Charging server price.`
        );
      }
    }

    // NOTE: vendor earnings are NOT calculated at booking creation.
    // They are computed ONLY at bill generation (completeSelfJob) and stored in VendorBill.
    // This prevents inconsistency between Booking and VendorBill.
    console.log(`[CreateBooking] Payment=${paymentMethod}, FinalAmount=${finalAmount}, Penalty=${pendingPenalty}`);

    // NOTE: the pending penalty is deliberately NOT cleared here.
    //
    // It used to be zeroed at booking creation, before the booking was even
    // saved and long before payment — `paymentStatus` is still `pending` at
    // this point, and COD settles much later. If creation failed afterwards,
    // or the user never paid, the penalty was already gone with no way to
    // restore it. It is now cleared only when the payment that includes it is
    // confirmed (see markPenaltySettled).

    // Ensure minimum amount for Razorpay (₹1) for paid bookings
    if (finalAmount < 1 && paymentMethod !== 'plan_benefit') {
      finalAmount = 1;
    }

    // --- ADVANCE PAYMENT ---
    // Below the admin's threshold the whole service amount is paid online up
    // front; above it only the admin's % is. The VIP fee (if any) is always
    // paid up front. Nothing is dispatched to a worker until this is paid.
    const advance = splitAdvance({ settings: hsFull, serviceTotal: finalAmount });
    const onlineAllowed = hsFull?.isOnlinePaymentEnabled !== false;
    const requiresAdvance = onlineAllowed && paymentMethod !== 'plan_benefit' && (advance.payNow + vipFee) > 0;
    const payNowAmount = requiresAdvance ? advance.payNow + vipFee : 0;

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
      userPayableAmount: finalAmount + vipFee,
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
      status: requiresAdvance
        ? BOOKING_STATUS.PENDING
        : (noWorkersAvailable ? BOOKING_STATUS.MANUAL_ASSIGNMENT_REQUIRED : bookingStatus),
      assignmentStatus: requiresAdvance ? 'pending' : (noWorkersAvailable ? 'manual_assignment_required' : 'pending'),
      advanceStatus: requiresAdvance ? 'awaiting' : 'none',
      advanceRequired: requiresAdvance ? advance.payNow : 0,
      vipDiscount,
      vipFee,
      vip: vipInfo,
      paymentStatus: bookingPaymentStatus,
      zoneId: matchingZone?._id || null,
      zoneName: matchingZone?.name || address.city || null
      // notifiedVendors will be set after wave sorting
    });

    // Mark referral voucher as redeemed if used
    if (reqPromoCode) {
      try {
        await referralService.redeemVoucher(reqPromoCode, userId, booking._id);
      } catch (voucherErr) {
        console.error('[CreateBooking] Error redeeming voucher:', voucherErr);
      }
    }

    // --- RESPONSE ---
    res.status(201).json({
      success: true,
      message: requiresAdvance
        ? 'Booking created. Pay the advance to confirm it.'
        : (noWorkersAvailable ? NO_WORKERS_MESSAGE : 'Booking created successfully. We are finding vendors for you.'),
      noWorkersAvailable,
      requiresPayment: requiresAdvance,
      payment: {
        payNowAmount,
        advanceAmount: requiresAdvance ? advance.payNow : 0,
        vipFee,
        payLaterAmount: advance.payLater,
        serviceTotal: finalAmount,
        fullPaymentUpfront: advance.full,
        advancePercent: advance.percent,
        vipDiscount
      },
      data: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        advanceStatus: booking.advanceStatus,
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

    // Without an advance to collect the booking goes out right away; otherwise
    // dispatch happens when the advance is confirmed (see paymentController).
    if (!requiresAdvance) {
      setImmediate(() => {
        dispatchBooking(booking._id).catch((err) => console.error('[CreateBooking] dispatch failed:', err));
      });
    }

  } catch (error) {
    console.error('Create booking error:', error);

    // A schema validation failure is bad input, not a server fault. Returning
    // 500 with a generic message left the client unable to tell the user which
    // field was wrong — every mistake looked like an outage.
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors || {}).map((e) => ({
          field: e.path,
          message: e.message
        }))
      });
    }

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
    }
    // else: no status filter → return everything.
    //
    // These used to be excluded as "internal dispatch statuses", which meant a
    // booking the customer had just paid for was INVISIBLE in My Bookings for
    // the whole time we were finding a professional — and a booking that ended
    // in `no_workers` disappeared permanently without the customer ever being
    // told. Both are real, user-meaningful states ("Finding Professional" /
    // "Assigning Professional") and must be shown; the customer-facing label
    // is mapped in the UI so internal names are never exposed.
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
      // Helper payouts are internal: customers never see them.
      .select('-serviceImages -requirementImages -workPhotos -reviewImages -helpers -helperRequests')
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
    // Helper payouts are internal: customers never see them.
    delete bookingData.helpers;
    delete bookingData.helperRequests;
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
    // PAYMENT_STATUS has no SUCCESS member — it was `undefined`, so this
    // comparison was false for every real booking and prepaid customers were
    // refunded ₹0 on cancellation. PLAN_COVERED counts as paid too: the user
    // already gave up plan credit for it.
    const isPaid = [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PLAN_COVERED].includes(booking.paymentStatus);
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

    // An advance already paid online comes back to the wallet; any cancellation
    // fee is taken out of it first, and only a shortfall becomes a penalty.
    let penaltyToAdd = cancellationFee > 0 && !isPaid ? cancellationFee : 0;
    const advanceHeld = isPaid ? 0 : (booking.advancePaid || 0);
    if (advanceHeld > 0) {
      const feeFromAdvance = Math.min(cancellationFee, advanceHeld);
      const advanceRefund = advanceHeld - feeFromAdvance;
      penaltyToAdd = Math.max(0, cancellationFee - feeFromAdvance);
      refundAmount += advanceRefund;
      refundMessage = `Booking cancelled. ₹${advanceRefund} of your advance has been refunded to your wallet${feeFromAdvance > 0 ? ` (cancellation fee ₹${feeFromAdvance} deducted)` : ''}.`;
    }

    // Update User Wallet
    if (refundAmount > 0 || penaltyToAdd > 0) {

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
      if (penaltyToAdd > 0) {
        // Use wallet.penalty bucket
        user.wallet.penalty = (user.wallet.penalty || 0) + penaltyToAdd;
        // Do NOT create a 'debit' transaction yet, as money hasn't left. 
        // Or create a 'penalty_added' transaction?
        // User didn't ask for transaction record logic, just functionality.
        // We will skip transaction for penalty addition to keep it simple, 
        // as the actual CHARGE happens on next booking creation.

        console.log(`[CancelBooking] Added penalty of ₹${penaltyToAdd} to user ${userId}. Total Penalty: ${user.wallet.penalty}`);
      }

      await user.save();
    }

    // Update booking status
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'user';
    booking.cancellationReason = cancellationReason || 'Cancelled by user';

    await booking.save();
    if (booking.workerId) {
      const capacity = await syncWorkerCapacityStatus(booking.workerId);
      getIO()?.to(`worker_${booking.workerId}`).emit('worker_capacity_changed', {
        status: capacity?.status,
        isBusy: capacity?.isBusy || false,
        reason: 'booking_cancelled'
      });
    }

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

    const leadError = await checkSlotLeadTime({ scheduledDate: new Date(scheduledDate), timeSlot });
    if (leadError) {
      return res.status(400).json({ success: false, code: 'SLOT_TOO_SOON', message: leadError });
    }
    const advanceError = await checkAdvanceWindow({ scheduledDate: new Date(scheduledDate), timeSlot });
    if (advanceError) {
      return res.status(400).json({ success: false, code: 'SLOT_TOO_FAR', message: advanceError });
    }

    // The assigned worker must still be free (with buffer) at the new time.
    if (booking.workerId) {
      const conflict = await findWorkerConflict(
        booking.workerId,
        { _id: booking._id, scheduledDate: new Date(scheduledDate), timeSlot },
        { excludeBookingId: booking._id }
      );
      const unavailable = conflict || await findWorkerUnavailability(
        booking.workerId,
        { _id: booking._id, scheduledDate: new Date(scheduledDate), timeSlot },
        { excludeBookingId: booking._id }
      );
      if (unavailable) {
        return res.status(409).json({
          success: false,
          code: 'SLOT_UNAVAILABLE',
          message: 'Your professional is not available at that time. Please choose a different time slot.'
        });
      }
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

/**
 * @desc    Add or change an optional tip on the final bill, before paying.
 *
 * Always recomputes from the VendorBill's own amounts (not the booking's
 * current finalAmount, which may already carry a previous tip) — otherwise
 * calling this twice would compound instead of replace.
 *
 * The tip is added on top of finalAmount/finalOnlineAmount/finalCashAmount
 * so the existing payment paths (Razorpay checkout, the worker's UPI-QR
 * flow) charge the right total without any change to them — both already
 * read these fields fresh at the moment payment is actually requested.
 * Worker crediting (100%, no commission) is handled where those paths
 * settle: paymentController's Razorpay wallet credit, and
 * confirmManualOnlineCollection.
 *
 * @route   PUT /api/hs-bookings/:id/tip
 * @access  Private (User)
 */
const setTip = async (req, res) => {
  try {
    const { id } = req.params;
    const rawAmount = req.body.tipAmount;
    const tipAmount = Number(rawAmount);

    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid tip amount' });
    }
    // A sanity cap — not a real business limit, just guards against a typo
    // or bad input turning into an enormous charge.
    if (tipAmount > 5000) {
      return res.status(400).json({ success: false, message: 'Tip amount is too high' });
    }

    const booking = await HomeServiceBooking.findOne({ _id: id, userId: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.isWorkerPaid === true || booking.paymentStatus === PAYMENT_STATUS.PAID) {
      return res.status(400).json({ success: false, message: 'This booking is already paid — a tip can no longer be added' });
    }

    const payableStatuses = [BOOKING_STATUS.WORK_DONE, BOOKING_STATUS.AWAITING_PAYMENT];
    if (!payableStatuses.includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'The final bill is not ready yet' });
    }

    const bill = await VendorBill.findOne({ bookingId: booking._id });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found for this booking' });
    }

    booking.tipAmount = tipAmount;
    booking.finalOnlineAmount = Number((bill.finalOnlineAmount || 0) + tipAmount);
    booking.finalCashAmount = Number((bill.finalCashAmount || 0) + tipAmount);
    // Default to online, same convention createBill uses.
    booking.finalAmount = booking.finalOnlineAmount;
    await booking.save();

    res.status(200).json({
      success: true,
      message: tipAmount > 0 ? 'Tip added' : 'Tip removed',
      data: {
        tipAmount: booking.tipAmount,
        finalAmount: booking.finalAmount,
        finalOnlineAmount: booking.finalOnlineAmount,
        finalCashAmount: booking.finalCashAmount
      }
    });
  } catch (error) {
    console.error('Set tip error:', error);
    res.status(500).json({ success: false, message: 'Failed to update tip' });
  }
};

export {
  quoteBooking,
  getSlotAvailabilityForUser,
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  addReview,
  getUserRatings,
  approveEstimate,
  setTip
};

