import mongoose from 'mongoose';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import HomeServiceCategory from '../models/HomeServiceCategory.js';
import Service from '../models/HomeServiceService.js';
import MoverInventoryItem, { MOVER_ROOMS } from '../models/MoverInventoryItem.js';
import MoverSettings from '../models/MoverSettings.js';
import User from '../models/User.js';
import Zone from '../models/Zone.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { istYmd, istDayStart, addDaysYmd } from '../utils/slotAvailability.js';
import { computeMoverQuote, ensureInventory, seedDefaultInventory, checkCoverage, withinCityZones } from '../services/moverQuoteService.js';
import { dispatchBooking } from '../services/bookingDispatchService.js';

const MINUTE_MS = 60 * 1000;
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* ------------------------------------------------------------------ */
/* Customer                                                            */
/* ------------------------------------------------------------------ */

/** GET /api/movers/config — inventory, add-ons, slots and token rule for the wizard. */
export const getMoverConfig = async (req, res) => {
  try {
    await ensureInventory();
    const [settings, items] = await Promise.all([
      MoverSettings.getSettings(),
      MoverInventoryItem.find({ isActive: true }).sort({ order: 1, name: 1 }).lean()
    ]);
    const rooms = MOVER_ROOMS.map((room) => {
      const groups = new Map();
      items.filter((i) => i.room === room).forEach((i) => {
        if (!groups.has(i.group)) groups.set(i.group, []);
        groups.get(i.group).push({ id: i._id, name: i.name, maxQty: i.maxQty });
      });
      return { room, groups: [...groups.entries()].map(([name, variants]) => ({ name, variants })) };
    }).filter((r) => r.groups.length);

    res.json({
      success: true,
      data: {
        enabled: settings.isEnabled,
        rooms,
        addOns: settings.addOns.filter((a) => a.isActive).sort((a, b) => a.order - b.order),
        slots: settings.slots.filter((s) => s.isActive),
        coverage: {
          withinCity: (await withinCityZones(settings)).map((z) => z.name),
          routes: settings.routes.filter((r) => r.isActive).map((r) => ({ from: r.fromCity, to: r.toCity, bothWays: r.bothWays }))
        },
        advanceBookingDays: settings.advanceBookingDays,
        sameDayLeadHours: settings.sameDayLeadHours,
        token: { type: settings.tokenType, value: settings.tokenValue }
      }
    });
  } catch (error) {
    console.error('Mover config error:', error);
    res.status(500).json({ success: false, message: 'Could not load Packers & Movers' });
  }
};

/** POST /api/movers/quote — price preview; writes nothing. */
export const quoteMove = async (req, res) => {
  try {
    const { relocationType, from, to, items, addOnKeys } = req.body || {};
    const quote = await computeMoverQuote({ relocationType, from, to, items: items || [], addOnKeys: addOnKeys || [] });
    res.json({ success: true, data: quote });
  } catch (error) {
    console.error('Mover quote error:', error);
    res.status(500).json({ success: false, message: 'Could not calculate the price' });
  }
};

/** POST /api/movers/check-area — is this pickup/drop served? */
export const checkArea = async (req, res) => {
  try {
    const { relocationType, from, to } = req.body || {};
    const result = await checkCoverage({ relocationType, from: cleanPlace(from), to: cleanPlace(to) });
    res.json({ success: true, data: { ok: result.ok, code: result.code, message: result.message, route: result.route ? { fromCity: result.route.fromCity, toCity: result.route.toCity, transitDays: result.route.transitDays ?? null } : null } });
  } catch (error) {
    console.error('Mover check-area error:', error);
    res.status(500).json({ success: false, message: 'Could not check the service area' });
  }
};

