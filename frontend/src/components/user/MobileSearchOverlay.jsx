import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, History, Crosshair, ChevronDown, Building, Home, Building2, Map, LayoutGrid, CheckCircle2, Construction, Clock, Briefcase, Factory, Warehouse, Hotel } from 'lucide-react';
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
    const [lookingFor, setLookingFor] = useState('Rent'); 
    const [availableFor, setAvailableFor] = useState([]); 
    const [availableFrom, setAvailableFrom] = useState([]);
    
    // PG Specific
    const [sharing, setSharing] = useState([]);
    const [pgServices, setPgServices] = useState([]);
    const [totalCapacity, setTotalCapacity] = useState([]);
    const [attachWashroom, setAttachWashroom] = useState(false);

    // Commercial specific
    const [lookingTo, setLookingTo] = useState('Commercial Buy'); 
    const [commercialSubTypes, setCommercialSubTypes] = useState([]); 
    const [ageOfProperty, setAgeOfProperty] = useState([]);
    const [investmentOptions, setInvestmentOptions] = useState([]);
    const [commercialAvailability, setCommercialAvailability] = useState([]);
    const [floorPreference, setFloorPreference] = useState([]);
    
    // Specific detailed commercial fields
    const [officeFacilities, setOfficeFacilities] = useState([]); 
    const [shopLocatedInside, setShopLocatedInside] = useState([]); 
    
    // Co-working specific (outside advanced)
    const [cwSeats, setCwSeats] = useState([]);
    const [cwSeatType, setCwSeatType] = useState([]);
    const [cwPlansPricing, setCwPlansPricing] = useState([]);
    
    // Co-working specific (inside advanced)
    const [cwOtherFilters, setCwOtherFilters] = useState([]);
    const [cwServices, setCwServices] = useState([]);
    const [cwOfficeSupplies, setCwOfficeSupplies] = useState([]);
    const [cwSpaceAccess, setCwSpaceAccess] = useState([]);
    const [cwInternetElectricity, setCwInternetElectricity] = useState([]);
    const [cwFoodDrinks, setCwFoodDrinks] = useState([]);
    const [cwActivities, setCwActivities] = useState([]);
    const [cwAdditionalAmenities, setCwAdditionalAmenities] = useState([]);
    const [cwCovidReadiness, setCwCovidReadiness] = useState([]);

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
            ...totalCapacity,
            ...investmentOptions,
            ...commercialAvailability,
            ...floorPreference,
            ...officeFacilities,
            ...shopLocatedInside,
            ...cwSeats,
            ...cwSeatType,
            ...cwPlansPricing,
            ...cwOtherFilters,
            ...cwServices,
            ...cwOfficeSupplies,
            ...cwSpaceAccess,
            ...cwInternetElectricity,
            ...cwFoodDrinks,
            ...cwActivities,
            ...cwAdditionalAmenities,
            ...cwCovidReadiness
        ];
        
        if (attachWashroom) allAmenities.push('Attached Washroom');

        let categoryTabVal = 'Sell';
        if (txnType === 'Rent/PG') {
            categoryTabVal = lookingFor === 'PG/Co-living' ? 'Paying Guest' : 'Rent / Lease';
        }

        const finalPropertyTypes = txnType === 'Commercial' 
            ? [...propertyTypes, ...commercialSubTypes].join(',')
            : propertyTypes.join(',');

        const finalFilters = {
            categoryTab: categoryTabVal,
            propertyCategory: txnType === 'Commercial' ? 'Commercial' : 'Residential',
            areas: selectedLocations.filter(l => l !== 'Current Location'),
            radius: selectedLocations.includes('Current Location') ? parseInt(radius) : 50,
            minPrice: minBudget === 'No Min' ? '' : minBudget,
            maxPrice: maxBudget === 'No Max' ? '' : maxBudget,
            minArea: minArea === 'No Min' ? '' : minArea,
            maxArea: maxArea === 'No Max' ? '' : maxArea,
            propertyTypes: finalPropertyTypes,
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
                { label: 'Office', icon: <Briefcase size={16} /> },
                { label: 'Retail', icon: <Building size={16} /> },
                { label: 'Plot / Land', icon: <Map size={16} /> },
                { label: 'Storage', icon: <Warehouse size={16} /> },
                { label: 'Industry', icon: <Factory size={16} /> },
                { label: 'Hospitality', icon: <Hotel size={16} /> }
            ];
        }
    };

    const getCommercialSubTypesData = (type) => {
        switch(type) {
            case 'Office': return ['Ready to move office space', 'Bare shell office space', 'Co-working office space'];
            case 'Retail': return ['Commercial Shops', 'Commercial Showrooms'];
            case 'Plot / Land': return ['Commercial Land/Inst. Land', 'Agricultural/Farm Land', 'Industrial Lands/Plots'];
            case 'Storage': return ['Ware House', 'Cold Storage'];
            case 'Industry': return ['Factory', 'Manufacturing'];
            case 'Hospitality': return ['Hotel/Resorts', 'Guest-House/Banquet-Halls'];
            default: return [];
        }
    };

    // Reusable slider component for arrays of buttons
    const FilterSlider = ({ items, selectedArray, onChange, toggleArrayFunc }) => (
        <div className="flex overflow-x-auto gap-2 pb-1 -mx-2 px-2 [&::-webkit-scrollbar]:hidden">
            {items.map(item => (
                <button 
                    key={item}
                    onClick={() => {
                        if(toggleArrayFunc) {
                            toggleArrayFunc(selectedArray, onChange, item);
                        } else {
                            onChange(item);
                        }
                    }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                        (toggleArrayFunc ? selectedArray.includes(item) : selectedArray === item) 
                            ? 'bg-surface/10 text-surface border border-surface/20 shadow-sm' 
                            : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                >
                    {item}
                </button>
            ))}
        </div>
    );

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
            <div className="flex-1 overflow-y-auto bg-slate-50 pb-20">
                {searchInput ? (
                    <div className="bg-white">
                        {suggestedLocations.map(loc => (
                            <div 
                                key={loc} 
                                className="flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                                onClick={() => handleSelectLocation(loc)}
                            >
                                <MapPin size={16} className="text-slate-400" />
                                <div>
                                    <div className="text-[12px] font-semibold text-slate-800">{loc}</div>
                                    <div className="text-[10px] text-slate-500">Locality</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* History */}
                        {recentSearches.length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-800 mb-3">Last searched..</h3>
                                <div className="bg-white rounded-lg border border-slate-200">
                                    {recentSearches.map((s, idx) => (
                                        <div key={s.id || idx} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50" onClick={() => {
                                            setSelectedLocations(s.locations);
                                            setTxnType(s.txnType);
                                            setStep(2);
                                        }}>
                                            <div className="flex items-center gap-2 text-[12px] text-slate-600">
                                                <History size={14} />
                                                {s.txnType} in {s.locations.join(', ')}
                                            </div>
                                            <span className="text-slate-400 text-[14px] leading-none">↗</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Popular */}
                        <div>
                            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Popular localities in Bengaluru</h3>
                            <div className="flex flex-wrap gap-2">
                                {popularLocalities.map(loc => (
                                    <button 
                                        key={loc}
                                        onClick={() => handleSelectLocation(loc)}
                                        className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-1"
                                    >
                                        <span className="text-slate-400">+</span> {loc}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="shrink-0 p-3 bg-white border-t border-slate-200 flex items-center justify-between z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
        <div className="flex-1 flex flex-col min-h-0 bg-white animate-in slide-in-from-right duration-300">
            {/* Top Bar */}
            <div className="bg-surface pt-3 px-3 pb-3 shrink-0">
                <div className="flex items-center justify-between mb-3">
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
                    <button onClick={() => setStep(1)} className="flex items-center gap-1 text-surface text-[11px] font-bold px-2 border-r border-slate-200 mr-2 hover:bg-surface/10 rounded-md py-1 transition-colors">
                        <Search size={12} /> Add
                    </button>
                    <div className="flex-1 flex overflow-x-auto gap-1 px-1 items-center [&::-webkit-scrollbar]:hidden">
                        {selectedLocations.map(loc => (
                            <div key={loc} className="shrink-0 flex items-center gap-1 bg-surface/10 text-surface px-2 py-1 rounded-md text-[11px] font-semibold">
                                {loc}
                                <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveLocation(loc)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                
                {/* Radius for Current Location */}
                {selectedLocations.includes('Current Location') && (
                    <div className="mb-2">
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Show Properties within</h3>
                        <FilterSlider items={['1 km', '3 km', '5 km', '10 km']} selectedArray={radius} onChange={setRadius} toggleArrayFunc={false} />
                    </div>
                )}

                {/* Pre-Budget dynamic sections */}
                {txnType === 'Rent/PG' && (
                    <div className="mb-2">
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Looking to</h3>
                        <FilterSlider 
                            items={['Rent', 'PG/Co-living']} 
                            selectedArray={lookingFor} 
                            onChange={(val) => {
                                setLookingFor(val);
                                setAvailableFor([]);
                                setFurnishingStatus([]);
                            }} 
                            toggleArrayFunc={false} 
                        />
                    </div>
                )}

                {txnType === 'Commercial' && (
                    <div className="mb-2">
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Looking to</h3>
                        <FilterSlider 
                            items={['Commercial Buy', 'Commercial Lease']} 
                            selectedArray={lookingTo} 
                            onChange={(val) => {
                                setLookingTo(val);
                                if (val === 'Commercial Lease') setInvestmentOptions([]);
                            }} 
                            toggleArrayFunc={false} 
                        />
                    </div>
                )}

                {/* Compact Budget Section (No Box styling, cleaner design) */}
                <div>
                    <h3 className="text-[12px] font-bold text-slate-800 mb-2">Budget in ₹</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative border-b-2 border-slate-200 focus-within:border-surface transition-colors pb-1">
                            <select className="w-full appearance-none bg-transparent text-[13px] font-medium text-slate-800 outline-none"
                                value={minBudget} onChange={e => setMinBudget(e.target.value)}>
                                <option value="No Min">Min</option>
                                <option value="10000">10 K</option>
                                <option value="50000">50 K</option>
                                <option value="100000">1 Lac</option>
                                <option value="1000000">10 Lac</option>
                                <option value="2500000">25 Lac</option>
                                <option value="5000000">50 Lac</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <span className="text-slate-400 text-[12px] font-medium px-2">to</span>
                        <div className="flex-1 relative border-b-2 border-slate-200 focus-within:border-surface transition-colors pb-1">
                            <select className="w-full appearance-none bg-transparent text-[13px] font-medium text-slate-800 outline-none"
                                value={maxBudget} onChange={e => setMaxBudget(e.target.value)}>
                                <option value="No Max">Max</option>
                                <option value="50000">50 K</option>
                                <option value="100000">1 Lac</option>
                                <option value="5000000">50 Lac</option>
                                <option value="10000000">1 Cr</option>
                                <option value="50000000">5 Cr</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Sharing (PG Only) */}
                {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Sharing</h3>
                        <FilterSlider items={['Private Rooms', '2 Per Room', 'More than 2 per room']} selectedArray={sharing} onChange={setSharing} toggleArrayFunc={toggleArray} />
                    </div>
                )}

                {/* No. of Bedrooms */}
                {(txnType === 'Buy' || (txnType === 'Rent/PG' && lookingFor === 'Rent')) && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">No. of Bedrooms</h3>
                        <FilterSlider items={['1 RK/1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK']} selectedArray={bedrooms} onChange={setBedrooms} toggleArrayFunc={toggleArray} />
                    </div>
                )}

                {/* Property Types - Premium Slider */}
                <div>
                    <h3 className="text-[12px] font-bold text-slate-800 mb-2">
                        {txnType === 'Commercial' ? 'Commercial property types' : 'Property types'}
                    </h3>
                    <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 [&::-webkit-scrollbar]:hidden">
                        {getPropertyTypesList().map(pt => (
                            <div 
                                key={pt.label}
                                onClick={() => {
                                    if (txnType === 'Commercial') {
                                        if (propertyTypes.includes(pt.label)) {
                                            setPropertyTypes([]);
                                            setCommercialSubTypes([]);
                                        } else {
                                            setPropertyTypes([pt.label]);
                                            setCommercialSubTypes([]); 
                                        }
                                    } else {
                                        toggleArray(propertyTypes, setPropertyTypes, pt.label);
                                    }
                                }}
                                className={`shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border min-w-[90px] text-center cursor-pointer transition-all ${propertyTypes.includes(pt.label) ? 'border-surface bg-surface/5 text-surface shadow-sm' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                                <div className="mb-2">{pt.icon}</div>
                                <span className="text-[10px] font-medium leading-tight">{pt.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DYNAMIC SUB-TYPES for Commercial */}
                {txnType === 'Commercial' && propertyTypes.map(selectedCategory => {
                    const subTypes = getCommercialSubTypesData(selectedCategory);
                    if (subTypes.length === 0) return null;
                    return (
                        <div key={selectedCategory} className="bg-slate-50/50 -mx-4 px-4 py-4 border-y border-slate-100 space-y-5">
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Type of {selectedCategory}</h3>
                                <FilterSlider items={subTypes} selectedArray={commercialSubTypes} onChange={setCommercialSubTypes} toggleArrayFunc={toggleArray} />
                            </div>

                            {/* Extra Section for Retail - Shop Located Inside */}
                            {selectedCategory === 'Retail' && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Shop located inside</h4>
                                    <FilterSlider items={['Mall', 'Commercial Project', 'Residential Project', 'Retail Complex/Building', 'Market / High Street']} selectedArray={shopLocatedInside} onChange={setShopLocatedInside} toggleArrayFunc={toggleArray} />
                                </div>
                            )}

                            {/* Extra Nested Settings if 'Co-working office space' is selected (Outside Advanced Filters portion) */}
                            {selectedCategory === 'Office' && commercialSubTypes.includes('Co-working office space') && (
                                <div className="space-y-5">
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Number of Seats (Team Size)</h4>
                                        <FilterSlider items={['6-10', '11-20', '21-50', '51-100', '101-500', '500+']} selectedArray={cwSeats} onChange={setCwSeats} toggleArrayFunc={toggleArray} />
                                    </div>

                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Seat type</h4>
                                        <FilterSlider items={['Hot Desk', 'Dedicated Desk', 'Private Office', 'Meeting Room', 'Private Cabin', 'Multi-utility space']} selectedArray={cwSeatType} onChange={setCwSeatType} toggleArrayFunc={toggleArray} />
                                    </div>

                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Plans and pricing</h4>
                                        <FilterSlider items={['Hourly', 'Daily', 'Weekly', 'Monthly']} selectedArray={cwPlansPricing} onChange={setCwPlansPricing} toggleArrayFunc={toggleArray} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Investment Options (Commercial Buy Only) */}
                {txnType === 'Commercial' && lookingTo === 'Commercial Buy' && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Investment Options</h3>
                        <FilterSlider items={['Pre-leased Spaces', 'Restaurants', 'SCO Plots', 'Business Centre', 'Food Court', 'Multiplex']} selectedArray={investmentOptions} onChange={setInvestmentOptions} toggleArrayFunc={toggleArray} />
                    </div>
                )}

                {/* Available For (PG Only outside) */}
                {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Available For</h3>
                        <FilterSlider items={['Girls', 'Boys']} selectedArray={availableFor} onChange={setAvailableFor} toggleArrayFunc={toggleArray} />
                    </div>
                )}

                {/* Furnishing Status (Rent outside advanced) */}
                {txnType === 'Rent/PG' && lookingFor === 'Rent' && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Furnishing status</h3>
                        <FilterSlider items={['Furnished', 'Semi-furnished', 'Unfurnished']} selectedArray={furnishingStatus} onChange={setFurnishingStatus} toggleArrayFunc={toggleArray} />
                    </div>
                )}

                {/* Area */}
                {txnType === 'Commercial' && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Area <span className="text-surface font-normal text-[10px]">sq.ft.</span></h3>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative border-b-2 border-slate-200 focus-within:border-surface transition-colors pb-1">
                                <select className="w-full appearance-none bg-transparent text-[13px] font-medium text-slate-800 outline-none"
                                    value={minArea} onChange={e => setMinArea(e.target.value)}>
                                    <option value="No Min">Min</option>
                                    <option value="500">500</option>
                                    <option value="1000">1000</option>
                                    <option value="2000">2000</option>
                                    <option value="5000">5000</option>
                                    <option value="10000">10000</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            <span className="text-slate-400 text-[12px] font-medium px-2">to</span>
                            <div className="flex-1 relative border-b-2 border-slate-200 focus-within:border-surface transition-colors pb-1">
                                <select className="w-full appearance-none bg-transparent text-[13px] font-medium text-slate-800 outline-none"
                                    value={maxArea} onChange={e => setMaxArea(e.target.value)}>
                                    <option value="No Max">Max</option>
                                    <option value="1000">1000</option>
                                    <option value="2000">2000</option>
                                    <option value="5000">5000</option>
                                    <option value="10000">10000</option>
                                    <option value="50000">50000</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Availability (Commercial Only outside) */}
                {txnType === 'Commercial' && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Availability</h3>
                        <FilterSlider items={['Immediately', 'Within 3 Months', 'After 3 Months']} selectedArray={commercialAvailability} onChange={setCommercialAvailability} toggleArrayFunc={toggleArray} />
                    </div>
                )}

                {/* Construction Status (Buy Only) */}
                {txnType === 'Buy' && (
                    <div>
                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Construction status</h3>
                        <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 [&::-webkit-scrollbar]:hidden">
                            {[
                                { label: 'Ready to move', icon: <CheckCircle2 size={16} /> },
                                { label: 'New Launch', icon: <Clock size={16} /> },
                                { label: 'Under Construction', icon: <Construction size={16} /> }
                            ].map(cs => (
                                <div 
                                    key={cs.label}
                                    onClick={() => toggleArray(constructionStatus, setConstructionStatus, cs.label)}
                                    className={`shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border min-w-[95px] text-center cursor-pointer transition-colors ${constructionStatus.includes(cs.label) ? 'border-surface bg-surface/5 text-surface shadow-sm' : 'border-slate-200 bg-white text-slate-600'}`}
                                >
                                    <div className="mb-1 opacity-80">{cs.icon}</div>
                                    <span className="text-[10px] font-medium">{cs.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Advanced Filters Toggle */}
                {!showAdvanced ? (
                    <div 
                        onClick={() => setShowAdvanced(true)}
                        className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 flex items-center justify-between cursor-pointer mt-6"
                    >
                        <div>
                            <h3 className="text-[12px] font-bold text-slate-800 mb-1">Advanced Filters</h3>
                            <p className="text-[10px] text-slate-500">
                                {txnType === 'Buy' ? 'Posted by, Purchase Type, Area, Amenities & more' : ''}
                                {txnType === 'Rent/PG' && lookingFor === 'Rent' ? 'Posted by, Available for, Amenities, Area & more' : ''}
                                {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' ? 'PG Services, Amenities, Capacity & more' : ''}
                                {txnType === 'Commercial' ? 'Facilities, Floor preference, Amenities, Posted by, Age of Property' : ''}
                            </p>
                        </div>
                        <ChevronDown size={16} className="text-slate-400" />
                    </div>
                ) : (
                    <div className="space-y-6 pt-4 border-t border-slate-200 mt-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between pb-2 cursor-pointer" onClick={() => setShowAdvanced(false)}>
                            <h3 className="text-[13px] font-bold text-surface">Advanced Filters</h3>
                            <ChevronDown size={16} className="text-surface transform rotate-180" />
                        </div>

                        {/* ---------- COMMERCIAL SPECIFIC DEEP ADVANCED FILTERS ---------- */}
                        {txnType === 'Commercial' && (
                            <>
                                {/* Facilities for Office -> Ready to Move / Bare Shell */}
                                {propertyTypes.includes('Office') && (commercialSubTypes.includes('Ready to move office space') || commercialSubTypes.includes('Bare shell office space')) && (
                                    <div>
                                        <h3 className="text-[12px] font-bold text-slate-800 mb-2">Facilities</h3>
                                        <FilterSlider items={['Centralized AC', 'Oxygen Duct', 'UPS', 'Fire Safety']} selectedArray={officeFacilities} onChange={setOfficeFacilities} toggleArrayFunc={toggleArray} />
                                    </div>
                                )}

                                {/* Deep Co-working fields inside Advanced Filters */}
                                {propertyTypes.includes('Office') && commercialSubTypes.includes('Co-working office space') && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Other Filters</h3>
                                            <FilterSlider items={['Covid Ready', '24/7 operational']} selectedArray={cwOtherFilters} onChange={setCwOtherFilters} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Services</h3>
                                            <FilterSlider items={['IT support', 'Housekeeping', 'Runner services', 'Catering', 'Reception', 'Courier services']} selectedArray={cwServices} onChange={setCwServices} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Office Supplies</h3>
                                            <FilterSlider items={['Printer', 'Photocopier', 'Office stationery', 'Scanner', 'Projector', 'Lockable drawers']} selectedArray={cwOfficeSupplies} onChange={setCwOfficeSupplies} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Space Access</h3>
                                            <FilterSlider items={['Conference room access', 'Calling booth', 'Car parking', 'Meeting room access', 'Relax zones', 'Bike parking']} selectedArray={cwSpaceAccess} onChange={setCwSpaceAccess} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Internet and Electricity</h3>
                                            <FilterSlider items={['High-speed WiFi', 'Power backup', 'High-speed Broadband', 'Air conditioning']} selectedArray={cwInternetElectricity} onChange={setCwInternetElectricity} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Food and Drinks</h3>
                                            <FilterSlider items={['Coffee machine', 'Cafeteria']} selectedArray={cwFoodDrinks} onChange={setCwFoodDrinks} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Activities</h3>
                                            <FilterSlider items={['Recreational activities', 'Community programs', 'Relax zones']} selectedArray={cwActivities} onChange={setCwActivities} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Additional Amenities</h3>
                                            <FilterSlider items={['Restaurants/malls nearby', 'Pick up and drop', 'Creche (managed)', 'Washrooms', 'Visitor management', 'Event spaces', 'AV Rooms / Projectors']} selectedArray={cwAdditionalAmenities} onChange={setCwAdditionalAmenities} toggleArrayFunc={toggleArray} />
                                        </div>

                                        <div>
                                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Covid Readiness</h3>
                                            <FilterSlider items={['Frequently sanitized', 'Masks provided', 'PPE kits available', 'Distanced seating arrangement', 'Reduced touchable items', 'Temperature screening']} selectedArray={cwCovidReadiness} onChange={setCwCovidReadiness} toggleArrayFunc={toggleArray} />
                                        </div>
                                    </div>
                                )}
                                
                                {/* Floor Preference */}
                                <div>
                                    <h3 className="text-[12px] font-bold text-slate-800 mb-2">Floor preference</h3>
                                    <FilterSlider items={['Basement', 'Ground floor', 'Terrace / Roof top', '1st and above']} selectedArray={floorPreference} onChange={setFloorPreference} toggleArrayFunc={toggleArray} />
                                </div>
                            </>
                        )}
                        {/* ----------------------------------------------------------------- */}

                        {/* Posted By */}
                        <div>
                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Posted by</h3>
                            <FilterSlider items={['Owner', 'Dealer', 'Builder']} selectedArray={postedBy} onChange={setPostedBy} toggleArrayFunc={toggleArray} />
                        </div>

                        {/* PG Services (PG Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">PG Services</h3>
                                <FilterSlider items={['Food Service', 'Wifi', 'Wheelchair Friendly', 'AC Rooms', 'Laundry Available', 'Pet Friendly']} selectedArray={pgServices} onChange={setPgServices} toggleArrayFunc={toggleArray} />
                            </div>
                        )}

                        {/* Available For (Rent Only inside Advanced) */}
                        {txnType === 'Rent/PG' && lookingFor === 'Rent' && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">Available for</h3>
                                <FilterSlider items={['Family', 'Single Women', 'Single Men']} selectedArray={availableFor} onChange={setAvailableFor} toggleArrayFunc={toggleArray} />
                            </div>
                        )}

                        {/* Purchase Type (Buy Only) */}
                        {txnType === 'Buy' && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">Purchase Type</h3>
                                <FilterSlider items={['Resale', 'New Bookings']} selectedArray={purchaseType} onChange={setPurchaseType} toggleArrayFunc={toggleArray} />
                            </div>
                        )}

                        {/* Amenities (All) */}
                        <div>
                            <h3 className="text-[12px] font-bold text-slate-800 mb-2">Amenities</h3>
                            <FilterSlider 
                                items={txnType === 'Commercial' 
                                    ? ['Power Backup', 'DG Availability', 'Waste disposal', 'Near IT Park', 'Parking', 'Wheelchair Accessibility', 'ATM']
                                    : ['Parking', 'Power Backup', 'Park', 'Swimming Pool', 'Security Personnel', 'Lift', 'Gas Pipeline', 'Gymnasium', 'Club House', 'Wheelchair Friendly', 'Pet Friendly']
                                } 
                                selectedArray={amenities} 
                                onChange={setAmenities} 
                                toggleArrayFunc={toggleArray} 
                            />
                        </div>

                        {/* Area (Buy/Rent/PG inside advanced) */}
                        {txnType !== 'Commercial' && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">Area <span className="text-surface font-normal text-[10px]">sq.ft.</span></h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative border-b-2 border-slate-200 focus-within:border-surface transition-colors pb-1">
                                        <select className="w-full appearance-none bg-transparent text-[13px] font-medium text-slate-800 outline-none"
                                            value={minArea} onChange={e => setMinArea(e.target.value)}>
                                            <option value="No Min">Min</option>
                                            <option value="500">500</option>
                                            <option value="1000">1000</option>
                                            <option value="2000">2000</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    <span className="text-slate-400 text-[12px] font-medium px-2">to</span>
                                    <div className="flex-1 relative border-b-2 border-slate-200 focus-within:border-surface transition-colors pb-1">
                                        <select className="w-full appearance-none bg-transparent text-[13px] font-medium text-slate-800 outline-none"
                                            value={maxArea} onChange={e => setMaxArea(e.target.value)}>
                                            <option value="No Max">Max</option>
                                            <option value="1000">1000</option>
                                            <option value="2000">2000</option>
                                            <option value="5000">5000</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Total Capacity (PG Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">Total Capacity</h3>
                                <FilterSlider items={['1-2 Guests', '2-4 Guests', '4-10 Guests', '10+ Guests']} selectedArray={totalCapacity} onChange={setTotalCapacity} toggleArrayFunc={toggleArray} />
                            </div>
                        )}

                        {/* Minimum No. of Bathrooms (Buy/Rent Only - Not PG) */}
                        {txnType !== 'Commercial' && lookingFor !== 'PG/Co-living' && (
                            <div className="flex items-center justify-between">
                                <h3 className="text-[12px] font-bold text-slate-800">Minimum No. of Bathrooms</h3>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setMinBathrooms(prev => Math.max(0, prev - 1))}
                                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="text-[13px] font-bold w-4 text-center">{minBathrooms}</span>
                                    <button 
                                        onClick={() => setMinBathrooms(prev => prev + 1)}
                                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Available From (Rent Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'Rent' && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">Available From</h3>
                                <FilterSlider items={['Any Time', 'Immediately', 'Within 15 Days', 'Within 1 Month', 'Within 2 Months', 'After 2 Months']} selectedArray={availableFrom} onChange={setAvailableFrom} toggleArrayFunc={toggleArray} />
                            </div>
                        )}

                        {/* Furnishing Status (Buy or PG inside Advanced) */}
                        {(txnType === 'Buy' || (txnType === 'Rent/PG' && lookingFor === 'PG/Co-living')) && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">Furnishing status</h3>
                                <FilterSlider items={['Furnished', 'Semi-furnished', 'Unfurnished']} selectedArray={furnishingStatus} onChange={setFurnishingStatus} toggleArrayFunc={toggleArray} />
                            </div>
                        )}

                        {/* Age of Property (Commercial Only) */}
                        {txnType === 'Commercial' && (
                            <div>
                                <h3 className="text-[12px] font-bold text-slate-800 mb-2">Age of Property</h3>
                                <FilterSlider items={['0-1 years old', '1-5 years old', '5-10 years old', '10+ years old']} selectedArray={ageOfProperty} onChange={setAgeOfProperty} toggleArrayFunc={toggleArray} />
                            </div>
                        )}

                        {/* RERA Approved properties (Buy/Rent Only - Not PG) */}
                        {txnType !== 'Commercial' && lookingFor !== 'PG/Co-living' && (
                            <div className="flex items-center justify-between">
                                <h3 className="text-[12px] font-bold text-slate-800">Show Only RERA Approved Properties</h3>
                                <button 
                                    onClick={() => setReraApproved(!reraApproved)}
                                    className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${reraApproved ? 'bg-surface' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${reraApproved ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        )}

                        {/* Attach Washroom properties (PG Only) */}
                        {txnType === 'Rent/PG' && lookingFor === 'PG/Co-living' && (
                            <div className="flex items-center justify-between">
                                <h3 className="text-[12px] font-bold text-slate-800">Properties with Attach Washroom</h3>
                                <button 
                                    onClick={() => setAttachWashroom(!attachWashroom)}
                                    className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${attachWashroom ? 'bg-surface' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${attachWashroom ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="shrink-0 p-3 bg-white border-t border-slate-200 flex items-center justify-between z-10 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]">
                <button 
                    onClick={() => {
                        setMinBudget('No Min');
                        setMaxBudget('No Max');
                        setPropertyTypes([]);
                        setCommercialSubTypes([]);
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
                        setInvestmentOptions([]);
                        setCommercialAvailability([]);
                        setFloorPreference([]);
                        
                        setOfficeFacilities([]);
                        setShopLocatedInside([]);
                        setCwSeats([]);
                        setCwSeatType([]);
                        setCwPlansPricing([]);
                        setCwOtherFilters([]);
                        setCwServices([]);
                        setCwOfficeSupplies([]);
                        setCwSpaceAccess([]);
                        setCwInternetElectricity([]);
                        setCwFoodDrinks([]);
                        setCwActivities([]);
                        setCwAdditionalAmenities([]);
                        setCwCovidReadiness([]);
                    }}
                    className="text-[13px] font-bold text-slate-500 px-4 py-2 hover:text-slate-800 transition-colors"
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
                    className="bg-surface text-white px-10 py-3 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-surface/90 transition-all active:scale-[0.98] shadow-md shadow-surface/20"
                >
                    Search Properties
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
