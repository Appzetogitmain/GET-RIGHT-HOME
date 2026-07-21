import React from 'react';
import { Home, Briefcase, Search, User, Video, MessageSquare, Building, Key, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    let firstItem = { name: 'Home', icon: Home, route: '/' };
    let themeActiveText = 'text-surface';
    let themeActiveFill = 'fill-surface/20';
    let themeActiveBg = 'bg-surface/10';

    if (location.pathname === '/buy') {
        firstItem = { name: 'Buy', icon: Building, route: '/buy' };
        themeActiveText = 'text-blue-600';
        themeActiveFill = 'fill-blue-600/20';
        themeActiveBg = 'bg-blue-600/10';
    } else if (location.pathname === '/rent-pg' || location.pathname === '/rent') {
        firstItem = { name: 'Rent', icon: Key, route: '/rent-pg' };
        themeActiveText = 'text-violet-600';
        themeActiveFill = 'fill-violet-600/20';
        themeActiveBg = 'bg-violet-600/10';
    } else if (location.pathname === '/plot') {
        firstItem = { name: 'Plot', icon: Map, route: '/plot' };
        themeActiveText = 'text-amber-600';
        themeActiveFill = 'fill-amber-600/20';
        themeActiveBg = 'bg-amber-600/10';
    }

    const navItems = [
        firstItem,
        { name: 'Search', icon: Search, route: '/search' },
        { name: 'Reels', icon: Video, route: '/reels' },
        { name: 'Enquiries', icon: MessageSquare, route: '/my-enquiries' },
        { name: 'Profile', icon: User, route: '/profile' },
    ];

    const getActiveTab = (path) => {
        if (path.includes('listings') || path.includes('search')) return 'Search';
        if (path.includes('reels')) return 'Reels';
        if (path.includes('my-enquiries') || path.includes('enquiries')) return 'Enquiries';
        if (path.includes('bookings') || path.includes('checkout')) return 'Enquiries';
        if (path.includes('profile') || path.includes('account')) return 'Profile';
        return firstItem.name;
    };

    const activeTab = getActiveTab(location.pathname);

    const handleNavClick = (item) => {
        navigate(item.route);
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] print:hidden">
            <div className="
        bg-white/95 backdrop-blur-xl 
        border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]
        flex justify-between items-center 
        px-2 pt-2 pb-0 h-[60px]
      ">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;

                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavClick(item)}
                            className="relative flex flex-col items-center justify-center w-full h-full gap-0.5 p-1"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className={`absolute inset-x-2 top-1 bottom-1 rounded-xl -z-10 ${themeActiveBg}`}
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            <Icon
                                size={24}
                                className={`transition-colors duration-200 ${isActive ? `${themeActiveText} ${themeActiveFill}` : 'text-gray-400'}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />

                            <span className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${isActive ? themeActiveText : 'text-gray-500'}`}>
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNavbar;
