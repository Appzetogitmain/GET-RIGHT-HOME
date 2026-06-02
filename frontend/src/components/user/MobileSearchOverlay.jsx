import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, History, Crosshair, ChevronDown, Building, Home, Building2, Map, LayoutGrid, CheckCircle2, Construction, Clock, Briefcase } from 'lucide-react';
import { bengaluruAreas } from '../../data/locationData';

const MobileSearchOverlay = ({ isOpen, onClose, initialFilters, onApplyFilters }) => {
    const [step, setStep] = useState(1);
    const [txnType, setTxnType] = useState('Buy');
    const [searchInput, setSearchInput] = useState('');
    const [selectedLocations, setSelectedLocations] = useState([]);
    
    // Common Filters
    const [minBudget, setMinBudget] = useState('No Min');
    const [maxBudget, setMaxBudget] = useState('No Max');
    const [propertyTypes, setPropertyTypes] = useState([]);
    const [bedrooms, setBedrooms] = useState([]);
    const [constructionStatus, setConstructionStatus] = useState([]);
    const [radius, setRadius] = useState('3 km');

    const [amenities, setAmenities] = useState([]);
    const [postedBy, setPostedBy] = useState([]);
    const [purchaseType, setPurchaseType] = useState([]);
    const [minArea, setMinArea] = useState('No Min');
    const [maxArea, setMaxArea] = useState('No Max');
    const [minBathrooms, setMinBathrooms] = useState(0);
    const [furnishingStatus, setFurnishingStatus] = useState([]);
    const [reraApproved, setReraApproved] = useState(false);
    
    // Rent/PG specific
    const [lookingFor, setLookingFor] = useState('Rent'); // 'Rent' or 'PG/Co-living'
    const [availableFor, setAvailableFor] = useState([]); // Family, etc. or Girls, Boys
    const [availableFrom, setAvailableFrom] = useState([]);
    
    // PG Specific
    const [sharing, setSharing] = useState([]);
    const [pgServices, setPgServices] = useState([]);
    const [totalCapacity, setTotalCapacity] = useState([]);
    const [attachWashroom, setAttachWashroom] = useState(false);

    // Commercial specific
    const [lookingTo, setLookingTo] = useState('Commercial Buy'); // 'Commercial Buy' or 'Commercial Lease'
    const [officeSpaceType, setOfficeSpaceType] = useState([]);
    const [ageOfProperty, setAgeOfProperty] = useState([]);

    const [showAdvanced, setShowAdvanced] = useState(false);

    const [recentSearches, setRecentSearches] = useState([]);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('grh_recent_searches') || '[]');
            setRecentSearches(saved);
        } catch(e) {}
    }, []);

    const saveSearch = (locs) => {
        if (!locs || locs.length === 0) return;
        const newSearch = { txnType, locations: locs, id: Date.now() };
        const updated = [newSearch, ...recentSearches].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('grh_recent_searches', JSON.stringify(updated));
    };

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            if (initialFilters.categoryTab === 'Rent / Lease' || initialFilters.categoryTab === 'Paying Guest') {
                setTxnType('Rent/PG');
                setLookingFor(initialFilters.categoryTab === 'Paying Guest' ? 'PG/Co-living' : 'Rent');
            } else if (initialFilters.propertyCategory === 'Commercial') {
                setTxnType('Commercial');
            } else {
                setTxnType('Buy');
            }
            if (initialFilters.areas && initialFilters.areas.length > 0) {
                setSelectedLocations(initialFilters.areas);
            }
        }
    }, [isOpen, initialFilters]);

    if (!isOpen) return null;

    const popularLocalities = ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Electronic City', 'Marathahalli', 'Jayanagar', 'JP Nagar', 'Bellandur'];
    
    const suggestedLocations = searchInput 
        ? bengaluruAreas.filter(a => a.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 8)
        : [];

    const handleSelectLocation = (loc) => {
        if (!selectedLocations.includes(loc)) {
            setSelectedLocations([...selectedLocations, loc]);
        }
        setSearchInput('');
    };

    const handleRemoveLocation = (loc) => {
        setSelectedLocations(selectedLocations.filter(l => l !== loc));
    };

    const toggleArray = (arr, setArr, val) => {
        if (arr.includes(val)) {
            setArr(arr.filter(v => v !== val));
        } else {
            setArr([...arr, val]);
        }
    };

    const handleApply = () => {
        saveSearch(selectedLocations);
        
        let allAmenities = [
            ...constructionStatus, 
            ...furnishingStatus, 
            ...amenities, 
            ...availableFor, 
            ...availableFrom, 
            ...ageOfProperty,
            ...sharing,
            ...pgServices,
            ...totalCapacity
        ];
        
        if (officeSpaceType.length > 0) allAmenities = [...allAmenities, ...officeSpaceType];
        if (attachWashroom) allAmenities.push('Attached Washroom');

        let categoryTabVal = 'Sell';
        if (txnType === 'Rent/PG') {
            categoryTabVal = lookingFor === 'PG/Co-living' ? 'Paying Guest' : 'Rent / Lease';
        }

        const finalFilters = {
            categoryTab: categoryTabVal,
            propertyCategory: txnType === 'Commercial' ? 'Commercial' : 'Residential',
            areas: selectedLocations.filter(l => l !== 'Current Location'),
            radius: selectedLocations.includes('Current Location') ? parseInt(radius) : 50,
            minPrice: minBudget === 'No Min' ? '' : minBudget,
            maxPrice: maxBudget === 'No Max' ? '' : maxBudget,
            minArea: minArea === 'No Min' ? '' : minArea,
            maxArea: maxArea === 'No Max' ? '' : maxArea,
            propertyTypes: propertyTypes,
            bhkType: bedrooms.join(','), 
            amenities: allAmenities.join(','),
            postedBy: postedBy.join(','),
            purchaseType: txnType === 'Commercial' ? lookingTo : purchaseType.join(','),
            bathrooms: minBathrooms > 0 ? minBathrooms : '',
            reraApproved: reraApproved ? 'Yes' : ''
        };
        onApplyFilters(finalFilters);
        onClose();
    };

    const getPropertyTypesList = () => {
        if (txnType === 'Buy') {
            return [
                { label: 'Flat/Apartment', icon: <Building2 size={16} /> },
                { label: 'Independent House/Villa', icon: <Home size={16} /> },
                { label: 'Residential Land', icon: <Map size={16} /> },
                { label: 'Builder Floor', icon: <LayoutGrid size={16} /> },
                { label: 'Serviced Apartments', icon: <Building size={16} /> },
                { label: '1 RK/ Studio Apartment', icon: <Building2 size={16} /> },
                { label: 'Farm House', icon: <Home size={16} /> },
                { label: 'Other', icon: <Building size={16} /> }
            ];
        } else if (txnType === 'Rent/PG') {
            return [
                { label: 'Flat/Apartment', icon: <Building2 size={16} /> },
                { label: 'Builder Floor', icon: <LayoutGrid size={16} /> },
                { label: '1 RK/ Studio Apartment', icon: <Building2 size={16} /> },
                { label: 'Independent House/Villa', icon: <Home size={16} /> },
                { label: 'Serviced Apartment', icon: <Building size={16} /> },
                { label: 'Farm House', icon: <Home size={16} /> }
            ];
        } else {
            return [
                { label: 'Office Spaces', icon: <Briefcase size={16} /> },
                { label: 'Retail Shops/ Showroom', icon: <Building size={16} /> },
                { label: 'Other commercial spaces', icon: <Building2 size={16} /> }
            ];
        }
    };

    const renderStep1 = () => (
        <div className="flex-1 flex flex-col min-h-0 bg-white animate-in slide-in-from-bottom-4 duration-300">
            {/* Top Bar & Tabs */}
            <div className="bg-surface pt-4 px-4 pb-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex bg-white/20 p-1 rounded-full text-white text-[11px]">
                        {['Buy', 'Rent/PG', 'Commercial'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setTxnType(t)}
                                className={`px-4 py-1.5 rounded-full transition-colors ${txnType === t ? 'bg-white text-surface font-bold shadow-sm' : 'text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                
                {/* Search Input Box */}
                <div className="relative bg-white rounded-lg p-1.5 flex items-center shadow-md">
                    <div className="flex-1 flex flex-wrap gap-1 px-2 items-center">
                        {selectedLocations.map(loc => (
                            <div key={loc} className="flex items-center gap-1 bg-surface/10 text-surface px-2 py-1 rounded-md text-[11px] font-semibold">
                                {loc}
                                <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveLocation(loc)} />
                            </div>
                        ))}
                        <input 
                            type="text" 
                            placeholder={selectedLocations.length === 0 ? "Search Locality, Projects, Landmarks.." : ""}
                            className="flex-1 min-w-[120px] outline-none text-[12px] text-gray-800 py-1"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => handleSelectLocation('Current Location')}
                        className="p-2 text-surface hover:bg-surface/10 rounded-full transition-colors"
                    >
                        <Crosshair size={18} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-gray-50 pb-20">
                {searchInput ? (
                    <div className="bg-white">
                        {suggestedLocations.map(loc => (
                            <div 
                                key={loc} 
                                className="flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSelectLocation(loc)}
                            >
                                <MapPin size={16} className="text-gray-400" />
                                <div>
                                    <div className="text-[12px] font-semibold text-gray-800">{loc}</div>
                                    <div className="text-[10px] text-gray-500">Locality</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* History */}
                        {recentSearches.length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3">Last searched..</h3>
                                <div className="bg-white rounded-lg border border-gray-200">
                                    {recentSearches.map((s, idx) => (
                                        <div key={s.id || idx} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50" onClick={() => {
                                            setSelectedLocations(s.locations);
                                            setTxnType(s.txnType);
                                            setStep(2);
                                        }}>
                                            <div className="flex items-center gap-2 text-[12px] text-gray-600">
                                                <History size={14} />
                                                {s.txnType} in {s.locations.join(', ')}
                                            </div>
                                            <span className="text-gray-400 text-[14px] leading-none">↗</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Popular */}
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-800 mb-3">Popular localities in Bengaluru</h3>
                            <div className="flex flex-wrap gap-2">
                                {popularLocalities.map(loc => (
                                    <button 
                                        key={loc}
                                        onClick={() => handleSelectLocation(loc)}
                                        className="px-3 py-1.5 border border-gray-200 bg-white rounded-md text-[11px] font-medium text-gray-700 flex items-center gap-1"
                                    >
                                        <span className="text-gray-400">+</span> {loc}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="shrink-0 p-3 bg-white border-t border-gray-200 flex items-center justify-between z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={() => { setSelectedLocations([]); setSearchInput(''); }}
                    className="text-[12px] font-bold text-surface px-4"
                >
                    Clear
                </button>
                <button 
                    onClick={() => {
                        if (selectedLocations.length > 0) setStep(2);
                        else alert('Please select a locality first');
                    }}
                    className="bg-surface text-white px-8 py-2.5 rounded-lg text-[12px] font-bold flex items-center gap-2 hover:bg-surface/90 transition-colors"
                >
                    Next <span>→</span>
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50 animate-in slide-in-from-right duration-300">
            {/* Top Bar */}
            <div className="bg-surface pt-4 px-4 pb-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex bg-white/20 p-1 rounded-full text-white text-[11px]">
                        {['Buy', 'Rent/PG', 'Commercial'].map(t => (
                            <button 
                                key={t}
                                onClick={() => {
                                    setTxnType(t);
                                    setShowAdvanced(false);
                                }}
                                className={`px-4 py-1.5 rounded-full transition-colors ${txnType === t ? 'bg-white text-surface font-bold shadow-sm' : 'text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                
                {/* Search Input Box */}
                <div className="relative bg-white rounded-lg p-1.5 flex items-center shadow-md">
                    <button onClick={() => setStep(1)} className="flex items-center gap-1 text-surface text-[11px] font-bold px-2 border-r border-gray-200 mr-2 hover:bg-surface/10 rounded-md py-1 transition-colors">
                        <Search size={12} /> Add
                    </button>
                    <div className="flex-1 flex flex-wrap gap-1 px-1 items-center">
                        {selectedLocations.map(loc => (
                            <div key={loc} className="flex items-center gap-1 bg-surface/10 text-surface px-2 py-1 rounded-md text-[11px] font-semibold">
                                {loc}
                                <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveLocation(loc)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Radius for Current Location */}
                {selectedLocations.includes('Current Location') && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3">Show Properties within</h3>
                        <div className="flex items-center gap-2">
                            {['1 km', '3 km', '5 km', '10 km'].map(rad => (
                                <button
                                    key={rad}
                                    onClick={() => setRadius(rad)}
                                    className={`flex-1 py-2 rounded-lg border text-[11px] font-semibold transition-colors ${radius === rad ? 'border-surface bg-surface/10 text-surface' : 'border-gray-200 bg-white text-gray-700'}`}
                                >
                                    {rad}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pre-Budget dynamic sections */}
                {txnType === 'Rent/PG' && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3">Looking to</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Rent', 'PG/Co-living'].map(lf => (
                                <button 
                                    key={lf}
                                    onClick={() => {
                                        setLookingFor(lf);
                                        // Reset specific arrays when switching
                                        setAvailableFor([]);
                                        setFurnishingStatus([]);
                                    }}
                                    className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${lookingFor === lf ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                >
                                    {lf}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {txnType === 'Commercial' && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3">Looking to</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Commercial Buy', 'Commercial Lease'].map(lt => (
                                <button 
                                    key={lt}
                                    onClick={() => setLookingTo(lt)}
                                    className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${lookingTo === lt ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                >
                                    {lt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Budget */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="text-[11px] font-bold text-gray-800 mb-3">Budget in ₹</h3>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <select className="w-full appearance-none border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-[12px] text-gray-700 outline-none"
                                value={minBudget} onChange={e => setMinBudget(e.target.value)}>
                                <option value="No Min">No Min</option>
                                <option value="10000">10 K</option>
                                <option value="50000">50 K</option>
                                <option value="100000">1 Lac</option>
                                <option value="1000000">10 Lac</option>
                                <option value="2500000">25 Lac</option>
                                <option value="5000000">50 Lac</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <span className="text-gray-400 text-[12px]">to</span>
                        <div className="flex-1 relative">
                            <select className="w-full appearance-none border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-[12px] text-gray-700 outline-none"
                                value={maxBudget} onChange={e => setMaxBudget(e.target.value)}>
                                <option value="No Max">No Max</option>
                                <option value="50000">50 K</option>
                                <option value="100000">1 Lac</option>
                                <option value="5000000">50 Lac</option>
                                <option value="10000000">1 Cr</option>
                                <option value="50000000">5 Cr</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Sharing (PG Only) */}
                {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Sharing</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Private Rooms', '2 Per Room', 'More than 2 per room'].map(sh => (
                                <button 
                                    key={sh}
                                    onClick={() => toggleArray(sharing, setSharing, sh)}
                                    className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${sharing.includes(sh) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                >
                                    {sh}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* No. of Bedrooms (Buy and Rent Only, Not PG) */}
                {(txnType === 'Buy' || (txnType === 'Rent/PG' && lookingFor === 'Rent')) && (
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">No. of Bedrooms</h3>
                        <div className="flex flex-wrap gap-2">
                            {['1 RK/1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'].map(bhk => (
                                <button 
                                    key={bhk}
                                    onClick={() => toggleArray(bedrooms, setBedrooms, bhk)}
                                    className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${bedrooms.includes(bhk) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                >
                                    {bhk}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Property Types */}
                <div>
                    <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">
                        {txnType === 'Commercial' ? 'Commercial property types' : 'Property types'}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        {getPropertyTypesList().map(pt => (
                            <div 
                                key={pt.label}
                                onClick={() => toggleArray(propertyTypes, setPropertyTypes, pt.label)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center cursor-pointer transition-colors ${propertyTypes.includes(pt.label) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-surface/30'}`}
                            >
                                <div className="mb-2 opacity-80">{pt.icon}</div>
                                <span className="text-[9px] font-semibold leading-tight">{pt.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Available For (PG Only outside) */}
                {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Available For</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Girls', 'Boys'].map(af => (
                                <button 
                                    key={af}
                                    onClick={() => toggleArray(availableFor, setAvailableFor, af)}
                                    className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${availableFor.includes(af) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                >
                                    {af}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Furnishing Status (Rent outside advanced) */}
                {txnType === 'Rent/PG' && lookingFor === 'Rent' && (
                    <div className="mt-2">
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Furnishing status</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Furnished', 'Semi-furnished', 'Unfurnished'].map(fs => (
                                <button 
                                    key={fs}
                                    onClick={() => toggleArray(furnishingStatus, setFurnishingStatus, fs)}
                                    className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${furnishingStatus.includes(fs) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                >
                                    {fs}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Type of office spaces (Commercial Only) */}
                {txnType === 'Commercial' && propertyTypes.includes('Office Spaces') && (
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Type of office spaces</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Ready to move office space', 'Bare shell office space', 'Co-working office space'].map(os => (
                                <button 
                                    key={os}
                                    onClick={() => toggleArray(officeSpaceType, setOfficeSpaceType, os)}
                                    className={`px-3 py-2 border rounded-md text-[11px] font-semibold transition-colors ${officeSpaceType.includes(os) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                >
                                    {os}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Area (Commercial puts area before advanced filters, others put it inside) */}
                {txnType === 'Commercial' && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3">Area <span className="text-surface font-normal">sq.ft. <ChevronDown size={10} className="inline"/></span></h3>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <select className="w-full appearance-none border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-[12px] text-gray-700 outline-none hover:border-surface/30 focus:border-surface"
                                    value={minArea} onChange={e => setMinArea(e.target.value)}>
                                    <option value="No Min">No Min</option>
                                    <option value="500">500</option>
                                    <option value="1000">1000</option>
                                    <option value="2000">2000</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <span className="text-gray-400 text-[12px]">to</span>
                            <div className="flex-1 relative">
                                <select className="w-full appearance-none border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-[12px] text-gray-700 outline-none hover:border-surface/30 focus:border-surface"
                                    value={maxArea} onChange={e => setMaxArea(e.target.value)}>
                                    <option value="No Max">No Max</option>
                                    <option value="1000">1000</option>
                                    <option value="2000">2000</option>
                                    <option value="5000">5000</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Construction Status (Buy Only) */}
                {txnType === 'Buy' && (
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Construction status</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Ready to move', icon: <CheckCircle2 size={16} /> },
                                { label: 'New Launch', icon: <Clock size={16} /> },
                                { label: 'Under Construction', icon: <Construction size={16} /> }
                            ].map(cs => (
                                <div 
                                    key={cs.label}
                                    onClick={() => toggleArray(constructionStatus, setConstructionStatus, cs.label)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center cursor-pointer transition-colors ${constructionStatus.includes(cs.label) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-surface/30'}`}
                                >
                                    <div className="mb-1 opacity-80">{cs.icon}</div>
                                    <span className="text-[9px] font-semibold">{cs.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Advanced Filters */}
                {!showAdvanced ? (
                    <div 
                        onClick={() => setShowAdvanced(true)}
                        className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between cursor-pointer shadow-sm"
                    >
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-800 mb-1">Advanced Filters</h3>
                            <p className="text-[10px] text-gray-500">
                                {txnType === 'Buy' ? 'Posted by, Purchase Type, Area, Amenities & more' : ''}
                                {txnType === 'Rent/PG' && lookingFor === 'Rent' ? 'Posted by, Available for, Amenities, Area & more' : ''}
                                {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' ? 'PG Services, Amenities, Capacity & more' : ''}
                                {txnType === 'Commercial' ? 'Posted by, Amenities, Age of Property' : ''}
                            </p>
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 cursor-pointer" onClick={() => setShowAdvanced(false)}>
                            <h3 className="text-[11px] font-bold text-gray-800">Advanced Filters</h3>
                            <ChevronDown size={14} className="text-gray-400 transform rotate-180" />
                        </div>

                        {/* Posted By (Common across all, at top usually) */}
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Posted by</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Owner', 'Dealer', 'Builder'].map(pb => (
                                    <button 
                                        key={pb}
                                        onClick={() => toggleArray(postedBy, setPostedBy, pb)}
                                        className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${postedBy.includes(pb) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                    >
                                        {pb}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* PG Services (PG Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">PG Services</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Food Service', 'Wifi', 'Wheelchair Friendly', 'AC Rooms', 'Laundry Available', 'Pet Friendly'].map(pgs => (
                                        <button 
                                            key={pgs}
                                            onClick={() => toggleArray(pgServices, setPgServices, pgs)}
                                            className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${pgServices.includes(pgs) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                        >
                                            {pgs}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Available For (Rent Only inside Advanced) */}
                        {txnType === 'Rent/PG' && lookingFor === 'Rent' && (
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Available for</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Family', 'Single Women', 'Single Men'].map(af => (
                                        <button 
                                            key={af}
                                            onClick={() => toggleArray(availableFor, setAvailableFor, af)}
                                            className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${availableFor.includes(af) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                        >
                                            {af}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Purchase Type (Buy Only) */}
                        {txnType === 'Buy' && (
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Purchase Type</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Resale', 'New Bookings'].map(pt => (
                                        <button 
                                            key={pt}
                                            onClick={() => toggleArray(purchaseType, setPurchaseType, pt)}
                                            className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${purchaseType.includes(pt) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                        >
                                            {pt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amenities (All) */}
                        <div>
                            <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Amenities</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Parking', 'Power Backup', 'Park', 'Swimming Pool', 'Security Personnel', 'Lift', 'Gas Pipeline', 'Gymnasium', 'Club House', 'Wheelchair Friendly', 'Pet Friendly'].map(amenity => (
                                    <button 
                                        key={amenity}
                                        onClick={() => toggleArray(amenities, setAmenities, amenity)}
                                        className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${amenities.includes(amenity) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                    >
                                        {amenity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Area (Buy/Rent/PG inside advanced) */}
                        {txnType !== 'Commercial' && (
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Area <span className="text-surface font-normal">sq.ft. <ChevronDown size={10} className="inline"/></span></h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <select className="w-full appearance-none border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-[12px] text-gray-700 outline-none hover:border-surface/30 focus:border-surface"
                                            value={minArea} onChange={e => setMinArea(e.target.value)}>
                                            <option value="No Min">No Min</option>
                                            <option value="500">500</option>
                                            <option value="1000">1000</option>
                                            <option value="2000">2000</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    <span className="text-gray-400 text-[12px]">to</span>
                                    <div className="flex-1 relative">
                                        <select className="w-full appearance-none border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-[12px] text-gray-700 outline-none hover:border-surface/30 focus:border-surface"
                                            value={maxArea} onChange={e => setMaxArea(e.target.value)}>
                                            <option value="No Max">No Max</option>
                                            <option value="1000">1000</option>
                                            <option value="2000">2000</option>
                                            <option value="5000">5000</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Total Capacity (PG Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                            <div className="mt-6">
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Total Capacity</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['1-2 Guests', '2-4 Guests', '4-10 Guests', '10+ Guests'].map(cap => (
                                        <button 
                                            key={cap}
                                            onClick={() => toggleArray(totalCapacity, setTotalCapacity, cap)}
                                            className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${totalCapacity.includes(cap) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                        >
                                            {cap}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Minimum No. of Bathrooms (Buy/Rent Only - Not PG) */}
                        {txnType !== 'Commercial' && lookingFor !== 'PG/Co-living' && (
                            <div className="flex items-center justify-between mt-6">
                                <h3 className="text-[11px] font-bold text-gray-800 ml-1">Minimum No. of Bathrooms</h3>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setMinBathrooms(prev => Math.max(0, prev - 1))}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="text-[12px] font-bold w-4 text-center">{minBathrooms}</span>
                                    <button 
                                        onClick={() => setMinBathrooms(prev => prev + 1)}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Available From (Rent Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'Rent' && (
                            <div className="mt-6">
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Available From</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Any Time', 'Immediately', 'Within 15 Days', 'Within 1 Month', 'Within 2 Months', 'After 2 Months'].map(af => (
                                        <button 
                                            key={af}
                                            onClick={() => toggleArray(availableFrom, setAvailableFrom, af)}
                                            className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${availableFrom.includes(af) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                        >
                                            {af}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Furnishing Status (Buy or PG inside Advanced) */}
                        {(txnType === 'Buy' || (txnType === 'Rent/PG' && lookingFor === 'PG/Co-living')) && (
                            <div className="mt-6">
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Furnishing status</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Furnished', 'Semi-furnished', 'Unfurnished'].map(fs => (
                                        <button 
                                            key={fs}
                                            onClick={() => toggleArray(furnishingStatus, setFurnishingStatus, fs)}
                                            className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${furnishingStatus.includes(fs) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                        >
                                            {fs}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Age of Property (Commercial Only) */}
                        {txnType === 'Commercial' && (
                            <div className="mt-6">
                                <h3 className="text-[11px] font-bold text-gray-800 mb-3 ml-1">Age of Property</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['0-1 years old', '1-5 years old', '5-10 years old', '10+ years old'].map(ap => (
                                        <button 
                                            key={ap}
                                            onClick={() => toggleArray(ageOfProperty, setAgeOfProperty, ap)}
                                            className={`px-4 py-2 border rounded-md text-[11px] font-semibold transition-colors ${ageOfProperty.includes(ap) ? 'border-surface bg-surface/10 text-surface shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-surface/30'}`}
                                        >
                                            {ap}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* RERA Approved properties (Buy/Rent Only - Not PG) */}
                        {txnType !== 'Commercial' && lookingFor !== 'PG/Co-living' && (
                            <div className="mt-6 bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100">
                                <h3 className="text-[11px] font-bold text-gray-800">Show Only RERA Approved Properties</h3>
                                <button 
                                    onClick={() => setReraApproved(!reraApproved)}
                                    className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${reraApproved ? 'bg-surface' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${reraApproved ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        )}

                        {/* Attach Washroom properties (PG Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                            <div className="mt-6 bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100">
                                <h3 className="text-[11px] font-bold text-gray-800">Show Only Properties with Attach Washroom</h3>
                                <button 
                                    onClick={() => setAttachWashroom(!attachWashroom)}
                                    className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${attachWashroom ? 'bg-surface' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${attachWashroom ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="shrink-0 p-3 bg-white border-t border-gray-200 flex items-center justify-between z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={() => {
                        setMinBudget('No Min');
                        setMaxBudget('No Max');
                        setPropertyTypes([]);
                        setBedrooms([]);
                        setConstructionStatus([]);
                        setPostedBy([]);
                        setPurchaseType([]);
                        setMinArea('No Min');
                        setMaxArea('No Max');
                        setAmenities([]);
                        setMinBathrooms(0);
                        setFurnishingStatus([]);
                        setReraApproved(false);
                        setAvailableFor([]);
                        setAvailableFrom([]);
                        setAgeOfProperty([]);
                        setSharing([]);
                        setPgServices([]);
                        setTotalCapacity([]);
                        setAttachWashroom(false);
                        // don't reset lookingFor or lookingTo so user keeps their current tab.
                    }}
                    className="text-[12px] font-bold text-surface px-4"
                >
                    Clear
                </button>
                <button 
                    onClick={() => {
                        if (selectedLocations.length === 0) {
                            alert("Please select a locality first");
                            return;
                        }
                        handleApply();
                    }}
                    className="bg-surface text-white px-10 py-2.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-surface/90 transition-colors"
                >
                    Search
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col h-[100dvh]">
            {step === 1 ? renderStep1() : renderStep2()}
        </div>
    );
};

export default MobileSearchOverlay;
