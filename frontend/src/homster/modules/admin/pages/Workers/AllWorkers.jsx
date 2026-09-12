import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiEye, FiSearch, FiFilter, FiDownload, FiLoader, FiDollarSign, FiPower, FiTrash2, FiClock, FiAlertCircle, FiShield, FiFileText } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import Modal from '../UserCategories/components/Modal';
import adminWorkerService from '../../../../services/adminWorkerService';

const AllWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected', 'pending_skills'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [processingSkill, setProcessingSkill] = useState(null);

  // Load workers from backend
  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const response = await adminWorkerService.getAllWorkers();
      if (response.success) {
        // Transform backend data to frontend format
        const transformedWorkers = response.data.map(worker => ({
          id: worker._id,
          name: worker.name,
          email: worker.email,
          phone: worker.phone,
          serviceCategories: worker.serviceCategories || [],
          pendingServiceCategories: worker.pendingServiceCategories || [],
          rejectedServiceCategories: worker.rejectedServiceCategories || [],
          skillRequests: worker.skillRequests || [],
          verifiedSkillsDetails: worker.verifiedSkillsDetails || [],
          serviceCategory: (worker.serviceCategories && worker.serviceCategories.length > 0) 
            ? worker.serviceCategories.join(', ') 
            : (worker.serviceCategory || worker.service || 'N/A'),
          approvalStatus: worker.approvalStatus,
          aadhar: worker.aadhar?.number,
          pan: worker.panCard?.number,
          documents: {
            aadhar: worker.aadhar?.document,
            aadharBack: worker.aadhar?.backDocument,
            pan: worker.panCard?.document,
            drivingLicense: worker.drivingLicense?.document,
            other: worker.otherDocuments?.[0]
          },
          createdAt: worker.createdAt,
          isActive: worker.isActive,
          subscription: worker.subscription || { isActive: false }
        }));
        setWorkers(transformedWorkers);
      } else {
        toast.error(response.message || 'Failed to load workers');
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      toast.error('Failed to load workers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      const matchesStatus = filterStatus === 'all'
        ? true
        : filterStatus === 'pending_skills'
          ? (worker.pendingServiceCategories && worker.pendingServiceCategories.length > 0)
          : worker.approvalStatus === filterStatus;

      const matchesSearch =
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.phone.includes(searchQuery) ||
        worker.serviceCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (worker.pendingServiceCategories && worker.pendingServiceCategories.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesStatus && matchesSearch;
    });
  }, [workers, filterStatus, searchQuery]);

  const handleApproveSkill = async (workerId, category) => {
    try {
      setProcessingSkill(`approve_${category}`);
      const res = await adminWorkerService.approveWorkerSkill(workerId, category);
      if (res.success) {
        const catNames = Array.isArray(category) ? category.join(', ') : category;
        toast.success(`Skill "${catNames}" verified successfully!`);
        const catsToApprove = Array.isArray(category) ? category : [category];

        setWorkers(prev => prev.map(w => {
          if (w.id === workerId) {
            const updatedPending = (w.pendingServiceCategories || []).filter(c => !catsToApprove.includes(c));
            const updatedApproved = Array.from(new Set([...(w.serviceCategories || []), ...catsToApprove]));
            return {
              ...w,
              serviceCategories: updatedApproved,
              pendingServiceCategories: updatedPending,
              serviceCategory: updatedApproved.join(', ')
            };
          }
          return w;
        }));

        if (selectedWorker && selectedWorker.id === workerId) {
          const updatedPending = (selectedWorker.pendingServiceCategories || []).filter(c => !catsToApprove.includes(c));
          const updatedApproved = Array.from(new Set([...(selectedWorker.serviceCategories || []), ...catsToApprove]));
          setSelectedWorker(prev => ({
            ...prev,
            serviceCategories: updatedApproved,
            pendingServiceCategories: updatedPending,
            serviceCategory: updatedApproved.join(', ')
          }));
        }
      } else {
        toast.error(res.message || 'Failed to approve skill');
      }
    } catch (err) {
      console.error('Approve skill error:', err);
      toast.error(err.response?.data?.message || 'Failed to approve skill');
    } finally {
      setProcessingSkill(null);
    }
  };

  const handleRejectSkill = async (workerId, category) => {
    const reason = window.prompt(`Enter rejection reason for skill "${category}":`, 'Not meeting service criteria');
    if (reason === null) return;

    try {
      setProcessingSkill(`reject_${category}`);
      const res = await adminWorkerService.rejectWorkerSkill(workerId, category, reason);
      if (res.success) {
        toast.success(`Skill "${category}" rejected.`);
        setWorkers(prev => prev.map(w => {
          if (w.id === workerId) {
            const updatedPending = (w.pendingServiceCategories || []).filter(c => c !== category);
            return {
              ...w,
              pendingServiceCategories: updatedPending
            };
          }
          return w;
        }));

        if (selectedWorker && selectedWorker.id === workerId) {
          const updatedPending = (selectedWorker.pendingServiceCategories || []).filter(c => c !== category);
          setSelectedWorker(prev => ({
            ...prev,
            pendingServiceCategories: updatedPending
          }));
        }
      } else {
        toast.error(res.message || 'Failed to reject skill');
      }
    } catch (err) {
      console.error('Reject skill error:', err);
      toast.error(err.response?.data?.message || 'Failed to reject skill');
    } finally {
      setProcessingSkill(null);
    }
  };

  const handleRemoveSkill = async (workerId, category) => {
    if (!window.confirm(`Are you sure you want to revoke the verified skill "${category}" from this worker?`)) {
      return;
    }

    try {
      setProcessingSkill(`remove_${category}`);
      const res = await adminWorkerService.removeWorkerSkill(workerId, category);
      if (res.success) {
        toast.success(`Skill "${category}" removed.`);
        setWorkers(prev => prev.map(w => {
          if (w.id === workerId) {
            const updatedApproved = (w.serviceCategories || []).filter(c => c !== category);
            return {
              ...w,
              serviceCategories: updatedApproved,
              serviceCategory: updatedApproved.join(', ') || 'N/A'
            };
          }
          return w;
        }));

        if (selectedWorker && selectedWorker.id === workerId) {
          const updatedApproved = (selectedWorker.serviceCategories || []).filter(c => c !== category);
          setSelectedWorker(prev => ({
            ...prev,
            serviceCategories: updatedApproved,
            serviceCategory: updatedApproved.join(', ') || 'N/A'
          }));
        }
      } else {
        toast.error(res.message || 'Failed to remove skill');
      }
    } catch (err) {
      console.error('Remove skill error:', err);
      toast.error(err.response?.data?.message || 'Failed to remove skill');
    } finally {
      setProcessingSkill(null);
    }
  };

  const handleApprove = async (workerId) => {
    try {
      const response = await adminWorkerService.approveWorker(workerId);
      if (response.success) {
        setWorkers(prev => prev.map(w =>
          w.id === workerId ? { ...w, approvalStatus: 'approved' } : w
        ));
        toast.success('Worker approved successfully!');
      } else {
        toast.error(response.message || 'Failed to approve worker');
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      toast.error('Failed to approve worker. Please try again.');
    }
  };

  const handleReject = async (workerId) => {
    try {
      const response = await adminWorkerService.rejectWorker(workerId);
      if (response.success) {
        setWorkers(prev => prev.map(w =>
          w.id === workerId ? { ...w, approvalStatus: 'rejected' } : w
        ));
        toast.success('Worker rejected successfully.');
      } else {
        toast.error(response.message || 'Failed to reject worker');
      }
    } catch (error) {
      console.error('Error rejecting worker:', error);
      toast.error('Failed to reject worker. Please try again.');
    }
  };

  const handleToggleStatus = async (workerId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await adminWorkerService.toggleStatus(workerId, newStatus);
      if (response.success) {
        setWorkers(prev => prev.map(w =>
          w.id === workerId ? { ...w, isActive: newStatus } : w
        ));
        toast.success(`Worker ${newStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error(response.message || 'Failed to update worker status');
      }
    } catch (error) {
      console.error('Error toggling worker status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (workerId) => {
    if (!window.confirm('Are you sure you want to delete this worker? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminWorkerService.deleteWorker(workerId);
      if (response.success) {
        setWorkers(prev => prev.filter(w => w.id !== workerId));
        toast.success('Worker deleted successfully');
      } else {
        toast.error(response.message || 'Failed to delete worker');
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker');
    }
  };

  const handleViewDetails = (worker) => {
    setSelectedWorker(worker);
    setIsViewModalOpen(true);
  };

  const handlePayClick = (worker) => {
    setSelectedWorker(worker);
    setPayAmount('');
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!payAmount || isNaN(payAmount) || parseFloat(payAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setPaySubmitting(true);
      const res = await adminWorkerService.payWorker(selectedWorker.id, {
        amount: parseFloat(payAmount),
        notes: payNotes
      });

      if (res.success) {
        toast.success(`Payment of ₹${payAmount} recorded for ${selectedWorker.name}`);
        setIsPayModalOpen(false);
        loadWorkers(); // Refresh data
      } else {
        toast.error(res.message || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Failed to process payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  const pendingCount = workers.filter(w => w.approvalStatus === 'pending').length;
  const approvedCount = workers.filter(w => w.approvalStatus === 'approved').length;
  const rejectedCount = workers.filter(w => w.approvalStatus === 'rejected').length;
  const pendingSkillsCount = workers.filter(w => w.pendingServiceCategories && w.pendingServiceCategories.length > 0).length;

  return (
    <div className="space-y-4">
      <CardShell
        icon={FiFilter}
        title="Worker Management"
        subtitle="Manage and verify platform workers"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1">Pending Workers</div>
            <div className="text-xl font-bold text-yellow-900">{pendingCount}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Approved Workers</div>
            <div className="text-xl font-bold text-green-900">{approvedCount}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Rejected Workers</div>
            <div className="text-xl font-bold text-red-900">{rejectedCount}</div>
          </div>
          <div 
            onClick={() => setFilterStatus('pending_skills')}
            className={`cursor-pointer rounded-xl p-3 border transition-all ${filterStatus === 'pending_skills' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300' : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'}`}
          >
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              Pending Skills
            </div>
            <div className="text-xl font-bold text-amber-900">{pendingSkillsCount}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search workers by name, phone, email, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-xs"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'pending_skills', label: `Pending Skills (${pendingSkillsCount})` }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilterStatus(item.id)}
                className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${filterStatus === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Worker Details</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categories / Skills</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <FiLoader className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading workers...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                      No workers found
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{worker.name}</p>
                          <p className="text-[10px] text-gray-500">{worker.phone}</p>
                          <p className="text-[10px] text-gray-400">{worker.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 max-w-[240px]">
                          {worker.serviceCategories && worker.serviceCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {worker.serviceCategories.map((cat, idx) => (
                                <span key={idx} className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No verified skills</span>
                          )}
                          {worker.pendingServiceCategories && worker.pendingServiceCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {worker.pendingServiceCategories.map((cat, idx) => (
                                <span key={idx} className="text-[9px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <FiClock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  Pending: {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${worker.approvalStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                          worker.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                          }`}>
                          {worker.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => handleViewDetails(worker)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(worker.id, worker.isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${worker.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={worker.isActive ? "Disable Login" : "Enable Login"}
                          >
                            <FiPower className={`w-3.5 h-3.5 ${worker.isActive ? 'fill-current' : ''}`} />
                          </button>



                          {/* Approve/Reject (Only for pending) */}
                          {worker.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(worker.id)}
                                className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <FiCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleReject(worker.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <FiX className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Delete Worker */}
                          <button
                            onClick={() => handleDelete(worker.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Worker"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardShell>

      {/* View Worker Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedWorker(null);
        }}
        title="Worker Details"
        size="lg"
      >
        {selectedWorker && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <div className="text-gray-900">{selectedWorker.name}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <div className="text-gray-900">{selectedWorker.email}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <div className="text-gray-900">{selectedWorker.phone}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Service Category</label>
                <div className="text-gray-900">{selectedWorker.serviceCategory}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Aadhar</label>
                <div className="text-gray-900">{selectedWorker.aadhar}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">PAN</label>
                <div className="text-gray-900">{selectedWorker.pan}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <div>{getStatusBadge(selectedWorker.approvalStatus)}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Active</label>
                <div className={`text-sm font-semibold ${selectedWorker.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedWorker.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Registered</label>
                <div className="text-gray-900">
                  {new Date(selectedWorker.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Skills & Categories Verification Section */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiShield className="w-4 h-4 text-blue-600" />
                  Skills & Service Categories
                </h4>
                {selectedWorker.pendingServiceCategories?.length > 1 && (
                  <button
                    onClick={() => handleApproveSkill(selectedWorker.id, selectedWorker.pendingServiceCategories)}
                    disabled={!!processingSkill}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <FiCheck className="w-3.5 h-3.5" />
                    Approve All Pending ({selectedWorker.pendingServiceCategories.length})
                  </button>
                )}
              </div>

              {/* Pending Skills Awaiting Verification */}
              {selectedWorker.pendingServiceCategories && selectedWorker.pendingServiceCategories.length > 0 ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
                    <FiClock className="w-4 h-4 text-amber-600" />
                    New Skills Awaiting Verification ({selectedWorker.pendingServiceCategories.length})
                  </div>
                  <p className="text-xs text-amber-700">
                    The worker requested these categories in profile edit. They cannot receive job requests for these until verified.
                  </p>
                  <div className="space-y-2 pt-1">
                    {selectedWorker.pendingServiceCategories.map((cat, idx) => {
                      const reqMeta = (selectedWorker.skillRequests || []).find(
                        r => r.category && r.category.trim().toLowerCase() === cat.trim().toLowerCase()
                      );
                      const hasExp = reqMeta?.experienceYears !== undefined && reqMeta?.experienceYears !== null && reqMeta?.experienceYears > 0;

                      return (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              <span className="text-xs font-bold text-gray-900">{cat}</span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                                Pending Review
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveSkill(selectedWorker.id, cat)}
                                disabled={!!processingSkill}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1 shadow-xs"
                              >
                                <FiCheck className="w-3.5 h-3.5" />
                                Verify & Approve
                              </button>
                              <button
                                onClick={() => handleRejectSkill(selectedWorker.id, cat)}
                                disabled={!!processingSkill}
                                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                              >
                                <FiX className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          </div>

                          {/* Skill Metadata: Experience & Document */}
                          <div className="flex items-center gap-4 pt-1 border-t border-amber-100 text-xs text-gray-600 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-700">Experience:</span>
                              <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                {hasExp ? `${reqMeta.experienceYears} Years` : 'Not specified'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-700">Experience Letter:</span>
                              {reqMeta?.experienceLetter ? (
                                <a
                                  href={reqMeta.experienceLetter}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold text-xs transition-colors"
                                >
                                  <FiFileText className="w-3.5 h-3.5 text-blue-600" />
                                  View Certificate Photo ↗
                                </a>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">None uploaded (Optional)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Verified Skills */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Verified Skills (Receiving Job Bookings)
                </label>
                {selectedWorker.serviceCategories && selectedWorker.serviceCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.serviceCategories.map((cat, idx) => {
                      const vMeta = (selectedWorker.verifiedSkillsDetails || []).find(
                        v => v.category && v.category.trim().toLowerCase() === cat.trim().toLowerCase()
                      ) || (selectedWorker.skillRequests || []).find(
                        r => r.category && r.category.trim().toLowerCase() === cat.trim().toLowerCase()
                      );

                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-800 border border-green-200 rounded-lg text-xs font-semibold"
                        >
                          <FiCheck className="w-3.5 h-3.5 text-green-600" />
                          <span>{cat}</span>
                          {vMeta?.experienceYears > 0 && (
                            <span className="text-[10px] bg-green-200/80 text-green-900 px-1.5 py-0.2 rounded font-bold">
                              {vMeta.experienceYears}y exp
                            </span>
                          )}
                          {vMeta?.experienceLetter && (
                            <a
                              href={vMeta.experienceLetter}
                              target="_blank"
                              rel="noreferrer"
                              title="View Verified Certificate Photo"
                              className="text-green-700 hover:text-green-900 ml-0.5"
                            >
                              <FiFileText className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleRemoveSkill(selectedWorker.id, cat)}
                            title="Revoke Skill"
                            className="ml-1 text-gray-400 hover:text-red-600 transition-colors p-0.5 rounded"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No verified skills assigned yet.</p>
                )}
              </div>
            </div>

            {/* Subscription Info */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <h4 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                <FiDollarSign className="w-4 h-4" />
                Subscription Info
              </h4>
              {selectedWorker.subscription?.isActive ? (
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-purple-600 mb-0.5">Active Plan</label>
                    <div className="text-sm font-bold text-gray-900">{selectedWorker.subscription.planName}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-purple-600 mb-0.5">Expiry Date</label>
                    <div className="text-sm font-bold text-red-600">
                      {new Date(selectedWorker.subscription.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-purple-600 mb-0.5">Started On</label>
                    <div className="text-sm text-gray-700">
                      {new Date(selectedWorker.subscription.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-purple-600 mb-0.5">Duration</label>
                    <div className="text-sm text-gray-700">{selectedWorker.subscription.durationDays} Days</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-purple-700 italic">No active subscription found for this worker.</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Documents</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedWorker.documents.aadhar && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Aadhar Front</label>
                    <img
                      src={selectedWorker.documents.aadhar}
                      alt="Aadhar Front"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <a
                      href={selectedWorker.documents.aadhar}
                      download
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
                {selectedWorker.documents.aadharBack && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Aadhar Back</label>
                    <img
                      src={selectedWorker.documents.aadharBack}
                      alt="Aadhar Back"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <a
                      href={selectedWorker.documents.aadharBack}
                      download
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
                {selectedWorker.documents.pan && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">PAN Document</label>
                    <img
                      src={selectedWorker.documents.pan}
                      alt="PAN"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <a
                      href={selectedWorker.documents.pan}
                      download
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
                {selectedWorker.documents.drivingLicense && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Driving License</label>
                    <img
                      src={selectedWorker.documents.drivingLicense}
                      alt="Driving License"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <a
                      href={selectedWorker.documents.drivingLicense}
                      download
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>

            {selectedWorker.approvalStatus === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    await handleApprove(selectedWorker.id);
                    setIsViewModalOpen(false);
                    setSelectedWorker(null);
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FiCheck className="w-5 h-5" />
                  Approve Worker
                </button>
                <button
                  onClick={async () => {
                    await handleReject(selectedWorker.id);
                    setIsViewModalOpen(false);
                    setSelectedWorker(null);
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FiX className="w-5 h-5" />
                  Reject Worker
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Pay Worker Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setSelectedWorker(null);
        }}
        title={`Record Payment for ${selectedWorker?.name}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Add payment reference or notes"
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleRecordPayment}
            disabled={paySubmitting}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {paySubmitting ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AllWorkers;

