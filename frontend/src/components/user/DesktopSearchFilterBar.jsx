import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Mic, ChevronDown, Check } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { addRecentSearch } from '../../utils/recentActivity';
import { GOOGLE_MAPS_SCRIPT_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../../config/googleMaps';

const TABS = [
    { key: 'buy', label: 'Buy' },
    { key: 'rent', label: 'Rent' },
    { key: 'new-launch', label: 'New Launch' },
    { key: 'commercial', label: 'Commercial' },
    { key: 'plots', label: 'Plots/Land' },
    { key: 'projects', label: 'Projects' },
];

const BEDROOM_OPTIONS = [
    { code: '1BHK', label: '1 RK/1 BHK' },
    { code: '2BHK', label: '2 BHK' },
    { code: '3BHK', label: '3 BHK' },
    { code: '4BHK', label: '4 BHK' },
    { code: '4+BHK', label: '4+ BHK' },
    { code: 'Studio', label: 'Studio' },
    { code: 'Villa', label: 'Villa' },
];

const CONSTRUCTION_OPTIONS = [
    { code: 'Ready to Move', label: 'Ready to Move' },
    { code: 'Under Construction', label: 'Under Construction' },
    { code: 'Pre Launch', label: 'New / Pre Launch' },
];

const POSTED_BY_OPTIONS = ['Owner', 'Builder', 'Broker'];

const BUDGET_STEPS = [
    { value: '', label: 'Any' },
    { value: '1000000', label: '10 Lac' },
    { value: '2000000', label: '20 Lac' },
    { value: '3000000', label: '30 Lac' },
    { value: '5000000', label: '50 Lac' },
    { value: '7500000', label: '75 Lac' },
    { value: '10000000', label: '1 Cr' },
    { value: '15000000', label: '1.5 Cr' },
    { value: '20000000', label: '2 Cr' },
    { value: '30000000', label: '3 Cr' },
    { value: '50000000', label: '5 Cr' },
];

const formatINR = (value) => {
    const found = BUDGET_STEPS.find(s => s.value === value);
    return found ? found.label : value;
};

const tabForType = (label) => {
    if (!label) return 'buy';
    const l = label.toLowerCase();
    if (l.includes('rent') || l.includes('pg')) return 'rent';
    if (l.includes('plot')) return 'plots';
    return 'buy';
};

const FilterPill = ({ label, active, count, isOpen, onToggle, children, panelWidth = 'w-64' }) => (
    <div className="relative">
        <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-colors ${
                active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
        >
            {label}{count > 0 ? ` (${count})` : ''}
            <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
            <div className={`absolute top-full left-0 mt-2 ${panelWidth} bg-white rounded-2xl border border-gray-100 shadow-xl p-4 z-50`}>
                {children}
            </div>
        )}
    </div>
);

