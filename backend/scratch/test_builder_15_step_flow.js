/**
 * Verification script for the 15-step Builder Property Listing flow.
 *
 *   node scratch/test_builder_15_step_flow.js
 *
 * Covers:
 *   A. Template seeding    - 15 steps, correct titles/order, version bump, re-seed of stale docs
 *   B. Step content        - required fields, field types, location-selector flag, type-awareness
 *   C. dynamicData mapping - promotion onto queryable Property fields
 *   D. Persistence         - a full submission round-trips through Mongo
 *   E. Slug uniqueness     - collisions get suffixed, edits keep the slug stable
 *
 * Creates temporary Property docs prefixed with the marker below and deletes
 * them at the end (including on failure).
 */

import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';

import BuilderFormTemplate from '../models/BuilderFormTemplate.js';
import Property from '../models/Property.js';
import {
  ensureSeeded,
  BUILDER_TEMPLATE_VERSION
} from '../controllers/builderFormController.js';
import {
  createBuilderSteps,
  CONSTRUCTION_STAGES
} from '../config/builderProjectSteps.js';
import {
  mapBuilderProjectFields,
  generateUniqueSlug,
  slugify
} from '../utils/builderProjectMapper.js';

const TEST_MARKER = '__ZZTEST_BUILDER_FLOW__';

const EXPECTED_TITLES = [
  'Project Information',
  'Location Details',
  'Project Summary',
  'Unit Details & Pricing',
  'Amenities',
  'Specifications',
  'Images & Gallery',
  'Floor Plans',
  'Documents',
  'Construction Status',
  'Location Advantages',
  'Builder Profile',
  'Contact Details',
  'SEO Details',
  'Review & Submit'
];

// --- tiny assertion harness ------------------------------------------------

let passed = 0;
const failures = [];

const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, message: err.message });
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
};

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const eq = (actual, expected, label) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
};

// --- the realistic payload the wizard would POST ---------------------------
// Mirrors the reference design (Sujay Global Elara, Nallagandla, Hyderabad).

