import React, { useEffect, useState } from 'react';
import { propertyService, userService } from '../../services/apiService';
import PropertyCard from './PropertyCard';
import GRHPropertyCard from './GRHPropertyCard';
import { Loader2 } from 'lucide-react';

const PropertyFeed = ({ selectedType, selectedCity, viewMode = 'grid', limit, extraFilters = {} }) => {
  const [properties, setProperties] = useState([]);
  const [savedHotelIds, setSavedHotelIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [isPaginating, setIsPaginating] = useState(false);
  const itemsPerPage = 12;

  const carouselRef = React.useRef(null);
  const cacheKey = selectedType || 'all';

  React.useLayoutEffect(() => {
    if (!loading && viewMode === 'carousel' && carouselRef.current) {
      const savedScroll = sessionStorage.getItem(`scroll-left-feed-${cacheKey}`);
      if (savedScroll) {
        carouselRef.current.scrollLeft = parseInt(savedScroll, 10);
      }
    }
  }, [loading, viewMode, cacheKey]);

  const handleScroll = () => {
    if (carouselRef.current) {
      sessionStorage.setItem(`scroll-left-feed-${cacheKey}`, carouselRef.current.scrollLeft.toString());
    }
  };

  useEffect(() => {
    const fetchPropertiesAndSaved = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = {};
        // Add extra filters only if they have a value
        Object.keys(extraFilters).forEach(key => {
          if (extraFilters[key] !== undefined && extraFilters[key] !== null) {
            filters[key] = extraFilters[key];
          }
        });

        // Only add type filter if a specific category is selected (not null/empty/All)
        if (selectedType && selectedType !== 'All' && selectedType !== null && selectedType !== '') {
          filters.type = selectedType;
        }

        // Fetch properties and saved status in parallel if logged in
        const promises = [propertyService.getPublic(filters)];
        if (localStorage.getItem('user')) {
          promises.push(userService.getSavedPlaces());
        }

        const [data, savedRes] = await Promise.all(promises);

        if (savedRes) {
          const list = [
            ...(savedRes.savedProperties || []),
            ...(savedRes.savedProjects || []),
            ...(savedRes.savedHotels || [])
          ];
          setSavedHotelIds(list.map(h => (typeof h === 'object' ? (h._id || h.id) : h)));
        }

        let filteredData = data;
        if (selectedCity && selectedCity !== 'All') {
          filteredData = filteredData.filter(p => p.address?.city?.toLowerCase() === selectedCity.toLowerCase());
        }

        if (extraFilters.excludePropertyType) {
          const excludeTypes = extraFilters.excludePropertyType.toLowerCase().split(',').map(s => s.trim());
          filteredData = filteredData.filter(p => {
             const pType = (p.propertyType || p.dynamicCategory?.name || p.propertyCategory || '').toLowerCase();
             return !excludeTypes.some(t => pType.includes(t));
          });
        }

        setProperties(filteredData);
        setCurrentPage(1); // Reset page on new data
      } catch (err) {
        console.error("Failed to fetch properties:", err);
        setError("Could not load properties. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertiesAndSaved();
  }, [selectedType, selectedCity, JSON.stringify(extraFilters)]);

  const handlePageChange = (newPage) => {
    setIsPaginating(true);
    // Fake a small delay for skeleton loading UX if requested
    setTimeout(() => {
      setCurrentPage(newPage);
      setIsPaginating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center ${viewMode === 'carousel' ? 'h-56' : 'py-20'}`}>
        <Loader2 className="animate-spin text-surface" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        {error}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>No properties found in this category.</p>
      </div>
    );
  }

  const isPaginatedView = viewMode === 'list' && !limit && properties.length > itemsPerPage;
  
  let displayedProperties = properties;
  
  if (limit && viewMode === 'carousel') {
    displayedProperties = properties.slice(0, limit);
  } else if (isPaginatedView) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    displayedProperties = properties.slice(startIndex, startIndex + itemsPerPage);
  }

  const totalPages = Math.ceil(properties.length / itemsPerPage);

  const renderSkeletons = () => (
    Array(itemsPerPage).fill(0).map((_, i) => (
      <div key={`sk-${i}`} className="w-full md:max-w-[340px] h-[350px] bg-gray-100 animate-pulse rounded-[1.5rem]" />
    ))
  );

  const renderPagination = () => {
    if (!isPaginatedView) return null;
    return (
      <div className="flex justify-center items-center gap-2 mt-8 mb-4 w-full">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="text-sm font-medium text-gray-500">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    );
  };

  if (viewMode === 'carousel') {
    return (
      <div 
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-2 px-5 md:mx-0 md:px-0 pb-3 w-full"
      >
        {displayedProperties.map(property => (
          <PropertyCard
            key={property._id}
            data={property}
            isSaved={savedHotelIds.includes(property._id)}
            className="min-w-[280px] max-w-[280px] flex-shrink-0"
          />
        ))}
        {/* Spacer for right padding */}
        <div className="w-2 shrink-0" />
      </div>
    );
  }
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-5 justify-items-center bg-gray-100 md:bg-transparent pb-4 md:pb-0 -mx-4 md:mx-0">
          {isPaginating ? renderSkeletons() : displayedProperties.map(property => (
            <div key={property._id} className="w-full md:max-w-[340px] flex justify-center bg-white md:bg-transparent">
               <PropertyCard
                 data={property}
                 isSaved={savedHotelIds.includes(property._id)}
                 isSearchPage={true}
                 className="!w-full !rounded-none md:!rounded-[1.5rem] border-y-0 md:border border-gray-100 shadow-sm"
               />
            </div>
          ))}
        </div>
        {renderPagination()}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="px-3.5 md:px-5 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {isPaginating ? renderSkeletons() : displayedProperties.map(property => (
          <PropertyCard
            key={property._id}
            data={property}
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
      </div>
      <div className="pb-24">
        {renderPagination()}
      </div>
    </div>
  );
};

export default PropertyFeed;
