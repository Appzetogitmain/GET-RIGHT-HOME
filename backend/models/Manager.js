import mongoose from 'mongoose';

/**
 * PermissionEntry sub-schema
 * Each entry represents one module and its allowed actions.
 * Example: { module: 'properties', actions: ['view', 'add', 'edit', 'approve'] }
 */
const permissionEntrySchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      trim: true,
      // 'module' should match a key from config/managerModules.js
    },
    actions: {
      type: [String],
      enum: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
      default: ['view'],
    },
  },
  { _id: false } // No separate _id per permission entry
);

const managerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Manager name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Manager email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      default: 'manager',
      immutable: true, // Role cannot be changed after creation
    },

    // ── Profile ───────────────────────────────────────────────────
    avatar: {
      type: String,
      default: null,
    },
    avatarPublicId: {
      type: String,
      default: null,
    },

    // ── Branch Assignment ─────────────────────────────────────────
    // Simple string branch for Phase 1. Can be upgraded to ObjectId → Branch later.
    branch: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Granular Permission System ─────────────────────────────────
    // Admin controls this array to assign/remove/update module access.
    permissions: {
      type: [permissionEntrySchema],
      default: [],
    },

    // ── Account Status ─────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Tracking ───────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    // ── FCM Tokens (Push Notifications) ───────────────────────────
    fcmTokens: {
      app: { type: String, default: null },
      web: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Instance method: Check if manager has permission for a specific module + action.
 * Usage: manager.hasPermission('properties', 'delete')  → true/false
 */
managerSchema.methods.hasPermission = function (moduleKey, action) {
  const entry = this.permissions.find((p) => p.module === moduleKey);
  if (!entry) return false;
  return entry.actions.includes(action);
};

/**
 * Instance method: Get all permitted modules (where view is granted)
 */
managerSchema.methods.getPermittedModules = function () {
  return this.permissions
    .filter((p) => p.actions.includes('view'))
    .map((p) => p.module);
};

const Manager = mongoose.model('Manager', managerSchema);
export default Manager;
