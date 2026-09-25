import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiSearch, FiCalendar, FiDownload, FiMoreVertical,
  FiClock, FiBox, FiTruck, FiXCircle, FiShoppingBag, FiBell,
  FiZap, FiEye, FiCheckCircle, FiUserCheck, FiPhone
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminBookingService } from '../../../../services/adminBookingService';
import AssignWorkerModal from './components/AssignWorkerModal';
import BookingDetailsModal from './components/BookingDetailsModal';

const BookingStatsCard = ({ title, count, icon: Icon, colorClass, bgClass }) => (
  <div className={`p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between ${bgClass}`}>
    <div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${colorClass.replace('text-', 'bg-').replace('600', '100')}`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{title}</h3>
      <p className="text-xl font-bold text-gray-800 mt-0.5">{count}</p>
    </div>
    <div className={`w-12 h-12 rounded-full opacity-10 -mr-3 -mb-3 ${colorClass.replace('text-', 'bg-')}`}></div>
  </div>
);

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    // Not a failure — needs admin action, so amber (attention) rather than red (dead).
    case 'no_workers':
    case 'no_vendors':
    case 'manual_assignment_required': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'searching': return 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse';
    case 'in_progress': return 'bg-purple-100 text-purple-700';
    case 'pending': return 'bg-orange-100 text-orange-700';
    case 'assigned':
    case 'accepted':
    case 'confirmed': return 'bg-teal-100 text-teal-700';
    default: return 'bg-yellow-100 text-yellow-700';
  }
};

const getStatusLabel = (status) => {
  const s = status?.toLowerCase();
  if (s === 'no_workers' || s === 'no_vendors' || s === 'manual_assignment_required') return 'MANUAL ASSIGNMENT REQUIRED';
  return status?.replace('_', ' ');
};

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('All Types');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [selectedAssignBooking, setSelectedAssignBooking] = useState(null);
  const [selectedDetailBooking, setSelectedDetailBooking] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    manualAssignmentRequired: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    instant: 0,
    scheduled: 0,
    total: 0
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Bookings
      const params = {
        page,
        limit: 10,
        search: debouncedSearch,
        startDate,
        endDate
      };
      if (statusFilter !== 'All Status') {
        params.status = statusFilter;
      }
      if (bookingTypeFilter !== 'All Types') {
        params.bookingType = bookingTypeFilter;
      }

      const res = await adminBookingService.getAllBookings(params);
      if (res.success) {
        setBookings(res.data || res.bookings || []);

        if (res.pagination) {
          setTotalPages(res.pagination.pages);
        } else if (res.total !== undefined) {
          setTotalPages(Math.ceil(res.total / (res.limit || 10)));
        } else {
          setTotalPages(1);
        }

        // getAllJobs returns booking-specific stats directly
        if (res.stats) {
          setStats({
            pending: res.stats.pending || 0,
            manualAssignmentRequired: res.stats.manualAssignmentRequired || 0,
            inProgress: res.stats.inProgress || 0,
            completed: res.stats.completed || 0,
            cancelled: res.stats.cancelled || 0,
            instant: res.stats.instant || 0,
            scheduled: res.stats.scheduled || 0,
            total: res.stats.total || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, statusFilter, bookingTypeFilter, startDate, endDate]);

  const handleExport = () => {
    const headers = ['Order ID', 'Type', 'Customer', 'Service', 'Slot / Time', 'Assigned Vendor', 'Total', 'Status', 'Date'];
    const rows = bookings.map(b => [
      b.bookingNumber || b._id,
      b.bookingType || 'scheduled',
      b.userId?.name || 'Unknown',
      b.serviceName || b.serviceId?.title || 'Service',
      b.bookingType === 'instant' ? 'Instant (ASAP)' : (b.scheduledTime || 'N/A'),
      b.workerId?.name || b.vendorId?.name || 'Unassigned',
      b.finalAmount,
      b.status,
      new Date(b.createdAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <BookingStatsCard title="⚡ Instant" count={stats.instant} icon={FiZap} bgClass="bg-amber-50" colorClass="text-amber-600" />
        <BookingStatsCard title="📅 Slot" count={stats.scheduled} icon={FiCalendar} bgClass="bg-indigo-50" colorClass="text-indigo-600" />
        <BookingStatsCard title="Awaiting" count={stats.pending} icon={FiClock} bgClass="bg-yellow-50" colorClass="text-yellow-600" />
        <BookingStatsCard title="Manual Assign" count={stats.manualAssignmentRequired} icon={FiBell} bgClass="bg-orange-50" colorClass="text-orange-600" />
        <BookingStatsCard title="In Progress" count={stats.inProgress} icon={FiBox} bgClass="bg-purple-50" colorClass="text-purple-600" />
        <BookingStatsCard title="Completed" count={stats.completed} icon={FiTruck} bgClass="bg-green-50" colorClass="text-green-600" />
        <BookingStatsCard title="Cancelled" count={stats.cancelled} icon={FiXCircle} bgClass="bg-red-50" colorClass="text-red-600" />
        <BookingStatsCard title="Total" count={stats.total} icon={FiShoppingBag} bgClass="bg-gray-50" colorClass="text-gray-600" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-3 justify-between items-center">
        <div className="relative w-full lg:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search bookings, customer, or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Booking Type Filter */}
          <select
            value={bookingTypeFilter}
            onChange={(e) => {
              setBookingTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-green-500 cursor-pointer"
          >
            <option value="All Types">All Types (Instant & Slot)</option>
            <option value="instant">⚡ Instant Orders Only</option>
            <option value="scheduled">📅 Slot Orders Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-green-500 cursor-pointer"
          >
            <option>All Status</option>
            <option value="pending">Pending</option>
            <option value="searching">Searching</option>
            <option value="no_workers">Manual Assignment Required</option>
            <option value="assigned">Assigned</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
            <FiCalendar className="text-gray-400 w-3.5 h-3.5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] text-gray-600 focus:outline-none w-20"
            />
            <span className="text-gray-400 text-[10px]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] text-gray-600 focus:outline-none w-20"
            />
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm shadow-green-200"
          >
            <FiDownload className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-3.5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order & Service</th>
                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Slot / Timing</th>
                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Accepted Vendor / Worker</th>
                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total (₹)</th>
                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3.5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-xs text-gray-500">
                    No bookings found matching the selected filters.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const isInstant = booking.bookingType?.toLowerCase() === 'instant';
                  const provider = booking.workerId || booking.vendorId;
                  const acceptedTime = booking.acceptedAt || booking.workerAcceptedAt;
                  const isAccepted = !!acceptedTime || ['assigned', 'accepted', 'in_progress', 'completed'].includes(booking.status?.toLowerCase());
                  const duration = booking.bookedItems?.[0]?.card?.duration || booking.serviceId?.duration;

                  return (
                    <tr
                      key={booking._id}
                      onClick={() => setSelectedDetailBooking(booking)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. Order & Service */}
                      <td className="px-3.5 py-3">
                        <div>
                          <span className="font-bold text-gray-900 text-xs group-hover:text-blue-600 transition-colors">
                            #{booking.bookingNumber || booking._id.slice(-6).toUpperCase()}
                          </span>
                          <p className="font-medium text-gray-800 text-xs mt-0.5 max-w-[150px] truncate" title={booking.serviceName}>
                            {booking.serviceName || 'General Service'}
                          </p>
                          <span className="text-[10px] text-gray-400">
                            {booking.items?.length || booking.bookedItems?.length || 1} items
                          </span>
                        </div>
                      </td>

                      {/* 2. Type (Instant vs Slot) */}
                      <td className="px-3 py-3">
                        {isInstant ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                            <FiZap className="w-3 h-3" /> Instant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700">
                            <FiCalendar className="w-3 h-3" /> Slot
                          </span>
                        )}
                      </td>

                      {/* 3. Slot / Timing ("kitne time ki hai") */}
                      <td className="px-3 py-3">
                        {isInstant ? (
                          <div>
                            <span className="font-bold text-amber-700 text-xs flex items-center gap-1">
                              <FiZap className="w-3 h-3 text-amber-500 shrink-0" /> ASAP (Immediate)
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              Booked: {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-gray-900 text-xs block">
                              {booking.scheduledDate
                                ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                : new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-[11px] font-semibold text-indigo-700 block">
                              {booking.scheduledTime || (booking.timeSlot ? `${booking.timeSlot.start} - ${booking.timeSlot.end}` : 'Slot N/A')}
                            </span>
                            {duration && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <FiClock className="w-2.5 h-2.5" /> ~{duration}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. Accepted Vendor ("kon sa vendor ne accept ki hai") */}
                      <td className="px-3 py-3">
                        {provider ? (
                          <div className="flex items-center gap-2">
                            {provider.profilePhoto ? (
                              <img
                                src={provider.profilePhoto}
                                alt={provider.name}
                                className="w-7 h-7 rounded-full object-cover border border-teal-400 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {provider.name?.charAt(0)?.toUpperCase() || 'W'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 text-xs leading-tight">
                                {provider.name || provider.businessName || 'Assigned'}
                              </p>
                              {provider.phone && (
                                <a
                                  href={`tel:${provider.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium mt-0.5"
                                >
                                  <FiPhone className="w-2.5 h-2.5" /> {provider.phone}
                                </a>
                              )}
                              {acceptedTime ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 mt-0.5">
                                  <FiCheckCircle className="w-2.5 h-2.5" /> Accepted {new Date(acceptedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : booking.workerResponse === 'ADMIN_ASSIGNED' ? (
                                <span className="inline-block text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 mt-0.5">
                                  Admin Assigned
                                </span>
                              ) : (
                                <span className="inline-block text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5">
                                  Awaiting Provider
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                              {booking.status?.toLowerCase() === 'searching' ? 'Searching...' : 'Unassigned'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAssignBooking(booking);
                              }}
                              className="block mt-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                            >
                              + Assign Provider
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 5. Customer */}
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{booking.userId?.name || 'Guest'}</p>
                          <p className="text-[10px] text-gray-500">{booking.userId?.phone || booking.customerPhone}</p>
                          {booking.address?.city && (
                            <p className="text-[9px] text-gray-400 truncate max-w-[100px]">{booking.address.city}</p>
                          )}
                        </div>
                      </td>

                      {/* 6. Total Amount */}
                      <td className="px-3 py-3">
                        <div>
                          <span className="font-bold text-gray-900 text-xs">₹{booking.finalAmount?.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-400 block capitalize">
                            {booking.paymentMethod?.replace('_', ' ') || 'COD'}
                          </span>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                        {booking.status?.toLowerCase() === 'cancelled' && booking.cancellationReason && (
                          <p
                            className="mt-1 text-[10px] text-red-500 font-medium max-w-[140px] truncate"
                            title={booking.cancellationReason}
                          >
                            "{booking.cancellationReason}"
                          </p>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDetailBooking(booking)}
                            className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                            title="View Full Booking Details"
                          >
                            <FiEye className="w-3 h-3 text-blue-600" /> Details
                          </button>

                          {['SEARCHING', 'NO_WORKERS', 'NO_VENDORS', 'MANUAL_ASSIGNMENT_REQUIRED', 'PENDING'].includes(booking.status?.toUpperCase()) && (
                            <button
                              onClick={() => setSelectedAssignBooking(booking)}
                              className="px-2 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-colors"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && bookings.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Showing {bookings.length} of {stats.total} entries</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-white transition-all"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-white transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Worker Modal */}
      <AssignWorkerModal
        isOpen={!!selectedAssignBooking}
        onClose={() => setSelectedAssignBooking(null)}
        booking={selectedAssignBooking}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={!!selectedDetailBooking}
        onClose={() => setSelectedDetailBooking(null)}
        booking={selectedDetailBooking}
        onAssignWorker={(bookingToAssign) => {
          setSelectedAssignBooking(bookingToAssign);
        }}
      />
    </motion.div>
  );
};

export default Bookings;


