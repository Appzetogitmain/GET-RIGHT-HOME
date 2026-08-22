// Admin surface for the new property-level subscription architecture
// (`/api/property-subscriptions/admin/*`). Kept separate from the legacy
// AdminSubscriptions.jsx, which still manages the old account-level plan
// catalogue for the three subscribers still on that system.
//
// §11/§12 of the spec: Sale/Rental/Buyer visibility, a Feature Catalogue
// admin can extend without a code change, plan CRUD, and full subscription
// management — assign offline, extend, cancel, audit history.
import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Edit2, Trash2, X, Package, Layers,
    Home, Building2, Users, TrendingUp, Calendar, Search, Clock, History,
    ShieldCheck, Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import propertySubscriptionService from '../../../services/propertySubscriptionService';

const MODES = ['sale', 'rental', 'buyer'];
const ROLES = ['owner', 'broker', 'builder', 'buyer'];
const TIERS = ['basic', 'premium', 'relationship_manager', 'custom'];
const TIER_LABEL = { basic: 'Basic', premium: 'Premium', relationship_manager: 'Relationship Manager', custom: 'Custom' };
const STATUSES = ['pending', 'active', 'expired', 'cancelled'];

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const Badge = ({ children, tone = 'gray' }) => {
    const tones = {
        gray: 'bg-gray-100 text-gray-600',
        green: 'bg-emerald-100 text-emerald-700',
        red: 'bg-red-100 text-red-700',
        amber: 'bg-amber-100 text-amber-700',
        blue: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
};

const statusTone = (s) => ({ active: 'green', expired: 'gray', cancelled: 'red', pending: 'amber' }[s] || 'gray');

const Modal = ({ title, onClose, children, wide }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col shadow-xl`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-black text-gray-900">{title}</h3>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-5 overflow-y-auto">{children}</div>
        </div>
    </div>
);

const Field = ({ label, children }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
        {children}
    </div>
);

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES TAB
// ─────────────────────────────────────────────────────────────────────────────

const FeatureModal = ({ feature, onClose, onSuccess }) => {
    const [form, setForm] = useState(feature || {
        label: '', description: '', valueType: 'boolean', mode: 'both', unit: '', displayOrder: 0,
    });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!form.label?.trim()) return toast.error('Give the feature a name');
        setSaving(true);
        try {
            const res = feature
                ? await propertySubscriptionService.admin.updateFeature(feature._id, form)
                : await propertySubscriptionService.admin.createFeature(form);
            if (res.success) {
                toast.success(feature ? 'Feature updated' : 'Feature created');
                onSuccess();
            } else toast.error(res.message);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save feature');
        } finally { setSaving(false); }
    };

    return (
        <Modal title={feature ? 'Edit Feature' : 'New Feature'} onClose={onClose}>
            <Field label="Name">
                <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} disabled={feature?.isSystem} />
            </Field>
            <Field label="Description">
                <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Value type">
                <select className={inputCls} value={form.valueType} onChange={(e) => setForm({ ...form, valueType: e.target.value })} disabled={feature?.isSystem}>
                    <option value="boolean">Boolean (on/off)</option>
                    <option value="numeric">Numeric</option>
                    <option value="text">Text</option>
                </select>
            </Field>
            <Field label="Applies to">
                <select className={inputCls} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                    <option value="both">Sale & Rental</option>
                    <option value="sale">Sale only</option>
                    <option value="rental">Rental only</option>
                </select>
            </Field>
            <Field label="Unit (optional, e.g. 'listings')">
                <input className={inputCls} value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Field>
            <button onClick={submit} disabled={saving} className="w-full mt-2 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Feature'}
            </button>
        </Modal>
    );
};

const FeaturesTab = () => {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await propertySubscriptionService.admin.listFeatures();
            if (res.success) setFeatures(res.features);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const remove = async (f) => {
        if (f.isSystem) return toast.error('Built-in features cannot be removed — deactivate instead');
        if (!confirm(`Deactivate "${f.label}"? It will be removed from every plan using it.`)) return;
        try {
            const res = await propertySubscriptionService.admin.deleteFeature(f._id);
            if (res.success) { toast.success(res.message); load(); }
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Features are created once and attached to any plan — the business changes benefits without a code change.</p>
                <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold shrink-0">
                    <Plus size={16} /> New Feature
                </button>
            </div>
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" /></div> : (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {features.map((f) => (
                        <div key={f._id} className="flex items-center justify-between px-4 py-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    {f.label}
                                    {f.isSystem && <Badge tone="blue">Built-in</Badge>}
                                    {!f.isActive && <Badge tone="red">Inactive</Badge>}
                                </p>
                                <p className="text-xs text-gray-400">{f.key} · {f.valueType} · {f.mode}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditing(f)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 size={14} /></button>
                                {!f.isSystem && <button onClick={() => remove(f)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {(editing || creating) && (
                <FeatureModal
                    feature={editing}
                    onClose={() => { setEditing(null); setCreating(false); }}
                    onSuccess={() => { setEditing(null); setCreating(false); load(); }}
                />
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// PLANS TAB
// ─────────────────────────────────────────────────────────────────────────────

const PlanModal = ({ plan, allFeatures, onClose, onSuccess }) => {
    const [form, setForm] = useState(plan ? {
        ...plan,
        featureValues: Object.fromEntries((plan.features || []).map((f) => [f.key, f.value])),
    } : {
        name: '', targetRole: 'owner', mode: 'sale', planTier: 'basic',
        price: 0, durationDays: 30, propertiesPerPurchase: 1, tagline: '', description: '',
        isActive: false, featureValues: {},
    });
    const [saving, setSaving] = useState(false);

    const setFeatureValue = (key, value) => setForm((p) => ({ ...p, featureValues: { ...p.featureValues, [key]: value } }));

    const submit = async () => {
        if (!form.name?.trim()) return toast.error('Give the plan a name');
        setSaving(true);
        const features = Object.entries(form.featureValues)
            .filter(([, v]) => v !== '' && v !== undefined)
            .map(([key, value]) => ({ key, value }));

        const payload = {
            name: form.name, targetRole: form.targetRole, mode: form.mode, planTier: form.planTier,
            price: Number(form.price) || 0, durationDays: Number(form.durationDays) || 30,
            propertiesPerPurchase: Number(form.propertiesPerPurchase) || 1,
            tagline: form.tagline, description: form.description, isActive: !!form.isActive, features,
        };
        try {
            const res = plan
                ? await propertySubscriptionService.admin.updatePlan(plan._id, payload)
                : await propertySubscriptionService.admin.createPlan(payload);
            if (res.success) {
                toast.success(plan ? 'Plan updated' : 'Plan created');
                if (res.note) toast(res.note, { icon: 'ℹ️', duration: 6000 });
                onSuccess();
            } else toast.error(res.message);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save plan');
        } finally { setSaving(false); }
    };

    const relevantFeatures = allFeatures.filter((f) => f.mode === 'both' || f.mode === form.mode);

    return (
        <Modal title={plan ? 'Edit Plan' : 'New Plan'} onClose={onClose} wide>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Plan name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Tagline"><input className={inputCls} value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>

                <Field label="Profile">
                    <select className={inputCls} value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
                        {ROLES.filter((r) => r !== 'buyer').map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </Field>
                <Field label="Mode">
                    <select className={inputCls} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                        {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </Field>

                <Field label="Tier">
                    <select className={inputCls} value={form.planTier} onChange={(e) => setForm({ ...form, planTier: e.target.value })}>
                        {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                    </select>
                </Field>
                <Field label="Price (₹, 0 = free)">
                    <input type="number" min="0" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </Field>

                <Field label="Validity (days)">
                    <input type="number" min="1" className={inputCls} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
                </Field>
                <Field label="Properties per purchase">
                    <input type="number" min="1" className={inputCls} value={form.propertiesPerPurchase} onChange={(e) => setForm({ ...form, propertiesPerPurchase: e.target.value })} />
                </Field>
            </div>

            <Field label="Description">
                <textarea className={inputCls} rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>

            <div className="mt-4">
                <p className="text-xs font-black text-gray-500 uppercase mb-2">Features & limits</p>
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {relevantFeatures.map((f) => (
                        <div key={f.key} className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm text-gray-700">{f.label}</span>
                            {f.valueType === 'boolean' ? (
                                <input
                                    type="checkbox"
                                    checked={!!form.featureValues[f.key]}
                                    onChange={(e) => setFeatureValue(f.key, e.target.checked)}
                                    className="w-4 h-4"
                                />
                            ) : (
                                <input
                                    type={f.valueType === 'numeric' ? 'number' : 'text'}
                                    className="w-28 px-2 py-1 border border-gray-200 rounded text-sm"
                                    value={form.featureValues[f.key] ?? ''}
                                    onChange={(e) => setFeatureValue(f.key, e.target.value)}
                                    placeholder={f.unit || ''}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <label className="flex items-center gap-2 mt-4 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active — visible in the catalogue
            </label>

            <button onClick={submit} disabled={saving} className="w-full mt-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Plan'}
            </button>
        </Modal>
    );
};

const PlansTab = () => {
    const [plans, setPlans] = useState([]);
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ mode: '', role: '' });
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [plansRes, featRes] = await Promise.all([
                propertySubscriptionService.admin.listPlans(filters),
                propertySubscriptionService.admin.listFeatures(),
            ]);
            if (plansRes.success) setPlans(plansRes.plans);
            if (featRes.success) setFeatures(featRes.features);
        } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    const toggleActive = async (plan) => {
        if (plan.isActive) {
            if (!confirm(`Hide "${plan.name}" from the catalogue?`)) return;
            const res = await propertySubscriptionService.admin.deactivatePlan(plan._id);
            if (res.success) { toast.success(res.message); load(); }
        } else {
            const res = await propertySubscriptionService.admin.updatePlan(plan._id, { isActive: true });
            if (res.success) { toast.success('Plan activated'); load(); }
        }
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex gap-2">
                    <select className={inputCls} value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value })}>
                        <option value="">All modes</option>
                        {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className={inputCls} value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                        <option value="">All roles</option>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold">
                    <Plus size={16} /> New Plan
                </button>
            </div>

            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" /></div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {plans.map((p) => (
                        <div key={p._id} className="bg-white rounded-2xl border border-gray-100 p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-black text-gray-900">{p.name}</p>
                                    <p className="text-[11px] text-gray-400 uppercase font-bold">{p.targetRole} · {p.mode} · {TIER_LABEL[p.planTier]}</p>
                                </div>
                                <Badge tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Live' : 'Hidden'}</Badge>
                            </div>
                            <p className="text-2xl font-black text-gray-900">{fmt(p.price)}<span className="text-xs text-gray-400 font-bold"> /{p.durationDays}d</span></p>
                            <p className="text-xs text-gray-500 mt-1">{p.activeSubscribers} active subscriber(s)</p>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setEditing(p)} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-bold flex items-center justify-center gap-1">
                                    <Edit2 size={12} /> Edit
                                </button>
                                <button onClick={() => toggleActive(p)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${p.isActive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {p.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-10">No plans match these filters</p>}
                </div>
            )}

            {(editing || creating) && (
                <PlanModal
                    plan={editing}
                    allFeatures={features}
                    onClose={() => { setEditing(null); setCreating(false); }}
                    onSuccess={() => { setEditing(null); setCreating(false); load(); }}
                />
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

const AssignModal = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [userQuery, setUserQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [mode, setMode] = useState('sale');
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [properties, setProperties] = useState([]);
    const [selectedProperties, setSelectedProperties] = useState([]);
    const [refNumber, setRefNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const searchUsers = async () => {
        const res = await propertySubscriptionService.admin.searchUsers({ search: userQuery });
        if (res.success) setUsers(res.users);
    };

    const pickUser = async (u) => {
        setSelectedUser(u);
        setStep(2);
    };

    const loadPlansForMode = async (m) => {
        setMode(m);
        const res = await propertySubscriptionService.admin.listPlans({ mode: m, role: selectedUser.role === 'partner' ? 'builder' : selectedUser.role, isActive: 'true' });
        if (res.success) setPlans(res.plans);
    };

    const pickPlan = async (plan) => {
        setSelectedPlan(plan);
        setAmount(plan.price);
        if (plan.mode !== 'buyer') {
            const res = await propertySubscriptionService.admin.getUserProperties(selectedUser._id, mode);
            if (res.success) setProperties(res.properties);
        }
        setStep(3);
    };

    const toggleProperty = (id) => setSelectedProperties((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    const submit = async () => {
        setSaving(true);
        try {
            const res = await propertySubscriptionService.admin.assign({
                userId: selectedUser._id, planId: selectedPlan._id, propertyIds: selectedProperties,
                amount, referenceNumber: refNumber, notes,
            });
            if (res.success) { toast.success('Subscription assigned'); onSuccess(); }
            else toast.error(res.message);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign');
        } finally { setSaving(false); }
    };

    return (
        <Modal title="Assign Offline Subscription" onClose={onClose} wide>
            {step === 1 && (
                <div>
                    <div className="flex gap-2 mb-3">
                        <input className={inputCls} placeholder="Search name, email or phone" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUsers()} />
                        <button onClick={searchUsers} className="px-3 py-2 bg-gray-900 text-white rounded-lg"><Search size={16} /></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                        {users.map((u) => (
                            <button key={u._id} onClick={() => pickUser(u)} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg flex justify-between">
                                <div><p className="text-sm font-bold">{u.name}</p><p className="text-xs text-gray-400">{u.email} · {u.phone}</p></div>
                                <Badge>{u.role}</Badge>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {step === 2 && (
                <div>
                    <p className="text-sm mb-3">Assigning to <b>{selectedUser.name}</b> ({selectedUser.role})</p>
                    <div className="flex gap-2 mb-4">
                        {MODES.filter((m) => m !== 'buyer' || selectedUser.role === 'buyer').map((m) => (
                            <button key={m} onClick={() => loadPlansForMode(m)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase ${mode === m ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>{m}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {plans.map((p) => (
                            <button key={p._id} onClick={() => pickPlan(p)} className="text-left p-3 border border-gray-200 rounded-xl hover:border-gray-900">
                                <p className="text-sm font-bold">{p.name}</p>
                                <p className="text-xs text-gray-400">{fmt(p.price)} / {p.durationDays}d</p>
                            </button>
                        ))}
                        {plans.length === 0 && <p className="text-xs text-gray-400 col-span-2">Load a mode with active plans for this role.</p>}
                    </div>
                </div>
            )}
            {step === 3 && (
                <div>
                    {selectedPlan.mode !== 'buyer' && (
                        <div className="mb-4">
                            <p className="text-xs font-black text-gray-500 uppercase mb-2">Properties</p>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {properties.map((p) => (
                                    <label key={p._id} className="flex items-center gap-2 text-sm p-2 border border-gray-100 rounded-lg">
                                        <input type="checkbox" checked={selectedProperties.includes(p._id)} onChange={() => toggleProperty(p._id)} />
                                        {p.propertyName}
                                    </label>
                                ))}
                                {properties.length === 0 && <p className="text-xs text-gray-400">No approved listings in this mode for this user.</p>}
                            </div>
                        </div>
                    )}
                    <Field label="Amount collected (₹)"><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                    <Field label="Reference number"><input className={inputCls} value={refNumber} onChange={(e) => setRefNumber(e.target.value)} /></Field>
                    <Field label="Notes"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                    <button onClick={submit} disabled={saving || (selectedPlan.mode !== 'buyer' && selectedProperties.length === 0)} className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50">
                        {saving ? 'Assigning...' : 'Activate Subscription'}
                    </button>
                </div>
            )}
        </Modal>
    );
};

const ExtendModal = ({ subscription, onClose, onSuccess }) => {
    const [days, setDays] = useState(30);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            const res = await propertySubscriptionService.admin.extend(subscription._id, { days: Number(days), reason });
            if (res.success) { toast.success('Extended'); onSuccess(); } else toast.error(res.message);
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
    };

    return (
        <Modal title={`Extend — ${subscription.subscriptionId}`} onClose={onClose}>
            <p className="text-sm text-gray-500 mb-3">Current expiry: {fmtDate(subscription.expiryDate)}</p>
            <Field label="Days to add"><input type="number" className={inputCls} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
            <Field label="Reason"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. goodwill extension" /></Field>
            <button onClick={submit} disabled={saving} className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Extend'}
            </button>
        </Modal>
    );
};

const AuditModal = ({ subscription, onClose }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        propertySubscriptionService.admin.getAudit(subscription._id).then((res) => {
            if (res.success) setEntries(res.entries);
        }).finally(() => setLoading(false));
    }, [subscription._id]);

    return (
        <Modal title={`Audit — ${subscription.subscriptionId}`} onClose={onClose}>
            {loading ? <Loader2 className="animate-spin mx-auto text-gray-300" /> : (
                <div className="space-y-3">
                    {entries.map((e) => (
                        <div key={e._id} className="border-l-2 border-gray-200 pl-3">
                            <p className="text-sm font-bold capitalize">{e.action.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-gray-400">{e.performedByName || 'System'} · {fmtDate(e.createdAt)}</p>
                            {e.reason && <p className="text-xs text-gray-500 italic">"{e.reason}"</p>}
                        </div>
                    ))}
                    {entries.length === 0 && <p className="text-sm text-gray-400">No history yet.</p>}
                </div>
            )}
        </Modal>
    );
};

const SubscriptionsTab = ({ initialMode }) => {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ mode: initialMode || '', status: '', paymentType: '' });
    const [assigning, setAssigning] = useState(false);
    const [extending, setExtending] = useState(null);
    const [viewingAudit, setViewingAudit] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const cleaned = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
            const res = await propertySubscriptionService.admin.listSubscriptions(cleaned);
            if (res.success) setSubs(res.subscriptions);
        } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setFilters((f) => ({ ...f, mode: initialMode || '' })); }, [initialMode]);

    const cancel = async (s) => {
        const reason = prompt(`Cancel ${s.subscriptionId}? Enter a reason:`);
        if (reason == null) return;
        const res = await propertySubscriptionService.admin.cancel(s._id, { reason });
        if (res.success) { toast.success('Cancelled'); load(); }
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                    <select className={inputCls} value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value })}>
                        <option value="">All modes</option>
                        {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className={inputCls} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className={inputCls} value={filters.paymentType} onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}>
                        <option value="">Online & Offline</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
                <button onClick={() => setAssigning(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold">
                    <Plus size={16} /> Assign Offline
                </button>
            </div>

            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" /></div> : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase text-gray-400 border-b border-gray-100">
                                <th className="px-4 py-3">Subscriber</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Listings</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Payment</th>
                                <th className="px-4 py-3">Expiry</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {subs.map((s) => (
                                <tr key={s._id}>
                                    <td className="px-4 py-3">
                                        <p className="font-bold">{s.userId?.name || '—'}</p>
                                        <p className="text-xs text-gray-400">{s.subscriptionId}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p>{s.planName}</p>
                                        <Badge tone="purple">{s.mode}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {s.propertyIds?.map((p) => p.propertyName).join(', ') || '—'}
                                    </td>
                                    <td className="px-4 py-3"><Badge tone={statusTone(s.status)}>{s.status}</Badge></td>
                                    <td className="px-4 py-3 text-xs uppercase font-bold text-gray-500">{s.paymentType}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(s.expiryDate)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setExtending(s)} title="Extend" className="p-1.5 hover:bg-gray-100 rounded"><Clock size={14} /></button>
                                            <button onClick={() => setViewingAudit(s)} title="History" className="p-1.5 hover:bg-gray-100 rounded"><History size={14} /></button>
                                            {s.status !== 'cancelled' && (
                                                <button onClick={() => cancel(s)} title="Cancel" className="p-1.5 hover:bg-red-50 text-red-500 rounded"><X size={14} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {subs.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No subscriptions match these filters</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {assigning && <AssignModal onClose={() => setAssigning(false)} onSuccess={() => { setAssigning(false); load(); }} />}
            {extending && <ExtendModal subscription={extending} onClose={() => setExtending(null)} onSuccess={() => { setExtending(null); load(); }} />}
            {viewingAudit && <AuditModal subscription={viewingAudit} onClose={() => setViewingAudit(null)} />}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────

const OverviewTab = () => {
    const [summary, setSummary] = useState(null);
    useEffect(() => { propertySubscriptionService.admin.getSummary().then((res) => res.success && setSummary(res)); }, []);
    if (!summary) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" /></div>;

    const cards = [
        { label: 'Sale', icon: Home, tone: 'blue', ...summary.byMode.sale },
        { label: 'Rental', icon: Building2, tone: 'amber', ...summary.byMode.rental },
        { label: 'Buyer', icon: Users, tone: 'purple', ...summary.byMode.buyer },
    ];

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {cards.map((c) => (
                    <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <c.icon size={16} className="text-gray-400" />
                            <p className="text-xs font-black uppercase text-gray-400">{c.label}</p>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{c.count || 0} <span className="text-xs text-gray-400 font-bold">active</span></p>
                        <p className="text-sm text-emerald-600 font-bold mt-1">{fmt(c.revenue || 0)} revenue</p>
                    </div>
                ))}
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 mb-6">
                <Calendar size={18} className="text-amber-500" />
                <p className="text-sm text-amber-800 font-bold">{summary.expiringSoon} subscription(s) expiring in the next 7 days</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(summary.byStatus).map(([status, count]) => (
                    <div key={status} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                        <p className="text-lg font-black">{count}</p>
                        <p className="text-[10px] uppercase font-bold text-gray-400">{status}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'sale', label: 'Sale', icon: Home },
    { key: 'rental', label: 'Rental', icon: Building2 },
    { key: 'buyer', label: 'Buyer', icon: Users },
    { key: 'plans', label: 'Plans', icon: Package },
    { key: 'features', label: 'Features', icon: Layers },
];

const AdminPropertySubscriptions = () => {
    const [tab, setTab] = useState('overview');

    return (
        <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={20} className="text-gray-900" />
                <h1 className="text-xl font-black text-gray-900">Property Subscriptions</h1>
            </div>
            <p className="text-sm text-gray-400 mb-6">Sale / Rental / Buyer subscriptions, plans and the feature catalogue.</p>

            <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap ${tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab />}
            {tab === 'sale' && <SubscriptionsTab initialMode="sale" />}
            {tab === 'rental' && <SubscriptionsTab initialMode="rental" />}
            {tab === 'buyer' && <SubscriptionsTab initialMode="buyer" />}
            {tab === 'plans' && <PlansTab />}
            {tab === 'features' && <FeaturesTab />}
        </div>
    );
};

export default AdminPropertySubscriptions;