const cleanPlace = (p = {}) => ({
  address: String(p.address || '').trim(),
  city: String(p.city || '').trim(),
  state: String(p.state || '').trim(),
  pincode: String(p.pincode || '').trim(),
  lat: p.lat ? num(p.lat) : null,
  lng: p.lng ? num(p.lng) : null,
  lift: p.lift !== false,
  floor: p.floor !== undefined && p.floor !== '' ? num(p.floor) : null
});

/**
 * POST /api/movers/book — creates the booking from the wizard. The price is
 * recomputed here (the client's numbers are never trusted); the token is held as
 * the advance, so the existing pay-advance -> dispatch flow takes over.
 */
export const createMoverBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { relocationType, from: rawFrom, to: rawTo, items, addOnKeys, date, slot, notes } = req.body || {};
    const from = cleanPlace(rawFrom);
    const to = cleanPlace(rawTo);
    if (!from.address || !to.address) return res.status(400).json({ success: false, message: 'Pickup and drop locations are required' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, message: 'Add at least one item to move' });

    const settings = await MoverSettings.getSettings();
    if (!settings.isEnabled) return res.status(400).json({ success: false, message: 'Packers & Movers is not available right now' });

    // Date + slot must be one the admin offers, and not too soon / too far.
    const slotCfg = settings.slots.find((s) => s.isActive && s.start === slot?.start && s.end === slot?.end);
    if (!slotCfg || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      return res.status(400).json({ success: false, message: 'Please choose a valid date and time slot' });
    }
    const dayStart = istDayStart(date);
    const [sh, sm] = slotCfg.start.split(':').map(Number);
    const slotStart = new Date(dayStart.getTime() + (sh * 60 + sm) * MINUTE_MS);
    if (slotStart.getTime() < Date.now() + settings.sameDayLeadHours * 60 * MINUTE_MS) {
      return res.status(400).json({ success: false, code: 'SLOT_TOO_SOON', message: `Please pick a slot at least ${settings.sameDayLeadHours} hours from now.` });
    }
    const lastDay = addDaysYmd(istYmd(new Date()), settings.advanceBookingDays - 1);
    if (date > lastDay) {
      return res.status(400).json({ success: false, code: 'SLOT_TOO_FAR', message: `Bookings open up to ${settings.advanceBookingDays} days ahead.` });
    }

    const quote = await computeMoverQuote({ relocationType, from, to, items, addOnKeys: addOnKeys || [] });
    if (!quote.lines.length) return res.status(400).json({ success: false, message: 'Add at least one valid item to move' });

    const [user, category] = await Promise.all([
      User.findById(userId).select('name phone'),
      HomeServiceCategory.findOne({ title: /packers/i, isActive: true }).select('title icon image').lean()
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!category) return res.status(404).json({ success: false, message: 'Packers & Movers category is not set up' });
    // Bookings need a service record; any active service of the category carries the booking.
    const service = await Service.findOne({ $or: [{ categoryId: category._id }, { categoryIds: category._id }], isActive: true }).select('_id title').lean()
      || await Service.findOne({ $or: [{ categoryId: category._id }, { categoryIds: category._id }] }).select('_id title').lean();
    if (!service) return res.status(404).json({ success: false, message: 'Add at least one service under Packers & Movers first' });

    // Where we serve: Within City zones / Between Cities routes (set by admin).
    const coverage = await checkCoverage({ relocationType, from, to });
    if (!coverage.ok) return res.status(400).json({ success: false, code: coverage.code, message: coverage.message });
    const zone = coverage.zone;

    const bookedItems = [
      ...quote.lines.map((l) => ({ serviceId: service._id, categoryId: category._id, brandName: l.group, card: { title: l.name, price: 0, subtitle: l.room.replace('_', ' ') }, quantity: l.qty })),
      ...quote.addOns.map((a) => ({ serviceId: service._id, categoryId: category._id, brandName: 'Add-on', card: { title: a.name, price: a.price }, quantity: 1 }))
    ];
    const routeLabel = quote.relocationType === 'INTER_CITY' ? 'Between Cities' : 'Within City';
    const gstAmount = quote.gst.amount;
    const taxable = quote.total - gstAmount;
    const needsAdvance = quote.token > 0;

    const booking = await HomeServiceBooking.create({
      bookingNumber: `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      userId,
      vendorId: null,
      serviceId: service._id,
      categoryId: category._id,
      categoryIds: [category._id],
      serviceName: `Packers & Movers · ${routeLabel}`,
      serviceCategory: category.title,
      isEstimateBased: false,
      categoryIcon: category.icon || category.image || null,
      bookingType: 'scheduled',
      bookingModel: 'worker',
      description: `${from.address} → ${to.address}`,
      bookedItems,
      basePrice: taxable,
      discount: 0,
      tax: gstAmount,
      visitingCharges: 0,
      finalAmount: quote.total,
      userPayableAmount: quote.total,
      address: {
        type: 'home',
        addressLine1: from.address,
        addressLine2: '',
        city: from.city || 'City',
        state: from.state || 'State',
        pincode: from.pincode || '000000',
        landmark: '',
        lat: from.lat,
        lng: from.lng
      },
      scheduledDate: slotStart,
      scheduledTime: slotCfg.label,
      timeSlot: { start: slotCfg.start, end: slotCfg.end },
      status: needsAdvance ? BOOKING_STATUS.PENDING : BOOKING_STATUS.SEARCHING,
      assignmentStatus: 'pending',
      advanceStatus: needsAdvance ? 'awaiting' : 'none',
      advanceRequired: quote.token,
      paymentStatus: PAYMENT_STATUS.PENDING,
      zoneId: zone?._id || null,
      zoneName: zone?.name || from.city || null,
      moverDetails: {
        relocationType: quote.relocationType,
        from,
        to,
        notes: String(notes || '').slice(0, 500),
        inventory: quote.lines,
        addOns: quote.addOns,
        distanceKm: quote.distanceKm,
        distanceKnown: quote.distanceKnown,
        distance: quote.distance,
        route: quote.route,
        units: quote.units,
        serviceCharge: quote.serviceCharge,
        breakdown: quote.breakdown,
        gst: quote.gst,
        total: quote.total,
        token: quote.token,
        dueAtUnloading: quote.dueAtUnloading,
        commissionPercent: quote.commissionPercent
      }
    });

    if (!needsAdvance) {
      setImmediate(() => dispatchBooking(booking._id).catch((err) => console.error('[Mover] dispatch failed:', err)));
    }

    res.status(201).json({
      success: true,
      message: needsAdvance ? 'Booking created. Pay the token to confirm it.' : 'Booking created.',
      requiresPayment: needsAdvance,
      payment: { payNowAmount: quote.token, advanceAmount: quote.token, payLaterAmount: quote.dueAtUnloading, serviceTotal: quote.total },
      data: { _id: booking._id, bookingNumber: booking.bookingNumber, status: booking.status, finalAmount: booking.finalAmount, serviceName: booking.serviceName }
    });
  } catch (error) {
    console.error('Create mover booking error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create the booking' });
  }
};

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export const adminListInventory = async (req, res) => {
  try {
    await ensureInventory();
    const items = await MoverInventoryItem.find({}).sort({ room: 1, order: 1, name: 1 }).lean();
    res.json({ success: true, data: items, rooms: MOVER_ROOMS });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load inventory' });
  }
};

const itemFields = (b) => {
  const out = {};
  if (b.room !== undefined) out.room = b.room;
  if (b.group !== undefined) out.group = String(b.group).trim();
  if (b.name !== undefined) out.name = String(b.name).trim();
  if (b.units !== undefined) out.units = Math.max(0, num(b.units));
  if (b.maxQty !== undefined) out.maxQty = Math.max(1, Math.floor(num(b.maxQty, 20)));
  if (b.order !== undefined) out.order = num(b.order);
  if (b.isActive !== undefined) out.isActive = !!b.isActive;
  return out;
};

export const adminCreateItem = async (req, res) => {
  try {
    const data = itemFields(req.body || {});
    if (!MOVER_ROOMS.includes(data.room) || !data.group || !data.name) {
      return res.status(400).json({ success: false, message: 'Room, group and name are required' });
    }
    const item = await MoverInventoryItem.create(data);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    const dup = error.code === 11000;
    res.status(dup ? 409 : 500).json({ success: false, message: dup ? 'This item already exists in that room and group' : 'Could not add the item' });
  }
};

export const adminUpdateItem = async (req, res) => {
  try {
    const data = itemFields(req.body || {});
    if (data.room && !MOVER_ROOMS.includes(data.room)) return res.status(400).json({ success: false, message: 'Invalid room' });
    const item = await MoverInventoryItem.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    const dup = error.code === 11000;
    res.status(dup ? 409 : 500).json({ success: false, message: dup ? 'This item already exists in that room and group' : 'Could not update the item' });
  }
};

export const adminDeleteItem = async (req, res) => {
  try {
    const item = await MoverInventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not delete the item' });
  }
};

export const adminSeedInventory = async (req, res) => {
  try {
    const result = await seedDefaultInventory();
    res.json({ success: true, message: `${result.added} items added (${result.total - result.added} already existed)`, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load the default inventory' });
  }
};

export const adminZones = async (req, res) => {
  try {
    const zones = await Zone.find({}).select('_id name status').sort({ name: 1 }).lean();
    res.json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load zones' });
  }
};

export const adminGetSettings = async (req, res) => {
  try {
    res.json({ success: true, data: await MoverSettings.getSettings() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load settings' });
  }
};

const RATE_FIELDS = ['baseCharge', 'perUnitRate', 'perKmRate', 'freeKm', 'minCharge', 'noLiftCharge', 'defaultKm'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const adminUpdateSettings = async (req, res) => {
  try {
    const b = req.body || {};
    const settings = await MoverSettings.getSettings();

    if (b.isEnabled !== undefined) settings.isEnabled = !!b.isEnabled;
    for (const type of ['INTRA_CITY', 'INTER_CITY']) {
      if (!b.rates?.[type]) continue;
      for (const f of RATE_FIELDS) {
        if (b.rates[type][f] !== undefined) settings.rates[type][f] = Math.max(0, num(b.rates[type][f]));
      }
    }
    if (b.tokenType !== undefined) {
      if (!['fixed', 'percent'].includes(b.tokenType)) return res.status(400).json({ success: false, message: 'Token type must be fixed or percent' });
      settings.tokenType = b.tokenType;
    }
    if (b.tokenValue !== undefined) {
      const v = Math.max(0, num(b.tokenValue));
      if ((b.tokenType || settings.tokenType) === 'percent' && v > 100) return res.status(400).json({ success: false, message: 'Token percent cannot exceed 100' });
      settings.tokenValue = v;
    }
    if (b.commissionPercent !== undefined) {
      settings.commissionPercent = b.commissionPercent === null || b.commissionPercent === '' ? null : Math.min(100, Math.max(0, num(b.commissionPercent)));
    }
    if (b.roadFactor !== undefined) settings.roadFactor = Math.max(1, num(b.roadFactor, 1.25));
    if (b.maxWithinCityKm !== undefined) settings.maxWithinCityKm = Math.max(1, num(b.maxWithinCityKm, 60));
    if (b.withinCityMode !== undefined) {
      if (!['all', 'selected'].includes(b.withinCityMode)) return res.status(400).json({ success: false, message: 'Invalid Within City mode' });
      settings.withinCityMode = b.withinCityMode;
    }
    if (Array.isArray(b.withinCityZoneIds)) {
      settings.withinCityZoneIds = b.withinCityZoneIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    }
    if (Array.isArray(b.routes)) {
      const seen = new Set();
      settings.routes = b.routes.map((r) => {
        const fromCity = String(r.fromCity || '').trim();
        const toCity = String(r.toCity || '').trim();
        if (!fromCity || !toCity) throw Object.assign(new Error('Every route needs both cities'), { status: 400 });
        if (fromCity.toLowerCase() === toCity.toLowerCase()) throw Object.assign(new Error(`${fromCity} to ${toCity} is not a Between Cities route`), { status: 400 });
        const key = [fromCity.toLowerCase(), toCity.toLowerCase()].sort().join('|');
        if (seen.has(key)) throw Object.assign(new Error(`${fromCity} and ${toCity} are added twice`), { status: 400 });
        seen.add(key);
        const opt = (v) => (v === '' || v === null || v === undefined ? null : Math.max(0, num(v)));
        return { fromCity, toCity, bothWays: r.bothWays !== false, isActive: r.isActive !== false, baseCharge: opt(r.baseCharge), perUnitRate: opt(r.perUnitRate), transitDays: opt(r.transitDays) };
      });
    }
    if (b.advanceBookingDays !== undefined) settings.advanceBookingDays = Math.max(1, Math.floor(num(b.advanceBookingDays, 30)));
    if (b.sameDayLeadHours !== undefined) settings.sameDayLeadHours = Math.max(0, num(b.sameDayLeadHours));

    if (Array.isArray(b.addOns)) {
      const keys = new Set();
      settings.addOns = b.addOns.map((a, i) => {
        const key = String(a.key || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') || `addon_${i + 1}`;
        if (keys.has(key)) throw Object.assign(new Error(`Duplicate add-on key "${key}"`), { status: 400 });
        keys.add(key);
        if (!String(a.name || '').trim()) throw Object.assign(new Error('Every add-on needs a name'), { status: 400 });
        return {
          key,
          group: a.group === 'care' ? 'care' : 'extra',
          name: String(a.name).trim(),
          description: String(a.description || ''),
          price: Math.max(0, num(a.price)),
          isRecommended: !!a.isRecommended,
          isActive: a.isActive !== false,
          order: num(a.order, i + 1)
        };
      });
    }
    if (Array.isArray(b.slots)) {
      settings.slots = b.slots.map((s) => {
        if (!TIME_RE.test(s.start) || !TIME_RE.test(s.end) || s.end <= s.start) {
          throw Object.assign(new Error(`Slot ${s.label || s.start} has an invalid time range`), { status: 400 });
        }
        return {
          start: s.start,
          end: s.end,
          label: String(s.label || `${s.start}-${s.end}`),
          period: s.period === 'afternoon' ? 'afternoon' : 'morning',
          isActive: s.isActive !== false
        };
      }).sort((a, c) => a.start.localeCompare(c.start));
    }

    await settings.save();
    res.json({ success: true, message: 'Settings saved', data: settings });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Could not save settings' });
  }
};

/** GET /api/admin/movers/summary — money across Packers & Movers bookings, for the admin. */
export const adminMoverSummary = async (req, res) => {
  try {
    const rows = await HomeServiceBooking.find({ moverDetails: { $ne: null }, status: { $ne: BOOKING_STATUS.CANCELLED } })
      .select('bookingNumber status finalAmount advancePaid advanceStatus paymentStatus moverDetails createdAt scheduledDate')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const sum = (f) => rows.reduce((s, r) => s + num(f(r)), 0);
    res.json({
      success: true,
      data: {
        bookings: rows.length,
        totalValue: sum((r) => r.finalAmount),
        tokenCollected: sum((r) => (r.advanceStatus === 'paid' ? r.advancePaid : 0)),
        dueAtUnloading: sum((r) => (r.paymentStatus === 'paid' ? 0 : r.finalAmount - (r.advanceStatus === 'paid' ? r.advancePaid : 0))),
        rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load the summary' });
  }
};
