import mongoose from 'mongoose';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import HomeServiceCategory from '../models/HomeServiceCategory.js';
import HomeServiceSubCategory from '../models/HomeServiceSubCategory.js';
import Service from '../models/HomeServiceService.js';
import EstimateRateItem from '../models/EstimateRateItem.js';
import EstimateSettings from '../models/EstimateSettings.js';
import Zone from '../models/Zone.js';
import User from '../models/User.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { checkSlotLeadTime, checkAdvanceWindow, istDayStart } from '../utils/slotAvailability.js';
import { dispatchBooking } from '../services/bookingDispatchService.js';
import { syncWorkerCapacityStatus } from '../services/workerCapacityService.js';
import { createNotification } from './notificationControllers/notificationController.js';
import { getIO } from '../sockets.js';
import { getRateCard, seedDefaultRateCard } from '../services/estimateService.js';

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

/* ------------------------------------------------------------------ */
/* Customer: book a visit, decline an estimate                         */
/* ------------------------------------------------------------------ */

/** GET /api/estimates/config?categoryId= — what the "book a visit" page needs. */
export const getVisitConfig = async (req, res) => {
  try {
    const { categoryId } = req.query;
    if (!isId(categoryId)) return res.status(400).json({ success: false, message: 'categoryId is required' });
    const category = await HomeServiceCategory.findOne({ _id: categoryId, isEstimateBased: true }).select('title icon image').lean();
    if (!category) return res.status(404).json({ success: false, message: 'This service is not available' });
    const [subs, rule, anyService] = await Promise.all([
      HomeServiceSubCategory.find({ categoryId, isActive: true }).select('title iconUrl imageUrl description').lean(),
      EstimateSettings.getFor(categoryId),
      // slot availability is looked up per service (it decides which workers can serve)
      Service.findOne({ $or: [{ categoryId }, { categoryIds: categoryId }], isActive: true, isTexture: { $ne: true }, isIdea: { $ne: true }, isRecentProject: { $ne: true } }).select('_id').lean()
    ]);
    res.json({
      success: true,
      data: {
        category: { id: category._id, title: category.title },
        serviceId: anyService?._id || null,
        subCategories: subs.map((s) => ({ id: s._id, title: s.title, iconUrl: s.iconUrl || s.imageUrl || '', description: s.description || '' })),
        advance: { type: rule.advanceType, value: rule.advanceValue }
      }
    });
  } catch (error) {
    console.error('Visit config error:', error);
    res.status(500).json({ success: false, message: 'Could not load this service' });
  }
};

/**
 * POST /api/estimates/book-visit — books a professional's visit. Nothing is
 * charged now: the professional inspects, sends a room-wise estimate from the
 * admin's rate card, and the customer pays the advance only after accepting it.
 */
