import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiAward, FiClock, FiCheckCircle, FiTrendingUp, FiThumbsUp } from 'react-icons/fi';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const ICONS = {
  FiStar: FiStar,
  FiAward: FiAward,
  FiClock: FiClock,
  FiCheckCircle: FiCheckCircle,
  FiTrendingUp: FiTrendingUp,
  FiThumbsUp: FiThumbsUp
};

const WorkerAchievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    icon: 'FiStar',
    tier: 'Gold',
    jobThreshold: 0
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/admin/platform-settings');
      if (data.success && data.settings) {
        setAchievements(data.settings.workerAchievements || []);
      }
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newAchievements) => {
    try {
      setLoading(true);
      const { data } = await api.put('/admin/platform-settings', {
        workerAchievements: newAchievements
      });
      if (data.success) {
        setAchievements(data.settings.workerAchievements || []);
        toast.success('Achievements updated successfully');
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || formData.jobThreshold < 0) {
      return toast.error('Please fill all valid details');
    }
    
    let updated = [...achievements];
    if (editingIndex !== null) {
      updated[editingIndex] = formData;
    } else {
      updated.push(formData);
    }
    
    // Sort by threshold to keep it organized
    updated.sort((a, b) => a.jobThreshold - b.jobThreshold);
    saveSettings(updated);
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this achievement?')) {
      const updated = achievements.filter((_, i) => i !== index);
      saveSettings(updated);
    }
  };

  const openModal = (index = null) => {
    if (index !== null) {
      setFormData(achievements[index]);
      setEditingIndex(index);
    } else {
      setFormData({
        title: '',
        icon: 'FiStar',
        tier: 'Gold',
        jobThreshold: 0
      });
      setEditingIndex(null);
    }
    setIsModalOpen(true);
  };

  if (loading && achievements.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Worker Achievements</h2>
          <p className="text-gray-500 text-sm mt-1">Configure badges given to workers upon job completions</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <FiPlus /> Add Achievement
        </button>
      </div>

      <div className="p-6">
        {achievements.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
            No achievements configured yet. Click "Add Achievement" to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {achievements.map((achievement, idx) => {
              const Icon = ICONS[achievement.icon] || FiStar;
              return (
                <div key={idx} className="bg-white rounded-xl border p-4 flex flex-col items-center relative group">
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(idx)} className="text-gray-400 hover:text-blue-500">
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(idx)} className="text-gray-400 hover:text-red-500">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="w-16 h-16 bg-[#FEF0D9] text-[#E85D04] rounded-full flex items-center justify-center mb-3 text-2xl shadow-inner">
                    <Icon className={achievement.icon === 'FiStar' || achievement.icon === 'FiCheckCircle' ? 'fill-current' : ''} />
                  </div>
                  <h3 className="text-[#1E3A8A] font-bold text-center text-sm">{achievement.title}</h3>
                  <p className="text-[#E85D04] font-bold text-xs mt-1">{achievement.tier}</p>
                  <div className="mt-3 bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold text-gray-600">
                    Unlocks at: {achievement.jobThreshold} Jobs
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{editingIndex !== null ? 'Edit Achievement' : 'Add Achievement'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. 100 Jobs Done"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tier</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({...formData, tier: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Diamond">Diamond</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  >
                    {Object.keys(ICONS).map(iconName => (
                      <option key={iconName} value={iconName}>{iconName.replace('Fi', '')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Job Threshold</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.jobThreshold}
                  onChange={(e) => setFormData({...formData, jobThreshold: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Number of completed jobs required to unlock</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerAchievements;
