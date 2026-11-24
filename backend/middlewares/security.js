// Security middleware shared by the whole API. No external dependencies.

/**
 * Strips MongoDB operator keys (`$ne`, `$gt`, `$where`, ...) from request bodies.
 * Without this, a JSON body like {"phone": {"$ne": null}} reaches
 * Model.findOne({ phone }) as a query operator and matches an arbitrary account.
 * (Express 5's default query parser does not build nested objects, so
 * req.query is already safe; only the JSON/urlencoded body needs cleaning.)
 */
const stripOperators = (value, depth = 0) => {
  if (depth > 20 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = stripOperators(value[i], depth + 1);
    return value;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) {
      delete value[key];
    } else {
      value[key] = stripOperators(value[key], depth + 1);
    }
  }
  return value;
};

export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') stripOperators(req.body);
  next();
};

/**
 * In production, never send internal error details (Mongo errors, stack
 * traces, file paths, third-party API messages) to the client on 5xx
 * responses. Many controllers do `res.status(500).json({ message: err.message })`;
 * this masks all of them in one place. The real error is still logged.
 */
export const hideServerErrors = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === 'object' && !Array.isArray(body)) {
      const safe = { ...body };
      if (safe.message || safe.error || safe.stack) {
        console.error(`[5xx] ${req.method} ${req.originalUrl}:`, safe.message || safe.error);
      }
      delete safe.error;
      delete safe.stack;
      delete safe.details;
      safe.message = 'Something went wrong. Please try again later.';
      return originalJson(safe);
    }
    return originalJson(body);
  };
  next();
};

/** Basic hardening headers (helmet-lite) for a JSON API. */
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
};

/**
 * Small in-memory fixed-window rate limiter. Per process — good enough for a
 * single-instance deployment; switch to a Redis-backed store if you scale out.
 *
 * keyFn lets a route limit by something other than IP (e.g. phone number),
 * which stops OTP brute force / SMS bombing spread across many IPs.
 */
export const rateLimit = ({ windowMs, max, message, keyFn, name = 'rl' }) => {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, Math.min(windowMs, 60_000));
  timer.unref?.();

  return (req, res, next) => {
    let key;
    try {
      key = keyFn ? keyFn(req) : null;
    } catch {
      key = null;
    }
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const fullKey = `${name}:${key ? String(key) : ip}`;
    const now = Date.now();
    let entry = hits.get(fullKey);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(fullKey, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.'
      });
    }
    next();
  };
};

const normalizePhone = (req) => {
  const p = req.body?.phone;
  return typeof p === 'string' || typeof p === 'number' ? String(p).replace(/\D/g, '').slice(-10) : null;
};

// Per-IP and per-phone limits for OTP endpoints.
export const otpSendLimiter = [
  rateLimit({ name: 'otp-send-ip', windowMs: 15 * 60_000, max: 20, message: 'Too many OTP requests. Please try again later.' }),
  rateLimit({ name: 'otp-send-phone', windowMs: 10 * 60_000, max: 5, keyFn: normalizePhone, message: 'Too many OTP requests for this number. Please try again after 10 minutes.' })
];

export const otpVerifyLimiter = [
  rateLimit({ name: 'otp-verify-ip', windowMs: 15 * 60_000, max: 30, message: 'Too many attempts. Please try again later.' }),
  rateLimit({ name: 'otp-verify-phone', windowMs: 10 * 60_000, max: 8, keyFn: normalizePhone, message: 'Too many incorrect attempts. Please request a new OTP after 10 minutes.' })
];

export const passwordLoginLimiter = [
  rateLimit({ name: 'pwd-login-ip', windowMs: 15 * 60_000, max: 20, message: 'Too many login attempts. Please try again later.' }),
  rateLimit({
    name: 'pwd-login-email',
    windowMs: 15 * 60_000,
    max: 10,
    keyFn: (req) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null),
    message: 'Too many login attempts for this account. Please try again later.'
  })
];

/**
 * Exact-match CORS origin check. The previous version used
 * origin.includes('getrighthome.com') and startsWith('http://10.'), which
 * also accepted attacker-controlled origins such as
 * https://getrighthome.com.evil.io or http://10.evil.io — and because
 * credentials are allowed, such a site could read logged-in users' data.
 */
const ALLOWED_ORIGINS = new Set([
  'https://rukkoo.in',
  'https://www.rukkoo.in',
  'https://rukkoo-project.vercel.app',
  'https://homezoo.vercel.app',
  'https://homezoo.onrender.com',
  'https://get-right-home.vercel.app',
  'https://get-right-home.onrender.com',
  'https://getrighthome.com',
  'https://www.getrighthome.com'
]);

const PRIVATE_IPV4 = /^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

export const isOriginAllowed = (origin) => {
  if (!origin) return true; // mobile apps, curl, server-to-server (no browser CORS involved)

  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (ALLOWED_ORIGINS.has(url.origin)) return true;

  // Extra origins can be supplied without a code change: CORS_EXTRA_ORIGINS=https://a.com,https://b.com
  const extra = (process.env.CORS_EXTRA_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (extra.includes(url.origin)) return true;

  // NOTE: no wildcard for *.vercel.app — anyone can create a Vercel project
  // named "get-right-home-whatever". Add preview URLs via CORS_EXTRA_ORIGINS.

  // Local development: localhost and real private-network IPs (parsed, not
  // prefix-matched), any port. Set CORS_DISABLE_LOCAL=true on the live server
  // to turn this off there.
  const allowLocal = process.env.CORS_DISABLE_LOCAL !== 'true';
  if (allowLocal && url.protocol === 'http:' && (url.hostname === 'localhost' || PRIVATE_IPV4.test(url.hostname))) {
    return true;
  }

  return false;
};
