import Worker from '../models/Worker.js';
import Zone from '../models/Zone.js';

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

export const findNearbyWorkers = async (location, radius, filters) => {
  try {
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng);
    const maxDistanceInMeters = radius * 1000; // convert km to meters
    
    console.log(`[LocationService] findNearbyWorkers searching near [${lng}, ${lat}] within ${radius}km`);

    // Base query - only filter by online/active status, NOT by category
    // Category filtering done in JS to allow flexible matching
    const baseQuery = {
      isOnline: true,
      approvalStatus: 'approved',
      isActive: true
    };

    // ZONE CHECK LOGIC
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

        // Restrict workers to ONLY those inside the exact same zone polygon
        baseQuery.geoLocation = {
          $geoWithin: {
            $geometry: activeZone.area
          }
        };
    } else {
      console.log(`[LocationService] No active zones found in DB. Falling back to global radius search.`);
    }

    console.log(`[LocationService] Executing $geoNear query with baseQuery:`, JSON.stringify(baseQuery));
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

    // Check how many workers exist in DB total (for debugging)
    const totalOnlineWorkers = await Worker.countDocuments({ isOnline: true });
    console.log(`[LocationService] For context, there are ${totalOnlineWorkers} total online workers in the database right now.`);

    // Convert distance from meters to km
    let formattedWorkers = workers.map(worker => ({
      ...worker,
      distance: worker.distance / 1000 // Convert to kilometers
    }));

    // Apply strict category filter
    if (filters && (filters.service || filters.serviceName || filters.slug || filters.categoryId)) {
      const categoryFilterName = filters.service || filters.serviceName || filters.slug || 'category';
      const filtered = formattedWorkers.filter(worker => matchesWorkerCategory(worker.serviceCategories, filters));

      console.log(`[LocationService] Category filter "${categoryFilterName}" matched ${filtered.length} of ${formattedWorkers.length} nearby workers`);
      formattedWorkers = filtered;
    }

    console.log(`[LocationService] Found ${formattedWorkers.length} workers nearby matching category`);
    return formattedWorkers;
  } catch (error) {
    console.error('Error finding nearby workers:', error);
    return [];
  }
};

export const geocodeAddress = async (address) => {
  console.log('[LocationService] Geocoding address:', address);
  // Default to Indore coordinates during testing to match the active worker
  return { lat: 22.7176095402611, lng: 75.87198236533966 };
};

export default { findNearbyWorkers, geocodeAddress, normalizeCategoryString, matchesWorkerCategory };
