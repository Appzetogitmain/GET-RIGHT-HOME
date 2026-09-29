import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiCheckCircle, FiTruck, FiPackage, FiClipboard, FiClock,
  FiZap, FiCalendar, FiUser, FiPhone, FiEye
} from 'react-icons/fi';
import { adminBookingService } from '../../../../services/adminBookingService';
import { toast } from 'react-hot-toast';
import BookingDetailsModal from './components/BookingDetailsModal';

const Tracking = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch bookings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          page: 1,
          limit: 30, // get more for tracking list
          search: debouncedSearch,
        };
        const res = await adminBookingService.getAllBookings(params);
        if (res.success) {
          setBookings(res.data || []);
          if (res.data?.length > 0 && !selectedOrder) {
            setSelectedOrder(res.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [debouncedSearch]);

  const getStatusStep = (status) => {
    // Map status to step index based on project workflow
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
      case 'searching':
      case 'accepted': return 0;
      case 'assigned': return 1;
      case 'journey_started':
      case 'visited': return 2;
      case 'in_progress': return 3;
      case 'work_done': return 4;
      case 'completed': return 5;
      default: return 0;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-600';
      case 'work_done': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500';
      case 'journey_started':
      case 'visited': return 'bg-purple-500';
      case 'assigned': return 'bg-indigo-500';
      case 'confirmed':
      case 'accepted':
      case 'pending': return 'bg-yellow-500';
      case 'cancelled':
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const steps = [
    { title: 'Booking Placed', icon: FiClipboard, key: 'pending' },
    { title: 'Worker Assigned', icon: FiClipboard, key: 'assigned' },
    { title: 'Journey Started', icon: FiTruck, key: 'journey_started' },
    { title: 'Work In Progress', icon: FiPackage, key: 'in_progress' },
    { title: 'Work Done', icon: FiCheckCircle, key: 'work_done' },
    { title: 'Completed', icon: FiCheckCircle, key: 'completed' }
  ];

  const selectedProvider = selectedOrder ? (selectedOrder.workerId || selectedOrder.vendorId) : null;
  const isSelectedInstant = selectedOrder?.bookingType?.toLowerCase() === 'instant';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Booking ID, customer name, or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start h-[calc(100vh-230px)]">
        {/* Left: Orders Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col w-full">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-xs">
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">BOOKING ID</th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">TYPE</th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">CUSTOMER</th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">PROVIDER</th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">STATUS</th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-xs text-gray-500">Loading live tracking...</td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-xs text-gray-500">No orders found</td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const isInstant = booking.bookingType?.toLowerCase() === 'instant';
                    const provider = booking.workerId || booking.vendorId;

                    return (
                      <tr
                        key={booking._id}
                        className={`hover:bg-blue-50/40 transition-colors cursor-pointer text-xs ${selectedOrder?._id === booking._id ? 'bg-blue-50/60 font-medium' : ''}`}
                        onClick={() => setSelectedOrder(booking)}
                      >
                        <td className="p-3">
                          <span className="font-bold text-gray-900 block">
                            #{booking.bookingNumber || booking._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {booking.serviceName || 'Service'}
                          </span>
                        </td>

                        <td className="p-3">
                          {isInstant ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs">
                              <FiZap className="w-2.5 h-2.5" /> Instant
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700">
                              <FiCalendar className="w-2.5 h-2.5" /> Slot
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <div>
                            <p className="font-bold text-gray-800">{booking.userId?.name || 'Customer'}</p>
                            <p className="text-[10px] text-gray-400">{booking.userId?.phone || booking.customerPhone}</p>
                          </div>
                        </td>

                        <td className="p-3">
                          {provider ? (
                            <div>
                              <p className="font-semibold text-gray-800">{provider.name || provider.businessName}</p>
                              {provider.phone && <p className="text-[10px] text-blue-600">{provider.phone}</p>}
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Searching...
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                            {booking.status?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(booking);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors"
                          >
                            Track
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Tracking Details Panel */}
        <AnimatePresence mode='wait'>
          {selectedOrder ? (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">
                      #{selectedOrder.bookingNumber || selectedOrder._id.slice(-6).toUpperCase()}
                    </h2>
                    {isSelectedInstant ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500 text-white">
                        ⚡ Instant
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                        📅 Slot
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.serviceName || 'Home Service'}</p>
                </div>
              </div>

              {/* Timing Box */}
              <div className={`p-3 rounded-lg border mb-4 text-xs ${isSelectedInstant ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1 text-[10px]">
                    {isSelectedInstant ? <FiZap className="w-3 h-3 text-amber-600" /> : <FiCalendar className="w-3 h-3 text-indigo-600" />}
                    {isSelectedInstant ? '⚡ Instant Dispatch' : '📅 Scheduled Slot'}
                  </span>
                  <span className="font-bold">
                    {isSelectedInstant ? 'ASAP' : (selectedOrder.scheduledTime || 'N/A')}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Date: {selectedOrder.scheduledDate ? new Date(selectedOrder.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : new Date(selectedOrder.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Provider Box */}
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 mb-4 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  Assigned Provider
                </span>
                {selectedProvider ? (
                  <div className="space-y-1.5">
                    <p className="font-bold text-gray-900 text-sm">{selectedProvider.name || selectedProvider.businessName}</p>
                    {selectedProvider.phone && (
                      <p className="text-gray-600 flex items-center gap-1.5">
                        <FiPhone className="w-3 h-3 text-gray-400" />
                        <a href={`tel:${selectedProvider.phone}`} className="text-blue-600 font-semibold hover:underline">
                          {selectedProvider.phone}
                        </a>
                      </p>
                    )}
                    {(selectedOrder.acceptedAt || selectedOrder.workerAcceptedAt) && (
                      <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <FiCheckCircle className="w-3 h-3" />
                        Accepted: {new Date(selectedOrder.acceptedAt || selectedOrder.workerAcceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-amber-600 font-medium italic">Searching for available vendor...</p>
                )}
              </div>

              {/* Customer Box */}
              <div className="mb-5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Customer</span>
                <p className="font-bold text-gray-900">{selectedOrder.userId?.name || 'Customer'}</p>
                <p className="text-gray-500">{selectedOrder.userId?.phone || selectedOrder.customerPhone}</p>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative pl-4 border-l-2 border-gray-100 space-y-6 mb-6">
                {steps.map((step, index) => {
                  const currentStepIdx = getStatusStep(selectedOrder.status);
                  const isCompleted = index <= currentStepIdx;

                  return (
                    <div key={index} className="relative pl-5">
                      {/* Dot */}
                      <div className={`absolute -left-[21px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 
                        ${isCompleted ? 'bg-green-50 border-green-500 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-300'}
                      `}>
                        <step.icon className="w-3 h-3" />
                      </div>

                      <div>
                        <h3 className={`text-xs font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.title}
                        </h3>
                        <p className={`text-[10px] ${isCompleted ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                          {isCompleted ? 'Completed' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 mt-auto">
                <button
                  onClick={() => setIsDetailModalOpen(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FiEye className="w-3.5 h-3.5" /> View Full Booking Details
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center h-full text-center text-gray-500">
              <FiSearch className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-xs">Select an order to view tracking details</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        booking={selectedOrder}
      />
    </motion.div>
  );
};

export default Tracking;

