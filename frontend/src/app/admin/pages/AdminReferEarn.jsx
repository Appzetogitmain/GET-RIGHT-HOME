import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Plus, Trash2, Edit3, Users, CheckCircle,
  Clock, Ticket, Sparkles, Power, X, Save, HardHat,
  Tag, Percent, ShieldCheck, Check, Copy, ExternalLink
} from 'lucide-react';
import { axiosInstance } from '../store/adminStore';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  rewardType: 'flat',
  rewardValue: 200,
  minOrderAmount: 0,
  maxDiscount: 500,
  validityDays: 30,
  triggerType: 'first_home_service_booking',
  eligibleRoles: ['user'],
  maxReferralsPerUser: 100,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  description: '',
  isActive: true
};

// Worker-to-worker referral bonus is a separate program
const WorkerReferralTab = () => {
  const [formData, setFormData] = useState({ workerReferralBonusReferrer: 0, workerReferralBonusReferee: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get('/admin/platform-settings');
        if (data.success && data.settings) {
          setFormData({
            workerReferralBonusReferrer: data.settings.workerReferralBonusReferrer || 0,
            workerReferralBonusReferee: data.settings.workerReferralBonusReferee || 0
          });
        }
      } catch (err) {
        toast.error('Failed to load worker referral settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await axiosInstance.put('/admin/platform-settings', formData);
      if (data.success) toast.success('Worker referral settings updated');
    } catch (err) {
      toast.error('Failed to save worker referral settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-bold">Loading worker referral settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-black text-surface uppercase tracking-widest">Worker Referral Bonus (Home Services)</h3>
        <p className="text-xs text-gray-500 font-medium mt-1">Bonus paid when a worker refers another worker to join the home-services vertical.</p>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-6">
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-orange-800 text-sm font-medium">
          Set both amounts to 0 to disable the worker referral bonus. The Refer &amp; Earn banner is only shown to workers when the referrer bonus is greater than 0.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Referrer Bonus — ₹ (Old Worker)</label>
            <input
              type="number"
              min="0"
              required
              value={formData.workerReferralBonusReferrer}
              onChange={(e) => setFormData({ ...formData, workerReferralBonusReferrer: Number(e.target.value) })}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
            />
            <p className="text-[9px] text-gray-400 mt-1 ml-1">Credited to the worker who shared their referral code.</p>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Referee Bonus — ₹ (New Worker)</label>
            <input
              type="number"
              min="0"
              required
              value={formData.workerReferralBonusReferee}
              onChange={(e) => setFormData({ ...formData, workerReferralBonusReferee: Number(e.target.value) })}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
            />
            <p className="text-[9px] text-gray-400 mt-1 ml-1">Credited to the newly joined worker upon admin approval.</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-surface text-white py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-surface/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Worker Settings'}
        </button>
      </form>
    </div>
  );
};

const AdminReferEarn = () => {
  const [tab, setTab] = useState('user'); // 'user' | 'worker'
  const [programs, setPrograms] = useState([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalVouchersIssued: 0,
    totalVouchersRedeemed: 0
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

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
      rewardType: program.rewardType || 'flat',
      rewardValue: program.rewardValue ?? program.rewardAmount ?? 200,
      minOrderAmount: program.minOrderAmount || 0,
      maxDiscount: program.maxDiscount || 500,
      validityDays: program.validityDays || 30,
      triggerType: program.triggerType || 'first_home_service_booking',
      eligibleRoles: ['user'],
      maxReferralsPerUser: program.maxReferralsPerUser ?? 100,
      startDate: program.startDate ? new Date(program.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : '',
      description: program.description || '',
      isActive: program.isActive ?? true
    });
    setShowModal(true);
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
    if (!formData.rewardValue || Number(formData.rewardValue) <= 0) return toast.error('Reward value must be greater than 0');

    const numRewardVal = Number(formData.rewardValue);
    const payload = {
      ...formData,
      rewardValue: numRewardVal,
      rewardAmount: numRewardVal, // backward compatibility
      minOrderAmount: Number(formData.minOrderAmount) || 0,
      maxDiscount: Number(formData.maxDiscount) || 500,
      validityDays: Number(formData.validityDays) || 30,
      maxReferralsPerUser: Number(formData.maxReferralsPerUser) || 100,
      eligibleRoles: ['user'],
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

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const statCards = [
    { label: 'Total Referrals', value: stats.totalReferrals || 0, icon: Users, color: 'blue' },
    { label: 'Completed (1st Service)', value: stats.completedReferrals || 0, icon: CheckCircle, color: 'green' },
    { label: 'Pending 1st Service', value: stats.pendingReferrals || 0, icon: Clock, color: 'orange' },
    { label: 'Vouchers Redeemed', value: `${stats.totalVouchersRedeemed || 0} / ${stats.totalVouchersIssued || 0}`, icon: Ticket, color: 'purple' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-surface flex items-center gap-2">
            <Ticket className="text-accent" />
            Refer &amp; Earn — Home Services Vouchers
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Configure single-use discount coupons and track complete referral lifecycle (Signup → 1st Home Service → Voucher Issued → Redeemed)
          </p>
        </div>
        {tab === 'user' && (
          <button
            onClick={openCreate}
            className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            New Voucher Program
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-white border border-gray-100 rounded-2xl p-1.5 w-fit shadow-sm">
        <button
          onClick={() => setTab('user')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === 'user' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-gray-400 hover:text-surface'
          }`}
        >
          <Ticket size={14} /> Customer Voucher Program
        </button>
        <button
          onClick={() => setTab('worker')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === 'worker' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-gray-400 hover:text-surface'
          }`}
        >
          <HardHat size={14} /> Worker App
        </button>
      </div>

      {tab === 'worker' ? (
        <WorkerReferralTab />
      ) : (
      <>
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center shrink-0`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-black text-surface mt-0.5">{s.value}</p>
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
          <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-6 mb-8 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Active Reward Program</p>
              {activeProgram && (
                <span className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-black uppercase">
                  Live on User App
                </span>
              )}
            </div>

            {activeProgram ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex flex-col items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
                    <span className="text-xs uppercase font-bold opacity-80">{activeProgram.rewardType === 'percentage' ? 'DISCOUNT' : 'VOUCHER'}</span>
                    <span className="text-base font-black">
                      {activeProgram.rewardType === 'percentage' ? `${activeProgram.rewardValue || activeProgram.rewardAmount}%` : `₹${activeProgram.rewardValue || activeProgram.rewardAmount}`}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-surface">{activeProgram.name}</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">
                      Issues a single-use <strong className="text-surface font-bold">
                        {activeProgram.rewardType === 'percentage' ? `${activeProgram.rewardValue || activeProgram.rewardAmount}% OFF` : `₹${activeProgram.rewardValue || activeProgram.rewardAmount} OFF`}
                      </strong> Home Services discount coupon to the referrer once the referred friend completes their 1st Home Service booking. Valid for {activeProgram.validityDays || 30} days.
                    </p>
                    {activeProgram.minOrderAmount > 0 && (
                      <span className="inline-block mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                        Min Order: ₹{activeProgram.minOrderAmount}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(activeProgram)}
                  className="bg-surface text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-surface/90 transition-all flex items-center gap-2 shrink-0"
                >
                  <Edit3 size={14} /> Edit Configuration
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm font-bold text-gray-500 mb-3">No active referral program right now — Refer &amp; Earn is off for users.</p>
                <button onClick={openCreate} className="text-accent font-bold text-sm underline">Create and activate a program</button>
              </div>
            )}
          </div>

          {/* All Programs Table */}
          <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm mb-8">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-surface uppercase tracking-widest">All Referral Programs</h3>
            </div>
            {programs.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400 font-bold">No referral programs created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Program</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Voucher Reward</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Validity</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trigger Condition</th>
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
                          <span className="inline-flex items-center gap-1 text-sm font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            <Tag size={12} />
                            {program.rewardType === 'percentage' ? `${program.rewardValue || program.rewardAmount}% OFF` : `₹${program.rewardValue || program.rewardAmount} OFF`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-gray-600">{program.validityDays || 30} Days</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-gray-500">1st Home Service Booking</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${program.isActive ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${program.isActive ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
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
                            <button onClick={() => openEdit(program)} title="Edit" className="p-2 text-surface hover:bg-gray-100 rounded-lg transition-all"><Edit3 size={16} /></button>
                            <button onClick={() => handleDelete(program._id)} title="Delete" className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Referral Lifecycle Tracking Table */}
          <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-surface uppercase tracking-widest">Referral Lifecycle &amp; Voucher Tracking</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Real-time status of every referred user, first home service booking, and issued voucher</p>
              </div>
              <span className="text-xs text-gray-400 font-bold">{recent.length} Records</span>
            </div>
            {recent.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400 font-bold">No referrals tracked yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referred User (Friend)</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referrer (Inviter)</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">1st Service Booking</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Voucher Code</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reward</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Voucher Status</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recent.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-surface">{r.referredUser?.name || 'Referred User'}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{r.referredUser?.phone || r.referredUser?.email || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-surface">{r.referrer?.name || 'Referrer'}</p>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{r.referrerModel}</span>
                        </td>
                        <td className="px-6 py-4">
                          {r.triggerBooking ? (
                            <div>
                              <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                {r.triggerBooking.bookingNumber}
                              </span>
                              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                ₹{r.triggerBooking.finalAmount} • {r.triggerBooking.status}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-orange-600 font-bold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                              Pending 1st Service
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {r.voucherCode ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-black text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded tracking-wider">
                                {r.voucherCode}
                              </span>
                              <button
                                onClick={() => handleCopy(r.voucherCode)}
                                className="text-gray-400 hover:text-surface transition-colors"
                                title="Copy Code"
                              >
                                {copiedCode === r.voucherCode ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-surface">
                            {r.rewardType === 'percentage' ? `${r.rewardValue}% OFF` : `₹${r.rewardValue} OFF`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            r.voucherStatus === 'Redeemed' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            r.voucherStatus === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                            r.voucherStatus === 'Expired' ? 'bg-red-50 text-red-600 border border-red-200' :
                            'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              r.voucherStatus === 'Active' ? 'bg-green-600 animate-pulse' :
                              r.voucherStatus === 'Redeemed' ? 'bg-purple-600' :
                              r.voucherStatus === 'Expired' ? 'bg-red-600' : 'bg-orange-500'
                            }`} />
                            {r.voucherStatus || r.status}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
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
                  <h3 className="text-xl font-black text-surface">{editingId ? 'Edit Voucher Program' : 'Create Home Services Voucher Program'}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Single-Use Discount Coupon Config</p>
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
                    placeholder="e.g. Home Services Referral Reward"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Reward Type Selection */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Reward Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, rewardType: 'flat' })}
                      className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        formData.rewardType === 'flat'
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                    >
                      <Tag size={15} /> Flat ₹ Discount (e.g. ₹200, ₹300)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, rewardType: 'percentage' })}
                      className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        formData.rewardType === 'percentage'
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                    >
                      <Percent size={15} /> Percentage % Discount (e.g. 10%, 20%)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
                      {formData.rewardType === 'percentage' ? 'Discount Percentage (%)' : 'Voucher Value (₹)'}
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder={formData.rewardType === 'percentage' ? 'e.g. 20' : 'e.g. 200'}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.rewardValue}
                      onChange={(e) => setFormData({ ...formData, rewardValue: e.target.value })}
                    />
                    <p className="text-[9px] text-gray-400 mt-1 ml-1">
                      {formData.rewardType === 'percentage' ? 'Percentage off on Home Services' : 'Flat ₹ discount coupon on Home Services'}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Voucher Validity (Days)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.validityDays}
                      onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                    />
                    <p className="text-[9px] text-gray-400 mt-1 ml-1">Days before coupon code expires.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Min Order Amount (₹, optional)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Max Discount Cap (₹, optional)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Rules & Eligibility Note */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={16} /> Reward Trigger &amp; Single-Use Policy
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Vouchers are issued only after the referred user completes their <strong>first Home Service booking</strong>. Once applied on a booking, the coupon code is permanently redeemed and cannot be reused or exchanged for cash.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Description (optional)</label>
                  <textarea
                    rows="2"
                    placeholder="Internal notes about this voucher program..."
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
                    {formData.isActive ? 'Active — Live on Customer App' : 'Inactive'}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-surface text-white py-4 rounded-[20px] font-black text-sm uppercase tracking-widest mt-2 shadow-2xl shadow-surface/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  {editingId ? 'Update Voucher Program' : 'Create Voucher Program'}
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

