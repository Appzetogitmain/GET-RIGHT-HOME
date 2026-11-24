import express from 'express';
import { generateSignature } from '../utils/cloudinary.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// SECURITY: was public — anyone could get a signed upload ticket and push
// arbitrary files into the Cloudinary account (cost + hosting abuse).
router.get('/sign-signature', protect, (req, res) => {
  try {
    const rawFolder = typeof req.query.folder === 'string' ? req.query.folder : 'general';
    const folder = rawFolder.replace(/[^a-zA-Z0-9_\-/]/g, '').replace(/\.\.+/g, '').slice(0, 60) || 'general';
    const signatureData = generateSignature(folder);
    res.json({ success: true, ...signatureData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
