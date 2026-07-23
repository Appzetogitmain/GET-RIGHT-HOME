/**
 * MANAGER MODULES REGISTRY
 * ─────────────────────────
 * Single source of truth for all assignable manager modules and their valid actions.
 * Every new Admin feature should be added here so it automatically appears
 * in the permission assignment UI without any additional development.
 *
 * key:     Unique identifier stored in DB permissions array
 * label:   Human-readable name shown in the Admin's permission assignment UI
 * actions: All valid action types for this module
 */
export const MANAGER_MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    group: 'OVERVIEW',
    actions: ['view'],
  },
  {
    key: 'users',
    label: 'User Management',
    group: 'MANAGEMENT',
    actions: ['view', 'edit', 'delete', 'suspend', 'export'],
  },
  {
    key: 'builders',
    label: 'Builder Management',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete', 'suspend'],
  },
  {
    key: 'builder_verification',
    label: 'Builder Verification',
    group: 'MANAGEMENT',
    actions: ['view', 'approve', 'reject'],
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'properties',
    label: 'Property Management',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete', 'approve', 'reject', 'export'],
  },
  {
    key: 'projects',
    label: 'Projects Management',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete', 'approve', 'reject', 'export'],
  },
  {
    key: 'featured_projects',
    label: 'Featured Projects Hub',
    group: 'MANAGEMENT',
    actions: ['view', 'edit', 'delete'],
  },
  {
    key: 'property_videos',
    label: 'Property Videos',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'categories',
    label: 'Property Categories',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'property_forms',
    label: 'Property Form CMS',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'locations',
    label: 'Location Manager',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'enquiries',
    label: 'Enquiries / Leads',
    group: 'MANAGEMENT',
    actions: ['view', 'edit', 'delete', 'export'],
  },
  {
    key: 'reviews',
    label: 'Reviews',
    group: 'MANAGEMENT',
    actions: ['view', 'edit', 'delete'],
  },
  {
    key: 'banners',
    label: 'Banner Management',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'locality_insights',
    label: 'Locality Insights',
    group: 'MANAGEMENT',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'reel_analysis',
    label: 'Reel Analysis',
    group: 'MANAGEMENT',
    actions: ['view', 'delete'],
  },
  {
    key: 'finance',
    label: 'Finance & Payouts',
    group: 'SYSTEM',
    actions: ['view', 'approve', 'export'],
  },
  {
    key: 'offers',
    label: 'Offers & Coupons',
    group: 'SYSTEM',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    group: 'SYSTEM',
    actions: ['view', 'add'],
  },
  {
    key: 'legal',
    label: 'Legal & Content',
    group: 'SYSTEM',
    actions: ['view', 'edit'],
  },
  {
    key: 'contact_messages',
    label: 'Contact Messages',
    group: 'SYSTEM',
    actions: ['view', 'edit'],
  },
  {
    key: 'faqs',
    label: 'FAQs',
    group: 'SYSTEM',
    actions: ['view', 'add', 'edit', 'delete'],
  },
  {
    key: 'settings',
    label: 'Platform Settings',
    group: 'SYSTEM',
    actions: ['view', 'edit'],
  },
];

/**
 * Helper: Get a specific module definition by key
 */
export const getModuleByKey = (key) => MANAGER_MODULES.find((m) => m.key === key) || null;

/**
 * Helper: Get all valid action types for a given module key
 */
export const getValidActionsForModule = (key) => {
  const mod = getModuleByKey(key);
  return mod ? mod.actions : [];
};

/**
 * Helper: Check if a given action is valid for a given module
 */
export const isValidAction = (moduleKey, action) => {
  return getValidActionsForModule(moduleKey).includes(action);
};

export default MANAGER_MODULES;
