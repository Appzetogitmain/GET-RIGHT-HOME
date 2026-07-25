import React, { useState, useEffect } from 'react';
import { FiSave, FiTarget, FiGift, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getSettings, updateSettings } from '../../services/settingsService';

const MonthlyTarget = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    targetTitle: 'Monthly Target',
    monthlyTarget: 30,
    monthlyTargetBonus: 5000,
    targetStartDate: '',
    targetEndDate: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const response = await getSettings();
      if (response.success && response.settings) {
        setFormData({
          targetTitle: response.settings.targetTitle || 'Monthly Target',
          monthlyTarget: response.settings.monthlyTarget || 30,
          monthlyTargetBonus: response.settings.monthlyTargetBonus || 5000,
          targetStartDate: response.settings.targetStartDate ? response.settings.targetStartDate.split('T')[0] : '',
          targetEndDate: response.settings.targetEndDate ? response.settings.targetEndDate.split('T')[0] : ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load target settings');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'monthlyTarget' || name === 'monthlyTargetBonus') ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        targetTitle: formData.targetTitle,
        monthlyTarget: formData.monthlyTarget,
        monthlyTargetBonus: formData.monthlyTargetBonus,
        targetStartDate: formData.targetStartDate || null,
        targetEndDate: formData.targetEndDate || null
      };
      
      const response = await updateSettings(payload);
      if (response.success) {
        toast.success('Monthly target updated successfully');
      } else {
        toast.error(response.message || 'Failed to update target');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to save target settings');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Worker Monthly Target</h1>
        <p className="text-gray-500 mt-1">Set the dynamic monthly target and bonus for workers</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-orange-50/50">
          <div className="flex items-center gap-3 text-orange-600">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiTarget className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">Target Configuration</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Target Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Title (e.g. Monthly Target, Diwali Bonanza)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="targetTitle"
                  value={formData.targetTitle}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                  placeholder="Monthly Target"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                The name of the target as shown to the workers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Target Count */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Monthly Target (No. of Jobs)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiTarget className="text-gray-400" />
                </div>
                <input
                  type="number"
                  name="monthlyTarget"
                  value={formData.monthlyTarget}
                  onChange={handleChange}
                  min="1"
                  required
                  className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                  placeholder="e.g. 30"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                The number of completed jobs required to achieve the target.
              </p>
            </div>

            {/* Monthly Target Bonus */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bonus Amount (₹)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiGift className="text-gray-400" />
                </div>
                <input
                  type="number"
                  name="monthlyTargetBonus"
                  value={formData.monthlyTargetBonus}
                  onChange={handleChange}
                  min="0"
                  required
                  className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                  placeholder="e.g. 5000"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                The reward amount unlocked upon completion.
              </p>
            </div>

            {/* Target Start Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Start Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="text-gray-400" />
                </div>
                <input
                  type="date"
                  name="targetStartDate"
                  value={formData.targetStartDate}
                  onChange={handleChange}
                  className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Target End Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target End Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="text-gray-400" />
                </div>
                <input
                  type="date"
                  name="targetEndDate"
                  value={formData.targetEndDate}
                  onChange={handleChange}
                  className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl shadow-sm hover:bg-orange-600 focus:ring-4 focus:ring-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSave className="w-4 h-4" />
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonthlyTarget;
