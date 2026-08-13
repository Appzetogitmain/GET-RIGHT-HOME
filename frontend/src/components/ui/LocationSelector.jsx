import React, { useState } from 'react';
import { MapPin, Search, Pencil, X } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../config/googleMaps';

/**
 * LocationSelector — property location input
 *
 * Used across every "add/edit a property" screen (partner wizard, admin
 * direct-add, dynamic form engine). A property can belong to ANY real
 * location — this must never require that location to already exist in
 * the admin Location Manager. So instead of cascading Country → State →
 * District → City dropdowns sourced from that admin-curated list, this is
 * a single free-text place search (Google Places), restricted to India but
 * not to any pre-registered set of cities. Whatever the lister actually
 * searches for and picks becomes the property's real address — the
 * source of truth for where it shows up in search later.
 *
 * Interface is unchanged from the old cascading version:
 *   value: { country, state, district, city }
 *   onChange({ country, state, district, city })
 */

const getComponent = (components, type) =>
  components?.find((c) => c.types.includes(type))?.long_name || '';

const LocationSelector = ({ value = {}, onChange, required = false, className = '', errors = {} }) => {
  const [autocomplete, setAutocomplete] = useState(null);
  const [query, setQuery] = useState('');
  // If we already have a value (editing an existing property, or a place
  // was just picked), show it as a resolved summary instead of a live search box.
  const [isEditing, setIsEditing] = useState(!(value?.city || value?.state));

  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const handlePlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place?.address_components) return;

    const components = place.address_components;
    const city =
      getComponent(components, 'locality') ||
      getComponent(components, 'sublocality_level_1') ||
      getComponent(components, 'administrative_area_level_2') ||
      place.name ||
      '';
    const district =
      getComponent(components, 'administrative_area_level_2') ||
      city;
    const state = getComponent(components, 'administrative_area_level_1');
    const country = getComponent(components, 'country') || 'India';

    onChange({ country, state, district, city });
    setQuery('');
    setIsEditing(false);
  };

  const hasValue = value?.city || value?.state;
  const summaryParts = [value?.city, value?.district !== value?.city ? value?.district : null, value?.state, value?.country]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i); // de-dupe (district often equals city)

  return (
    <div className={className}>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        Property Location{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {hasValue && !isEditing ? (
        <div className={`flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 border rounded-xl ${errors.city ? 'border-red-400 bg-red-50' : 'border-emerald-200'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={16} className="text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate">{summaryParts.join(', ')}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 shrink-0"
          >
            <Pencil size={12} /> Change
          </button>
        </div>
      ) : isLoaded ? (
        <Autocomplete
          onLoad={setAutocomplete}
          onPlaceChanged={handlePlaceChanged}
          options={{
            componentRestrictions: { country: 'in' },
            fields: ['name', 'address_components']
          }}
        >
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for the property's city or locality..."
              autoFocus={hasValue}
              className={`w-full pl-8 pr-9 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:border-emerald-400 outline-none transition-all ${errors.city ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            {hasValue && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </Autocomplete>
      ) : (
        <input
          type="text"
          disabled
          placeholder="Loading location search..."
          className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-400"
        />
      )}
      <p className="text-[10px] text-gray-400 mt-1.5">Search any city, town, or locality — it doesn't need to be pre-registered by admin.</p>
      {errors.city && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.city}</p>}
    </div>
  );
};

export default LocationSelector;
