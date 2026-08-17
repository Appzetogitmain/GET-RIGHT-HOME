import React, { useEffect, useState, Suspense, lazy } from 'react';
import { User, Globe, Bell, MapPin, ChevronDown } from 'lucide-react';
import logo from '../../assets/grh-logo.png';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPreferredCity, onPreferredCityChange } from '../../utils/locationPreference';

// Pulls in the Google Maps Places library — only load it once someone
// actually opens the picker, not on every page load (TopNavbar renders
// everywhere, eagerly).
const CityExploreModal = lazy(() => import('../user/CityExploreModal'));

const ROLE_LINKS = [
    { label: 'For Buyers', to: '/buy' },
    { label: 'For Tenants', to: '/rent-pg' },
    { label: 'For Owners', to: '/list-property' },
    { label: 'For Dealers / Builders', to: '/partner-landing' },
];

// A guest (or a plain buyer/tenant account) doesn't know which of these
// personas they are yet, so the full "who are you" self-selection nav is
// useful. Once an account is actually declared owner/broker/builder,
// showing all 4 entry points — including personas they aren't — is just
// noise; give them the one link to what they actually use instead.
const LISTER_ROLES = ['owner', 'broker', 'builder'];
const LISTER_LINKS = [{ label: 'My Properties', to: '/my-properties' }];

const TopNavbar = () => {
    // Get user from useAuth hook
    const { user } = useAuth();
    const userName = user?.name || 'User';
    const location = useLocation();
    const [city, setCity] = useState(getPreferredCity());
    const [isCityModalOpen, setIsCityModalOpen] = useState(false);
    const roleLinks = (user && LISTER_ROLES.includes(user.role)) ? LISTER_LINKS : ROLE_LINKS;

    // Stay in sync with the city picker on the home page, even without a reload
    useEffect(() => onPreferredCityChange(setCity), []);

    // Determine theme based on route
    let themeBg = 'bg-orange-50/95';
    let themeBorder = 'border-orange-100';
    let themeText = 'text-orange-600';
    let themeBtn = 'bg-orange-600';
    let themeBtnHover = 'hover:bg-orange-700';
    let themeLogoColor = 'text-orange-600';

    if (location.pathname === '/buy') {
        themeBg = 'bg-blue-100/95';
        themeBorder = 'border-blue-200';
        themeText = 'text-blue-600';
        themeBtn = 'bg-blue-600';
        themeBtnHover = 'hover:bg-blue-700';
        themeLogoColor = 'text-blue-600';
    } else if (location.pathname === '/rent-pg' || location.pathname === '/rent') {
        themeBg = 'bg-violet-100/95';
        themeBorder = 'border-violet-200';
        themeText = 'text-violet-600';
        themeBtn = 'bg-violet-600';
        themeBtnHover = 'hover:bg-violet-700';
        themeLogoColor = 'text-violet-600';
    } else if (location.pathname === '/plot') {
        themeBg = 'bg-amber-100/95';
        themeBorder = 'border-amber-200';
        themeText = 'text-amber-600';
        themeBtn = 'bg-amber-500';
        themeBtnHover = 'hover:bg-amber-600';
        themeLogoColor = 'text-amber-600';
    }

    return (
        <>
        <nav className={`hidden lg:flex w-full h-20 ${themeBg} backdrop-blur-md border-b ${themeBorder} px-6 justify-between items-center fixed top-0 z-50 transition-colors duration-700`}>

            {/* Left side: Logo + current city (persists across every page) */}
            <div className="flex items-center gap-4 shrink-0">
                <Link to="/" className="shrink-0">
                    <div className="flex items-center gap-0 group">
                        <img src={logo} alt="GRH Logo" className="h-12 w-auto object-contain" />
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tighter text-gray-900 uppercase">
                                Get Right<span className={`${themeLogoColor} transition-colors duration-700`}> Home</span>
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real Estate Hub</span>
                        </div>
                    </div>
                </Link>
                <button
                    type="button"
                    onClick={() => setIsCityModalOpen(true)}
                    title="Change city"
                    className={`hidden xl:flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-full border transition-colors ${
                        isCityModalOpen ? 'border-orange-300 bg-white' : 'border-gray-200 bg-white/70 hover:bg-white'
                    }`}
                >
                    <MapPin size={13} className={themeText} />
                    <span className="text-[13px] font-bold text-gray-700">{city}</span>
                    <ChevronDown size={12} className={`text-gray-400 transition-transform ${isCityModalOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Center: Role-based links (99acres-style) + core utility pages */}
            <div className="flex items-center gap-6 px-4 shrink-0">
                {roleLinks.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={`text-gray-500 font-bold text-[13px] hover:${themeText} transition tracking-tight whitespace-nowrap`}
                    >
                        {link.label}
                    </Link>
                ))}
                <span className="h-4 w-px bg-gray-200" />
                <Link to="/search" className={`text-gray-500 font-bold text-sm hover:${themeText} transition tracking-tight`}>
                    Search
                </Link>
                <Link to="/reels" className={`text-gray-500 font-bold text-sm hover:${themeText} transition tracking-tight`}>
                    Reels
                </Link>
            </div>

            {/* Right side: Post property, Bell, User Actions */}
            <div className="flex items-center gap-3 shrink-0">
                <Link
                    to="/list-property"
                    className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                    <span className={`${themeText} font-bold text-[14px] transition-colors duration-700`}>Post property</span>
                    <span className={`${themeBtn} text-white text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-widest shadow-sm transition-colors duration-700`}>Free</span>
                </Link>
                <Link to="/notifications" className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-all active:scale-95">
                    <Bell size={20} strokeWidth={2} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </Link>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-200"></div>

                {/* User Actions */}
                <div className="flex items-center gap-2">
                {user ? (
                    <>

                        <Link
                            to="/profile"
                            className={`pl-3 pr-4 py-1.5 bg-white border border-gray-100 rounded-full flex items-center gap-3 hover:${themeBorder} transition group shadow-sm`}
                        >
                            <div className={`w-8 h-8 rounded-full ${themeBtn} text-white flex items-center justify-center font-bold text-xs shadow-md transition-colors duration-700 overflow-hidden`}>
                                {(user.profileImage || user.avatar || user.photo) ? (
                                    <img 
                                        src={user.profileImage || user.avatar || user.photo} 
                                        alt={userName} 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    userName.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className={`text-sm font-bold text-gray-900 group-hover:${themeText}`}>
                                {userName.split(' ')[0]}
                            </span>
                        </Link>
                    </>
                ) : (
                    <Link
                        to="/login"
                        className={`px-6 py-2 ${themeBtn} ${themeBtnHover} text-white text-sm font-bold rounded-full transition shadow-sm active:scale-95`}
                    >
                        Login / Signup
                    </Link>
                )}
                </div>
            </div>

        </nav>

        {isCityModalOpen && (
            <Suspense fallback={null}>
                <CityExploreModal isOpen={isCityModalOpen} onClose={() => setIsCityModalOpen(false)} />
            </Suspense>
        )}
        </>
    );
};

export default TopNavbar;
