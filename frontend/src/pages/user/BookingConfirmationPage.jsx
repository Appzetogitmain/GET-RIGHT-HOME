import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    CheckCircle, MapPin, Calendar, Users, FileText,
    Phone, Navigation, Share2, Home, Download, Printer, ChevronLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { bookingService } from '../../services/apiService';

const BookingConfirmationPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Initialize with state if available, else null
    const [booking, setBooking] = useState(location.state?.booking || null);
    const [loading, setLoading] = useState(!location.state?.booking);
    const [imgError, setImgError] = useState(false);

    const animate = location.state?.animate;

    useEffect(() => {
        const loadBooking = async () => {
            // If already loaded from state, just stop loading
            if (booking) {
                setLoading(false);
                return;
            }

            // If no Booking in state and no ID in URL, redirect
            if (!id && !booking) {
                navigate('/');
                return;
            }

            // Fetch if ID is present but booking is missing
            try {
                setLoading(true);
                const data = await bookingService.getBookingDetail(id);
                setBooking(data);
            } catch (error) {
                console.error("Failed to load booking:", error);
                toast.error("Could not load booking details");
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        loadBooking();
    }, [id, booking, navigate]);

    useEffect(() => {
        if (booking && animate) {
            const end = Date.now() + 3000;
            const colors = ['#10B981', '#3B82F6', '#F59E0B'];

            (function frame() {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
    }, [booking, animate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading Booking...</p>
                </div>
            </div>
        );
    }

    if (!booking) return null;

    // Derived Data Safe Access
    const property = booking.propertyId || {};
    const room = booking.roomTypeId || {};
    const user = booking.userId || {};

    const handleDirections = () => {
        const propAddress = property.address?.fullAddress ||
            `${property.address?.street || ''}, ${property.address?.city || ''}, ${property.address?.state || ''}` ||
            property.address;

        if (property.location?.coordinates && property.location.coordinates.length === 2) {
            const [lng, lat] = property.location.coordinates;
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
            return;
        }

        if (propAddress) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propAddress)}`, '_blank');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 print:hidden">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-medium">
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Booking Confirmation</h1>
                    <button onClick={handlePrint} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                        <Printer size={20} />
                    </button>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* 1. Success Message */}
                <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Booking Confirmed!</h1>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Your reservation ID is <span className="font-mono font-bold text-gray-800">#{booking.bookingId || booking._id?.slice(-8).toUpperCase()}</span>.
                        We've sent a confirmation email to <span className="font-medium text-gray-800">{user.email}</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left Col: Property & Actions */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Property Card */}
                        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-5">
                                <div className="w-full sm:w-32 h-32 bg-gray-200 rounded-2xl overflow-hidden shrink-0">
                                    <img
                                        src={!imgError ? (property.propertyImages?.[0] || property.images?.[0]?.url || property.images?.[0] || property.coverImage || property.propertyId?.coverImage || "https://via.placeholder.com/150") : "https://via.placeholder.com/150"}
                                        alt={property.propertyName || property.name || "Property"}
                                        className="w-full h-full object-cover"
                                        onError={() => setImgError(true)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{property.propertyType || 'Hotel'}</span>
                                            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2">{property.name || property.propertyName || 'Property Name'}</h2>
                                            <div className="flex items-start gap-1 text-gray-500 text-sm mb-4">
                                                <MapPin size={16} className="mt-0.5 shrink-0" />
                                                <p>{property.address?.fullAddress || property.address?.street || property.address?.city || property.address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 print:hidden">
                                        <button
                                            onClick={handleDirections}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Navigation size={14} /> Directions
                                        </button>
                                        {property.contactNumber ? (
                                            <a
                                                href={`tel:${property.contactNumber}`}
                                                className="flex-1 border border-gray-200 hover:border-black text-gray-700 hover:text-black text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <Phone size={14} /> Contact Property
                                            </a>
                                        ) : (
                                            <button
                                                className="flex-1 border border-gray-200 hover:border-black text-gray-700 hover:text-black text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <Phone size={14} /> Contact Property
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking Details */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                                <FileText size={18} className="text-gray-400" />
                                Reservation Details
                            </h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Check-in</p>
                                    <p className="font-bold text-gray-900 text-lg">
                                        {new Date(booking.checkInDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    {!['pg', 'hostel', 'rent', 'buy', 'plot'].includes(property.propertyType?.toLowerCase()) && (
                                        <p className="text-xs text-gray-500">{property.checkInTime || '12:00 PM'}</p>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Check-out</p>
                                    <p className="font-bold text-gray-900 text-lg">
                                        {new Date(booking.checkOutDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    {!['pg', 'hostel', 'rent', 'buy', 'plot'].includes(property.propertyType?.toLowerCase()) && (
                                        <p className="text-xs text-gray-500">{property.checkOutTime || '11:00 AM'}</p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">
                                        {(property.propertyType?.toLowerCase() === 'pg' || property.propertyType?.toLowerCase() === 'hostel') ? 'Duration' : 'Total Nights'}
                                    </p>
                                    <p className="font-semibold text-gray-900">
                                        {(property.propertyType?.toLowerCase() === 'pg' || property.propertyType?.toLowerCase() === 'hostel') ? '1 Month' : `${booking.totalNights} Night(s)`}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">Room Type</p>
                                    <p className="font-semibold text-gray-900">{room.name || room.type || booking.roomType || 'Standard Room'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">Guests</p>
                                    <p className="font-semibold text-gray-900">
                                        {(property.propertyType?.toLowerCase() === 'pg' || property.propertyType?.toLowerCase() === 'hostel')
                                            ? `${booking.rooms || 1} Bed(s)`
                                            : `${booking.guests?.adults || 1} Adults, ${booking.guests?.children || 0} Children`
                                        }
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">Booking Unit</p>
                                    <p className="font-semibold text-gray-900 capitalize">{booking.bookingUnit}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Col: Price & Payment */}
                    <div className="space-y-6">

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-fit">
                            <h3 className="font-bold text-gray-900 mb-5">Payment Summary</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Base Price</span>
                                    <span>₹{booking.baseAmount?.toLocaleString()}</span>
                                </div>
                                {(booking.extraCharges > 0) && (
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Extra Charges</span>
                                        <span>₹{booking.extraCharges?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Taxes & Fees</span>
                                    <span>₹{booking.taxes?.toLocaleString()}</span>
                                </div>
                                {(booking.discount > 0) && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Discount</span>
                                        <span>-₹{booking.discount?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-100 pt-3 flex justify-between items-center bg-gray-50 -mx-6 px-6 py-4 mt-4">
                                    <span className="font-bold text-gray-900">Total Amount</span>
                                    <span className="text-xl font-black text-gray-900">₹{booking.totalAmount?.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl flex items-center gap-3 ${booking.paymentStatus === 'paid' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {booking.paymentStatus === 'paid' ? <CheckCircle size={20} /> : <FileText size={20} />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-500">Payment Status</p>
                                    <p className={`font-bold ${booking.paymentStatus === 'paid' ? 'text-green-700' : 'text-yellow-700'}`}>
                                        {booking.paymentStatus === 'paid' ? 'Paid Completely' : 'Pay at Hotel'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/bookings')}
                            className="w-full bg-black text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 print:hidden"
                        >
                            My Bookings
                        </button>

                        {/* Cancel Booking Option */}
                        {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const checkIn = new Date(booking.checkInDate);
                            checkIn.setHours(0, 0, 0, 0);
                            const isCancellableTime = today < checkIn;
                            const isActive = ['confirmed', 'pending'].includes(booking.bookingStatus);

                            if (!isActive) return null;

                            return (
                                <>
                                    {isCancellableTime ? (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                                                    try {
                                                        const loadToast = toast.loading('Cancelling...');
                                                        // Fallback ID usage: booking._id or booking.bookingId might be different depending on API
                                                        const idToCancel = booking._id || booking.id;
                                                        await bookingService.cancel(idToCancel);
                                                        toast.dismiss(loadToast);
                                                        toast.success('Booking cancelled successfully');
                                                        navigate('/bookings');
                                                    } catch (error) {
                                                        toast.dismiss();
                                                        toast.error(error.response?.data?.message || 'Failed to cancel booking');
                                                    }
                                                }
                                            }}
                                            className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-2xl shadow-sm hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 mt-4 print:hidden"
                                        >
                                            Cancel Booking
                                        </button>
                                    ) : (
                                        <div className="w-full bg-gray-50 border border-gray-200 text-gray-400 font-bold py-4 rounded-2xl text-center mt-4 text-xs print:hidden">
                                            Cancellation unavailable (Policy: Up to 1 day before Check-in)
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {booking.bookingStatus === 'cancelled' && (
                            <div className="w-full bg-red-50 border border-red-100 text-red-600 font-bold py-4 rounded-2xl text-center mt-4">
                                This booking has been cancelled
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default BookingConfirmationPage;
