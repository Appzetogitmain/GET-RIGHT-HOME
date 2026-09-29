import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, User, Wallet, Heart, HelpCircle, ChevronRight,
    LogOut, Settings, Building, Bell, Edit3, Video,
    Star, PlusCircle, CreditCard, MessageSquare, Lightbulb, Gift
} from 'lucide-react';
import { userService } from '../../services/apiService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MobileMenu = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (isOpen && user) {
            const fetchUnread = async () => {
                try {
                    const data = await userService.getNotifications(1, 1);
                    if (data.success && data.meta) {
                        setUnreadCount(data.meta.unreadCount);
                    }
                } catch (error) {
                    console.error('Error fetching unread count', error);
                }
            };
            fetchUnread();
        }
    }, [isOpen, user]);

    // Lock scroll and pause Lenis when open
    useEffect(() => {
        if (isOpen) {
            if (window.lenis) window.lenis.stop();
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            if (window.lenis) window.lenis.start();
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        return () => {
            if (window.lenis) window.lenis.start();
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    const handleNavigation = (path) => {
        if (path) { navigate(path); onClose(); }
    };

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/login');
    };

    const MenuItem = ({ icon: Icon, label, path, badge }) => {
        const isActive = path && location.pathname === path;
        return (
            <button
                onClick={() => handleNavigation(path)}
                className={`flex items-center gap-3.5 w-full p-2.5 rounded-xl transition-all group active:scale-95 ${isActive ? 'bg-surface/10' : 'hover:bg-gray-50'}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-surface' : 'bg-surface/5 group-hover:bg-surface/10'}`}>
                    <Icon size={16} className={isActive ? 'text-white' : 'text-surface'} />
                </div>
                <span className={`flex-1 text-left text-sm ${isActive ? 'font-bold text-surface' : 'font-medium text-gray-700'}`}>{label}</span>
                {badge && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-2">
                        {badge}
                    </div>
                )}
                <ChevronRight size={14} className={isActive ? 'text-surface' : 'text-gray-300 group-hover:text-surface transition-colors'} />
            </button>
        );
    };

    // Section divider
    const SectionTitle = ({ title }) => (
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2 mt-1">{title}</h4>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] lg:hidden"
                        style={{ pointerEvents: 'auto' }}
                        data-lenis-prevent="true"
                    />
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', ease: 'circOut', duration: 0.3 }}
                        className="fixed inset-y-0 left-0 h-full max-h-[100dvh] w-[85%] max-w-[320px] bg-white z-[160] lg:hidden shadow-2xl flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        data-lenis-prevent="true"
                    >
                        {/* Fixed Top Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 shrink-0 border-b border-gray-100 bg-white">
                            <div className="flex flex-col items-start leading-none cursor-pointer" onClick={() => { navigate('/'); onClose(); }}>
                                <span className="text-lg font-black tracking-tighter text-[#111827] flex items-center gap-1 uppercase">
                                    GET RIGHT <span className="text-orange-600">HOME</span>
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 active:scale-90 transition border border-gray-100 text-gray-500"
                                aria-label="Close menu"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Content Area */}
                        <div 
                            data-lenis-prevent="true"
                            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4 custom-scrollbar"
                            style={{ 
                                WebkitOverflowScrolling: 'touch',
                                touchAction: 'pan-y'
                            }}
                        >
                            {/* Profile Card */}
                            <div>
                                {user ? (
                                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm overflow-hidden shrink-0">
                                                    {user.profileImage
                                                        ? <img src={user.profileImage} className="w-full h-full object-cover" alt="profile" />
                                                        : <User size={22} className="text-white" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-base leading-tight truncate">{user.name || 'User'}</h3>
                                                    <p className="text-[11px] text-white/80 mt-0.5 truncate">{user.phone || user.email || ''}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { navigate('/profile'); onClose(); }}
                                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-colors backdrop-blur-sm shrink-0 ml-2"
                                                title="Edit Profile"
                                            >
                                                <Edit3 size={14} className="text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-surface rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20 shrink-0">
                                                <User size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base leading-tight">Guest User</h3>
                                                <p className="text-[10px] text-white/70">Sign in for better experience</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button onClick={() => handleNavigation('/login')} className="flex-1 py-2 bg-white text-surface text-xs font-bold rounded-lg shadow-sm hover:bg-gray-50 active:scale-95 transition-all">Login</button>
                                            <button onClick={() => handleNavigation('/signup')} className="flex-1 py-2 bg-white/10 text-white border border-white/20 text-xs font-bold rounded-lg hover:bg-white/20 active:scale-95 transition-all">Signup</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Discover */}
                            <div>
                                <SectionTitle title="Discover" />
                                <div className="flex flex-col gap-1">
                                    {user && <MenuItem icon={Heart} label="Saved Places" path="/saved-places" />}
                                    <MenuItem icon={Lightbulb} label="Popular Tools" path="/popular-tools" />
                                    <MenuItem icon={Video} label="Reels" path="/reels" />
                                </div>
                            </div>

                            {/* Bookings & Orders - only show if logged in */}
                            {user && (
                                <div>
                                    <SectionTitle title="Bookings & Orders" />
                                    <div className="flex flex-col gap-1">
                                        <MenuItem icon={CalendarCheck} label="My Service Bookings" path="/user/home-services/bookings" />
                                        <MenuItem icon={Building} label="Hotel & Stay Bookings" path="/bookings" />
                                    </div>
                                </div>
                            )}

                            {/* My Properties - only show if logged in */}
                            {user && (
                                <div>
                                    <SectionTitle title="My Properties" />
                                    <div className="flex flex-col gap-1">
                                        <MenuItem icon={PlusCircle} label="List a Property" path="/list-property" />
                                        <MenuItem icon={Building} label="My Listings" path="/my-properties" />
                                        <MenuItem icon={MessageSquare} label="Received Enquiries" path="/my-enquiries" />
                                        <MenuItem icon={Star} label="My Reviews" path="/my-reviews" />
                                    </div>
                                </div>
                            )}

                            {/* Finance - only show if logged in */}
                            {user && (
                                <div>
                                    <SectionTitle title="Finance" />
                                    <div className="flex flex-col gap-1">
                                        <MenuItem icon={Wallet} label="My Wallet" path="/wallet" />
                                        <MenuItem icon={CreditCard} label="Subscription Plans" path="/my-subscriptions" />
                                        <MenuItem icon={Gift} label="Refer & Earn" path="/refer" />
                                    </div>
                                </div>
                            )}

                            {/* App Settings */}
                            <div>
                                <SectionTitle title="Settings" />
                                <div className="flex flex-col gap-1">
                                    <MenuItem icon={Bell} label="Notifications" path="/notifications" badge={unreadCount > 0 ? unreadCount : null} />
                                    <MenuItem icon={Settings} label="Settings" path="/settings" />
                                    <MenuItem icon={HelpCircle} label="Need Help?" path="/support" />
                                </div>
                            </div>

                            {/* Legal & Logout */}
                            <div className="pt-3 border-t border-gray-100 pb-16">
                                <button onClick={() => handleNavigation('/legal')} className="flex items-center gap-3 w-full p-2 hover:text-surface transition-colors">
                                    <span className="text-xs font-medium text-gray-500 hover:text-surface">Privacy Policy</span>
                                </button>
                                <button onClick={() => handleNavigation('/terms')} className="flex items-center gap-3 w-full p-2 hover:text-surface transition-colors">
                                    <span className="text-xs font-medium text-gray-500 hover:text-surface">Terms & Conditions</span>
                                </button>
                                {user && (
                                    <button
                                        onClick={handleLogout}
                                        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 text-red-500 font-bold text-[13px] bg-red-50 hover:bg-red-100 rounded-xl border border-red-100 active:scale-[0.97] transition-all"
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileMenu;
