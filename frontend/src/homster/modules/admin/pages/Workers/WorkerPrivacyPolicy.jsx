import React, { useState, useEffect } from 'react';
import { FiFileText, FiSave } from 'react-icons/fi';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const WorkerPrivacyPolicy = () => {
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/admin/platform-settings');
      if (data.success && data.settings) {
        setPrivacyPolicy(data.settings.privacyPolicy || '');
      }
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await api.put('/admin/platform-settings', {
        privacyPolicy
      });
      if (data.success) {
        toast.success('Privacy Policy updated successfully');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <FiFileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Worker Privacy Policy</h2>
          <p className="text-gray-500 text-sm mt-1">Manage the privacy policy text shown to workers in their app</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Privacy Policy Content</label>
          <textarea
            required
            rows="15"
            value={privacyPolicy}
            onChange={(e) => setPrivacyPolicy(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-y"
            placeholder="Enter privacy policy terms here... (Line breaks will be preserved)"
          ></textarea>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <FiSave className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkerPrivacyPolicy;
