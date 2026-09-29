import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiLoader, FiCalendar, FiClock, FiUser, FiMapPin, FiZap, FiPhone, FiCheckCircle, FiEye } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import adminWorkerService from '../../../../services/adminWorkerService';
import BookingDetailsModal from '../Bookings/components/BookingDetailsModal';

const WorkerJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBookingType, setFilterBookingType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [selectedJobForDetail, setSelectedJobForDetail] = useState(null);

  const loadJobs = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        status: filterStatus === 'all' ? undefined : filterStatus,
        bookingType: filterBookingType === 'all' ? undefined : filterBookingType,
        search: searchQuery || undefined
      };
      const response = await adminWorkerService.getAllJobs(params);
      if (response.success) {
        setJobs(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load worker jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(1);
  }, [filterStatus, filterBookingType, searchQuery]);

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-purple-100 text-purple-800',
      assigned: 'bg-teal-100 text-teal-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <CardShell icon={FiClock}>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FiSearch className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by worker name, phone or booking number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Booking Type Filter */}
          <select
            value={filterBookingType}
            onChange={(e) => setFilterBookingType(e.target.value)}
            className="px-3 py-2.5 text-xs font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Types (Instant & Slot)</option>
            <option value="instant">⚡ Instant Bookings Only</option>
            <option value="scheduled">📅 Slot Bookings Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 text-xs font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="w-8 h-8 text-gray-400 animate-spin mr-3" />
              <span className="text-gray-600 text-xs">Loading jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">No jobs found matching your criteria</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {jobs.map((job) => {
                const isInstant = job.bookingType?.toLowerCase() === 'instant';
                const provider = job.workerId || job.vendorId;
                const acceptedTime = job.acceptedAt || job.workerAcceptedAt;

                return (
                  <motion.div
                    key={job._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                    onClick={() => setSelectedJobForDetail(job)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-xl shrink-0 ${isInstant ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {isInstant ? <FiZap className="w-5 h-5" /> : <FiCalendar className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="font-bold text-gray-900 text-xs">
                              #{job.bookingNumber || job._id.slice(-6).toUpperCase()}
                            </span>
                            <h4 className="font-bold text-gray-800 text-sm">
                              {job.serviceName || job.serviceId?.title || 'General Service'}
                            </h4>

                            {/* Instant vs Slot Badge */}
                            {isInstant ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs">
                                ⚡ Instant
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700">
                                📅 Slot
                              </span>
                            )}

                            {/* Status */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(job.status)}`}>
                              {job.status?.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-gray-600 mt-2">
                            {/* Provider */}
                            <div className="flex items-center gap-1.5">
                              <FiUser className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>
                                Provider: <strong className="text-gray-900">{provider?.name || provider?.businessName || 'Unassigned'}</strong>
                                {provider?.phone && (
                                  <a href={`tel:${provider.phone}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 ml-1.5 font-medium hover:underline">
                                    ({provider.phone})
                                  </a>
                                )}
                              </span>
                            </div>

                            {/* Acceptance Status */}
                            {acceptedTime && (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <FiCheckCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Accepted: {new Date(acceptedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}

                            {/* Customer */}
                            <div className="flex items-center gap-1.5">
                              <FiUser className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>Customer: <strong className="text-gray-800">{job.userId?.name || 'Customer'}</strong></span>
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-1.5">
                              <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>
                                Date: {job.scheduledDate
                                  ? new Date(job.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>

                            {/* Timing */}
                            <div className="flex items-center gap-1.5">
                              <FiClock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>
                                Time: <strong className={isInstant ? 'text-amber-700' : 'text-indigo-700'}>
                                  {isInstant ? '⚡ ASAP (Immediate)' : (job.scheduledTime || (job.timeSlot ? `${job.timeSlot.start} - ${job.timeSlot.end}` : 'N/A'))}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0">
                        <div className="text-base font-bold text-gray-900">₹{job.finalAmount?.toLocaleString()}</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJobForDetail(job);
                          }}
                          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <FiEye className="w-3 h-3 text-blue-600" /> Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && (pagination?.pages ?? 0) > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i}
                onClick={() => loadJobs(i + 1)}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${pagination.page === i + 1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </CardShell>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={!!selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        booking={selectedJobForDetail}
      />
    </div>
  );
};

export default WorkerJobs;

