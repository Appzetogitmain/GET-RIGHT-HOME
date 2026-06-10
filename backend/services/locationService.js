import Worker from '../models/Worker.js';

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

    // Convert distance from meters to km
    let formattedWorkers = workers.map(worker => ({
      ...worker,
      distance: worker.distance / 1000 // Convert to kilometers
    }));

    // Apply flexible category filter in JS (case-insensitive partial match)
    if (filters && filters.service && formattedWorkers.length > 0) {
      const serviceLower = filters.service.toLowerCase();
      const filtered = formattedWorkers.filter(worker => {
        if (!worker.serviceCategories || worker.serviceCategories.length === 0) return true; // No category restrictions
        return worker.serviceCategories.some(cat =>
          cat.toLowerCase().includes(serviceLower) || serviceLower.includes(cat.toLowerCase())
        );
      });

      // Use filtered list only if it has workers, otherwise fallback to ALL nearby workers
      if (filtered.length > 0) {
        formattedWorkers = filtered;
        console.log(`[LocationService] Category filter "${filters.service}" matched ${filtered.length} workers`);
      } else {
        console.log(`[LocationService] No workers matched category "${filters.service}", sending to ALL ${formattedWorkers.length} nearby workers`);
      }
    }

    console.log(`[LocationService] Found ${formattedWorkers.length} workers nearby`);
    return formattedWorkers;
  } catch (error) {
    console.error('Error finding nearby workers:', error);
    return [];
  }
};

export const findNearbyVendors = async (location, radius, filters) => {
  return [];
};

export const geocodeAddress = async (address) => {
  console.log('[LocationService] Geocoding address:', address);
  // Default to Indore coordinates during testing to match the active worker
  return { lat: 22.7176095402611, lng: 75.87198236533966 };
};

export default { findNearbyWorkers, findNearbyVendors, geocodeAddress };
