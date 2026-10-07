import React, { useState, useEffect } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Crosshair, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../../config/googleMaps';

const component = (components, type) => components?.find((c) => c.types.includes(type))?.long_name || '';

/** Turns a Google place into the address object the booking needs. */
// For a landmark (airport, hotel, society) Google's formatted_address leaves out its
// name, so the chosen place would look like just "Indore". Keep the name in front.
const fullAddress = (place) => {
  const formatted = place.formatted_address || '';
  const name = (place.name || '').trim();
  if (!name) return formatted;
  if (!formatted) return name;
  return formatted.toLowerCase().includes(name.toLowerCase()) ? formatted : `${name}, ${formatted}`;
};

export const placeToAddress = (place) => ({
  address: fullAddress(place),
  lat: place.geometry?.location?.lat?.() ?? null,
  lng: place.geometry?.location?.lng?.() ?? null,
  city: component(place.address_components, 'locality') || component(place.address_components, 'administrative_area_level_2'),
  state: component(place.address_components, 'administrative_area_level_1'),
  pincode: component(place.address_components, 'postal_code')
});

/**
 * Address box with Google suggestions. `value` is the chosen address object
 * (or null); picking a suggestion calls onChange(addressObject).
 */
const PlacesInput = ({ value, onChange, placeholder, dotColor, allowCurrent = false }) => {
  const { isLoaded } = useJsApiLoader({ id: GOOGLE_MAPS_SCRIPT_ID, googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const [auto, setAuto] = useState(null);
  const [text, setText] = useState(value?.address || '');
  const [locating, setLocating] = useState(false);

  // "Use my current location": browser GPS -> Google reverse geocode -> address object.
  const useCurrent = () => {
    if (!navigator.geolocation) return toast.error('Your browser cannot share its location. Please type the address.');
    if (!window.google?.maps) return toast.error('Maps is still loading. Try again in a moment.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: coords.latitude, lng: coords.longitude };
        new window.google.maps.Geocoder().geocode({ location: here }, (results, status) => {
          setLocating(false);
          if (status !== 'OK' || !results?.length) return toast.error('Could not find an address for your location. Please type it.');
          const best = results.find((r) => r.types.includes('street_address') || r.types.includes('premise') || r.types.includes('route')) || results[0];
          const addr = placeToAddress(best);
          // keep the exact GPS pin, not the centre of the matched street
          onChange({ ...addr, lat: here.lat, lng: here.lng });
        });
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === 1 ? 'Location permission is blocked. Allow it in your browser, or type the address.' : 'Could not get your location. Please type the address.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  useEffect(() => { setText(value?.address || ''); }, [value?.address]);

  const box = (
    <div className="relative">
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          // typing by hand (no suggestion picked) keeps the text but drops the old pin
          if (value) onChange(e.target.value ? { address: e.target.value, lat: null, lng: null, city: value.city, state: value.state, pincode: value.pincode } : null);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-9 text-sm text-slate-800 outline-none transition focus:border-slate-400"
      />
      {text && (
        <button type="button" onClick={() => { setText(''); onChange(null); }} aria-label="Clear" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
          <X size={15} />
        </button>
      )}
      {allowCurrent && !text && (
        <button
          type="button"
          onClick={useCurrent}
          disabled={locating || !isLoaded}
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold hover:bg-slate-50 disabled:opacity-50"
          style={{ color: '#347989' }}
        >
          {locating ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />} {locating ? 'Locating…' : 'Use current location'}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-white" style={{ borderColor: dotColor }} />
      <div className="min-w-0 flex-1">
        {isLoaded ? (
          <Autocomplete
            onLoad={setAuto}
            onPlaceChanged={() => {
              const place = auto?.getPlace();
              if (place?.geometry) onChange(placeToAddress(place));
            }}
            options={{ componentRestrictions: { country: 'in' }, fields: ['formatted_address', 'geometry', 'name', 'address_components'] }}
          >
            {box}
          </Autocomplete>
        ) : box}
      </div>
    </div>
  );
};

export default PlacesInput;
