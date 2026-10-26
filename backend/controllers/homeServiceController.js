import HomeServiceCategory from '../models/HomeServiceCategory.js';
import HomeServiceSubCategory from '../models/HomeServiceSubCategory.js';
import HomeServiceService from '../models/HomeServiceService.js';
import Zone from '../models/Zone.js';
import Worker from '../models/Worker.js';
import Profession from '../models/Profession.js';
import { workerServesBooking } from '../services/locationService.js';
import { safeRegex } from '../utils/escapeRegex.js';
import { normalizeBookingModes } from '../utils/bookingModes.js';

const addAndFilter = (filter, clause) => {
  if (!clause) return;
  filter.$and = [...(filter.$and || []), clause];
};

const modeClause = (bookingMode, { allowLegacyInstant = false } = {}) => {
  if (!bookingMode) return null;
  if (bookingMode === 'instant') {
    return allowLegacyInstant
      ? { $or: [{ bookingModes: 'instant' }, { isInstant: true }] }
      : { bookingModes: 'instant' };
  }
  return {
    $or: [
      { bookingModes: 'slot' },
      { bookingModes: { $exists: false } },
      { bookingModes: { $size: 0 } }
    ]
  };
};

/**
 * Zone-wise catalog for the user app. When the request carries the customer's
 * location (?lat&lng) the catalog is limited to what the admin offers in the
 * zone that location falls in (empty zoneIds = offered everywhere) and the old
 * city filter is not used. Returns null when the location is unknown or no
 * zones are configured, in which case the city filter applies as before.
 */
const resolveZoneScope = async (query) => {
  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!(await Zone.exists({ status: 'active' }))) return null;
  const zone = await Zone.findOne({
    status: 'active',
    area: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [lng, lat] } } }
  }).select('_id').lean();
  return { zoneId: zone?._id || null };
};

const zoneClause = (scope) => ({
  $or: [
    { zoneIds: { $size: 0 } },
    { zoneIds: { $exists: false } },
    ...(scope.zoneId ? [{ zoneIds: scope.zoneId }] : [])
  ]
});

const zoneCategoryIds = async (scope) => HomeServiceCategory.distinct('_id', zoneClause(scope));

/**
 * Ids of categories that some approved worker can actually take: in the customer's
 * zone (when known) and covered by the worker's profession (or, for workers with no
 * profession, their category list). Showing anything else lets a customer book a
 * service nobody will ever accept. Returns null to skip the check (customer outside
 * every zone — they get the "not serviceable" message at booking instead).
 */
const categoriesWithWorkers = async (scope) => {
  if (scope && !scope.zoneId) return null;
  const workerQuery = { approvalStatus: 'approved', isActive: true };
  if (scope?.zoneId) {
    const zone = await Zone.findById(scope.zoneId).select('name').lean();
    workerQuery.$or = [{ zoneIds: scope.zoneId }, ...(zone ? [{ zones: safeRegex(zone.name, { exact: true }) }] : [])];
  }
  const [workers, professions, categories] = await Promise.all([
    Worker.find(workerQuery).select('serviceCategories professionIds').lean(),
    Profession.find({ isActive: true }).select('name categoryIds').lean(),
    HomeServiceCategory.find({ isActive: true }).select('title slug').lean()
  ]);
  const ids = new Set();
  for (const cat of categories) {
    const filters = { service: cat.title, serviceName: cat.title, slug: cat.slug, categoryId: cat._id };
    if (workers.some((w) => workerServesBooking(w, filters, professions))) ids.add(String(cat._id));
  }
  return ids;
};

const withWorkerCategories = async (filter, scope, field = '_id') => {
  // Only for a customer whose location (and so zone) is known. Without it — e.g. the
  // admin pages, which read the same public endpoints — every category must stay visible.
  if (!scope) return;
  const ids = await categoriesWithWorkers(scope);
  if (ids) addAndFilter(filter, { [field]: { $in: [...ids] } });
};

