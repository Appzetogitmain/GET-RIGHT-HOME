// utils/builderProjectMapper.js
//
// Maps the flat `dynamicData` produced by the 15-step Builder Property Listing
// wizard onto the promoted (queryable) Property schema fields.
//
// dynamicData remains the source of truth for every raw answer; this only lifts
// the fields we need to query, filter or build SEO URLs from.

const DOCUMENT_FIELDS = [
  { key: 'docReraCertificate', type: 'reraCertificate', name: 'RERA Certificate' },
  { key: 'docApprovalLetter', type: 'approvalLetter', name: 'Approval Letter' },
  { key: 'docBrochure', type: 'brochure', name: 'e-Brochure' },
  { key: 'docMasterPlan', type: 'masterPlan', name: 'Master Plan' },
  { key: 'docPriceSheet', type: 'priceSheet', name: 'Price Sheet' },
  { key: 'docOther', type: 'other', name: 'Other Document' }
];

const SPEC_PREFIX = 'spec';

const CONSTRUCTION_STATUSES = ['Not Started', 'Under Construction', 'Finishing Stage', 'Completed'];

// dynamicData may be a plain object (req.body) or a Mongoose Map (doc.dynamicData)
const reader = (dynamicData) => (key) => {
  if (!dynamicData) return undefined;
  if (typeof dynamicData.get === 'function') return dynamicData.get(key);
  return dynamicData[key];
};

const toNum = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(String(val).replace(/,/g, ''));
  return Number.isNaN(num) ? undefined : num;
};

