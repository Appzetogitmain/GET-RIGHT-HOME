/**
 * Splits free-text search input ("2 bhk", "3BHK Flats in Bengaluru South",
 * "Farm house in Bengaluru") into real filters + leftover place names, so the
 * backend filters by bedrooms / type instead of looking for "2 bhk" in addresses.
 *
 * Returns { places: string[], bhks: string[], subTypes: string[], transactionType?: string }
 */

const FILLER = new Set(['in', 'for', 'at', 'near', 'a', 'the', 'flat', 'flats', 'apartments', 'house', 'houses', 'girls', 'boys', 'men', 'women']);

const BHK_RE = /(\d)\s*(\+)?\s*(?:bhk|rk)\b/gi;

const TYPE_RULES = [
  { re: /\bfarm\s*-?\s*house(s)?\b/i, subType: 'Farmhouse' },
  { re: /\bvilla(s)?\b/i, subType: 'Independent House / Villa' },
  { re: /\b(apartment|flat)(s)?\b/i, subType: 'Apartment' },
  { re: /\bbuilder\s*floor\b/i, subType: 'Builder Floor' },
  { re: /\bplot(s)?\b/i, subType: 'Plot / Land' }
];

const TXN_RULES = [
  { re: /\b(rent|rental|lease)\b/i, value: 'rent' },
  { re: /\bpg\b/i, value: 'pg' }
];

export const parseSearchText = (input) => {
  let rest = String(input || '');
  const bhks = [];
  const subTypes = [];
  let transactionType;

  rest = rest.replace(BHK_RE, (_, n, plus) => {
    const v = `${n}${plus ? '+' : ''}BHK`;
    if (!bhks.includes(v)) bhks.push(v);
    return ' ';
  });

  TYPE_RULES.forEach(({ re, subType }) => {
    if (re.test(rest)) {
      if (!subTypes.includes(subType)) subTypes.push(subType);
      rest = rest.replace(re, ' ');
    }
  });

  TXN_RULES.forEach(({ re, value }) => {
    if (!transactionType && re.test(rest)) {
      transactionType = value;
      rest = rest.replace(re, ' ');
    }
  });

  const place = rest
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w.toLowerCase()))
    .join(' ')
    .trim();

  return { places: place ? [place] : [], bhks, subTypes, transactionType };
};

export default parseSearchText;
