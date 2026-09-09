import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, Search, MapPin, Building2, ChevronLeft, ChevronRight, 
  Check, SlidersHorizontal, Sparkles, ArrowRight, RotateCcw, 
  Layers, IndianRupee, Home, Key, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import toast from 'react-hot-toast';
import { propertyService } from '../../services/propertyService';
import { POPULAR_OPERATING_CITIES, POPULAR_AREAS_BY_CITY } from '../../data/locationData';
import { setPreferredCity } from '../../utils/locationPreference';
import { addRecentSearch } from '../../utils/recentActivity';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../config/googleMaps';

const TABS = [
  { key: 'buy', label: 'Buy', transactionType: 'Sell', propertyCategory: 'Residential', icon: Home },
  { key: 'rent', label: 'Rent', transactionType: 'Rent / Lease', propertyCategory: 'Residential', icon: Key },
  { key: 'pg', label: 'PG / Co-Living', transactionType: 'Paying Guest', propertyCategory: 'Residential', icon: Building2 },
  { key: 'plots', label: 'Plots / Land', transactionType: 'Sell', propertyCategory: 'Residential', icon: Compass },
  { key: 'commercial', label: 'Commercial', transactionType: 'Sell', propertyCategory: 'Commercial', icon: Building2 },
  { key: 'projects', label: 'New Projects', transactionType: 'Sell', propertyCategory: 'Project', icon: Sparkles }
];

const PROPERTY_TYPES_BY_TAB = {
  buy: ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Plot / Land'],
  rent: ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment', 'Farmhouse'],
  pg: ['Hostel', 'PG / Co-Living', 'Single Room', 'Shared Room', 'Studio Apartment'],
  plots: ['Residential Plot', 'Commercial Land', 'Agricultural / Farm Land', 'Industrial Plot'],
  commercial: ['Office Space', 'Bare Shell Office', 'Co-working Office', 'Commercial Shop', 'Showroom', 'Warehouse / Storage'],
  projects: ['New Launch Apartments', 'Luxury Villas', 'Gated Community Plots', 'Townships', 'Commercial Complex']
};

const BHK_OPTIONS = ['1 RK/1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'];

const CONSTRUCTION_STATUSES = ['Ready to Move', 'Under Construction', 'Pre Launch'];

const POSTED_BY_OPTIONS = ['Owner', 'Builder', 'Broker'];

const FURNISHING_OPTIONS = ['Fully Furnished', 'Semi-Furnished', 'Unfurnished'];

const AMENITIES_OPTIONS = ['Parking', 'Lift', 'Gym', 'Swimming Pool', 'Power Backup', '24x7 Security', 'Club House', 'Gated Community'];

const BUDGET_PRESETS = [
  { label: 'Under ₹25L', min: '', max: '2500000' },
  { label: '₹25L - ₹50L', min: '2500000', max: '5000000' },
  { label: '₹50L - ₹1 Cr', min: '5000000', max: '10000000' },
  { label: '₹1 Cr - ₹2 Cr', min: '10000000', max: '20000000' },
  { label: '₹2 Cr - ₹5 Cr', min: '20000000', max: '50000000' },
  { label: 'Above ₹5 Cr', min: '50000000', max: '' }
];

const MIN_BUDGET_OPTIONS = [
  { label: 'Min', value: '' },
  { label: '₹10 Lac', value: '1000000' },
  { label: '₹25 Lac', value: '2500000' },
  { label: '₹50 Lac', value: '5000000' },
  { label: '₹75 Lac', value: '7500000' },
  { label: '₹1 Cr', value: '10000000' },
  { label: '₹1.5 Cr', value: '15000000' },
  { label: '₹2 Cr', value: '20000000' },
  { label: '₹3 Cr', value: '30000000' },
  { label: '₹5 Cr', value: '50000000' }
];

const MAX_BUDGET_OPTIONS = [
  { label: 'Max', value: '' },
  { label: '₹25 Lac', value: '2500000' },
  { label: '₹50 Lac', value: '5000000' },
  { label: '₹75 Lac', value: '7500000' },
  { label: '₹1 Cr', value: '10000000' },
  { label: '₹1.5 Cr', value: '15000000' },
  { label: '₹2 Cr', value: '20000000' },
  { label: '₹3 Cr', value: '30000000' },
  { label: '₹5 Cr', value: '50000000' },
  { label: '₹10 Cr', value: '100000000' }
];

