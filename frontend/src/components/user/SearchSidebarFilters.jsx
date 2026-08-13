import React, { useState } from 'react';
import { SlidersHorizontal, ChevronRight, X } from 'lucide-react';

const PROPERTY_TYPE_OPTIONS = [
    'Apartment',
    'Independent House / Villa',
    'Builder Floor',
    'Plot / Land',
    '1 RK / Studio Apartment',
    'Serviced Apartment'
];
const VISIBLE_TYPE_COUNT = 4;

/**
 * 99acres-style persistent left filter rail, shown on desktop only
 * (the mobile bottom sheet — AdvancedFilterModal — still covers everything
 * this doesn't, and "More filters" below opens that same modal for the
 * long tail of options rather than duplicating all 20 tabs here).
 */
const SearchSidebarFilters = ({ filters, applyFilterPatch, toggleQuickFilter, onOpenFullFilters, onClearAll, resultsCount }) => {
    const [minPrice, setMinPrice] = useState(filters.minPrice || '');
    const [maxPrice, setMaxPrice] = useState(filters.maxPrice || '');
    const [showAllTypes, setShowAllTypes] = useState(false);

    // Keep the inputs in sync when the budget changes from elsewhere (e.g.
    // "Clear all filters" or the bottom-sheet modal) — adjusted during
    // render, per React's guidance, instead of a setState-in-effect.
    const [trackedMin, setTrackedMin] = useState(filters.minPrice || '');
    const [trackedMax, setTrackedMax] = useState(filters.maxPrice || '');
    if ((filters.minPrice || '') !== trackedMin || (filters.maxPrice || '') !== trackedMax) {
        setTrackedMin(filters.minPrice || '');
        setTrackedMax(filters.maxPrice || '');
        setMinPrice(filters.minPrice || '');
        setMaxPrice(filters.maxPrice || '');
    }

    const isVerified = (filters.amenities || []).includes('Verified Properties');

    const selectedTypes = Array.isArray(filters.propertyTypes) ? filters.propertyTypes : [];
    const visibleTypes = showAllTypes ? PROPERTY_TYPE_OPTIONS : PROPERTY_TYPE_OPTIONS.slice(0, VISIBLE_TYPE_COUNT);

    const commitBudget = () => {
        if (minPrice === (filters.minPrice || '') && maxPrice === (filters.maxPrice || '')) return;
        applyFilterPatch({ minPrice, maxPrice });
    };

    const toggleType = (type) => {
        const next = selectedTypes.includes(type)
            ? selectedTypes.filter(t => t !== type)
            : [...selectedTypes, type];
        applyFilterPatch({ propertyTypes: next });
    };

    // Applied Filters chip strip (99acres shows this above everything else in
    // the sidebar) — built from whichever filters are actually active, each
    // removable on its own.
    const activeChips = [];
    if (filters.minPrice || filters.maxPrice) {
        activeChips.push({ key: 'price', label: `₹${filters.minPrice || '0'} - ₹${filters.maxPrice || 'Max'}` });
    }
    (Array.isArray(filters.propertyTypes) ? filters.propertyTypes : []).forEach(t =>
        activeChips.push({ key: `pt-${t}`, label: t })
    );
    (Array.isArray(filters.bhkType) ? filters.bhkType : []).forEach(b =>
        activeChips.push({ key: `bhk-${b}`, label: b })
    );
    (Array.isArray(filters.areas) ? filters.areas : []).forEach(a =>
        activeChips.push({ key: `area-${a}`, label: a })
    );
    (Array.isArray(filters.amenities) ? filters.amenities : [])
        .filter(a => a !== 'Verified Properties')
        .forEach(a => activeChips.push({ key: `am-${a}`, label: a }));

    const removeChip = (key) => {
        if (key === 'price') {
            applyFilterPatch({ minPrice: '', maxPrice: '' });
        } else if (key.startsWith('pt-')) {
            const val = key.slice(3);
            applyFilterPatch({ propertyTypes: selectedTypes.filter(t => t !== val) });
        } else if (key.startsWith('bhk-')) {
            const val = key.slice(4);
            const current = Array.isArray(filters.bhkType) ? filters.bhkType : [];
            applyFilterPatch({ bhkType: current.filter(b => b !== val) });
        } else if (key.startsWith('area-')) {
            const val = key.slice(5);
            const current = Array.isArray(filters.areas) ? filters.areas : [];
            applyFilterPatch({ areas: current.filter(a => a !== val) });
        } else if (key.startsWith('am-')) {
            const val = key.slice(3);
            const current = Array.isArray(filters.amenities) ? filters.amenities : [];
            applyFilterPatch({ amenities: current.filter(a => a !== val) });
        }
    };

    return (
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-[126px] self-start">
            <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                    <span className="text-sm font-bold text-gray-900">Filters</span>
                    {resultsCount !== undefined && (
                        <span className="text-[11px] font-semibold text-gray-400">{resultsCount} results</span>
                    )}
                </div>

                {/* Applied Filters */}
                {activeChips.length > 0 && (
                    <div className="px-4 py-3.5 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[13px] font-bold text-gray-800">Applied Filters</span>
                            {onClearAll && (
                                <button onClick={onClearAll} className="text-[11px] font-bold text-blue-600 hover:underline">
                                    Clear All
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {activeChips.map(chip => (
                                <button
                                    key={chip.key}
                                    onClick={() => removeChip(chip.key)}
                                    className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 border border-gray-300 rounded-full text-[11px] font-semibold text-gray-700 hover:border-gray-400 transition-colors"
                                >
                                    {chip.label}
                                    <X size={11} className="text-gray-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Verified properties toggle */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                    <div>
                        <p className="text-[13px] font-bold text-gray-800">Verified properties</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Listings we've confirmed are genuine</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isVerified}
                        onClick={() => toggleQuickFilter('amenities', 'Verified Properties')}
                        className={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${isVerified ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isVerified ? 'translate-x-4' : ''}`} />
                    </button>
                </div>

                {/* Budget */}
                <div className="px-4 py-3.5 border-b border-gray-100">
                    <p className="text-[13px] font-bold text-gray-800 mb-2.5">Budget</p>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                            <input
                                type="number"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                onBlur={commitBudget}
                                onKeyDown={(e) => e.key === 'Enter' && commitBudget()}
                                placeholder="Min"
                                className="w-full pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-400 transition-colors"
                            />
                        </div>
                        <span className="text-gray-300 text-xs">to</span>
                        <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                            <input
                                type="number"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                onBlur={commitBudget}
                                onKeyDown={(e) => e.key === 'Enter' && commitBudget()}
                                placeholder="Max"
                                className="w-full pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-400 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Type of property */}
                <div className="px-4 py-3.5 border-b border-gray-100">
                    <p className="text-[13px] font-bold text-gray-800 mb-2.5">Type of property</p>
                    <div className="space-y-2.5">
                        {visibleTypes.map(type => (
                            <label key={type} className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedTypes.includes(type)}
                                    onChange={() => toggleType(type)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-medium text-gray-700">{type}</span>
                            </label>
                        ))}
                    </div>
                    {PROPERTY_TYPE_OPTIONS.length > VISIBLE_TYPE_COUNT && (
                        <button
                            onClick={() => setShowAllTypes(prev => !prev)}
                            className="text-[11px] font-bold text-blue-600 mt-2.5"
                        >
                            {showAllTypes ? 'Show less' : `+${PROPERTY_TYPE_OPTIONS.length - VISIBLE_TYPE_COUNT} more`}
                        </button>
                    )}
                </div>

                {/* Full filter modal launcher */}
                <button
                    onClick={onOpenFullFilters}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                    <span className="flex items-center gap-2 text-[13px] font-bold text-gray-800">
                        <SlidersHorizontal size={14} className="text-gray-500" />
                        More filters
                    </span>
                    <ChevronRight size={14} className="text-gray-400" />
                </button>
            </div>
        </aside>
    );
};

export default SearchSidebarFilters;
