import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';
import {
  getVisitConfig, bookVisit, rejectEstimate,
  adminCategories, adminListItems, adminCreateItem, adminUpdateItem, adminDeleteItem, adminSeedItems,
  adminGetRule, adminSaveRule, adminEstimateBookings
} from '../controllers/estimateController.js';

// Customer: /api/estimates
export const customerRouter = express.Router();
customerRouter.use(protect);
customerRouter.get('/config', getVisitConfig);
customerRouter.post('/book-visit', bookVisit);
customerRouter.post('/:id/reject', rejectEstimate);

// Admin: /api/admin/estimates
export const adminRouter = express.Router();
adminRouter.use(protect, authorizedRoles('admin', 'superadmin', 'manager'));
adminRouter.get('/categories', checkManagerPermission('categories', 'view'), adminCategories);
adminRouter.get('/items', checkManagerPermission('categories', 'view'), adminListItems);
adminRouter.post('/items', checkManagerPermission('categories', 'add'), adminCreateItem);
adminRouter.post('/items/seed', checkManagerPermission('categories', 'add'), adminSeedItems);
adminRouter.put('/items/:id', checkManagerPermission('categories', 'edit'), adminUpdateItem);
adminRouter.delete('/items/:id', checkManagerPermission('categories', 'delete'), adminDeleteItem);
adminRouter.get('/rule', checkManagerPermission('categories', 'view'), adminGetRule);
adminRouter.put('/rule', checkManagerPermission('categories', 'edit'), adminSaveRule);
adminRouter.get('/bookings', checkManagerPermission('categories', 'view'), adminEstimateBookings);
