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
    basic: { gradient: 'from-slate-600 to-slate-800', icon: Package, ring: 'ring-slate-200' },
    premium: { gradient: 'from-amber-400 to-orange-600', icon: Star, ring: 'ring-amber-200' },
    relationship_manager: { gradient: 'from-purple-500 to-indigo-700', icon: Crown, ring: 'ring-purple-200' },
    custom: { gradient: 'from-emerald-500 to-teal-700', icon: Zap, ring: 'ring-emerald-200' },
};

const fmt = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const FeatureRow = ({ text }) => (
    <div className="flex items-start gap-2.5">
        <CheckCircle size={15} className="text-emerald-500 mt-px shrink-0" />
        <span className="text-[13px] font-medium text-slate-700 leading-snug">{text}</span>
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
            if (limit === 1) return [id];
            if (prev.length >= limit) {
                toast.error(`This plan covers up to ${limit} ${limit === 1 ? 'listing' : 'listings'}`);
                return prev;
            }
            return [...prev, id];
        });
    };

    return (
        <div 
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
        >
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Mobile drag handle */}
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-gray-900 text-base sm:text-lg">
                                Choose {limit === 1 ? 'a listing' : 'listings'}
                            </h3>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {selected.length}/{limit} Selected
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                            {plan.name} covers up to {limit} {limit === 1 ? 'property' : 'properties'}
                        </p>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        disabled={submitting}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                            <Loader2 className="animate-spin text-emerald-600" size={26} />
                            <span className="text-xs font-medium">Loading your listings...</span>
                        </div>
                    ) : available.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                                <Home size={22} />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800 mb-1">No Eligible Listings Found</h4>
                            <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">
                                Every approved listing in this mode already has an active subscription, or you haven't added any listings yet.
                            </p>
                        </div>
                    ) : (
                        available.map((p) => {
                            const isSelected = selected.includes(p._id);
                            return (
                                <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => toggle(p._id)}
                                    className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border-2 text-left transition-all ${
                                        isSelected 
                                            ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20' 
                                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                                    }`}
                                >
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                                        <img
                                            src={p.coverImage || (p.images && p.images[0]) || 'https://placehold.co/80x80?text=Property'}
                                            alt={p.propertyName || 'Property'}
                                            onError={(e) => { e.currentTarget.src = 'https://placehold.co/80x80?text=Property'; }}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {p.propertyName || p.title || 'Untitled Property'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                            <MapPin size={11} className="shrink-0 text-gray-400" />
                                            <span className="truncate">{p.address?.city || p.address?.locality || p.locality || '—'}</span>
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        {isSelected ? (
                                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                                <CheckCircle size={15} />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-400" />
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="p-4 sm:p-5 border-t border-gray-100 bg-white pb-6 sm:pb-5">
                    <button
                        type="button"
                        disabled={selected.length === 0 || submitting}
                        onClick={() => onConfirm(selected)}
                        className="w-full py-3.5 rounded-2xl text-sm font-black bg-gray-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black transition flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10 active:scale-[0.99]"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <span>Continue with {selected.length || 0} selected</span>
                        )}
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

    // This page renders both standalone (owner/broker, at /my-subscriptions)
    // and nested inside the partner shell (builder, at /hotel/subscriptions).
    // Getting here is also possible via a direct link or a redirect chain
    // (e.g. the posting-flow gate), so `navigate(-1)` isn't reliable — it can
    // "bounce" straight back to wherever sent the user here, or fall through
    // to '/' when there's no usable history. Same failure mode already fixed
    // in DynamicFormEngine's goBack; the fix here is the same: go somewhere
    // explicit and stable instead of trusting browser history.
    const isBuilder = user?.role === 'builder' || user?.userType === 'builder' || user?.role === 'partner' || user?.userType === 'partner';
    
    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(isBuilder ? '/hotel/properties' : '/my-properties', { replace: true });
        }
    };

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
        <div className="min-h-screen bg-slate-50 pb-28">
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100">
                <div className="flex items-center gap-3 px-4 py-3.5 max-w-2xl mx-auto">
                    <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                        <ArrowLeft size={18} className="text-slate-700" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Boost Your Listings</h1>
                        <p className="text-[11px] text-slate-500 font-medium truncate">Subscribe a property to get more visibility</p>
                    </div>
                </div>

                {availableModes.length > 1 && (
                    <div className="px-4 pb-3 max-w-2xl mx-auto">
                        <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                            {availableModes.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    {m === 'sale' ? <Home size={13} /> : <Building2 size={13} />} {m}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 pt-4 max-w-2xl mx-auto">
                {/* Value props */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                        { icon: TrendingUp, label: 'Higher ranking' },
                        { icon: ShieldCheck, label: 'Verified badge' },
                        { icon: Zap, label: 'More leads' },
                    ].map(({ icon: I, label }) => (
                        <div key={label} className="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center gap-1 shadow-sm">
                            <I size={15} className="text-indigo-600" />
                            <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{label}</span>
                        </div>
                    ))}
                </div>

                {activeSubs.length > 0 && (
                    <div className="mb-5 space-y-2">
                        <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 px-1">Active subscriptions</h2>
                        {activeSubs.map((s) => {
                            const daysLeft = Math.max(0, Math.ceil((new Date(s.expiryDate) - new Date()) / 86400000));
                            return (
                                <div key={s._id} className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-3.5 text-white flex items-center gap-3 shadow-md">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                        <TrendingUp size={17} className="text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-extrabold text-sm truncate">{s.planName}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {s.propertyIds?.length || 0} listing(s) · expires {fmtDate(s.expiryDate)}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            {s.mode}
                                        </span>
                                        <span className="block text-[10px] text-slate-400 font-semibold mt-1">{daysLeft} days left</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-16">
                        <Package size={40} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No {mode} plans available right now</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {plans.map((plan, i) => {
                            const cfg = TIER_CONFIG[plan.planTier] || TIER_CONFIG.basic;
                            const Icon = cfg.icon;
                            const highlights = planHighlights(plan);
                            const popular = plan.planTier === 'premium';
                            const perDay = plan.durationDays > 0 && plan.price > 0 ? Math.round(plan.price / plan.durationDays) : 0;

                            return (
                                <motion.div
                                    key={plan._id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className={`relative bg-white rounded-2xl overflow-hidden border ${popular ? 'border-amber-300 shadow-lg shadow-amber-100' : 'border-slate-200 shadow-sm'}`}
                                >
                                    {popular && (
                                        <div className="absolute top-3 right-3 z-10 text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white text-amber-600 shadow">
                                            Most popular
                                        </div>
                                    )}
                                    <div className={`bg-gradient-to-r ${cfg.gradient} flex items-center px-4 py-3.5 gap-3`}>
                                        <div className="w-9 h-9 rounded-xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center">
                                            <Icon size={17} className="text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="block text-white font-extrabold text-[15px] leading-tight">{plan.name}</span>
                                            {plan.tagline && <span className="block text-white/80 text-[11px] font-medium truncate">{plan.tagline}</span>}
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-end justify-between mb-3 pb-3 border-b border-slate-100">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{fmt(plan.price)}</span>
                                                <span className="text-slate-400 text-[11px] font-bold uppercase">/ {plan.durationDays} days</span>
                                            </div>
                                            {perDay > 0 && (
                                                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    ≈ ₹{perDay}/day
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {highlights.map((h) => <FeatureRow key={h} text={h} />)}
                                        </div>

                                        <button
                                            onClick={() => openPicker(plan)}
                                            className={`w-full py-3 rounded-xl text-sm font-extrabold text-white shadow-md transition active:scale-[0.98] bg-gradient-to-r ${cfg.gradient}`}
                                        >
                                            Get {plan.name}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 bg-white rounded-xl p-3.5 flex items-start gap-2.5 border border-slate-200">
                    <AlertCircle size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
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
