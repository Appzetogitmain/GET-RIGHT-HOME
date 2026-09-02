// utils/seoSlugBackfill.js
//
// Every Property/Project created before the slug field existed has no slug —
// sparse+unique means that's valid (many nulls are fine), but it also means
// those old listings would keep serving the ugly /project/<objectid> URL
// forever unless something backfills them once.
//
// Idempotent: only touches documents where slug is missing, so it's safe to
// run on every boot.

import Property from '../models/Property.js';
import Project from '../models/Project.js';
import { buildSeoSlug } from './seoSlug.js';

const backfillCollection = async (Model, label) => {
    const missing = await Model.find({ slug: { $exists: false } })
        .select('_id propertyName address')
        .limit(5000); // one pass per boot is plenty; catches the rest next time

    let updated = 0;
    for (const doc of missing) {
        try {
            await Model.updateOne({ _id: doc._id }, { $set: { slug: buildSeoSlug(doc) } });
            updated += 1;
        } catch (err) {
            // A slug collision here is practically impossible (the suffix is
            // derived from the doc's own unique _id) — but never let one bad
            // row stop the rest of the backfill.
            console.error(`[SlugBackfill] failed for ${label} ${doc._id}:`, err.message);
        }
    }
    return updated;
};

export const backfillSeoSlugs = async () => {
    try {
        const properties = await backfillCollection(Property, 'property');
        const projects = await backfillCollection(Project, 'project');
        if (properties || projects) {
            console.log(`[SlugBackfill] generated ${properties} property slug(s), ${projects} project slug(s)`);
        }
        return { properties, projects };
    } catch (err) {
        console.error('[SlugBackfill] failed:', err.message);
        return { properties: 0, projects: 0, error: err.message };
    }
};

export default backfillSeoSlugs;
