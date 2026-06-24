import Manager from '../models/Manager.js';
import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MANAGER_MODULES, getModuleByKey, isValidAction } from '../config/managerModules.js';

// ─── Token helper (same pattern as authController) ───────────────────────────
const generateManagerToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const setTokenCookie = (res, token, req) => {
  const isLocal =
    req.headers.host?.includes('localhost') ||
    req.headers.host?.includes('127.0.0.1') ||
    req.headers.host?.includes('192.168.') ||
    req.headers.host?.includes('10.') ||
    req.headers.host?.includes('172.');
  const secure = process.env.NODE_ENV === 'production' && !isLocal;
  res.cookie('token', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: Manager Login
// POST /api/auth/manager/login
// ─────────────────────────────────────────────────────────────────────────────
export const managerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const manager = await Manager.findOne({ email }).select('+password');

    if (!manager) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!manager.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Admin.' });
    }

    const isMatched = await bcrypt.compare(password, manager.password);
    if (!isMatched) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    manager.lastLogin = new Date();
    await manager.save();

    const token = generateManagerToken(manager._id, manager.role);
    setTokenCookie(res, token, req);

    return res.status(200).json({
      success: true,
      message: 'Manager login successful',
      token,
      user: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        role: manager.role,
        avatar: manager.avatar,
        branch: manager.branch,
        permissions: manager.permissions,
      },
    });
  } catch (error) {
    console.error('Manager Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: Get current manager profile
// GET /api/auth/manager/me
// ─────────────────────────────────────────────────────────────────────────────
export const getManagerProfile = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user._id).populate('createdBy', 'name email');
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        role: manager.role,
        avatar: manager.avatar,
        branch: manager.branch,
        permissions: manager.permissions,
        isActive: manager.isActive,
        lastLogin: manager.lastLogin,
        createdBy: manager.createdBy,
        createdAt: manager.createdAt,
      },
    });
  } catch (error) {
    console.error('Get Manager Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Get all managers
// GET /api/admin/managers
// ─────────────────────────────────────────────────────────────────────────────
export const getAllManagers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const [managers, total] = await Promise.all([
      Manager.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Manager.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      managers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get All Managers Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching managers' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Get single manager
// GET /api/admin/managers/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getManagerById = async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.id).populate('createdBy', 'name email');
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    return res.status(200).json({ success: true, manager });
  } catch (error) {
    console.error('Get Manager By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Create manager
// POST /api/admin/managers
// ─────────────────────────────────────────────────────────────────────────────
export const createManager = async (req, res) => {
  try {
    const { name, email, phone, password, branch, avatar, avatarPublicId, permissions = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Name validation (only alphabets, min 3 chars)
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name) || name.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Name must contain only alphabets (min 3 characters)' });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    // Phone validation (exactly 10 digits starting with 6-9)
    if (phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian phone number starting with 6-9' });
      }
    }

    // Password validation (min 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check duplicate
    const existing = await Manager.findOne({ $or: [{ email }, ...(phone ? [{ phone }] : [])] });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.email === email ? 'A manager with this email already exists' : 'A manager with this phone already exists',
      });
    }

    // Validate & sanitize permissions
    const sanitizedPermissions = sanitizePermissions(permissions);

    const hashedPassword = await bcrypt.hash(password, 10);

    const manager = await Manager.create({
      name,
      email,
      phone: phone || undefined,
      password: hashedPassword,
      branch: branch || null,
      avatar: avatar || null,
      avatarPublicId: avatarPublicId || null,
      permissions: sanitizedPermissions,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Manager created successfully',
      manager: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        role: manager.role,
        branch: manager.branch,
        avatar: manager.avatar,
        permissions: manager.permissions,
        isActive: manager.isActive,
        createdAt: manager.createdAt,
      },
    });
  } catch (error) {
    console.error('Create Manager Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email or phone already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error creating manager' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Update manager (profile + permissions)
// PUT /api/admin/managers/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateManager = async (req, res) => {
  try {
    const { name, email, phone, branch, avatar, avatarPublicId, isActive, permissions, password } = req.body;

    const manager = await Manager.findById(req.params.id);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }

    // Name validation
    if (name !== undefined) {
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (!nameRegex.test(name) || name.trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Name must contain only alphabets (min 3 characters)' });
      }
      manager.name = name;
    }

    // Email validation
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      }
    }

    // Phone validation
    if (phone !== undefined && phone !== null && phone !== '') {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian phone number starting with 6-9' });
      }
    }

    // Password validation
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      }
    }

    if (branch !== undefined) manager.branch = branch;
    if (avatar !== undefined) manager.avatar = avatar;
    if (avatarPublicId !== undefined) manager.avatarPublicId = avatarPublicId;
    if (isActive !== undefined) manager.isActive = isActive;

    // Email uniqueness check
    if (email && email !== manager.email) {
      const emailExists = await Manager.findOne({ email, _id: { $ne: manager._id } });
      if (emailExists) {
        return res.status(409).json({ success: false, message: 'Email already in use by another manager' });
      }
      manager.email = email;
    }

    // Phone uniqueness check
    if (phone !== undefined && phone !== manager.phone) {
      if (phone) {
        const phoneExists = await Manager.findOne({ phone, _id: { $ne: manager._id } });
        if (phoneExists) {
          return res.status(409).json({ success: false, message: 'Phone already in use by another manager' });
        }
      }
      manager.phone = phone || null;
    }

    // Password update (optional)
    if (password) {
      manager.password = await bcrypt.hash(password, 10);
    }

    // Permissions update — Admin can fully replace, add, or remove
    if (permissions !== undefined) {
      manager.permissions = sanitizePermissions(permissions);
    }

    await manager.save();

    return res.status(200).json({
      success: true,
      message: 'Manager updated successfully',
      manager: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        role: manager.role,
        branch: manager.branch,
        avatar: manager.avatar,
        permissions: manager.permissions,
        isActive: manager.isActive,
        updatedAt: manager.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update Manager Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating manager' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Toggle manager active status
// PUT /api/admin/managers/:id/toggle
// ─────────────────────────────────────────────────────────────────────────────
export const toggleManagerStatus = async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.id);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    manager.isActive = !manager.isActive;
    await manager.save();
    return res.status(200).json({
      success: true,
      message: `Manager ${manager.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: manager.isActive,
    });
  } catch (error) {
    console.error('Toggle Manager Status Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Delete manager
// DELETE /api/admin/managers/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteManager = async (req, res) => {
  try {
    const manager = await Manager.findByIdAndDelete(req.params.id);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    return res.status(200).json({ success: true, message: 'Manager deleted successfully' });
  } catch (error) {
    console.error('Delete Manager Error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting manager' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC (Authenticated Admin/Manager): Get module registry
// GET /api/managers/modules
// ─────────────────────────────────────────────────────────────────────────────
export const getManagerModules = (req, res) => {
  return res.status(200).json({ success: true, modules: MANAGER_MODULES });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Update only the permissions of a manager
// PUT /api/admin/managers/:id/permissions
// ─────────────────────────────────────────────────────────────────────────────
export const updateManagerPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'permissions must be an array' });
    }

    const manager = await Manager.findById(req.params.id);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }

    manager.permissions = sanitizePermissions(permissions);
    await manager.save();

    return res.status(200).json({
      success: true,
      message: 'Manager permissions updated successfully',
      permissions: manager.permissions,
    });
  } catch (error) {
    console.error('Update Manager Permissions Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating permissions' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Private Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize and validate incoming permissions array.
 * Strips unknown module keys and invalid actions to prevent injection.
 *
 * @param {Array} permissions - Raw permissions from request body
 * @returns {Array} - Cleaned permissions array
 */
function sanitizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];

  const sanitized = [];

  for (const entry of permissions) {
    if (!entry.module || typeof entry.module !== 'string') continue;

    const moduleConfig = getModuleByKey(entry.module);
    if (!moduleConfig) {
      // Unknown module key — skip silently (or log a warning)
      console.warn(`[sanitizePermissions] Unknown module key skipped: "${entry.module}"`);
      continue;
    }

    const rawActions = Array.isArray(entry.actions) ? entry.actions : [];
    // Only keep actions that are valid for this module
    const validActions = rawActions.filter((a) => isValidAction(entry.module, a));

    // Only include module if at least 'view' is in actions
    if (validActions.length > 0) {
      sanitized.push({ module: entry.module, actions: validActions });
    }
  }

  return sanitized;
}
