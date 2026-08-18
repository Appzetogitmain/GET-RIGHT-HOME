import React, { useEffect } from 'react';
import { X, Zap, Clock } from 'lucide-react';

/**
 * Full browsable list of every service admin has flagged "Show in Instant
 * Booking" — opened from the "View All" link on the Instant Booking section
 * of /home-services. The section's own carousel already shows every instant
 * service too, but once there are more than a handful, scrolling a
 * horizontal carousel to compare options is worse than a plain list; this
 * gives users an actual "browse, then book" step instead of just the
 * one-tap cards.
 */
const InstantServicesModal = ({ isOpen, onClose, services, onBook, bookingIds = [], title }) => {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div
                className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-4 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                            {title || 'All Instant Services'} <Zap size={18} className="text-amber-500 fill-amber-400" />
                        </h2>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">Verified technicians, doorstep in 30–45 minutes</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto px-4 py-3 space-y-2.5">
                    {services.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-10">No instant services available right now.</p>
                    ) : (
                        services.map((service) => {
                            const serviceId = service.id || service._id;
                            const isBooking = bookingIds.includes(serviceId);
                            const price = service.discountPrice || service.basePrice;
                            const subtitle = service.subheading || service.categoryId?.title || service.subCategoryId?.title || '';
                            return (
                                <div
                                    key={serviceId}
                                    className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shrink-0 flex items-center justify-center text-white overflow-hidden">
                                        {(service.imageUrl || service.icon) ? (
                                            <img src={service.imageUrl || service.icon} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Zap size={18} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-extrabold text-gray-900 truncate">{service.title}</h4>
                                        {subtitle && <p className="text-[11px] text-gray-400 font-medium truncate">{subtitle}</p>}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-black text-gray-900">₹{price}</span>
                                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                <Clock size={9} /> {service.instantEtaMinutes || 30} min
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onBook(service)}
                                        disabled={isBooking}
                                        className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-black uppercase px-4 py-2 rounded-xl shadow-sm disabled:opacity-60 transition-all"
                                    >
                                        {isBooking ? 'Adding...' : 'Book'}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstantServicesModal;
