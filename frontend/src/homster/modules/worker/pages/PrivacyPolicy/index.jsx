import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
import Header from '../../components/layout/Header';
import workerService from '../../../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';

const PrivacyPolicy = () => {
  const [loading, setLoading] = useState(true);
  const [privacyPolicy, setPrivacyPolicy] = useState('');

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const res = await workerService.getPublicSettings();
      if (res.success && res.data) {
        setPrivacyPolicy(res.data.privacyPolicy || 'Privacy Policy terms will appear here.');
      }
    } catch (error) {
      console.error('Failed to fetch privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <Header title="Privacy Policy" />
      
      <div className="pt-24 px-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner">
            <FiShield className="w-8 h-8" />
          </div>
          
          <h3 className="text-2xl font-bold text-center text-[#1E3A8A] mb-8">Our Privacy Policy</h3>
          
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
            {privacyPolicy}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
