import mongoose from 'mongoose';
import Zone from '../models/Zone.js';
import HomeServiceCategory from '../models/HomeServiceCategory.js';
import HomeServiceService from '../models/HomeServiceService.js';

/**
 * Zone-wise catalog. A category/service with an empty `zoneIds` is offered in
 * every zone; otherwise only in the zones listed. These endpoints let the admin
 * manage that from the zone's side: pick a zone, tick what is offered there.
 */

const activeZoneIds = async () => (await Zone.find({ status: 'active' }).select('_id').lean()).map((z) => String(z._id));

const effectiveZones = (doc, allZoneIds) => (doc.zoneIds?.length ? doc.zoneIds.map(String) : allZoneIds);

/** What a zone currently offers: every category and service with an `inZone` flag. */
export const getZoneCatalog = async (req, res) => {
  try {
    const { zoneId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(zoneId)) return res.status(400).json({ success: false, message: 'Invalid zone' });
    const zone = await Zone.findById(zoneId).select('name status').lean();
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });

    const [allZoneIds, categories, services] = await Promise.all([
      activeZoneIds(),
      HomeServiceCategory.find().select('title isActive zoneIds').sort({ homeOrder: 1, title: 1 }).lean(),
      HomeServiceService.find().select('title categoryId isActive zoneIds').sort({ title: 1 }).lean()
    ]);

    const data = categories.map((c) => ({
      _id: c._id,
      title: c.title,
      isActive: c.isActive,
      inZone: effectiveZones(c, allZoneIds).includes(String(zoneId)),
      allZones: !c.zoneIds?.length,
      services: services
        .filter((s) => String(s.categoryId) === String(c._id))
        .map((s) => ({
          _id: s._id,
          title: s.title,
          isActive: s.isActive,
          inZone: effectiveZones(s, allZoneIds).includes(String(zoneId)),
          allZones: !s.zoneIds?.length
        }))
    }));
    res.json({ success: true, zone, data });
  } catch (error) {
    console.error('Get zone catalog error:', error);
    res.status(500).json({ success: false, message: 'Failed to load zone catalog' });
  }
};

// Add or remove `zoneId` from each document so it is offered exactly where wanted.
const applyZoneSelection = async (Model, selectedIds, zoneId, allZoneIds) => {
  const selected = new Set(selectedIds.map(String));
  const docs = await Model.find().select('zoneIds').lean();
  const ops = [];
  for (const doc of docs) {
    const current = new Set(effectiveZones(doc, allZoneIds));
    const wants = selected.has(String(doc._id));
    if (wants === current.has(String(zoneId))) continue;
    if (wants) current.add(String(zoneId)); else current.delete(String(zoneId));
    // Offered in every zone → store as "all zones" so zones added later include it.
    const next = allZoneIds.every((id) => current.has(id)) ? [] : [...current];
    ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { zoneIds: next } } } });
  }
  if (ops.length) await Model.bulkWrite(ops);
  return ops.length;
};

/** Body: { categoryIds: [], serviceIds: [] } — everything offered in this zone. */
export const setZoneCatalog = async (req, res) => {
  try {
    const { zoneId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(zoneId)) return res.status(400).json({ success: false, message: 'Invalid zone' });
    if (!(await Zone.exists({ _id: zoneId }))) return res.status(404).json({ success: false, message: 'Zone not found' });
    const { categoryIds, serviceIds } = req.body || {};
    if (!Array.isArray(categoryIds) || !Array.isArray(serviceIds)) {
      return res.status(400).json({ success: false, message: 'categoryIds and serviceIds are required' });
    }
    const allZoneIds = await activeZoneIds();
    const [categories, services] = await Promise.all([
      applyZoneSelection(HomeServiceCategory, categoryIds, zoneId, allZoneIds),
      applyZoneSelection(HomeServiceService, serviceIds, zoneId, allZoneIds)
    ]);
    res.json({ success: true, message: 'Zone services updated', changed: { categories, services } });
  } catch (error) {
    console.error('Set zone catalog error:', error);
    res.status(500).json({ success: false, message: 'Failed to update zone services' });
  }
};
