import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/propertyService';
import { userService, api } from '../../services/apiService';
import { MapPin, Search, Filter, Star, IndianRupee, Navigation, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PropertyCard from '../../components/user/PropertyCard';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [properties, setProperties] = useState([]);
    const [savedHotelIds, setSavedHotelIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false); // Mobile toggle

    // Filters State
    // Initialize filters from URL
    const getInitialFilters = () => {
        const amsFromUrl = searchParams.get('amenities')?.split(',') || [];
        const bhksFromUrl = searchParams.get('bhkType')?.split(',') || [];
        const furnishFromUrl = searchParams.get('furnishing')?.split(',') || [];
        const genderFromUrl = searchParams.get('gender')?.split(',') || [];
        const occupancyFromUrl = searchParams.get('occupancy')?.split(',') || [];
        const landTypeFromUrl = searchParams.get('landType')?.split(',') || [];
        const foodFromUrl = searchParams.get('foodIncluded') === 'true';

        if (foodFromUrl) amsFromUrl.push('Food');

        // Map back to UI labels
        bhksFromUrl.forEach(v => {
            if (v === '1BHK') amsFromUrl.push('1 BHK');
            else if (v === '2BHK') amsFromUrl.push('2 BHK');
            else if (v === '3BHK') amsFromUrl.push('3 BHK');
            else if (v === 'Villa') amsFromUrl.push('Villa');
            else if (v === 'Studio') amsFromUrl.push('Studio');
        });

        furnishFromUrl.forEach(v => {
            if (v === 'Fully') amsFromUrl.push('Fully Furnished');
            else if (v === 'Semi') amsFromUrl.push('Semi Furnished');
            else if (v === 'Unfurnished') amsFromUrl.push('Unfurnished');
        });

        genderFromUrl.forEach(v => {
            if (v === 'Boys') amsFromUrl.push('Boys Only');
            else if (v === 'Girls') amsFromUrl.push('Girls Only');
            else if (v === 'Co-ed') amsFromUrl.push('Coliving');
        });

        occupancyFromUrl.forEach(v => {
            if (v === 'Single') amsFromUrl.push('Single Occupancy');
            else if (v === 'Double') amsFromUrl.push('Double Occupancy');
            else if (v === 'Triple') amsFromUrl.push('Triple Occupancy');
        });

        landTypeFromUrl.forEach(v => amsFromUrl.push(v)); // Residential, Commercial etc match labels

        return {
            search: searchParams.get('search') || '',
            type: searchParams.get('type')
                ? (searchParams.get('type') === 'all' ? 'all' : searchParams.get('type').split(','))
                : 'all',
            minPrice: searchParams.get('minPrice') || '',
            maxPrice: searchParams.get('maxPrice') || '',
            sort: searchParams.get('sort') || 'newest',
            amenities: [...new Set(amsFromUrl)],
            radius: parseInt(searchParams.get('radius')) || 50,
            foodIncluded: searchParams.get('foodIncluded') === 'true'
        };
    };

    const [filters, setFilters] = useState(getInitialFilters());

    const [location, setLocation] = useState(null); // { lat, lng }
    const [propertyTypes, setPropertyTypes] = useState([
        { id: 'all', label: 'All' },
        { id: 'pg', label: 'PG' },
        { id: 'rent', label: 'Rent' },
        { id: 'buy', label: 'Buy' },
        { id: 'plot', label: 'Plot' }
    ]);

    useEffect(() => {
        setFilters(getInitialFilters());
    }, [searchParams]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/categories/active');
                if (res.data) {
                    const categories = res.data;

                    const findId = (names) => {
                        const searchNames = Array.isArray(names) ? names : [names];
                        const found = categories.find(c =>
                            searchNames.some(n =>
                                (c.displayName || '').toLowerCase() === n.toLowerCase() ||
                                (c.name || '').toLowerCase() === n.toLowerCase()
                            )
                        );
                        return found ? found._id : null;
                    };

                    const updatedTypes = [
                        { id: 'all', label: 'All' },
                        { id: findId(['pg', 'hostel', 'pg/co-living', 'co-living', 'paying guest']) || 'pg', label: 'PG' },
                        { id: findId('rent') || 'rent', label: 'Rent' },
                        { id: findId('buy') || 'buy', label: 'Buy' },
                        { id: findId(['plot', 'plots']) || 'plot', label: 'Plot' }
                    ];

                    setPropertyTypes(updatedTypes);
                }
            } catch (err) {
                console.warn("Failed to fetch dynamic categories:", err);
            }
        };
        fetchCategories();
    }, []);

    const getAmenitiesOptions = () => {
        const currentType = Array.isArray(filters.type) ? filters.type[0] : filters.type;
        if (!currentType || currentType === 'all') return ['Wi-Fi', 'AC', 'Parking', 'Kitchen', 'Geyser', 'Power Backup'];

        const typeObj = propertyTypes.find(t => t.id === currentType);
        const label = typeObj ? typeObj.label.toLowerCase() : '';

        if (label.includes('pg') || label.includes('hostel')) {
            return [
                'Boys Only', 'Girls Only', 'Coliving',
                'Single Occupancy', 'Double Occupancy', 'Triple Occupancy',
                'Wi-Fi', 'AC', 'Food', 'Laundry', 'Housekeeping', 'CCTV', 'Security',
                'RO Water', 'Gym', 'Lift', 'Power Backup', 'Geyser', 'Fridge', 'Parking', 'TV', 'Kitchen'
            ];
        }
        if (label.includes('rent')) {
            return [
                '1 BHK', '2 BHK', '3 BHK', 'Villa', 'Studio',
                'Fully Furnished', 'Semi Furnished', 'Unfurnished',
                'Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV', 'Comfort Amenities',
                'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning'
            ];
        }
        if (label.includes('buy')) {
            return [
                'Apartment', 'Villa', 'Independent House',
                'Ready to Move', 'Under Construction',
                'East Facing', 'West Facing', 'North Facing', 'South Facing',
                'Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV',
                'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning', 'Club House'
            ];
        }
        if (label.includes('plot')) {
            return [
                'Residential', 'Commercial', 'Agricultural', 'Industrial',
                'East Facing', 'West Facing', 'North Facing', 'South Facing',
                'Boundary Wall', 'Gated Community', 'Red Soil', 'Black Soil', 'Electricity Available', 'Water Source'
            ];
        }

        return ['Wi-Fi', 'AC', 'Parking', 'Kitchen', 'Geyser', 'Power Backup'];
    };

    useEffect(() => {
        fetchProperties();
    }, [searchParams, location]);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const params = Object.fromEntries([...searchParams]);

            // Add location if present
            if (location) {
                params.lat = location.lat;
                params.lng = location.lng;
                params.radius = filters.radius;
            }

            // Fetch properties and saved status in parallel if logged in
            const promises = [propertyService.getPublicProperties(params)];
            if (localStorage.getItem('token')) {
                promises.push(userService.getSavedHotels());
            }

            const [res, savedRes] = await Promise.all(promises);

            if (savedRes) {
                const list = savedRes.savedHotels || [];
                setSavedHotelIds(list.map(h => (typeof h === 'object' ? h._id : h)));
            }

            // Backend returns a direct array of properties
            if (Array.isArray(res)) {
                setProperties(res);
            } else if (res.success && Array.isArray(res.properties)) {
                // Fallback for wrapped response
                setProperties(res.properties);
            } else {
                setProperties([]);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        const params = {};
        if (filters.search) params.search = filters.search;
        if (filters.type) {
            if (Array.isArray(filters.type)) {
                if (filters.type.length > 0) params.type = filters.type.join(',');
            } else if (filters.type !== 'all') {
                params.type = filters.type;
            }
        }
        if (filters.minPrice) params.minPrice = filters.minPrice;
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        if (filters.sort) params.sort = filters.sort;

        // Map Special Amenities to specific query params
        const finalAmenities = [];
        const bhks = [];
        const furnishLevels = [];
        const genders = [];
        const occupancies = [];
        const landTypes = [];

        filters.amenities.forEach(am => {
            // Rent BHK mapping
            if (am === '1 BHK') bhks.push('1BHK');
            else if (am === '2 BHK') bhks.push('2BHK');
            else if (am === '3 BHK') bhks.push('3BHK');
            else if (am === 'Villa') bhks.push('Villa');
            else if (am === 'Studio') bhks.push('Studio');

            // Rent Furnishing mapping
            else if (am === 'Fully Furnished') furnishLevels.push('Fully');
            else if (am === 'Semi Furnished') furnishLevels.push('Semi');
            else if (am === 'Unfurnished') furnishLevels.push('Unfurnished');

            // PG Gender mapping
            else if (am === 'Boys Only') genders.push('Boys');
            else if (am === 'Girls Only') genders.push('Girls');
            else if (am === 'Coliving') genders.push('Co-ed');

            // PG Occupancy mapping
            else if (am === 'Single Occupancy') occupancies.push('Single');
            else if (am === 'Double Occupancy') occupancies.push('Double');
            else if (am === 'Triple Occupancy') occupancies.push('Triple');

            // Plot Land Type mapping
            else if (am === 'Residential' && filters.type !== 'all' && (String(filters.type).toLowerCase().includes('plot') || String(filters.type).toLowerCase().includes('sell'))) landTypes.push('Residential');
            else if (am === 'Commercial') landTypes.push('Commercial');
            else if (am === 'Agricultural') landTypes.push('Agricultural');
            else if (am === 'Industrial') landTypes.push('Industrial');

            else if (am === 'Food') params.foodIncluded = 'true';

            else finalAmenities.push(am);
        });

        if (finalAmenities.length > 0) params.amenities = finalAmenities.join(',');
        if (bhks.length > 0) params.bhkType = bhks.join(',');
        if (furnishLevels.length > 0) params.furnishing = furnishLevels.join(',');
        if (genders.length > 0) params.gender = genders.join(',');
        if (occupancies.length > 0) params.occupancy = occupancies.join(',');
        if (landTypes.length > 0) params.landType = landTypes.join(',');

        setSearchParams(params);
        setShowFilters(false);
    };

    const handleNearMe = async () => {
        try {
            toast.loading('Getting location...');
            const loc = await propertyService.getCurrentLocation();
            toast.dismiss();
            toast.success('Location found!');
            setLocation(loc);
            // Automatically confirm params with sort by distance
            updateFilter('sort', 'distance');
            setSearchParams(prev => {
                const p = Object.fromEntries([...prev]);
                p.sort = 'distance';
                return p;
            });
        } catch (err) {
            toast.dismiss();
            toast.error('Could not get location. Please enable permissions.');
        }
    };

    const sortOptions = [
        { label: 'Newest', value: 'newest' },
        { label: 'Price: Low to High', value: 'price_low' },
        { label: 'Price: High to Low', value: 'price_high' },
        { label: 'Top Rated', value: 'rating' },
    ];

    return (
        <div className="min-h-screen bg-white pb-24">

            {/* Sticky Header */}
            <div className="sticky top-0 md:top-24 z-30 bg-white border-b border-gray-100 pb-1.5 pt-3 md:pt-2 px-4 shadow-sm">

                <div className="max-w-7xl mx-auto">
                    {/* Search & Actions Row */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 md:mb-1">
                        {/* Search Input Row */}
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search by city, hotel, or area..."
                                className="w-full pl-10 pr-4 py-2 md:py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-surface focus:border-surface outline-none text-sm font-medium text-gray-700 bg-gray-100/30"
                                value={filters.search}
                                onChange={(e) => updateFilter('search', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            />
                        </div>

                        {/* Actions Row */}
                        <div className="flex gap-2 md:w-72">
                            <button
                                onClick={handleNearMe}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 md:py-1.5 rounded-lg border text-[11px] font-bold transition-all active:scale-95
                                ${location
                                        ? 'bg-surface/5 text-surface border-surface'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                            >
                                <Navigation size={14} className={location ? "fill-surface text-surface" : ""} />
                                {location ? "Nearby" : "Near Me"}
                            </button>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 md:py-1.5 rounded-lg border text-[11px] font-bold transition-all active:scale-95
                                ${(filters.minPrice || filters.maxPrice || (Array.isArray(filters.type) && filters.type.length > 0 && filters.type !== 'all') || filters.amenities.length > 0)
                                        ? 'bg-surface/5 text-surface border-surface'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                            >
                                <Filter size={14} className={(filters.minPrice || filters.maxPrice || (Array.isArray(filters.type) && filters.type.length > 0 && filters.type !== 'all') || filters.amenities.length > 0) ? "fill-surface text-surface" : ""} />
                                Filters
                            </button>
                        </div>
                    </div>

                    {/* Radius Slider - Shows when Near Me is active */}
                    {location && (
                        <div className="mt-2 pt-2 border-t border-gray-100 transition-all animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                    <MapPin size={12} />
                                    Search Radius
                                </label>
                                <span className="text-xs font-bold text-surface bg-surface/10 px-2 py-0.5 rounded-full">
                                    {filters.radius} km
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                step="1"
                                value={filters.radius}
                                onChange={(e) => updateFilter('radius', Number(e.target.value))}
                                onMouseUp={() => fetchProperties()}
                                onTouchEnd={() => fetchProperties()}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-surface"
                            />
                        </div>
                    )}

                    {/* Horizontal Dynamic Tabs */}
                    <div className="mt-1 md:mt-0 -mx-4 border-t border-gray-50/50">
                        <PropertyTypeFilter
                            selectedType={Array.isArray(filters.type) ? filters.type[0] : filters.type}
                            onSelectType={(type) => {
                                const newType = type === 'All' ? 'all' : type;
                                setFilters(prev => ({ ...prev, type: newType, amenities: [] }));

                                // Immediately apply and search
                                const params = { ...Object.fromEntries([...searchParams]) };
                                if (newType === 'all') {
                                    delete params.type;
                                } else {
                                    params.type = newType;
                                }
                                // Clear amenities from URL when switching type
                                delete params.amenities;
                                setSearchParams(params);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-4 md:py-2">

                {/* Results Count & Sort */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-800">
                        {properties.length} properties found
                    </h2>

                    {/* Sort Dropdown (Small) */}
                    <div className="relative">
                        <select
                            value={filters.sort}
                            onChange={(e) => {
                                updateFilter('sort', e.target.value);
                                // Trigger fetch immediately when sort changes
                                const params = { ...Object.fromEntries([...searchParams]), sort: e.target.value };
                                setSearchParams(params);
                            }}
                            className="text-xs font-bold text-gray-500 bg-transparent outline-none pr-1 cursor-pointer"
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.value} value={opt.value} disabled={opt.value === 'distance' && !location}>
                                    Sort by {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white h-64 rounded-2xl animate-pulse border border-gray-100"></div>
                        ))}
                    </div>
                ) : properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-gray-50 p-6 rounded-full mb-6">
                            <Search size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No properties found</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            Try changing your search or filters to find what you're looking for.
                        </p>
                        <button
                            onClick={() => {
                                setFilters({
                                    search: '',
                                    type: 'all',
                                    minPrice: '',
                                    maxPrice: '',
                                    sort: 'newest',
                                    amenities: [],
                                    radius: 50
                                });
                                setLocation(null);
                                setSearchParams({});
                            }}
                            className="mt-8 text-sm font-bold text-surface hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {properties.map(property => (
                            <PropertyCard
                                key={property._id}
                                property={property}
                                isSaved={savedHotelIds.includes(property._id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Filters Sidebar/Modal */}
            <div className={`
                fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300
                ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setShowFilters(false)}>
                <div
                    className={`
                        absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-4 overflow-y-auto transition-transform duration-300
                        ${showFilters ? 'translate-x-0' : 'translate-x-full'}
                    `}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-lg font-bold text-gray-800">Filters</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const newFilters = {
                                        ...filters,
                                        type: 'all',
                                        minPrice: '',
                                        maxPrice: '',
                                        amenities: []
                                    };
                                    setFilters(newFilters);

                                    // Apply core params immediately on clear
                                    const params = {};
                                    if (filters.search) params.search = filters.search;
                                    if (filters.sort) params.sort = filters.sort;
                                    setSearchParams(params);
                                }}
                                className="text-xs font-bold text-red-500 hover:text-red-600"
                            >
                                Clear
                            </button>
                            <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Type */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {propertyTypes.map(type => {
                                    const typeValue = type.id;
                                    const isSelected = typeValue === 'all'
                                        ? filters.type === 'all'
                                        : (Array.isArray(filters.type) ? filters.type.includes(typeValue) : filters.type === typeValue);

                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                const newType = typeValue === 'all' ? 'all' : typeValue;
                                                // Clear amenities when switching types as they are context-specific
                                                setFilters(prev => ({ ...prev, type: newType, amenities: [] }));
                                            }}
                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all truncate
                                            ${isSelected
                                                    ? 'bg-surface text-white border-surface shadow-sm'
                                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}
                                        >
                                            {type.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price Range</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-surface bg-gray-50"
                                        value={filters.minPrice}
                                        onChange={(e) => updateFilter('minPrice', e.target.value)}
                                    />
                                </div>
                                <span className="text-gray-300 font-bold text-xs">-</span>
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-surface bg-gray-50"
                                        value={filters.maxPrice}
                                        onChange={(e) => updateFilter('maxPrice', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Amenities */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amenities & Features</label>
                            <div className="flex flex-wrap gap-1.5">
                                {getAmenitiesOptions().map((amenity) => (
                                    <button
                                        key={amenity}
                                        onClick={() => {
                                            const newAmenities = filters.amenities.includes(amenity)
                                                ? filters.amenities.filter(a => a !== amenity)
                                                : [...filters.amenities, amenity];
                                            updateFilter('amenities', newAmenities);
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                                        ${filters.amenities.includes(amenity)
                                                ? 'bg-surface/10 text-surface border-surface'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                    >
                                        {amenity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Radius */}
                        {location && (
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Search Radius</label>
                                    <span className="text-[10px] font-bold text-surface">{filters.radius} km</span>
                                </div>
                                <input
                                    type="range"
                                    min="1" max="50"
                                    value={filters.radius}
                                    onChange={(e) => updateFilter('radius', e.target.value)}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-surface"
                                />
                            </div>
                        )}

                        <div className="pt-2 pb-6">
                            <button
                                onClick={applyFilters}
                                className="w-full bg-surface text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-surface/20 active:scale-95 transition-transform"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SearchPage;
