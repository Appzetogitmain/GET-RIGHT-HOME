import Worker from '../models/Worker.js';
import Zone from '../models/Zone.js';
import Profession from '../models/Profession.js';
import { safeRegex } from '../utils/escapeRegex.js';

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'for', 'in', 'of', 'to', 'at', 'by', 'with', 'a', 'an',
  'home', 'house', 'full', 'deep', 'general', 'services', 'service', 'repair',
  'repairs', 'work', 'works', 'all', 'expert', 'pro', 'care', 'installation',
  'install', 'custom', 'basic', 'premium', 'standard', 'instant', 'rental', 'test'
]);

/**
 * Normalizes a category or service string for matching:
 * - lowercase, trimmed
 * - removes punctuation like '&', '-', '/', ','
 * - reduces multiple spaces
 */
export const normalizeCategoryString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extracts key domain skill tokens by stripping out generic stop words like 'home', 'services', 'full'.
 */
export const getDomainTokens = (str) => {
  const normalized = normalizeCategoryString(str);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
};

/**
 * Checks whether a worker's service categories match the booking's category/service criteria.
 * @param {Array<string>} workerCategories - worker.serviceCategories
 * @param {Object} filters - { service, serviceName, slug, categoryId }
 * @returns {boolean}
 */
export const matchesWorkerCategory = (workerCategories, filters) => {
  if (!Array.isArray(workerCategories) || workerCategories.length === 0) {
    return false; // Workers without assigned categories do not match any booking
  }
  if (!filters) return false;

  const filterTargets = [
    filters.service,
    filters.serviceName,
    filters.slug,
    filters.categoryId ? String(filters.categoryId) : null
  ].filter(Boolean);

  if (filterTargets.length === 0) return false;

  const normalizedTargets = filterTargets.map(t => normalizeCategoryString(t)).filter(Boolean);
  const targetDomainTokensList = filterTargets.map(t => getDomainTokens(t)).filter(tokens => tokens.length > 0);

  return workerCategories.some(workerCat => {
    if (!workerCat || typeof workerCat !== 'string') return false;
    const normWorker = normalizeCategoryString(workerCat);
    if (!normWorker) return false;

    // 1. Direct exact match on normalized strings (e.g. "packers movers" === "packers movers")
    for (const target of normalizedTargets) {
      if (normWorker === target) return true;
    }

    // 2. Domain-token matching (comparing actual skills/trades like 'paint', 'clean', 'plumb', 'ac')
    const workerDomainTokens = getDomainTokens(workerCat);
    if (workerDomainTokens.length === 0) return false;

    for (const targetTokens of targetDomainTokensList) {
      for (const wToken of workerDomainTokens) {
        for (const tToken of targetTokens) {
          // Exact trade token match (e.g. 'painting' === 'painting', 'cleaning' === 'cleaning', 'ac' === 'ac')
          if (wToken === tToken) return true;

          // Stem variation match (e.g. 'plumber' vs 'plumbing', 'electrician' vs 'electrical')
          if (wToken.length >= 4 && tToken.length >= 4) {
            const stemLen = Math.min(4, Math.min(wToken.length, tToken.length));
            const wStem = wToken.slice(0, stemLen);
            const tStem = tToken.slice(0, stemLen);
            if (wStem === tStem) return true;
          }
        }
      }
    }

    return false;
  });
};

/**
 * A worker's serviceCategories may name an admin-defined Profession (e.g.
 * "Electrician"). Such an entry qualifies the worker ONLY for the categories
 * the admin bundled under that profession — matched by category id, never
 * fuzzily — and the worker's other category names are ignored. A worker with
 * no profession keeps the legacy name matching.
 */
export const workerServesBooking = (worker, filters, professions = []) => {
  const byName = new Map(professions.map(p => [normalizeCategoryString(p.name), p]));
  const held = [];
  const plain = [];
  for (const entry of worker.serviceCategories || []) {
    const profession = byName.get(normalizeCategoryString(entry));
    if (profession) held.push(profession);
    else plain.push(entry);
  }
  if (held.length > 0) {
    // A deactivated profession serves nothing; it must not fall back to fuzzy
    // name matching on the profession's label.
    return !!filters?.categoryId && held.some(p => p.isActive !== false) && held.filter(p => p.isActive !== false).some(p => (p.categoryIds || []).some(id => String(id) === String(filters.categoryId)));
  }
  return matchesWorkerCategory(plain, filters);
};

