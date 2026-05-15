import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Calendar, Wallet, Star, Eye, Edit3,
    TrendingUp, Users, BedDouble, MapPin, Loader2,
    ChevronRight, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { api } from '../../services/apiService';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-gray-800', onClick }) => (
    <motion.div
        whileTap={{ scale: onClick ? 0.97 : 1 }}
        onClick={onClick}
        className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}
    >
        <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                <Icon size={18} className={color} />
            </div>
            {onClick && <ChevronRight size={14} className="text-gray-300 mt-1" />}
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </motion.div>
);

const UserPropertyDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [stats, setStats] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [propRes, statsRes, bookRes] = await Promise.allSettled([
                api.get(`/properties/${id}`),
                api.get(`/properties/${id}/stats`),
                api.get(`/bookings/received`, { params: { propertyId: id, limit: 5, as: 'owner' } }),
            ]);

            if (propRes.status === 'fulfilled' && propRes.value.data.success) {
                setProperty(propRes.value.data.property || propRes.value.data.hotel);
            }
            if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
                setStats(statsRes.value.data.stats);
            }
            if (bookRes.status === 'fulfilled' && bookRes.value.data.success) {
                setRecentBookings(bookRes.value.data.bookings || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Could not load property details');
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
    const fmtCurrency = (n) => `₹${fmt(n)}`;

    const getPropertyEditPath = () => {
        if (!property) return '/my-properties';
        const type = (property.propertyType || '').toLowerCase();
        const map = {
            pg: `/list-property/join-pg/${id}`,
            hostel: `/list-property/join-hostel/${id}`,
            hotel: `/list-property/join-hotel/${id}`,
            villa: `/list-property/join-villa/${id}`,
            resort: `/list-property/join-resort/${id}`,
            homestay: `/list-property/join-homestay/${id}`,
        };
        return map[type] || `/list-property/wizard/${property.categoryId || 'general'}/${id}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
                <AlertCircle size={40} className="text-gray-300 mb-4" />
                <h2 className="font-bold text-gray-700 mb-2">Property not found</h2>
                <button onClick={() => navigate('/my-properties')} className="mt-4 text-sm text-emerald-600 font-bold">
                    ← Back to My Properties
                </button>
            </div>
        );
    }

    const coverImage = property.coverImage || property.images?.[0] || null;
    const propertyName = property.propertyName || property.name || 'My Property';
    const city = property.city || property.address?.city || '';
    const isActive = property.isActive ?? true;

    return (
        <div className="min-h-screen bg-gray-50 pb-28">
            {/* Hero */}
            <div className="relative h-52 overflow-hidden">
                {coverImage
                    ? <img src={coverImage} alt={propertyName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800" />
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 w-9 h-9 bg-black/40 backdrop-blur-sm text-white rounded-xl flex items-center justify-center"
                >
                    <ArrowLeft size={18} />
                </button>

                {/* Edit Button */}
                <button
                    onClick={() => navigate(getPropertyEditPath())}
                    className="absolute top-4 right-4 flex items-center gap-1.5 bg-white text-gray-900 text-xs font-bold px-3 py-2 rounded-xl shadow-md"
                >
                    <Edit3 size={13} /> Edit
                </button>

                {/* Property Info overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'}`}>
                            {isActive ? '● Live' : '○ Inactive'}
                        </span>
                        <span className="text-[10px] text-white/80 capitalize font-medium">{property.propertyType}</span>
                    </div>
                    <h1 className="text-white font-black text-xl leading-tight">{propertyName}</h1>
                    {city && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-white/70" />
                            <p className="text-white/80 text-xs">{city}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 pt-5 max-w-xl mx-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <StatCard
                        icon={Calendar}
                        label="Total Bookings"
                        value={fmt(stats?.totalBookings)}
                        sub={stats?.bookingsThisMonth > 0 ? `+${stats.bookingsThisMonth} this month` : 'No bookings yet'}
                        color="text-blue-600"
                        onClick={() => navigate('/my-received-bookings')}
                    />
                    <StatCard
                        icon={Wallet}
                        label="Total Earnings"
                        value={fmtCurrency(stats?.totalRevenue)}
                        sub="From bookings"
                        color="text-emerald-600"
                        onClick={() => navigate('/wallet')}
                    />
                    <StatCard
                        icon={Eye}
                        label="Views"
                        value={fmt(stats?.totalViews)}
                        sub="Property page visits"
                        color="text-purple-600"
                    />
                    <StatCard
                        icon={Star}
                        label="Rating"
                        value={stats?.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—'}
                        sub={stats?.totalReviews ? `${stats.totalReviews} reviews` : 'No reviews yet'}
                        color="text-amber-500"
                    />
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                        <h2 className="text-sm font-black text-gray-900">Quick Actions</h2>
                    </div>
                    {[
                        { icon: Calendar, label: 'View Received Bookings', path: '/my-received-bookings', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { icon: Wallet, label: 'My Wallet & Earnings', path: '/wallet', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { icon: Edit3, label: 'Edit This Property', path: getPropertyEditPath(), color: 'text-gray-700', bg: 'bg-gray-100' },
                        { icon: TrendingUp, label: 'Subscription Plans', path: '/my-subscriptions', color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.path)}
                            className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                        >
                            <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                                <action.icon size={15} className={action.color} />
                            </div>
                            <span className="flex-1 text-left text-sm font-semibold text-gray-700">{action.label}</span>
                            <ChevronRight size={15} className="text-gray-300" />
                        </button>
                    ))}
                </div>

                {/* Recent Bookings */}
                {recentBookings.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                            <h2 className="text-sm font-black text-gray-900">Recent Bookings</h2>
                            <button onClick={() => navigate('/my-received-bookings')} className="text-xs font-bold text-emerald-600">
                                View All →
                            </button>
                        </div>
                        {recentBookings.slice(0, 3).map(b => {
                            const status = (b.bookingStatus || b.status || 'pending').toLowerCase();
                            const statusColors = {
                                confirmed: 'text-blue-600 bg-blue-50',
                                completed: 'text-emerald-600 bg-emerald-50',
                                cancelled: 'text-red-500 bg-red-50',
                                pending: 'text-yellow-600 bg-yellow-50',
                            };
                            return (
                                <div key={b._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <Users size={14} className="text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{b.userId?.name || 'Guest'}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {b.checkInDate ? new Date(b.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[status] || 'text-gray-500 bg-gray-50'}`}>
                                        {status.replace('_', ' ')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserPropertyDashboard;
