import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/propertyService';
import { userService, api } from '../../services/apiService';
import { MapPin, Search, Filter, Star, IndianRupee, Navigation, X, ChevronLeft, Heart, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import PropertyCard from '../../components/user/PropertyCard';
import AdvancedFilterModal from '../../components/user/AdvancedFilterModal';
import MobileSearchOverlay from '../../components/user/MobileSearchOverlay';
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
    const { isLoggedIn } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [properties, setProperties] = useState([]);
    const [savedHotelIds, setSavedHotelIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false); // Mobile toggle
    const [activeModalTab, setActiveModalTab] = useState('Quick Filters');
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
                'Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 
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
        const pathName = window.location.pathname;
        if (pathName === '/rent') {
            categoryTab = 'Rent / Lease';
        } else if (pathName === '/pg-coliving') {
            categoryTab = 'Paying Guest';
        } else if (pathName === '/plot') {
            categoryTab = 'Sell';
        } else if (pathName === '/buy') {
            categoryTab = 'Sell';
        } else if (transactionTypeVal) {
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
            areas: areasFromUrl,
            builder: searchParams.get('builder') ? searchParams.get('builder').split(',').filter(Boolean) : []
        };
    };

    const [filters, setFilters] = useState(getInitialFilters());
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);

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

    const [builders, setBuilders] = useState([]);

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

                    // Check pathname overrides or URL query params
                    const pathName = window.location.pathname;
                    if (pathName === '/rent') {
                        setFilters(prev => ({ ...prev, categoryTab: 'Rent / Lease', type: rentId }));
                    } else if (pathName === '/pg-coliving') {
                        setFilters(prev => ({ ...prev, categoryTab: 'Paying Guest', type: pgId }));
                    } else if (pathName === '/plot') {
                        setFilters(prev => ({ ...prev, categoryTab: 'Sell', type: plotId }));
                    } else if (pathName === '/buy') {
                        setFilters(prev => ({ ...prev, categoryTab: 'Sell', type: buyId }));
                    } else {
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
                            setFilters(prev => ({ ...prev, categoryTab: resolvedTab, type: typeVal }));
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch dynamic categories:", err);
            }
        };

        const fetchBuilders = async () => {
            try {
                const res = await api.get('/properties/builders');
                if (res.data && res.data.success) {
                    setBuilders(res.data.builders || []);
                }
            } catch (err) {
                console.warn("Failed to fetch builders:", err);
            }
        };

        fetchCategories();
        fetchBuilders();
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

            // Pathname overrides
            const pathName = window.location.pathname;
            if (pathName === '/rent') {
                params.transactionType = 'Rent / Lease';
                const rentIdObj = propertyTypes.find(t => t.label === 'Rent');
                params.type = rentIdObj && rentIdObj.id !== 'rent' ? rentIdObj.id : 'rent';
            } else if (pathName === '/pg-coliving') {
                params.transactionType = 'Paying Guest';
                const pgIdObj = propertyTypes.find(t => t.label === 'PG');
                params.type = pgIdObj && pgIdObj.id !== 'pg' ? pgIdObj.id : 'pg';
            } else if (pathName === '/plot') {
                params.transactionType = 'Sell';
                const plotIdObj = propertyTypes.find(t => t.label === 'Plot');
                params.type = plotIdObj && plotIdObj.id !== 'plot' ? plotIdObj.id : 'plot';
            } else if (pathName === '/buy') {
                params.transactionType = 'Sell';
                const buyIdObj = propertyTypes.find(t => t.label === 'Buy');
                params.type = buyIdObj && buyIdObj.id !== 'buy' ? buyIdObj.id : 'buy';
            }

            // Add location if present
            if (location) {
                params.lat = location.lat;
                params.lng = location.lng;
                params.radius = filters.radius;
            }

            // Fetch properties and saved status in parallel if logged in
            const promises = [propertyService.getPublicProperties(params)];
            if (isLoggedIn) {
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

    const toggleQuickFilter = (filterKey, value) => {
        setFilters(prev => {
            let newValues;
            const current = filterKey === 'postedBy' 
                ? (prev[filterKey] ? prev[filterKey].split(',') : [])
                : (Array.isArray(prev[filterKey]) ? prev[filterKey] : []);

            if (current.includes(value)) {
                newValues = current.filter(v => v !== value);
            } else {
                newValues = [...current, value];
            }

            const nextFilters = { ...prev };
            if (filterKey === 'postedBy') {
                nextFilters[filterKey] = newValues.join(',');
            } else {
                nextFilters[filterKey] = newValues;
            }

            // apply filters immediately
            setTimeout(() => {
                const newParams = getParamsFromFilters(nextFilters);
                setSearchParams(newParams, { replace: true });
            }, 0);

            return nextFilters;
        });
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
        const targetAreas = Array.isArray(targetFilters.areas)
            ? targetFilters.areas
            : (typeof targetFilters.areas === 'string' ? targetFilters.areas.split(',').filter(Boolean) : []);
        if (targetAreas.length > 0) params.areas = targetAreas.join(',');

        const targetBuilders = Array.isArray(targetFilters.builder)
            ? targetFilters.builder
            : (typeof targetFilters.builder === 'string' ? targetFilters.builder.split(',').filter(Boolean) : []);
        if (targetBuilders.length > 0) params.builder = targetBuilders.join(',');

        // Map Special Amenities to specific query params
        const finalAmenities = [];
        const bhks = [];
        const furnishLevels = [];
        const genders = [];
        const occupancies = [];
        const landTypes = [];
        const subTypes = Array.isArray(targetFilters.propertyTypes)
            ? targetFilters.propertyTypes
            : (typeof targetFilters.propertyTypes === 'string' ? targetFilters.propertyTypes.split(',').filter(Boolean) : []);
        const availabilities = [];

        const targetAmenities = Array.isArray(targetFilters.amenities)
            ? targetFilters.amenities
            : (typeof targetFilters.amenities === 'string' ? targetFilters.amenities.split(',').filter(Boolean) : []);

        targetAmenities.forEach(am => {
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
        setSearchParams(params, { replace: true });
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
            }, { replace: true });
        } catch (err) {
            toast.dismiss();
            toast.error('Could not get location. Please enable permissions.');
        }
    };

    const sortOptions = [
        { value: 'relevance', label: 'Relevance' },
        { value: 'newest', label: 'Newest first' },
        { value: 'priceAsc', label: 'Price Low to High' },
        { value: 'priceDesc', label: 'Price High to Low' },
        { value: 'pricePerSqftAsc', label: 'Price / sq.ft. : Low to High' },
        { value: 'pricePerSqftDesc', label: 'Price / sq.ft. : High to Low' }
    ];

    return (
        <div className="min-h-screen bg-white pb-24">

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100 pb-2 pt-3 md:pt-4 px-4 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    {/* Header Top Row (Search Bar) */}
                    <div className="flex items-center gap-3 mb-3">
                        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center shrink-0">
                            <ChevronLeft size={20} className="text-gray-600" />
                        </button>
                        <div 
                            className="relative flex-grow"
                            onClick={() => setShowSearchOverlay(true)}
                        >
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <div className="w-full pl-4 pr-9 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-400 bg-gray-50 flex items-center h-9">
                                {filters.areas && filters.areas.length > 0 ? filters.areas.join(', ') : (filters.search || "Search City/Locality/Project")}
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                if (!localStorage.getItem('user')) {
                                    toast.error('Please login to view saved places');
                                    navigate('/login', { state: { from: '/saved-places' } });
                                } else {
                                    navigate('/saved-places');
                                }
                            }}
                            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-colors"
                        >
                            <Heart size={18} className="text-gray-600" />
                        </button>
                    </div>

                    {/* Quick Filters Horizontal Scroll */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                        {/* Filter Button */}
                        <button 
                            onClick={() => setShowFilters(true)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-full shrink-0 active:scale-95 transition-transform"
                        >
                            <SlidersHorizontal size={14} className="text-gray-700" />
                            {(() => {
                                let count = 0;
                                if (filters.minPrice || filters.maxPrice) count++;
                                if (filters.propertyTypes && filters.propertyTypes.length > 0) count++;
                                if (filters.amenities && filters.amenities.length > 0) count++;
                                if (filters.minArea || filters.maxArea) count++;
                                if (filters.bathrooms > 0) count++;
                                if (filters.postedBy) count++;
                                if (filters.purchaseType) count++;
                                if (filters.areas && filters.areas.length > 0) count++;
                                if (filters.builder && Array.isArray(filters.builder) && filters.builder.length > 0) count++;
                                return count > 0 ? <span className="text-xs font-bold text-surface">{count}</span> : null;
                            })()}
                        </button>

                        {/* Sort Dropdown */}
                        <div className="relative shrink-0">
                            <select
                                value={filters.sort}
                                onChange={(e) => {
                                    updateFilter('sort', e.target.value);
                                    const params = { ...Object.fromEntries([...searchParams]), sort: e.target.value };
                                    setSearchParams(params, { replace: true });
                                }}
                                className="appearance-none pl-3 pr-7 py-1.5 border border-gray-300 rounded-full text-xs font-medium text-gray-700 bg-white outline-none cursor-pointer"
                            >
                                <option value="" disabled hidden>Sort</option>
                                {sortOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Quick Filter Buttons */}
                        {(() => {
                            const qfButtons = [
                                { label: 'Owner', key: 'postedBy', isToggle: true, val: 'Owner' },
                                { label: 'Budget', isModal: true, tab: 'Budget' },
                                { label: 'BHK', isModal: true, tab: 'BHK' },
                                { label: 'Property Type', isModal: true, tab: 'Property Type' },
                                { label: 'New Launch', key: 'amenities', isToggle: true, val: 'New Launch' },
                                { label: 'Verified', key: 'amenities', isToggle: true, val: 'Verified Properties' },
                                { label: 'New Booking', key: 'purchaseType', isToggle: true, val: 'New Bookings' },
                                { label: 'Ready To Move', key: 'amenities', isToggle: true, val: 'Ready to Move' },
                                { label: 'With Photos', key: 'amenities', isToggle: true, val: 'With Photos' },
                                { label: 'With Videos', key: 'amenities', isToggle: true, val: 'With Videos' },
                                { label: 'Gated Society', key: 'amenities', isToggle: true, val: 'Gated Society' },
                                { label: 'Property Size', isModal: true, tab: 'Property Size' },
                                { label: 'Under Construction', key: 'amenities', isToggle: true, val: 'Under Construction' },
                                { label: 'Possession Status', isModal: true, tab: 'Possession Status' },
                                { label: 'Builders', isModal: true, tab: 'Builders' },
                                { label: 'Floor Preference', isModal: true, tab: 'Floor Preference' },
                                { label: 'Project', isModal: true, tab: 'Projects' }
                            ];

                            return qfButtons.map(qf => {
                                let isSelected = false;
                                if (qf.isToggle && filters[qf.key]) {
                                    const current = Array.isArray(filters[qf.key]) ? filters[qf.key] : filters[qf.key].split(',');
                                    isSelected = current.includes(qf.val);
                                }

                                return (
                                    <button
                                        key={qf.label}
                                        onClick={() => {
                                            if (qf.isModal) {
                                                setActiveModalTab(qf.tab);
                                                setShowFilters(true);
                                            } else if (qf.isToggle) {
                                                toggleQuickFilter(qf.key, qf.val);
                                            }
                                        }}
                                        className={`px-3 py-1.5 border rounded-full text-xs font-medium shrink-0 flex items-center gap-1 whitespace-nowrap transition-colors ${isSelected ? 'border-surface text-surface bg-surface/10 font-bold' : 'border-gray-300 text-gray-700 bg-white'}`}
                                    >
                                        {qf.label}
                                        {qf.isModal && (
                                            <ChevronDown size={14} className={isSelected ? "text-surface" : "text-gray-400"} />
                                        )}
                                    </button>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-0 md:px-4 py-4 md:py-2">

                {/* Results Count & Sort */}
                <div className="flex items-center justify-between mb-4 px-4 md:px-0">
                    <h2 className="text-sm font-bold text-gray-800">
                        {properties.length} properties found
                    </h2>

                    {/* Sort Dropdown (Small) */}
                    <div className="relative hidden md:block">
                        <select
                            value={filters.sort}
                            onChange={(e) => {
                                updateFilter('sort', e.target.value);
                                const params = { ...Object.fromEntries([...searchParams]), sort: e.target.value };
                                setSearchParams(params, { replace: true });
                            }}
                            className="text-xs font-bold text-gray-600 bg-transparent outline-none pr-1 cursor-pointer appearance-none"
                        >
                            <option value="newest" disabled hidden>Sort</option>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-5 justify-items-center">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white h-[340px] w-full md:max-w-[340px] rounded-none md:rounded-[1.5rem] animate-pulse border-y md:border border-gray-100"></div>
                        ))}
                    </div>
                ) : properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
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
                                    radius: 50,
                                    builder: []
                                });
                                setLocation(null);
                                setSearchParams({}, { replace: true });
                            }}
                            className="mt-8 text-sm font-bold text-surface hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-5 justify-items-center bg-gray-100 md:bg-transparent pb-4 md:pb-0">
                        {properties.map(property => (
                            <div key={property._id} className="w-full md:max-w-[340px] flex justify-center bg-white md:bg-transparent">
                                <PropertyCard
                                    property={property}
                                    isSaved={savedHotelIds.includes(property._id)}
                                    isSearchPage={true}
                                    className="!w-full !rounded-none md:!rounded-[1.5rem] border-y-0 md:border border-gray-100 shadow-sm"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Advanced Filters Modal (Bottom Sheet) */}
            <AdvancedFilterModal 
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                filters={filters}
                setFilters={setFilters}
                updateFilter={updateFilter}
                applyFilters={applyFilters}
                previewCount={previewCount}
                previewLoading={previewLoading}
                clearAllFilters={() => {
                    setSearchParams({}, { replace: true });
                    setFilters({
                        search: '',
                        type: 'all',
                        propertyCategory: 'Residential',
                        categoryTab: 'Sell',
                        minPrice: '',
                        maxPrice: '',
                        sort: 'newest',
                        amenities: [],
                        propertyTypes: [],
                        radius: 50,
                        foodIncluded: false,
                        city: '',
                        minArea: '',
                        maxArea: '',
                        bathrooms: 0,
                        postedBy: '',
                        purchaseType: '',
                        areas: [],
                        builder: []
                    });
                    setLocation(null);
                }}
                activeTab={activeModalTab}
                setActiveTab={setActiveModalTab}
                builders={builders}
            />

            <MobileSearchOverlay 
                isOpen={showSearchOverlay}
                onClose={() => setShowSearchOverlay(false)}
                initialFilters={filters}
                onApplyFilters={(newFilters) => {
                    const finalParams = getParamsFromFilters({...filters, ...newFilters});
                    setSearchParams(finalParams, { replace: true });
                    setFilters(prev => ({...prev, ...newFilters}));
                }}
            />

        </div>
    );
};

export default SearchPage;