// Categories
export const getCategories = async (req, res) => {
  try {
    const { status, cityId, bookingMode } = req.query;
    const filter = {};
    if (status) filter.isActive = status === 'active';
    if (cityId) {
      filter.$or = [{ cityIds: cityId }, { cityIds: 'default' }];
    }
    addAndFilter(filter, modeClause(bookingMode));

    const categories = await HomeServiceCategory.find(filter).sort({ homeOrder: 1, title: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicCategories = async (req, res) => {
  try {
    const { cityId, bookingMode } = req.query;
    const filter = { isActive: true, showOnHome: true };
    const scope = await resolveZoneScope(req.query);
    if (scope) {
      addAndFilter(filter, zoneClause(scope));
    } else if (cityId) {
      filter.$or = [{ cityIds: cityId }, { cityIds: 'default' }];
    }
    await withWorkerCategories(filter, scope, '_id');
    if (bookingMode === 'instant') {
      const legacyInstantCategoryIds = await HomeServiceService.distinct('categoryId', { isActive: true, isInstant: true });
      addAndFilter(filter, { $or: [{ bookingModes: 'instant' }, { _id: { $in: legacyInstantCategoryIds } }] });
    } else {
      addAndFilter(filter, modeClause(bookingMode));
    }

    const categories = await HomeServiceCategory.find(filter).sort({ homeOrder: 1, title: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { title } = req.body;
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check if slug already exists
    const existing = await HomeServiceCategory.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: `Category with title "${title}" already exists.` });
    }

    const category = await HomeServiceCategory.create({
      ...req.body,
      slug,
      bookingModes: normalizeBookingModes(req.body.bookingModes)
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.bookingModes !== undefined) updateData.bookingModes = normalizeBookingModes(req.body.bookingModes);
    const category = await HomeServiceCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (category && req.body.bookingModes !== undefined) {
      await Promise.all([
        HomeServiceSubCategory.updateMany({ categoryId: category._id }, { $set: { bookingModes: updateData.bookingModes } }),
        HomeServiceService.updateMany(
          { categoryId: category._id },
          { $set: { bookingModes: updateData.bookingModes, isInstant: updateData.bookingModes.includes('instant') } }
        )
      ]);
    }
    res.json({ success: true, category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategoryOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { homeOrder } = req.body;
    const category = await HomeServiceCategory.findByIdAndUpdate(id, { homeOrder }, { new: true });
    res.json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await HomeServiceCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SubCategories
// Admin: Get ALL sub-categories (no city filter - admin sees everything)
export const getSubCategories = async (req, res) => {
  try {
    const { categoryId, status, bookingMode } = req.query;
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.isActive = status === 'active';
    addAndFilter(filter, modeClause(bookingMode));
    // No cityId filter in admin — show all sub-categories

    const subCategories = await HomeServiceSubCategory.find(filter)
      .populate('categoryId')
      .sort({ createdAt: -1 });
    res.json({ success: true, subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicSubCategories = async (req, res) => {
  try {
    const { categoryId, cityId, bookingMode } = req.query;
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    const scope = await resolveZoneScope(req.query);
    if (scope) {
      // Sub-categories follow their category's zones.
      addAndFilter(filter, { categoryId: { $in: await zoneCategoryIds(scope) } });
    } else if (cityId) {
      filter.$or = [{ cityIds: cityId }, { cityIds: 'default' }];
    }
    await withWorkerCategories(filter, scope, 'categoryId');
    if (bookingMode === 'instant') {
      const legacyInstantSubCategoryIds = await HomeServiceService.distinct('subCategoryId', { isActive: true, isInstant: true });
      addAndFilter(filter, { $or: [{ bookingModes: 'instant' }, { _id: { $in: legacyInstantSubCategoryIds } }] });
    } else {
      addAndFilter(filter, modeClause(bookingMode));
    }

    const subCategories = await HomeServiceSubCategory.find(filter).populate('categoryId');
    res.json({ success: true, subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicServices = async (req, res) => {
  try {
    const { categoryId, subCategoryId, cityId, instant, bookingMode } = req.query;
    const filter = { isActive: true };

    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    const requestedMode = bookingMode || (instant === 'true' ? 'instant' : null);
    addAndFilter(filter, modeClause(requestedMode, { allowLegacyInstant: true }));
    const scope = await resolveZoneScope(req.query);
    if (scope) {
      // A service needs its own zone offer AND its category offered in the zone.
      addAndFilter(filter, zoneClause(scope));
      addAndFilter(filter, { categoryId: { $in: await zoneCategoryIds(scope) } });
    } else if (cityId) {
      filter.$or = [{ cityIds: cityId }, { cityIds: 'default' }];
    }
    await withWorkerCategories(filter, scope, 'categoryId');

    const services = await HomeServiceService.find(filter).populate('categoryId subCategoryId');
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubCategory = async (req, res) => {
  try {
    const { title } = req.body;
    const baseSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    // slug is globally unique, so add -2, -3... if another sub-category already uses it
    let slug = baseSlug;
    for (let i = 2; await HomeServiceSubCategory.exists({ slug }); i++) slug = `${baseSlug}-${i}`;

    // Ensure cityIds is an array and defaults to ['default']
    const cityIds = req.body.cityIds?.length > 0 ? req.body.cityIds : ['default'];

    const parentCategory = await HomeServiceCategory.findById(req.body.categoryId).select('bookingModes').lean();
    const subCategory = await HomeServiceSubCategory.create({
      ...req.body,
      parentSubCategoryId: req.body.parentSubCategoryId || null,
      slug,
      cityIds,
      bookingModes: normalizeBookingModes(req.body.bookingModes, normalizeBookingModes(parentCategory?.bookingModes))
    });
    res.status(201).json({ success: true, subCategory });
  } catch (error) {
    console.error('Error creating sub-category:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (req.body.parentSubCategoryId !== undefined) {
      updateData.parentSubCategoryId = req.body.parentSubCategoryId || null;
      if (String(updateData.parentSubCategoryId) === String(id)) {
        return res.status(400).json({ success: false, message: 'A sub-category cannot be its own parent' });
      }
    }
    if (req.body.title) {
      const baseSlug = req.body.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      let slug = baseSlug;
      for (let i = 2; await HomeServiceSubCategory.exists({ slug, _id: { $ne: id } }); i++) slug = `${baseSlug}-${i}`;
      updateData.slug = slug;
    }
    if (req.body.bookingModes !== undefined) updateData.bookingModes = normalizeBookingModes(req.body.bookingModes);
    const subCategory = await HomeServiceSubCategory.findByIdAndUpdate(id, updateData, { new: true });
    if (!subCategory) return res.status(404).json({ success: false, message: 'Sub-category not found' });
    res.json({ success: true, subCategory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await HomeServiceSubCategory.findByIdAndDelete(req.params.id);
    if (!subCategory) return res.status(404).json({ success: false, message: 'Sub-category not found' });
    res.json({ success: true, message: 'Sub-category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Services
export const getServices = async (req, res) => {
  try {
    const { subCategoryId, categoryId, instant, bookingMode } = req.query;
    const filter = {};
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    if (categoryId) filter.categoryId = categoryId;
    const requestedMode = bookingMode || (instant === 'true' ? 'instant' : null);
    addAndFilter(filter, modeClause(requestedMode, { allowLegacyInstant: true }));

    const services = await HomeServiceService.find(filter).populate('subCategoryId categoryId');
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createService = async (req, res) => {
  try {
    const { title } = req.body;
    // slug is globally unique, so add -2, -3... if another service already uses it
    const baseSlug = title.toLowerCase().replace(/\s+/g, '-');
    let slug = baseSlug;
    for (let i = 2; await HomeServiceService.exists({ slug }); i++) slug = `${baseSlug}-${i}`;
    const parentCategory = await HomeServiceCategory.findById(req.body.categoryId).select('bookingModes').lean();
    const bookingModes = normalizeBookingModes(req.body.bookingModes, normalizeBookingModes(parentCategory?.bookingModes));
    const service = await HomeServiceService.create({
      ...req.body,
      slug,
      bookingModes,
      isInstant: bookingModes.includes('instant')
    });
    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const updateData = { ...req.body };
    if (title) {
      const baseSlug = title.toLowerCase().replace(/\s+/g, '-');
      let slug = baseSlug;
      for (let i = 2; await HomeServiceService.exists({ slug, _id: { $ne: id } }); i++) slug = `${baseSlug}-${i}`;
      updateData.slug = slug;
    }
    if (req.body.bookingModes !== undefined) {
      updateData.bookingModes = normalizeBookingModes(req.body.bookingModes);
      updateData.isInstant = updateData.bookingModes.includes('instant');
    }

    const service = await HomeServiceService.findByIdAndUpdate(id, updateData, { new: true });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await HomeServiceService.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
