import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
  FiSearch,
  FiAlertCircle,
  FiUser,
  FiCalendar,
  FiRefreshCw,
  FiPower
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import {
  getOfflineRequests,
  approveOfflineRequest,
  rejectOfflineRequest,
  adjustOfflineRequestTime,
  forceWorkerOnline
} from '../../services/workerService';
import api from '../../../../services/api';

const WorkerOfflineRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Modal State for Time Adjustment
  const [adjustModal, setAdjustModal] = useState({
    isOpen: false,
    request: null,
    dateStr: '',
    startSlot: { value: '', display: '' },
    endSlot: { value: '', display: '' },
    isApproving: false
  });

  // Available slots for adjustment dropdown
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    fetchSlots();
  }, []);

  useEffect(() => {
    fetchRequests();

    const handleRealtimeUpdate = () => {
      fetchRequests();
    };

    window.addEventListener('workerOfflineRequestReceived', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('workerOfflineRequestReceived', handleRealtimeUpdate);
    };
  }, [activeTab, search]);

  const fetchSlots = async () => {
    try {
      const res = await api.get('/public/operating-hours');
      if (res.data?.slots) {
        setAvailableSlots(res.data.slots);
      }
    } catch (err) {
      // Fallback slots
      const defaultSlots = [
        { value: '09:00', display: '9:00 AM' },
        { value: '10:00', display: '10:00 AM' },
        { value: '11:00', display: '11:00 AM' },
        { value: '12:00', display: '12:00 PM' },
        { value: '13:00', display: '1:00 PM' },
        { value: '14:00', display: '2:00 PM' },
        { value: '15:00', display: '3:00 PM' },
        { value: '16:00', display: '4:00 PM' },
        { value: '17:00', display: '5:00 PM' },
        { value: '18:00', display: '6:00 PM' },
        { value: '19:00', display: '7:00 PM' },
        { value: '20:00', display: '8:00 PM' },
        { value: '21:00', display: '9:00 PM' }
      ];
      setAvailableSlots(defaultSlots);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getOfflineRequests({
        status: activeTab === 'all' ? undefined : activeTab,
        search
      });

      if (res.success) {
        setRequests(res.data || []);
        if (res.counts?.pending !== undefined) {
          setPendingCount(res.counts.pending);
        }
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
      toast.error('Failed to load offline requests');
    } finally {
      setLoading(false);
    }
  };

  // Direct Approve
  const handleApprove = async (reqId) => {
    try {
      const res = await approveOfflineRequest(reqId);
      if (res.success) {
        toast.success('Offline request approved');
        fetchRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  // Reject
  const handleReject = async (reqId) => {
    const reason = window.prompt('Enter reason for rejecting this offline request:', 'Operational requirements / High booking demand');
    if (reason === null) return; // cancelled prompt

    try {
      const res = await rejectOfflineRequest(reqId, reason);
      if (res.success) {
        toast.success('Offline request rejected');
        fetchRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  // Open Adjust Modal
  const openAdjustModal = (reqItem, isApproving = false) => {
    setAdjustModal({
      isOpen: true,
      request: reqItem,
      dateStr: reqItem.dateStr,
      startSlot: reqItem.startSlot,
      endSlot: reqItem.endSlot,
      isApproving
    });
  };

  // Save Adjustment
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    const { request, dateStr, startSlot, endSlot, isApproving } = adjustModal;

    if (!startSlot?.value || !endSlot?.value) {
      toast.error('Please select both start and end slots');
      return;
    }

    try {
      if (isApproving) {
        const res = await approveOfflineRequest(request._id, {
          adjustedDateStr: dateStr,
          adjustedStartSlot: startSlot,
          adjustedEndSlot: endSlot
        });
        if (res.success) {
          toast.success('Offline request adjusted and approved!');
        }
      } else {
        const res = await adjustOfflineRequestTime(request._id, {
          dateStr,
          startSlot,
          endSlot
        });
        if (res.success) {
          toast.success('Offline time adjusted successfully!');
        }
      }
      setAdjustModal({ isOpen: false, request: null, dateStr: '', startSlot: null, endSlot: null, isApproving: false });
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to adjust time');
    }
  };

  // Force Worker Online
  const handleForceOnline = async (workerId, workerName) => {
    if (!window.confirm(`Are you sure you want to set ${workerName} ONLINE immediately? This overrides any approved offline schedule.`)) {
      return;
    }

    try {
      const res = await forceWorkerOnline(workerId);
      if (res.success) {
        toast.success(`${workerName} is now Online!`);
        fetchRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set worker online');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <FiClock className="w-6 h-6 text-primary-600" />
              Worker Offline Requests & Leave Approval
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and approve worker offline slots. You can modify time durations or force workers back online anytime.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors w-fit"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tab Filters and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'pending', label: 'Pending Approval', count: pendingCount },
              { id: 'approved', label: 'Approved Leave' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'all', label: 'All Requests' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-white text-primary-600' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search worker or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading offline requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No offline requests found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'pending'
                ? 'No pending offline approval requests right now.'
                : 'No requests match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Worker</th>
                  <th className="px-6 py-4">Requested Date</th>
                  <th className="px-6 py-4">Time Slot Range</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {requests.map((item) => {
                  const worker = item.workerId || {};
                  const isPending = item.status === 'pending';
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Worker Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-base border border-primary-100 shrink-0">
                            {worker.name ? worker.name.charAt(0).toUpperCase() : <FiUser />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{worker.name || 'Unknown'}</span>
                              <span className={`w-2 h-2 rounded-full ${worker.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}
                                title={worker.isOnline ? 'Online' : 'Offline'}
                              />
                            </div>
                            <p className="text-xs text-gray-500">{worker.phone || 'No phone'}</p>
                            {worker.serviceCategories && worker.serviceCategories.length > 0 && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                                {worker.serviceCategories.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar className="w-4 h-4 text-gray-400" />
                          {item.dateStr}
                        </div>
                        <p className="text-[11px] text-gray-400 font-normal">
                          Requested: {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </td>

                      {/* Slots */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg border border-amber-200/60 text-xs">
                          <FiClock className="w-3.5 h-3.5 text-amber-600" />
                          {item.startSlot?.display} - {item.endSlot?.display}
                        </div>
                        {item.adminAdjusted && (
                          <div className="mt-1">
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-semibold">
                              Admin Adjusted
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-gray-700 font-medium truncate" title={item.reason}>
                          {item.reason || 'Personal Leave'}
                        </p>
                        {item.rejectionReason && (
                          <p className="text-xs text-red-500 mt-0.5 italic">
                            Rejected: {item.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isRejected
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isPending && <FiAlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                          {isApproved && <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                          {isRejected && <FiXCircle className="w-3.5 h-3.5 text-red-600" />}
                          {item.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              {/* Direct Approve */}
                              <button
                                onClick={() => handleApprove(item._id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                                title="Approve with requested times"
                              >
                                <FiCheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>

                              {/* Adjust Time & Approve */}
                              <button
                                onClick={() => openAdjustModal(item, true)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                title="Adjust hours/slots before approving"
                              >
                                <FiEdit className="w-3.5 h-3.5" />
                                Adjust & Approve
                              </button>

                              {/* Reject */}
                              <button
                                onClick={() => handleReject(item._id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                title="Reject request"
                              >
                                <FiXCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <>
                              {/* Modify Active Approved Time */}
                              <button
                                onClick={() => openAdjustModal(item, false)}
                                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                title="Modify offline slots (extend or shorten)"
                              >
                                <FiEdit className="w-3.5 h-3.5" />
                                Adjust Time
                              </button>

                              {/* Force Worker Online Now */}
                              <button
                                onClick={() => handleForceOnline(worker._id, worker.name)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                title="Override offline status and set Online now"
                              >
                                <FiPower className="w-3.5 h-3.5 text-emerald-600" />
                                Set Online Now
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Time Modal */}
      <AnimatePresence>
        {adjustModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiClock className="w-5 h-5 text-primary-600" />
                  {adjustModal.isApproving ? 'Adjust & Approve Offline Time' : 'Modify Offline Time'}
                </h3>
                <button
                  onClick={() => setAdjustModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAdjustment} className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
                  <p className="font-semibold">
                    Worker: {adjustModal.request?.workerId?.name} ({adjustModal.request?.workerId?.phone})
                  </p>
                  <p className="mt-0.5">
                    Original Request: {adjustModal.request?.dateStr} from {adjustModal.request?.originalSlots?.startSlot?.display || adjustModal.request?.startSlot?.display} to {adjustModal.request?.originalSlots?.endSlot?.display || adjustModal.request?.endSlot?.display}
                  </p>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={adjustModal.dateStr}
                    onChange={(e) => setAdjustModal(prev => ({ ...prev, dateStr: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  />
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Slot */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                      Start Slot
                    </label>
                    <select
                      value={adjustModal.startSlot?.value || ''}
                      onChange={(e) => {
                        const selected = availableSlots.find(s => s.value === e.target.value);
                        setAdjustModal(prev => ({
                          ...prev,
                          startSlot: selected || { value: e.target.value, display: e.target.value }
                        }));
                      }}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    >
                      {availableSlots.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.display}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* End Slot */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                      End Slot
                    </label>
                    <select
                      value={adjustModal.endSlot?.value || ''}
                      onChange={(e) => {
                        const selected = availableSlots.find(s => s.value === e.target.value);
                        setAdjustModal(prev => ({
                          ...prev,
                          endSlot: selected || { value: e.target.value, display: e.target.value }
                        }));
                      }}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    >
                      {availableSlots.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setAdjustModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                  >
                    {adjustModal.isApproving ? 'Confirm & Approve' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkerOfflineRequests;
