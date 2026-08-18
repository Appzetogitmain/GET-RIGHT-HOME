import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, History } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { setPreferredCity } from '../../utils/locationPreference';
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from '../../utils/recentActivity';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../config/googleMaps';

/**
 * The "Explore real estate in..." picker opened from the top nav's location
 * pill (matches the 99acres pattern) — available on every page, not just
 * home. Selecting a place updates the shared city preference; every page
 * built on HeroSection listens for that and re-filters live, so this modal
 * itself doesn't need to know what page it was opened from.
 */
const CityExploreModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [autocomplete, setAutocomplete] = useState(null);
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);

    const { isLoaded } = useJsApiLoader({
        id: GOOGLE_MAPS_SCRIPT_ID,
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    useEffect(() => {
        if (isOpen) {
            setRecentSearches(getRecentSearches());
            setQuery('');
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const extractName = (components = []) => {
        const find = (type) => components.find((c) => c.types.includes(type))?.long_name;
        return find('sublocality_level_1') || find('sublocality') || find('locality') || find('administrative_area_level_2') || find('administrative_area_level_1') || null;
    };

    const handleRemoveSearch = (e, label) => {
        e.stopPropagation();
        setRecentSearches(removeRecentSearch(label));
    };

    const handleClearAllSearches = (e) => {
        e.stopPropagation();
        clearRecentSearches();
        setRecentSearches([]);
    };

    const handlePlaceChanged = () => {
        if (!autocomplete) return;
        const place = autocomplete.getPlace();
        if (!place?.address_components) return;
        const name = extractName(place.address_components) || place.name;
        if (!name) return;
        setPreferredCity(name);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-start justify-center pt-24 px-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>

                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-5">Explore real estate in&hellip;</h2>

                {isLoaded ? (
                    <Autocomplete
                        onLoad={setAutocomplete}
                        onPlaceChanged={handlePlaceChanged}
                        options={{
                            componentRestrictions: { country: 'in' },
                            fields: ['name', 'address_components']
                        }}
                    >
                        <div className="relative">
                            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search any city or locality..."
                                autoFocus
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-medium text-gray-800 focus:bg-white focus:border-orange-400 outline-none transition-all"
                            />
                        </div>
                    </Autocomplete>
                ) : (
                    <input
                        type="text"
                        disabled
                        placeholder="Loading location search..."
                        className="w-full px-4 py-3.5 bg-gray-100 border border-gray-200 rounded-2xl text-[15px] text-gray-400"
                    />
                )}
                <p className="text-[11px] text-gray-400 mt-2 ml-1">Not limited to a fixed list — search for any city or neighbourhood.</p>

                {recentSearches.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[13px] font-bold text-gray-500">Continue browsing where you left off&hellip;</p>
                            <button
                                onClick={handleClearAllSearches}
                                className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recentSearches.map((s) => (
                                <div
                                    key={s.label}
                                    onClick={() => { onClose(); navigate(s.url); }}
                                    className="group flex items-center gap-1.5 pl-3.5 pr-1.5 py-1.5 rounded-full border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors cursor-pointer"
                                >
                                    <History size={12} className="text-gray-400 shrink-0" />
                                    {s.label}
                                    <button
                                        onClick={(e) => handleRemoveSearch(e, s.label)}
                                        title="Remove"
                                        className="p-0.5 rounded-full text-gray-300 hover:text-white hover:bg-red-400 transition-colors shrink-0"
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CityExploreModal;
