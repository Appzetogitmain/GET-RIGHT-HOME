import express from 'express';
import upload from '../utils/multer.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Common image upload endpoint used by multiple frontend components
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, 'general');

    res.json({
      success: true,
      imageUrl: result.url,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

export default router;
