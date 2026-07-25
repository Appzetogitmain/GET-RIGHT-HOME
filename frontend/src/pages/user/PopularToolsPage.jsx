import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PopularToolsSection from '../../components/user/PopularToolsSection';

const PopularToolsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-10">
      {/* Header */}
      <div className="bg-surface text-white p-5 pb-6 shadow-lg sticky top-0 z-30">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Tools</h1>
        </div>
      </div>

      {/* Content */}
      <div className="py-6 flex-1 flex flex-col">
        <PopularToolsSection hideViewAll={false} />
      </div>
    </div>
  );
};

export default PopularToolsPage;
