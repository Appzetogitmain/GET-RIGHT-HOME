import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { FiCrosshair } from 'react-icons/fi';
import flutterBridge from '../../../../../utils/flutterBridge';
import { toast } from 'react-hot-toast';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../../../../../config/googleMaps';

const mapContainerStyle = {
  width: '100%',
  height: '256px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

const LocationPicker = forwardRef(({ onLocationSelect, initialPosition = null }, ref) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(initialPosition || defaultCenter);
  const [autocomplete, setAutocomplete] = useState(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = React.useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // Update marker when initialPosition changes (from external selection)
  useEffect(() => {
    if (initialPosition) {
      setMarker(initialPosition);
      if (map) {
        map.panTo(initialPosition);
        map.setZoom(15);
      }
    }
  }, [initialPosition, map]);

  // Get user's current location on mount
  useEffect(() => {
    if (!initialPosition && isLoaded) {
      handleCurrentLocation();
    }
  }, [isLoaded]);

  // Build clean address from Nominatim structured data
  const formatNominatimAddress = (addr) => {
    const parts = [];
    // Area/Road
    if (addr.road) parts.push(addr.road);
    else if (addr.neighbourhood) parts.push(addr.neighbourhood);
    // Suburb/Locality
    if (addr.suburb) parts.push(addr.suburb);
    else if (addr.village) parts.push(addr.village);
    // City
    const city = addr.city || addr.town || addr.city_district;
    if (city) parts.push(city);
    // State
    if (addr.state) parts.push(addr.state);
    // Pincode
    if (addr.postcode) parts.push(addr.postcode);

    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Reverse geocode via Nominatim (OpenStreetMap) - fallback when Google fails
  const reverseGeocodeNominatim = async (position) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${position.lat}&lon=${position.lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        // Build clean address instead of using raw display_name
        const cleanAddress = formatNominatimAddress(addr) || data.display_name;

        // Build address_components-like array for compatibility
        const components = [
          addr.suburb && { types: ['sublocality'], long_name: addr.suburb },
          addr.city && { types: ['locality'], long_name: addr.city },
          addr.town && !addr.city && { types: ['locality'], long_name: addr.town },
          addr.state && { types: ['administrative_area_level_1'], long_name: addr.state },
          addr.postcode && { types: ['postal_code'], long_name: addr.postcode },
          addr.country && { types: ['country'], long_name: addr.country },
        ].filter(Boolean);

        if (onLocationSelect) {
          onLocationSelect({
            lat: position.lat,
            lng: position.lng,
            address: cleanAddress,
            components
          });
        }
        return true;
      }
    } catch (err) {
      console.warn('[LocationPicker] Nominatim fallback failed:', err);
    }
    return false;
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (position) => {
    setLoading(true);

    // Try Google Maps first if available
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: position }, async (results, status) => {
        if (status === 'OK' && results[0]) {
          setLoading(false);
          if (onLocationSelect) {
            onLocationSelect({
              lat: position.lat,
              lng: position.lng,
              address: results[0].formatted_address,
              components: results[0].address_components
            });
          }
        } else {
          // Google geocoding failed — try Nominatim
          await reverseGeocodeNominatim(position);
          setLoading(false);
        }
      });
    } else {
      // No Google Maps at all — use Nominatim directly
      await reverseGeocodeNominatim(position);
      setLoading(false);
    }
  };

  // Handle map click
  const onMapClick = useCallback((e) => {
    const newPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setMarker(newPos);
    reverseGeocode(newPos);
  }, []);

  // Handle autocomplete place selection
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMarker(newPos);
        if (map) {
          map.panTo(newPos);
          map.setZoom(15);
        }
        if (onLocationSelect) {
          onLocationSelect({
            lat: newPos.lat,
            lng: newPos.lng,
            address: place.formatted_address
          });
        }
      }
    }
  };

  // Handle current location button
  const handleCurrentLocation = async () => {
    setLoading(true);
    loadingRef.current = true;
    
    // Safety timer: If it takes more than 5 seconds, prompt user to check GPS
    const slowLocationTimer = setTimeout(() => {
      if (loadingRef.current) {
        window.dispatchEvent(new CustomEvent('requestLocationPrompt'));
        toast('Location taking too long. Please ensure GPS is ON.', { icon: '📍' });
      }
    }, 5000);

    try {
      const pos = await flutterBridge.getCurrentLocation();
      clearTimeout(slowLocationTimer);
      setLoading(false);
      loadingRef.current = false;
      
      const newPos = {
        lat: pos.latitude,
        lng: pos.longitude
      };
      
      setMarker(newPos);
      if (map) {
        map.panTo(newPos);
        map.setZoom(17);
      }
      reverseGeocode(newPos);
    } catch (error) {
      clearTimeout(slowLocationTimer);
      setLoading(false);
      loadingRef.current = false;
      console.error("Geolocation error:", error);
      
      // Trigger the specialized "Allow GPS" popup
      window.dispatchEvent(new CustomEvent('requestLocationPrompt'));
      
      let errorMessage = 'Unable to get location.';
      if (error.code === 1) errorMessage = 'Location permission denied.';
      else if (error.code === 2) errorMessage = 'GPS is turned off.';
      else if (error.code === 3) errorMessage = 'Location request timed out.';

      toast.error(`${errorMessage} Please select manually on the map.`);
    }
  };

  // Expose handleCurrentLocation to parent via ref
  useImperativeHandle(ref, () => ({
    fetchCurrentLocation: handleCurrentLocation
  }));

  if (loadError) {
    return <div className="h-64 bg-gray-200 flex items-center justify-center">
      <p className="text-red-600">Error loading Google Maps</p>
    </div>;
  }

  if (!isLoaded) {
    return <div className="h-64 bg-gray-200 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>;
  }

  return (
    <div className="w-full">
      <div className="relative h-64 bg-gray-200">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={marker}
          zoom={15}
          onClick={onMapClick}
          onLoad={setMap}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            rotateControl: true,
            tiltControl: true,
            zoomControl: false
          }}
        >
          {marker && (
            <Marker 
              position={marker} 
              draggable={true}
              onDragEnd={(e) => {
                const newPos = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                };
                setMarker(newPos);
                reverseGeocode(newPos);
              }}
            />
          )}
        </GoogleMap>

        {/* Pin Instruction Overlay */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-10">
          {loading ? 'Fetching address...' : 'Place the pin accurately on map'}
        </div>

        {/* Locate Me Button */}
        {/* Locate Me Button - Now on right */}
        <button
          onClick={handleCurrentLocation}
          className="absolute bottom-16 right-4 p-3 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all z-10"
        >
          <FiCrosshair className="w-6 h-6 text-gray-700" />
        </button>
      </div>
    </div>
  );
});

LocationPicker.displayName = 'LocationPicker';

export default LocationPicker;

