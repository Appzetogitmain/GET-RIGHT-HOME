import Settings from '../models/Settings.js';

// Admin-controlled kill switches. Each one is independent and defaults to ON
// (the behaviour before the switches existed). `userRazorpay` reuses the
// long-standing `isOnlinePaymentEnabled` field.
export const FEATURE_FLAG_FIELDS = {
  userRazorpay: 'isOnlinePaymentEnabled',
  workerRazorpay: 'workerOnlinePaymentEnabled',
  userSubscription: 'userSubscriptionEnabled',
  workerSubscription: 'workerSubscriptionEnabled'
};

export const flagsFromSettings = (settings) => {
  const out = {};
  for (const [flag, field] of Object.entries(FEATURE_FLAG_FIELDS)) {
    out[flag] = settings?.[field] !== false;
  }
  return out;
};

export const getFeatureFlags = async () => flagsFromSettings(await Settings.getSettings());

const DISABLED_MESSAGES = {
  userRazorpay: 'Online payment is currently disabled',
  workerRazorpay: 'Online payment is currently disabled',
  userSubscription: 'Subscription is currently disabled',
  workerSubscription: 'Subscription is currently disabled'
};

// Route guard: 403 when the given flag is OFF. Fails open if settings can't be read.
export const requireFeature = (flag) => async (req, res, next) => {
  try {
    const flags = await getFeatureFlags();
    if (flags[flag] === false) {
      return res.status(403).json({ success: false, featureDisabled: flag, message: DISABLED_MESSAGES[flag] });
    }
  } catch (err) {
    console.error('[featureFlags] check failed, allowing request:', err.message);
  }
  next();
};

// Imperative form for handlers that only know the role part-way through.
// Returns true (and responds 403) when blocked.
export const blockIfDisabled = async (res, flag) => {
  try {
    const flags = await getFeatureFlags();
    if (flags[flag] === false) {
      res.status(403).json({ success: false, featureDisabled: flag, message: DISABLED_MESSAGES[flag] });
      return true;
    }
  } catch (err) {
    console.error('[featureFlags] check failed, allowing request:', err.message);
  }
  return false;
};

const FLAG_KEYS = Object.keys(FEATURE_FLAG_FIELDS);

// Admin: GET /api/admin/feature-flags
export const getFeatureFlagsHandler = async (req, res) => {
  try {
    res.json({ success: true, flags: await getFeatureFlags() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: PUT /api/admin/feature-flags  { userRazorpay?, workerRazorpay?, userSubscription?, workerSubscription? }
// Only the booleans sent are changed, so each switch stays independent.
export const updateFeatureFlagsHandler = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    let touched = false;
    for (const key of FLAG_KEYS) {
      if (req.body[key] === undefined) continue;
      if (typeof req.body[key] !== 'boolean') {
        return res.status(400).json({ success: false, message: `${key} must be true or false` });
      }
      settings[FEATURE_FLAG_FIELDS[key]] = req.body[key];
      touched = true;
    }
    if (!touched) return res.status(400).json({ success: false, message: 'No feature flag provided' });
    await settings.save();
    const flags = flagsFromSettings(settings);
    req.app.get('io')?.emit('feature-flags:update', flags);
    res.json({ success: true, flags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Public: GET /api/public/feature-flags
export const getPublicFeatureFlagsHandler = async (req, res) => {
  try {
    res.json({ success: true, flags: await getFeatureFlags() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
