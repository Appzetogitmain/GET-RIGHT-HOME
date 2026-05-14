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

const PropertyTypeFilter = ({ selectedType, onSelectType, theme }) => {
  const accentColor = theme?.accent || '#059669';
  const STATIC_TYPES = [];

  const [allTypes, setAllTypes] = useState([ALL_OPTION, ...STATIC_TYPES]);

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

        // PG/Co-Living often groups multiple categories
        const pgIds = findCategoryIds(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig']);
        const rentIds = findCategoryIds('Rent');
        const buyIds = findCategoryIds('Buy');
        const plotIds = findCategoryIds(['Plot', 'Plots']);

        const staticList = [
          {
            id: pgIds.length > 0 ? pgIds.join(',') : 'pg',
            label: 'PG/Co-Living',
            icon: LucideIcons.BedDouble,
            isDynamic: true
          },
          {
            id: rentIds.length > 0 ? rentIds.join(',') : 'rent',
            label: 'Rent',
            icon: LucideIcons.Home,
            isDynamic: true
          },
          {
            id: buyIds.length > 0 ? buyIds.join(',') : 'buy',
            label: 'Buy',
            icon: LucideIcons.Landmark,
            isDynamic: true
          },
          {
            id: plotIds.length > 0 ? plotIds.join(',') : 'plot',
            label: 'Plot',
            icon: LucideIcons.TreePine,
            isDynamic: true
          },
          {
            id: 'homeservice',
            label: 'Home Service',
            icon: LucideIcons.Sparkles,
            isDynamic: false
          }
        ];

        setAllTypes([ALL_OPTION, ...staticList]);

      } catch (error) {
        console.error("Error loading categories:", error);
        // Fallback to static list without IDs if fetch fails
        setAllTypes([ALL_OPTION,
          { label: 'PG/Co-Living', icon: LucideIcons.BedDouble, id: null },
          { label: 'Rent', icon: LucideIcons.Home, id: null },
          { label: 'Buy', icon: LucideIcons.Landmark, id: null },
          { label: 'Plot', icon: LucideIcons.TreePine, id: null },
          { label: 'Home Service', icon: LucideIcons.Sparkles, id: 'homeservice' }
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
              className="flex flex-col items-center gap-1.5 md:gap-1 min-w-[70px] md:min-w-[60px] outline-none group shrink-0"
            >
              <div className="relative">
                {isSelected && (
                  <motion.div
                    layoutId="activeTabCircle"
                    className="absolute inset-0 rounded-xl md:rounded-lg"
                    style={{ backgroundColor: `${accentColor}20` }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  />
                )}
                <div
                  className={`
                    w-12 h-12 md:w-10 md:h-10 rounded-xl md:rounded-lg flex items-center justify-center transition-all duration-300
                    ${!isSelected ? 'bg-gray-50 border border-gray-100 group-hover:bg-gray-100' : ''}
                  `}
                >
                  <Icon
                    className="w-5 h-5 md:w-4.5 md:h-4.5 transition-colors"
                    style={{ color: isSelected ? accentColor : '#6B7280' }}
                    strokeWidth={isSelected ? 2.5 : 2}
                  />
                </div>
              </div>

              <span
                className={`
                  text-[11px] md:text-[10px] font-bold tracking-wide transition-colors whitespace-nowrap
                `}
                style={{ color: isSelected ? accentColor : '#6B7280' }}
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
