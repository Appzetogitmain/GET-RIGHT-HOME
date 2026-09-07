import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../../components/user/HeroSection';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import ExclusiveOffers from '../../components/user/ExclusiveOffers';
import ReelSection from '../../components/user/ReelSection';
import PopularBuilders from '../../components/user/PopularBuilders';
import SupportSection from '../../components/user/SupportSection';
import { categoryService } from '../../services/categoryService';
import PropertyCard from '../../components/user/PropertyCard';
import { propertyService, userService } from '../../services/apiService';
import PropertyVideoCurations from '../../components/user/PropertyVideoCurations';
import { getPreferredCity } from '../../utils/locationPreference';

// Theme for Rent Page
const THEME = {
    heroBg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', // Light Violet
    pageBg: '#f5f3ff', // Violet theme background
    accent: '#8B5CF6',
    text: 'text-violet-600',
    hoverText: 'hover:text-violet-700',
    groupHoverText: 'group-hover:text-violet-700',
    bg: 'bg-violet-500',
    bgLight: 'bg-violet-500/10'
};

const rentSectionCache = {};

const RentPGSection = ({ title, typeId, subtitle, extraFilters = {}, onTypeSelect, typeLabel, selectedCity }) => {
    const cacheKey = `${typeId}::${selectedCity || 'all'}::${JSON.stringify(extraFilters)}`;
    const [properties, setProperties] = useState(rentSectionCache[cacheKey] || []);
    const [savedIds, setSavedIds] = useState([]);
    const [loading, setLoading] = useState(!rentSectionCache[cacheKey]);
    const carouselRef = React.useRef(null);

    React.useLayoutEffect(() => {
        if (!loading && carouselRef.current) {
            const savedScroll = sessionStorage.getItem(`scroll-left-rentsection-${cacheKey}`);
            if (savedScroll) {
                carouselRef.current.scrollLeft = parseInt(savedScroll, 10);
            }
        }
    }, [loading, cacheKey]);

    const handleScroll = () => {
        if (carouselRef.current) {
            sessionStorage.setItem(`scroll-left-rentsection-${cacheKey}`, carouselRef.current.scrollLeft.toString());
        }
    };

    useEffect(() => {
        const fetchProperties = async () => {
            if (!typeId) return;
            if (!rentSectionCache[cacheKey]) setLoading(true);
            try {
                const filters = { type: typeId };
                Object.keys(extraFilters).forEach(key => {
                    if (extraFilters[key] !== undefined && extraFilters[key] !== null) {
                        filters[key] = extraFilters[key];
                    }
                });

                const promises = [propertyService.getPublic(filters)];
                if (localStorage.getItem('user')) {
                    promises.push(userService.getSavedPlaces());
                }

                const [data, savedRes] = await Promise.all(promises);

                let filteredData = data || [];
                if (selectedCity && selectedCity !== 'All') {
                    const sc = selectedCity.trim().toLowerCase();
                    filteredData = filteredData.filter(p => {
                        const city = (
                            p.address?.city ||
                            p.city ||
                            p.dynamicData?.city ||
                            p.address?.district ||
                            ''
                        ).trim().toLowerCase();
                        return city === sc || city.includes(sc) || sc.includes(city);
                    });
                }

                if (extraFilters.excludePropertyType) {
                    const excludeTypes = extraFilters.excludePropertyType.toLowerCase().split(',').map(s => s.trim());
                    filteredData = filteredData.filter(p => {
                        const pType = (p.propertyType || p.dynamicCategory?.name || p.propertyCategory || '').toLowerCase();
                        return !excludeTypes.some(t => pType.includes(t));
                    });
                }

                if (extraFilters.gender) {
                    const targetGender = extraFilters.gender.toLowerCase();
                    filteredData = filteredData.filter(p => {
                        const g = (p.pgDetails?.preferredGender || p.dynamicData?.gender || p.dynamicData?.occupancyType || '').toLowerCase();
                        return g.includes(targetGender) || g.includes('anyone') || g.includes('all');
                    });
                }

                rentSectionCache[cacheKey] = filteredData;
                setProperties(filteredData);

                if (savedRes) {
                    const list = [
                        ...(savedRes.savedProperties || []),
                        ...(savedRes.savedProjects || []),
                        ...(savedRes.savedHotels || [])
                    ];
                    setSavedIds(list.map(h => (typeof h === 'object' ? (h._id || h.id) : h)));
                }
            } catch (err) {
                console.error(`Failed to fetch properties for section ${title}:`, err);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [typeId, selectedCity, JSON.stringify(extraFilters), title, cacheKey]);

    // If 0 properties match for the selected location, hide the entire category/section
    if (properties.length === 0) {
        return null;
    }

    const displayedProperties = properties.slice(0, 8);

    return (
        <div id={`rent-section-${title.replace(/[^a-zA-Z0-9]/g, '-')}`} className="py-4 border-b border-gray-100 last:border-0 relative">
            <div className="flex justify-between items-start md:items-end px-3 md:px-2 mb-3">
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-start gap-1.5 md:gap-2 mb-0.5">
                        <div className="w-1 h-4 md:h-5 bg-violet-500 rounded-full mt-1 md:mt-0 shrink-0" />
                        <h2 className="text-[17px] md:text-[22px] font-black text-gray-900 leading-tight">{title}</h2>
                    </div>
                    {subtitle && <p className="text-[11px] md:text-[13px] text-gray-500 mt-0.5 ml-2.5 md:ml-3 truncate">{subtitle}</p>}
                </div>
                <button
                    onClick={() => {
                        onTypeSelect(typeId, typeLabel, extraFilters);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[12px] md:text-[14px] font-bold text-violet-600 hover:text-violet-700 hover:underline shrink-0 whitespace-nowrap mt-1 md:mt-0"
                >
                    View All
                </button>
            </div>
            <div
                ref={carouselRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-2 px-5 md:mx-0 md:px-0 pb-3 w-full"
            >
                {displayedProperties.map(property => (
                    <PropertyCard
                        key={property._id}
                        data={property}
                        isSaved={savedIds.includes(property._id)}
                        className="min-w-[280px] max-w-[280px] flex-shrink-0"
                    />
                ))}
                {/* Spacer for right padding */}
                <div className="w-2 shrink-0" />
            </div>
        </div>
    );
};

const RentPage = () => {
    const navigate = useNavigate();
    const [searchCity, setSearchCity] = useState(getPreferredCity());
    const [sectionIds, setSectionIds] = useState({ rent: null, pg: null });

    const selectedType = { id: sectionIds.rent, label: 'Rent/PG' };

    useEffect(() => {
        const fetchIds = async () => {
            try {
                const categories = await categoryService.getActiveCategories();
                
                const findCategoryIds = (names) => {
                    const searchNames = Array.isArray(names) ? names : [names];
                    const found = categories.filter(c =>
                        searchNames.some(n =>
                            (c.displayName || '').toLowerCase() === n.toLowerCase() ||
                            (c.name || '').toLowerCase() === n.toLowerCase()
                        )
                    );
                    return found.map(c => c._id).length > 0 ? found.map(c => c._id).join(',') : null;
                };

                setSectionIds({
                    rent: findCategoryIds('Rent'),
                    pg: findCategoryIds(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig', 'paying guest'])
                });
            } catch (err) {
                console.error("Failed to fetch Category IDs", err);
            }
        };
        fetchIds();
    }, []);

    const handleTypeSelect = (id, label, extraFilters = {}) => {
        const queryParams = new URLSearchParams();
        
        // Add all extra filters to the query params
        Object.entries(extraFilters).forEach(([key, value]) => {
            queryParams.append(key, value);
        });

        // Set the transactionType based on the label so SearchPage can apply the global filter
        if (label === 'PG/Co-Living') {
            queryParams.append('transactionType', 'PG');
        } else if (label === 'Rent') {
            queryParams.append('transactionType', 'Rent');
        }

        if (searchCity && searchCity !== 'All') {
            queryParams.append('city', searchCity);
        }

        const queryString = queryParams.toString();
        
        navigate(`/search${queryString ? `?${queryString}` : ''}`);
    };

    const handleCategoryTabSelect = (id, label) => {
        if (label === 'All') navigate('/');
        else if (label === 'Rent' || label === 'Rent/PG' || label === 'PG/Co-Living' || label === 'PG') navigate('/rent-pg');
        else if (label === 'Plot') navigate('/plot');
        else if (label === 'Home Service') navigate('/home-services');
        else if (label === 'Buy') navigate('/buy');
    };

    return (
        <main className="transition-colors duration-700 w-full overflow-x-hidden min-h-screen" style={{ backgroundColor: THEME.pageBg }}>
            {/* Hero Section */}
            <div className="relative min-h-[280px] md:min-h-[340px]">
                <div className="absolute inset-0 w-full h-full transition-all duration-700" style={{ background: THEME.heroBg }} />
                <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]" style={{ background: `linear-gradient(to top, ${THEME.pageBg}, transparent)` }} />
                
                <div className="relative z-40 flex flex-col min-h-[280px] md:min-h-[340px]">
                    <HeroSection
                        theme={THEME}
                        selectedType={selectedType}
                        onSearch={(city) => setSearchCity(city)}
                    />

                    <div className="pt-2 pb-6 border-b border-gray-100">
                        <PropertyTypeFilter
                            selectedType={selectedType.id}
                            selectedLabel={selectedType.label}
                            onSelectType={handleCategoryTabSelect}
                            theme={THEME}
                        />
                    </div>
                </div>
            </div>

            {/* 1. Offers Section */}
            <ExclusiveOffers themeColor="violet" />

            {/* Property Videos */}
            <div id="video-curations-section" className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto mt-4 mb-6">
                <PropertyVideoCurations pageType="rent" themeColor="violet" />
            </div>

            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto flex flex-col gap-6">
                
                {sectionIds.pg && (
                    <RentPGSection
                        title="Scholar & Professional Stays"
                        subtitle="Top rated PGs and Hostels near you"
                        typeId={sectionIds.pg}
                        typeLabel="PG/Co-Living"
                        onTypeSelect={handleTypeSelect}
                        selectedCity={searchCity}
                    />
                )}

                {sectionIds.rent && (
                    <RentPGSection
                        title="Properties for Rent"
                        subtitle="Apartments, Homes, and Villas for Rent"
                        typeId={sectionIds.rent}
                        extraFilters={{ excludeAvailability: 'Pre Launch,Under construction', excludePropertyType: 'plot,land' }}
                        typeLabel="Rent"
                        onTypeSelect={handleTypeSelect}
                        selectedCity={searchCity}
                    />
                )}

                {sectionIds.pg && (
                    <RentPGSection
                        title="PGs for boys"
                        subtitle="Top rated Boys PGs and Hostels near you"
                        typeId={sectionIds.pg}
                        extraFilters={{ gender: 'Boys' }}
                        typeLabel="PG/Co-Living"
                        onTypeSelect={handleTypeSelect}
                        selectedCity={searchCity}
                    />
                )}

                {sectionIds.pg && (
                    <RentPGSection
                        title="PGs for Girls"
                        subtitle="Top rated Girls PGs and Hostels near you"
                        typeId={sectionIds.pg}
                        extraFilters={{ gender: 'Girls' }}
                        typeLabel="PG/Co-Living"
                        onTypeSelect={handleTypeSelect}
                        selectedCity={searchCity}
                    />
                )}

                {/* 4. Reels (Rent Context) */}
                <ReelSection category="Rent" theme={THEME} />

                {/* 11. Popular Builders (Existing) */}
                <PopularBuilders themeColor="violet" />

            </div>

            <SupportSection />
        </main>
    );
};

export default RentPage;
