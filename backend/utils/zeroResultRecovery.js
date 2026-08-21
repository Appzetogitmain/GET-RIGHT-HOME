// utils/zeroResultRecovery.js
//
// "No properties found" is a dead end. When a search returns nothing, relax the
// applied filters ONE at a time and offer whichever relaxations actually have
// inventory behind them — each labelled so the user knows it's a broader match,
// not a pretend result for what they asked.

import Property from '../models/Property.js';

// Order matters: the constraints users are most willing to give up come first,
// so the top alternative is the smallest compromise.
const RELAXABLE = [
  { key: 'bhkType', label: (v) => `any configuration (not just ${v})` },
  { key: 'maxPrice', label: () => 'a higher budget' },
  { key: 'minPrice', label: () => 'a lower starting price' },
  { key: 'availability', label: (v) => `any possession status (not just ${v})` },
  { key: 'subType', label: (v) => `any property type (not just ${v})` },
  { key: 'furnishing', label: (v) => `any furnishing (not just ${v})` },
  { key: 'amenities', label: () => 'fewer amenities' },
  { key: 'areas', label: (v) => `anywhere (not just ${v})` }
];

const BASE_MATCH = { status: 'approved', isLive: true };

/**
 * Counts how many live properties a relaxed filter set would return.
 * Deliberately a coarse count over the promoted fields rather than a rerun of
 * the full search pipeline — this only needs to be good enough to decide
 * whether an alternative is worth offering.
 */
const countFor = async (filters) => {
  const query = { ...BASE_MATCH };

  if (filters.areas) {
    query['address.city'] = new RegExp(String(filters.areas).split(',')[0].trim(), 'i');
  }
  if (filters.subType) {
    query.propertyType = new RegExp(String(filters.subType).split(',')[0].trim(), 'i');
  }
  if (filters.transactionType) {
    query.transactionType = new RegExp(String(filters.transactionType), 'i');
  }

  try {
    return await Property.countDocuments(query).limit(200);
  } catch {
    return 0;
  }
};

/**
 * @param {object} appliedFilters the filters that produced zero results
 * @returns {Promise<Array<{label, url, count}>>} broader searches worth offering
 */
export const buildZeroResultAlternatives = async (appliedFilters = {}) => {
  const present = RELAXABLE.filter(({ key }) => {
    const v = appliedFilters[key];
    return v !== undefined && v !== null && v !== '';
  });

  // Nothing to relax — the catalogue simply has nothing at all for this.
  if (present.length === 0) return [];

  const alternatives = [];

  for (const { key, label } of present) {
    const relaxed = { ...appliedFilters };
    const dropped = relaxed[key];
    delete relaxed[key];

    const count = await countFor(relaxed);
    if (count <= 0) continue;

    const params = new URLSearchParams();
    Object.entries(relaxed).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, v);
    });

    alternatives.push({
      relaxed: key,
      label: `Try ${label(dropped)}`,
      url: `/search?${params.toString()}`,
      count
    });

    // Three options is a helpful nudge; more reads as a wall of guesses.
    if (alternatives.length >= 3) break;
  }

  return alternatives.sort((a, b) => b.count - a.count);
};
