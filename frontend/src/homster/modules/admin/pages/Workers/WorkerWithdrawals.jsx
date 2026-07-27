import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDollarSign, FiSearch, FiLoader, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import adminWorkerService from '../../../../services/adminWorkerService';
import Modal from '../../components/Modal';

const WorkerWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [activeModal, setActiveModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [utrNumber, setUtrNumber] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = withdrawals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(withdrawals.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await adminWorkerService.getWorkerWithdrawals();
      if (response.success) {
        setWithdrawals(response.data);
      }
    } catch (error) {
      console.error('Error loading worker withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const openApprove = (item) => {
    setSelectedItem(item);
    setUtrNumber('');
    setActiveModal('approve');
  };

  const openReject = (item) => {
    setSelectedItem(item);
    setRejectionReason('');
    setActiveModal('reject');
  };

  const closeModals = () => {
    setActiveModal(null);
    setSelectedItem(null);
    setRejectionReason('');
    setUtrNumber('');
  };

  const handleApprove = async () => {
    if (!utrNumber.trim()) {
      toast.error('Please enter the UTR / Transaction number');
      return;
    }
    try {
      setActionLoading(true);
      const res = await adminWorkerService.approveWorkerWithdrawal(selectedItem._id, utrNumber);
      if (res.success) {
        toast.success('Withdrawal approved and processed successfully');
        loadWithdrawals();
        closeModals();
      } else {
        toast.error(res.message || 'Failed to approve');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to approve withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      setActionLoading(true);
      const res = await adminWorkerService.rejectWorkerWithdrawal(selectedItem._id, rejectionReason);
      if (res.success) {
        toast.success('Withdrawal rejected and amount refunded to wallet');
        loadWithdrawals();
        closeModals();
      } else {
        toast.error(res.message || 'Failed to reject');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reject withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <CardShell icon={FiDollarSign} title="Worker Withdrawal Requests">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FiLoader className="w-8 h-8 text-gray-400 animate-spin" />
            <span className="text-gray-600 ml-3">Loading withdrawals...</span>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No withdrawal requests found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested On</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Details</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                          {request.workerId?.name?.charAt(0) || 'W'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{request.workerId?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{request.workerId?.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(request.createdAt).split(',')[0]}</div>
                      <div className="text-sm text-gray-500">{formatDate(request.createdAt).split(',')[1]}</div>
                    </td>
                    <td className="px-6 py-4">
                      {request.bankDetails ? (
                        <div className="text-sm text-gray-900 max-w-xs flex flex-col gap-1">
                          {request.bankDetails.upiId && (
                            <div><span className="text-gray-500 text-xs">UPI:</span> <span className="font-medium">{request.bankDetails.upiId}</span></div>
                          )}
                          {(request.bankDetails.accountNumber || request.bankDetails.ifscCode) && (
                            <div className="flex flex-col gap-0.5">
                              {request.bankDetails.accountNumber && <div><span className="text-gray-500 text-xs">Acc:</span> <span className="font-medium">{request.bankDetails.accountNumber}</span></div>}
                              {request.bankDetails.ifscCode && <div><span className="text-gray-500 text-xs">IFSC:</span> <span className="font-medium">{request.bankDetails.ifscCode}</span></div>}
                              {request.bankDetails.accountHolderName && <div className="truncate"><span className="text-gray-500 text-xs">Name:</span> <span className="font-medium">{request.bankDetails.accountHolderName}</span></div>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xl font-bold text-blue-600">₹{request.amount?.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${request.status === 'pending' ? 'bg-orange-100 text-orange-700' : request.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {request.status.toUpperCase()}
                      </span>
                      {request.rejectionReason && (
                        <div className="text-[11px] text-red-500 mt-1 max-w-[150px] truncate" title={request.rejectionReason}>
                          Reason: {request.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {request.status === 'pending' ? (
                        <div className="flex items-center justify-center space-x-3">
                          <button
                            onClick={() => openApprove(request)}
                            className="flex items-center justify-center gap-1 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 px-3 py-1.5 rounded-lg transition-colors font-bold"
                            title="Approve"
                          >
                            <FiCheck className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => openReject(request)}
                            className="flex items-center justify-center gap-1 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 px-3 py-1.5 rounded-lg transition-colors font-bold"
                            title="Reject"
                          >
                            <FiX className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, withdrawals.length)}</span> of <span className="font-medium">{withdrawals.length}</span> results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => handlePageChange(number)}
                    className={`px-3 py-1 border rounded-md text-sm font-medium transition-colors ${
                      currentPage === number
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </CardShell>

      {/* Approve Modal */}
      <Modal
        isOpen={activeModal === 'approve'}
        onClose={closeModals}
        title="Approve Withdrawal"
      >
        <div className="p-4">
          <p className="mb-4">Are you sure you want to approve this withdrawal request of <b>₹{selectedItem?.amount?.toLocaleString()}</b> for <b>{selectedItem?.workerId?.name}</b>?</p>
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm mb-4 border border-yellow-200">
            Please ensure you have transferred the amount to their provided bank account or UPI ID before approving this request. This action will mark it as completed.
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UTR / Transaction Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. 312345678901"
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModals} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold shadow-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading ? <FiLoader className="animate-spin" /> : <FiCheck />} Yes, Approved
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={activeModal === 'reject'}
        onClose={closeModals}
        title="Reject Withdrawal"
      >
        <div className="p-4">
          <p className="mb-4">Rejecting this withdrawal request will refund <b>₹{selectedItem?.amount?.toLocaleString()}</b> back to <b>{selectedItem?.workerId?.name}</b>'s wallet.</p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection *</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Invalid bank details provided"
              rows={3}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={closeModals} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
            <button
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading ? <FiLoader className="animate-spin" /> : <FiX />} Reject Request
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default WorkerWithdrawals;