export const findNearbyWorkers = async (location, radius, filters) => {
  try {
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng);
    const maxDistanceInMeters = radius * 1000; // convert km to meters
    
    console.log(`[LocationService] findNearbyWorkers searching near [${lng}, ${lat}] within ${radius}km`);

    // Base query - only filter by online/active status, NOT by category
    // Category filtering done in JS to allow flexible matching
    const baseQuery = {
      approvalStatus: 'approved',
      isActive: true,
      // Busy workers are filtered afterwards by filterAvailableWorkers, which
      // looks at the jobs they hold right now. The stored `busy` flag is not
      // used here: a slot job accepted for tonight must not hide the worker
      // from an instant booking this afternoon.
    };
    // Scheduled (future-day) bookings can go to workers who are offline right
    // now — availability is governed by their marked days/leave, not the toggle.
    if (!filters?.includeOffline) baseQuery.isOnline = true;
    const requestedMode = filters?.bookingMode === 'instant' ? 'instant' : (filters?.bookingMode ? 'slot' : null);
    if (requestedMode === 'instant') {
      baseQuery.bookingModes = 'instant';
    } else if (requestedMode === 'slot') {
      baseQuery.$and = [{
        $or: [
          { bookingModes: 'slot' },
          { bookingModes: { $exists: false } },
          { bookingModes: { $size: 0 } }
        ]
      }];
    }

    // ZONE CHECK LOGIC
    let formattedWorkers = [];
    const totalZones = await Zone.countDocuments({ status: 'active' });

    if (totalZones > 0) {
      // Find if the user's location falls within any active zone
      const activeZone = await Zone.findOne({
        status: 'active',
        area: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          }
        }
      });

      if (!activeZone) {
        console.log(`[LocationService] User at [${lng}, ${lat}] is NOT in any active zone. Service unavailable.`);
        return []; // Reject booking by returning no workers
      }

      console.log(`[LocationService] User is in zone: ${activeZone.name}`);

      // Only workers the admin explicitly assigned to this zone get its
      // bookings. A worker's own location or address city does not qualify —
      // otherwise an Indore-zone worker who happens to stand near a zone
      // border would receive another zone's jobs. (`zones` is the legacy
      // name-based assignment kept in sync with zoneIds.)
      const zoneWorkersQuery = {
        ...baseQuery,
        $or: [
          { zoneIds: activeZone._id },
          { zones: safeRegex(activeZone.name, { exact: true }) }
        ]
      };

      const workers = await Worker.find(zoneWorkersQuery).lean();
      console.log(`[LocationService] Found ${workers.length} approved/online workers in zone: ${activeZone.name}`);

      formattedWorkers = workers.map(worker => {
        let dist = 0;
        if (worker.geoLocation?.coordinates?.length === 2 &&
            (worker.geoLocation.coordinates[0] !== 0 || worker.geoLocation.coordinates[1] !== 0)) {
          const wLng = worker.geoLocation.coordinates[0];
          const wLat = worker.geoLocation.coordinates[1];
          const dLat = (wLat - lat) * Math.PI / 180;
          const dLng = (wLng - lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat * Math.PI / 180) * Math.cos(wLat * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          dist = parseFloat((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
        }
        return {
          ...worker,
          distance: dist
        };
      });

      // Sort by distance (nearest first)
      formattedWorkers.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      console.log(`[LocationService] No active zones found in DB. Falling back to global radius search.`);
      const workers = await Worker.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distance', // returns distance in meters
            maxDistance: maxDistanceInMeters,
            query: baseQuery,
            spherical: true
          }
        }
      ]);
      console.log(`[LocationService] $geoNear returned ${workers.length} workers.`);

      formattedWorkers = workers.map(worker => ({
        ...worker,
        distance: (worker.distance || 0) / 1000 // Convert to kilometers
      }));
    }

    // Apply strict category filter
    if (filters && (filters.service || filters.serviceName || filters.slug || filters.categoryId)) {
      const categoryFilterName = filters.service || filters.serviceName || filters.slug || 'category';
      const professions = await Profession.find({}).select('name categoryIds isActive').lean();
      const filtered = formattedWorkers.filter(worker => workerServesBooking(worker, filters, professions));

      console.log(`[LocationService] Category filter "${categoryFilterName}" matched ${filtered.length} of ${formattedWorkers.length} nearby workers`);
      formattedWorkers = filtered;
    }

    console.log(`[LocationService] Found ${formattedWorkers.length} workers in zone matching category`);
    return formattedWorkers;
  } catch (error) {
    console.error('Error finding nearby workers:', error);
    return [];
  }
};

/**
 * Can this worker be given this booking at all? Used for admin manual
 * assignment, which bypasses the automatic search. Returns an error message,
 * or null when the worker is in the booking's zone and serves its category.
 */
export const findWorkerIneligibility = async (worker, booking) => {
  if (booking.zoneId) {
    const inZone = (worker.zoneIds || []).some(z => String(z) === String(booking.zoneId));
    if (!inZone) {
      const zone = await Zone.findById(booking.zoneId).select('name').lean();
      const legacy = zone && (worker.zones || []).some(n => normalizeCategoryString(n) === normalizeCategoryString(zone.name));
      if (!legacy) return `${worker.name} is not assigned to the ${zone?.name || 'booking'} zone.`;
    }
  }
  const professions = await Profession.find({}).select('name categoryIds isActive').lean();
  const cats = [...new Set((booking.categoryIds || []).map(String))];
  if (cats.length > 1) {
    for (const cid of cats) {
      if (!workerServesBooking(worker, { categoryId: cid }, professions)) {
        return `${worker.name} does not cover every service in this order. Assign one worker per service instead.`;
      }
    }
    return null;
  }
  const filters = {
    service: booking.serviceCategory,
    serviceName: booking.serviceName,
    categoryId: booking.categoryId
  };
  if (!workerServesBooking(worker, filters, professions)) {
    return `${worker.name}'s profession does not cover ${booking.serviceCategory || 'this'} bookings.`;
  }
  return null;
};

export const geocodeAddress = async (address) => {
  console.log('[LocationService] Geocoding address:', address);
  // Default to Indore coordinates during testing to match the active worker
  return { lat: 22.7176095402611, lng: 75.87198236533966 };
};

export default { findNearbyWorkers, geocodeAddress, normalizeCategoryString, matchesWorkerCategory };
