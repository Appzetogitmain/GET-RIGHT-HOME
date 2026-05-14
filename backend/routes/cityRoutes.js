import express from 'express';
import { getAllCities, getActiveCities, createCity, updateCity, deleteCity, toggleCityStatus } from '../controllers/cityController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/public', getActiveCities);

router.get('/', protect, authorizedRoles('admin', 'superadmin'), getAllCities);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), createCity);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), updateCity);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteCity);
router.patch('/:id/status', protect, authorizedRoles('admin', 'superadmin'), toggleCityStatus);

export default router;
