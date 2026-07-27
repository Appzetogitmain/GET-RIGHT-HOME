import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiUsers, FiBriefcase, FiGlobe } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

const PushNotifications = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('users'); // users, partners, all
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !body) {
      toast.error('Please enter title and message');
      return;
    }

    try {
      setSending(true);
      const res = await api.post('/admin/notifications/send', {
        title,
        body,
        targetAudience: audience
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Broadcast notification sent successfully');
        setTitle('');
        setBody('');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const audiences = [
    { id: 'users', label: 'All Users', icon: FiUsers, desc: 'Send to all registered customers' },
    { id: 'workers', label: 'All Workers', icon: FiBriefcase, desc: 'Send to all registered service providers' },
    { id: 'all', label: 'Everyone', icon: FiGlobe, desc: 'Send to both users and workers' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 max-w-4xl"
    >
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <FiSend className="text-blue-600 text-lg" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Broadcast Push Notifications</h1>
          <p className="text-xs text-gray-500">
            Send bulk notifications to user segments
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <form onSubmit={handleSend} className="space-y-6">

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Target Audience</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {audiences.map((aud) => {
                const Icon = aud.icon;
                const isSelected = audience === aud.id;
                return (
                  <div
                    key={aud.id}
                    onClick={() => setAudience(aud.id)}
                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all flex items-start gap-3 ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                  >
                    <div className={`mt-0.5 p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{aud.label}</h4>
                      <p className={`text-xs mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>{aud.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Notification Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Big Summer Sale!"
                  required
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Notification Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
                  placeholder="e.g. Get 50% off on all home services today..."
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full px-4 py-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Broadcasting...</>
                ) : (
                  <><FiSend /> Send Broadcast</>
                )}
              </button>
            </div>

            {/* Live Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Live Preview (Android)</label>
              <div className="bg-gray-100 rounded-[2rem] p-4 w-[300px] h-[600px] border-[8px] border-gray-800 mx-auto relative shadow-xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 bg-black flex justify-center items-center">
                  <div className="w-16 h-4 bg-gray-800 rounded-b-xl"></div>
                </div>

                {/* Status Bar */}
                <div className="mt-4 flex justify-between px-2 text-[10px] text-gray-500 font-medium">
                  <span>12:00</span>
                  <div className="flex gap-1">
                    <span>LTE</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Notification Dropdown */}
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: title || body ? 0 : -50, opacity: title || body ? 1 : 0 }}
                  className="mt-4 bg-white rounded-xl shadow-lg p-3 mx-1"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold">H</div>
                    <span className="text-xs font-semibold text-gray-700"> Get Right Home</span>
                    <span className="text-[10px] text-gray-400 ml-auto">now</span>
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900">{title || 'Notification Title'}</h4>
                  <p className="text-xs text-gray-600 mt-1">{body || 'Your message will appear here. Keep it concise and clear.'}</p>
                </motion.div>

                {/* Wallpaper */}
                <div className="absolute inset-0 z-[-1] opacity-10 bg-blue-600"></div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default PushNotifications;
