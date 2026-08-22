import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, CheckCircle, ShieldCheck, Package, Crown, Zap, Star,
    AlertCircle, Loader2, Home, Building2, X, MapPin, TrendingUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import propertySubscriptionService from '../../services/propertySubscriptionService';
import { useAuth } from '../../context/AuthContext';

const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
});

const TIER_CONFIG = {
    basic: { gradient: 'from-slate-500 to-slate-700', icon: Package, ring: 'ring-slate-200' },
    premium: { gradient: 'from-amber-400 to-orange-600', icon: Star, ring: 'ring-amber-200' },
    relationship_manager: { gradient: 'from-purple-500 to-indigo-700', icon: Crown, ring: 'ring-purple-200' },
    custom: { gradient: 'from-emerald-500 to-teal-700', icon: Zap, ring: 'ring-emerald-200' },
};

const fmt = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const FeatureRow = ({ text }) => (
    <div className="flex items-start gap-2.5">
        <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
        <span className="text-xs font-semibold text-gray-800 leading-tight">{text}</span>
    </div>
);

/** Turns a plan's feature array into the handful of lines worth showing on the card. */
const planHighlights = (plan) => {
    const lines = [];
    const f = (key) => plan.features?.find((x) => x.key === key)?.value;

    const propLimit = f('property_limit');
    if (propLimit != null) lines.push(`Up to ${propLimit} ${Number(propLimit) === 1 ? 'listing' : 'listings'}`);

    const leadLimit = f('lead_limit');
    if (leadLimit != null) lines.push(Number(leadLimit) > 0 ? `${leadLimit} leads unlocked` : 'Unlimited leads');

    const rankWeight = f('ranking_weight');
    if (rankWeight) lines.push(`Search ranking boost (+${rankWeight})`);

    if (f('showcase')) lines.push('Featured showcase placement');
    if (f('verified_badge')) lines.push('Verified badge on listings');
    if (f('priority_placement')) lines.push('Priority search placement');
    if (f('dedicated_rm')) lines.push('Dedicated Relationship Manager');
    if (f('priority_support')) lines.push('Priority support');
    if (f('site_visit_coordination')) lines.push('Site-visit coordination');

    return lines;
};