export const bookVisit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, subCategoryId, address, date, slot, notes } = req.body || {};
    if (!isId(categoryId)) return res.status(400).json({ success: false, message: 'Choose a service' });
    if (!address?.address || !address?.lat || !address?.lng) {
      return res.status(400).json({ success: false, message: 'Please pick your address from the suggestions' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !slot?.start || !slot?.end) {
      return res.status(400).json({ success: false, message: 'Please choose a date and time slot' });
    }

    const [category, user] = await Promise.all([
      HomeServiceCategory.findOne({ _id: categoryId, isEstimateBased: true }).select('title icon image').lean(),
      User.findById(userId).select('name phone')
    ]);
    if (!category) return res.status(404).json({ success: false, message: 'This service is not available' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const scheduledDate = istDayStart(date);
    const timeSlot = { start: slot.start, end: slot.end };
    const leadError = await checkSlotLeadTime({ scheduledDate, timeSlot });
    if (leadError) return res.status(400).json({ success: false, code: 'SLOT_TOO_SOON', message: leadError });
    const farError = await checkAdvanceWindow({ scheduledDate, timeSlot });
    if (farError) return res.status(400).json({ success: false, code: 'SLOT_TOO_FAR', message: farError });

    let zone = null;
    if ((await Zone.countDocuments({ status: 'active' })) > 0) {
      zone = await Zone.findOne({
        status: 'active',
        area: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [num(address.lng), num(address.lat)] } } }
      }).select('_id name').lean();
      if (!zone) return res.status(400).json({ success: false, code: 'OUT_OF_SERVICE_AREA', message: 'Service is not available at this address yet.' });
    }

    // The service record that carries the booking: one in the chosen sub-category, else any of the category.
    const sub = isId(subCategoryId) ? await HomeServiceSubCategory.findById(subCategoryId).select('title').lean() : null;
    const base = { $or: [{ categoryId }, { categoryIds: categoryId }], isActive: true, isTexture: { $ne: true }, isIdea: { $ne: true }, isRecentProject: { $ne: true } };
    const service = (sub && await Service.findOne({ ...base, subCategoryId: sub._id }).select('_id title').lean())
      || await Service.findOne(base).select('_id title').lean();
    if (!service) return res.status(404).json({ success: false, message: 'This service is not set up yet' });

    const title = sub?.title || service.title || category.title;
    const booking = await HomeServiceBooking.create({
      bookingNumber: `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      userId,
      vendorId: null,
      serviceId: service._id,
      categoryId: category._id,
      categoryIds: [category._id],
      serviceName: `${category.title} · ${title}`,
      serviceCategory: category.title,
      isEstimateBased: true,
      categoryIcon: category.icon || category.image || null,
      bookingType: 'scheduled',
      bookingModel: 'worker',
      description: String(notes || '').slice(0, 500),
      requirementText: String(notes || '').slice(0, 500) || null,
      bookedItems: [{ serviceId: service._id, categoryId: category._id, brandName: category.title, card: { title, price: 0 }, quantity: 1 }],
      basePrice: 0,
      discount: 0,
      tax: 0,
      visitingCharges: 0,
      finalAmount: 0,
      userPayableAmount: 0,
      address: {
        type: 'home',
        addressLine1: String(address.address),
        addressLine2: String(address.details || ''),
        city: address.city || 'City',
        state: address.state || 'State',
        pincode: address.pincode || '000000',
        landmark: '',
        lat: num(address.lat),
        lng: num(address.lng)
      },
      scheduledDate,
      scheduledTime: slot.label || `${slot.start}-${slot.end}`,
      timeSlot,
      status: BOOKING_STATUS.SEARCHING,
      assignmentStatus: 'pending',
      advanceStatus: 'none',
      advanceRequired: 0,
      paymentStatus: PAYMENT_STATUS.PENDING,
      zoneId: zone?._id || null,
      zoneName: zone?.name || address.city || null
    });

    setImmediate(() => dispatchBooking(booking._id).catch((err) => console.error('[Estimate] dispatch failed:', err)));

    res.status(201).json({
      success: true,
      message: 'Visit booked. A professional will inspect and send you an estimate.',
      data: { _id: booking._id, bookingNumber: booking.bookingNumber, status: booking.status, serviceName: booking.serviceName }
    });
  } catch (error) {
    console.error('Book visit error:', error);
    res.status(500).json({ success: false, message: error.message || 'Could not book the visit' });
  }
};

/** POST /api/estimates/:id/reject — the customer turns the estimate down; the booking closes, nothing was paid. */
export const rejectEstimate = async (req, res) => {
  try {
    const booking = await HomeServiceBooking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!booking.isEstimateBased || booking.estimate?.status !== 'PENDING' || !(booking.estimate?.amount > 0)) {
      return res.status(400).json({ success: false, message: 'There is no estimate waiting for your decision' });
    }
    const workerId = booking.workerId;
    booking.estimate.status = 'REJECTED';
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'user';
    booking.cancellationReason = String(req.body?.reason || 'Estimate not accepted').slice(0, 300);
    await booking.save();

    if (workerId) {
      await syncWorkerCapacityStatus(workerId).catch(() => {});
      createNotification({
        workerId,
        type: 'estimate_rejected',
        title: 'Estimate Not Accepted',
        message: `The customer did not accept the estimate for booking #${booking.bookingNumber}.`,
        relatedId: booking._id,
        relatedType: 'booking'
      }).catch(() => {});
      getIO()?.to(`worker_${String(workerId)}`).emit('booking_updated', { bookingId: String(booking._id), status: booking.status, estimateStatus: 'REJECTED' });
    }
    getIO()?.to('admin_room').emit('booking_updated', { bookingId: String(booking._id), status: booking.status });
    res.json({ success: true, message: 'Estimate declined. No payment was taken.' });
  } catch (error) {
    console.error('Reject estimate error:', error);
    res.status(500).json({ success: false, message: 'Could not decline the estimate' });
  }
};

/* ------------------------------------------------------------------ */
/* Worker: rate card for the job they are estimating                   */
/* ------------------------------------------------------------------ */

