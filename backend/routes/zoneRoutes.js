import express from 'express';
import { getZones, createZone, updateZone, deleteZone, checkServiceAvailability } from '../controllers/zoneController.js';

const router = express.Router();

// Get all zones (Admin)
router.get('/', getZones);

// Create a new zone (Admin)
router.post('/', createZone);

// Update a zone (Admin)
router.put('/:id', updateZone);

// Delete a zone (Admin)
router.delete('/:id', deleteZone);

// Check if a point is within any active zone (User App)
router.get('/check-service', checkServiceAvailability);

export default router;