/** Picking properties to attach the subscription to. */
const PropertyPickerModal = ({ plan, properties, loading, onClose, onConfirm, submitting }) => {
    const [selected, setSelected] = useState([]);
    const limit = plan.propertiesPerPurchase || 1;
    const available = properties.filter((p) => !p.hasActiveSubscription);

    const toggle = (id) => {
        setSelected((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= limit) {
                toast.error(`This plan covers up to ${limit} ${limit === 1 ? 'listing' : 'listings'}`);
                return prev;
            }
            return [...prev, id];
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-black text-gray-900">Choose {limit === 1 ? 'a listing' : 'listings'}</h3>
                        <p className="text-xs text-gray-400 font-medium">{plan.name} covers up to {limit}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" /></div>
                    ) : available.length === 0 ? (
                        <div className="text-center py-10 text-sm text-gray-400 font-medium">
                            No eligible listings — every approved listing in this mode already has an active subscription.
                        </div>
                    ) : (
                        available.map((p) => (
                            <button
                                key={p._id}
                                onClick={() => toggle(p._id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition ${selected.includes(p._id) ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <img
                                    src={p.coverImage || 'https://placehold.co/80x80?text=Property'}
                                    alt=""
                                    className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{p.propertyName}</p>
                                    <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                                        <MapPin size={10} /> {p.address?.city || p.address?.locality || '—'}
                                    </p>
                                </div>
                                {selected.includes(p._id) && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
                            </button>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-100">
                    <button
                        disabled={selected.length === 0 || submitting}
                        onClick={() => onConfirm(selected)}
                        className="w-full py-3.5 rounded-2xl text-sm font-black bg-gray-900 text-white disabled:opacity-40 hover:bg-black transition"
                    >
                        {submitting ? 'Processing...' : `Continue with ${selected.length || 0} selected`}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const PropertySubscriptionsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('sale');
    const [availableModes, setAvailableModes] = useState([]);
    const [plans, setPlans] = useState([]);
    const [mySubscriptions, setMySubscriptions] = useState([]);
    const [pickerPlan, setPickerPlan] = useState(null);
    const [properties, setProperties] = useState([]);
    const [propertiesLoading, setPropertiesLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const purchaseInFlightRef = useRef(false);

    useEffect(() => { loadCatalog(mode); }, [mode]);
    useEffect(() => { loadMine(); }, []);

    const loadCatalog = async (m) => {
        try {
            setLoading(true);
            const res = await propertySubscriptionService.getCatalog({ mode: m });
            if (res.success) {
                setAvailableModes(res.availableModes || []);
                if (!res.availableModes?.includes(m) && res.availableModes?.length) {
                    setMode(res.availableModes[0]);
                    return;
                }
                setPlans(res.plans || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Could not load plans');
        } finally {
            setLoading(false);
        }
    };

    const loadMine = async () => {
        try {
            const res = await propertySubscriptionService.getMySubscriptions();
            if (res.success) setMySubscriptions(res.subscriptions || []);
        } catch (err) { /* non-fatal */ }
    };

    const openPicker = async (plan) => {
        setPickerPlan(plan);
        setPropertiesLoading(true);
        try {
            const res = await propertySubscriptionService.getEligibleProperties(mode);
            if (res.success) setProperties(res.properties || []);
        } catch (err) {
            toast.error('Could not load your listings');
        } finally {
            setPropertiesLoading(false);
        }
    };

    const handleConfirmPurchase = async (propertyIds) => {
        if (purchaseInFlightRef.current) return;
        purchaseInFlightRef.current = true;
        setSubmitting(true);

        const plan = pickerPlan;
        const isFree = Number(plan.price) <= 0;
        const tid = toast.loading(isFree ? 'Activating plan...' : 'Initializing payment...');

        try {
            const res = await propertySubscriptionService.createCheckout({ planId: plan._id, propertyIds });
            if (!res.success) {
                toast.error(res.message || 'Could not start checkout', { id: tid });
                return;
            }

            if (res.free) {
                toast.success('Subscription activated!', { id: tid });
                setPickerPlan(null);
                loadMine();
                return;
            }

            const loaded = await loadRazorpay();
            if (!loaded) throw new Error('Razorpay SDK failed to load');

            new window.Razorpay({
                key: res.key,
                amount: res.order.amount,
                currency: res.order.currency,
                name: 'GetRightHome',
                description: `${res.plan.name} — ${propertyIds.length} listing(s)`,
                order_id: res.order.id,
                prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
                theme: { color: '#059669' },
                handler: async (rzpRes) => {
                    try {
                        toast.loading('Verifying payment...', { id: tid });
                        const verify = await propertySubscriptionService.verifyCheckout({
                            razorpay_order_id: rzpRes.razorpay_order_id,
                            razorpay_payment_id: rzpRes.razorpay_payment_id,
                            razorpay_signature: rzpRes.razorpay_signature,
                        });
                        if (verify.success) {
                            toast.success(verify.message || 'Subscription activated!', { id: tid });
                            setPickerPlan(null);
                            loadMine();
                        } else {
                            toast.error(verify.message || 'Verification failed', { id: tid });
                        }
                    } catch (e) {
                        toast.error('Payment verification failed', { id: tid });
                    }
                },
                modal: { ondismiss: () => toast.dismiss(tid) },
            }).open();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Could not start checkout', { id: tid });
        } finally {
            purchaseInFlightRef.current = false;
            setSubmitting(false);
        }
    };

    const activeSubs = useMemo(
        () => mySubscriptions.filter((s) => s.status === 'active' && new Date(s.expiryDate) > new Date()),
        [mySubscriptions]
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-28">
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                        <ArrowLeft size={18} className="text-gray-700" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-gray-900 capitalize">Boost Your Listings</h1>
                        <p className="text-xs text-gray-400 font-medium">Subscribe a property to get more visibility</p>
                    </div>
                </div>

                {availableModes.length > 1 && (
                    <div className="flex gap-2 px-4 pb-3">
                        {availableModes.map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition flex items-center justify-center gap-1.5 ${mode === m ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {m === 'sale' ? <Home size={14} /> : <Building2 size={14} />} {m}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4 pt-4 max-w-2xl mx-auto">
                {activeSubs.length > 0 && (
                    <div className="mb-6 space-y-3">
                        <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 px-1">Active subscriptions</h2>
                        {activeSubs.map((s) => (
                            <div key={s._id} className="bg-gray-900 rounded-2xl p-4 text-white flex items-center justify-between">
                                <div>
                                    <p className="font-black text-sm flex items-center gap-1.5">
                                        <TrendingUp size={14} className="text-emerald-400" /> {s.planName}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        {s.propertyIds?.length || 0} listing(s) · expires {fmtDate(s.expiryDate)}
                                    </p>
                                </div>
                                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                    {s.mode}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-16">
                        <Package size={40} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No {mode} plans available right now</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {plans.map((plan, i) => {
                            const cfg = TIER_CONFIG[plan.planTier] || TIER_CONFIG.basic;
                            const Icon = cfg.icon;
                            const highlights = planHighlights(plan);

                            return (
                                <motion.div
                                    key={plan._id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className={`bg-white rounded-3xl border-2 border-gray-100 overflow-hidden ring-4 ${cfg.ring} ring-opacity-0 hover:ring-opacity-40 transition`}
                                >
                                    <div className={`h-16 bg-gradient-to-r ${cfg.gradient} flex items-center px-5 gap-3`}>
                                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <Icon size={18} className="text-white" />
                                        </div>
                                        <span className="text-white font-black text-base">{plan.name}</span>
                                    </div>

                                    <div className="p-5">
                                        {plan.tagline && <p className="text-xs text-gray-400 font-semibold mb-3">{plan.tagline}</p>}

                                        <div className="flex items-baseline gap-1.5 mb-4">
                                            <span className="text-3xl font-black text-gray-900">{fmt(plan.price)}</span>
                                            <span className="text-gray-400 text-xs font-bold uppercase">/ {plan.durationDays} days</span>
                                        </div>

                                        <div className="space-y-2.5 mb-5">
                                            {highlights.map((h) => <FeatureRow key={h} text={h} />)}
                                        </div>

                                        <button
                                            onClick={() => openPicker(plan)}
                                            className="w-full py-3.5 rounded-2xl text-sm font-black bg-gray-900 text-white hover:bg-black shadow-lg transition active:scale-95"
                                        >
                                            Get This Plan
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 bg-blue-50 rounded-2xl p-4 flex items-start gap-3 border border-blue-100">
                    <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        Subscriptions attach to the listing(s) you choose. Plans are non-refundable. Higher tiers give
                        stronger search ranking, showcase placement and verified badges.
                    </p>
                </div>
            </div>

            <AnimatePresence>
                {pickerPlan && (
                    <PropertyPickerModal
                        plan={pickerPlan}
                        properties={properties}
                        loading={propertiesLoading}
                        submitting={submitting}
                        onClose={() => setPickerPlan(null)}
                        onConfirm={handleConfirmPurchase}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PropertySubscriptionsPage;
