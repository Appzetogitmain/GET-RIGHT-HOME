import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/propertyService';
import { userService, api } from '../../services/apiService';
import { MapPin, Search, Filter, Star, IndianRupee, Navigation, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PropertyCard from '../../components/user/PropertyCard';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import { locationData, bengaluruAreas } from '../../data/locationData';
const getAvailablePropertyTypes = (category, subCategory) => {
    if (category === 'Paying Guest') {
        return [
            'Apartment',
            'Independent House / Villa',
            'Builder Floor',
            '1 RK / Studio Apartment',
            'Serviced Apartment',
            'Hostel'
        ];
    }
    if (category === 'Rent / Lease') {
        if (subCategory === 'Commercial') {
            return [
                'Office',
                'Retail',
                'Industry',
                'Storage',
                'Hospitality',
                'Plot / Land',
                'Other'
            ];
        }
        // Residential Rent
        return [
            'Apartment',
            'Independent House / Villa',
            'Builder Floor',
            '1 RK / Studio Apartment',
            'Serviced Apartment',
            'Farmhouse',
            'Other'
        ];
    }
    // Sell (Buy) category
    if (subCategory === 'Commercial') {
        return [
            'Office',
            'Retail',
            'Industry',
            'Storage',
            'Hospitality',
            'Plot / Land',
            'Other'
        ];
    }
    // Sell Residential (default)
    return [
        'Apartment',
        'Independent House / Villa',
        'Builder Floor',
        '1 RK / Studio Apartment',
        'Serviced Apartment',
        'Farmhouse',
        'Plot / Land',
        'Other'
    ];
};

const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [properties, setProperties] = useState([]);
    const [savedHotelIds, setSavedHotelIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false); // Mobile toggle
    const [previewCount, setPreviewCount] = useState(0);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Filters State
    // Initialize filters from URL
    const getInitialFilters = () => {
        const amsFromUrl = searchParams.get('amenities')?.split(',') || [];
        const bhksFromUrl = searchParams.get('bhkType')?.split(',') || [];
        const furnishFromUrl = searchParams.get('furnishing')?.split(',') || [];
        const genderFromUrl = searchParams.get('gender')?.split(',') || [];
        const occupancyFromUrl = searchParams.get('occupancy')?.split(',') || [];
        const landTypeFromUrl = searchParams.get('landType')?.split(',') || [];
        const subTypeFromUrl = searchParams.get('subType')?.split(',') || [];
        const availabilityFromUrl = searchParams.get('availability')?.split(',') || [];
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

        landTypeFromUrl.forEach(v => amsFromUrl.push(v));

        const initialPropertyTypes = [];
        subTypeFromUrl.forEach(v => {
            const matched = [
                'Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK/ Studio Apartment', 
                'Serviced Apartment', 'Farmhouse', 'Plot / Land', 'Office', 'Retail', 
                'Industry', 'Storage', 'Hospitality', 'Other'
            ].find(opt => opt.toLowerCase() === v.toLowerCase());
            if (matched) {
                initialPropertyTypes.push(matched);
            } else {
                initialPropertyTypes.push(v);
            }
        });

        availabilityFromUrl.forEach(v => {
            if (v.toLowerCase() === 'ready to move') amsFromUrl.push('Ready to Move');
            else if (v.toLowerCase() === 'under construction') amsFromUrl.push('Under Construction');
            else if (v.toLowerCase() === 'pre launch') amsFromUrl.push('Pre Launch');
        });

        const typeVal = searchParams.get('type') || 'all';
        // Only read propertyCategory from URL if explicitly set (don't default to Residential)
        const pCategory = searchParams.get('propertyCategory') || '';
        const transactionTypeVal = searchParams.get('transactionType') || '';

        let categoryTab = 'Sell';
        if (transactionTypeVal) {
            categoryTab = transactionTypeVal;
        } else if (typeVal.toLowerCase().includes('pg') || typeVal.toLowerCase().includes('hostel')) {
            categoryTab = 'Paying Guest';
        } else if (typeVal.toLowerCase().includes('rent')) {
            categoryTab = 'Rent / Lease';
        } else {
            categoryTab = 'Sell';
        }

        const areasFromUrl = searchParams.get('areas')?.split(',').filter(Boolean) || [];

        return {
            search: searchParams.get('search') || '',
            type: typeVal,
            propertyCategory: pCategory || 'Residential',
            categoryTab,
            minPrice: searchParams.get('minPrice') || '',
            maxPrice: searchParams.get('maxPrice') || '',
            sort: searchParams.get('sort') || 'newest',
            amenities: [...new Set(amsFromUrl)],
            propertyTypes: initialPropertyTypes,
            radius: parseInt(searchParams.get('radius')) || 50,
            foodIncluded: searchParams.get('foodIncluded') === 'true',
            city: searchParams.get('city') || '',
            minArea: searchParams.get('minArea') || '',
            maxArea: searchParams.get('maxArea') || '',
            bathrooms: parseInt(searchParams.get('bathrooms')) || 0,
            postedBy: searchParams.get('postedBy') || '',
            purchaseType: searchParams.get('purchaseType') || '',
            areas: areasFromUrl
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
        if (showFilters) {
            if (window.lenis) window.lenis.stop();
            document.body.style.overflow = 'hidden';
        } else {
            if (window.lenis) window.lenis.start();
            document.body.style.overflow = '';
        }
        return () => {
            if (window.lenis) window.lenis.start();
            document.body.style.overflow = '';
        };
    }, [showFilters]);

    useEffect(() => {
        setFilters(getInitialFilters());
    }, [searchParams]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/categories/active');
                if (res.data) {
                    const categories = res.data;

                    const findIds = (names) => {
                        const searchNames = Array.isArray(names) ? names : [names];
                        const found = categories.filter(c => {
                            const displayName = (c.displayName || '').toLowerCase();
                            const name = (c.name || '').toLowerCase();
                            return searchNames.some(n => {
                                const target = n.toLowerCase();
                                return displayName === target || name === target ||
                                       displayName.includes(target) || name.includes(target);
                            });
                        });
                        return found.map(c => c._id).join(',');
                    };

                    const pgId = findIds(['pg', 'hostel', 'pg/co-living', 'co-living', 'paying guest', 'co-livinig']) || 'pg';
                    const rentId = findIds('rent') || 'rent';
                    const buyId = findIds('buy') || 'buy';
                    const plotId = findIds(['plot', 'plots']) || 'plot';

                    const updatedTypes = [
                        { id: 'all', label: 'All' },
                        { id: pgId, label: 'PG' },
                        { id: rentId, label: 'Rent' },
                        { id: buyId, label: 'Buy' },
                        { id: plotId, label: 'Plot' }
                    ];

                    setPropertyTypes(updatedTypes);

                    // Check typeVal in URL and resolve categoryTab
                    const typeVal = searchParams.get('type') || 'all';
                    const transactionTypeVal = searchParams.get('transactionType') || '';
                    if (typeVal !== 'all' && !transactionTypeVal) {
                        let resolvedTab = 'Sell';
                        if (typeVal === pgId || typeVal.toLowerCase().includes('pg') || typeVal.toLowerCase().includes('hostel')) {
                            resolvedTab = 'Paying Guest';
                        } else if (typeVal === rentId || typeVal.toLowerCase().includes('rent')) {
                            resolvedTab = 'Rent / Lease';
                        } else if (typeVal === buyId || typeVal === plotId) {
                            resolvedTab = 'Sell';
                        }
                        setFilters(prev => ({ ...prev, categoryTab: resolvedTab }));
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch dynamic categories:", err);
            }
        };
        fetchCategories();
    }, [searchParams]);

    const getAmenitiesOptions = () => {
        const cat = filters.categoryTab;
        
        if (cat === 'Paying Guest') {
            return [
                'Boys Only', 'Girls Only', 'Coliving',
                'Single Occupancy', 'Double Occupancy', 'Triple Occupancy',
                'Wi-Fi', 'AC', 'Food', 'Laundry', 'Housekeeping', 'CCTV', 'Security',
                'RO Water', 'Gym', 'Lift', 'Power Backup', 'Geyser', 'Fridge', 'Parking', 'TV', 'Kitchen'
            ];
        }
        if (cat === 'Rent / Lease') {
            return [
                '1 BHK', '2 BHK', '3 BHK', 'Villa', 'Studio',
                'Fully Furnished', 'Semi Furnished', 'Unfurnished',
                'Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV', 'Comfort Amenities',
                'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning'
            ];
        }
        if (cat === 'Sell') {
            return [
                'Ready to Move', 'Under Construction', 'Pre Launch',
                'East Facing', 'West Facing', 'North Facing', 'South Facing',
                'Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV',
                'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning', 'Club House'
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

    const getParamsFromFilters = (targetFilters) => {
        const params = {};
        if (targetFilters.search) params.search = targetFilters.search;
        
        // Map categoryTab to transactionType & dynamic type ID
        if (targetFilters.categoryTab) {
            params.transactionType = targetFilters.categoryTab;
            if (targetFilters.categoryTab === 'Paying Guest') {
                const pgIdObj = propertyTypes.find(t => t.label === 'PG');
                params.type = pgIdObj && pgIdObj.id !== 'pg' ? pgIdObj.id : 'pg';
            } else if (targetFilters.categoryTab === 'Rent / Lease') {
                const rentIdObj = propertyTypes.find(t => t.label === 'Rent');
                params.type = rentIdObj && rentIdObj.id !== 'rent' ? rentIdObj.id : 'rent';
            } else {
                const isPlot = targetFilters.propertyTypes && (
                    targetFilters.propertyTypes.includes('Plot / Land') ||
                    targetFilters.propertyTypes.includes('Plot')
                );
                if (isPlot) {
                    const plotIdObj = propertyTypes.find(t => t.label === 'Plot');
                    params.type = plotIdObj && plotIdObj.id !== 'plot' ? plotIdObj.id : 'plot';
                } else {
                    const buyIdObj = propertyTypes.find(t => t.label === 'Buy');
                    params.type = buyIdObj && buyIdObj.id !== 'buy' ? buyIdObj.id : 'buy';
                }
            }
        }

        // Only send propertyCategory to backend when user explicitly chose 'Commercial'
        // Many properties may not have propertyCategory field set, so never filter by 'Residential' (the default)
        if (targetFilters.propertyCategory && targetFilters.propertyCategory === 'Commercial') {
            params.propertyCategory = targetFilters.propertyCategory;
        }

        if (targetFilters.minPrice) params.minPrice = targetFilters.minPrice;
        if (targetFilters.maxPrice) params.maxPrice = targetFilters.maxPrice;
        if (targetFilters.sort) params.sort = targetFilters.sort;
        if (targetFilters.city) params.city = targetFilters.city;
        if (targetFilters.minArea) params.minArea = targetFilters.minArea;
        if (targetFilters.maxArea) params.maxArea = targetFilters.maxArea;
        if (targetFilters.bathrooms) params.bathrooms = targetFilters.bathrooms;
        if (targetFilters.postedBy) params.postedBy = targetFilters.postedBy;
        if (targetFilters.purchaseType) params.purchaseType = targetFilters.purchaseType;
        if (targetFilters.areas && targetFilters.areas.length > 0) params.areas = targetFilters.areas.join(',');

        // Map Special Amenities to specific query params
        const finalAmenities = [];
        const bhks = [];
        const furnishLevels = [];
        const genders = [];
        const occupancies = [];
        const landTypes = [];
        const subTypes = [...(targetFilters.propertyTypes || [])];
        const availabilities = [];

        targetFilters.amenities.forEach(am => {
            // Availability mapping
            if (am === 'Ready to Move') {
                availabilities.push('Ready to move');
            } else if (am === 'Under Construction') {
                availabilities.push('Under construction');
            } else if (am === 'Pre Launch') {
                availabilities.push('Pre Launch');
            }
            // Rent BHK mapping
            else if (am === '1 BHK') bhks.push('1BHK');
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
            else if (am === 'Residential' && targetFilters.type !== 'all' && (String(targetFilters.type).toLowerCase().includes('plot') || String(targetFilters.type).toLowerCase().includes('sell'))) landTypes.push('Residential');
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
        if (subTypes.length > 0) params.subType = subTypes.join(',');
        if (availabilities.length > 0) params.availability = availabilities.join(',');

        return params;
    };

    const applyFilters = () => {
        const params = getParamsFromFilters(filters);
        setSearchParams(params);
        setShowFilters(false);
    };

    useEffect(() => {
        if (!showFilters) return;

        let active = true;
        const fetchPreviewCount = async () => {
            setPreviewLoading(true);
            try {
                const params = getParamsFromFilters(filters);
                if (location) {
                    params.lat = location.lat;
                    params.lng = location.lng;
                    params.radius = filters.radius;
                }
                const res = await propertyService.getPublicProperties(params);
                if (active) {
                    if (Array.isArray(res)) {
                        setPreviewCount(res.length);
                    } else if (res.success && Array.isArray(res.properties)) {
                        setPreviewCount(res.properties.length);
                    } else {
                        setPreviewCount(0);
                    }
                }
            } catch (err) {
                console.error("Error fetching preview count:", err);
            } finally {
                if (active) setPreviewLoading(false);
            }
        };

        const handler = setTimeout(() => {
            fetchPreviewCount();
        }, 300);

        return () => {
            active = false;
            clearTimeout(handler);
        };
    }, [filters, location, showFilters]);

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
                            onSelectType={(type, label) => {
                                if (type === 'homeservice') {
                                    navigate('/home-services');
                                    return;
                                }
                                const newType = (!type || label === 'All') ? 'all' : type;

                                // Build new URL params starting from search/location/sort, clearing conflicts
                                const params = {};
                                const currentParams = Object.fromEntries([...searchParams]);
                                if (currentParams.search) params.search = currentParams.search;
                                if (currentParams.sort) params.sort = currentParams.sort;
                                if (currentParams.city) params.city = currentParams.city;
                                if (currentParams.areas) params.areas = currentParams.areas;

                                let categoryTab = 'Sell';
                                let propertyCategory = 'Residential';
                                let propertyTypes = [];

                                if (label === 'PG' || label === 'PG/Co-Living') {
                                    categoryTab = 'Paying Guest';
                                    propertyCategory = 'Residential';
                                    // Don't send propertyCategory to URL - it will filter out properties with null category
                                    params.transactionType = 'Paying Guest';
                                    if (type && type !== 'pg') params.type = type; // Only send if it's a real ObjectId
                                } else if (label === 'Rent') {
                                    categoryTab = 'Rent / Lease';
                                    propertyCategory = 'Residential';
                                    params.transactionType = 'Rent / Lease';
                                    if (type && type !== 'rent') params.type = type;
                                } else if (label === 'Buy') {
                                    categoryTab = 'Sell';
                                    propertyCategory = 'Residential';
                                    params.transactionType = 'Sell';
                                    if (type && type !== 'buy') params.type = type;
                                } else if (label === 'Plot') {
                                    categoryTab = 'Sell';
                                    propertyCategory = 'Residential';
                                    propertyTypes = ['Plot / Land'];
                                    // Send multiple plot-related subType variants to be more inclusive
                                    params.subType = 'Plot / Land,Plot,Plots,plot,plot / land';
                                    if (type && type !== 'plot') params.type = type;
                                } else {
                                    // All - clear everything
                                    categoryTab = 'Sell';
                                    propertyCategory = 'Residential';
                                }

                                setFilters(prev => ({
                                    ...prev,
                                    categoryTab,
                                    propertyCategory,
                                    propertyTypes,
                                    type: newType,
                                    amenities: [],
                                    minPrice: '',
                                    maxPrice: '',
                                    minArea: '',
                                    maxArea: '',
                                    bathrooms: 0,
                                    postedBy: '',
                                    purchaseType: ''
                                }));

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
                fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm transition-opacity duration-300 flex justify-end
                ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setShowFilters(false)}>
                <div
                    data-lenis-prevent
                    className={`
                        w-full max-w-md md:max-w-lg bg-white shadow-2xl h-full flex flex-col transition-transform duration-300 transform
                        ${showFilters ? 'translate-x-0' : 'translate-x-full'}
                    `}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                        <h2 className="text-base font-bold text-gray-900">Filters</h2>
                        <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
                        {/* 1. Category Tabs */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                            <div className="flex bg-gray-100 rounded-xl p-1">
                                {['Sell', 'Rent / Lease', 'Paying Guest'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setFilters(prev => {
                                                const nextPC = tab === 'Paying Guest' ? 'Residential' : prev.propertyCategory;
                                                // Use dynamic category IDs from propertyTypes state
                                                let nextType = 'all';
                                                if (tab === 'Paying Guest') {
                                                    const pgObj = propertyTypes.find(t => t.label === 'PG');
                                                    nextType = pgObj ? pgObj.id : 'pg';
                                                } else if (tab === 'Rent / Lease') {
                                                    const rentObj = propertyTypes.find(t => t.label === 'Rent');
                                                    nextType = rentObj ? rentObj.id : 'rent';
                                                } else {
                                                    // Sell - use Buy dynamic ID
                                                    const buyObj = propertyTypes.find(t => t.label === 'Buy');
                                                    nextType = buyObj ? buyObj.id : 'buy';
                                                }
                                                return {
                                                    ...prev,
                                                    categoryTab: tab,
                                                    type: nextType,
                                                    propertyCategory: nextPC,
                                                    propertyTypes: []
                                                };
                                            });
                                        }}
                                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all
                                            ${filters.categoryTab === tab
                                                ? 'bg-surface text-white shadow-sm'
                                                : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Sub-category (Residential / Commercial) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sub-category</label>
                            <div className="flex bg-gray-100 rounded-xl p-1">
                                {['Residential', 'Commercial'].map(subCat => {
                                    const isPG = filters.categoryTab === 'Paying Guest';
                                    const disabled = isPG && subCat === 'Commercial';
                                    return (
                                        <button
                                            key={subCat}
                                            disabled={disabled}
                                            onClick={() => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    propertyCategory: subCat,
                                                    propertyTypes: []
                                                }));
                                            }}
                                            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all
                                                ${disabled ? 'opacity-40 cursor-not-allowed text-gray-400' : ''}
                                                ${!disabled && filters.propertyCategory === subCat
                                                    ? 'bg-surface text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-800'
                                                }`}
                                        >
                                            {subCat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Localities / Areas Multi-select */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Localities / Areas (Bengaluru)</label>
                            
                            {/* Selected Chips */}
                            {filters.areas && filters.areas.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {filters.areas.map(area => (
                                        <div key={area} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-[11px] font-bold">
                                            <span>{area}</span>
                                            <button
                                                onClick={() => {
                                                    updateFilter('areas', filters.areas.filter(a => a !== area));
                                                }}
                                                className="hover:text-red-500 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Dropdown to add */}
                            <select
                                value=""
                                onChange={(e) => {
                                    const area = e.target.value;
                                    if (area && !filters.areas.includes(area)) {
                                        updateFilter('areas', [...filters.areas, area]);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-surface bg-gray-50 font-bold text-gray-700"
                            >
                                <option value="" disabled>+ Add Locality</option>
                                {bengaluruAreas.map(area => (
                                    <option key={area} value={area} disabled={filters.areas.includes(area)}>
                                        {area}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* City / District dropdown */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">City / District</label>
                            <select
                                value={filters.city || ''}
                                onChange={(e) => {
                                    updateFilter('city', e.target.value);
                                    updateFilter('search', '');
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-surface bg-gray-50 font-bold"
                            >
                                <option value="">All Bengaluru</option>
                                <option value="Bengaluru Urban">Bengaluru Urban</option>
                                <option value="Bengaluru Rural">Bengaluru Rural</option>
                            </select>
                        </div>

                        {/* 4. Budget Range */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Budget Range</label>
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

                        {/* 5. Area Range */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Area Range (sq.ft.)</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="Min Area"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-surface bg-gray-50"
                                        value={filters.minArea}
                                        onChange={(e) => updateFilter('minArea', e.target.value)}
                                    />
                                </div>
                                <span className="text-gray-300 font-bold text-xs">-</span>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="Max Area"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-surface bg-gray-50"
                                        value={filters.maxArea}
                                        onChange={(e) => updateFilter('maxArea', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 6. Property Types (Flat/Apartment, Independent House/Villa, Builder Floor, etc.) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property Type</label>
                            <div className="flex flex-wrap gap-1.5">
                                {getAvailablePropertyTypes(filters.categoryTab, filters.propertyCategory).map((subType) => {
                                    const isSelected = (filters.propertyTypes || []).includes(subType);
                                    return (
                                        <button
                                            key={subType}
                                            onClick={() => {
                                                const currentTypes = filters.propertyTypes || [];
                                                const newTypes = isSelected
                                                    ? currentTypes.filter(t => t !== subType)
                                                    : [...currentTypes, subType];
                                                updateFilter('propertyTypes', newTypes);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all
                                            ${isSelected
                                                ? 'bg-surface text-white border-surface shadow-sm'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                        >
                                            {subType}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 7. BHK Selector (Residential Rent/Buy) */}
                        {filters.propertyCategory === 'Residential' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">BHK Type</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {['1 BHK', '2 BHK', '3 BHK', 'Villa', 'Studio'].map((bhk) => {
                                        const isSelected = filters.amenities.includes(bhk);
                                        return (
                                            <button
                                                key={bhk}
                                                onClick={() => {
                                                    const newAmenities = isSelected
                                                        ? filters.amenities.filter(a => a !== bhk)
                                                        : [...filters.amenities, bhk];
                                                    updateFilter('amenities', newAmenities);
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                                                ${isSelected
                                                    ? 'bg-surface text-white border-surface shadow-sm'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                            >
                                                {bhk}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 8. Minimum Bathrooms Counter */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Minimum Bathrooms</label>
                            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-1.5 max-w-[130px] bg-gray-50">
                                <button
                                    type="button"
                                    disabled={!filters.bathrooms || filters.bathrooms <= 0}
                                    onClick={() => updateFilter('bathrooms', Math.max(0, filters.bathrooms - 1))}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 font-bold text-gray-600 disabled:opacity-30"
                                >
                                    -
                                </button>
                                <span className="font-bold text-xs text-gray-800">{filters.bathrooms || '0'}</span>
                                <button
                                    type="button"
                                    onClick={() => updateFilter('bathrooms', (filters.bathrooms || 0) + 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 font-bold text-gray-600"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* 9. Furnishing Status */}
                        {filters.propertyCategory === 'Residential' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Furnishing Status</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Fully Furnished', 'Semi Furnished', 'Unfurnished'].map((furnish) => {
                                        const isSelected = filters.amenities.includes(furnish);
                                        return (
                                            <button
                                                key={furnish}
                                                onClick={() => {
                                                    const newAmenities = isSelected
                                                        ? filters.amenities.filter(a => a !== furnish)
                                                        : [...filters.amenities, furnish];
                                                    updateFilter('amenities', newAmenities);
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                                                ${isSelected
                                                    ? 'bg-surface text-white border-surface shadow-sm'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                            >
                                                {furnish}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 10. Construction Status */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Construction Status</label>
                            <div className="flex flex-wrap gap-1.5">
                                {['Ready to Move', 'Under Construction', 'Pre Launch'].map((status) => {
                                    const isSelected = filters.amenities.includes(status);
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                const newAmenities = isSelected
                                                    ? filters.amenities.filter(a => a !== status)
                                                    : [...filters.amenities, status];
                                                updateFilter('amenities', newAmenities);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                                            ${isSelected
                                                ? 'bg-surface text-white border-surface shadow-sm'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                        >
                                            {status}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 11. Purchase Type (only for Sell/Buy) */}
                        {filters.type === 'buy' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Purchase Type</label>
                                <div className="flex gap-2">
                                    {['Resale', 'New Bookings'].map(pType => {
                                        const isSelected = filters.purchaseType.toLowerCase() === pType.toLowerCase();
                                        return (
                                            <button
                                                key={pType}
                                                onClick={() => {
                                                    updateFilter('purchaseType', isSelected ? '' : pType);
                                                }}
                                                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all
                                                    ${isSelected
                                                        ? 'bg-surface text-white border-surface shadow-sm'
                                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                {pType}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 12. Posted By */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Posted By</label>
                            <div className="flex flex-wrap gap-1.5">
                                {['Owner', 'Dealer', 'Builder'].map((role) => {
                                    const isSelected = filters.postedBy.toLowerCase().includes(role.toLowerCase());
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => {
                                                const roles = filters.postedBy ? filters.postedBy.split(',').filter(Boolean) : [];
                                                const newRoles = roles.map(r => r.toLowerCase()).includes(role.toLowerCase())
                                                    ? roles.filter(r => r.toLowerCase() !== role.toLowerCase())
                                                    : [...roles, role];
                                                updateFilter('postedBy', newRoles.join(','));
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                                            ${isSelected
                                                ? 'bg-surface text-white border-surface shadow-sm'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                        >
                                            {role}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 13. Amenities */}
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

                        {/* 14. Radius */}
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
                                    onChange={(e) => updateFilter('radius', Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-surface"
                                />
                            </div>
                        )}
                    </div>

                    {/* Bottom Footer Action Bar */}
                    <div className="border-t border-gray-100 p-4 bg-white flex items-center justify-between gap-3 shadow-lg">
                        <button
                            onClick={() => {
                                const newFilters = {
                                    search: '',
                                    type: 'all',
                                    propertyCategory: 'Residential',
                                    categoryTab: 'Buy',
                                    minPrice: '',
                                    maxPrice: '',
                                    sort: 'newest',
                                    amenities: [],
                                    radius: 50,
                                    foodIncluded: false,
                                    city: '',
                                    minArea: '',
                                    maxArea: '',
                                    bathrooms: 0,
                                    postedBy: '',
                                    purchaseType: '',
                                    areas: []
                                };
                                setFilters(newFilters);
                                setSearchParams({});
                            }}
                            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={applyFilters}
                            disabled={previewLoading}
                            className="flex-1 bg-surface hover:bg-surface-dark disabled:bg-gray-300 text-white py-2.5 rounded-xl font-bold text-xs shadow-md shadow-surface/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                        >
                            {previewLoading ? (
                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : null}
                            Apply Filters ({previewCount} Properties)
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SearchPage;
