import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    basic: {
        gradient: 'from-slate-600 to-slate-800', icon: Package, ring: 'ring-slate-300',
        accent: 'text-slate-700', check: 'text-slate-600', tint: 'from-slate-50', cta: 'from-slate-700 to-slate-900', shadow: 'shadow-slate-900/20',
    },
    premium: {
        gradient: 'from-amber-400 to-orange-600', icon: Star, ring: 'ring-orange-300',
        accent: 'text-orange-600', check: 'text-orange-500', tint: 'from-orange-50', cta: 'from-amber-500 to-orange-600', shadow: 'shadow-orange-500/30',
    },
    relationship_manager: {
        gradient: 'from-purple-500 to-indigo-700', icon: Crown, ring: 'ring-purple-300',
        accent: 'text-indigo-600', check: 'text-indigo-500', tint: 'from-indigo-50', cta: 'from-purple-600 to-indigo-700', shadow: 'shadow-indigo-500/30',
    },
    custom: {
        gradient: 'from-emerald-500 to-teal-700', icon: Zap, ring: 'ring-emerald-300',
        accent: 'text-emerald-600', check: 'text-emerald-500', tint: 'from-emerald-50', cta: 'from-emerald-500 to-teal-700', shadow: 'shadow-emerald-500/30',
    },
};

