import Banner from '../models/Banner.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

// @desc    Get all banners
// @route   GET /api/banners
// @access  Public
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 });
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all banners (Admin)
// @route   GET /api/banners/admin
// @access  Private (Admin)
export const getAllBannersAdmin = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1 });
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private (Admin)
export const createBanner = async (req, res) => {
  try {
    const { title, link, order, type, imageUrl, imagePublicId } = req.body;

    const banner = new Banner({
      title,
      link,
      order,
      type,
      imageUrl,
      imagePublicId
    });

    const savedBanner = await banner.save();
    res.status(201).json(savedBanner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a banner
// @route   PUT /api/banners/:id
// @access  Private (Admin)
export const updateBanner = async (req, res) => {
  try {
    const { title, link, order, type, isActive, imageUrl, imagePublicId } = req.body;
    
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // If new image is provided, we might want to delete the old one from Cloudinary
    // But usually, the frontend handles upload and just sends new URLs.
    
    banner.title = title || banner.title;
    banner.link = link !== undefined ? link : banner.link;
    banner.order = order !== undefined ? order : banner.order;
    banner.type = type || banner.type;
    banner.isActive = isActive !== undefined ? isActive : banner.isActive;
    
    if (imageUrl) banner.imageUrl = imageUrl;
    if (imagePublicId) banner.imagePublicId = imagePublicId;

    const updatedBanner = await banner.save();
    res.status(200).json(updatedBanner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private (Admin)
export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // Delete from Cloudinary if exists
    if (banner.imagePublicId) {
      await deleteFromCloudinary(banner.imagePublicId);
    }

    await Banner.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
