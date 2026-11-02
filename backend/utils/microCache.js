/**
 * Tiny in-memory GET cache for public, user-independent endpoints (catalog lists).
 * Every visitor used to trigger the same DB queries; now one request per 30s per
 * distinct query string does. Only 200 JSON responses are cached.
 */
export const microCache = (ttlMs = 30000, max = 200) => {
  const store = new Map();
  const middleware = (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json(hit.body);
    }
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && body?.success) {
        if (store.size >= max) store.delete(store.keys().next().value);
        store.set(key, { body, expires: Date.now() + ttlMs });
      }
      return json(body);
    };
    next();
  };
  middleware.clear = () => store.clear();
  return middleware;
};
