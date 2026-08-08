import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCopy, FiUsers, FiShare2 } from 'react-icons/fi';
import workerService from '../../../../services/workerService';
import { toast } from 'react-hot-toast';

const Referrals = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ referralCode: '', totalReferrals: 0, referrals: [] });
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = '#F9FAFB'; // gray-50

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await workerService.getReferrals();
        if (res.success) {
          setData(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch referrals:', error);
        toast.error('Failed to load referrals');
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const handleCopy = () => {
    if (data.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      toast.success('Referral code copied!');
    }
  };

  const handleShare = () => {
    if (navigator.share && data.referralCode) {
      navigator.share({
        title: 'Join as a Worker',
        text: `Use my referral code ${data.referralCode} to join!`,
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 sticky top-0 z-50 shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-800">
          <FiArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-gray-800">My Referrals</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A8A]"></div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Referral Code Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
            <h2 className="text-[11px] font-bold uppercase tracking-wide opacity-80 mb-1">Your Referral Code</h2>
            <div className="flex items-center justify-between bg-white/20 rounded-xl p-3 mt-3 border border-white/30 backdrop-blur-sm">
              <span className="text-lg font-bold tracking-wider">{data.referralCode || 'N/A'}</span>
              <button
                onClick={handleCopy}
                className="p-2 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiCopy className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleShare}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
            >
              <FiShare2 className="w-4 h-4" /> Share with Friends
            </button>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full text-[#1E3A8A]">
              <FiUsers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium">Total Referred Workers</p>
              <p className="text-xl font-bold text-gray-800">{data.totalReferrals}</p>
            </div>
          </div>

          {/* Referrals List */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">Referred Friends</h3>
            {data.referrals.length > 0 ? (
              <div className="space-y-3">
                {data.referrals.map((referral, index) => (
                  <div key={index} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      {referral.profilePhoto ? (
                        <img src={referral.profilePhoto} alt={referral.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                          {referral.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-800 truncate">{referral.name}</h4>
                      <p className="text-[11px] text-gray-500">{new Date(referral.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        referral.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 
                        referral.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {referral.approvalStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 text-center border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiUsers className="w-6 h-6" />
                </div>
                <p className="text-sm text-gray-500 font-medium">You haven't referred anyone yet.</p>
                <p className="text-xs text-gray-400 mt-1">Share your code to invite friends.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
