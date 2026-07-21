import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { categoryService } from '../../services/categoryService';

// "All" option to show all properties
const ALL_OPTION = {
  id: null,
  label: 'All',
  icon: LucideIcons.Grid3x3,
  isDynamic: false
};

const PREMIUM_IMAGES = {
  'All': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=120&q=80',
  'Home Service': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=120&q=80',
  'Rent/PG': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=120&q=80',
  'Buy': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80',
  'Plot': 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=120&q=80'
};

let cachedFilterTypes = null;

const PropertyTypeFilter = ({ selectedType, selectedLabel, onSelectType, theme }) => {
  const accentColor = theme?.accent || '#005B9F';
  const textClass = theme?.text || 'text-[#005B9F]';
  const bgLightClass = theme?.bgLight || 'bg-blue-50/20';
  const STATIC_TYPES = [];

  const [allTypes, setAllTypes] = useState(cachedFilterTypes || [ALL_OPTION, ...STATIC_TYPES]);
  const [imageError, setImageError] = useState({});
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (cachedFilterTypes) return; // Prevent millisecond glitch by using cache

    const fetchDynamicCategories = async () => {
      try {
        const categories = await categoryService.getActiveCategories();

        // We want ONLY these specific tabs in this specific order
        // 1. All (Already added as ALL_OPTION)
        // 2. PG/Co-Living
        // 3. Rent
        // 4. Buy
        // 5. Plot

        const findCategoryIds = (names) => {
          const searchNames = Array.isArray(names) ? names : [names];
          const found = categories.filter(c =>
            searchNames.some(n =>
              (c.displayName || '').toLowerCase() === n.toLowerCase() ||
              (c.name || '').toLowerCase() === n.toLowerCase()
            )
          );
          return found.map(c => c._id);
        };

        const pgIds = findCategoryIds(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig', 'paying guest']);
        const rentIds = findCategoryIds('Rent');
        const buyIds = findCategoryIds('Buy');
        const plotIds = findCategoryIds(['Plot', 'Plots']);

        const staticList = [
          {
            id: buyIds.length > 0 ? buyIds.join(',') : 'buy',
            label: 'Buy',
            icon: LucideIcons.Landmark,
            isDynamic: true
          },
          {
            id: [...rentIds, ...pgIds].length > 0 ? [...rentIds, ...pgIds].join(',') : 'rent,pg',
            label: 'Rent/PG',
            icon: LucideIcons.Home,
            isDynamic: true
          },
          {
            id: 'homeservice',
            label: 'Home Service',
            icon: LucideIcons.Sparkles,
            isDynamic: false
          },
          {
            id: plotIds.length > 0 ? plotIds.join(',') : 'plot',
            label: 'Plot',
            icon: LucideIcons.TreePine,
            isDynamic: true
          }
        ];

        cachedFilterTypes = [ALL_OPTION, ...staticList];
        setAllTypes(cachedFilterTypes);

      } catch (error) {
        console.error("Error loading categories:", error);
        // Fallback to static list without IDs if fetch fails
        setAllTypes([ALL_OPTION,
          { label: 'Buy', icon: LucideIcons.Landmark, id: 'buy' },
          { label: 'Rent/PG', icon: LucideIcons.Home, id: 'rent,pg' },
          { id: 'homeservice', label: 'Home Service', icon: LucideIcons.Sparkles, isDynamic: false },
          { label: 'Plot', icon: LucideIcons.TreePine, id: 'plot' }
        ]);
      }
    };

    fetchDynamicCategories();
  }, []);

  // Auto-scroll the active tab into view on mobile
  useEffect(() => {
    if (selectedType !== undefined || selectedLabel) {
      const activeTab = allTypes.find(type => {
        if (selectedLabel && type.label) {
          return selectedLabel === type.label;
        }
        if (selectedType === null && type.id === null) return true;
        if (selectedType && type.id) {
          if (selectedType === type.id) return true;
          const typeIds = type.id.split(',').map(id => id.trim());
          const selectedIds = selectedType.split(',').map(id => id.trim());
          return typeIds.some(id => selectedIds.includes(id)) || selectedIds.some(id => typeIds.includes(id));
        }
        return false;
      });
      if (activeTab) {
        // Small delay to ensure rendering is complete
        setTimeout(() => {
          const el = document.getElementById(`tab-${activeTab.label.replace(/\s+/g, '-')}`);
          const container = scrollContainerRef.current;
          if (el && container) {
            // Calculate exactly where to scroll the container without affecting the window
            const scrollLeft = el.offsetLeft - container.offsetLeft - (container.clientWidth / 2) + (el.clientWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });

            // Restore the "smooth jump to section" effect exclusively for desktop (web)
            if (window.innerWidth >= 1024) {
              // Scroll so the tabs are at the absolute BOTTOM of the viewport
              // This leaves the banner & search bar fully visible above, and hides the youtube section below
              const containerTop = container.getBoundingClientRect().top + window.scrollY;
              const offsetTop = containerTop + container.clientHeight - window.innerHeight; // Removed 40px buffer to show more banner
              window.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });
            }
          }
        }, 50);
      }
    }
  }, [selectedType, allTypes]);

  return (
    <motion.div
      className="relative w-full transition-colors duration-700"
    >
      {/* Web: centered & larger; Mobile: scrollable as before */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto px-6 py-4 md:py-1.5 no-scrollbar relative max-w-7xl mx-auto items-center justify-start sm:justify-center md:justify-center md:flex-wrap md:gap-8 md:overflow-visible"
      >
        {allTypes.map((type) => {
          const Icon = type.icon;
          // Handle selection: by label first for synchronous matching, then fallback to ID
          let isSelected = false;
          if (selectedLabel && type.label) {
            isSelected = selectedLabel === type.label;
          } else if (selectedType === null && type.id === null) {
            isSelected = true;
          } else if (selectedType && type.id) {
            if (selectedType === type.id) {
              isSelected = true;
            } else if (type.id.includes(',') || selectedType.includes(',')) {
              // For grouped categories, check if any ID matches
              const typeIds = type.id.split(',').map(id => id.trim());
              const selectedIds = selectedType.split(',').map(id => id.trim());
              isSelected = typeIds.some(id => selectedIds.includes(id)) || selectedIds.some(id => typeIds.includes(id));
            }
          }

          return (
            <button
              key={type.id || 'all'}
              id={`tab-${type.label.replace(/\s+/g, '-')}`}
              onClick={() => onSelectType(type.id, type.label)}
              className={`
                flex flex-col items-center justify-between p-1.5 pb-2.5 min-w-[85px] w-[85px] h-[115px] rounded-[1.25rem] border transition-all shrink-0 group
                ${isSelected ? `shadow-md ${bgLightClass} scale-[1.02]` : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}
              `}
              style={{ borderColor: isSelected ? accentColor : undefined }}
            >
              {/* Image Container */}
              <div
                className={`
                  w-full h-[62px] rounded-xl overflow-hidden relative transition-all duration-300 border
                  ${isSelected ? 'shadow-sm' : 'border-transparent'}
                `}
                style={{ borderColor: isSelected ? `${accentColor}4D` : undefined }}
              >
                {imageError[type.label] || !PREMIUM_IMAGES[type.label] ? (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isSelected ? accentColor : '#f1f5f9' }}>
                    <Icon
                      className="w-5 h-5 transition-colors"
                      style={{ color: isSelected ? '#FFFFFF' : '#94a3b8' }}
                      strokeWidth={2.5}
                    />
                  </div>
                ) : (
                  <img
                    src={PREMIUM_IMAGES[type.label]}
                    alt={type.label}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => {
                      setImageError(prev => ({ ...prev, [type.label]: true }));
                    }}
                  />
                )}
              </div>

              {/* Title Text */}
              <span
                className={`text-[9px] md:text-[10px] font-black uppercase tracking-tight text-center leading-tight mt-1.5 px-0.5 transition-colors
                  ${isSelected ? textClass : 'text-gray-700 group-hover:text-gray-900'}
                `}
              >
                {type.label}
              </span>
            </button>
          );
        })}
      </div>
</motion.div>
  );
};

export default PropertyTypeFilter;