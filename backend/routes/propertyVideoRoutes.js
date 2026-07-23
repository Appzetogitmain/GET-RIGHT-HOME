import express from 'express';
import { getVideos, getAllVideos, createVideo, updateVideo, deleteVideo } from '../controllers/propertyVideoController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

router.get('/', getVideos);

// Admin / Manager routes
router.use(protect);

router.get('/all', checkManagerPermission('property_videos', 'view'), getAllVideos);
router.post('/', checkManagerPermission('property_videos', 'add'), createVideo);
router.put('/:id', checkManagerPermission('property_videos', 'edit'), updateVideo);
router.delete('/:id', checkManagerPermission('property_videos', 'delete'), deleteVideo);

export default router;
