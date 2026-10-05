import MoverInventoryItem from '../models/MoverInventoryItem.js';
import MoverSettings from '../models/MoverSettings.js';
import PlatformSettings from '../models/PlatformSettings.js';
import Zone from '../models/Zone.js';

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const round2 = (n) => Math.round(num(n) * 100) / 100;

// [room, group, [[name, units], ...]]
const DEFAULT_INVENTORY = [
  ['bedrooms', 'Bed', [['Single Bed - Without Storage', 3], ['Single Bed - With Storage', 4], ['Single Bed - Foldable', 2], ['Double Bed - Dismantlable', 5], ['Queen Size Bed - Without Storage', 6], ['Queen Size Bed - With Storage', 8], ['King Size Bed - Without Storage', 7], ['King Size Bed - With Storage', 9], ['Bunk Bed - Dismantlable', 6], ['Diwan Cum Bed', 4], ['Baby Wooden Bed', 2], ['Cradle - Dismantleable', 1]]],
  ['bedrooms', 'Mattress', [['Single Mattress', 1], ['Double Mattress', 2], ['King Size Mattress', 3]]],
  ['bedrooms', 'Table', [['Study Table', 2], ['Dressing Table', 3], ['Side Table', 1]]],
  ['bedrooms', 'Chair', [['Study Chair', 1], ['Office Chair', 1], ['Easy Chair', 2]]],
  ['bedrooms', 'Television', [['Television - Up to 32 inch', 2], ['Television - 33 to 55 inch', 3], ['Television - Above 55 inch', 4]]],
  ['bedrooms', 'Air Conditioner', [['Split AC', 3], ['Window AC', 3]]],
  ['bedrooms', 'Almirah/Wardrobe', [['Wardrobe - 2 Door', 5], ['Wardrobe - 3 Door', 7], ['Steel Almirah', 5]]],
  ['bedrooms', 'Cabinet & Storage', [['Chest of Drawers', 3], ['Book Shelf', 3], ['Shoe Rack', 1]]],
  ['living_room', 'Sofa', [['Sofa - 1 Seater', 2], ['Sofa - 2 Seater', 3], ['Sofa - 3 Seater', 4], ['L Shape Sofa', 7], ['Sofa Cum Bed', 5]]],
  ['living_room', 'Table', [['Center Table', 2], ['Dining Table - 4 Seater', 4], ['Dining Table - 6 Seater', 6], ['Console Table', 2]]],
  ['living_room', 'TV & Units', [['TV Unit', 4], ['Television - 33 to 55 inch', 3], ['Home Theatre', 2]]],
  ['living_room', 'Decor', [['Pooja Unit', 2], ['Curtains (set)', 1], ['Painting / Frame', 1], ['Plants', 1]]],
  ['kitchen', 'Appliances', [['Refrigerator - Single Door', 4], ['Refrigerator - Double Door', 6], ['Washing Machine', 4], ['Microwave Oven', 1], ['Water Purifier', 1], ['Gas Stove', 1], ['Dishwasher', 3]]],
  ['kitchen', 'Storage', [['Kitchen Cabinet', 3], ['Utensil Stand', 1], ['Kitchen Trolley', 2]]],
  ['miscellaneous', 'Vehicles & Fitness', [['Bicycle', 2], ['Treadmill', 4], ['Exercise Cycle', 3]]],
  ['miscellaneous', 'Others', [['Iron Board', 1], ['Ladder', 1], ['Suitcase', 1], ['Gas Cylinder', 1]]],
  ['cartons', 'Cartons', [['Small Carton', 0.5], ['Medium Carton', 1], ['Large Carton', 1.5]]]
];

/** Loads the default inventory the first time (nothing is overwritten). */
export const seedDefaultInventory = async () => {
  let order = 0;
  const ops = [];
  for (const [room, group, variants] of DEFAULT_INVENTORY) {
    for (const [name, units] of variants) {
      order += 1;
      ops.push({
        updateOne: {
          filter: { room, group, name },
          update: { $setOnInsert: { room, group, name, units, order, isActive: true, maxQty: 20 } },
          upsert: true
        }
      });
    }
  }
  const res = await MoverInventoryItem.bulkWrite(ops, { ordered: false });
  return { added: res.upsertedCount || 0, total: ops.length };
};

export const ensureInventory = async () => {
  if ((await MoverInventoryItem.estimatedDocumentCount()) === 0) await seedDefaultInventory();
};

