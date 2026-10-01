import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { getZoneCatalog, setZoneCatalog } from '../controllers/zoneCatalogController.js';

const router = express.Router();
router.use(protect);
router.use(authorizedRoles('admin', 'superadmin'));

router.get('/:zoneId', getZoneCatalog);
router.put('/:zoneId', setZoneCatalog);

export default router;