const BudgetOptionList = ({ heading, value, onSelect }) => (
    <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{heading}</p>
        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
            {BUDGET_STEPS.map(s => (
                <button
                    key={s.value || 'any'}
                    onClick={() => onSelect(s.value)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
                        value === s.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    {s.label}
                </button>
            ))}
        </div>
    </div>
);

const CheckOption = ({ label, checked, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
    >
        <span className="text-[13px] font-medium text-gray-700">{label}</span>
        <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
            {checked && <Check size={11} className="text-white" strokeWidth={3} />}
        </span>
    </button>
);

const DesktopSearchFilterBar = ({ theme, selectedType, selectedCity }) => {
    const navigate = useNavigate();
    const accentColor = theme?.accent || '#ea580c';
    const activeTab = tabForType(selectedType?.label);

    const [propertyCategory, setPropertyCategory] = useState('Residential');
    const [searchText, setSearchText] = useState('');
    const [detecting, setDetecting] = useState(false);

    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [bedrooms, setBedrooms] = useState([]);
    const [constructionStatus, setConstructionStatus] = useState([]);
    const [postedBy, setPostedBy] = useState([]);

    const [openFilter, setOpenFilter] = useState(null); // 'category' | 'budget' | 'bedroom' | 'construction' | 'postedBy' | null
    const wrapperRef = useRef(null);
    const [autocomplete, setAutocomplete] = useState(null);

    const { isLoaded: placesLoaded } = useJsApiLoader({
        id: GOOGLE_MAPS_SCRIPT_ID,
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    // Close any open dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            // Google's Places suggestion list (.pac-container) is appended
            // directly to <body>, outside this bar's own DOM — a click on a
            // suggestion would otherwise look like an "outside click" and
            // close everything before the place selection could register.
            if (e.target.closest('.pac-container')) return;
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpenFilter(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handlePlaceChanged = () => {
        if (!autocomplete) return;
        const place = autocomplete.getPlace();
        const name = place?.name || place?.formatted_address;
        if (name) setSearchText(name);
    };

    const toggleFilter = (key) => setOpenFilter(prev => (prev === key ? null : key));

    const toggleFromArray = (arr, setArr, code) => {
        setArr(arr.includes(code) ? arr.filter(c => c !== code) : [...arr, code]);
    };

    const transactionTypeForTab = (tab) => (tab === 'rent' ? 'rent' : 'buy');

    const goToTab = (tabKey) => {
        setOpenFilter(null);
        switch (tabKey) {
            case 'buy': navigate('/buy'); break;
            case 'rent': navigate('/rent-pg'); break;
            case 'plots': navigate('/plot'); break;
            case 'new-launch': navigate('/search?availability=Pre%20Launch'); break;
            case 'commercial': navigate('/search?propertyCategory=Commercial'); break;
            case 'projects': navigate('/search?availability=Pre%20Launch,Under%20Construction'); break;
            default: break;
        }
    };

    const handleDetectLocation = () => {
        if (!navigator.geolocation) return;
        setDetecting(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                const data = await res.json();
                const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || '';
                if (city) setSearchText(city);
            } finally {
                setDetecting(false);
            }
        }, () => setDetecting(false), { timeout: 6000 });
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchText.trim()) {
            // Typed/picked a specific place or project — that's a deliberate
            // choice, let it stand on its own rather than also constraining
            // to whatever city the pill above happens to be set to.
            params.set('search', searchText.trim());
        } else if (selectedCity) {
            // Nothing typed — fall back to the location pill so results
            // still stay scoped to it instead of searching everywhere.
            params.set('areas', selectedCity);
        }
        params.set('transactionType', transactionTypeForTab(activeTab));
        if (propertyCategory === 'Commercial') params.set('propertyCategory', 'Commercial');
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (bedrooms.length) params.set('bhkType', bedrooms.join(','));
        if (constructionStatus.length) params.set('availability', constructionStatus.join(','));
        if (postedBy.length) params.set('postedBy', postedBy.join(','));
        setOpenFilter(null);
        const url = `/search?${params.toString()}`;
        const tabLabel = TABS.find(t => t.key === activeTab)?.label || 'Search';
        addRecentSearch({ label: searchText.trim() || `${tabLabel} in ${selectedCity || 'your city'}`, url });
        navigate(url);
    };

    const budgetLabel = (minPrice || maxPrice)
        ? `${minPrice ? formatINR(minPrice) : 'No Min'} - ${maxPrice ? formatINR(maxPrice) : 'No Max'}`
        : 'Budget';

    return (
        <div ref={wrapperRef} className="hidden lg:block w-[92%] max-w-5xl bg-white rounded-[1.5rem] shadow-2xl shadow-gray-900/10 border border-gray-100 overflow-visible">
            {/* Row 1: Category Tabs */}
            <div className="flex items-center justify-between px-6 border-b border-gray-100">
                <div className="flex items-center gap-7">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => goToTab(tab.key)}
                            className={`relative py-4 text-[14px] font-bold transition-colors ${activeTab === tab.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab.label}
                            {activeTab === tab.key && (
                                <span className="absolute left-0 right-0 -bottom-px h-[2.5px] rounded-full" style={{ backgroundColor: accentColor }} />
                            )}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => navigate('/list-property')}
                    className="flex items-center gap-1.5 py-4 text-[14px] font-bold text-gray-700 hover:text-gray-900 transition-colors shrink-0"
                >
                    Post Property
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">FREE</span>
                </button>
            </div>

            {/* Row 2: Search input */}
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="relative">
                    <button
                        onClick={() => toggleFilter('category')}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:border-gray-300 transition-colors whitespace-nowrap"
                    >
                        All {propertyCategory}
                        <ChevronDown size={14} className={`transition-transform ${openFilter === 'category' ? 'rotate-180' : ''}`} />
                    </button>
                    {openFilter === 'category' && (
                        <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-2xl border border-gray-100 shadow-xl p-2 z-50">
                            {['Residential', 'Commercial'].map(opt => (
                                <CheckOption
                                    key={opt}
                                    label={opt}
                                    checked={propertyCategory === opt}
                                    onClick={() => { setPropertyCategory(opt); setOpenFilter(null); }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 focus-within:border-gray-400 transition-colors">
                    <Search size={17} className="text-gray-400 shrink-0" />
                    {placesLoaded ? (
                        <Autocomplete
                            onLoad={setAutocomplete}
                            onPlaceChanged={handlePlaceChanged}
                            options={{
                                componentRestrictions: { country: 'in' },
                                fields: ['name', 'formatted_address']
                            }}
                            className="flex-1"
                        >
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder='Search "City, Locality or Project"'
                                className="w-full text-[14px] text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
                            />
                        </Autocomplete>
                    ) : (
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder='Search "City, Locality or Project"'
                            className="flex-1 text-[14px] text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
                        />
                    )}
                    <button onClick={handleDetectLocation} title="Detect my location">
                        <MapPin size={17} className={`text-gray-400 hover:text-gray-600 transition-colors shrink-0 ${detecting ? 'animate-bounce text-blue-500' : ''}`} />
                    </button>
                    <Mic size={17} className="text-gray-300 shrink-0" />
                </div>

                <button
                    onClick={handleSearch}
                    className="px-7 py-2.5 rounded-xl text-white font-bold text-[14px] shadow-md active:scale-[0.98] transition-all shrink-0"
                    style={{ backgroundColor: accentColor }}
                >
                    Search
                </button>
            </div>

            {/* Row 3: Quick filter pills */}
            <div className="flex items-center gap-2.5 px-4 pb-4">
                <FilterPill
                    label={budgetLabel}
                    active={!!(minPrice || maxPrice)}
                    count={0}
                    isOpen={openFilter === 'budget'}
                    onToggle={() => toggleFilter('budget')}
                    panelWidth="w-72"
                >
                    <div className="flex items-start gap-1">
                        <BudgetOptionList heading="Min" value={minPrice} onSelect={setMinPrice} />
                        <div className="w-px self-stretch bg-gray-100 mx-1.5" />
                        <BudgetOptionList heading="Max" value={maxPrice} onSelect={setMaxPrice} />
                    </div>
                    <button
                        onClick={() => setOpenFilter(null)}
                        className="w-full mt-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-[12px] font-bold uppercase tracking-wide transition-colors"
                    >
                        Apply
                    </button>
                </FilterPill>

                <FilterPill
                    label="Bedroom"
                    active={bedrooms.length > 0}
                    count={bedrooms.length}
                    isOpen={openFilter === 'bedroom'}
                    onToggle={() => toggleFilter('bedroom')}
                >
                    {BEDROOM_OPTIONS.map(opt => (
                        <CheckOption
                            key={opt.code}
                            label={opt.label}
                            checked={bedrooms.includes(opt.code)}
                            onClick={() => toggleFromArray(bedrooms, setBedrooms, opt.code)}
                        />
                    ))}
                </FilterPill>

                <FilterPill
                    label="Construction Status"
                    active={constructionStatus.length > 0}
                    count={constructionStatus.length}
                    isOpen={openFilter === 'construction'}
                    onToggle={() => toggleFilter('construction')}
                >
                    {CONSTRUCTION_OPTIONS.map(opt => (
                        <CheckOption
                            key={opt.code}
                            label={opt.label}
                            checked={constructionStatus.includes(opt.code)}
                            onClick={() => toggleFromArray(constructionStatus, setConstructionStatus, opt.code)}
                        />
                    ))}
                </FilterPill>

                <FilterPill
                    label="Posted By"
                    active={postedBy.length > 0}
                    count={postedBy.length}
                    isOpen={openFilter === 'postedBy'}
                    onToggle={() => toggleFilter('postedBy')}
                >
                    {POSTED_BY_OPTIONS.map(opt => (
                        <CheckOption
                            key={opt}
                            label={opt}
                            checked={postedBy.includes(opt)}
                            onClick={() => toggleFromArray(postedBy, setPostedBy, opt)}
                        />
                    ))}
                </FilterPill>
            </div>
        </div>
    );
};

export default DesktopSearchFilterBar;
