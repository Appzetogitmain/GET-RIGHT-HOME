import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PopularToolsSection from '../../components/user/PopularToolsSection';

const PopularToolsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 md:pb-12">
      {/* Header */}
      <div className="bg-surface text-white p-4 sm:p-5 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3.5 max-w-2xl mx-auto w-full">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Tools</h1>
            <p className="text-xs text-white/80">Useful real estate calculators & tools</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-5 px-3 sm:px-4 max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <PopularToolsSection hideViewAll={true} vertical={true} />
      </div>
    </div>
  );
};

export default PopularToolsPage;

