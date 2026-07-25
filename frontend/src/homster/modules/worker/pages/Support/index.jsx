import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHeadphones, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import Header from '../../components/layout/Header';
import workerService from '../../../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';
import { workerTheme as themeColors } from '../../../../theme';

const Support = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [supportContact, setSupportContact] = useState({ phone: '', email: '', address: '' });

  useEffect(() => {
    fetchSupportContact();
  }, []);

  const fetchSupportContact = async () => {
    try {
      const res = await workerService.getPublicSettings();
      if (res.success && res.data) {
        setSupportContact(res.data.supportContact || { phone: '', email: '', address: '' });
      }
    } catch (error) {
      console.error('Failed to fetch support contact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <Header title="Support" />

      <div className="pt-24 px-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner">
            <FiHeadphones className="w-10 h-10" />
          </div>

          <h3 className="text-2xl font-bold text-center text-[#1E3A8A] mb-3">Need Help?</h3>
          <p className="text-center text-gray-500 text-[15px] leading-relaxed mb-8 px-2">
            Contact our support team for any assistance, payment queries, or job-related issues.
          </p>

          <div className="space-y-4">
            <a
              href={`tel:${supportContact.phone || ''}`}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#FFF3ED] hover:bg-[#FFE8D6] transition-colors border border-orange-100 group"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-[#E85D04] group-hover:scale-110 transition-transform">
                <FiPhone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-orange-600/80 font-bold mb-1 uppercase tracking-wider">Call Us</p>
                <p className="text-base sm:text-lg font-bold text-[#1E3A8A]">{supportContact.phone || 'Not available'}</p>
              </div>
            </a>

            <a
              href={`mailto:${supportContact.email || ''}`}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#F0F5FF] hover:bg-[#E5EDFF] transition-colors border border-blue-100 group w-full"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                <FiMail className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600/80 font-bold mb-1 uppercase tracking-wider">Email Us</p>
                <p className="text-[15px] sm:text-lg font-bold text-[#1E3A8A] break-words">{supportContact.email || 'Not available'}</p>
              </div>
            </a>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F0FDF4] border border-green-100 group w-full">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-green-600 group-hover:scale-110 transition-transform flex-shrink-0">
                <FiMapPin className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600/80 font-bold mb-1 uppercase tracking-wider">Office Address</p>
                <p className="text-[14px] sm:text-[15px] font-bold text-[#1E3A8A] break-words whitespace-pre-line leading-snug">
                  {supportContact.address || 'Not available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
