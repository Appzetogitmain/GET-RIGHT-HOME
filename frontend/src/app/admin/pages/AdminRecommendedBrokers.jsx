import React, { useState, useEffect, useCallback } from 'react';
import { Star, Search, GripVertical, User as UserIcon, Loader2 } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

// Which brokers show in the public "Recommended Brokers" carousel is fully
// admin-curated here (isRecommendedBroker + recommendedBrokerOrder on the
// User doc) — see getRecommendedBrokers in userController.js for the
// public-facing read side.
const AdminRecommendedBrokers = () => {
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [savingId, setSavingId] = useState(null);

    const fetchBrokers = useCallback(async (q) => {
        try {
            setLoading(true);
            const res = await adminService.getRecommendedBrokers({ search: q || undefined, limit: 100 });
            if (res.success) setBrokers(res.brokers || []);
        } catch (error) {
            console.error('Error fetching brokers:', error);
            toast.error('Failed to load brokers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBrokers(search); }, [fetchBrokers, search]);

    // Debounce the search box instead of firing a request per keystroke
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const toggleRecommended = async (broker) => {
        setSavingId(broker._id);
        try {
            const res = await adminService.updateRecommendedBroker(broker._id, {
                isRecommendedBroker: !broker.isRecommendedBroker
            });
            if (res.success) {
                setBrokers(prev => prev.map(b => b._id === broker._id ? { ...b, isRecommendedBroker: res.broker.isRecommendedBroker } : b));
                toast.success(res.broker.isRecommendedBroker ? 'Broker will now show on the home page' : 'Broker removed from the home page');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update broker');
        } finally {
            setSavingId(null);
        }
    };

    const updateOrder = async (broker, value) => {
        const order = Number(value) || 0;
        setBrokers(prev => prev.map(b => b._id === broker._id ? { ...b, recommendedBrokerOrder: order } : b));
        try {
            await adminService.updateRecommendedBroker(broker._id, { recommendedBrokerOrder: order });
        } catch {
            toast.error('Failed to save order');
        }
    };

    const recommendedCount = brokers.filter(b => b.isRecommendedBroker).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Star size={22} className="text-orange-500" />
                        Recommended Brokers
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Choose which brokers appear in the "Recommended Brokers" section on the home page, and in what order.
                        {' '}<span className="font-bold text-gray-700">{recommendedCount} featured</span>
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search brokers by name, email or phone..."
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="animate-spin text-gray-400 mb-2" size={24} />
                        <p className="text-sm text-gray-500">Loading brokers...</p>
                    </div>
                ) : brokers.length === 0 ? (
                    <div className="text-center py-16">
                        <UserIcon size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-bold text-gray-500">No brokers found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {brokers.map((broker) => (
                            <div
                                key={broker._id}
                                className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${broker.isRecommendedBroker ? 'bg-orange-50/40' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                    {broker.profileImage ? (
                                        <img src={broker.profileImage} alt={broker.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-indigo-600 font-black text-xs uppercase">
                                            {broker.name ? broker.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'B'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 text-sm truncate">{broker.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{broker.email || broker.phone}</p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <GripVertical size={14} className="text-gray-300" />
                                    <input
                                        type="number"
                                        value={broker.recommendedBrokerOrder ?? 0}
                                        onChange={(e) => updateOrder(broker, e.target.value)}
                                        disabled={!broker.isRecommendedBroker}
                                        title="Display order — lower shows first"
                                        className="w-16 px-2 py-1.5 text-center bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 disabled:opacity-40 focus:outline-none focus:border-orange-400"
                                    />
                                </div>

                                <button
                                    onClick={() => toggleRecommended(broker)}
                                    disabled={savingId === broker._id}
                                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                                        broker.isRecommendedBroker
                                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {savingId === broker._id ? '...' : broker.isRecommendedBroker ? 'Featured ✓' : 'Feature'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRecommendedBrokers;
