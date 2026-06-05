import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { propertyService } from '../../services/apiService';
import GRHPropertyCard from './GRHPropertyCard';

const GRHHomeSection = ({ title, subtitle, availabilityFilter }) => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const data = await propertyService.getPublic({ availability: availabilityFilter });
        // filter out invalid properties
        setProperties(data || []);
      } catch (err) {
        console.error(`Failed to fetch properties for section ${title}:`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [availabilityFilter, title]);

  const handleViewMore = () => {
    navigate(`/search?availability=${encodeURIComponent(availabilityFilter)}`);
  };

  return (
    <div className="py-6 border-b border-gray-100 last:border-0 relative">
      {/* Section Header */}
      <div className="flex justify-between items-end px-5 md:px-0 mb-4">
        <div>
          <h2 className="text-[17px] sm:text-xl md:text-2xl font-serif font-bold text-gray-900 tracking-tight whitespace-nowrap truncate">{title}</h2>
           {subtitle && <p className="text-[11px] sm:text-xs text-gray-400 sm:text-gray-500 mt-0.5 font-normal">{subtitle}</p>}
        </div>
        <button
          onClick={handleViewMore}
          className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline whitespace-nowrap shrink-0"
        >
          View All
        </button>
      </div>

      {/* Section Content (Horizontal Carousel or Empty State) */}
      {loading ? (
        <div className="flex justify-center items-center h-56">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : properties.length === 0 ? (
        <div className="py-10 px-5 border border-dashed border-gray-200 rounded-2xl w-full text-center bg-gray-50/30 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg mb-3">
            🏢
          </div>
          <h4 className="text-sm font-bold text-gray-800 mb-1">No Properties Found</h4>
          <p className="text-xs text-gray-400 max-w-xs mb-3">There are currently no "{title.toLowerCase()}" listed on Get Right Home. Be the first to list yours!</p>
          <button
            onClick={() => navigate('/list-property')}
            className="px-4 py-1.5 bg-[#0f172a] hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-sm animate-in fade-in"
          >
            + List Property
          </button>
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-2 px-5 md:mx-0 md:px-0 pb-3 w-full">
          {properties.slice(0, 8).map((property) => (
            <GRHPropertyCard
              key={property._id}
              data={property}
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
