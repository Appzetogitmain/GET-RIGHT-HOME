// Location service stub
export const findNearbyWorkers = async (location, radius, filters) => {
  console.log('[Location Stub] findNearbyWorkers called');
  return []; // Return empty - no workers nearby in stub mode
};
export const findNearbyVendors = async (location, radius, filters) => {
  return [];
};
export const geocodeAddress = async (address) => {
  return { lat: 0, lng: 0 };
};
export default { findNearbyWorkers, findNearbyVendors, geocodeAddress };