const buildWizardDynamicData = (overrides = {}) => ({
  // Step 1
  propertyName: 'Sujay Global Elara',
  builderName: 'Sujay Constructions',
  projectStatus: 'Under Construction',
  reraNumber: 'P02400008905',
  reraVerified: true,
  possessionDate: '2026-12-01',
  description: 'A premium residential project in Nallagandla, Hyderabad offering 2, 3 and 4 BHK apartments with modern amenities and thoughtfully designed open spaces across 5.20 acres.',
  coverImage: 'https://cdn.example.com/elara/cover.jpg',
  logo: 'https://cdn.example.com/elara/logo.png',

  // Step 2
  country: 'India',
  state: 'Telangana',
  district: 'Hyderabad',
  city: 'Hyderabad',
  locality: 'Nallagandla',
  landmark: 'Near Nallagandla Tellapur Road',
  pincode: '500019',
  latitude: '17.5024',
  longitude: '78.3067',
  fullAddress: 'Sujay Global Elara, Nallagandla, Hyderabad, Telangana 500019',

  // Step 3
  totalLandArea: '5.20',
  totalTowers: '5',
  totalFloors: '14',
  totalUnits: '550',
  openSpacePercentage: '80',
  clubHouseSize: '25000',
  launchDate: '2024-01-15',

  // Step 4
  unitConfigurations: [
    { unitType: '2 BHK', carpetArea: '1250', superArea: '1600', areaUnit: 'sq.ft.', price: '6800000', pricePerSqft: '5440', availableUnits: '280', facing: 'East' },
    { unitType: '3 BHK', carpetArea: '1650', superArea: '2100', areaUnit: 'sq.ft.', price: '9200000', pricePerSqft: '5575', availableUnits: '180', facing: 'North' },
    { unitType: '4 BHK', carpetArea: '2200', superArea: '2800', areaUnit: 'sq.ft.', price: '13500000', pricePerSqft: '6136', availableUnits: '60' },
    // a blank row the user added and abandoned - must be dropped
    { unitType: '', carpetArea: '', price: '' }
  ],
  positionFacingRates: [
    { position: 'Corner', additionalRate: '150' },
    { position: 'Park Facing', additionalRate: '125' }
  ],

  // Step 5
  amenities: ['Swimming Pool', 'Club House', 'Gym', 'Power Backup', "Children's Play Area", 'CCTV Surveillance', 'Rain Water Harvesting', 'EV Charging Point'],
  highlights: ['Gated Community', 'Metro Connectivity'],

  // Step 6
  specStructure: 'RCC Framed Structure',
  specWalls: 'Red Brick',
  specFlooring: 'Vitrified Tiles',
  specKitchen: 'Modular Kitchen',
  specDoors: 'Teak Wood Frame',
  specWindows: 'UPVC',
  specPaint: 'Acrylic Emulsion',
  specElectrical: 'Concealed Copper Wiring',
  specWaterSupply: 'Borewell',
  specToiletFittings: '   ', // whitespace only - must be ignored

  // Step 7
  propertyImages: ['https://cdn.example.com/elara/g1.jpg', 'https://cdn.example.com/elara/g2.jpg'],
  constructionImages: ['https://cdn.example.com/elara/c1.jpg'],

  // Step 8
  floorPlans: [
    { configName: '2 BHK', carpetArea: '1250', price: '6800000', floorPlanImage: 'https://cdn.example.com/elara/fp2.jpg', roomDimensions: [{ roomName: 'Master Bedroom', dimensions: "14'0\" x 12'0\"" }] }
  ],

  // Step 9
  docReraCertificate: 'https://cdn.example.com/elara/rera.pdf',
  docApprovalLetter: 'https://cdn.example.com/elara/approval.pdf',
  docBrochure: 'https://cdn.example.com/elara/brochure.pdf',
  docMasterPlan: '',            // not uploaded - must be skipped

  // Step 10
  currentConstructionStatus: 'Under Construction',
  completionPercentage: 60,
  expectedPossession: '2026-12-01',
  constructionProgress: { Foundation: 100, Structure: 80, 'Brick Work': 65, Plastering: 40, Flooring: 10, Painting: 0 },

  // Step 11
  nearbyPlaces: [
    { name: 'Rajiv Gandhi International Airport', type: 'Airport', distanceKm: 15 },
    { name: 'Lingampally Railway Station', type: 'Railway Station', distanceKm: 8 },
    { name: 'Apollo Hospital', type: 'Hospital', distanceKm: 1 }
  ],

  // Step 12
  builderCompanyName: 'Sujay Constructions',
  builderEstablishedYear: '2010',
  builderCompanyType: 'Private Limited',
  builderTotalProjects: '18',
  builderLogo: 'https://cdn.example.com/elara/builder-logo.png',
  builderOfficeAddress: 'Nallagandla, Hyderabad, Telangana 500019',
  builderWorkingHours: '10:00 AM - 7:00 PM',
  builderAbout: 'Sujay Constructions is a trusted real estate brand delivering quality residential and commercial projects.',

  // Step 13
  contactPerson: 'Ramesh Kumar',
  contactNumber: '9876543210',
  contactAltNumber: '9876543211',
  contactEmail: 'sales@sujayconstructions.com',
  contactWebsite: 'https://sujayconstructions.com',
  socialFacebook: 'https://facebook.com/sujayconstructions',
  socialInstagram: 'https://instagram.com/sujayconstructions',

  // Step 14
  seoTitle: 'Sujay Global Elara - 2, 3 & 4 BHK Apartments in Nallagandla',
  seoDescription: 'Buy premium 2, 3 & 4 BHK apartments at Sujay Global Elara, Nallagandla, Hyderabad. RERA approved, ready by Dec 2026.',
  seoKeywords: ['apartments in hyderabad', 'flats in nallagandla', '3 bhk apartments'],
  seoSlug: 'sujay-global-elara-nallagandla-hyderabad',

  ...overrides
});

// --- test sections ---------------------------------------------------------

