import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, MessageSquare, Wallet, Star, Eye, Edit3,
    TrendingUp, Users, MapPin, Loader2,
    ChevronRight, AlertCircle, Calendar, Clock
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

// Status badge for enquiry status
const EnqBadge = ({ status }) => {
    const st = (status || 'new').toLowerCase();
    const map = {
        new: 'bg-blue-50 text-blue-600',
        contacted: 'bg-amber-50 text-amber-700',
        scheduled: 'bg-purple-50 text-purple-700',
        closed: 'bg-emerald-50 text-emerald-700',
        dropped: 'bg-red-50 text-red-600',
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${map[st] || 'bg-gray-50 text-gray-500'}`}>
            {st}
        </span>
    );
};

const UserPropertyDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [stats, setStats] = useState(null);
    const [recentEnquiries, setRecentEnquiries] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [propRes, statsRes, enqRes, subRes] = await Promise.allSettled([
                api.get(`/properties/${id}`),
                api.get(`/properties/${id}/stats`),
                // Fetch enquiries received for this property (owner view)
                api.get(`/enquiries/received`, { params: { propertyId: id } }),
                api.get('/subscriptions/current')
            ]);

            if (propRes.status === 'fulfilled' && propRes.value.data.success) {
                setProperty(propRes.value.data.property || propRes.value.data.hotel);
            }
            if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
                setStats(statsRes.value.data.stats);
            }
            if (enqRes.status === 'fulfilled' && enqRes.value.data.success) {
                setRecentEnquiries(enqRes.value.data.enquiries || []);
            }
            if (subRes.status === 'fulfilled' && subRes.value.data.success) {
                setSubscription(subRes.value.data.subscription);
            }
        } catch (err) {
            console.error(err);
            toast.error('Could not load property details');
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

    const getPropertyEditPath = () => {
        if (!property) return '/my-properties';
        if (property.dynamicCategory) {
            const catId = typeof property.dynamicCategory === 'object' ? property.dynamicCategory._id : property.dynamicCategory;
            return `/list-property/wizard/${catId}/${id}`;
        }
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

    const handleEdit = () => {
        if (property.dynamicCategory) {
            navigate('/list-property/dynamic-form', {
                state: {
                    existingProperty: property,
                    transactionType: property.transactionType,
                    category: property.propertyCategory || property.propertyType,
                    propertyType: property.propertyType
                }
            });
        } else {
            navigate(getPropertyEditPath());
        }
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

    // Count enquiries by status
    const totalEnquiries = recentEnquiries.length;
    const newEnquiries = recentEnquiries.filter(e => (e.inquiryMetadata?.status || 'new') === 'new').length;

    return (
        <div className="min-h-screen bg-gray-50 pb-28">
            {/* Hero */}
            <div className="relative h-52 overflow-hidden">
                {coverImage
                    ? <img src={coverImage} alt={propertyName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-800" />
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
                    onClick={handleEdit}
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
                {/* Stats Grid — Enquiry focused */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <StatCard
                        icon={MessageSquare}
                        label="Total Enquiries"
                        value={fmt(totalEnquiries)}
                        sub={newEnquiries > 0 ? `${newEnquiries} new enquiries` : 'No new enquiries'}
                        color="text-indigo-600"
                        onClick={() => navigate('/my-enquiries')}
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
                        value={stats?.totalReviews > 0 && stats?.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—'}
                        sub={stats?.totalReviews ? `${stats.totalReviews} reviews` : 'No reviews yet'}
                        color="text-amber-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Subscription"
                        value={subscription?.planId?.name || 'Free Plan'}
                        sub={subscription?.planId ? `Expires ${new Date(subscription.expiryDate).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}` : 'Upgrade for more leads'}
                        color="text-emerald-600"
                        onClick={() => navigate('/my-subscriptions')}
                    />
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                        <h2 className="text-sm font-black text-gray-900">Quick Actions</h2>
                    </div>
                    {[
                        { icon: MessageSquare, label: 'View All Enquiries', path: '/my-enquiries', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { icon: Wallet, label: 'My Wallet & Earnings', path: '/wallet', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { icon: Edit3, label: 'Edit This Property', path: getPropertyEditPath(), color: 'text-gray-700', bg: 'bg-gray-100' },
                        { icon: TrendingUp, label: 'Subscription Plans', path: '/my-subscriptions', color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (action.label === 'Edit This Property') {
                                    handleEdit();
                                } else {
                                    navigate(action.path);
                                }
                            }}
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

                {/* Recent Enquiries */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <h2 className="text-sm font-black text-gray-900">Recent Enquiries</h2>
                        <button onClick={() => navigate('/my-enquiries')} className="text-xs font-bold text-indigo-600">
                            View All →
                        </button>
                    </div>

                    {recentEnquiries.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <MessageSquare size={28} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-xs font-bold text-gray-400 uppercase">No enquiries yet</p>
                            <p className="text-[11px] text-gray-400 mt-1">When buyers enquire, they'll appear here</p>
                        </div>
                    ) : (
                        recentEnquiries.slice(0, 4).map(enq => {
                            const buyerName = enq.userId?.name || 'Inquirer';
                            const initial = buyerName.charAt(0).toUpperCase();
                            const createdAt = enq.createdAt;
                            const status = enq.status || 'new';

                            const formatEnquiryTime = (dateStr) => {
                                if (!dateStr) return 'Just now';
                                const d = new Date(dateStr);
                                if (isNaN(d.getTime())) return 'Just now';
                                return d.toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                });
                            };

                            return (
                                <div key={enq._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center flex-shrink-0 uppercase">
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{buyerName}</p>
                                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <Clock size={10} /> {formatEnquiryTime(createdAt)}
                                        </p>
                                    </div>
                                    <EnqBadge status={status} />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserPropertyDashboard;
