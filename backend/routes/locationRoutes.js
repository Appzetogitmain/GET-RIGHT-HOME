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

const router = express.Router();
const adminOnly = [protect, authorizedRoles('admin', 'superadmin')];

// ─── Public routes ───────────────────────────────────────────────
router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/districts', getDistricts);
router.get('/cities', getCities);
router.get('/tree', getFullTree);

// ─── Admin routes ─────────────────────────────────────────────────
router.get('/', ...adminOnly, getAllLocations);
router.post('/', ...adminOnly, createLocation);
router.put('/:id', ...adminOnly, updateLocation);
router.delete('/:id', ...adminOnly, deleteLocation);
router.patch('/:id/toggle', ...adminOnly, toggleLocation);

export default router;
