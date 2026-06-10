import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, Building2, Wallet, Settings, Bell,
    LogOut, Menu, X, Star, Tag, FileText, MessageSquare, CircleHelp,
    Home, LayoutGrid, CreditCard, Video, Image as ImageIcon, MapPin,
    ShieldCheck, ClipboardList, BarChart3, ChevronRight
} from 'lucide-react';
import useManagerStore from '../store/managerStore';
import logo from '../../../assets/grh-logo.png';
import toast from 'react-hot-toast';
import { axiosInstance } from '../store/managerStore';

// ── Module key → sidebar config mapping ─────────────────────────────────────
// Each entry maps a MANAGER_MODULES key to its sidebar label, icon, and path.
const MODULE_NAV_MAP = {
    dashboard:       { icon: LayoutDashboard, label: 'Dashboard',          path: '/manager/dashboard' },
    users:           { icon: Users,           label: 'User Management',    path: '/manager/users' },
    partners:        { icon: Building2,        label: 'Partner Management', path: '/manager/partners' },
    subscriptions:   { icon: CreditCard,       label: 'Subscriptions',      path: '/manager/subscriptions' },
    properties:      { icon: Home,             label: 'Properties',         path: '/manager/properties' },
    categories:      { icon: LayoutGrid,       label: 'Categories',         path: '/manager/categories' },
    property_forms:  { icon: FileText,         label: 'Property Forms',     path: '/manager/property-forms' },
    locations:       { icon: MapPin,           label: 'Locations',          path: '/manager/locations' },
    enquiries:       { icon: ClipboardList,    label: 'Enquiries / Leads',  path: '/manager/enquiries' },
    bookings:        { icon: BarChart3,        label: 'Bookings',           path: '/manager/bookings' },
    reviews:         { icon: Star,             label: 'Reviews',            path: '/manager/reviews' },
    banners:         { icon: ImageIcon,        label: 'Banners',            path: '/manager/banners' },
    reel_analysis:   { icon: Video,            label: 'Reel Analysis',      path: '/manager/reel-analysis' },
    finance:         { icon: Wallet,           label: 'Finance & Payouts',  path: '/manager/finance' },
    offers:          { icon: Tag,              label: 'Offers & Coupons',   path: '/manager/offers' },
    notifications:   { icon: Bell,             label: 'Notifications',      path: '/manager/notifications' },
    legal:           { icon: FileText,         label: 'Legal & Content',    path: '/manager/legal' },
    contact_messages:{ icon: MessageSquare,    label: 'Contact Messages',   path: '/manager/contact-messages' },
    faqs:            { icon: CircleHelp,       label: 'FAQs',               path: '/manager/faqs' },
    settings:        { icon: Settings,         label: 'Settings',           path: '/manager/settings' },
};

const ManagerLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { manager, permissions, logout } = useManagerStore();

    // Notifications State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef(null);

    // ── Build dynamic sidebar from permissions ─────────────────────────────
    // Always show Dashboard. Then show each module the manager has 'view' access to.
    const permittedModuleKeys = [
        'dashboard',
        ...permissions
            .filter(p => p.actions.includes('view'))
            .map(p => p.module)
            .filter(k => k !== 'dashboard')
    ];

    const navItems = permittedModuleKeys
        .map(key => MODULE_NAV_MAP[key])
        .filter(Boolean); // Remove any unknown keys

    useEffect(() => {
        loadNotifications();
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await axiosInstance.get('/admin/notifications?page=1&limit=5');
            if (data.data.success) {
                setNotifications(data.data.notifications || []);
                setUnreadCount(data.data.meta?.unreadCount || 0);
            }
        } catch (error) {
            // Silent fail — notifications are optional
        }
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        navigate('/manager/login');
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 275 : 76 }}
                className="bg-white text-gray-900 flex flex-col h-full border-r border-gray-100 shadow-xl z-20 relative"
            >
                {/* Header */}
                <div className={`p-5 flex items-center justify-between bg-white border-b border-gray-50 transition-all duration-300 ${!isSidebarOpen && 'flex-col gap-4 p-4'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 shadow-sm">
                            <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-black text-gray-900 truncate tracking-tight uppercase">
                                    GET RIGHT <span className="text-teal-600">HOME</span>
                                </span>
                                <p className="text-[9px] text-teal-500 font-bold tracking-widest uppercase">Manager Panel</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors ${!isSidebarOpen && 'mt-2'}`}
                    >
                        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                {/* Manager Badge */}
                {isSidebarOpen && manager && (
                    <div className="mx-4 mt-4 mb-1 p-3 rounded-xl bg-teal-50 border border-teal-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                            {manager.name?.charAt(0) || 'M'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">{manager.name}</p>
                            <p className="text-[9px] text-teal-600 font-bold uppercase tracking-widest">
                                {manager.branch || 'All Branches'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {isSidebarOpen && (
                        <p className="px-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Navigation</p>
                    )}
                    {navItems.map((item) => {
                        const isActive = item.path === '/manager/properties'
                            ? location.pathname === item.path || location.pathname.startsWith('/manager/properties/')
                            : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={!isSidebarOpen ? item.label : undefined}
                                className={`flex items-center transition-all group relative text-[13px] font-medium tracking-tight ${
                                    isSidebarOpen
                                        ? 'gap-3 px-4 py-2.5 rounded-xl'
                                        : 'justify-center w-12 h-12 rounded-xl mx-auto mb-1'
                                } ${isActive
                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                                    : 'text-slate-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <item.icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
                                {isSidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="whitespace-nowrap flex-1 truncate"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </Link>
                        );
                    })}

                    {navItems.length === 0 && isSidebarOpen && (
                        <div className="px-4 py-8 text-center">
                            <ShieldCheck size={32} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No modules assigned</p>
                            <p className="text-[9px] text-gray-300 mt-1">Contact admin to get permissions</p>
                        </div>
                    )}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors font-bold text-[13px] ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={18} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </motion.aside>

            {/* ── Main Content Area ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <h1 className="text-lg font-bold text-gray-800 uppercase tracking-tighter">
                            GET RIGHT <span className="text-teal-600">HOME</span>
                            <span className="text-xs text-gray-400 font-bold ml-2 normal-case tracking-tight">— Manager Panel</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4" ref={notifRef}>
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                                    >
                                        <div className="p-3 border-b flex justify-between items-center bg-gray-50/50">
                                            <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                                            {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                                        </div>
                                        <div className="max-h-56 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.slice(0, 3).map((n) => (
                                                    <div key={n._id} className={`p-3 border-b hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-teal-50/30' : ''}`}>
                                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{n.title}</p>
                                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-gray-400 text-xs">No notifications</div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Manager Avatar */}
                        <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                            {manager?.name?.charAt(0) || 'M'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 relative scroll-smooth bg-gray-50/50">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ManagerLayout;
