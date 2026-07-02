import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, Building2, Calendar, Wallet,
    Settings, Bell, Search, LogOut, Menu, X, DollarSign, ClipboardCheck, Star, Tag, FileText, MessageSquare, CircleHelp, Home, LayoutGrid, CreditCard, Video, Image as ImageIcon, MapPin, ShieldCheck
} from 'lucide-react';


import logo from '../../../assets/grh-logo.png';
import useAdminStore from '../store/adminStore';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useAdminStore(state => state.logout);

    // Notifications State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        // Close dropdown when clicking outside
        function handleClickOutside(event) {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await adminService.getNotifications(1, 5); // Fetch top 5 for dropdown
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.meta.unreadCount);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleViewAll = async () => {
        setIsNotifOpen(false);
        // Mark all as read when going to view all? The user requirement says "click view all -> redirect to received tab -> status change to read".
        // We can do marking read on the page itself or here. Let's do it here for smoother UX or let the page handle it.
        // Requirement: "View all notifications option ho uspr click krne pr recieved notification ki tab pr redirect ho jaye admin and all the unread notifications ka status change hoke read ho jaye"
        try {
            await adminService.markAllNotificationsRead();
            setUnreadCount(0); // Optimistic update
            navigate('/admin/notifications');
        } catch (err) {
            navigate('/admin/notifications');
        }
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        navigate('/admin/login');
    };

    const MENU_GROUPS = [
        {
            title: 'OVERVIEW',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
            ]
        },
        {
            title: 'MANAGEMENT',
            items: [
                { icon: Users, label: 'User Management', path: '/admin/users' },
                { icon: ShieldCheck, label: 'Manager Management', path: '/admin/managers' },
                { icon: Building2, label: 'Partner Management', path: '/admin/partners' },
                { icon: Building2, label: 'Builder Management', path: '/admin/builders' },
                { icon: CreditCard, label: 'Subscriptions', path: '/admin/subscriptions' },
                { icon: Home, label: 'Property Management', path: '/admin/properties' },
                { icon: LayoutGrid, label: 'Categories', path: '/admin/categories' },
                { icon: Star, label: 'Featured Properties', path: '/admin/featured-properties' },
                { icon: FileText, label: 'Property Form CMS', path: '/admin/property-forms' },
                { icon: MapPin, label: 'Location Manager', path: '/admin/locations' },
                { icon: MapPin, label: 'Locality Insights', path: '/admin/locality-insights' },
                { icon: MessageSquare, label: 'Enquiries', path: '/admin/enquiries' },
                { icon: ImageIcon, label: 'Banner Management', path: '/admin/banners' },
                { icon: Video, label: 'Reel Analysis', path: '/admin/reel-analysis' },
                { icon: Star, label: 'Reviews', path: '/admin/reviews' },
            ]
        },
        {
            title: 'SYSTEM',
            items: [
                { icon: Wallet, label: 'Finance & Payouts', path: '/admin/finance' },
                { icon: Tag, label: 'Offers & Coupons', path: '/admin/offers' },
                { icon: Bell, label: 'Notifications', path: '/admin/notifications', badge: unreadCount > 0 },
                { icon: FileText, label: 'Legal & Content', path: '/admin/legal' },
                { icon: MessageSquare, label: 'Contact Messages', path: '/admin/contact-messages' },
                { icon: CircleHelp, label: 'FAQs', path: '/admin/faqs' },
                { icon: Settings, label: 'Settings', path: '/admin/settings' },
            ]
        }
    ];


    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 80 }}
                className="bg-white text-gray-900 flex flex-col h-full border-r border-gray-100 shadow-xl z-20 transition-all duration-300 relative"
            >
                {/* Sidebar Header - Kitchen Appliance Style */}
                <div className={`p-5 flex items-center justify-between bg-white border-b border-gray-50 transition-all duration-300 ${!isSidebarOpen && 'flex-col gap-4 p-4'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                            <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-black text-gray-900 truncate tracking-tight uppercase">
                                    GET RIGHT <span className="text-orange-600">HOME</span>
                                </span>
                                <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Admin Panel</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Toggle Button Moved to Top */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors ${!isSidebarOpen && 'mt-2'}`}
                    >
                        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>


                {/* Navigation with Groups */}
                <nav className="flex-1 py-4 px-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {MENU_GROUPS.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-2">
                            {isSidebarOpen && (
                                <h4 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                    {group.title}
                                </h4>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = item.path === '/admin/properties'
                                        ? location.pathname === item.path || location.pathname.startsWith('/admin/properties/')
                                        : location.pathname.startsWith(item.path);
                                    return (

                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center transition-all group relative text-[13px] font-medium tracking-tight ${isSidebarOpen 
                                                ? 'gap-3 px-4 py-2.5 rounded-xl' 
                                                : 'justify-center w-12 h-12 rounded-xl mx-auto mb-1'
                                                } ${isActive
                                                ? 'bg-black text-white shadow-xl shadow-gray-900/10 font-semibold'
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
                                            {item.badge && isSidebarOpen && (
                                                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shrink-0"></span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>


                {/* Footer / Logout Only */}
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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tighter">
                            GET RIGHT <span className="text-orange-600">HOME</span>
                        </h1>
                        <div className="hidden md:flex items-center relative max-w-md w-full ml-8">
                            <Search size={16} className="absolute left-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users, bookings, hotels..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6" ref={notifRef}>
                        {/* Admin Mode Toggle */}
                        <div className="hidden lg:flex items-center bg-gray-100 rounded-full p-1 border border-gray-200">
                            <button
                                onClick={() => navigate('/admin/dashboard')}
                                className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${!location.pathname.includes('/home-service') ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Property
                            </button>
                            <button
                                onClick={() => navigate('/admin/home-service/dashboard')}
                                className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${location.pathname.includes('/home-service') ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Home Service
                            </button>
                        </div>

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

                            {/* Dropdown */}
                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right"
                                    >
                                        <div className="p-3 border-b flex justify-between items-center bg-gray-50/50">
                                            <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                                            {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.slice(0, 3).map((n) => (
                                                    <div key={n._id} className={`p-3 border-b hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{n.title}</p>
                                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                                                        <span className="text-[10px] text-gray-400 mt-1 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 text-sm">No notifications</div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t bg-gray-50">
                                            <button
                                                onClick={handleViewAll}
                                                className="w-full text-center text-xs font-bold text-black hover:underline py-1"
                                            >
                                                View All Notifications
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                            A
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

export default AdminLayout;
