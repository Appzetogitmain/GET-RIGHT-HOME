import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHeadphones, FiPhone, FiMail, FiMapPin, FiSend } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Header from '../../components/layout/Header';
import workerService from '../../../../services/workerService';
import api from '../../../../services/api';
import LogoLoader from '../../../../components/common/LogoLoader';
import { workerTheme as themeColors } from '../../../../theme';

const Support = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [supportContact, setSupportContact] = useState({ phone: '', email: '', address: '' });
  const [showContactForm, setShowContactForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

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

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/contact/worker', formData);
      toast.success('Your request has been sent! We\'ll get back to you soon.');
      setShowContactForm(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Failed to submit support request:', error);
      toast.error(error.response?.data?.message || 'Failed to send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
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

          <button
            onClick={() => setShowContactForm(true)}
            className="w-full mt-6 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-2xl p-4 font-semibold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <FiSend className="w-5 h-5" />
            Submit a Request
          </button>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Submit a Request</h2>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  placeholder="Describe your issue in detail..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl p-4 font-semibold shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FiSend className="w-5 h-5" />
                {submitting ? 'Sending...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
