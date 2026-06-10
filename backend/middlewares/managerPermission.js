import Manager from '../models/Manager.js';
import { getModuleByKey, isValidAction, MANAGER_MODULES } from '../config/managerModules.js';

/**
 * Middleware: checkManagerPermission(moduleKey, action)
 * ───────────────────────────────────────────────────────
 * Usage in routes:
 *   router.get('/properties', protect, checkManagerPermission('properties', 'view'), getProperties);
 *   router.delete('/properties/:id', protect, checkManagerPermission('properties', 'delete'), deleteProperty);
 *
 * Rules:
 *  - Admin / Superadmin → always passes through (full access)
 *  - Manager → checked against their permissions array in DB
 *  - Any other role → 403
 */
export const checkManagerPermission = (moduleKey, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // ── Admin/Superadmin: Full bypass ──────────────────────────
      if (['admin', 'superadmin'].includes(user.role)) {
        return next();
      }

      // ── Manager: Granular check ────────────────────────────────
      if (user.role === 'manager') {
        // Validate module key exists in registry
        const moduleConfig = getModuleByKey(moduleKey);
        if (!moduleConfig) {
          console.error(`[PermissionMiddleware] Unknown module key: "${moduleKey}"`);
          return res.status(500).json({ success: false, message: 'Invalid permission module configuration' });
        }

        // Load fresh manager with permissions (user from token may be stale)
        const manager = await Manager.findById(user._id).select('permissions isActive role');

        if (!manager) {
          return res.status(401).json({ success: false, message: 'Manager account not found' });
        }

        if (!manager.isActive) {
          return res.status(403).json({ success: false, message: 'Your manager account has been deactivated' });
        }

        // Check permission
        const hasAccess = manager.hasPermission(moduleKey, action);

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You do not have "${action}" permission for the "${moduleConfig.label}" module.`,
            requiredPermission: { module: moduleKey, action },
          });
        }

        // Attach fresh permissions to req for use in controllers if needed
        req.managerPermissions = manager.permissions;
        return next();
      }

      // ── Any other role → forbidden ─────────────────────────────
      return res.status(403).json({
        success: false,
        message: `Role "${user.role}" is not authorized to access this resource`,
      });
    } catch (error) {
      console.error('[PermissionMiddleware] Error:', error);
      return res.status(500).json({ success: false, message: 'Permission check failed' });
    }
  };
};

/**
 * Middleware: requireAdminOrManager
 * Allows both Admin and Manager roles to pass — no action check.
 * Use for non-sensitive read endpoints where role alone is sufficient.
 */
export const requireAdminOrManager = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (!['admin', 'superadmin', 'manager'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted to Admin and Manager roles' });
  }
  next();
};

/**
 * Middleware: requireAdmin
 * Allows only Admin/Superadmin. Blocks managers.
 * Use for sensitive endpoints like creating/deleting other managers,
 * changing platform settings, etc.
 */
export const requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (!['admin', 'superadmin'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'This action is restricted to Administrators only' });
  }
  next();
};
