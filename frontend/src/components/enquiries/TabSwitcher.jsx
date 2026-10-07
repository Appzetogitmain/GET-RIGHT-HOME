import React from 'react';

// Full-width, equal-split tabs with a blue underline on the active one.
const TabSwitcher = ({ tabs, active, onChange }) => (
    <div className="flex bg-white border-t border-[#E0E0E0]" role="tablist">
        {tabs.map((t) => {
            const isActive = active === t.key;
            return (
                <button
                    key={t.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onChange(t.key)}
                    className={`flex-1 py-3.5 text-center text-[15px] transition-colors relative ${
                        isActive ? 'text-[#1A73E8] font-semibold' : 'text-slate-500 font-medium'
                    }`}
                >
                    {t.label} ({t.count})
                    {isActive && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1A73E8]" />}
                </button>
            );
        })}
    </div>
);

export default TabSwitcher;
