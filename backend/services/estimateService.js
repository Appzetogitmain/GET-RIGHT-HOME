import EstimateRateItem from '../models/EstimateRateItem.js';
import EstimateSettings from '../models/EstimateSettings.js';
import PlatformSettings from '../models/PlatformSettings.js';

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// [group, [[name, unit, price, minQty, maxQty, description], ...]]
const DEFAULT_PAINTING = [
  ['Interior Painting', [
    ['Bedroom (up to 150 sq ft)', 'room', 5500, 1, 10, 'Two coats of emulsion on walls, with basic wall preparation'],
    ['Living / Hall room', 'room', 7500, 1, 5, 'Two coats of emulsion on walls, with basic wall preparation'],
    ['Kitchen', 'room', 4000, 1, 3, 'Washable paint on walls, covering of fittings'],
    ['Bathroom', 'room', 2500, 1, 5, 'Moisture-resistant paint on walls'],
    ['Balcony', 'room', 2000, 1, 5, 'Weather-resistant paint on walls'],
    ['Ceiling', 'room', 2500, 1, 10, 'Ceiling paint, per room'],
    ['Full home 1 BHK', 'home', 16000, 1, 1, 'All rooms, walls only'],
    ['Full home 2 BHK', 'home', 24000, 1, 1, 'All rooms, walls only'],
    ['Full home 3 BHK', 'home', 34000, 1, 1, 'All rooms, walls only']
  ]],
  ['Preparation & Extras', [
    ['Wall putty & primer', 'room', 1500, 1, 10, 'Putty (2 coats) and primer, per room'],
    ['Furniture shifting & covering', 'room', 500, 1, 10, 'Moving and covering furniture, per room'],
    ['Designer / texture wall', 'wall', 3500, 1, 10, 'Accent wall with texture or designer finish'],
    ['Wooden door or window polish', 'door', 1500, 1, 20, 'Sanding and polish / enamel, per door or window']
  ]],
  ['Exterior Painting', [
    ['Exterior wall painting', 'sq ft', 18, 100, 5000, 'Weather-proof exterior paint, per sq ft of wall']
  ]],
  ['Water Proofing', [
    ['Terrace waterproofing', 'sq ft', 45, 100, 5000, 'Waterproof coating with warranty, per sq ft'],
    ['Bathroom waterproofing', 'bathroom', 6000, 1, 5, 'Leak-proof treatment, per bathroom']
  ]]
];

/** Adds the sample painting rate card to a category (never overwrites existing lines). */
export const seedDefaultRateCard = async (categoryId) => {
  let order = 0;
  const ops = [];
  for (const [group, rows] of DEFAULT_PAINTING) {
    for (const [name, unitLabel, price, minQty, maxQty, description] of rows) {
      order += 1;
      ops.push({
        updateOne: {
          filter: { categoryId, group, name },
          update: { $setOnInsert: { categoryId, group, name, unitLabel, price, minQty, maxQty, description, order, isActive: true } },
          upsert: true
        }
      });
    }
  }
  const res = await EstimateRateItem.bulkWrite(ops, { ordered: false });
  return { added: res.upsertedCount || 0, total: ops.length };
};

/** The customer's advance for an estimate of `amount`, under the admin's rule. */
export const advanceFor = (rule, amount) => {
  const raw = rule.advanceType === 'fixed' ? num(rule.advanceValue) : (amount * num(rule.advanceValue)) / 100;
  return Math.min(Math.max(0, Math.round(raw)), Math.round(amount));
};

/** Rate card (active lines) grouped for the worker's picker, plus the rules around it. */
export const getRateCard = async (categoryId) => {
  const [items, rule, platform] = await Promise.all([
    EstimateRateItem.find({ categoryId, isActive: true }).sort({ order: 1, name: 1 }).lean(),
    EstimateSettings.getFor(categoryId),
    PlatformSettings.getSettings()
  ]);
  const groups = new Map();
  items.forEach((i) => {
    if (!groups.has(i.group)) groups.set(i.group, []);
    groups.get(i.group).push({ id: i._id, name: i.name, description: i.description, unitLabel: i.unitLabel, price: i.price, minQty: i.minQty, maxQty: i.maxQty });
  });
  return {
    hasItems: items.length > 0,
    groups: [...groups.entries()].map(([name, lines]) => ({ name, items: lines })),
    rule: { advanceType: rule.advanceType, advanceValue: rule.advanceValue },
    commissionPercent: rule.commissionPercent ?? platform?.defaultCommission ?? 10,
    gst: platform?.applyGst === true && num(platform?.taxRate) > 0 ? { applied: true, ratePct: num(platform.taxRate) } : { applied: false, ratePct: 0 }
  };
};

/**
 * The estimate's money, worked out on the server from the admin's rate card.
 *   amount = sum(unit price x qty) (+ GST when admin has it on)
 *   advance = the admin's rule (percent / fixed)
 *   platform commission is taken from the advance; the rest of it is the worker's advance.
 */
export const computeEstimate = async ({ categoryId, items = [] }) => {
  const ids = items.map((i) => i.itemId).filter(Boolean);
  const [dbItems, rule, platform] = await Promise.all([
    ids.length ? EstimateRateItem.find({ _id: { $in: ids }, categoryId, isActive: true }).lean() : [],
    EstimateSettings.getFor(categoryId),
    PlatformSettings.getSettings()
  ]);
  const byId = new Map(dbItems.map((d) => [String(d._id), d]));

  const lines = [];
  for (const it of items) {
    const d = byId.get(String(it.itemId));
    if (!d) continue;
    const qty = Math.floor(num(it.qty));
    if (qty < d.minQty || qty > d.maxQty) {
      const err = new Error(`${d.name}: choose between ${d.minQty} and ${d.maxQty} ${d.unitLabel}`);
      err.status = 400;
      throw err;
    }
    lines.push({ itemId: d._id, group: d.group, name: d.name, unitLabel: d.unitLabel, qty, unitPrice: d.price, amount: Math.round(d.price * qty) });
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const gstOn = platform?.applyGst === true && num(platform?.taxRate) > 0;
  const gst = gstOn ? Math.round((subtotal * num(platform.taxRate)) / 100) : 0;
  const amount = subtotal + gst;
  const advance = advanceFor(rule, amount);
  const commissionPercent = rule.commissionPercent ?? platform?.defaultCommission ?? 10;
  const adminCommission = Math.round((amount * commissionPercent) / 100);

  return {
    lines,
    subtotal,
    gst: { applied: gstOn, ratePct: gstOn ? num(platform.taxRate) : 0, amount: gst },
    amount,
    tokenAmount: advance,
    advanceType: rule.advanceType,
    advanceValue: rule.advanceValue,
    commissionPercent,
    adminCommission,
    workerAdvance: Math.max(0, advance - adminCommission)
  };
};
