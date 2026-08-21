// utils/searchSuggestions.js
//
// Builds portal-style autocomplete suggestions ("2 BHK Resale House in
// Hyderabad") from the inventory that actually exists, rather than from a
// generic places API. A suggestion is only offered when it leads to real
// results, so the user can never pick one and land on an empty page.

// City names are entered free-hand and arrive as "Indore", "INDORE " and
// "indore" — all the same place. Group on a normalised key and show the
// tidiest spelling.
export const normaliseCityKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const titleCaseCity = (value) => {
  const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  // Leave names that are already mixed-case alone (e.g. "Bengaluru North");
  // only fix the all-caps / all-lower entries.
  const isAllOneCase = cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase();
  if (!isAllOneCase) return cleaned;
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

// Property types are also free-text ("Plot / Land" vs "plot"). Map to a single
// display noun so one concept produces one suggestion.
const TYPE_DISPLAY = [
  { match: /independent house|villa/i, label: 'Villa' },
  { match: /plot|land/i, label: 'Plot' },
  { match: /apartment|flat/i, label: 'Apartment' },
  { match: /builder floor/i, label: 'Builder Floor' },
  { match: /studio/i, label: 'Studio Apartment' },
  { match: /farm ?house/i, label: 'Farmhouse' },
  { match: /co-?working/i, label: 'Co-working Space' },
  { match: /office/i, label: 'Office' },
  { match: /shop|retail|showroom/i, label: 'Retail Space' },
  { match: /ware ?house|storage/i, label: 'Warehouse' },
  { match: /hotel|resort/i, label: 'Hotel' },
  { match: /^pg$|hostel/i, label: 'PG' }
];

// Some listings have a transaction type saved into propertyType ("buy",
// "rent", "sell"). Those describe the deal, not the property, and produce
// nonsense suggestions like "Buy in Ashta" — drop them rather than surfacing
// bad data as a search entry point.
const NOT_A_PROPERTY_TYPE = /^(buy|sell|sale|rent|rent ?\/ ?lease|lease|other)$/i;

export const displayPropertyType = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (NOT_A_PROPERTY_TYPE.test(raw)) return '';
  const hit = TYPE_DISPLAY.find((t) => t.match.test(raw));
  if (hit) return hit.label;
  // Unknown but plausible type — title-case it rather than dropping it.
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

// "Under construction" / "Ready to move" / "Pre Launch" read better as the
// qualifiers buyers actually search for.
const AVAILABILITY_QUALIFIER = [
  { match: /ready to move/i, label: 'Ready to Move' },
  { match: /under construction/i, label: 'Under Construction' },
  { match: /pre ?launch|new launch/i, label: 'New Launch' }
];

export const displayAvailability = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return AVAILABILITY_QUALIFIER.find((a) => a.match.test(raw))?.label || '';
};

// BHK arrives as "2 BHK", "2BHK", "2 bhk" or bare "2" depending on the flow
// that saved it. One display form keeps identical configurations together.
export const displayBhk = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // `buyDetails.type` / `rentDetails.type` sometimes hold a PROPERTY type
  // rather than a configuration, which produced labels like "Apartment Under
  // Construction Apartment in Indore". Only accept values that actually read
  // as a configuration.
  // Capture the "+" so "4+BHK" stays an open-ended range rather than becoming
  // a literal "4 BHK".
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*(\+)?\s*(bhk|rk)?$/i);
  if (m) return `${m[1]}${m[2] || ''} ${(m[3] || 'BHK').toUpperCase()}`;

  if (/^studio$/i.test(raw)) return 'Studio';

  return '';
};

/**
 * Turns one aggregated inventory bucket into a suggestion.
 *
 * Shape mirrors what the search page already understands, so selecting a
 * suggestion is just a navigation — no extra parsing on the client.
 */
const buildSuggestion = ({ city, propertyType, availability, bhk, transactionType, count }) => {
  // Without a property type there's no noun to search for — "Ready to Move in
  // Indore" isn't a useful suggestion.
  if (!propertyType || !city) return null;

  const parts = [];
  if (bhk) parts.push(bhk);
  if (availability) parts.push(availability);
  parts.push(propertyType);

  const head = parts.join(' ').trim();

  const label = `${head} in ${city}`;

  const params = new URLSearchParams();
  params.set('areas', city);
  if (propertyType) params.set('subType', propertyType);
  if (availability) params.set('availability', availability);
  if (bhk) params.set('bhkType', bhk);
  if (transactionType) params.set('transactionType', transactionType);

  return { label, url: `/search?${params.toString()}`, count };
};

/**
 * Scores a suggestion against the raw typed text.
 *
 * Every token the user typed should appear somewhere in the label; the more
 * that match — and the earlier they match — the higher it ranks. Suggestions
 * that miss a token entirely are dropped, so typing "villa" never surfaces
 * "Apartment in Indore".
 */
const scoreSuggestion = (label, tokens) => {
  const haystack = label.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    const at = haystack.indexOf(token);
    if (at === -1) return -1; // a typed token isn't represented — not a match
    score += 10;
    if (at === 0) score += 5;                       // matches at the start
    if (new RegExp(`\\b${token}`).test(haystack)) score += 3; // word-boundary hit
  }
  return score;
};

/**
 * @param {Array} buckets aggregated inventory combinations
 * @param {string} query  raw text the user typed
 * @param {number} limit
 */
export const rankSuggestions = (buckets, query, limit = 12) => {
  const tokens = String(query || '')
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    // "2bhk" should match the "2 BHK" in a label, so split the digits out.
    .flatMap((t) => {
      const m = t.match(/^(\d+)\s*(bhk|rk)$/i);
      return m ? [m[1], m[2]] : [t];
    })
    .filter((t) => t.length > 0);

  const seen = new Set();
  const scored = [];

  for (const bucket of buckets) {
    const suggestion = buildSuggestion(bucket);
    if (!suggestion) continue;
    if (seen.has(suggestion.label)) continue;
    seen.add(suggestion.label);

    const score = tokens.length === 0 ? 0 : scoreSuggestion(suggestion.label, tokens);
    if (score < 0) continue;

    // Inventory depth breaks ties, so busier combinations surface first.
    scored.push({ ...suggestion, score: score + Math.min(bucket.count || 0, 5) });
  }

  scored.sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label));
  return scored.slice(0, limit).map(({ score, ...rest }) => rest);
};