const testTemplateSeeding = async () => {
  console.log('\nA. Template seeding');

  // Simulate a database still holding the previous 7-step templates
  await BuilderFormTemplate.deleteMany({});
  await BuilderFormTemplate.create({
    transactionType: 'Sell',
    category: 'Residential',
    propertyType: 'Apartment',
    version: 1,
    steps: [{ stepNumber: 1, title: 'Legacy Step', fields: [] }]
  });

  await ensureSeeded();

  const apartment = await BuilderFormTemplate.findOne({
    transactionType: 'Sell', category: 'Residential', propertyType: 'Apartment'
  });

  check('stale v1 template is re-seeded to the current version', () => {
    assert(apartment, 'Apartment template missing after ensureSeeded()');
    eq(apartment.version, BUILDER_TEMPLATE_VERSION, 'version');
  });

  check('seeded template has exactly 15 steps', () => {
    eq(apartment.steps.length, 15, 'step count');
  });

  check('step titles match the wizard in order', () => {
    eq(apartment.steps.map(s => s.title), EXPECTED_TITLES, 'titles');
  });

  check('stepNumbers are 1..15 in order', () => {
    eq(apartment.steps.map(s => s.stepNumber), Array.from({ length: 15 }, (_, i) => i + 1), 'stepNumbers');
  });

  const all = await BuilderFormTemplate.find({});
  check(`all ${all.length} seeded templates have 15 steps and the same titles`, () => {
    assert(all.length > 10, `expected many templates, got ${all.length}`);
    all.forEach(t => {
      eq(t.steps.length, 15, `${t.category}/${t.propertyType} step count`);
      eq(t.steps.map(s => s.title), EXPECTED_TITLES, `${t.category}/${t.propertyType} titles`);
      eq(t.version, BUILDER_TEMPLATE_VERSION, `${t.category}/${t.propertyType} version`);
    });
  });

  const beforeIds = (await BuilderFormTemplate.find({}).select('_id').lean()).map(d => String(d._id)).sort();
  await ensureSeeded();
  const afterIds = (await BuilderFormTemplate.find({}).select('_id').lean()).map(d => String(d._id)).sort();
  check('second ensureSeeded() call does not re-create documents', () => {
    eq(afterIds, beforeIds, 'template _ids after idempotent re-run');
  });

  return apartment;
};

