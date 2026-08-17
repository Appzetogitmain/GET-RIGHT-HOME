// Lightweight natural-language search parser — turns a free-typed query like
// "2bhk room in indore under 60 lakhs" into structured filters (BHK, property
// type, transaction type, max price, location) instead of passing the whole
// sentence through as one opaque text-match string. Deliberately simple
// (regex/keyword based, no external NLP service) — it only needs to recognise
// the patterns people actually type into a property search box.

const TYPE_KEYWORDS = [
  [/\bvilla(s)?\b/i, 'Independent House / Villa'],
  [/\bindependent house\b/i, 'Independent House / Villa'],
  [/\bplot(s)?\b|\bland\b/i, 'Plot / Land'],
  [/\bstudio\b|\b1\s*rk\b/i, '1 RK / Studio Apartment'],
  [/\bfarmhouse\b/i, 'Farmhouse'],
  [/\boffice(s)?\b/i, 'Office'],
  [/\bshop(s)?\b|\bretail\b|\bshowroom\b/i, 'Retail'],
  [/\bwarehouse\b|\bstorage\b/i, 'Storage'],
  [/\bflat(s)?\b|\bapartment(s)?\b|\bhouse\b|\bhome(s)?\b|\broom(s)?\b/i, 'Apartment'],
];

const FILLER_WORDS = /\b(for|properties|property|near|around|under|below|above|upto|up to|in|at|a|an|the)\b/gi;

/**
 * @param {string} raw the raw text typed into the search box
 * @returns {{ bhk: string|null, subType: string|null, transactionType: string|null, maxPrice: number|null, gender: string|null, propertyCategory: string|null, location: string }}
 */
export function parseSearchQuery(raw) {
  const text = (raw || '').trim();
  const result = { bhk: null, subType: null, transactionType: null, maxPrice: null, gender: null, propertyCategory: null, location: text };
  if (!text) return result;

  let working = ` ${text.toLowerCase()} `;

  // Commercial/residential — otherwise "commercial" just leaks into the
  // location text (e.g. "commercial shops in indore" → location "commercial indore").
  if (/\bcommercial\b/.test(working)) {
    result.propertyCategory = 'Commercial';
    working = working.replace(/\bcommercial\b/g, ' ');
  } else if (/\bresidential\b/.test(working)) {
    result.propertyCategory = 'Residential';
    working = working.replace(/\bresidential\b/g, ' ');
  }

  // Gender modifier — mainly for PG/hostel searches ("PG for girls",
  // "boys hostel"); also keeps these words out of the location text.
  if (/\bgirls?\b|\bladies\b/.test(working)) {
    result.gender = 'Girls';
    working = working.replace(/\bgirls?\b|\bladies\b/g, ' ');
  } else if (/\bboys?\b|\bgents\b|\bmens\b/.test(working)) {
    result.gender = 'Boys';
    working = working.replace(/\bboys?\b|\bgents\b|\bmens\b/g, ' ');
  } else if (/\bco-?ed\b|\bunisex\b/.test(working)) {
    result.gender = 'Co-ed';
    working = working.replace(/\bco-?ed\b|\bunisex\b/g, ' ');
  }

  // BHK / bedroom count — "2bhk", "2 bhk", "2bk", "2 bed", "3bedrooms", "1rk"
  const bhkMatch = working.match(/\b(\d+)\s*[- ]?\s*(bhk|bk|beds?|bedrooms?|rk)\b/);
  if (bhkMatch) {
    const n = parseInt(bhkMatch[1], 10);
    if (n > 0) {
      result.bhk = n >= 4 ? '4+BHK' : `${n}BHK`;
      working = working.replace(bhkMatch[0], ' ');
    }
  }

  // Transaction type — an explicit signal in the text wins over whatever tab
  // happens to be selected, matching what the person actually typed.
  if (/\brent(al)?\b|\blease\b|\bfor rent\b/.test(working)) {
    result.transactionType = 'rent';
  } else if (/\bpg\b|\bhostel\b|\bpaying guest\b|\bco-?living\b/.test(working)) {
    result.transactionType = 'pg';
  } else if (/\bbuy\b|\bsale\b|\bfor sale\b|\bpurchase\b/.test(working)) {
    result.transactionType = 'buy';
  }
  working = working.replace(/\brent(al)?\b|\blease\b|\bfor rent\b|\bpg\b|\bhostel\b|\bpaying guest\b|\bco-?living\b|\bbuy\b|\bsale\b|\bfor sale\b|\bpurchase\b/g, ' ');

  // Price ceiling — "under 60 lakhs", "below 25 lakh", "under 1 cr", "upto 50L"
  const priceMatch = working.match(/\b(?:under|below|upto|up to|less than)\s*([\d.]+)\s*(lakhs?|lac|l|crores?|cr)\b/);
  if (priceMatch) {
    const num = parseFloat(priceMatch[1]);
    if (!isNaN(num)) {
      const isCrore = /cr/.test(priceMatch[2]);
      result.maxPrice = Math.round(num * (isCrore ? 10000000 : 100000));
    }
    working = working.replace(priceMatch[0], ' ');
  }

  // Property type — first match wins; "room"/"flat"/"apartment"/"house" all
  // read as a generic residential unit unless a more specific type matched.
  for (const [re, value] of TYPE_KEYWORDS) {
    if (re.test(working)) {
      result.subType = value;
      working = working.replace(re, ' ');
      break;
    }
  }

  // Whatever's left after stripping recognised signals and filler words is
  // the location — "in indore", "near whitefield" all collapse to "indore"/
  // "whitefield" once "in"/"near" themselves are stripped as filler.
  working = working.replace(FILLER_WORDS, ' ').replace(/\s+/g, ' ').trim();
  result.location = working;

  return result;
}