/** GET /api/workers/jobs/:id/estimate-options */
export const getEstimateOptions = async (req, res) => {
  try {
    const booking = await HomeServiceBooking.findOne({ _id: req.params.id, workerId: req.user.id })
      .select('categoryId isEstimateBased estimate status').lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!booking.isEstimateBased) return res.status(400).json({ success: false, message: 'This job does not need an estimate' });
    const card = await getRateCard(booking.categoryId);
    res.json({ success: true, data: { ...card, current: booking.estimate?.items?.length ? booking.estimate : null } });
  } catch (error) {
    console.error('Estimate options error:', error);
    res.status(500).json({ success: false, message: 'Could not load the rate card' });
  }
};

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export const adminCategories = async (req, res) => {
  try {
    const cats = await HomeServiceCategory.find({ isEstimateBased: true }).select('title').sort({ title: 1 }).lean();
    // Packers & Movers has its own quote engine and page.
    res.json({ success: true, data: cats.filter((c) => !/packers/i.test(c.title)).map((c) => ({ id: c._id, title: c.title })) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load categories' });
  }
};

export const adminListItems = async (req, res) => {
  try {
    if (!isId(req.query.categoryId)) return res.status(400).json({ success: false, message: 'categoryId is required' });
    const items = await EstimateRateItem.find({ categoryId: req.query.categoryId }).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load the rate card' });
  }
};

const itemFields = (b) => {
  const out = {};
  if (b.group !== undefined) out.group = String(b.group).trim();
  if (b.name !== undefined) out.name = String(b.name).trim();
  if (b.description !== undefined) out.description = String(b.description).trim();
  if (b.unitLabel !== undefined) out.unitLabel = String(b.unitLabel).trim() || 'room';
  if (b.price !== undefined) out.price = Math.max(0, num(b.price));
  if (b.minQty !== undefined) out.minQty = Math.max(1, Math.floor(num(b.minQty, 1)));
  if (b.maxQty !== undefined) out.maxQty = Math.max(1, Math.floor(num(b.maxQty, 20)));
  if (b.order !== undefined) out.order = num(b.order);
  if (b.isActive !== undefined) out.isActive = !!b.isActive;
  return out;
};

export const adminCreateItem = async (req, res) => {
  try {
    const { categoryId } = req.body || {};
    const data = itemFields(req.body || {});
    if (!isId(categoryId) || !data.group || !data.name || data.price === undefined) {
      return res.status(400).json({ success: false, message: 'Category, group, name and price are required' });
    }
    if (data.maxQty !== undefined && data.minQty !== undefined && data.maxQty < data.minQty) {
      return res.status(400).json({ success: false, message: 'Max quantity cannot be less than min quantity' });
    }
    const item = await EstimateRateItem.create({ ...data, categoryId });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    const dup = error.code === 11000;
    res.status(dup ? 409 : 500).json({ success: false, message: dup ? 'This line already exists in that group' : 'Could not add the line' });
  }
};

export const adminUpdateItem = async (req, res) => {
  try {
    const data = itemFields(req.body || {});
    if (data.maxQty !== undefined && data.minQty !== undefined && data.maxQty < data.minQty) {
      return res.status(400).json({ success: false, message: 'Max quantity cannot be less than min quantity' });
    }
    const item = await EstimateRateItem.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Line not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    const dup = error.code === 11000;
    res.status(dup ? 409 : 500).json({ success: false, message: dup ? 'This line already exists in that group' : 'Could not update the line' });
  }
};

export const adminDeleteItem = async (req, res) => {
  try {
    const item = await EstimateRateItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Line not found' });
    res.json({ success: true, message: 'Line removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not delete the line' });
  }
};

export const adminSeedItems = async (req, res) => {
  try {
    if (!isId(req.body?.categoryId)) return res.status(400).json({ success: false, message: 'categoryId is required' });
    const r = await seedDefaultRateCard(req.body.categoryId);
    res.json({ success: true, message: `${r.added} lines added (${r.total - r.added} already existed)`, data: r });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load the sample rate card' });
  }
};

export const adminGetRule = async (req, res) => {
  try {
    if (!isId(req.query.categoryId)) return res.status(400).json({ success: false, message: 'categoryId is required' });
    res.json({ success: true, data: await EstimateSettings.getFor(req.query.categoryId) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load settings' });
  }
};

export const adminSaveRule = async (req, res) => {
  try {
    const b = req.body || {};
    if (!isId(b.categoryId)) return res.status(400).json({ success: false, message: 'categoryId is required' });
    if (!['percent', 'fixed'].includes(b.advanceType)) return res.status(400).json({ success: false, message: 'Advance type must be percent or fixed' });
    const value = Math.max(0, num(b.advanceValue));
    if (b.advanceType === 'percent' && value > 100) return res.status(400).json({ success: false, message: 'Advance percent cannot exceed 100' });
    const commission = b.commissionPercent === null || b.commissionPercent === '' || b.commissionPercent === undefined ? null : Math.min(100, Math.max(0, num(b.commissionPercent)));
    const doc = await EstimateSettings.findOneAndUpdate(
      { categoryId: b.categoryId },
      { $set: { advanceType: b.advanceType, advanceValue: value, commissionPercent: commission } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: 'Saved', data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not save settings' });
  }
};

/** GET /api/admin/estimates/bookings?categoryId= — estimates sent, with the money. */
export const adminEstimateBookings = async (req, res) => {
  try {
    const q = { isEstimateBased: true, 'estimate.generatedAt': { $ne: null } };
    if (isId(req.query.categoryId)) q.categoryId = req.query.categoryId;
    const rows = await HomeServiceBooking.find(q)
      .select('bookingNumber status serviceName estimate finalAmount paymentStatus workerId address scheduledDate createdAt')
      .populate('workerId', 'name')
      .sort({ 'estimate.generatedAt': -1 })
      .limit(200)
      .lean();
    const sum = (f) => rows.reduce((s, r) => s + num(f(r)), 0);
    res.json({
      success: true,
      data: {
        count: rows.length,
        estimated: sum((r) => r.estimate?.amount),
        accepted: sum((r) => (r.estimate?.status === 'APPROVED' ? r.estimate.amount : 0)),
        advanceCollected: sum((r) => (r.estimate?.status === 'APPROVED' ? r.estimate.tokenAmount : 0)),
        pending: rows.filter((r) => r.estimate?.status === 'PENDING').length,
        rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load estimates' });
  }
};
