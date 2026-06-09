// routes/locationRoutes.js
import express from 'express';
import {
  getCountries,
  getStates,
  getDistricts,
  getCities,
  getFullTree,
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  toggleLocation
} from '../controllers/locationController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

const baseProtect = [protect, authorizedRoles('admin', 'superadmin', 'manager')];

// ─── Public routes ───────────────────────────────────────────────
router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/districts', getDistricts);
router.get('/cities', getCities);
router.get('/tree', getFullTree);

// ─── Admin routes ─────────────────────────────────────────────────
router.get('/', ...baseProtect, checkManagerPermission('locations', 'view'), getAllLocations);
router.post('/', ...baseProtect, checkManagerPermission('locations', 'add'), createLocation);
router.put('/:id', ...baseProtect, checkManagerPermission('locations', 'edit'), updateLocation);
router.delete('/:id', ...baseProtect, checkManagerPermission('locations', 'delete'), deleteLocation);
router.patch('/:id/toggle', ...baseProtect, checkManagerPermission('locations', 'edit'), toggleLocation);

export default router;