const testStepContent = (apartment) => {
  console.log('\nB. Step content');

  const byTitle = (title) => apartment.steps.find(s => s.title === title);
  const names = (title) => byTitle(title).fields.map(f => f.name);

  check('Step 2 is flagged to render the location selector', () => {
    eq(byTitle('Location Details').showLocationSelector, true, 'Location Details flag');
  });

  check('Step 11 does NOT render the location selector (regression guard)', () => {
    eq(byTitle('Location Advantages').showLocationSelector, false, 'Location Advantages flag');
  });

  check('Step 1 collects project name, builder, RERA, status and description', () => {
    const f = names('Project Information');
    ['propertyName', 'builderName', 'projectStatus', 'reraNumber', 'description'].forEach(n =>
      assert(f.includes(n), `Step 1 missing field "${n}" (has: ${f.join(', ')})`)
    );
  });

  check('propertyName / description / amenities keep the names the API expects', () => {
    // createProperty falls back to dynamicData for these exact keys
    assert(names('Project Information').includes('propertyName'), 'propertyName missing');
    assert(names('Project Information').includes('description'), 'description missing');
    assert(names('Amenities').includes('amenities'), 'amenities missing');
    assert(names('Images & Gallery').includes('propertyImages'), 'propertyImages missing');
    assert(names('Location Advantages').includes('nearbyPlaces'), 'nearbyPlaces missing');
    assert(names('Contact Details').includes('contactNumber'), 'contactNumber missing');
  });

  check('Step 4 unit pricing is a repeater with priced sub-fields', () => {
    const unit = byTitle('Unit Details & Pricing').fields.find(f => f.name === 'unitConfigurations');
    eq(unit.type, 'repeater', 'unitConfigurations type');
    const subs = unit.subFields.map(s => s.name);
    ['unitType', 'carpetArea', 'price', 'availableUnits'].forEach(n =>
      assert(subs.includes(n), `unitConfigurations missing sub-field "${n}"`)
    );
  });

  check('Step 9 documents are single_file slots', () => {
    const docs = byTitle('Documents').fields;
    assert(docs.length >= 5, `expected >=5 document slots, got ${docs.length}`);
    docs.forEach(d => eq(d.type, 'single_file', `${d.name} type`));
  });

  check('Step 10 uses slider + progress_group with the 6 build stages', () => {
    const fields = byTitle('Construction Status').fields;
    eq(fields.find(f => f.name === 'completionPercentage').type, 'slider', 'completionPercentage type');
    const pg = fields.find(f => f.name === 'constructionProgress');
    eq(pg.type, 'progress_group', 'constructionProgress type');
    eq(pg.options, CONSTRUCTION_STAGES, 'construction stages');
  });

  check('Step 15 is a single review field', () => {
    const fields = byTitle('Review & Submit').fields;
    eq(fields.length, 1, 'review step field count');
    eq(fields[0].type, 'review', 'review field type');
  });

  check('every field type used is one the form engine can render', () => {
    const RENDERABLE = new Set([
      'text', 'number', 'textarea', 'date', 'dropdown', 'pill', 'multiselect_pill',
      'checkbox_group', 'file', 'single_file', 'slider', 'progress_group',
      'nearby_places', 'repeater', 'review'
    ]);
    apartment.steps.forEach(step => {
      step.fields.forEach(f => {
        assert(RENDERABLE.has(f.type), `Step "${step.title}" field "${f.name}" has unrenderable type "${f.type}"`);
        (f.subFields || []).forEach(sub => {
          assert(RENDERABLE.has(sub.type), `Sub-field "${f.name}.${sub.name}" has unrenderable type "${sub.type}"`);
        });
      });
    });
  });

  check('field names are unique within every step', () => {
    apartment.steps.forEach(step => {
      const seen = new Set();
      step.fields.forEach(f => {
        assert(!seen.has(f.name), `Step "${step.title}" has duplicate field name "${f.name}"`);
        seen.add(f.name);
      });
    });
  });

  // Type-awareness: same 15 steps, different fields where it matters
  const plot = createBuilderSteps('Residential', 'Plot / Land');
  const office = createBuilderSteps('Commercial', 'Ready to move office space');

  check('plot + commercial variants keep the identical 15-step skeleton', () => {
    eq(plot.map(s => s.title), EXPECTED_TITLES, 'plot titles');
    eq(office.map(s => s.title), EXPECTED_TITLES, 'office titles');
  });

  check('plot variant drops tower/floor fields from Project Summary', () => {
    const plotSummary = plot[2].fields.map(f => f.name);
    assert(!plotSummary.includes('totalTowers'), 'plot summary should not ask for totalTowers');
    assert(!plotSummary.includes('totalFloors'), 'plot summary should not ask for totalFloors');
    assert(plotSummary.includes('totalUnits'), 'plot summary should still ask for total plots');
  });

  check('plot variant swaps in land specifications', () => {
    const plotSpecs = plot[5].fields.map(f => f.name);
    assert(plotSpecs.includes('specBoundaryWall'), 'plot specs should include boundary wall');
    assert(!plotSpecs.includes('specKitchen'), 'plot specs should not include kitchen');
  });
};

