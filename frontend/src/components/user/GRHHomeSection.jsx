import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { propertyService, userService } from '../../services/apiService';
import GRHPropertyCard from './GRHPropertyCard';

const grhCache = {};

const GRHHomeSection = ({ title, subtitle, availabilityFilter, searchCity, theme }) => {
  const navigate = useNavigate();
  const cacheKey = `${availabilityFilter || 'default'}::${searchCity || 'all'}`;
  
  // Synchronously initialize from cache to prevent DOM height jumping on back navigation
  const [properties, setProperties] = useState(grhCache[cacheKey] || []);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(!grhCache[cacheKey]);
  const carouselRef = React.useRef(null);

  // Horizontal Scroll Memory for GRHHomeSection carousel
  React.useLayoutEffect(() => {
    if (!loading && carouselRef.current) {
      const savedScroll = sessionStorage.getItem(`scroll-left-grh-${cacheKey}`);
      if (savedScroll) {
        carouselRef.current.scrollLeft = parseInt(savedScroll, 10);
      }
    }
  }, [loading, cacheKey]);

  const handleScroll = () => {
    if (carouselRef.current) {
      sessionStorage.setItem(`scroll-left-grh-${cacheKey}`, carouselRef.current.scrollLeft.toString());
    }
  };

  useEffect(() => {
    const fetchProperties = async () => {
      if (!grhCache[cacheKey]) setLoading(true);
      try {
        const params = { availability: availabilityFilter };
        if (searchCity) params.city = searchCity;
        const promises = [propertyService.getPublic(params)];
        if (localStorage.getItem('user')) {
          promises.push(userService.getSavedPlaces());
        }
        const [data, savedRes] = await Promise.all(promises);

        grhCache[cacheKey] = data || [];
        setProperties(data || []);

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
  }, [availabilityFilter, searchCity, title, cacheKey]);

  const handleViewMore = () => {
    navigate(`/search?availability=${encodeURIComponent(availabilityFilter)}`);
  };

  return (
    <div id={`grh-section-${cacheKey.replace(/\s+/g, '-')}`} className="pt-2 pb-6 border-b border-gray-100 last:border-0 relative">
      {/* Section Header */}
      <div className="flex justify-between items-start md:items-end px-3 md:px-2 mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-start gap-1.5 md:gap-2 mb-0.5">
            <div className={`w-1 h-4 md:h-5 ${theme?.bg || 'bg-emerald-500'} rounded-full mt-1 md:mt-0 shrink-0`} />
            <h2 className="text-[17px] md:text-[22px] font-black text-gray-900 leading-tight">{title}</h2>
          </div>
          {subtitle && <p className="text-[11px] md:text-[13px] text-gray-500 mt-0.5 ml-2.5 md:ml-3 font-normal truncate">{subtitle}</p>}
        </div>
        {properties.length > 8 && (
          <button
            onClick={handleViewMore}
            className={`text-[12px] md:text-[14px] font-bold ${theme?.text || 'text-emerald-600'} ${theme?.hoverText || 'hover:text-emerald-700'} hover:underline whitespace-nowrap shrink-0 mt-1 md:mt-0`}
          >
            View All
          </button>
        )}
      </div>

      {/* Section Content (Horizontal Carousel or Empty State) */}
      {loading ? (
        <div className="flex justify-center items-center h-56">
          <Loader2 className={`animate-spin ${theme?.text || 'text-emerald-600'}`} size={32} />
        </div>
      ) : properties.length === 0 ? (
        <div className="py-10 px-5 border border-dashed border-gray-200 rounded-2xl w-full text-center bg-gray-50/30 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg mb-3">
            🏢
          </div>
          <h4 className="text-sm font-bold text-gray-800 mb-1">No Properties Found</h4>
          <p className="text-xs text-gray-400 max-w-xs mb-3">
            {searchCity
              ? `There are currently no "${title.toLowerCase()}" listed in "${searchCity}". Be the first to list yours!`
              : `There are currently no "${title.toLowerCase()}" listed on Get Right Home. Be the first to list yours!`}
          </p>
          <button
            onClick={() => navigate('/list-property')}
            className="px-4 py-1.5 bg-[#0f172a] hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-sm animate-in fade-in"
          >
            + List Property
          </button>
        </div>
      ) : (
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-2 px-5 md:mx-0 md:px-0 pb-3 w-fit max-w-full"
        >
          {properties.slice(0, 8).map((property) => (
            <GRHPropertyCard
              key={property._id}
              data={property}
              theme={theme}
              cardType="property"
              initialIsSaved={savedIds.includes(property._id)}
            />
          ))}
          {/* Spacer for right padding */}
          <div className="w-2 shrink-0" />
        </div>
      )}
    </div>
  );
};

export default GRHHomeSection;
