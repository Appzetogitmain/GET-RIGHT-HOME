import HomeServiceCategory from '../models/HomeServiceCategory.js';
import HomeServiceBrand from '../models/HomeServiceBrand.js';
import HomeServiceService from '../models/HomeServiceService.js';

// Categories
export const getCategories = async (req, res) => {
  try {
    const { status, cityId } = req.query;
    const filter = {};
    if (status) filter.isActive = status === 'active';
    if (cityId) filter.cityId = cityId;

    const categories = await HomeServiceCategory.find(filter).sort({ homeOrder: 1, title: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { title } = req.body;
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    const category = await HomeServiceCategory.create({ ...req.body, slug });
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await HomeServiceCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

// Brands
export const getBrands = async (req, res) => {
  try {
    const { categoryId, cityId } = req.query;
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (cityId) filter.cityId = cityId;

    const brands = await HomeServiceBrand.find(filter).populate('categoryId');
    res.json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBrand = async (req, res) => {
  try {
    const { title } = req.body;
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    const brand = await HomeServiceBrand.create({ ...req.body, slug });
    res.status(201).json({ success: true, brand });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Services
export const getServices = async (req, res) => {
  try {
    const { brandId, categoryId } = req.query;
    const filter = {};
    if (brandId) filter.brandId = brandId;
    if (categoryId) filter.categoryId = categoryId;

    const services = await HomeServiceService.find(filter).populate('brandId categoryId');
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createService = async (req, res) => {
  try {
    const { title } = req.body;
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    const service = await HomeServiceService.create({ ...req.body, slug });
    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
