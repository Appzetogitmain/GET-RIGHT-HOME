// controllers/sitemapController.js
//
// XML sitemap generated from live inventory.
//
// Served by the API (not a static file) so it always reflects what is actually
// published — a checked-in sitemap goes stale the moment a listing is added or
// sold, and pointing Google at dead URLs costs crawl budget.
//
// NOTE: a sitemap only tells Google which URLs exist. Whether those pages can
// be INDEXED still depends on them rendering server-side; the SPA currently
// serves an empty shell to crawlers. This is one half of the SEO work.

import Property from '../models/Property.js';

const SITE_URL = (process.env.FRONTEND_URL || 'https://www.getrighthome.com').replace(/\/$/, '');

// Sitemaps cap at 50k URLs / 50MB. Stay well under and page if it ever grows.
const MAX_URLS = 45000;

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const urlNode = ({ loc, lastmod, changefreq = 'weekly', priority = '0.7' }) => `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

// Hand-maintained entry points. Anything requiring a login is deliberately
// absent — it's also disallowed in robots.txt.
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/buy', priority: '0.9', changefreq: 'daily' },
  { path: '/rent-pg', priority: '0.9', changefreq: 'daily' },
  { path: '/plot', priority: '0.8', changefreq: 'daily' },
  { path: '/search', priority: '0.7', changefreq: 'daily' }
];

export const getSitemap = async (req, res) => {
  try {
    const properties = await Property.find({ status: 'approved', isLive: true })
      .select('_id slug updatedAt address.city propertyType')
      .sort({ updatedAt: -1 })
      .limit(MAX_URLS)
      .lean();

    const nodes = [];

    STATIC_ROUTES.forEach(({ path, priority, changefreq }) => {
      nodes.push(urlNode({ loc: `${SITE_URL}${path}`, priority, changefreq }));
    });

    properties.forEach((p) => {
      // Prefer the SEO slug; fall back to the id so a listing without one is
      // still discoverable rather than silently omitted.
      const path = p.slug ? `/property/${p.slug}` : `/property/${p._id}`;
      nodes.push(urlNode({ loc: `${SITE_URL}${path}`, lastmod: p.updatedAt, priority: '0.8' }));
    });

    // Category pages, but only for combinations that actually have inventory —
    // the spec is explicit about not generating thin/duplicate filter URLs.
    const combos = await Property.aggregate([
      { $match: { status: 'approved', isLive: true } },
      {
        $group: {
          _id: {
            city: { $toLower: { $trim: { input: { $ifNull: ['$address.city', ''] } } } },
            type: { $toLower: { $ifNull: ['$propertyType', ''] } }
          },
          count: { $sum: 1 }
        }
      },
      // A page with one listing is thin content; require a real cluster.
      { $match: { count: { $gte: 3 }, '_id.city': { $ne: '' }, '_id.type': { $ne: '' } } },
      { $sort: { count: -1 } },
      { $limit: 500 }
    ]);

    const slugify = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    combos.forEach(({ _id }) => {
      const city = slugify(_id.city);
      const type = slugify(_id.type);
      if (!city || !type) return;
      nodes.push(urlNode({
        loc: `${SITE_URL}/search?areas=${encodeURIComponent(_id.city)}&subType=${encodeURIComponent(_id.type)}`,
        priority: '0.6',
        changefreq: 'weekly'
      }));
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${nodes.join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e) {
    res.status(500).send(`<!-- sitemap error: ${escapeXml(e.message)} -->`);
  }
};