export const haversineKm = (a, b) => {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return round2(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
};


/* ------------------------------------------------------------------ */
/* Coverage: where Within City / Between Cities are offered            */
/* ------------------------------------------------------------------ */

const cityKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES = { bengaluru: 'bangalore', bombay: 'mumbai', gurugram: 'gurgaon', calcutta: 'kolkata', madras: 'chennai', poona: 'pune' };
const canon = (v) => { const k = cityKey(v); return ALIASES[k] || k; };
export const sameCity = (a, b) => {
  const x = canon(a); const y = canon(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x)));
};

/** The Between Cities route (if any) that covers from -> to. */
export const findRoute = (settings, fromCity, toCity) => (settings.routes || []).find((r) => r.isActive
  && ((sameCity(r.fromCity, fromCity) && sameCity(r.toCity, toCity))
    || (r.bothWays && sameCity(r.fromCity, toCity) && sameCity(r.toCity, fromCity)))) || null;

const zoneAt = (p) => Zone.findOne({
  status: 'active',
  area: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [p.lng, p.lat] } } }
}).select('_id name').lean();

/** The zones Within City is offered in (what the admin sees and the customer is told). */
export const withinCityZones = async (settings) => {
  const active = await Zone.find({ status: 'active' }).select('_id name').lean();
  if (settings.withinCityMode !== 'selected') return active;
  const ids = new Set((settings.withinCityZoneIds || []).map(String));
  return active.filter((z) => ids.has(String(z._id)));
};

/**
 * Can we move from -> to? Within City needs both ends inside a zone the admin
 * serves; Between Cities needs an active route for the two cities.
 * Returns { ok, code, message, zone } (zone = the pickup zone, used for dispatch).
 */
export const checkCoverage = async ({ relocationType, from, to }) => {
  const settings = await MoverSettings.getSettings();
  const type = relocationType === 'INTER_CITY' ? 'INTER_CITY' : 'INTRA_CITY';
  const zonesConfigured = (await Zone.countDocuments({ status: 'active' })) > 0;

  // Pickup must always be inside a service zone (that is where workers are).
  let pickupZone = null;
  if (zonesConfigured) {
    if (!from?.lat || !from?.lng) {
      return { ok: false, code: 'PIN_NEEDED', message: 'Please pick the pickup address from the suggestions so we can check the service area.' };
    }
    pickupZone = await zoneAt(from);
  }

  if (type === 'INTRA_CITY') {
    if (!zonesConfigured) return { ok: true, zone: null };
    const served = await withinCityZones(settings);
    const names = served.map((z) => z.name).join(', ');
    const servedIds = new Set(served.map((z) => String(z._id)));
    const where = names ? `We provide Within City moves in: ${names}.` : 'Within City moves are not available yet.';
    if (!pickupZone || !servedIds.has(String(pickupZone._id))) {
      return { ok: false, code: 'OUT_OF_AREA', message: `We don't provide Packers & Movers at the pickup location yet. ${where}` };
    }
    if (to?.lat && to?.lng) {
      const dropZone = await zoneAt(to);
      if (!dropZone || !servedIds.has(String(dropZone._id))) {
        return { ok: false, code: 'OUT_OF_AREA', message: `We don't provide Packers & Movers at the drop location yet. ${where}` };
      }
    } else {
      return { ok: false, code: 'PIN_NEEDED', message: 'Please pick the drop address from the suggestions so we can check the service area.' };
    }
    const gap = haversineKm(from, to);
    if (gap !== null && gap > num(settings.maxWithinCityKm, 60)) {
      return { ok: false, code: 'NOT_WITHIN_CITY', message: `Pickup and drop are ${Math.round(gap)} km apart, which is too far for Within City (max ${settings.maxWithinCityKm} km). Please choose Between Cities.` };
    }
    return { ok: true, zone: pickupZone };
  }

  // Between Cities
  const route = findRoute(settings, from?.city, to?.city);
  if (!route) {
    const fromRoutes = (settings.routes || []).filter((r) => r.isActive
      && (sameCity(r.fromCity, from?.city) || (r.bothWays && sameCity(r.toCity, from?.city))));
    const dests = [...new Set(fromRoutes.map((r) => (sameCity(r.fromCity, from?.city) ? r.toCity : r.fromCity)))];
    const hint = dests.length ? ` From ${from?.city} we go to: ${dests.join(', ')}.` : '';
    return {
      ok: false,
      code: 'NO_ROUTE',
      message: `We don't provide Packers & Movers from ${from?.city || 'this city'} to ${to?.city || 'this city'} yet.${hint}`
    };
  }
  if (zonesConfigured && !pickupZone) {
    return { ok: false, code: 'OUT_OF_AREA', message: `We don't provide Packers & Movers at the pickup location yet.` };
  }
  return { ok: true, zone: pickupZone, route };
};

