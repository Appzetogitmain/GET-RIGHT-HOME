import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiCheck, FiX, FiMessageSquare } from 'react-icons/fi';
import adminWorkerService from '../../../../services/adminWorkerService';

const WorkerComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await adminWorkerService.getComplaints();
      if (res.success) {
        setComplaints(res.data);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus, response = '') => {
    try {
      setUpdateLoading(true);
      const res = await adminWorkerService.updateComplaintStatus(id, {
        status: newStatus,
        adminResponse: response
      });
      
      if (res.success) {
        setComplaints(complaints.map(c => c._id === id ? res.data : c));
        if (selectedComplaint && selectedComplaint._id === id) {
          setSelectedComplaint(res.data);
        }
      }
    } catch (error) {
      console.error('Error updating complaint:', error);
    } finally {
      setUpdateLoading(false);
      setSelectedComplaint(null);
      setAdminResponse('');
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.workerId?.firstName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return 'bg-red-100 text-red-600';
      case 'In Progress': return 'bg-yellow-100 text-yellow-600';
      case 'Resolved': return 'bg-green-100 text-green-600';
      case 'Closed': return 'bg-gray-100 text-gray-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Complaint Management</h2>
        
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Ticket ID, Subject or Worker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border-none rounded-xl py-2 pl-4 pr-8 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">Ticket ID</th>
              <th className="px-6 py-4">Worker</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  Loading complaints...
                </td>
              </tr>
            ) : filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No complaints found
                </td>
              </tr>
            ) : (
              filteredComplaints.map((complaint) => (
                <tr key={complaint._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{complaint.ticketId}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {complaint.workerId?.firstName} {complaint.workerId?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{complaint.workerId?.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium truncate max-w-xs">{complaint.subject}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{complaint.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setAdminResponse(complaint.adminResponse || '');
                      }}
                      className="text-primary-600 hover:text-primary-900 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View & Respond
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Response Modal */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800">
                  Ticket: {selectedComplaint.ticketId}
                </h3>
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <FiX />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Issue Details</h4>
                  <p className="font-medium text-gray-900 mb-1">{selectedComplaint.subject}</p>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {selectedComplaint.description}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Admin Response</h4>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 resize-none text-sm"
                  ></textarea>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Update Status</h4>
                  <div className="flex gap-2 flex-wrap">
                    {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedComplaint._id, status, adminResponse)}
                        disabled={updateLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedComplaint.status === status 
                            ? getStatusColor(status) + ' ring-2 ring-offset-1'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } ${updateLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkerComplaints;
