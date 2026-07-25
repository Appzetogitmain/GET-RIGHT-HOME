import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileMenu from './MobileMenu';

const MobileTopNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Only show on specific pages with BannerCarousel
    const allowedPaths = ['/', '/buy', '/rent-pg', '/plot'];
    const isAllowed = allowedPaths.includes(location.pathname);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!isAllowed) return null;

    // Theme logic based on TopNavbar/HeroSection
    let accentColor = '#10B981';
    let textClass = 'text-emerald-600';

    if (location.pathname === '/buy') {
        accentColor = '#3B82F6';
        textClass = 'text-blue-600';
    } else if (location.pathname === '/rent-pg') {
        accentColor = '#8B5CF6';
        textClass = 'text-violet-600';
    } else if (location.pathname === '/plot') {
        accentColor = '#F59E0B';
        textClass = 'text-amber-600';
    }

    return (
        <>
            <div className={`flex lg:hidden items-center justify-between h-12 px-2 fixed top-0 w-full z-[60] transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-white'}`}>
                <div className="flex items-center gap-0">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-1 text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                    >
                        <Menu size={26} strokeWidth={1.5} />
                    </button>
                    <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                        <span className="text-[14px] font-black tracking-tighter text-[#111827] uppercase leading-none">
                            GET RIGHT <span className={textClass}>HOME</span>
                        </span>
                        <div className={`h-0.5 w-4 rounded-full mt-0.5`} style={{ backgroundColor: accentColor }} />
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                    <div
                        onClick={() => navigate('/list-property')}
                        className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                    >
                        <span className="text-[#005B9F] font-semibold text-[13px]">Post property</span>
                        <span className="bg-[#10B981] text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Free</span>
                    </div>

                    <button 
                        onClick={() => navigate('/notifications')}
                        className="relative p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                    >
                        <LucideIcons.Bell size={20} strokeWidth={1.5} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                </div>
            </div>

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </>
    );
};

export default MobileTopNav;
