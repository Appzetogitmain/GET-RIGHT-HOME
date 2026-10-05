import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';
import {
  getMoverConfig, quoteMove, createMoverBooking, checkArea, adminZones,
  adminListInventory, adminCreateItem, adminUpdateItem, adminDeleteItem, adminSeedInventory,
  adminGetSettings, adminUpdateSettings, adminMoverSummary
} from '../controllers/moverController.js';

// Customer: /api/movers
export const customerRouter = express.Router();
customerRouter.use(protect);
customerRouter.get('/config', getMoverConfig);
customerRouter.post('/quote', quoteMove);
customerRouter.post('/check-area', checkArea);
customerRouter.post('/book', createMoverBooking);

// Admin: /api/admin/movers
export const adminRouter = express.Router();
const staff = authorizedRoles('admin', 'superadmin', 'manager');
adminRouter.use(protect, staff);
adminRouter.get('/inventory', checkManagerPermission('categories', 'view'), adminListInventory);
adminRouter.post('/inventory', checkManagerPermission('categories', 'add'), adminCreateItem);
adminRouter.post('/inventory/seed', checkManagerPermission('categories', 'add'), adminSeedInventory);
adminRouter.put('/inventory/:id', checkManagerPermission('categories', 'edit'), adminUpdateItem);
adminRouter.delete('/inventory/:id', checkManagerPermission('categories', 'delete'), adminDeleteItem);
adminRouter.get('/zones', checkManagerPermission('categories', 'view'), adminZones);
adminRouter.get('/settings', checkManagerPermission('categories', 'view'), adminGetSettings);
adminRouter.put('/settings', checkManagerPermission('categories', 'edit'), adminUpdateSettings);
adminRouter.get('/summary', checkManagerPermission('categories', 'view'), adminMoverSummary);
