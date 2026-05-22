import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { locationData, COUNTRY } from '../../data/locationData';

/**
 * CityDropdown — Hero Section city picker
 * Currently scoped to Bangalore (Karnataka) only.
 * Shows Bengaluru Urban + Bengaluru Rural districts and their sub-areas.
 */

// Build Bangalore city-options from locationData
const BANGALORE_DISTRICTS = locationData[COUNTRY]?.Karnataka || {};

// Shape: [{ district: 'Bengaluru Urban', areas: [...] }, ...]
const DISTRICT_LIST = Object.entries(BANGALORE_DISTRICTS).map(([district, areas]) => ({
  district,
  areas
}));

const CityDropdown = ({ 
  selectedCity, 
  selectedDistrict, 
  onSelect, 
  theme, 
  fullWidth = false, 
  rounded = 'rounded-xl',
  textClass = 'text-[13px]',
  iconSize = 15,
  chevronSize = 13,
  paddingClass = 'px-3 py-1.5'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedDistrict, setExpandedDistrict] = useState(null);
  const dropdownRef = useRef(null);
  const accentColor = theme?.accent || '#10B981';

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAll = () => {
    onSelect({ city: null, district: null });
    setIsOpen(false);
    setExpandedDistrict(null);
  };

  const handleSelectDistrict = (district) => {
    onSelect({ city: 'Bengaluru', district });
    setIsOpen(false);
    setExpandedDistrict(null);
  };

  const handleSelectArea = (district, area) => {
    onSelect({ city: area, district });
    setIsOpen(false);
    setExpandedDistrict(null);
  };

  const displayLabel = selectedCity || (selectedDistrict ? selectedDistrict : 'All Cities');

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="city-dropdown-trigger"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-2 ${paddingClass} ${rounded} border bg-white hover:border-gray-300 transition-all ${
          fullWidth
            ? 'w-full justify-between'
            : 'min-w-[120px] max-w-[155px]'
        }`}
        style={{ borderColor: isOpen ? accentColor : '#e5e7eb' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={iconSize} className="text-blue-600 shrink-0" />
          <span className={`${textClass} font-semibold text-gray-800 truncate`}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          size={chevronSize}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden"
          style={{ maxHeight: '380px' }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <MapPin size={13} className="text-blue-600" />
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Bengaluru, Karnataka</span>
          </div>

          {/* Scrollable List */}
          <div className="overflow-y-auto" style={{ maxHeight: '330px' }}>

            {/* All Cities option */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-gray-50 transition-colors ${
                !selectedCity ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <span
                className="font-semibold text-sm"
                style={{ color: !selectedCity ? accentColor : '#1f2937' }}
              >
                All Cities
              </span>
              {!selectedCity && (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </button>

            {/* District + Area list */}
            {DISTRICT_LIST.map(({ district, areas }) => {
              const isDistrictSelected = selectedDistrict === district && !selectedCity;
              const isExpanded = expandedDistrict === district;

              return (
                <div key={district}>
                  {/* District Row */}
                  <div
                    className={`flex items-center border-b border-gray-50 ${
                      isDistrictSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDistrict(district)}
                      className="flex-1 flex items-center px-4 py-3 text-left transition-colors"
                    >
                      <div className="flex-1">
                        <span
                          className="font-bold text-[13px]"
                          style={{ color: isDistrictSelected ? accentColor : '#1f2937' }}
                        >
                          {district}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {areas.length} areas
                        </p>
                      </div>
                    </button>
                    {/* Expand arrow */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDistrict(isExpanded ? null : district);
                      }}
                      className="px-3 py-3 text-gray-300 hover:text-gray-600 transition-colors"
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Areas Sub-list */}
                  {isExpanded && (
                    <div className="bg-gray-50/80 border-b border-gray-100">
                      {areas.map((area) => {
                        const isAreaSelected = selectedCity === area;
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => handleSelectArea(district, area)}
                            className={`w-full flex items-center gap-2 pl-8 pr-4 py-2.5 text-left transition-colors ${
                              isAreaSelected ? 'bg-blue-50' : 'hover:bg-white'
                            }`}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: isAreaSelected ? accentColor : '#d1d5db' }}
                            />
                            <span
                              className="text-[13px] font-medium"
                              style={{ color: isAreaSelected ? accentColor : '#374151' }}
                            >
                              {area}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityDropdown;
