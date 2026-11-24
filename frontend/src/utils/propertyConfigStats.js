// Builder/project listings store price and area per configuration row
// (dynamicData.villaConfigurations, unitConfigurations, plotConfigurations,
// floorPlans, ...) instead of a single top-level price. These helpers pull
// min/max price and area out of those rows so cards can show them.

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return NaN;
  return Number(String(v).replace(/,/g, ''));
};

// The backend mirrors dynamicData arrays onto the root document (e.g.
// dynamicData.villaConfigurations -> unitConfigurations), so read dynamicData
// first and only fall back to the root to avoid counting rows twice.
const collectRows = (item, keyRe) => {
  for (const src of [item.dynamicData, item]) {
    if (!src || typeof src !== 'object') continue;
    const rows = [];
    for (const [key, val] of Object.entries(src)) {
      if (!keyRe.test(key) || !Array.isArray(val)) continue;
      val.forEach((row) => {
        if (row && typeof row === 'object') rows.push(row);
      });
    }
    if (rows.length > 0) return rows;
  }
  return [];
};

// *Configurations arrays are the source of truth; floor plans often repeat the
// same units, so they are only used when no configuration rows exist.
const getConfigRows = (item) => {
  if (!item) return [];
  const configRows = collectRows(item, /configurations$/i);
  return configRows.length > 0 ? configRows : collectRows(item, /floorplans$/i);
};

const range = (values) => {
  const nums = values.map(toNum).filter((n) => !isNaN(n) && n > 0);
  if (nums.length === 0) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
};

// priceRange {min,max} is saved by the backend for project listings.
const savedPriceRange = (item) => range([item?.priceRange?.min, item?.priceRange?.max]);

export const getConfigStats = (item) => {
  const rows = getConfigRows(item);
  if (rows.length === 0) {
    return { price: savedPriceRange(item), area: null, areaLabel: null, areaUnit: null, types: [], count: 0 };
  }

  const prices = rows
    .map((r) => toNum(r.price ?? r.startingPrice ?? r.expectedPrice ?? r.minPrice ?? r.totalPrice))
    .filter((n) => !isNaN(n) && n > 0);
  const price = range(prices) || savedPriceRange(item);
  const areaUnit = rows.map((r) => r.areaUnit || r.unit).find(Boolean) || null;

  // Prefer the area type the configs actually fill in, in this order.
  const areaFields = [
    ['superArea', 'Super Built-up Area'],
    ['builtUpArea', 'Built-up Area'],
    ['carpetArea', 'Carpet Area'],
    ['plotArea', 'Plot Area'],
    ['area', 'Area'],
  ];
  let area = null;
  let areaLabel = null;
  for (const [field, label] of areaFields) {
    area = range(rows.map((r) => r[field]));
    if (area) {
      areaLabel = label;
      break;
    }
  }

  // count = configurations that carry a price (floor-plan image rows are excluded).
  // Unit types the lister entered per row ("2 BHK", "3 BHK", ...), de-duplicated.
  const types = [...new Set(
    rows.map((r) => String(r.villaType || r.unitType || r.bhkType || r.bhk || '').trim()).filter(Boolean)
  )];

  return { price, area, areaLabel, areaUnit, types, count: prices.length };
};