const toDate = (val) => {
  if (!val) return undefined;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const toStr = (val) => {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s === '' ? undefined : s;
};

const clampPercent = (val) => {
  const num = toNum(val);
  if (num === undefined) return undefined;
  return Math.max(0, Math.min(100, num));
};

// Strip undefined keys so we never overwrite existing values with undefined
const compact = (obj) => {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
};

export const slugify = (str) =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')   // strip combining accent marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

/**
 * Builds a slug that is unique across the Property collection.
 * Appends -2, -3, ... on collision.
 *
 * @param {import('mongoose').Model} PropertyModel
 * @param {string} desiredSlug  preferred slug (may be empty)
 * @param {string[]} fallbackParts  used to build a slug when desiredSlug is empty
 * @param {string|null} excludeId  property id to ignore (for updates)
 */
export const generateUniqueSlug = async (PropertyModel, desiredSlug, fallbackParts = [], excludeId = null) => {
  const base = slugify(desiredSlug) || slugify(fallbackParts.filter(Boolean).join(' '));
  if (!base) return undefined;

  let candidate = base;
  let suffix = 1;

  // Bounded so a pathological collision run can never spin forever
  while (suffix < 100) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const clash = await PropertyModel.exists(query);
    if (!clash) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
};

/**
 * Maps wizard dynamicData onto promoted Property fields.
 * Returns only the keys it could actually derive.
 */
export const mapBuilderProjectFields = (dynamicData) => {
  const get = reader(dynamicData);
  const mapped = {};

  // --- Step 1: Project Information ---
  const reraNumber = toStr(get('reraNumber')) || toStr(get('reraRegistrationNumber'));
  if (reraNumber) {
    mapped.reraNumber = reraNumber;
    mapped.reraVerified = get('reraVerified') === true || get('reraVerified') === 'Yes';
  }

  // --- Step 2: Location Details ---
  // Promote the map pin into the 2dsphere-indexed field. GeoJSON is [lng, lat].
  const lat = toNum(get('latitude'));
  const lng = toNum(get('longitude'));
  if (lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    mapped.location = { type: 'Point', coordinates: [lng, lat] };
  }

  // --- Step 3: Project Summary ---
  const projectSummary = compact({
    totalLandArea: toNum(get('totalLandArea')),
    totalTowers: toNum(get('totalTowers')),
    totalFloors: toNum(get('totalFloors')),
    totalUnits: toNum(get('totalUnits')),
    openSpacePercentage: toNum(get('openSpacePercentage')),
    clubHouseSize: toNum(get('clubHouseSize')),
    launchDate: toDate(get('launchDate')),
    possessionDate: toDate(get('possessionDate'))
  });
  if (Object.keys(projectSummary).length) mapped.projectSummary = projectSummary;

  // --- Step 4: Unit Details & Pricing ---
  const rawUnits = get('unitConfigurations');
  if (Array.isArray(rawUnits)) {
    const units = rawUnits
      .map(u => compact({
        unitType: toStr(u?.unitType),
        carpetArea: toNum(u?.carpetArea),
        superArea: toNum(u?.superArea),
        areaUnit: toStr(u?.areaUnit) || 'sq.ft.',
        price: toNum(u?.price),
        pricePerSqft: toNum(u?.pricePerSqft),
        availableUnits: toNum(u?.availableUnits),
        facing: toStr(u?.facing)
      }))
      // drop rows the user added but never filled in
      .filter(u => u.unitType || u.price !== undefined || u.carpetArea !== undefined);

    mapped.unitConfigurations = units;

    const prices = units.map(u => u.price).filter(p => typeof p === 'number' && p > 0);
    if (prices.length) {
      mapped.priceRange = { min: Math.min(...prices), max: Math.max(...prices) };
    }
  }

  // --- Step 6: Specifications (every spec* key, minus the prefix) ---
  const specSource = typeof dynamicData?.get === 'function'
    ? Object.fromEntries(dynamicData)
    : (dynamicData || {});
  const specifications = {};
  Object.keys(specSource).forEach(key => {
    if (!key.startsWith(SPEC_PREFIX) || key.length === SPEC_PREFIX.length) return;
    const value = toStr(specSource[key]);
    if (value === undefined) return;
    // specStructure -> structure
    const label = key.slice(SPEC_PREFIX.length);
    specifications[label.charAt(0).toLowerCase() + label.slice(1)] = value;
  });
  if (Object.keys(specifications).length) mapped.specifications = specifications;

  // --- Step 9: Documents ---
  const documents = DOCUMENT_FIELDS
    .map(({ key, type, name }) => {
      const fileUrl = toStr(get(key));
      return fileUrl ? { type, name, fileUrl } : null;
    })
    .filter(Boolean);
  if (documents.length) mapped.projectDocuments = documents;

  // --- Step 10: Construction Status ---
  const rawStatus = toStr(get('currentConstructionStatus'));
  const rawProgress = get('constructionProgress');
  const progress = rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress)
    ? Object.entries(rawProgress)
        .map(([stage, percentage]) => ({ stage, percentage: clampPercent(percentage) }))
        .filter(p => p.percentage !== undefined)
    : (Array.isArray(rawProgress)
        ? rawProgress
            .map(p => ({ stage: toStr(p?.stage), percentage: clampPercent(p?.percentage) }))
            .filter(p => p.stage && p.percentage !== undefined)
        : []);

  const constructionStatus = compact({
    // guard against a free-typed value failing the schema enum
    currentStatus: CONSTRUCTION_STATUSES.includes(rawStatus) ? rawStatus : undefined,
    completionPercentage: clampPercent(get('completionPercentage')),
    expectedPossession: toDate(get('expectedPossession'))
  });
  if (progress.length) constructionStatus.progress = progress;
  if (Object.keys(constructionStatus).length) mapped.constructionStatus = constructionStatus;

  // --- Step 12: Builder Profile ---
  const builderProfile = compact({
    companyName: toStr(get('builderCompanyName')) || toStr(get('builderName')),
    establishedYear: toNum(get('builderEstablishedYear')),
    companyType: toStr(get('builderCompanyType')),
    totalProjects: toNum(get('builderTotalProjects')),
    logo: toStr(get('builderLogo')),
    officeAddress: toStr(get('builderOfficeAddress')),
    workingHours: toStr(get('builderWorkingHours')),
    about: toStr(get('builderAbout'))
  });
  if (Object.keys(builderProfile).length) mapped.builderProfile = builderProfile;

  // --- Step 13: Contact Details ---
  const social = compact({
    facebook: toStr(get('socialFacebook')),
    instagram: toStr(get('socialInstagram')),
    linkedin: toStr(get('socialLinkedin')),
    youtube: toStr(get('socialYoutube'))
  });
  const contactDetails = compact({
    contactPerson: toStr(get('contactPerson')),
    mobile: toStr(get('contactNumber')),
    altMobile: toStr(get('contactAltNumber')),
    email: toStr(get('contactEmail')),
    officeAddress: toStr(get('contactOfficeAddress')),
    website: toStr(get('contactWebsite'))
  });
  if (Object.keys(social).length) contactDetails.social = social;
  if (Object.keys(contactDetails).length) mapped.contactDetails = contactDetails;

  // --- Step 14: SEO Details ---
  const rawKeywords = get('seoKeywords');
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.map(toStr).filter(Boolean)
    : (toStr(rawKeywords) ? toStr(rawKeywords).split(',').map(s => s.trim()).filter(Boolean) : []);

  const seo = compact({
    metaTitle: toStr(get('seoTitle')),
    metaDescription: toStr(get('seoDescription'))
  });
  if (keywords.length) seo.keywords = keywords;
  if (Object.keys(seo).length) mapped.seo = seo;

  return mapped;
};

export const BUILDER_DOCUMENT_FIELDS = DOCUMENT_FIELDS;
