import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Calendar, User, Phone, ChevronRight,
    BedDouble, Loader2, Filter, CheckCircle, XCircle,
    Clock, MapPin, AlertCircle
} from 'lucide-react';
import { api } from '../../services/apiService';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'text-yellow-700 bg-yellow-50 border-yellow-100' },
    confirmed: { label: 'Confirmed', color: 'text-blue-700 bg-blue-50 border-blue-100' },
    checked_in: { label: 'Active', color: 'text-purple-700 bg-purple-50 border-purple-100' },
    checked_out: { label: 'Completed', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    completed: { label: 'Completed', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50 border-red-100' },
    pending_payment: { label: 'Awaiting Payment', color: 'text-orange-700 bg-orange-50 border-orange-100' },
};

const BookingCard = ({ booking, onAction }) => {
    const navigate = useNavigate();
    const rawStatus = (booking.bookingStatus || booking.status || 'pending').toLowerCase();
    const statusCfg = STATUS_CONFIG[rawStatus] || { label: rawStatus, color: 'text-gray-600 bg-gray-50 border-gray-200' };

    const guestName = booking.userId?.name || 'Guest';
    const guestPhone = booking.userId?.phone || '';
    const propertyName = booking.propertyId?.propertyName || 'Property';
    const checkIn = booking.checkInDate || booking.checkIn;
    const checkOut = booking.checkOutDate || booking.checkOut;
    const amount = booking.totalAmount || booking.amount || 0;

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{propertyName}</h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        #{booking.bookingId || booking._id?.slice(-8).toUpperCase()}
                    </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
                    {statusCfg.label}
                </span>
            </div>

            {/* Guest Info */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{guestName}</p>
                    {guestPhone && <p className="text-xs text-gray-500">{guestPhone}</p>}
                </div>
                {guestPhone && (
                    <a href={`tel:${guestPhone}`} className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <Phone size={14} className="text-emerald-600" />
                    </a>
                )}
            </div>

            {/* Dates & Amount */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Check-in</p>
                    <p className="text-xs font-black text-gray-900 mt-0.5">{formatDate(checkIn)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Check-out</p>
                    <p className="text-xs font-black text-gray-900 mt-0.5">{formatDate(checkOut)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide">Amount</p>
                    <p className="text-xs font-black text-emerald-800 mt-0.5">₹{amount.toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Action Buttons - only for pending */}
            {rawStatus === 'pending' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={() => onAction(booking._id, 'confirm')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 active:scale-95 transition-all"
                    >
                        <CheckCircle size={14} /> Accept
                    </button>
                    <button
                        onClick={() => onAction(booking._id, 'cancel')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 hover:bg-red-100 active:scale-95 transition-all"
                    >
                        <XCircle size={14} /> Decline
                    </button>
                </div>
            )}
        </motion.div>
    );
};

const FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const UserReceivedBookingsPage = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            // Fetch bookings where user is the property owner
            const res = await api.get('/bookings/received', { params: { as: 'owner' } });
            if (res.data.success) {
                setBookings(res.data.bookings || []);
            }
        } catch (error) {
            console.error('Fetch received bookings error:', error);
            // Fallback: try partner endpoint with user auth
            try {
                const res2 = await api.get('/bookings', { params: { role: 'owner' } });
                if (res2.data.success) setBookings(res2.data.bookings || []);
            } catch (e) {
                console.error(e);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (bookingId, action) => {
        try {
            const endpoint = action === 'confirm'
                ? `/bookings/${bookingId}/confirm`
                : `/bookings/${bookingId}/cancel`;
            const res = await api.post(endpoint);
            if (res.data.success) {
                toast.success(action === 'confirm' ? 'Booking accepted!' : 'Booking declined');
                fetchBookings();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const filtered = bookings.filter(b => {
        if (activeFilter === 'All') return true;
        const s = (b.bookingStatus || b.status || '').toLowerCase();
        if (activeFilter === 'Pending') return s === 'pending';
        if (activeFilter === 'Confirmed') return s === 'confirmed' || s === 'checked_in';
        if (activeFilter === 'Completed') return s === 'completed' || s === 'checked_out';
        if (activeFilter === 'Cancelled') return s === 'cancelled';
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-28">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft size={18} className="text-gray-700" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-gray-900">Received Bookings</h1>
                        <p className="text-xs text-gray-400 font-medium">
                            Bookings on your listed properties
                        </p>
                    </div>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                        {bookings.length} total
                    </span>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`flex-shrink-0 text-[11px] font-bold px-3.5 py-1.5 rounded-full border transition-all ${activeFilter === f
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 pt-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Calendar size={28} className="text-gray-300" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">No bookings yet</h3>
                        <p className="text-sm text-gray-400 max-w-[220px]">
                            {activeFilter === 'All'
                                ? 'When someone books your property, it will appear here.'
                                : `No ${activeFilter.toLowerCase()} bookings found.`}
                        </p>
                        {activeFilter === 'All' && (
                            <button
                                onClick={() => navigate('/list-property')}
                                className="mt-4 px-5 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                            >
                                List a Property
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <div>
                        {filtered.map(booking => (
                            <BookingCard
                                key={booking._id}
                                booking={booking}
                                onAction={handleAction}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserReceivedBookingsPage;
