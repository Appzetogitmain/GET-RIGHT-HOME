import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom-styled sort dropdown — replaces the native <select>, which renders
 * as an unstyled, oversized browser popup that overlaps the quick-filter
 * pills and looks out of place next to the rest of the app's UI.
 */
const SortDropdown = ({ options, value, onChange, variant = 'pill', disabledValues = [] }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        const handleEscape = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const current = options.find(o => o.value === value);

    const select = (val) => {
        if (disabledValues.includes(val)) return;
        onChange(val);
        setOpen(false);
    };

    return (
        <div className="relative shrink-0" ref={ref}>
            {variant === 'pill' ? (
                <button
                    type="button"
                    onClick={() => setOpen(prev => !prev)}
                    className={`flex items-center gap-1 pl-3 pr-2.5 h-[30px] border rounded-full text-xs font-medium transition-colors max-w-[130px] ${
                        open ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700 bg-white'
                    }`}
                >
                    <span className="truncate">{current?.label || 'Sort'}</span>
                    <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(prev => !prev)}
                    className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <span>Sort by {current?.label || '...'}</span>
                    <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            )}

            {open && (
                <div className={`absolute top-full mt-2 ${variant === 'pill' ? 'left-0' : 'right-0'} min-w-[220px] bg-white border border-gray-200 rounded-xl shadow-lg z-[70] py-1.5 overflow-hidden`}>
                    {options.map(opt => {
                        const isDisabled = disabledValues.includes(opt.value);
                        const isActive = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => select(opt.value)}
                                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-[13px] transition-colors ${
                                    isDisabled
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : isActive
                                            ? 'text-blue-600 font-bold bg-blue-50'
                                            : 'text-gray-700 hover:bg-gray-50 font-medium'
                                }`}
                            >
                                {opt.label}
                                {isActive && <Check size={14} className="text-blue-600 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SortDropdown;
