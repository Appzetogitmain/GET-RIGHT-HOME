import React from 'react';
import { Home, Briefcase, Search, User, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { name: 'Home', icon: Home, route: '/' },
        { name: 'Search', icon: Search, route: '/search' },
        { name: 'Reels', icon: Video, route: '/reels' },
        { name: 'Bookings', icon: Briefcase, route: '/bookings' },
        { name: 'Profile', icon: User, route: '/profile/edit' },
    ];

    const getActiveTab = (path) => {
        if (path.includes('listings') || path.includes('search')) return 'Search';
        if (path.includes('reels')) return 'Reels';
        if (path.includes('bookings') || path.includes('checkout')) return 'Bookings';
        if (path.includes('profile') || path.includes('account')) return 'Profile';
        return 'Home';
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
                                    className="absolute inset-x-2 top-1 bottom-1 bg-surface/10 rounded-xl -z-10"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            <Icon
                                size={24}
                                className={`transition-colors duration-200 ${isActive ? 'text-surface fill-surface/20' : 'text-gray-400'}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />

                            <span className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${isActive ? 'text-surface' : 'text-gray-500'}`}>
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