const fmt = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const FeatureRow = ({ text, checkClass = 'text-emerald-500' }) => (
    <div className="flex items-start gap-2.5">
        <CheckCircle size={15} className={`${checkClass} mt-0.5 shrink-0`} />
        <span className="text-sm text-slate-800 leading-tight">{text}</span>
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
    // Already-subscribed listings stay visible so an empty picker never looks
    // like the listing went missing. One on a LOWER plan can be upgraded; one
    // on the same or a higher plan is disabled.
    const available = properties;
    const planRank = plan.tierRank ?? 0;
    const isBlocked = (p) => p.hasActiveSubscription && (p.currentTierRank ?? 0) >= planRank;

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
                            const blocked = isBlocked(p);
                            const isUpgrade = p.hasActiveSubscription && !blocked;
                            return (
                                <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => toggle(p._id)}
                                    disabled={blocked}
                                    className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border-2 text-left transition-all ${
                                        blocked ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' :
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
                                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                            Current: {p.currentPlanName || 'Free'}
                                            {isUpgrade && <span className="text-orange-600"> · will be upgraded</span>}
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        {blocked ? (
                                            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {(p.currentTierRank ?? 0) === planRank ? 'Current Plan' : 'Higher Plan'}
                                            </span>
                                        ) : isSelected ? (
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
    const [searchParams] = useSearchParams();
    const scopedPropertyId = searchParams.get('propertyId');
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('sale');
    const [availableModes, setAvailableModes] = useState([]);
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
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
            // When opened from a listing's Boost button, the property decides
            // the mode: a rental listing only sees rental plans, sale only sale.
            const res = await propertySubscriptionService.getCatalog(
                scopedPropertyId ? { propertyId: scopedPropertyId } : { mode: m }
            );
            if (res.success) {
                const modesForTabs = scopedPropertyId ? (res.modes || []) : (res.availableModes || []);
                setAvailableModes(modesForTabs);
                if (!modesForTabs.includes(m) && modesForTabs.length) {
                    setMode(modesForTabs[0]);
                    return;
                }
                setPlans(res.plans || []);
                setCurrentPlan(res.currentPlan || null);
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
            console.debug('[boost] picker', { scopedPropertyId, mode });
            const res = await propertySubscriptionService.getEligibleProperties(mode);
            console.debug('[boost] eligible', res);
            if (res.success) {
                const all = res.properties || [];
                setProperties(scopedPropertyId ? all.filter((p) => p._id === scopedPropertyId) : all);
            }
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
                loadCatalog(mode);
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
                            loadCatalog(mode);
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
        <div className="min-h-screen bg-[#F5F6F8] pb-28">
            <div className="sticky top-0 z-30 bg-white shadow-sm">
                <div className="flex items-center gap-3 px-4 h-14 bg-orange-600 text-white">
                    <button onClick={handleBack} aria-label="Back" className="p-1 -ml-1">
                        <ArrowLeft size={22} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-medium leading-tight">Boost Your Listings</h1>
                        <p className="text-xs text-white/75 truncate">Subscribe a property to get more visibility</p>
                    </div>
                </div>

                {availableModes.length > 1 && (
                    <div className="flex border-b border-[#E0E0E0]" role="tablist">
                        {availableModes.map((m) => (
                            <button
                                key={m}
                                role="tab"
                                aria-selected={mode === m}
                                onClick={() => setMode(m)}
                                className={`flex-1 py-3 text-[15px] capitalize relative flex items-center justify-center gap-1.5 ${mode === m ? 'text-orange-600 font-semibold' : 'text-slate-500 font-medium'}`}
                            >
                                {m === 'sale' ? <Home size={15} /> : <Building2 size={15} />} {m}
                                {mode === m && <span className="absolute bottom-0 inset-x-0 h-[3px] bg-orange-600" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4 pt-4 max-w-2xl mx-auto">
                {activeSubs.length > 0 && (
                    <div className="mb-6 space-y-3">
                        <h2 className="text-sm font-semibold text-slate-600 px-1">Active subscriptions</h2>
                        {activeSubs.map((s) => (
                            <div key={s._id} className="bg-white border border-[#E0E0E0] border-l-4 border-l-emerald-500 rounded p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                                        <TrendingUp size={15} className="text-emerald-600" /> {s.planName}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {s.propertyIds?.length || 0} listing(s) · expires {fmtDate(s.expiryDate)}
                                    </p>
                                </div>
                                <span className="text-[11px] font-semibold uppercase px-2.5 py-1 rounded bg-emerald-50 text-emerald-700">
                                    {s.mode}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {currentPlan && !loading && (
                    <div className="mb-4 bg-white border border-[#E0E0E0] rounded p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <ShieldCheck size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-slate-500">
                                {scopedPropertyId ? 'This listing is on' : 'Your current plan'}
                            </p>
                            <p className="font-bold text-slate-900 truncate">{currentPlan.planName || 'Free'}</p>
                        </div>
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
                            const state = plan.planState || 'upgrade';
                            const isPaid = Number(plan.price) > 0;

                            return (
                                <motion.div
                                    key={plan._id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className={`relative bg-white border rounded ${state === 'current' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-[#E0E0E0]'} ${state === 'included' ? 'opacity-60' : ''}`}
                                >
                                    {state === 'current' ? (
                                        <span className="absolute -top-px right-4 text-[11px] font-semibold px-2.5 py-1 rounded-b bg-emerald-50 text-emerald-700">
                                            Current Plan
                                        </span>
                                    ) : state === 'upgrade' && plan.planTier === 'premium' && (
                                        <span className="absolute -top-px right-4 text-[11px] font-semibold px-2.5 py-1 rounded-b bg-[#FFF3E0] text-orange-700">
                                            Recommended
                                        </span>
                                    )}
                                    <div className="flex items-center gap-3 px-4 pt-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                            <Icon size={19} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-bold text-slate-900 leading-tight">{plan.name}</h3>
                                            {plan.tagline && <p className="text-sm text-slate-500 truncate">{plan.tagline}</p>}
                                        </div>
                                    </div>

                                    <div className="px-4 pt-4 flex items-baseline gap-1.5">
                                        <span className="text-[28px] font-bold text-slate-900">{fmt(plan.price)}</span>
                                        <span className="text-sm text-slate-500">for {plan.durationDays} days</span>
                                    </div>

                                    <div className="px-4 pt-3 pb-4 space-y-2.5 border-b border-[#E0E0E0]">
                                        {highlights.map((h) => <FeatureRow key={h} text={h} checkClass="text-emerald-600" />)}
                                    </div>

                                    <div className="p-4">
                                        {state === 'upgrade' ? (
                                            <button
                                                onClick={() => openPicker(plan)}
                                                className="w-full py-3 rounded bg-orange-600 hover:bg-orange-700 text-white text-[15px] font-semibold transition active:scale-[0.99]"
                                            >
                                                Upgrade Now
                                            </button>
                                        ) : state === 'current' ? (
                                            <>
                                                <button
                                                    disabled
                                                    className="w-full py-3 rounded bg-emerald-50 text-emerald-700 text-[15px] font-semibold border border-emerald-200 cursor-default"
                                                >
                                                    Current Plan
                                                </button>
                                                {/* Plans attach per listing: the same plan can still go on a listing that has none yet. */}
                                                {isPaid && !scopedPropertyId && (
                                                    <button
                                                        onClick={() => openPicker(plan)}
                                                        className="w-full mt-2 text-sm font-semibold text-orange-600 hover:underline"
                                                    >
                                                        Add to another listing
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                disabled
                                                className="w-full py-3 rounded bg-slate-100 text-slate-500 text-[15px] font-semibold cursor-default"
                                            >
                                                Included in your plan
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 bg-orange-50 rounded p-4 flex items-start gap-3 border border-orange-100">
                    <AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-orange-800 leading-relaxed font-medium">
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
