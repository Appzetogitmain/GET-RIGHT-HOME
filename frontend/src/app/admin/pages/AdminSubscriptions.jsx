import React, { useState, useEffect } from 'react';
import { 
    Plus, Edit2, Trash2, X, Save, AlertCircle, CheckCircle, Package, Zap, 
    MapPin, Layers, Settings, Eye, EyeOff, ShieldAlert, Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import subscriptionService from '../../../services/subscriptionService';

const PlanModal = ({ plan, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        maxProperties: 1,
        price: 0,
        durationDays: 30,
        description: '',
        isActive: true,
        tier: 'silver',
        leadCap: 0,
        bannerType: 'none',
        rankingWeight: 1,
        pauseDaysAllowed: 0,
        targetRole: 'owner'
    });
    const [tiersList, setTiersList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadTiers = async () => {
            try {
                const res = await subscriptionService.getAdminTiers();
                if (res.success) {
                    setTiersList(res.tiers);
                    if (res.tiers.length > 0 && !plan) {
                        setFormData(prev => ({ ...prev, tier: res.tiers[0].key }));
                    }
                }
            } catch (err) {
                console.error('Failed to load tiers in modal:', err);
            }
        };
        loadTiers();
    }, [plan]);

    useEffect(() => {
        if (plan) {
            setFormData({
                name: plan.name || '',
                maxProperties: plan.maxProperties || 1,
                price: plan.price || 0,
                durationDays: plan.durationDays || 30,
                description: plan.description || '',
                isActive: plan.isActive !== undefined ? plan.isActive : true,
                tier: plan.tier || 'silver',
                leadCap: plan.leadCap || 0,
                bannerType: plan.bannerType || 'none',
                rankingWeight: plan.rankingWeight || 1,
                pauseDaysAllowed: plan.pauseDaysAllowed || 0,
                targetRole: plan.targetRole || 'owner'
            });
        }
    }, [plan]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (plan) {
                await subscriptionService.updatePlan(plan._id, formData);
                toast.success('Plan updated successfully');
            } else {
                await subscriptionService.createPlan(formData);
                toast.success('Plan created successfully');
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">
                        {plan ? 'Edit Subscription Plan' : 'Add New Plan'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="block text-sm font-bold text-gray-800">Plan Name</label>
                            <span className="text-[10px] text-gray-400 font-bold block mb-1">A unique customer-facing name for this plan.</span>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                placeholder="e.g. Starter Pack"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Properties Allowed</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Max properties user can list.</span>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.maxProperties}
                                    onChange={(e) => setFormData({ ...formData, maxProperties: e.target.value === '' ? '' : Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Validity (Days)</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Days the plan remains active.</span>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.durationDays}
                                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value === '' ? '' : Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800">Price (₹)</label>
                            <span className="text-[10px] text-gray-400 font-bold block mb-1">Cost of the subscription plan in INR.</span>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500 font-bold">₹</span>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Tier Type</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Visual styling/category tier.</span>
                                <select
                                    value={formData.tier}
                                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                >
                                    {tiersList.map(t => (
                                        <option key={t._id} value={t.key}>{t.name}</option>
                                    ))}
                                    {tiersList.length === 0 && (
                                        <option value="silver">Silver</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Target Role</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Who can see and buy this plan.</span>
                                <select
                                    value={formData.targetRole}
                                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold capitalize"
                                >
                                    <option value="owner">Owner</option>
                                    <option value="broker">Broker</option>
                                    <option value="builder">Builder</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Banner Type</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Where listing banners will rotate.</span>
                                <select
                                    value={formData.bannerType}
                                    onChange={(e) => setFormData({ ...formData, bannerType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                >
                                    <option value="none">None</option>
                                    <option value="locality">Locality</option>
                                    <option value="city">City</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Lead Cap (0=Inf)</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Max contact leads allowed.</span>
                                <input
                                    type="number"
                                    value={formData.leadCap}
                                    onChange={(e) => setFormData({ ...formData, leadCap: e.target.value === '' ? '' : Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Ranking Weight</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Search ranking booster priority (1-5).</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={formData.rankingWeight}
                                    onChange={(e) => setFormData({ ...formData, rankingWeight: e.target.value === '' ? '' : Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-800">Pause Days</label>
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">Max days user can pause their plan (e.g. while away). 0 means no pausing allowed.</span>
                                <input
                                    type="number"
                                    value={formData.pauseDaysAllowed}
                                    onChange={(e) => setFormData({ ...formData, pauseDaysAllowed: e.target.value === '' ? '' : Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="flex items-center gap-2 cursor-pointer pb-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasVerifiedTag}
                                        onChange={(e) => setFormData({ ...formData, hasVerifiedTag: e.target.checked })}
                                        className="w-4 h-4 text-black rounded focus:ring-black"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 block">Verified Tag</span>
                                        <span className="text-[9px] text-gray-400 font-bold block">Shows verification badge on listings.</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800">Description</label>
                            <span className="text-[10px] text-gray-400 font-bold block mb-1">Short plan summary shown to users on checkout.</span>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none min-h-[60px]"
                                placeholder="Details..."
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-black rounded focus:ring-black cursor-pointer"
                            />
                            <div>
                                <label htmlFor="isActive" className="text-sm font-bold text-gray-800 block cursor-pointer">
                                    Active Status (Visible to Users)
                                </label>
                                <span className="text-[9px] text-gray-400 font-bold block">Uncheck to hide this plan from the storefront workspace.</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 p-6 border-t bg-gray-50 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-bold"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Plan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TierModal = ({ tier, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tier) {
            setName(tier.name || '');
        }
    }, [tier]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            if (tier) {
                await subscriptionService.updateTier(tier._id, { name });
                toast.success('Tier updated successfully');
            } else {
                await subscriptionService.createTier({ name });
                toast.success('Tier created successfully');
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save tier');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">
                        {tier ? 'Edit Tier Type' : 'Add New Tier Type'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-800">Tier Name</label>
                            <span className="text-[10px] text-gray-400 font-bold block mb-1">A unique category identifier name (e.g. Diamond, Gold, Silver).</span>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                placeholder="e.g. Diamond"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 p-6 border-t bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-bold"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Tier
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminSubscriptions = () => {
    const [activeTab, setActiveTab] = useState('owner_plans'); // 'owner_plans', 'broker_plans', 'builder_plans', or 'tiers'
    const [plans, setPlans] = useState([]);
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for Plans
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    // Modal state for Tiers
    const [showTierModal, setShowTierModal] = useState(false);
    const [editingTier, setEditingTier] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'tiers') {
                const data = await subscriptionService.getAdminTiers();
                if (data.success) setTiers(data.tiers);
            } else {
                const data = await subscriptionService.getAllPlans();
                if (data.success) {
                    const roleMap = {
                        'owner_plans': 'owner',
                        'broker_plans': 'broker',
                        'builder_plans': 'builder'
                    };
                    const role = roleMap[activeTab];
                    setPlans(data.plans.filter(p => p.targetRole === role));
                }
            }
        } catch (error) {
            toast.error('Failed to load subscription workspace');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlan = () => {
        setEditingPlan(null);
        setShowPlanModal(true);
    };

    const handleEditPlan = (plan) => {
        setEditingPlan(plan);
        setShowPlanModal(true);
    };

    const handleToggleStatus = async (plan) => {
        const newStatus = !plan.isActive;
        try {
            await subscriptionService.updatePlan(plan._id, { isActive: newStatus });
            toast.success(`Plan ${newStatus ? 'activated' : 'deactivated'}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to update plan status');
        }
    };

    const handleDeletePlan = async (id) => {
        // We prompt with two options: soft deactivate or hard delete
        const optionsModal = confirm(
            "PLAN REMOVAL WORKFLOW:\n\nClick OK to permanently delete this plan from the database.\nClick Cancel to just soft-deactivate this plan (hidden from users but keeps history)."
        );
        
        try {
            if (optionsModal) {
                await subscriptionService.deletePlan(id, true); // hard delete
                toast.success('Plan deleted permanently');
            } else {
                await subscriptionService.deletePlan(id, false); // soft delete
                toast.success('Plan soft-deactivated successfully');
            }
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove plan');
        }
    };

    const handleCreateTier = () => {
        setEditingTier(null);
        setShowTierModal(true);
    };

    const handleEditTier = (tier) => {
        setEditingTier(tier);
        setShowTierModal(true);
    };

    const handleDeleteTier = async (id) => {
        if (!confirm('Are you sure you want to permanently delete this Tier Type?')) return;
        try {
            await subscriptionService.deleteTier(id);
            toast.success('Tier type deleted');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete tier type. Is it currently assigned to active plans?');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Award className="text-emerald-600" size={32} /> Subscription Panel
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Configure subscription packages, tier tags, limits, and pricing strategy.</p>
                </div>
                {activeTab !== 'tiers' ? (
                    <button
                        onClick={handleCreatePlan}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 shrink-0"
                    >
                        <Plus size={20} />
                        Add New Plan
                    </button>
                ) : (
                    <button
                        onClick={handleCreateTier}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 shrink-0"
                    >
                        <Plus size={20} />
                        Add New Tier Type
                    </button>
                )}
            </div>

            <div className="flex border-b border-gray-200 mb-6 gap-6 overflow-x-auto custom-scrollbar whitespace-nowrap">
                <button
                    onClick={() => setActiveTab('owner_plans')}
                    className={`pb-3 font-bold text-sm uppercase flex items-center gap-2 transition-all relative ${
                        activeTab === 'owner_plans' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Package size={16} />
                    Owner Plans
                </button>
                <button
                    onClick={() => setActiveTab('broker_plans')}
                    className={`pb-3 font-bold text-sm uppercase flex items-center gap-2 transition-all relative ${
                        activeTab === 'broker_plans' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Package size={16} />
                    Broker Plans
                </button>
                <button
                    onClick={() => setActiveTab('builder_plans')}
                    className={`pb-3 font-bold text-sm uppercase flex items-center gap-2 transition-all relative ${
                        activeTab === 'builder_plans' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Package size={16} />
                    Builder Plans
                </button>
                <button
                    onClick={() => setActiveTab('tiers')}
                    className={`pb-3 font-bold text-sm uppercase flex items-center gap-2 transition-all relative ${
                        activeTab === 'tiers' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Layers size={16} />
                    Tier Types Manager
                </button>
            </div>

            {/* Workspace Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    </div>
                ) : activeTab !== 'tiers' ? (
                    plans.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-lg font-medium">No plans found</p>
                            <p className="text-sm">Create a subscription plan to populate your catalog.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] table-auto">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Plan & Tier</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Price</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Limits & Features</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Validity</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {plans.map((plan) => (
                                        <tr key={plan._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-gray-900">{plan.name}</div>
                                                <div className="flex gap-1 mt-1">
                                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase text-slate-700">{plan.tier}</span>
                                                    {plan.hasVerifiedTag && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">Verified Badge</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-black text-gray-900">
                                                {formatCurrency(plan.price)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-xs text-gray-700">
                                                    <div className="flex items-center gap-1">
                                                        <Package size={12} className="text-gray-400" />
                                                        <span className="font-bold">{plan.maxProperties} Properties Allowed</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Zap size={12} className="text-gray-400" />
                                                        <span>{plan.leadCap > 0 ? `${plan.leadCap} Leads` : 'Unlimited Leads'}</span>
                                                    </div>
                                                    {plan.bannerType !== 'none' && (
                                                        <div className="flex items-center gap-1 text-indigo-600 font-bold">
                                                            <MapPin size={12} />
                                                            <span className="capitalize">{plan.bannerType} Banner</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                                {plan.durationDays} Days
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleStatus(plan)}
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                                                        plan.isActive
                                                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                    }`}
                                                    title="Click to toggle status"
                                                >
                                                    {plan.isActive ? '● Active' : '○ Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleStatus(plan)}
                                                        className={`p-2 rounded-lg transition-colors border border-transparent ${
                                                            plan.isActive ? 'text-gray-400 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-600 hover:text-black hover:bg-gray-100'
                                                        }`}
                                                        title={plan.isActive ? 'Deactivate (Hide)' : 'Activate (Show)'}
                                                    >
                                                        {plan.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPlan(plan)}
                                                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors border border-transparent"
                                                        title="Edit Details"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePlan(plan._id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                                                        title="Remove or Deactivate"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    tiers.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <Layers className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-lg font-medium">No Custom Tiers Found</p>
                            <p className="text-sm">Create a subscription tier type to assign visual packages.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Tier Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Slug Key</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tiers.map((tier) => (
                                        <tr key={tier._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {tier.name}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                                {tier.key}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditTier(tier)}
                                                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors border border-transparent"
                                                        title="Edit Name"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTier(tier._id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                                                        title="Delete Tier Type"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Modals Workspace */}
            {showPlanModal && (
                <PlanModal
                    plan={editingPlan}
                    onClose={() => setShowPlanModal(false)}
                    onSuccess={() => {
                        setShowPlanModal(false);
                        fetchData();
                    }}
                />
            )}

            {showTierModal && (
                <TierModal
                    tier={editingTier}
                    onClose={() => setShowTierModal(false)}
                    onSuccess={() => {
                        setShowTierModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default AdminSubscriptions;
