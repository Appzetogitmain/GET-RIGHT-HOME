import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    UserCheck, ShieldCheck, Activity, Clock, ChevronRight,
    TrendingUp, Bell, ClipboardList, Home, ArrowUpRight, Building2,
    BarChart3, AlertCircle, Loader2, CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useManagerStore from '../store/managerStore';
import { axiosInstance } from '../store/managerStore';

// Maps module key → quick action card config
const MODULE_QUICK_LINKS = {
    enquiries:   { label: 'View Enquiries',    path: '/manager/enquiries',    color: 'bg-blue-50 text-blue-700 border-blue-100',   icon: ClipboardList },
    properties:  { label: 'View Properties',   path: '/manager/properties',   color: 'bg-teal-50 text-teal-700 border-teal-100',   icon: Home },
    bookings:    { label: 'View Bookings',      path: '/manager/bookings',     color: 'bg-purple-50 text-purple-700 border-purple-100', icon: BarChart3 },
    users:       { label: 'View Users',         path: '/manager/users',        color: 'bg-orange-50 text-orange-700 border-orange-100', icon: UserCheck },
    partners:    { label: 'View Partners',      path: '/manager/partners',     color: 'bg-rose-50 text-rose-700 border-rose-100',   icon: Building2 },
    reviews:     { label: 'View Reviews',       path: '/manager/reviews',      color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Activity },
};

const StatCard = ({ label, value, icon: Icon, color, loading }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={22} />
        </div>
        <div>
            {loading ? (
                <div className="h-5 w-16 bg-gray-100 animate-pulse rounded"></div>
            ) : (
                <p className="text-2xl font-black text-gray-900">{value ?? '—'}</p>
            )}
            <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mt-0.5">{label}</p>
        </div>
    </div>
);

const ManagerDashboard = () => {
    const { manager, permissions } = useManagerStore();
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Permitted modules for quick links
    const permittedModules = permissions
        .filter(p => p.actions.includes('view'))
        .map(p => p.module);

    const quickLinks = Object.entries(MODULE_QUICK_LINKS)
        .filter(([key]) => permittedModules.includes(key))
        .map(([key, config]) => ({ key, ...config }));

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Only fetch stats relevant to what the manager can see
                const res = await axiosInstance.get('/admin/dashboard-stats');
                if (res.data.success) {
                    setStats(res.data.stats || res.data);
                }
            } catch (error) {
                // Silent — manager may not have permission
            } finally {
                setLoadingStats(false);
            }
        };

        if (permittedModules.includes('dashboard')) {
            fetchStats();
        } else {
            setLoadingStats(false);
        }
    }, []);

    const greetingTime = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="space-y-6">
            {/* Greeting Banner */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6 bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-200"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-teal-100 text-[11px] font-bold uppercase tracking-widest">{greetingTime()}</p>
                        <h2 className="text-3xl font-black tracking-tight mt-1">{manager?.name || 'Manager'}</h2>
                        <p className="text-teal-200 text-xs mt-1 font-bold uppercase tracking-wide">
                            {manager?.branch ? `Branch: ${manager.branch}` : 'All Branches'} · {permittedModules.length} Module{permittedModules.length !== 1 ? 's' : ''} Assigned
                        </p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                        <ShieldCheck size={32} className="text-white" />
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid (only if dashboard access + stats loaded) */}
            {permittedModules.includes('dashboard') && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Users"
                        value={stats?.totalUsers}
                        icon={UserCheck}
                        color="bg-blue-50 text-blue-600"
                        loading={loadingStats}
                    />
                    <StatCard
                        label="Properties"
                        value={stats?.totalProperties || stats?.totalHotels}
                        icon={Home}
                        color="bg-teal-50 text-teal-600"
                        loading={loadingStats}
                    />
                    <StatCard
                        label="Bookings"
                        value={stats?.totalBookings}
                        icon={BarChart3}
                        color="bg-purple-50 text-purple-600"
                        loading={loadingStats}
                    />
                    <StatCard
                        label="Partners"
                        value={stats?.totalPartners}
                        icon={Building2}
                        color="bg-orange-50 text-orange-600"
                        loading={loadingStats}
                    />
                </div>
            )}

            {/* Permission Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Quick Access Links */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-2">
                        <ChevronRight size={14} className="text-teal-500" />
                        Quick Access
                    </h3>
                    {quickLinks.length > 0 ? (
                        <div className="space-y-2">
                            {quickLinks.map(link => (
                                <Link
                                    key={link.key}
                                    to={link.path}
                                    className={`flex items-center justify-between p-3 rounded-xl border font-bold text-[11px] uppercase tracking-tight transition-all hover:shadow-sm ${link.color}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <link.icon size={14} />
                                        {link.label}
                                    </div>
                                    <ArrowUpRight size={12} />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center">
                            <AlertCircle size={28} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No modules assigned yet</p>
                            <p className="text-[9px] text-gray-300 mt-0.5">Contact Admin to configure access</p>
                        </div>
                    )}
                </div>

                {/* Permissions Overview */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-teal-500" />
                        Your Access Matrix
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {permissions.length > 0 ? (
                            permissions.map(perm => (
                                <div key={perm.module} className="flex items-start justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{perm.module.replace(/_/g, ' ')}</p>
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
                                        {perm.actions.map(action => (
                                            <span
                                                key={action}
                                                className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 border border-teal-200"
                                            >
                                                {action}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-6 text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No permissions assigned</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Last Login & Account Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-2">
                    <Clock size={14} className="text-teal-500" />
                    Account Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Role</p>
                        <p className="text-xs font-bold text-teal-700 uppercase mt-0.5">Manager</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Branch</p>
                        <p className="text-xs font-bold text-gray-800 uppercase mt-0.5">{manager?.branch || 'All'}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Email</p>
                        <p className="text-xs font-bold text-gray-800 mt-0.5 truncate">{manager?.email}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Last Login</p>
                        <p className="text-xs font-bold text-gray-800 mt-0.5">
                            {manager?.lastLogin
                                ? new Date(manager.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : 'This session'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
