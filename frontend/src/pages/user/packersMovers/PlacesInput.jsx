import React, { useState, useEffect } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { X } from 'lucide-react';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../../config/googleMaps';

const component = (components, type) => components?.find((c) => c.types.includes(type))?.long_name || '';

/** Turns a Google place into the address object the booking needs. */
export const placeToAddress = (place) => ({
  address: place.formatted_address || place.name || '',
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
const PlacesInput = ({ value, onChange, placeholder, dotColor }) => {
  const { isLoaded } = useJsApiLoader({ id: GOOGLE_MAPS_SCRIPT_ID, googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const [auto, setAuto] = useState(null);
  const [text, setText] = useState(value?.address || '');

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
