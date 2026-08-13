// @react-google-maps/api's useJsApiLoader wraps a single, app-wide Loader
// instance. Every call site must pass the *same* id/libraries/apiKey or the
// loader throws "Loader must not be called again with different options."
// Import these constants everywhere instead of declaring local ones.
export const GOOGLE_MAPS_SCRIPT_ID = 'google-map-script';

export const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry', 'drawing'];

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAP_API_KEY;
