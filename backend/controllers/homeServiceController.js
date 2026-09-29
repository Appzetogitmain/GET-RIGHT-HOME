import HomeServiceCategory from '../models/HomeServiceCategory.js';
import HomeServiceSubCategory from '../models/HomeServiceSubCategory.js';
import HomeServiceService from '../models/HomeServiceService.js';
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
    if (cityId) {
      filter.$or = [{ cityIds: cityId }, { cityIds: 'default' }];
    }
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
    if (cityId) {
      filter.$or = [{ cityIds: cityId }, { cityIds: 'default' }];
    }
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
    if (cityId) {
      filter.$or = [{ cityIds: cityId }, { cityIds: 'default' }];
    }

    const services = await HomeServiceService.find(filter).populate('categoryId subCategoryId');
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubCategory = async (req, res) => {
  try {
    const { title } = req.body;
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Ensure cityIds is an array and defaults to ['default']
    const cityIds = req.body.cityIds?.length > 0 ? req.body.cityIds : ['default'];

    const parentCategory = await HomeServiceCategory.findById(req.body.categoryId).select('bookingModes').lean();
    const subCategory = await HomeServiceSubCategory.create({
      ...req.body,
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
    if (req.body.title) {
      updateData.slug = req.body.title.toLowerCase().replace(/\s+/g, '-');
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
    const slug = title.toLowerCase().replace(/\s+/g, '-');
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
      updateData.slug = title.toLowerCase().replace(/\s+/g, '-');
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
