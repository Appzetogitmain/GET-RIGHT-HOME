import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Plus, Trash2, Edit3, Users, CheckCircle,
  Clock, Wallet, Sparkles, Power, X
} from 'lucide-react';
import { axiosInstance } from '../store/adminStore';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  rewardAmount: 200,
  triggerType: 'first_booking',
  eligibleRoles: ['user'],
  maxReferralsPerUser: 100,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  description: '',
  isActive: true
};

const AdminReferEarn = () => {
  const [programs, setPrograms] = useState([]);
  const [stats, setStats] = useState({ totalReferrals: 0, completedReferrals: 0, pendingReferrals: 0, totalPayout: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [programsRes, statsRes] = await Promise.all([
        axiosInstance.get('/referrals/program/all'),
        axiosInstance.get('/referrals/admin/stats')
      ]);
      setPrograms(programsRes.data.programs || []);
      setStats(statsRes.data.stats || {});
      setRecent(statsRes.data.recent || []);
    } catch (err) {
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const activeProgram = programs.find(p => p.isActive);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (program) => {
    setEditingId(program._id);
    setFormData({
      name: program.name || '',
      rewardAmount: program.rewardAmount ?? 200,
      triggerType: program.triggerType || 'first_booking',
      eligibleRoles: program.eligibleRoles?.length ? program.eligibleRoles : ['user'],
      maxReferralsPerUser: program.maxReferralsPerUser ?? 100,
      startDate: program.startDate ? new Date(program.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : '',
      description: program.description || '',
      isActive: program.isActive ?? true
    });
    setShowModal(true);
  };

  const toggleRole = (role) => {
    setFormData(prev => {
      const has = prev.eligibleRoles.includes(role);
      const next = has ? prev.eligibleRoles.filter(r => r !== role) : [...prev.eligibleRoles, role];
      return { ...prev, eligibleRoles: next.length ? next : prev.eligibleRoles };
    });
  };

  const handleActivate = async (program) => {
    try {
      await axiosInstance.put(`/referrals/program/${program._id}`, { isActive: true });
      toast.success(`"${program.name}" is now the active program`);
      fetchAll();
    } catch (err) {
      toast.error('Failed to activate program');
    }
  };

  const handleDeactivate = async (program) => {
    try {
      await axiosInstance.put(`/referrals/program/${program._id}`, { isActive: false });
      toast.success('Program deactivated');
      fetchAll();
    } catch (err) {
      toast.error('Failed to deactivate program');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this referral program? This cannot be undone.')) return;
    try {
      await axiosInstance.delete(`/referrals/program/${id}`);
      toast.success('Program deleted');
      fetchAll();
    } catch (err) {
      toast.error('Failed to delete program');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Program name is required');
    if (!formData.rewardAmount || formData.rewardAmount <= 0) return toast.error('Reward amount must be greater than 0');

    const payload = {
      ...formData,
      endDate: formData.endDate || null
    };

    try {
      if (editingId) {
        await axiosInstance.put(`/referrals/program/${editingId}`, payload);
        toast.success('Referral program updated');
      } else {
        await axiosInstance.post('/referrals/program', payload);
        toast.success('Referral program created');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} program`);
    }
  };

  const statCards = [
    { label: 'Total Referrals', value: stats.totalReferrals || 0, icon: Users, color: 'blue' },
    { label: 'Completed', value: stats.completedReferrals || 0, icon: CheckCircle, color: 'green' },
    { label: 'Pending', value: stats.pendingReferrals || 0, icon: Clock, color: 'orange' },
    { label: 'Total Payout', value: `₹${(stats.totalPayout || 0).toLocaleString('en-IN')}`, icon: Wallet, color: 'purple' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-surface flex items-center gap-2">
            <Gift className="text-accent" />
            Refer &amp; Earn Management
          </h1>
          <p className="text-sm text-gray-500 font-medium">Configure the referral reward program and track referral activity</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={18} />
          New Program
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-black text-surface">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-500 font-bold">Loading referral data...</p>
        </div>
      ) : (
        <>
          {/* Active Program Highlight */}
          <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-6 mb-8">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Currently Live On The App</p>
            {activeProgram ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-surface text-white flex items-center justify-center font-black text-lg shadow-lg shadow-accent/20">
                    ₹{activeProgram.rewardAmount}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-surface">{activeProgram.name}</h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Rewards both sides ₹{activeProgram.rewardAmount} when a referred user completes their {activeProgram.triggerType === 'signup' ? 'signup' : 'first booking'}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(activeProgram)}
                  className="bg-surface text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-surface/90 transition-all flex items-center gap-2 shrink-0"
                >
                  <Edit3 size={14} /> Edit Reward
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm font-bold text-gray-500 mb-3">No active referral program right now — Refer &amp; Earn is off for users.</p>
                <button onClick={openCreate} className="text-accent font-bold text-sm underline">Create and activate a program</button>
              </div>
            )}
          </div>

          {/* All Programs */}
          <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm mb-8">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-black text-surface uppercase tracking-widest">All Programs</h3>
            </div>
            {programs.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400 font-bold">No referral programs created yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Program</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reward</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trigger</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Eligible</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {programs.map(program => (
                    <tr key={program._id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-surface">{program.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium line-clamp-1">{program.description || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-surface">₹{program.rewardAmount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-500 capitalize">{program.triggerType.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-500 capitalize">{(program.eligibleRoles || []).join(', ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase ${program.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          <div className={`w-1 h-1 rounded-full ${program.isActive ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
                          {program.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {program.isActive ? (
                            <button onClick={() => handleDeactivate(program)} title="Deactivate" className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"><Power size={16} /></button>
                          ) : (
                            <button onClick={() => handleActivate(program)} title="Activate" className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"><Power size={16} /></button>
                          )}
                          <button onClick={() => openEdit(program)} className="p-2 text-surface hover:bg-gray-100 rounded-lg transition-all"><Edit3 size={16} /></button>
                          <button onClick={() => handleDelete(program._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Referral Activity */}
          <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-black text-surface uppercase tracking-widest">Recent Referral Activity</h3>
            </div>
            {recent.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400 font-bold">No referrals tracked yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referred User</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referrer Type</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reward</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-surface">{r.referredUser?.name || 'Unknown User'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{r.referredUser?.email || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-500">{r.referrerModel}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-surface">₹{r.rewardAmount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                          r.status === 'completed' ? 'bg-green-50 text-green-600' :
                          r.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                          'bg-red-50 text-red-500'
                        }`}>
                          {r.status}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-black text-surface">{editingId ? 'Edit Referral Program' : 'Create Referral Program'}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Refer &amp; Earn Settings</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Program Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Standard Refer & Earn"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Reward Amount (₹)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.rewardAmount}
                      onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                    />
                    <p className="text-[9px] text-gray-400 mt-1 ml-1">Credited to both the referrer &amp; the referred user's wallet.</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Reward Trigger</label>
                    <select
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.triggerType}
                      onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                    >
                      <option value="first_booking">On First Booking</option>
                      <option value="signup">On Signup</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Eligible Roles</label>
                  <div className="flex gap-2">
                    {['user', 'partner'].map(role => (
                      <button
                        type="button"
                        key={role}
                        onClick={() => toggleRole(role)}
                        className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border-2 transition-all ${
                          formData.eligibleRoles.includes(role)
                            ? 'bg-accent/10 border-accent text-accent'
                            : 'bg-gray-50 border-transparent text-gray-400'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">End Date (optional)</label>
                    <input
                      type="date"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Max Referrals Per User</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                    value={formData.maxReferralsPerUser}
                    onChange={(e) => setFormData({ ...formData, maxReferralsPerUser: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Description (optional)</label>
                  <textarea
                    rows="2"
                    placeholder="Internal note about this program..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`cursor-pointer rounded-2xl flex items-center px-5 py-3 transition-all border-2 ${formData.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                >
                  <div className={`w-2 h-2 rounded-full mr-2 ${formData.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-sm font-bold uppercase tracking-widest">
                    {formData.isActive ? 'Active — this is the live program shown to users' : 'Inactive'}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-surface text-white py-4 rounded-[20px] font-black text-sm uppercase tracking-widest mt-2 shadow-2xl shadow-surface/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  {editingId ? 'Update Program' : 'Create Program'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminReferEarn;
