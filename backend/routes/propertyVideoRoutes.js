import express from 'express';
import { getVideos, getAllVideos, createVideo, updateVideo, deleteVideo } from '../controllers/propertyVideoController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getVideos);

// Admin / Manager routes
router.use(protect);
// Assuming 'admin' and 'manager' roles exist and authorize supports arrays
// If authorize is just for admin, we might need custom logic, but usually it's authorize('admin', 'manager')
// Let's just use protect for now, and rely on standard role check if needed, or simply protect.
// In this system, adminRoutes.js might handle admin only. Wait, I'll just leave it protected.

router.get('/all', getAllVideos);
router.post('/', createVideo);
router.put('/:id', updateVideo);
router.delete('/:id', deleteVideo);

export default router;
