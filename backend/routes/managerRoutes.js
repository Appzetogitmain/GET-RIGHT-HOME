import express from 'express';
import {
  getAllManagers,
  getManagerById,
  createManager,
  updateManager,
  updateManagerPermissions,
  toggleManagerStatus,
  deleteManager,
  getManagerModules,
} from '../controllers/managerController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdmin, requireAdminOrManager } from '../middlewares/managerPermission.js';

const router = express.Router();

// ── Module Registry (Admin & Manager can view) ─────────────────────────────
// GET /api/managers/modules → Returns full MANAGER_MODULES list for UI rendering
router.get('/modules', protect, requireAdminOrManager, getManagerModules);

// ── Admin-only Manager CRUD ────────────────────────────────────────────────
// All below routes are restricted to Admin / Superadmin only

// List all managers
router.get('/', protect, requireAdmin, getAllManagers);

// Get single manager detail
router.get('/:id', protect, requireAdmin, getManagerById);

// Create a new manager
router.post('/', protect, requireAdmin, createManager);

// Update manager (profile + permissions together)
router.put('/:id', protect, requireAdmin, updateManager);

// Update only permissions (dedicated endpoint for the permission matrix UI)
router.put('/:id/permissions', protect, requireAdmin, updateManagerPermissions);

// Toggle active/inactive status
router.put('/:id/toggle', protect, requireAdmin, toggleManagerStatus);

// Delete manager
router.delete('/:id', protect, requireAdmin, deleteManager);

export default router;