const GuidedSearchFlowModal = ({
  isOpen,
  onClose,
  initialCity = 'Bengaluru',
  initialTab = 'buy',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialBedrooms = [],
  initialConstructionStatus = [],
  initialPostedBy = []
}) => {
  const navigate = useNavigate();

  const { isLoaded: placesLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [cityAutocomplete, setCityAutocomplete] = useState(null);
  const [areaAutocomplete, setAreaAutocomplete] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Guided Steps: 'city' | 'area' | 'filters'
  const [step, setStep] = useState('city');
  const [activeTabKey, setActiveTabKey] = useState(initialTab);

  // Selections
  const [selectedCity, setSelectedCity] = useState(initialCity || 'Bengaluru');
  const [selectedArea, setSelectedArea] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [areaSearchQuery, setAreaSearchQuery] = useState('');

  // Filters state
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState([]);
  const [minPrice, setMinPrice] = useState(initialMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice || '');
  const [selectedBhks, setSelectedBhks] = useState(initialBedrooms || []);
  const [selectedStatus, setSelectedStatus] = useState(initialConstructionStatus || []);
  const [selectedPostedBy, setSelectedPostedBy] = useState(initialPostedBy || []);
  const [selectedFurnishing, setSelectedFurnishing] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // Data
  const [operatingCities, setOperatingCities] = useState(POPULAR_OPERATING_CITIES);
  const [popularAreas, setPopularAreas] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  const modalRef = useRef(null);
  const wasOpenRef = useRef(false);

  const extractPlaceName = (components = []) => {
    const find = (type) => components.find((c) => c.types.includes(type))?.long_name;
    return (
      find('locality') ||
      find('sublocality_level_1') ||
      find('sublocality') ||
      find('administrative_area_level_2') ||
      find('administrative_area_level_1') ||
      null
    );
  };

  const handleCityPlaceChanged = () => {
    if (!cityAutocomplete) return;
    const place = cityAutocomplete.getPlace();
    const name = (place?.address_components && extractPlaceName(place.address_components)) || place?.name || place?.formatted_address;
    if (!name) return;
    handleSelectCity(name);
  };

  const handleAreaPlaceChanged = () => {
    if (!areaAutocomplete) return;
    const place = areaAutocomplete.getPlace();
    const name = (place?.address_components && extractPlaceName(place.address_components)) || place?.name || place?.formatted_address;
    if (!name) return;
    handleSelectArea(name);
  };

  const handleDetectLiveLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    const toastId = toast.loading('Detecting your live location...');
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true });
      });
      const { latitude, longitude } = pos.coords;
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const data = await res.json();
      const detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || data.address?.county || '';
      const detectedLocality = data.address?.suburb || data.address?.neighbourhood || data.address?.residential || data.address?.road || '';
      
      toast.dismiss(toastId);
      if (detectedCity) {
        toast.success(`Location detected: ${detectedLocality ? `${detectedLocality}, ` : ''}${detectedCity}`);
        handleSelectCity(detectedCity);
        if (detectedLocality) {
          setSelectedArea(detectedLocality);
        }
      } else {
        toast.error("Couldn't identify your city automatically. Please select from the list.");
      }
    } catch (err) {
      console.error('Location detection error:', err);
      toast.dismiss(toastId);
      toast.error('Could not detect location. Please check browser permissions.');
    } finally {
      setDetectingLocation(false);
    }
  };

  // Only reset modal state when isOpen transitions from false -> true (prevents parent re-renders from resetting step)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setStep('city');
      setCitySearchQuery('');
      setAreaSearchQuery('');
      if (initialCity) setSelectedCity(initialCity);
      if (initialTab) setActiveTabKey(initialTab);
      if (initialMinPrice) setMinPrice(initialMinPrice);
      if (initialMaxPrice) setMaxPrice(initialMaxPrice);
      if (initialBedrooms?.length) setSelectedBhks(initialBedrooms);
      if (initialConstructionStatus?.length) setSelectedStatus(initialConstructionStatus);
      if (initialPostedBy?.length) setSelectedPostedBy(initialPostedBy);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Fetch popular cities once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    setLoadingCities(true);
    propertyService.getPopularCities({ limit: 30 })
      .then((res) => {
        if (!isCancelled && res?.cities?.length > 0) {
          const merged = [...POPULAR_OPERATING_CITIES];
          res.cities.forEach((apiCity) => {
            const idx = merged.findIndex(m => m.city.toLowerCase() === apiCity.city.toLowerCase());
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], count: apiCity.count };
            } else {
              merged.push(apiCity);
            }
          });
          setOperatingCities(merged);
        }
      })
      .catch((err) => console.error("Failed to load cities:", err))
      .finally(() => {
        if (!isCancelled) setLoadingCities(false);
      });

    return () => { isCancelled = true; };
  }, [isOpen]);

  // Fetch popular areas whenever selected city changes
  useEffect(() => {
    if (!selectedCity) return;
    let isCancelled = false;
    setLoadingAreas(true);

    const normCity = selectedCity.toLowerCase().trim();
    propertyService.getPopularAreas(selectedCity)
      .then((res) => {
        if (!isCancelled && res?.areas?.length > 0) {
          setPopularAreas(res.areas);
        } else {
          const fallback = POPULAR_AREAS_BY_CITY[normCity] || [];
          setPopularAreas(fallback.map(name => ({ name, count: 0, isPopular: true })));
        }
      })
      .catch((err) => {
        console.error("Failed to load areas:", err);
        const fallback = POPULAR_AREAS_BY_CITY[normCity] || [];
        setPopularAreas(fallback.map(name => ({ name, count: 0, isPopular: true })));
      })
      .finally(() => {
        if (!isCancelled) setLoadingAreas(false);
      });

    return () => { isCancelled = true; };
  }, [selectedCity]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll and stop Lenis when open
  useEffect(() => {
    if (isOpen) {
      if (window.lenis) window.lenis.stop();
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('overflow-hidden');
    } else {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Filtered Cities list
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return operatingCities;
    const q = citySearchQuery.toLowerCase().trim();
    return operatingCities.filter(c => 
      c.city.toLowerCase().includes(q) || (c.state && c.state.toLowerCase().includes(q))
    );
  }, [operatingCities, citySearchQuery]);

  // Filtered Areas list
  const filteredAreas = useMemo(() => {
    if (!areaSearchQuery.trim()) return popularAreas;
    const q = areaSearchQuery.toLowerCase().trim();
    return popularAreas.filter(a => a.name.toLowerCase().includes(q));
  }, [popularAreas, areaSearchQuery]);

  if (!isOpen) return null;

  // Handlers for City & Area Selection
  const handleSelectCity = (cityName) => {
    setSelectedCity(cityName);
    setPreferredCity(cityName);
    setSelectedArea('');
    setAreaSearchQuery('');
    setStep('area'); // Advance to Step 2
  };

  const handleSelectArea = (areaName) => {
    setSelectedArea(areaName);
    setStep('filters'); // Advance directly to Step 3 (Filters) — NEVER skip!
  };

  // Toggle multi-select options
  const toggleItem = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleApplyPresetBudget = (preset) => {
    setMinPrice(preset.min);
    setMaxPrice(preset.max);
  };

  const handleResetFilters = () => {
    setSelectedPropertyTypes([]);
    setMinPrice('');
    setMaxPrice('');
    setSelectedBhks([]);
    setSelectedStatus([]);
    setSelectedPostedBy([]);
    setSelectedFurnishing([]);
    setSelectedAmenities([]);
  };

  // Step 4: Apply Filters and Navigate to Properties
  const handleApplyAndSearch = () => {
    const activeTab = TABS.find(t => t.key === activeTabKey) || TABS[0];
    const params = new URLSearchParams();

    // Preserve Location
    if (selectedCity) {
      params.set('city', selectedCity);
    }
    if (selectedArea && selectedArea !== 'All Areas') {
      params.set('areas', selectedArea);
    }

    // Preserve Category & Intent
    if (activeTab.transactionType) params.set('transactionType', activeTab.transactionType);
    if (activeTab.propertyCategory) params.set('propertyCategory', activeTab.propertyCategory);

    // Preserve Property Types
    if (selectedPropertyTypes.length > 0) {
      params.set('propertyType', selectedPropertyTypes.join(','));
    }

    // Preserve Budget
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    // Preserve BHK
    if (selectedBhks.length > 0) {
      params.set('bhkType', selectedBhks.join(','));
    }

    // Preserve Construction Status
    if (selectedStatus.length > 0) {
      params.set('availability', selectedStatus.join(','));
    }

    // Preserve Posted By
    if (selectedPostedBy.length > 0) {
      params.set('postedBy', selectedPostedBy.join(','));
    }

    // Preserve Furnishing
    if (selectedFurnishing.length > 0) {
      params.set('furnishing', selectedFurnishing.join(','));
    }

    // Preserve Amenities
    if (selectedAmenities.length > 0) {
      params.set('amenities', selectedAmenities.join(','));
    }

    const url = `/search?${params.toString()}`;
    const label = `${activeTab.label} in ${selectedArea ? `${selectedArea}, ` : ''}${selectedCity}`;
    addRecentSearch({ label, url });

    onClose?.();
    navigate(url);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        data-lenis-prevent="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-[100dvh] sm:h-[88vh] sm:max-h-[760px] sm:max-w-3xl bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ─── MODAL HEADER ─── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            {step !== 'city' && (
              <button
                onClick={() => {
                  if (step === 'filters') setStep('area');
                  else if (step === 'area') setStep('city');
                }}
                className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                title="Back"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                  Step {step === 'city' ? '1 of 3' : step === 'area' ? '2 of 3' : '3 of 3'}
                </span>
                <span className="text-[11px] font-semibold text-gray-400">
                  {step === 'city' ? 'Select City' : step === 'area' ? 'Select Area' : 'Customize Filters'}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight mt-0.5">
                {step === 'city' && 'Popular Cities in India'}
                {step === 'area' && `Popular Areas in ${selectedCity}`}
                {step === 'filters' && 'Refine Your Property Search'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── MODAL BODY CONTENT ─── */}
        <div 
          data-lenis-prevent="true"
          className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-6 touch-pan-y pb-12"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          
          {/* ════════ STEP 1: POPULAR CITIES ════════ */}
          {step === 'city' && (
            <div className="space-y-4">
              {placesLoaded ? (
                <Autocomplete
                  onLoad={(auto) => setCityAutocomplete(auto)}
                  onPlaceChanged={handleCityPlaceChanged}
                  options={{
                    componentRestrictions: { country: 'in' },
                    fields: ['name', 'address_components', 'formatted_address']
                  }}
                  className="w-full"
                >
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && citySearchQuery.trim()) {
                          handleSelectCity(citySearchQuery.trim());
                        }
                      }}
                      placeholder="Search any city or locality across India..."
                      autoFocus
                      className="w-full pl-11 pr-32 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] font-medium text-gray-900 focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleDetectLiveLocation}
                      disabled={detectingLocation}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50"
                    >
                      <MapPin size={13} className={detectingLocation ? 'animate-bounce text-orange-600' : ''} />
                      <span>{detectingLocation ? 'Detecting...' : 'Detect'}</span>
                    </button>
                  </div>
                </Autocomplete>
              ) : (
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={citySearchQuery}
                    onChange={(e) => setCitySearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && citySearchQuery.trim()) {
                        handleSelectCity(citySearchQuery.trim());
                      }
                    }}
                    placeholder="Search city across India..."
                    autoFocus
                    className="w-full pl-11 pr-32 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] font-medium text-gray-900 focus:bg-white focus:border-orange-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleDetectLiveLocation}
                    disabled={detectingLocation}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50"
                  >
                    <MapPin size={13} className={detectingLocation ? 'animate-bounce text-orange-600' : ''} />
                    <span>{detectingLocation ? 'Detecting...' : 'Detect'}</span>
                  </button>
                </div>
              )}

              {/* 1-Click Detect Location Card */}
              <button
                type="button"
                onClick={handleDetectLiveLocation}
                disabled={detectingLocation}
                className="w-full p-3 rounded-2xl border border-dashed border-orange-300 bg-orange-50/60 hover:bg-orange-50 hover:border-orange-400 text-left flex items-center justify-between transition-all active:scale-95 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform">
                    <MapPin size={16} className={detectingLocation ? 'animate-bounce' : ''} />
                  </div>
                  <div>
                    <span className="font-bold text-[14px] text-gray-900 flex items-center gap-1.5">
                      Detect My Current Location
                      <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">LIVE GPS</span>
                    </span>
                    <p className="text-[11px] text-gray-500">Auto-detect your city & nearby properties instantly</p>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-orange-600 flex items-center gap-1">
                  {detectingLocation ? 'Locating...' : 'Use GPS ›'}
                </span>
              </button>

              <div>
                <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Operating Cities with Active Listings
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {filteredCities.map((item) => {
                    const isCurrent = selectedCity.toLowerCase() === item.city.toLowerCase();
                    return (
                      <button
                        key={item.city}
                        type="button"
                        onClick={() => handleSelectCity(item.city)}
                        className={`group p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 cursor-pointer touch-manipulation ${
                          isCurrent 
                            ? 'border-orange-500 bg-orange-50/50 shadow-sm shadow-orange-500/10' 
                            : 'border-gray-200/80 bg-white hover:border-gray-300 hover:bg-gray-50/80 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            isCurrent ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600'
                          } transition-colors`}>
                            <MapPin size={14} />
                          </div>
                          {item.count > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                              {item.count} Listings
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[14px] text-gray-900 group-hover:text-orange-600 transition-colors">
                            {item.city}
                          </div>
                          {item.state && (
                            <div className="text-[11px] text-gray-400 font-medium">
                              {item.state}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════ STEP 2: POPULAR AREAS ════════ */}
          {step === 'area' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-orange-50/70 border border-orange-100 px-3.5 py-2.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-orange-600 shrink-0" />
                  <span className="text-[13px] font-bold text-gray-800">
                    City: <span className="text-orange-600">{selectedCity}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('city')}
                  className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer touch-manipulation"
                >
                  Change City
                </button>
              </div>

              {placesLoaded ? (
                <Autocomplete
                  onLoad={(auto) => setAreaAutocomplete(auto)}
                  onPlaceChanged={handleAreaPlaceChanged}
                  options={{
                    componentRestrictions: { country: 'in' },
                    fields: ['name', 'address_components', 'formatted_address']
                  }}
                  className="w-full"
                >
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={areaSearchQuery}
                      onChange={(e) => setAreaSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && areaSearchQuery.trim()) {
                          handleSelectArea(areaSearchQuery.trim());
                        }
                      }}
                      placeholder={`Search locality, society or landmark in ${selectedCity}...`}
                      autoFocus
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] font-medium text-gray-900 focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </Autocomplete>
              ) : (
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={areaSearchQuery}
                    onChange={(e) => setAreaSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && areaSearchQuery.trim()) {
                        handleSelectArea(areaSearchQuery.trim());
                      }
                    }}
                    placeholder={`Search locality or area in ${selectedCity}...`}
                    autoFocus
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] font-medium text-gray-900 focus:bg-white focus:border-orange-500 outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  Popular Localities & Neighbourhoods
                </p>

                {/* Option to explore All Areas */}
                <button
                  type="button"
                  onClick={() => handleSelectArea('All Areas')}
                  className="w-full mb-2.5 p-3 rounded-2xl border border-dashed border-orange-300 bg-orange-50/40 hover:bg-orange-50 hover:border-orange-400 text-left flex items-center justify-between transition-all active:scale-95 cursor-pointer touch-manipulation"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-orange-600" />
                    <div>
                      <span className="font-bold text-[14px] text-gray-900">Explore All Areas in {selectedCity}</span>
                      <p className="text-[11px] text-gray-500">Search city-wide across all neighbourhoods</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-orange-600" />
                </button>

                {loadingAreas ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-gray-400 font-medium">Loading areas in {selectedCity}...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredAreas.map((area) => {
                      const isSelected = selectedArea.toLowerCase() === area.name.toLowerCase();
                      return (
                        <button
                          key={area.name}
                          type="button"
                          onClick={() => handleSelectArea(area.name)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all active:scale-95 cursor-pointer touch-manipulation ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold' 
                              : 'border-gray-200/80 bg-white hover:border-orange-300 hover:bg-gray-50/80 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                            <span className="text-[13px] font-semibold truncate">{area.name}</span>
                          </div>
                          {area.count > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                              {area.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {filteredAreas.length === 0 && (
                      <div className="col-span-full py-6 text-center text-gray-400 text-xs font-medium">
                        No specific areas listed. Type your locality in the search bar above or click &quot;Explore All Areas&quot;.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ STEP 3: PROPERTY FILTERS ════════ */}
          {step === 'filters' && (
            <div className="space-y-5">
              {/* Selected Location Pill */}
              <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-orange-400 shrink-0" />
                  <span className="text-[13px] font-bold">
                    {selectedCity} {selectedArea && selectedArea !== 'All Areas' ? `› ${selectedArea}` : '› All Areas'}
                  </span>
                </div>
                <button
                  onClick={() => setStep('area')}
                  className="text-[11px] font-bold text-orange-400 hover:underline flex items-center gap-1"
                >
                  Change
                </button>
              </div>

              {/* 1. Transaction Type / Intent Tabs */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  I Want To
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-gray-100 p-1 rounded-2xl">
                  {TABS.map((tab) => {
                    const active = activeTabKey === tab.key;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setActiveTabKey(tab.key);
                          setSelectedPropertyTypes([]);
                        }}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all ${
                          active 
                            ? 'bg-white text-gray-900 font-bold shadow-sm' 
                            : 'text-gray-500 hover:text-gray-800 font-medium'
                        }`}
                      >
                        <Icon size={16} className={`mb-0.5 ${active ? 'text-orange-600' : 'text-gray-400'}`} />
                        <span className="text-[11px] leading-tight truncate w-full">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Property Subtypes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Property Type
                  </p>
                  {selectedPropertyTypes.length > 0 && (
                    <button
                      onClick={() => setSelectedPropertyTypes([])}
                      className="text-[10px] font-bold text-orange-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(PROPERTY_TYPES_BY_TAB[activeTabKey] || PROPERTY_TYPES_BY_TAB.buy).map((type) => {
                    const isSelected = selectedPropertyTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleItem(selectedPropertyTypes, setSelectedPropertyTypes, type)}
                        className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all active:scale-95 ${
                          isSelected 
                            ? 'border-gray-900 bg-gray-900 text-white shadow-sm' 
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Budget Range */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Budget (Price Range)
                </p>
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {BUDGET_PRESETS.map((p) => {
                    const isActive = minPrice === p.min && maxPrice === p.max;
                    return (
                      <button
                        key={p.label}
                        onClick={() => handleApplyPresetBudget(p)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                          isActive 
                            ? 'border-orange-500 bg-orange-50 text-orange-700' 
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                {/* Min / Max Dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Min Price</label>
                    <select
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-semibold text-gray-800 focus:bg-white focus:border-orange-500 outline-none"
                    >
                      {MIN_BUDGET_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Max Price</label>
                    <select
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-semibold text-gray-800 focus:bg-white focus:border-orange-500 outline-none"
                    >
                      {MAX_BUDGET_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. BHK Selection (for Residential) */}
              {activeTabKey !== 'plots' && activeTabKey !== 'commercial' && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    No. of Bedrooms (BHK)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {BHK_OPTIONS.map((bhk) => {
                      const isSelected = selectedBhks.includes(bhk);
                      return (
                        <button
                          key={bhk}
                          onClick={() => toggleItem(selectedBhks, setSelectedBhks, bhk)}
                          className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all active:scale-95 ${
                            isSelected 
                              ? 'border-gray-900 bg-gray-900 text-white shadow-sm' 
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {bhk}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Construction / Possession Status */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Construction Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CONSTRUCTION_STATUSES.map((status) => {
                    const isSelected = selectedStatus.includes(status);
                    return (
                      <button
                        key={status}
                        onClick={() => toggleItem(selectedStatus, setSelectedStatus, status)}
                        className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all active:scale-95 ${
                          isSelected 
                            ? 'border-gray-900 bg-gray-900 text-white shadow-sm' 
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Posted By */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Listed By
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POSTED_BY_OPTIONS.map((poster) => {
                    const isSelected = selectedPostedBy.includes(poster);
                    return (
                      <button
                        key={poster}
                        onClick={() => toggleItem(selectedPostedBy, setSelectedPostedBy, poster)}
                        className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all active:scale-95 ${
                          isSelected 
                            ? 'border-gray-900 bg-gray-900 text-white shadow-sm' 
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {poster}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Key Amenities */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Popular Amenities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITIES_OPTIONS.map((am) => {
                    const isSelected = selectedAmenities.includes(am);
                    return (
                      <button
                        key={am}
                        onClick={() => toggleItem(selectedAmenities, setSelectedAmenities, am)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all active:scale-95 ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold' 
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {am}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ─── MODAL FOOTER ─── */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-lg">
          {step === 'filters' ? (
            <>
              <button
                onClick={handleResetFilters}
                className="text-[12px] font-bold text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <RotateCcw size={13} />
                Reset
              </button>

              <button
                onClick={handleApplyAndSearch}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[13px] font-bold shadow-md shadow-orange-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Show Matching Properties</span>
                <ArrowRight size={15} />
              </button>
            </>
          ) : step === 'area' ? (
            <>
              <button
                onClick={() => setStep('city')}
                className="text-[12px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                ‹ Change City
              </button>

              <button
                onClick={() => handleSelectArea('All Areas')}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-[12px] font-bold active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>Continue to Filters</span>
                <ChevronRight size={15} />
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-[12px] text-gray-400 font-medium">
              <span>Select your city to view popular areas</span>
              <button
                onClick={() => handleSelectCity('Bengaluru')}
                className="text-orange-600 font-bold hover:underline"
              >
                Quick Bengaluru ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GuidedSearchFlowModal;