const testMapping = () => {
  console.log('\nC. dynamicData -> promoted field mapping');

  const dd = buildWizardDynamicData();
  const mapped = mapBuilderProjectFields(dd);

  check('RERA number and verification flag are promoted', () => {
    eq(mapped.reraNumber, 'P02400008905', 'reraNumber');
    eq(mapped.reraVerified, true, 'reraVerified');
  });

  check('project summary numbers are coerced from form strings', () => {
    eq(mapped.projectSummary.totalLandArea, 5.2, 'totalLandArea');
    eq(mapped.projectSummary.totalTowers, 5, 'totalTowers');
    eq(mapped.projectSummary.totalUnits, 550, 'totalUnits');
    assert(mapped.projectSummary.launchDate instanceof Date, 'launchDate should be a Date');
  });

  check('blank repeater rows are dropped from unitConfigurations', () => {
    eq(mapped.unitConfigurations.length, 3, 'unit count (blank row should be dropped)');
    eq(mapped.unitConfigurations.map(u => u.unitType), ['2 BHK', '3 BHK', '4 BHK'], 'unit types');
    eq(mapped.unitConfigurations[0].price, 6800000, 'first unit price');
    eq(mapped.unitConfigurations[0].carpetArea, 1250, 'first unit carpet area');
  });

  check('priceRange is derived from the unit prices', () => {
    eq(mapped.priceRange, { min: 6800000, max: 13500000 }, 'priceRange');
  });

  check('spec* keys are promoted with the prefix stripped', () => {
    eq(mapped.specifications.structure, 'RCC Framed Structure', 'structure');
    eq(mapped.specifications.waterSupply, 'Borewell', 'waterSupply');
    assert(!('toiletFittings' in mapped.specifications), 'whitespace-only spec should be ignored');
  });

  check('only uploaded documents are promoted', () => {
    eq(mapped.projectDocuments.length, 3, 'document count');
    eq(mapped.projectDocuments.map(d => d.type), ['reraCertificate', 'approvalLetter', 'brochure'], 'document types');
    assert(!mapped.projectDocuments.some(d => d.type === 'masterPlan'), 'empty masterPlan should be skipped');
  });

  check('construction progress object becomes a stage/percentage array', () => {
    eq(mapped.constructionStatus.currentStatus, 'Under Construction', 'currentStatus');
    eq(mapped.constructionStatus.completionPercentage, 60, 'completionPercentage');
    eq(mapped.constructionStatus.progress.length, 6, 'progress stage count');
    eq(mapped.constructionStatus.progress[0], { stage: 'Foundation', percentage: 100 }, 'first stage');
  });

  check('out-of-range percentages are clamped to 0-100', () => {
    const m = mapBuilderProjectFields(buildWizardDynamicData({
      completionPercentage: 250,
      constructionProgress: { Foundation: -40 }
    }));
    eq(m.constructionStatus.completionPercentage, 100, 'clamped high');
    eq(m.constructionStatus.progress[0].percentage, 0, 'clamped low');
  });

  check('a free-typed construction status is rejected rather than failing the enum', () => {
    const m = mapBuilderProjectFields(buildWizardDynamicData({ currentConstructionStatus: 'Almost done' }));
    assert(m.constructionStatus.currentStatus === undefined, 'invalid enum value should be dropped');
  });

  check('builder profile and contact details are promoted', () => {
    eq(mapped.builderProfile.companyName, 'Sujay Constructions', 'companyName');
    eq(mapped.builderProfile.establishedYear, 2010, 'establishedYear');
    eq(mapped.contactDetails.mobile, '9876543210', 'mobile');
    eq(mapped.contactDetails.social.facebook, 'https://facebook.com/sujayconstructions', 'facebook');
    assert(mapped.contactDetails.social.youtube === undefined, 'unset social link should be absent');
  });

  check('SEO meta and keywords are promoted', () => {
    eq(mapped.seo.metaTitle, 'Sujay Global Elara - 2, 3 & 4 BHK Apartments in Nallagandla', 'metaTitle');
    eq(mapped.seo.keywords.length, 3, 'keyword count');
  });

  check('a comma-separated keyword string is also accepted', () => {
    const m = mapBuilderProjectFields(buildWizardDynamicData({ seoKeywords: 'one, two , three' }));
    eq(m.seo.keywords, ['one', 'two', 'three'], 'split keywords');
  });

  check('an empty dynamicData maps to an empty object without throwing', () => {
    eq(Object.keys(mapBuilderProjectFields({})).length, 0, 'empty mapping');
    eq(Object.keys(mapBuilderProjectFields(null)).length, 0, 'null mapping');
  });

  check('slugify handles accents, symbols and spacing', () => {
    eq(slugify('  Sujay Global Élara — Phase 2!  '), 'sujay-global-elara-phase-2', 'slugify');
  });
};

