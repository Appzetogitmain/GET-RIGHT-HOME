import React, { useState, useMemo } from 'react';
import { X, Search as SearchIcon } from 'lucide-react';

const AdvancedFilterModal = ({
    isOpen,
    onClose,
    filters,
    setFilters,
    updateFilter,
    applyFilters,
    previewCount,
    previewLoading,
    clearAllFilters,
    activeTab,
    setActiveTab,
    builders = [],
    projects = []
}) => {

    const [projectSearch, setProjectSearch] = useState('');
    const [projectPage, setProjectPage] = useState(1);
    const PROJECT_LIMIT = 10;

    const tabs = [
        'Quick Filters', 'Gender', 'Budget', 'Property Type', 'BHK', 'Property Size', 'Possession Status',
        'New Booking / Resale', 'Amenities & Facilities', 'Localities', 'Builders', 'Projects',
        'Floor Preference', 'Facing Direction', 'Property Features', 'Project Area',
        'Project Density', 'Posted By', 'Bathrooms', 'Photos & Videos', 'Furnishing Status'
    ];

    const budgetList = useMemo(() => {
        const list = [];
        for (let i = 5; i < 100; i += 5) list.push({ label: `${i} L`, value: i * 100000 });
        for (let i = 1; i <= 100; i++) list.push({ label: `${i} Cr`, value: i * 10000000 });
        return list;
    }, []);

    const sizeList = useMemo(() => {
        const list = [];
        for (let i = 100; i <= 1000; i += 100) list.push(i);
        for (let i = 1500; i <= 5000; i += 500) list.push(i);
        for (let i = 6000; i <= 10000; i += 1000) list.push(i);
        return list;
    }, []);

    const propertyTypes = ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Plot / Land', 'Office', 'Retail', 'Industry', 'Storage', 'Hospitality'];
    const bhkTypes = ['1 RK/1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'];
    const possessionStatuses = ['Ready to Move', 'Under Construction', 'Pre Launch'];
    const newBookingResale = ['New Bookings', 'Resale'];
    const amenitiesList = ['Parking', 'Wifi', 'Pool', 'Gym', 'AC', 'Kitchen', 'Security', 'Lift', 'Power Backup', 'Club House'];

    const toggleArrayFilter = (key, value) => {
        let current = [];
        if (Array.isArray(filters[key])) {
            current = filters[key];
        } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
            current = filters[key].split(',').map(s => s.trim());
        }
        
        if (current.includes(value)) {
            updateFilter(key, current.filter(v => v !== value));
        } else {
            updateFilter(key, [...current, value]);
        }
    };

    const handleSelectClearAll = (key, allValues) => {
        let current = [];
        if (Array.isArray(filters[key])) {
            current = filters[key];
        } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
            current = filters[key].split(',').map(s => s.trim());
        }
        
        // If anything is selected, clear all. If nothing is selected, select all.
        if (current.length > 0) {
            updateFilter(key, []);
        } else {
            updateFilter(key, allValues);
        }
    };

    const renderMultiSelect = (key, title, options) => {
        let current = [];
        if (Array.isArray(filters[key])) {
            current = filters[key];
        } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
            current = filters[key].split(',').map(s => s.trim());
        }
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 pb-2 flex items-center justify-between bg-white sticky top-0 border-b border-gray-100">
                    <span className="text-sm font-bold text-gray-900">{title}</span>
                    <button 
                        onClick={() => handleSelectClearAll(key, options)}
                        className="text-sm font-semibold text-surface"
                    >
                        {current.length > 0 ? 'Clear all' : 'Select all'}
                    </button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    {options.map(opt => (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={current.includes(opt)}
                                onChange={() => toggleArrayFilter(key, opt)}
                                className="w-4 h-4 rounded border-gray-300 text-surface focus:ring-surface"
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    const renderRightContent = () => {
        switch (activeTab) {
            case 'Quick Filters':
                return renderMultiSelect('amenities', 'Quick Filters', ['Verified Properties', 'With Photos', 'With Videos', 'Gated Society', 'Corner Property']);
            case 'Gender':
                return renderMultiSelect('gender', 'Gender', ['Boys Only', 'Girls Only', 'Coliving']);
            case 'Property Type':
                return renderMultiSelect('propertyTypes', 'Property Type', propertyTypes);
            case 'BHK':
                return renderMultiSelect('bhkType', 'BHK', bhkTypes);
            case 'Possession Status':
                return renderMultiSelect('amenities', 'Possession Status', possessionStatuses);
            case 'New Booking / Resale':
                return renderMultiSelect('purchaseType', 'New Booking / Resale', newBookingResale);
            case 'Amenities & Facilities':
                return renderMultiSelect('amenities', 'Amenities & Facilities', amenitiesList);
            case 'Localities':
                return renderMultiSelect('areas', 'Localities', ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Electronic City', 'Marathahalli', 'Jayanagar', 'JP Nagar', 'Bellandur']);
            case 'Builders': {
                const current = Array.isArray(filters['builder']) ? filters['builder'] : [];
                return (
                    <div className="flex flex-col h-full">
                        <div className="p-4 pb-2 flex items-center justify-between bg-white sticky top-0 border-b border-gray-100">
                            <span className="text-sm font-bold text-gray-900">Builders</span>
                            <button 
                                onClick={() => {
                                    if (current.length > 0) {
                                        updateFilter('builder', []);
                                    } else {
                                        updateFilter('builder', builders.map(b => b._id));
                                    }
                                }}
                                className="text-sm font-semibold text-surface"
                            >
                                {current.length > 0 ? 'Clear all' : 'Select all'}
                            </button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {builders.length > 0 ? builders.map(b => (
                                <label key={b._id} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={current.includes(b._id)}
                                        onChange={() => {
                                            if (current.includes(b._id)) {
                                                updateFilter('builder', current.filter(id => id !== b._id));
                                            } else {
                                                updateFilter('builder', [...current, b._id]);
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-surface focus:ring-surface"
                                    />
                                    <span className="text-sm text-gray-700">{b.name}</span>
                                </label>
                            )) : (
                                <div className="text-sm text-gray-500">No builders found.</div>
                            )}
                        </div>
                    </div>
                );
            }
            case 'Projects': {
                const current = Array.isArray(filters['projects']) ? filters['projects'] : [];
                
                const filteredProjects = projects.filter(p => p.name && p.name.toLowerCase().includes(projectSearch.toLowerCase()));
                const paginatedProjects = filteredProjects.slice((projectPage - 1) * PROJECT_LIMIT, projectPage * PROJECT_LIMIT);
                const totalPages = Math.ceil(filteredProjects.length / PROJECT_LIMIT);

                return (
                    <div className="flex flex-col h-full">
                        <div className="p-4 pb-2 flex flex-col gap-2 bg-white sticky top-0 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-900">Projects</span>
                                <button 
                                    onClick={() => updateFilter('projects', [])}
                                    className="text-sm font-semibold text-surface"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search projects..." 
                                    value={projectSearch}
                                    onChange={(e) => { setProjectSearch(e.target.value); setProjectPage(1); }}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-surface transition-colors"
                                />
                            </div>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto flex-1">
                            {paginatedProjects.length > 0 ? paginatedProjects.map(p => (
                                <label key={p._id} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={current.includes(p._id)}
                                        onChange={() => {
                                            if (current.includes(p._id)) {
                                                updateFilter('projects', current.filter(id => id !== p._id));
                                            } else {
                                                updateFilter('projects', [...current, p._id]);
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-surface focus:ring-surface"
                                    />
                                    <span className="text-sm text-gray-700">{p.name}</span>
                                </label>
                            )) : (
                                <div className="text-sm text-gray-500">No projects found.</div>
                            )}
                        </div>
                        {totalPages > 1 && (
                            <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
                                <button 
                                    onClick={() => setProjectPage(prev => Math.max(1, prev - 1))}
                                    disabled={projectPage === 1}
                                    className="px-3 py-1 text-xs font-medium border border-gray-200 rounded text-gray-600 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-xs font-medium text-gray-500">Page {projectPage} of {totalPages}</span>
                                <button 
                                    onClick={() => setProjectPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={projectPage === totalPages}
                                    className="px-3 py-1 text-xs font-medium border border-gray-200 rounded text-gray-600 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                );
            }
            case 'Floor Preference':
                return renderMultiSelect('floor', 'Floor Preference', ['Ground Floor', '1st to 4th Floor', '5th to 8th Floor', '9th to 12th Floor', 'Top Floor']);
            case 'Facing Direction':
                return renderMultiSelect('facing', 'Facing Direction', ['East Facing', 'West Facing', 'North Facing', 'South Facing', 'North-East Facing']);
            case 'Property Features':
                return renderMultiSelect('amenities', 'Property Features', ['Park Facing', 'Main Road Facing', 'Corner Property', 'Gated Society', 'Pet Friendly']);
            case 'Project Area':
                return renderMultiSelect('projectArea', 'Project Area', ['Less than 1 Acre', '1 to 5 Acres', '5 to 10 Acres', 'More than 10 Acres']);
            case 'Project Density':
                return renderMultiSelect('projectDensity', 'Project Density', ['Low Density (Less than 50 units/acre)', 'Medium Density', 'High Density']);
            case 'Posted By':
                return renderMultiSelect('postedBy', 'Posted By', ['Owner', 'Broker', 'Builder']);
            case 'Bathrooms':
                return renderMultiSelect('bathrooms', 'Bathrooms', ['1 Bathroom', '2 Bathrooms', '3 Bathrooms', '4+ Bathrooms']);
            case 'Photos & Videos':
                return renderMultiSelect('amenities', 'Photos & Videos', ['With Photos', 'With Videos']);
            case 'Furnishing Status':
                return renderMultiSelect('amenities', 'Furnishing Status', ['Fully Furnished', 'Semi Furnished', 'Unfurnished']);
            case 'Budget':
                return (
                    <div className="flex flex-col h-full bg-white relative">
                        <div className="p-4 pb-2 sticky top-0 bg-white z-10 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Budget in ₹</h3>
                            <div className="flex items-center gap-2">
                                <button className="flex-1 border rounded-full px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                                    {filters.minPrice ? budgetList.find(b => b.value === Number(filters.minPrice))?.label || filters.minPrice : 'No min'}
                                </button>
                                <span className="text-gray-400 text-xs">to</span>
                                <button className="flex-1 border rounded-full px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                                    {filters.maxPrice ? budgetList.find(b => b.value === Number(filters.maxPrice))?.label || filters.maxPrice : 'No max'}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto no-scrollbar border-r border-gray-100">
                                {budgetList.map(val => (
                                    <div 
                                        key={`min-${val.value}`}
                                        className={`text-center py-3 text-sm cursor-pointer transition-colors ${Number(filters.minPrice) === val.value ? 'font-bold text-surface bg-surface/5' : 'text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => updateFilter('minPrice', val.value)}
                                    >
                                        {val.label}
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                {budgetList.map(val => (
                                    <div 
                                        key={`max-${val.value}`}
                                        className={`text-center py-3 text-sm cursor-pointer transition-colors ${Number(filters.maxPrice) === val.value ? 'font-bold text-surface bg-surface/5' : 'text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => updateFilter('maxPrice', val.value)}
                                    >
                                        {val.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'Property Size':
                return (
                    <div className="flex flex-col h-full bg-white relative">
                        <div className="p-4 pb-2 sticky top-0 bg-white z-10 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Size in sq.ft.</h3>
                            <div className="flex items-center gap-2">
                                <button className="flex-1 border rounded-full px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                                    {filters.minArea || 'No min'}
                                </button>
                                <span className="text-gray-400 text-xs">to</span>
                                <button className="flex-1 border rounded-full px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                                    {filters.maxArea || 'No max'}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto no-scrollbar border-r border-gray-100">
                                {sizeList.map(val => (
                                    <div 
                                        key={`min-${val}`}
                                        className={`text-center py-3 text-sm cursor-pointer transition-colors ${Number(filters.minArea) === val ? 'font-bold text-surface bg-surface/5' : 'text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => updateFilter('minArea', val)}
                                    >
                                        {val}
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                {sizeList.map(val => (
                                    <div 
                                        key={`max-${val}`}
                                        className={`text-center py-3 text-sm cursor-pointer transition-colors ${Number(filters.maxArea) === val ? 'font-bold text-surface bg-surface/5' : 'text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => updateFilter('maxArea', val)}
                                    >
                                        {val}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="p-4 flex flex-col items-center justify-center h-full text-gray-400">
                        <p>More options coming soon...</p>
                    </div>
                );
        }
    };

    // Calculate total active filters count
    const activeFiltersCount = (() => {
        let count = 0;
        if (filters.minPrice || filters.maxPrice) count++;
        if (filters.propertyTypes && filters.propertyTypes.length > 0) count += filters.propertyTypes.length;
        if (filters.amenities && filters.amenities.length > 0) count += filters.amenities.length;
        if (filters.minArea || filters.maxArea) count++;
        if (filters.bathrooms > 0) count++;
        if (filters.postedBy) count++;
        if (filters.purchaseType) count++;
        if (filters.areas && filters.areas.length > 0) count += filters.areas.length;
        if (filters.builder && Array.isArray(filters.builder) && filters.builder.length > 0) count += filters.builder.length;
        return count;
    })();

    // Format selected chips
    const activeChips = [];
    if (filters.minPrice || filters.maxPrice) {
        const minL = filters.minPrice ? budgetList.find(b => b.value === Number(filters.minPrice))?.label : '';
        const maxL = filters.maxPrice ? budgetList.find(b => b.value === Number(filters.maxPrice))?.label : '';
        activeChips.push({ key: 'price', label: `₹ ${minL || '0'} to ${maxL || 'Max'}` });
    }
    if (filters.minArea || filters.maxArea) {
        activeChips.push({ key: 'area', label: `${filters.minArea || '0'} sq.ft. to ${filters.maxArea || 'Max'}` });
    }
    if (Array.isArray(filters.propertyTypes)) {
        filters.propertyTypes.forEach(t => activeChips.push({ key: `pt-${t}`, label: t }));
    }
    if (Array.isArray(filters.amenities)) {
        filters.amenities.forEach(a => activeChips.push({ key: `am-${a}`, label: a }));
    }
    if (Array.isArray(filters.builder) && builders.length > 0) {
        filters.builder.forEach(bId => {
            const b = builders.find(builder => builder._id === bId);
            if (b) activeChips.push({ key: `bd-${b._id}`, label: b.name });
        });
    }

    const removeChip = (chipKey) => {
        if (chipKey === 'price') {
            updateFilter('minPrice', '');
            updateFilter('maxPrice', '');
        } else if (chipKey === 'area') {
            updateFilter('minArea', '');
            updateFilter('maxArea', '');
        } else if (chipKey.startsWith('pt-')) {
            toggleArrayFilter('propertyTypes', chipKey.replace('pt-', ''));
        } else if (chipKey.startsWith('am-')) {
            toggleArrayFilter('amenities', chipKey.replace('am-', ''));
        } else if (chipKey.startsWith('bd-')) {
            const currentBuilders = Array.isArray(filters.builder) ? filters.builder : [];
            updateFilter('builder', currentBuilders.filter(id => id !== chipKey.replace('bd-', '')));
        }
    };

    const getTabCount = (tabName) => {
        let count = 0;
        if (tabName === 'Budget') {
            if (filters.minPrice || filters.maxPrice) count = 1;
        } else if (tabName === 'Gender') {
            const gen = ['Boys Only', 'Girls Only', 'Coliving'];
            count = (filters.amenities || []).filter(a => gen.includes(a)).length;
        } else if (tabName === 'Property Type') {
            if (filters.propertyTypes && filters.propertyTypes.length > 0) count = filters.propertyTypes.length;
        } else if (tabName === 'BHK') {
            const bhks = ['1 RK/1 BHK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'];
            count = (filters.amenities || []).filter(a => bhks.includes(a)).length;
        } else if (tabName === 'Property Size') {
            if (filters.minArea || filters.maxArea) count = 1;
        } else if (tabName === 'Possession Status') {
            const pos = ['Ready to Move', 'Under Construction', 'Pre Launch'];
            count = (filters.amenities || []).filter(a => pos.includes(a)).length;
        } else if (tabName === 'New Booking / Resale') {
            count = (filters.purchaseType || []).length;
        } else if (tabName === 'Amenities & Facilities') {
            const ams = ['Parking', 'Wifi', 'Pool', 'Gym', 'AC', 'Kitchen', 'Security', 'Lift', 'Power Backup', 'Club House'];
            count = (filters.amenities || []).filter(a => ams.includes(a)).length;
        } else if (tabName === 'Localities') {
            count = (filters.areas || []).length;
        } else if (tabName === 'Builders') {
            count = (filters.builder || []).length;
        } else if (tabName === 'Projects') {
            const prj = ['Prestige Shantiniketan', 'Sobha City', 'Brigade Gateway', 'Godrej Woodsman Estate'];
            count = (filters.amenities || []).filter(a => prj.includes(a)).length;
        } else if (tabName === 'Floor Preference') {
            const flr = ['Ground Floor', '1st to 4th Floor', '5th to 8th Floor', '9th to 12th Floor', 'Top Floor'];
            count = (filters.amenities || []).filter(a => flr.includes(a)).length;
        } else if (tabName === 'Facing Direction') {
            const dir = ['East Facing', 'West Facing', 'North Facing', 'South Facing', 'North-East Facing'];
            count = (filters.amenities || []).filter(a => dir.includes(a)).length;
        } else if (tabName === 'Property Features') {
            const feat = ['Park Facing', 'Main Road Facing', 'Corner Property', 'Gated Society', 'Pet Friendly'];
            count = (filters.amenities || []).filter(a => feat.includes(a)).length;
        } else if (tabName === 'Project Area') {
            const pa = ['Less than 1 Acre', '1 to 5 Acres', '5 to 10 Acres', 'More than 10 Acres'];
            count = (filters.amenities || []).filter(a => pa.includes(a)).length;
        } else if (tabName === 'Project Density') {
            const pd = ['Low Density (Less than 50 units/acre)', 'Medium Density', 'High Density'];
            count = (filters.amenities || []).filter(a => pd.includes(a)).length;
        } else if (tabName === 'Posted By') {
            count = Array.isArray(filters.postedBy) ? filters.postedBy.length : (filters.postedBy ? filters.postedBy.split(',').length : 0);
        } else if (tabName === 'Bathrooms') {
            const bath = ['1 Bathroom', '2 Bathrooms', '3 Bathrooms', '4+ Bathrooms'];
            count = (filters.amenities || []).filter(a => bath.includes(a)).length;
        } else if (tabName === 'Photos & Videos') {
            const pv = ['With Photos', 'With Videos'];
            count = (filters.amenities || []).filter(a => pv.includes(a)).length;
        } else if (tabName === 'Furnishing Status') {
            const fs = ['Fully Furnished', 'Semi Furnished', 'Unfurnished'];
            count = (filters.amenities || []).filter(a => fs.includes(a)).length;
        } else if (tabName === 'Quick Filters') {
            const qf = ['Verified Properties', 'With Photos', 'With Videos', 'Gated Society', 'Corner Property'];
            count = (filters.amenities || []).filter(a => qf.includes(a)).length;
        }
        return count;
    };

    return (
        <div className={`
            fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm transition-opacity duration-300 flex items-end justify-center
            ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `} onClick={onClose}>
            <div
                data-lenis-prevent
                className={`
                    w-full md:max-w-4xl bg-white shadow-2xl h-[90vh] md:h-[85vh] rounded-t-2xl md:rounded-3xl flex flex-col transition-transform duration-300 transform md:mb-4
                    ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-10 md:scale-95'}
                `}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex flex-col bg-white rounded-t-2xl md:rounded-t-3xl border-b border-gray-100">
                    <div className="flex items-center justify-between p-4">
                        <h2 className="text-lg font-bold text-gray-900">Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                            <X size={16} className="text-gray-600" />
                        </button>
                    </div>

                    {/* Active Chips Horizontal Scroll */}
                    {activeChips.length > 0 && (
                        <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto no-scrollbar whitespace-nowrap">
                            {activeChips.map(chip => (
                                <div key={chip.key} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-800 rounded-full bg-white">
                                    <span className="text-xs font-semibold text-gray-800">{chip.label}</span>
                                    <button onClick={() => removeChip(chip.key)}>
                                        <X size={12} className="text-gray-600 hover:text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Split */}
                <div className="flex flex-1 overflow-hidden bg-white">
                    {/* Left Sidebar */}
                    <div className="w-[35%] md:w-[25%] bg-gray-50 overflow-y-auto border-r border-gray-100 no-scrollbar pb-20">
                        {tabs.map(tab => {
                            const c = getTabCount(tab);
                            return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`w-full text-left px-4 py-4 text-xs font-semibold transition-colors border-l-4
                                    ${activeTab === tab 
                                        ? 'bg-white border-blue-600 text-gray-900 font-bold shadow-sm' 
                                        : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                            >
                                {tab} {c > 0 && <span className="ml-1 text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5 text-[10px]">{c}</span>}
                            </button>
                        )})}
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 overflow-hidden bg-white pb-[72px]">
                        {renderRightContent()}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4 bg-white flex items-center justify-between gap-4 absolute bottom-0 left-0 right-0">
                    <button
                        onClick={clearAllFilters}
                        className="text-sm font-bold text-surface hover:text-surface-dark transition-colors px-2"
                    >
                        Clear all
                    </button>
                    <button
                        onClick={() => { applyFilters(); onClose(); }}
                        disabled={previewLoading}
                        className="flex-1 bg-surface hover:bg-surface-dark text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all text-center flex items-center justify-center gap-2"
                    >
                        {previewLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : null}
                        See All {previewCount || 0} Properties
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvancedFilterModal;