export const tokenFor = (settings, total) => {
  const raw = settings.tokenType === 'percent' ? (total * num(settings.tokenValue)) / 100 : num(settings.tokenValue);
  return Math.min(Math.max(0, Math.round(raw)), Math.round(total));
};

/**
 * The whole price of a move, computed on the server from the admin's rate card:
 *   service = max(minCharge, base + units x perUnit + km beyond freeKm x perKm) + no-lift charges
 *   total   = service + add-ons (+ GST when admin has it on)
 *   token   = admin's token rule, the rest is due at unloading.
 */
export const computeMoverQuote = async ({ relocationType, from, to, items = [], addOnKeys = [] }) => {
  const type = relocationType === 'INTER_CITY' ? 'INTER_CITY' : 'INTRA_CITY';
  const [settings, platform] = await Promise.all([MoverSettings.getSettings(), PlatformSettings.getSettings()]);
  const rate = settings.rates?.[type]?.toObject?.() || settings.rates?.[type] || {};
  // A Between Cities route can carry its own numbers.
  const route = type === 'INTER_CITY' ? findRoute(settings, from?.city, to?.city) : null;
  const rateUsed = { ...rate };
  if (route?.baseCharge !== null && route?.baseCharge !== undefined) rateUsed.baseCharge = route.baseCharge;
  if (route?.perUnitRate !== null && route?.perUnitRate !== undefined) rateUsed.perUnitRate = route.perUnitRate;

  const ids = items.map((i) => i.itemId).filter(Boolean);
  const dbItems = ids.length ? await MoverInventoryItem.find({ _id: { $in: ids }, isActive: true }).lean() : [];
  const byId = new Map(dbItems.map((d) => [String(d._id), d]));

  const lines = [];
  let units = 0;
  for (const it of items) {
    const d = byId.get(String(it.itemId));
    const qty = Math.min(Math.max(0, Math.floor(num(it.qty))), d?.maxQty || 20);
    if (!d || qty <= 0) continue;
    units += d.units * qty;
    lines.push({ itemId: d._id, name: d.name, group: d.group, room: d.room, qty, units: d.units });
  }

  const routeKm = route?.distanceKm ? num(route.distanceKm) : null;
  const measured = routeKm ?? haversineKm(from, to);
  const km = measured ?? num(rate.defaultKm);
  const distanceCharge = Math.max(0, km - num(rateUsed.freeKm)) * num(rateUsed.perKmRate);
  const rawService = num(rateUsed.baseCharge) + units * num(rateUsed.perUnitRate) + distanceCharge;
  const base = lines.length ? Math.max(num(rateUsed.minCharge), rawService) : 0;
  const noLiftEnds = (from?.lift === false ? 1 : 0) + (to?.lift === false ? 1 : 0);
  const noLiftCharge = lines.length ? noLiftEnds * num(rateUsed.noLiftCharge) : 0;
  const serviceCharge = Math.round(base + noLiftCharge);

  // Add-ons: only the admin's active ones; the "care" group allows a single pick.
  const wanted = new Set(addOnKeys);
  const chosen = [];
  let careTaken = false;
  for (const a of [...settings.addOns].sort((x, y) => x.order - y.order)) {
    if (!a.isActive || !wanted.has(a.key)) continue;
    if (a.group === 'care') { if (careTaken) continue; careTaken = true; }
    chosen.push({ key: a.key, name: a.name, group: a.group, price: a.price });
  }
  const addOnTotal = chosen.reduce((s, a) => s + a.price, 0);

  const subtotal = serviceCharge + addOnTotal;
  const gstOn = platform?.applyGst === true && num(platform?.taxRate) > 0;
  const gst = gstOn ? Math.round((subtotal * num(platform.taxRate)) / 100) : 0;
  const total = subtotal + gst;
  const token = lines.length ? tokenFor(settings, total) : 0;

  return {
    relocationType: type,
    distanceKm: km,
    distanceKnown: measured !== null,
    route: route ? { fromCity: route.fromCity, toCity: route.toCity, transitDays: route.transitDays ?? null } : null,
    units: round2(units),
    lines,
    serviceCharge,
    breakdown: { base: Math.round(base), noLiftCharge: Math.round(noLiftCharge), noLiftEnds },
    addOns: chosen,
    addOnTotal,
    gst: { applied: gstOn, ratePct: gstOn ? num(platform.taxRate) : 0, amount: gst },
    total,
    token,
    dueAtUnloading: total - token,
    commissionPercent: settings.commissionPercent ?? platform?.defaultCommission ?? 10
  };
};
