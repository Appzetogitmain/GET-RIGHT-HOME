import React, { useState, useRef } from 'react';
import { MapPin, ChevronDown, X, Search } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../config/googleMaps';

/**
 * CityDropdown — Hero Section location picker
 *
 * Free-text location search (Google Places), NOT tied to the admin
 * Location Manager. A property's real location is whatever address the
 * lister set when creating it — search has to be able to match ANY of
 * that, not just places an admin has pre-registered. Picking a place here
 * calls onSelect({ city, district }) with the place name, same interface
 * as before, so nothing downstream (HeroSection, the property sections)
 * needed to change.
 */

// Prefer the most specific human name for a place: neighbourhood > city > district > state
const extractLocationName = (components = []) => {
  const find = (type) => components.find((c) => c.types.includes(type))?.long_name;
  return (
    find('sublocality_level_1') ||
    find('sublocality') ||
    find('locality') ||
    find('administrative_area_level_2') ||
    find('administrative_area_level_1') ||
    null
  );
};

const CityDropdown = ({
  selectedCity,
  selectedDistrict,
  onSelect,
  theme,
  fullWidth = false,
  rounded = 'rounded-xl',
  textClass = 'text-[13px]',
  iconSize = 15,
  chevronSize = 13,
  paddingClass = 'px-3 py-1.5'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const dropdownRef = useRef(null);
  const accentColor = theme?.accent || '#10B981';

  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      // Google's Places suggestion list (.pac-container) is appended
      // directly to <body>, outside this dropdown's own DOM — so a tap on
      // a suggestion looks like an "outside click" and would close the
      // dropdown (unmounting the input) before the place selection could
      // actually fire. Ignore clicks landing inside it.
      if (e.target.closest('.pac-container')) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAll = () => {
    onSelect({ city: null, district: null });
    setQuery('');
    setIsOpen(false);
  };

  const handlePlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place?.geometry) return; // user pressed enter without picking a suggestion

    const name = extractLocationName(place.address_components) || place.name;
    if (!name) return;

    onSelect({ city: name, district: null });
    setQuery(name);
    setIsOpen(false);
  };

  const displayLabel = selectedCity || (selectedDistrict ? selectedDistrict : 'All Cities');

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="city-dropdown-trigger"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-2 ${paddingClass} ${rounded} border bg-white hover:border-gray-300 transition-all ${
          fullWidth ? 'w-full justify-between' : 'min-w-[120px] max-w-[155px]'
        }`}
        style={{ borderColor: isOpen ? accentColor : '#e5e7eb' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={iconSize} className="text-blue-600 shrink-0" />
          <span className={`${textClass} font-semibold text-gray-800 truncate`}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          size={chevronSize}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden"
        >
          {/* Search box */}
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            {isLoaded ? (
              <Autocomplete
                onLoad={setAutocomplete}
                onPlaceChanged={handlePlaceChanged}
                options={{
                  componentRestrictions: { country: 'in' },
                  fields: ['name', 'geometry', 'address_components']
                }}
              >
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search any city or locality..."
                    autoFocus
                    className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none"
                    style={{ borderColor: query ? accentColor : undefined }}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </Autocomplete>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  disabled
                  placeholder="Loading location search..."
                  className="w-full pl-8 pr-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-[13px] text-gray-400"
                />
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1.5 px-0.5">Search for any city or neighbourhood — not limited to a fixed list.</p>
          </div>

          {/* All Cities option */}
          <button
            type="button"
            onClick={handleSelectAll}
            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
              !selectedCity ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
          >
            <span
              className="font-semibold text-sm"
              style={{ color: !selectedCity ? accentColor : '#1f2937' }}
            >
              All Cities
            </span>
            {!selectedCity && (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CityDropdown;
