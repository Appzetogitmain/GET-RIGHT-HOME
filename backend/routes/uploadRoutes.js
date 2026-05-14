import express from 'express';
import { generateSignature } from '../utils/cloudinary.js';

const router = express.Router();

router.get('/sign-signature', (req, res) => {
  try {
    const { folder = 'general' } = req.query;
    const signatureData = generateSignature(folder);
    res.json({ success: true, ...signatureData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
