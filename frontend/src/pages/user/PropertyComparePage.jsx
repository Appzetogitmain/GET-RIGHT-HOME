import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Trash2, Check, X, Search, Sparkles, 
  DollarSign, MapPin, Maximize, Home, Star, Layers, Activity, Info, Loader2 
} from 'lucide-react';
import { propertyService } from '../../services/apiService';
import { usePropertyNavigate } from '../../hooks/usePropertyNavigate';
import toast from 'react-hot-toast';

const PropertyComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { navigateToProperty } = usePropertyNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search properties to add
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef(null);

  // Active compare filter/basis
  const [activeBasis, setActiveBasis] = useState('custom'); // 'custom' | 'recent' | 'price' | 'type' | 'location' | 'area'

  // Helper: Format price
  const formatPrice = (p) => {
    if (!p) return 'N/A';
    if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
    if (p >= 100000) return `₹${(p / 100000).toFixed(1)} Lac`;
    return `₹${p.toLocaleString('en-IN')}`;
  };

  // Extract query IDs and fetch details
  useEffect(() => {
    const idsString = searchParams.get('ids');
    if (idsString) {
      fetchProperties(idsString.split(','));
    } else {
      // If no IDs in URL, fall back to recent views from localStorage
      const recentsRaw = localStorage.getItem('recentViews') || '[]';
      try {
        const recents = JSON.parse(recentsRaw);
        if (recents.length > 0) {
          fetchProperties(recents.slice(0, 3));
          setActiveBasis('recent');
        } else {
          setProperties([]);
          setLoading(false);
        }
      } catch (e) {
        setProperties([]);
        setLoading(false);
      }
    }
  }, [searchParams]);

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProperties = async (idsList) => {
    setLoading(true);
    try {
      const validIds = idsList.filter(id => id && id.length === 24);
      if (validIds.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }
      const response = await propertyService.getPublic({ ids: validIds.join(',') });
      const fetched = Array.isArray(response) ? response : (response && Array.isArray(response.properties) ? response.properties : []);
      
      // Maintain the order of IDs as passed in the parameters
      const orderedFetched = validIds.map(id => fetched.find(p => p._id === id)).filter(Boolean);
      setProperties(orderedFetched);
    } catch (e) {
      toast.error('Failed to fetch properties for comparison');
    } finally {
      setLoading(false);
    }
  };

  // Search input typing handler
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        searchProperties(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchProperties = async (query) => {
    setSearchLoading(true);
    try {
      const response = await propertyService.getPublic({ search: query });
      const fetched = Array.isArray(response) ? response : (response && Array.isArray(response.properties) ? response.properties : []);
      // Filter out already compared properties
      const filtered = fetched.filter(p => !properties.some(curr => curr._id === p._id));
      setSearchResults(filtered);
      setShowSearchDropdown(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add property to comparison list
  const addPropertyToComparison = (prop) => {
    if (properties.length >= 4) {
      toast.error('You can compare a maximum of 4 properties side-by-side.');
      return;
    }
    const newProperties = [...properties, prop];
    const newIds = newProperties.map(p => p._id).join(',');
    setSearchParams({ ids: newIds });
    setSearchQuery('');
    setShowSearchDropdown(false);
    setActiveBasis('custom');
    toast.success(`${prop.propertyName || prop.name} added to comparison`);
  };

  // Remove property from comparison list
  const removePropertyFromComparison = (id) => {
    const newProperties = properties.filter(p => p._id !== id);
    const newIds = newProperties.map(p => p._id).join(',');
    if (newIds) {
      setSearchParams({ ids: newIds });
    } else {
      setSearchParams({});
    }
    setActiveBasis('custom');
  };

  // Load basis comparisons dynamically from database
  const handleBasisSelect = async (basis) => {
    setActiveBasis(basis);
    if (properties.length === 0) {
      toast.error('Please add at least one property to serve as comparison base.');
      return;
    }
    const referenceProp = properties[0];
    setLoading(true);
    
    try {
      let queryParams = {};
      if (basis === 'recent') {
        const recentsRaw = localStorage.getItem('recentViews') || '[]';
        const recents = JSON.parse(recentsRaw).filter(id => id !== referenceProp._id).slice(0, 3);
        if (recents.length === 0) {
          toast.error('No other recently viewed properties found.');
          setLoading(false);
          return;
        }
        queryParams = { ids: recents.join(',') };
      }
      else if (basis === 'price') {
        const refPrice = referenceProp.buyDetails?.expectedPrice || referenceProp.rentDetails?.monthlyRent || referenceProp.dynamicData?.expectedPrice || referenceProp.dynamicData?.monthlyRent || referenceProp.startingPrice || 0;
        if (refPrice === 0) {
          toast.error('Base property has no price details.');
          setLoading(false);
          return;
        }
        // Price bracket +/- 35% to include surrounding price ranges (aaspas range)
        queryParams = {
          minPrice: refPrice * 0.65,
          maxPrice: refPrice * 1.35,
          transactionType: referenceProp.transactionType
        };
      }
      else if (basis === 'type') {
        queryParams = {
          type: referenceProp.dynamicCategory || referenceProp.propertyType
        };
      }
      else if (basis === 'location') {
        queryParams = {
          city: referenceProp.address?.city,
          areas: referenceProp.address?.locality || referenceProp.address?.area
        };
      }
      else if (basis === 'area') {
        const refArea = referenceProp.buyDetails?.area?.superBuiltUp || referenceProp.plotDetails?.plotArea || referenceProp.dynamicData?.carpetArea || referenceProp.dynamicData?.superArea || 0;
        if (refArea === 0) {
          toast.error('Base property has no area details.');
          setLoading(false);
          return;
        }
        queryParams = {
          minArea: refArea * 0.8,
          maxArea: refArea * 1.2
        };
      }

      if (basis !== 'custom') {
        const res = await propertyService.getPublic(queryParams);
        const list = Array.isArray(res) ? res : (res && Array.isArray(res.properties) ? res.properties : []);
        // Exclude current reference and take up to 3 similar properties
        const filteredList = list.filter(item => item._id !== referenceProp._id).slice(0, 3);
        
        if (filteredList.length === 0) {
          toast.error('No matching properties found in database.');
        } else {
          const combined = [referenceProp, ...filteredList];
          setSearchParams({ ids: combined.map(p => p._id).join(',') });
          toast.success(`Comparing ${combined.length} properties based on ${basis}`);
        }
      }
    } catch (e) {
      toast.error('Error fetching similar properties');
    } finally {
      setLoading(false);
    }
  };

  // Extract fields from property document
  const getPropPrice = (p) => {
    const buyPrice = p.buyDetails?.expectedPrice;
    const rentPrice = p.rentDetails?.monthlyRent;
    const dynPrice = p.dynamicData?.expectedPrice || p.dynamicData?.monthlyRent;
    const startPrice = p.startingPrice;
    const isRent = rentPrice || (p.transactionType && p.transactionType.toLowerCase().includes('rent'));
    const finalVal = buyPrice || rentPrice || dynPrice || startPrice || 0;
    return formatPrice(finalVal) + (isRent ? '/mo' : '');
  };

  const getPropArea = (p) => {
    const superArea = p.buyDetails?.area?.superBuiltUp;
    const carpetArea = p.buyDetails?.area?.carpet || p.dynamicData?.carpetArea || p.dynamicData?.superArea;
    const plotArea = p.plotDetails?.plotArea || p.dynamicData?.plotArea;
    const finalVal = superArea || carpetArea || plotArea || '';
    return finalVal ? `${finalVal} sq.ft.` : 'N/A';
  };

  const getPropType = (p) => {
    return p.propertyType ? (p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1)) : 'Residential';
  };

  const getPropRooms = (p) => {
    if (p.propertyType?.toLowerCase() === 'plot') return 'N/A';
    const bhk = p.rentDetails?.type || p.buyDetails?.bhk || p.dynamicData?.bhk || '';
    if (bhk) return `${bhk} BHK`;
    // For Hostels/PGs count inventory/rooms
    return p.inventory && p.inventory.length > 0 ? `${p.inventory.length} Room Types` : '1 BHK';
  };

  // Compile unique list of amenities across all properties
  const allAmenitiesList = Array.from(
    new Set(properties.flatMap(p => p.amenities || []))
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white border-b border-slate-100 z-50 px-4 py-4 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                Compare Properties <Sparkles size={16} className="text-indigo-600 fill-indigo-100" />
              </h1>
              <p className="text-xs text-slate-400 font-semibold">Side-by-side comparison matrix</p>
            </div>
          </div>

          {/* Add property Search Bar */}
          <div className="relative w-full md:w-80" ref={searchDropdownRef}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Add property to compare..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={14} />
              )}
            </div>

            {/* Search Dropdown */}
            <AnimatePresence>
              {showSearchDropdown && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-[60] p-1.5 space-y-1"
                >
                  {searchResults.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => addPropertyToComparison(p)}
                      className="flex gap-2.5 items-center p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <img
                        src={p.coverImage || p.images?.cover || (p.propertyImages?.[0]) || '/placeholder-property.jpg'}
                        className="w-10 h-10 object-cover rounded-md shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-black text-slate-800 truncate">{p.propertyName || p.name}</h4>
                        <p className="text-[9px] text-slate-400 font-bold truncate">
                          {p.address?.locality || p.address?.area}, {p.address?.city}
                        </p>
                        <p className="text-[10px] text-indigo-600 font-black mt-0.5">{getPropPrice(p)}</p>
                      </div>
                      <Plus size={14} className="text-slate-400 group-hover:text-indigo-600" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Quick Basis Filters */}
        {properties.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Compare basis</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'custom', label: 'Manual Comparison' },
                { id: 'recent', label: 'Recent Views' },
                { id: 'price', label: 'Similar Price' },
                { id: 'type', label: 'Same Property Type' },
                { id: 'location', label: 'Same Locality' },
                { id: 'area', label: 'Similar Area' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => btn.id === 'custom' ? setActiveBasis('custom') : handleBasisSelect(btn.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                    activeBasis === btn.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading comparison details...</p>
          </div>
        ) : properties.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm max-w-md mx-auto mt-10">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Layers className="text-slate-400" size={24} />
            </div>
            <h2 className="text-base font-black text-slate-900 mb-1.5">No properties added yet</h2>
            <p className="text-xs text-slate-400 font-medium mb-6">
              Search for properties above or go back to properties list to start comparing listings.
            </p>
            <button 
              onClick={() => navigate('/search')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-100"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          /* Side-by-side Matrix Grid */
          <div className="bg-white border border-slate-150 rounded-3xl overflow-x-auto no-scrollbar shadow-md">
            
            {/* Header Columns: Images & Title */}
            <div className="grid border-b border-slate-100 bg-slate-50/20" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              
              {/* Reference Label Cell */}
              <div className="p-4 flex flex-col justify-end border-r border-slate-100">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Features</span>
              </div>

              {/* Property Details Columns */}
              {properties.map((p, idx) => (
                <div key={p._id} className="p-4 border-r border-slate-100 relative group flex flex-col justify-between min-h-[220px]">
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removePropertyFromComparison(p._id)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-100 transition-colors shadow-sm z-10"
                  >
                    <Trash2 size={12} />
                  </button>

                  {/* Property Cover */}
                  <div>
                    <div className="relative rounded-xl overflow-hidden shadow-inner h-24 mb-3 border border-slate-100">
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-sm z-10">
                          Base
                        </span>
                      )}
                      <img
                        src={p.coverImage || p.images?.cover || (p.propertyImages?.[0]) || '/placeholder-property.jpg'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h3 
                      onClick={() => navigateToProperty(p)}
                      className="text-xs font-extrabold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-2 leading-tight"
                    >
                      {p.propertyName || p.name}
                    </h3>
                    
                    <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-0.5">
                      <MapPin size={10} className="text-slate-400" />
                      {p.address?.locality || p.address?.area || p.address?.city || ''}
                    </p>
                  </div>

                  {/* Direct Details Page Link */}
                  <button 
                    onClick={() => navigateToProperty(p)}
                    className="w-full mt-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg transition-colors uppercase tracking-wider"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* Price Row */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <DollarSign size={14} className="text-indigo-500" />
                <span className="text-[11px] font-black text-slate-700 uppercase">Price</span>
              </div>
              {properties.map((p) => (
                <div key={p._id} className="p-4 border-r border-slate-100 flex items-center">
                  <span className="text-xs font-black text-slate-900">{getPropPrice(p)}</span>
                </div>
              ))}
            </div>

            {/* Type Row */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Home size={14} className="text-indigo-500" />
                <span className="text-[11px] font-black text-slate-700 uppercase">Property Type</span>
              </div>
              {properties.map((p) => (
                <div key={p._id} className="p-4 border-r border-slate-100 flex items-center">
                  <span className="text-xs font-bold text-slate-600">{getPropType(p)}</span>
                </div>
              ))}
            </div>

            {/* Rooms/BHK Row */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Layers size={14} className="text-indigo-500" />
                <span className="text-[11px] font-black text-slate-700 uppercase">BHK / Configuration</span>
              </div>
              {properties.map((p) => (
                <div key={p._id} className="p-4 border-r border-slate-100 flex items-center">
                  <span className="text-xs font-bold text-slate-600">{getPropRooms(p)}</span>
                </div>
              ))}
            </div>

            {/* Area Row */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Maximize size={14} className="text-indigo-500" />
                <span className="text-[11px] font-black text-slate-700 uppercase">Area Size</span>
              </div>
              {properties.map((p) => (
                <div key={p._id} className="p-4 border-r border-slate-100 flex items-center">
                  <span className="text-xs font-bold text-slate-600">{getPropArea(p)}</span>
                </div>
              ))}
            </div>

            {/* Availability Row */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Activity size={14} className="text-indigo-500" />
                <span className="text-[11px] font-black text-slate-700 uppercase">Availability</span>
              </div>
              {properties.map((p) => {
                const availStatus = p.dynamicData?.availability || p.dynamicData?.availabilityStatus || 'Ready to Move';
                return (
                  <div key={p._id} className="p-4 border-r border-slate-100 flex items-center">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      availStatus.toLowerCase().includes('ready')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {availStatus}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rating Row */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Star size={14} className="text-indigo-500" />
                <span className="text-[11px] font-black text-slate-700 uppercase">Average Rating</span>
              </div>
              {properties.map((p) => (
                <div key={p._id} className="p-4 border-r border-slate-100 flex items-center gap-1">
                  <span className="text-xs font-black text-slate-800">{p.avgRating ? p.avgRating.toFixed(1) : 'No Ratings'}</span>
                  {p.avgRating > 0 && <Star size={12} className="fill-amber-400 text-amber-400" />}
                </div>
              ))}
            </div>

            {/* Locality Info Row */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Info size={14} className="text-indigo-500" />
                <span className="text-[11px] font-black text-slate-700 uppercase">Full Location</span>
              </div>
              {properties.map((p) => (
                <div key={p._id} className="p-4 border-r border-slate-100 flex items-center">
                  <span className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {p.address?.locality || p.address?.area ? `${p.address.locality || p.address.area}, ` : ''}
                    {p.address?.city}, {p.address?.state || ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Amenities Section Label Row */}
            <div className="grid border-b border-slate-100 bg-slate-50/30" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
              <div className="p-3 border-r border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                Amenities Matrix
              </div>
              {properties.map((p) => (
                <div key={p._id} className="p-3 border-r border-slate-100" />
              ))}
            </div>

            {/* Loop over each unique amenity */}
            {allAmenitiesList.map((amenity) => (
              <div key={amenity} className="grid border-b border-slate-100 hover:bg-slate-50/30 transition-colors" style={{ gridTemplateColumns: `180px repeat(${properties.length}, minmax(200px, 1fr))` }}>
                <div className="p-3 border-r border-slate-100 bg-slate-50/50 flex items-center">
                  <span className="text-[11px] font-bold text-slate-700 truncate">{amenity}</span>
                </div>
                {properties.map((p) => {
                  const hasAmenity = (p.amenities || []).some(
                    am => am.toLowerCase() === amenity.toLowerCase()
                  );
                  return (
                    <div key={p._id} className="p-3 border-r border-slate-100 flex items-center">
                      {hasAmenity ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                          <Check size={14} className="text-emerald-500 stroke-[3]" />
                          <span>Yes</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-300 text-xs font-medium">
                          <X size={14} className="text-slate-300 stroke-[2]" />
                          <span>No</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
};

export default PropertyComparePage;
