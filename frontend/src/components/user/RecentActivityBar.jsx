import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, MapPin, User as UserIcon, Building2 } from 'lucide-react';
import { getRecentSearches, getRecentlyViewed } from '../../utils/recentActivity';
import { getPreferredCity, setPreferredCity } from '../../utils/locationPreference';
import { useAuth } from '../../context/AuthContext';

/**
 * Mirrors 99acres' "Recent searches / Continue browsing / Your Recent
 * Activity" row under the hero search bar. Reads purely from localStorage
 * (see utils/recentActivity.js) — works before login, same as 99acres shows
 * a "Guest User" card with recent activity even when signed out.
 */
const RecentActivityBar = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searches, setSearches] = useState([]);
    const [viewed, setViewed] = useState([]);

    useEffect(() => {
        setSearches(getRecentSearches());
        setViewed(getRecentlyViewed());
    }, []);

    const city = getPreferredCity();
    const hasAnyActivity = searches.length > 0 || viewed.length > 0;

    if (!hasAnyActivity) return null; // Nothing to show yet — first-time visitor

    return (
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto mb-2">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">

                {/* Left: Recent searches + Continue browsing */}
                <div className="flex-1 min-w-0 space-y-3">
                    {searches.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-bold text-gray-500 shrink-0">Recent searches:</span>
                            {searches.slice(0, 3).map((s) => (
                                <button
                                    key={s.label}
                                    onClick={() => navigate(s.url)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-[12px] font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
                                >
                                    <History size={11} className="text-gray-400" /> {s.label}
                                </button>
                            ))}
                            {searches.length > 3 && (
                                <button
                                    onClick={() => navigate('/search')}
                                    className="text-[12px] font-bold text-orange-600 hover:underline"
                                >
                                    View all searches
                                </button>
                            )}
                        </div>
                    )}

                    {viewed.length > 0 && (
                        <div>
                            <p className="text-[12px] font-bold text-gray-500 mb-2">Continue browsing...</p>
                            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                                {viewed.slice(0, 6).map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => navigate(p.url)}
                                        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-orange-300 transition-colors shrink-0"
                                    >
                                        <span className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                                            {p.image ? (
                                                <img src={p.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 size={12} className="text-gray-400" />
                                            )}
                                        </span>
                                        <span className="text-[12px] font-semibold text-gray-700 truncate max-w-[120px]">{p.name}</span>
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setPreferredCity(''); // signal "let me pick a new one" — home page will re-prompt
                                        navigate('/');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-[12px] font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors shrink-0"
                                >
                                    <MapPin size={11} /> Explore New City
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Guest / user activity card — desktop only */}
                <div className="hidden lg:flex w-72 shrink-0 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="w-full">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                <UserIcon size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Guest User'}</p>
                                <p className="text-[11px] text-gray-400">Browsing in {city}</p>
                            </div>
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Your Recent Activity</p>
                        {viewed.length > 0 ? (
                            <ul className="space-y-1.5">
                                {viewed.slice(0, 3).map((p) => (
                                    <li key={p.id}>
                                        <button
                                            onClick={() => navigate(p.url)}
                                            className="text-[12px] text-gray-600 hover:text-orange-600 truncate block text-left w-full"
                                        >
                                            {p.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-[12px] text-gray-400">No activity yet! Start browsing properties and projects to track them here.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecentActivityBar;