const testPersistence = async () => {
  console.log('\nD. Persistence (real Mongo round-trip)');

  const dd = buildWizardDynamicData({ propertyName: `${TEST_MARKER} Sujay Global Elara` });

  // Mirrors exactly what createProperty does for a builder submission
  const doc = new Property({
    propertyName: dd.propertyName,
    propertyType: 'Apartment',
    transactionType: 'Sell',
    propertyCategory: 'Residential',
    dynamicData: dd,
    description: dd.description,
    contactNumber: dd.contactNumber,
    amenities: dd.amenities,
    highlights: dd.highlights,
    propertyImages: dd.propertyImages,
    nearbyPlaces: dd.nearbyPlaces,
    coverImage: dd.coverImage,
    logo: dd.logo,
    address: {
      country: dd.country, state: dd.state, district: dd.district,
      city: dd.city, area: dd.locality, fullAddress: dd.fullAddress, pincode: dd.pincode
    },
    // createProperty always supplies a fallback point; the mapper overwrites it
    // when the wizard captured real coordinates.
    location: { type: 'Point', coordinates: [0, 0] },
    status: 'pending'
  });

  Object.entries(mapBuilderProjectFields(dd)).forEach(([k, v]) => { doc[k] = v; });
  doc.slug = await generateUniqueSlug(Property, dd.seoSlug, [doc.propertyName, dd.locality, dd.city], doc._id);
  await doc.save();

  const saved = await Property.findById(doc._id).lean();

  check('property saves and is retrievable', () => {
    assert(saved, 'property not found after save');
    eq(saved.status, 'pending', 'status (admin approval workflow)');
  });

  check('slug persisted from the SEO step', () => {
    eq(saved.slug, 'sujay-global-elara-nallagandla-hyderabad', 'slug');
  });

  check('promoted unit configurations survive the round-trip', () => {
    eq(saved.unitConfigurations.length, 3, 'unit count');
    eq(saved.unitConfigurations[1].unitType, '3 BHK', 'second unit type');
    eq(saved.unitConfigurations[1].price, 9200000, 'second unit price');
    eq(saved.priceRange.min, 6800000, 'priceRange.min');
  });

  check('construction status survives the round-trip', () => {
    eq(saved.constructionStatus.currentStatus, 'Under Construction', 'currentStatus');
    eq(saved.constructionStatus.completionPercentage, 60, 'completionPercentage');
    eq(saved.constructionStatus.progress.length, 6, 'progress stages');
  });

  check('documents, specs, builder profile, contact and SEO survive', () => {
    eq(saved.projectDocuments.length, 3, 'documents');
    eq(saved.specifications.structure, 'RCC Framed Structure', 'specifications');
    eq(saved.builderProfile.companyName, 'Sujay Constructions', 'builderProfile');
    eq(saved.contactDetails.email, 'sales@sujayconstructions.com', 'contactDetails');
    eq(saved.seo.metaTitle.startsWith('Sujay Global Elara'), true, 'seo.metaTitle');
  });

  check('raw wizard answers are still fully preserved in dynamicData', () => {
    // nothing is lost even for fields with no promoted home
    eq(saved.dynamicData.landmark, 'Near Nallagandla Tellapur Road', 'dynamicData.landmark');
    eq(saved.dynamicData.positionFacingRates.length, 2, 'dynamicData.positionFacingRates');
    eq(saved.dynamicData.floorPlans[0].configName, '2 BHK', 'dynamicData.floorPlans');
    eq(saved.dynamicData.latitude, '17.5024', 'dynamicData.latitude');
  });

  check('nearby places (Location Advantages) persist on the property', () => {
    eq(saved.nearbyPlaces.length, 3, 'nearbyPlaces count');
    eq(saved.nearbyPlaces[0].type, 'Airport', 'first nearby type');
  });

  check('Step 2 lat/long lands in the geo-indexed location field as [lng, lat]', () => {
    eq(saved.location.type, 'Point', 'location.type');
    eq(saved.location.coordinates, [78.3067, 17.5024], 'location.coordinates');
  });

  // Proves the promoted coordinates are actually usable by map / radius search
  const nearby = await Property.find({
    _id: doc._id,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [78.3067, 17.5024] },
        $maxDistance: 2000
      }
    }
  }).select('_id').lean();

  check('the saved project is findable by a geo radius query', () => {
    eq(nearby.length, 1, 'geo $nearSphere hit count');
  });

  return doc;
};

