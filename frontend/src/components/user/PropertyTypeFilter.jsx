import React, { useState, useEffect } from 'react';
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

const PropertyTypeFilter = ({ selectedType, onSelectType, theme }) => {
  const accentColor = theme?.accent || '#059669';
  const STATIC_TYPES = [];

  const [allTypes, setAllTypes] = useState([ALL_OPTION, ...STATIC_TYPES]);
  const [imageError, setImageError] = useState({});

  useEffect(() => {
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

        setAllTypes([ALL_OPTION, ...staticList]);

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

  return (
    <motion.div
      className="relative w-full border-b border-gray-100 bg-white"
    >
      {/* Web: centered & larger; Mobile: scrollable as before */}
      <div className="flex gap-4 overflow-x-auto px-6 py-4 md:py-1.5 no-scrollbar relative max-w-7xl mx-auto items-center justify-start sm:justify-center md:justify-center md:flex-wrap md:gap-8 md:overflow-visible">
        {allTypes.map((type) => {
          const Icon = type.icon;
          // Handle selection: null for "All", exact match, or if IDs overlap (for grouped categories)
          let isSelected = false;
          if (selectedType === null && type.id === null) {
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
              onClick={() => onSelectType(type.id, type.label)}
              className={`
                flex flex-col items-center justify-between p-1.5 pb-2.5 min-w-[85px] w-[85px] h-[115px] rounded-[1.25rem] border transition-all shrink-0 group
                ${isSelected ? 'border-[#005B9F] shadow-md bg-blue-50/20 scale-[1.02]' : 'border-gray-100 bg-white hover:border-gray-200'}
              `}
            >
              {/* Image Container */}
              <div
                className={`
                  w-full h-[62px] rounded-xl overflow-hidden relative transition-all duration-300 border
                  ${isSelected ? 'border-[#005B9F]/30 shadow-sm' : 'border-transparent'}
                `}
              >
                {imageError[type.label] || !PREMIUM_IMAGES[type.label] ? (
                  <div className={`w-full h-full flex items-center justify-center ${isSelected ? 'bg-[#005B9F]' : 'bg-[#EAF2FA]'}`}>
                    <Icon
                      className="w-5 h-5 transition-colors"
                      style={{ color: isSelected ? '#FFFFFF' : '#005B9F' }}
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
                  ${isSelected ? 'text-[#005B9F]' : 'text-gray-700 group-hover:text-gray-900'}
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
