import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSearch, FiCheck, FiUser } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import adminWorkerService from '../../../../../services/adminWorkerService';
import { adminBookingService } from '../../../../../services/adminBookingService';

const AssignWorkerModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchWorkers();
    } else {
      setSearch('');
      setWorkers([]);
    }
  }, [isOpen]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await adminWorkerService.getAllWorkers({ approvalStatus: 'approved' });
      if (res.success) {
        setWorkers(res.data);
      }
    } catch (error) {
      console.error('Error fetching workers', error);
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (workerId) => {
    try {
      setAssigningId(workerId);
      const res = await adminBookingService.assignWorker(booking._id, workerId);
      if (res.success) {
        toast.success(res.message || 'Worker assigned successfully!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to assign worker');
    } finally {
      setAssigningId(null);
    }
  };

  // Filter by search text
  const filteredWorkers = workers.filter(w => {
    const categories = w.serviceCategories?.join(', ') || '';
    return w.name?.toLowerCase().includes(search.toLowerCase()) || 
           categories.toLowerCase().includes(search.toLowerCase());
  });

  // Sort so matching category comes first
  const sortedWorkers = [...filteredWorkers].sort((a, b) => {
    const aMatch = a.serviceCategories?.some(cat => cat.toLowerCase().includes(booking?.serviceCategory?.toLowerCase())) ? -1 : 1;
    const bMatch = b.serviceCategories?.some(cat => cat.toLowerCase().includes(booking?.serviceCategory?.toLowerCase())) ? -1 : 1;
    return aMatch - bMatch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Assign Worker manually</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Booking #{booking?.bookingNumber || booking?._id?.slice(-6).toUpperCase()} • <span className="font-semibold text-blue-600">{booking?.serviceCategory}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search workers by name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : sortedWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">No workers found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedWorkers.map(worker => {
                    const isMatch = worker.serviceCategories?.some(cat => cat.toLowerCase().includes(booking?.serviceCategory?.toLowerCase()));
                    const workerCategories = worker.serviceCategories?.join(', ') || 'No Category';
                    return (
                      <div key={worker._id || worker.id} className={`p-3 rounded-xl border ${isMatch ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100 bg-white'} flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMatch ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            <FiUser className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-gray-900">{worker.name}</h3>
                            <p className="text-[10px] text-gray-500 mt-0.5 max-w-[200px] truncate" title={workerCategories}>
                              {workerCategories}
                            </p>
                            {isMatch && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded uppercase">
                                Category Match
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssign(worker._id || worker.id)}
                          disabled={assigningId === (worker._id || worker.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all
                            ${assigningId === (worker._id || worker.id) 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200'}`}
                        >
                          {assigningId === (worker._id || worker.id) ? (
                            <>
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              Assigning...
                            </>
                          ) : (
                            <>
                              <FiCheck className="w-3 h-3" /> Assign
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AssignWorkerModal;
