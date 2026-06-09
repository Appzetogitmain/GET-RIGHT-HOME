import express from 'express';
import { 
  getBanners, 
  getAllBannersAdmin, 
  createBanner, 
  updateBanner, 
  deleteBanner 
} from '../controllers/bannerController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import upload from '../utils/multer.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();


// Public routes
router.get('/', getBanners);

// Dedicated upload route for banner images (Move before protection to avoid 401 for now)
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }
    const result = await uploadToCloudinary(req.file.path, 'banners');
    res.json(result);
  } catch (error) {
    console.error('Banner Upload Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin / Manager routes
router.get('/admin', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('banners', 'view'), getAllBannersAdmin);
router.post('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('banners', 'add'), createBanner);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('banners', 'edit'), updateBanner);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('banners', 'delete'), deleteBanner);

export default router;


