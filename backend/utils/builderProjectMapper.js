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
// Require a camelCase word boundary right after the prefix (specStructure,
// not specialRequirement) so an unrelated field can't be swept in just for
// starting with the same four letters.
const SPEC_KEY_RE = /^spec[A-Z]/;

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
  const reraStatus = toStr(get('reraStatus'));
  const reraNumber = toStr(get('reraNumber')) || toStr(get('reraRegistrationNumber'));
  if (reraNumber) {
    mapped.reraNumber = reraNumber;
    mapped.reraVerified = get('reraVerified') === true || get('reraVerified') === 'Yes';
  }
  // Older submissions (pre-branching) never set reraStatus; infer it from the number instead.
  const inferredReraStatus = reraStatus || (reraNumber ? 'Registered' : undefined);
  if (inferredReraStatus) mapped.reraStatus = inferredReraStatus;

  // --- Step 2: Location Details ---
  // Promote the map pin into the 2dsphere-indexed field. GeoJSON is [lng, lat].
  const lat = toNum(get('latitude'));
  const lng = toNum(get('longitude'));
  if (lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    mapped.location = { type: 'Point', coordinates: [lng, lat] };
  }

  // --- Step 3: Project Summary ---
  // `towers` (repeater, current) supersedes the old flat totalTowers/totalFloors
  // fields (pre-v3 submissions); derive the same aggregate shape from either.
  const rawTowers = get('towers');
  const towers = Array.isArray(rawTowers)
    ? rawTowers
        .map(t => compact({
          towerName: toStr(t?.towerName),
          numberOfFloors: toNum(t?.numberOfFloors),
          totalUnits: toNum(t?.totalUnits)
        }))
        .filter(t => t.towerName)
    : [];

  const derivedTotalTowers = towers.length || toNum(get('totalTowers'));
  const derivedTotalFloors = towers.length
    ? Math.max(...towers.map(t => t.numberOfFloors || 0))
    : toNum(get('totalFloors'));

  // Each property type names its own headline count in Step 3. Fall back across
  // all of them (plus the legacy flat `totalUnits`) so one promoted field works
  // for every type.
  const derivedTotalUnits = towers.length
    ? towers.reduce((sum, t) => sum + (t.totalUnits || 0), 0)
    : (toNum(get('totalVillas'))
      ?? toNum(get('totalPlots'))
      ?? toNum(get('totalCommercialUnits'))
      ?? toNum(get('totalUnits')));

  const projectSummary = compact({
    totalLandArea: toNum(get('totalLandArea')) ?? toNum(get('totalLayoutArea')),
    totalTowers: derivedTotalTowers,
    totalFloors: derivedTotalFloors || undefined,
    totalUnits: derivedTotalUnits || undefined,
    totalPhases: toNum(get('totalPhases')) ?? toNum(get('plotPhases')),
    openSpacePercentage: toNum(get('openSpacePercentage')),
    clubHouseSize: toNum(get('clubHouseSize')),
    launchDate: toDate(get('launchDate')),
    possessionDate: toDate(get('possessionDate'))
  });
  if (towers.length) projectSummary.towers = towers;
  if (Object.keys(projectSummary).length) mapped.projectSummary = projectSummary;

  // --- Step 4: Unit Details & Pricing ---
  // Each property type / transaction model fills its own Step 4 repeater, since
  // their columns don't overlap cleanly (a plot has no BHK, a rental has no sale
  // price). They all normalise down onto the single promoted `unitConfigurations`
  // array so search and listing pages stay type-agnostic.
  //
  // Chosen by Step 1's propertyType + transactionType rather than by "whichever
  // array happens to be non-empty", so a stale draft from a previously-selected
  // property type can never win over the real inventory.
  const propertyType = toStr(get('propertyType'));
  const transactionType = toStr(get('transactionType'));
  const isRental = transactionType === 'Rent' || transactionType === 'Lease';
  const isPlotType = propertyType === 'Plot' || propertyType === 'Land';

  const asArray = (val) => (Array.isArray(val) ? val : []);

  // The repeater whose values are authoritative for this combination.
  let inventory = [];
  let priceKey = 'price';

  if (isPlotType) {
    inventory = asArray(get('plotConfigurations'))
      .map(p => compact({
        plotNumber: toStr(p?.plotNumber),
        unitType: toStr(p?.plotNumber) ? `Plot ${toStr(p.plotNumber)}` : undefined,
        length: toNum(p?.length),
        width: toNum(p?.width),
        carpetArea: toNum(p?.plotArea),
        areaUnit: toStr(p?.areaUnit) || 'sq.yards',
        facing: toStr(p?.facing),
        roadWidth: toNum(p?.roadWidth),
        isCornerPlot: toStr(p?.isCornerPlot),
        pricePerSqft: toNum(p?.pricePerSqft),
        premium: toNum(p?.premium),
        price: toNum(p?.price),
        status: toStr(p?.status)
      }))
      .filter(p => p.plotNumber || p.price !== undefined || p.carpetArea !== undefined);
  } else if (isRental) {
    priceKey = 'monthlyRent';
    inventory = asArray(get('rentalConfigurations'))
      .map(r => compact({
        unitType: toStr(r?.unitType),
        carpetArea: toNum(r?.carpetArea),
        superArea: toNum(r?.superArea),
        areaUnit: 'sq.ft.',
        furnishing: toStr(r?.furnishing),
        facing: toStr(r?.facing),
        monthlyRent: toNum(r?.monthlyRent),
        securityDeposit: toNum(r?.securityDeposit),
        maintenanceCharges: toNum(r?.maintenanceCharges),
        lockInPeriod: toNum(r?.lockInPeriod),
        availableFrom: toDate(r?.availableFrom),
        availableUnits: toNum(r?.availableUnits)
      }))
      .filter(r => r.unitType || r.monthlyRent !== undefined || r.carpetArea !== undefined);
  } else if (propertyType === 'Villa') {
    inventory = asArray(get('villaConfigurations'))
      .map(v => compact({
        villaType: toStr(v?.villaType),
        unitType: toStr(v?.villaType),
        villaNumber: toStr(v?.villaNumber),
        plotArea: toNum(v?.plotArea),
        builtUpArea: toNum(v?.builtUpArea),
        carpetArea: toNum(v?.carpetArea),
        numberOfFloors: toNum(v?.numberOfFloors),
        facing: toStr(v?.facing),
        price: toNum(v?.price),
        availableUnits: toNum(v?.availableUnits),
        status: toStr(v?.status)
      }))
      .filter(v => v.villaType || v.price !== undefined || v.plotArea !== undefined);
  } else if (propertyType === 'Commercial') {
    inventory = asArray(get('commercialConfigurations'))
      .map(c => compact({
        unitType: toStr(c?.unitType),
        unitNumber: toStr(c?.unitNumber),
        floorNumber: toNum(c?.floorNumber),
        carpetArea: toNum(c?.carpetArea),
        superArea: toNum(c?.superArea),
        areaUnit: toStr(c?.areaUnit) || 'sq.ft.',
        price: toNum(c?.price),
        pricePerSqft: toNum(c?.pricePerSqft),
        availableUnits: toNum(c?.availableUnits),
        status: toStr(c?.status)
      }))
      .filter(c => c.unitType || c.price !== undefined || c.carpetArea !== undefined);
  } else {
    // Apartment, and any pre-v4 submission that only ever wrote unitConfigurations.
    inventory = asArray(get('unitConfigurations'))
      .map(u => compact({
        towerName: toStr(u?.towerName),
        floorNumber: toNum(u?.floorNumber),
        plotNumber: toStr(u?.plotNumber),
        unitType: toStr(u?.unitType),
        carpetArea: toNum(u?.carpetArea),
        builtUpArea: toNum(u?.builtUpArea),
        superArea: toNum(u?.superArea),
        areaUnit: toStr(u?.areaUnit) || 'sq.ft.',
        price: toNum(u?.price),
        pricePerSqft: toNum(u?.pricePerSqft),
        totalUnits: toNum(u?.totalUnits),
        availableUnits: toNum(u?.availableUnits),
        facing: toStr(u?.facing),
        status: toStr(u?.status)
      }))
      .filter(u => u.unitType || u.price !== undefined || u.carpetArea !== undefined);
  }

  if (inventory.length) {
    mapped.unitConfigurations = inventory;

    const amounts = inventory
      .map(item => item[priceKey])
      .filter(p => typeof p === 'number' && p > 0);

    if (amounts.length) {
      const range = { min: Math.min(...amounts), max: Math.max(...amounts) };
      // Rentals are a monthly figure — keep them out of the sale priceRange that
      // buy-side search filters and "starting price" labels read from.
      if (isRental) mapped.rentRange = range;
      else mapped.priceRange = range;
    }
  }

  // --- Step 6: Specifications (every spec* key, minus the prefix) ---
  const specSource = typeof dynamicData?.get === 'function'
    ? Object.fromEntries(dynamicData)
    : (dynamicData || {});
  const specifications = {};
  Object.keys(specSource).forEach(key => {
    if (!SPEC_KEY_RE.test(key)) return;
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
  // Step 10 doesn't collect a single "currentConstructionStatus" field — it
  // branches entirely on Step 1's `projectStatus`, each branch with its own
  // field names. Derive the promoted enum from that instead.
  const projectStatus = toStr(get('projectStatus'));
  const PROJECT_STATUS_TO_CONSTRUCTION_STATUS = {
    'Pre Launch': 'Not Started',
    'New Launch': 'Not Started',
    'Under Construction': 'Under Construction',
    'Ready To Move': 'Completed',
    'Completed': 'Completed'
  };
  const derivedCurrentStatus = PROJECT_STATUS_TO_CONSTRUCTION_STATUS[projectStatus];

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

  // Each projectStatus branch names its own "expected possession" field;
  // fall back across all of them.
  const expectedPossession = get('expectedPossession') || get('expectedPossessionPL') || get('expectedPossessionNL');

  // `completionPercentage` only exists as a field on the "Under Construction"
  // branch — a Ready To Move / Completed project is 100% complete by definition.
  const completionPercentage = derivedCurrentStatus === 'Completed'
    ? 100
    : clampPercent(get('completionPercentage'));

  const constructionStatus = compact({
    // guard against an unmapped/free-typed value failing the schema enum
    currentStatus: CONSTRUCTION_STATUSES.includes(derivedCurrentStatus) ? derivedCurrentStatus : undefined,
    completionPercentage,
    expectedPossession: toDate(expectedPossession)
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