const testSlugUniqueness = async (firstDoc) => {
  console.log('\nE. Slug uniqueness');

  const dd = buildWizardDynamicData({ propertyName: `${TEST_MARKER} Sujay Global Elara Two` });
  const second = new Property({
    propertyName: dd.propertyName,
    propertyType: 'Apartment',
    transactionType: 'Sell',
    propertyCategory: 'Residential',
    dynamicData: dd,
    location: { type: 'Point', coordinates: [0, 0] },
    status: 'pending'
  });
  Object.entries(mapBuilderProjectFields(dd)).forEach(([k, v]) => { second[k] = v; });
  second.slug = await generateUniqueSlug(Property, dd.seoSlug, [dd.propertyName], second._id);
  await second.save();

  check('a colliding slug gets a numeric suffix', () => {
    eq(second.slug, 'sujay-global-elara-nallagandla-hyderabad-2', 'second slug');
  });

  const sameAgain = await generateUniqueSlug(Property, 'sujay-global-elara-nallagandla-hyderabad', [], firstDoc._id);
  check('editing the original property does not shift its slug', () => {
    eq(sameAgain, 'sujay-global-elara-nallagandla-hyderabad', 'stable slug on edit');
  });

  const noSeoSlug = await generateUniqueSlug(Property, '', ['Green Meadows', 'Kondapur', 'Hyderabad'], null);
  check('slug falls back to name + locality + city when SEO slug is blank', () => {
    eq(noSeoSlug, 'green-meadows-kondapur-hyderabad', 'fallback slug');
  });

  return second;
};

// --- runner ----------------------------------------------------------------

/**
 * mongodb+srv:// needs an SRV lookup. On machines where the system resolver is
 * a local proxy that isn't running, Node inherits 127.0.0.1 and the lookup dies
 * with ECONNREFUSED. Fall back to public DNS so the test can still run.
 */
const ensureSrvResolvable = async (url) => {
  if (!url.startsWith('mongodb+srv://')) return;
  const host = url.split('@')[1]?.split('/')[0];
  if (!host) return;
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  } catch (err) {
    if (err.code !== 'ECONNREFUSED' && err.code !== 'ETIMEOUT') throw err;
    console.warn(`System DNS (${dns.getServers().join(', ')}) refused the SRV lookup - falling back to public DNS.`);
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  }
};

const run = async () => {
  if (!process.env.MONGODB_URL) {
    console.error('MONGODB_URL is not set - check backend/.env');
    process.exit(1);
  }

  await ensureSrvResolvable(process.env.MONGODB_URL);
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('Connected to MongoDB');

  try {
    const apartment = await testTemplateSeeding();
    testStepContent(apartment);
    testMapping();
    const first = await testPersistence();
    await testSlugUniqueness(first);
  } finally {
    const { deletedCount } = await Property.deleteMany({
      propertyName: { $regex: TEST_MARKER }
    });
    console.log(`\nCleaned up ${deletedCount} test properties.`);
    await mongoose.disconnect();
  }

  console.log(`\n${'='.repeat(60)}`);
  if (failures.length === 0) {
    console.log(`ALL PASSED - ${passed} checks`);
    process.exit(0);
  } else {
    console.log(`FAILED - ${passed} passed, ${failures.length} failed:`);
    failures.forEach(f => console.log(`  - ${f.name}\n      ${f.message}`));
    process.exit(1);
  }
};

run().catch(err => {
  console.error('\nTest run crashed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
