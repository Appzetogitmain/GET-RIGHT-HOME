import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  createProperty,
  updateProperty,
  addRoomType,
  updateRoomType,
  deleteRoomType,
  upsertDocuments,
  getPublicProperties,
  getPropertyDetails,
  getMyProperties,
  deleteProperty,
  revealContact,
  getRecommendedSellers,
  getAdminPropertiesByLocation,
  getAdminPropertyCities,
  getPropertyStats,
  debugProperties,
  getPartnerPublicDetails
} from '../controllers/propertyController.js';


const router = express.Router();

router.get('/', getPublicProperties);
router.get('/debug-data', debugProperties); // TEMP - remove after debugging
router.get('/recommended-sellers', getRecommendedSellers);
router.get('/admin-added', getAdminPropertiesByLocation);
router.get('/admin-cities', getAdminPropertyCities);
router.get('/partner-public-details/:id', getPartnerPublicDetails);

// User & Partner can manage their own properties
const ownerRoles = authorizedRoles('partner', 'admin', 'user', 'superadmin', 'owner', 'broker');

router.get('/my', protect, ownerRoles, getMyProperties);
router.get('/:id/reveal-contact', revealContact);
router.get('/:id/stats', protect, ownerRoles, getPropertyStats);
router.get('/:id', getPropertyDetails);

router.post('/', protect, ownerRoles, createProperty);
router.put('/:id', protect, ownerRoles, updateProperty);
router.delete('/:id', protect, ownerRoles, deleteProperty);
router.post('/:propertyId/room-types', protect, ownerRoles, addRoomType);
router.put('/:propertyId/room-types/:roomTypeId', protect, ownerRoles, updateRoomType);
router.delete('/:propertyId/room-types/:roomTypeId', protect, ownerRoles, deleteRoomType);
router.post('/:propertyId/documents', protect, ownerRoles, upsertDocuments);

export default router;
