import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Header from '../../components/layout/Header';
import workerService from '../../../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';

const Complaints = () => {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  
  // New Complaint Form State
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await workerService.getComplaints();
      if (res.success) {
        setComplaints(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!subject || !description) return;
    
    try {
      setSubmitLoading(true);
      const res = await workerService.createComplaint({ subject, description });
      if (res.success) {
        setComplaints([res.data, ...complaints]);
        setShowForm(false);
        setSubject('');
        setDescription('');
      }
    } catch (error) {
      console.error('Failed to submit complaint:', error.response?.data || error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Resolved': return <FiCheckCircle className="text-green-500" />;
      case 'Closed': return <FiXCircle className="text-gray-500" />;
      default: return <FiClock className="text-orange-500" />;
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <Header title="My Complaints" />
      
      <div className="pt-24 px-4">
        <div className="space-y-4">
          {!showForm ? (
            <button 
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-sm shadow-blue-200"
            >
              <FiPlus className="text-xl" />
              Raise New Complaint
            </button>
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Raise Complaint</h3>
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="E.g. Payment Issue"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="Describe your issue..."
                    className="w-full p-3 h-32 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  ></textarea>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitLoading}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {submitLoading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Complaints List */}
          <div className="space-y-4 mt-6">
            <h3 className="font-bold text-gray-800 px-2">Past Complaints</h3>
            {complaints.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-3xl border border-gray-100">
                <p className="text-gray-500">No complaints raised yet.</p>
              </div>
            ) : (
              complaints.map(complaint => (
                <div key={complaint._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        {complaint.ticketId}
                      </span>
                      <h4 className="font-bold text-gray-800 mt-2">{complaint.subject}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {getStatusIcon(complaint.status)}
                      <span className={
                        complaint.status === 'Resolved' ? 'text-green-600' :
                        complaint.status === 'Closed' ? 'text-gray-600' : 'text-orange-600'
                      }>{complaint.status}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 mb-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {complaint.description}
                  </p>
                  {complaint.adminResponse && (
                    <div className="mt-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-800 mb-1">Admin Response:</p>
                      <p className="text-sm text-gray-700">{complaint.adminResponse}</p>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-3 text-right">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Complaints;
