import React, { useState, useEffect } from 'react';
import { FiUsers, FiSave, FiGift } from 'react-icons/fi';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const WorkerReferralSettings = () => {
  const [formData, setFormData] = useState({
    workerReferralBonusReferrer: 0,
    workerReferralBonusReferee: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/admin/platform-settings');
      if (data.success && data.settings) {
        setFormData({
          workerReferralBonusReferrer: data.settings.workerReferralBonusReferrer || 0,
          workerReferralBonusReferee: data.settings.workerReferralBonusReferee || 0
        });
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
      const { data } = await api.put('/admin/platform-settings', formData);
      if (data.success) {
        toast.success('Referral settings updated successfully');
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
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <FiUsers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Worker Referral Settings</h2>
            <p className="text-gray-500 text-sm mt-1">Configure the bonus amounts for worker referrals</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3 text-orange-800">
          <FiGift className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">Set the referral amounts to 0 to disable the referral bonus system. The Refer & Earn banner will only be visible to workers if the referrer bonus is greater than 0.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Referrer Bonus (Old Worker)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 font-medium">₹</span>
              </div>
              <input
                type="number"
                min="0"
                required
                value={formData.workerReferralBonusReferrer}
                onChange={(e) => setFormData({...formData, workerReferralBonusReferrer: Number(e.target.value)})}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-semibold"
                placeholder="500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Amount credited to the worker who shared their referral code.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Referee Bonus (New Worker)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 font-medium">₹</span>
              </div>
              <input
                type="number"
                min="0"
                required
                value={formData.workerReferralBonusReferee}
                onChange={(e) => setFormData({...formData, workerReferralBonusReferee: Number(e.target.value)})}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-semibold"
                placeholder="200"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Amount credited to the newly joined worker upon admin approval.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#1e3a8a] text-white rounded-xl font-bold hover:bg-[#1e3a8a]/90 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiSave className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkerReferralSettings;
