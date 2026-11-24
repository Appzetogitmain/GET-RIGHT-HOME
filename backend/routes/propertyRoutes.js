import express from 'express';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
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
  getMyListingEligibility,
  reportPaywallHit,
  submitPropertyForApproval,
  getSearchSuggestions,
  getLocationSuggestions,
  getListingSuggestions,
  getPopularCities,
  getPopularAreas,
  getSimilarProperties,
  trackSearchOutcome,
  getSearchAnalyticsReport,
  deleteProperty,
  revealContact,
  getRecommendedSellers,
  getAdminPropertiesByLocation,
  getAdminPropertyCities,
  getHomeFeaturedProperties,
  getPropertyStats,
  getPartnerPublicDetails,
  getPublicBuilders
} from '../controllers/propertyController.js';


const router = express.Router();

router.get('/builders', getPublicBuilders);
router.get('/', getPublicProperties);
// Public autocomplete. Above '/:id' so "suggestions" isn't read as an id.
router.get('/suggestions', getSearchSuggestions);
router.get('/locations', getLocationSuggestions);
router.get('/listing-suggestions', getListingSuggestions);
router.get('/popular-cities', getPopularCities);
router.get('/popular-areas', getPopularAreas);
router.get('/admin/search-analytics', protect, authorizedRoles('admin', 'superadmin', 'manager'), getSearchAnalyticsReport);
// SECURITY: the public '/debug-data' route (dumped every listing incl. drafts
// and pending ones) has been removed.
router.get('/recommended-sellers', getRecommendedSellers);
router.get('/admin-added', getAdminPropertiesByLocation);
router.get('/admin-cities', getAdminPropertyCities);
router.get('/featured', getHomeFeaturedProperties);
router.get('/partner-public-details/:id', getPartnerPublicDetails);

// User & Partner can manage their own properties
const ownerRoles = authorizedRoles('partner', 'admin', 'user', 'superadmin', 'owner', 'broker', 'builder');

router.get('/my', protect, ownerRoles, getMyProperties);
// Must stay above '/:id' so "listing-eligibility" isn't parsed as a property id.
router.get('/listing-eligibility', protect, ownerRoles, getMyListingEligibility);
router.post('/listing-eligibility/paywall', protect, ownerRoles, reportPaywallHit);
router.get('/:id/reveal-contact', revealContact);
router.get('/:id/similar', getSimilarProperties);
router.get('/:id/stats', protect, ownerRoles, getPropertyStats);
router.get('/:id', optionalProtect, getPropertyDetails); // optional login: owners/admins also get documents

// Anonymous attribution of a click/enquiry back to the session's last search.
router.post('/:id/search-outcome', trackSearchOutcome);

router.post('/', protect, ownerRoles, createProperty);
router.post('/:id/submit', protect, ownerRoles, submitPropertyForApproval);
router.put('/:id', protect, ownerRoles, updateProperty);
router.delete('/:id', protect, ownerRoles, deleteProperty);
router.post('/:propertyId/room-types', protect, ownerRoles, addRoomType);
router.put('/:propertyId/room-types/:roomTypeId', protect, ownerRoles, updateRoomType);
router.delete('/:propertyId/room-types/:roomTypeId', protect, ownerRoles, deleteRoomType);
router.post('/:propertyId/documents', protect, ownerRoles, upsertDocuments);

export default router;
