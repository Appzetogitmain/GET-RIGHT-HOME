import express from 'express';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
import { rateLimitReelUpload } from '../middlewares/rateLimitReelUpload.js';
import {
  uploadReel,
  getFeed,
  getMostViewed,
  toggleLike,
  addComment,
  getComments,
  toggleCommentLike,
  shareReel,
  recordView,
  getReelById,
  deleteReel,
  updateReel,
  toggleShortlist,
} from '../controllers/reelController.js';
import { uploadReelVideo } from '../utils/multer.js';

const router = express.Router();

router.post(
  '/upload',
  protect,
  rateLimitReelUpload,
  uploadReelVideo.single('video'),
  uploadReel
);

router.put(
  '/:id',
  protect,
  uploadReelVideo.single('video'),
  updateReel
);

router.post('/shortlist/:id', protect, toggleShortlist);

router.get('/feed', optionalProtect, getFeed);
router.get('/most-viewed', optionalProtect, getMostViewed);

router.get('/:id', optionalProtect, getReelById);
router.post('/like/:id', protect, toggleLike);
router.post('/comment/:id', protect, addComment);
router.get('/:id/comments', optionalProtect, getComments);
router.post('/comment/:id/like', protect, toggleCommentLike);
router.post('/share/:id', protect, shareReel);
router.post('/:id/view', optionalProtect, recordView);
router.delete('/:id', protect, deleteReel);

export default router;
