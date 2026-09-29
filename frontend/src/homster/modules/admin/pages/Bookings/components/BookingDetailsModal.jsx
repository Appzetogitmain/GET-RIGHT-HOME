import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiCalendar, FiClock, FiZap, FiUser, FiPhone, FiMail,
  FiMapPin, FiDollarSign, FiCheckCircle, FiAlertCircle, FiTag,
  FiExternalLink, FiUserCheck, FiShield, FiPackage
} from 'react-icons/fi';

const BookingDetailsModal = ({ isOpen, onClose, booking, onAssignWorker }) => {
  if (!isOpen || !booking) return null;

  const isInstant = booking.bookingType?.toLowerCase() === 'instant';
  const assignedWorker = booking.workerId;
  const assignedVendor = booking.vendorId;
  const provider = assignedWorker || assignedVendor;

  const acceptedTimestamp = booking.acceptedAt || booking.workerAcceptedAt;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Get duration if present in booked items
  const itemDuration = booking.bookedItems?.[0]?.card?.duration || booking.serviceId?.duration;

  // Status badge styling
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'assigned':
      case 'accepted': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'searching': return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
      case 'no_workers':
      case 'no_vendors':
      case 'manual_assignment_required': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gray-900 text-white shadow-sm">
                <FiPackage className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    Booking #{booking.bookingNumber || booking._id?.slice(-8).toUpperCase()}
                  </h2>

                  {/* Instant vs Slot Badge */}
                  {isInstant ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                      <FiZap className="w-3.5 h-3.5" /> Instant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700">
                      <FiCalendar className="w-3.5 h-3.5" /> Slot
                    </span>
                  )}

                  {/* Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(booking.status)}`}>
                    {booking.status?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Booked on {formatDateTime(booking.createdAt)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700">
            {/* Top Grid: Timing & Vendor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. TIMING & SCHEDULE CARD */}
              <div className={`p-4 rounded-xl border ${isInstant ? 'bg-gradient-to-br from-amber-50/70 to-orange-50/40 border-amber-200/70' : 'bg-gradient-to-br from-indigo-50/70 to-blue-50/40 border-indigo-200/70'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${isInstant ? 'text-amber-800' : 'text-indigo-800'}`}>
                    {isInstant ? <FiZap className="w-4 h-4 text-amber-600" /> : <FiCalendar className="w-4 h-4 text-indigo-600" />}
                    Timing & Schedule Details
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${isInstant ? 'bg-amber-200 text-amber-900' : 'bg-indigo-200 text-indigo-900'}`}>
                    {isInstant ? '⚡ Instant Dispatch' : '📅 Scheduled Slot'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Booking Mode:</span>
                    <span className="text-xs font-bold text-gray-900">
                      {isInstant ? 'Instant Service (Immediate / ASAP)' : 'Scheduled Appointment'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Scheduled Date:</span>
                    <span className="text-xs font-bold text-gray-900">
                      {booking.scheduledDate ? formatDate(booking.scheduledDate) : formatDate(booking.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Time / Slot:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isInstant ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900'}`}>
                      {isInstant ? '⚡ ASAP (Immediate Dispatch)' : (booking.scheduledTime || `${booking.timeSlot?.start || ''} - ${booking.timeSlot?.end || ''}` || 'Slot N/A')}
                    </span>
                  </div>

                  {itemDuration && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Estimated Work Duration:</span>
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <FiClock className="w-3.5 h-3.5 text-gray-400" /> {itemDuration}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/50">
                    <span className="text-xs text-gray-500 font-medium">Order Created:</span>
                    <span className="text-xs text-gray-700 font-semibold">{formatDateTime(booking.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* 2. ACCEPTED VENDOR / WORKER CARD */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                      <FiUserCheck className="w-4 h-4 text-teal-600" />
                      Assigned Service Provider
                    </span>

                    {provider ? (
                      acceptedTimestamp ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Accepted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                          {booking.workerResponse === 'ADMIN_ASSIGNED' ? 'Admin Assigned' : 'Assigned (Pending)'}
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        Unassigned
                      </span>
                    )}
                  </div>

                  {provider ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {provider.profilePhoto ? (
                          <img
                            src={provider.profilePhoto}
                            alt={provider.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-teal-500 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-base border-2 border-teal-400">
                            {provider.name?.charAt(0)?.toUpperCase() || 'W'}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{provider.name || 'Unnamed Provider'}</p>
                          <p className="text-xs text-gray-500">
                            {provider.businessName ? `${provider.businessName} • ` : ''}
                            {assignedWorker ? 'Worker Partner' : 'Vendor Partner'}
                          </p>
                          {provider.rating && (
                            <p className="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                              ★ {provider.rating} Rating
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <FiPhone className="w-3.5 h-3.5 text-gray-400" /> Phone:
                          </span>
                          <a
                            href={`tel:${provider.phone}`}
                            className="font-bold text-blue-600 hover:underline"
                          >
                            {provider.phone || 'N/A'}
                          </a>
                        </div>

                        {provider.email && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 flex items-center gap-1.5">
                              <FiMail className="w-3.5 h-3.5 text-gray-400" /> Email:
                            </span>
                            <span className="font-medium text-gray-700">{provider.email}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Acceptance Status:</span>
                          <span className="font-semibold text-gray-800">
                            {acceptedTimestamp ? (
                              <span className="text-emerald-700">Accepted on {formatDateTime(acceptedTimestamp)}</span>
                            ) : (
                              <span className="text-amber-600">Awaiting Provider Action</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-2">
                        <FiAlertCircle className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-800">No Provider Assigned Yet</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {booking.status?.toLowerCase() === 'searching'
                          ? 'Automated search in progress...'
                          : 'Requires manual assignment by admin.'}
                      </p>
                      {onAssignWorker && (
                        <button
                          onClick={() => {
                            onClose();
                            onAssignWorker(booking);
                          }}
                          className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          Assign Worker Now
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {provider && onAssignWorker && (
                  <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => {
                        onClose();
                        onAssignWorker(booking);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline"
                    >
                      Reassign Provider →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. CUSTOMER & SERVICE ADDRESS */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-gray-400" /> Customer Information & Service Address
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-500 font-medium">Customer Name</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{booking.userId?.name || 'Guest User'}</p>

                  <div className="mt-2 space-y-1">
                    <p className="text-gray-600 flex items-center gap-1.5">
                      <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                      <a href={`tel:${booking.userId?.phone || booking.customerPhone}`} className="text-blue-600 hover:underline font-semibold">
                        {booking.userId?.phone || booking.customerPhone || 'N/A'}
                      </a>
                    </p>
                    {booking.userId?.email && (
                      <p className="text-gray-600 flex items-center gap-1.5">
                        <FiMail className="w-3.5 h-3.5 text-gray-400" /> {booking.userId.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-gray-500 font-medium">Service Location Address</p>
                  {booking.address ? (
                    <div className="mt-0.5 space-y-1 text-gray-800">
                      <p className="font-semibold flex items-start gap-1.5">
                        <FiMapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>
                          {booking.address.addressLine1}
                          {booking.address.addressLine2 ? `, ${booking.address.addressLine2}` : ''}
                        </span>
                      </p>
                      {booking.address.landmark && (
                        <p className="text-gray-500 pl-5">Landmark: {booking.address.landmark}</p>
                      )}
                      <p className="text-gray-600 pl-5">
                        {booking.address.city}, {booking.address.state} - {booking.address.pincode}
                      </p>
                      {booking.address.lat && booking.address.lng && (
                        <a
                          href={`https://www.google.com/maps?q=${booking.address.lat},${booking.address.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline pl-5 mt-1 font-semibold"
                        >
                          <FiExternalLink className="w-3 h-3" /> View on Google Maps
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic mt-0.5">Address not provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. BOOKED SERVICE & BILL BREAKDOWN */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1.5">
                <FiDollarSign className="w-4 h-4 text-emerald-600" /> Service & Billing Summary
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{booking.serviceName || 'Home Service'}</p>
                    <p className="text-xs text-gray-500">
                      Category: {booking.serviceCategory || 'General'}
                      {booking.brandName ? ` • Brand: ${booking.brandName}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-gray-600">
                    {booking.items?.length || booking.bookedItems?.length || 1} Item(s)
                  </span>
                </div>

                {/* Items List */}
                {booking.bookedItems && booking.bookedItems.length > 0 && (
                  <div className="space-y-2 py-1">
                    {booking.bookedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-lg">
                        <div>
                          <p className="font-bold text-gray-800">{item.card?.title || item.serviceName || `Item #${idx + 1}`}</p>
                          {item.card?.duration && (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <FiClock className="w-3 h-3" /> {item.card.duration}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{item.card?.price || 0} × {item.quantity || 1}</p>
                          <p className="text-[10px] text-gray-500">₹{(item.card?.price || 0) * (item.quantity || 1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span className="font-medium text-gray-800">₹{booking.basePrice?.toLocaleString() || 0}</span>
                  </div>

                  {booking.visitingCharges > 0 && (
                    <div className="flex justify-between">
                      <span>Visiting Charges:</span>
                      <span className="font-medium text-gray-800">₹{booking.visitingCharges}</span>
                    </div>
                  )}

                  {booking.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-medium">-₹{booking.discount}</span>
                    </div>
                  )}

                  {booking.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax / GST:</span>
                      <span className="font-medium text-gray-800">₹{booking.tax}</span>
                    </div>
                  )}

                  {booking.tipAmount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Customer Tip:</span>
                      <span className="font-medium">+₹{booking.tipAmount}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-bold text-gray-900">
                    <span>Total Amount:</span>
                    <span className="text-emerald-600 text-base">₹{booking.finalAmount?.toLocaleString() || 0}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-gray-500">Payment:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold capitalize text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {booking.paymentMethod?.replace('_', ' ') || 'Cash on Delivery'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${booking.paymentStatus === 'completed' || booking.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {booking.paymentStatus || 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation reason if cancelled */}
            {booking.cancellationReason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <span className="font-bold uppercase tracking-wider block mb-0.5">Cancellation Reason:</span>
                "{booking.cancellationReason}"
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Booking Type: <strong className={isInstant ? 'text-amber-600' : 'text-indigo-600'}>{isInstant ? '⚡ Instant' : '📅 Scheduled Slot'}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BookingDetailsModal;
