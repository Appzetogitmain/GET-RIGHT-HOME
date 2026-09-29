import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Package, Crown, Star, Zap, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import propertySubscriptionService from '../../services/propertySubscriptionService';

// §2 of the property-subscription architecture: the choice between a free
// listing and a subscription listing belongs INSIDE the posting flow, for the
// specific property just created — not a separate page the user has to find
// their way back to (and re-pick the property in a picker) afterwards. This
// is that inline step: mode is already known (the property decides it), so
// there is no mode tab and no property picker — just "pick a plan, pay, done".
const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
});

const TIER_CONFIG = {
    basic: { gradient: 'from-slate-500 to-slate-700', icon: Package },
    premium: { gradient: 'from-amber-400 to-orange-600', icon: Star },
    relationship_manager: { gradient: 'from-purple-500 to-indigo-700', icon: Crown },
    custom: { gradient: 'from-emerald-500 to-teal-700', icon: Zap },
};

const fmt = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

const planHighlights = (plan) => {
    const lines = [];
    const f = (key) => plan.features?.find((x) => x.key === key)?.value;
    const leadLimit = f('lead_limit');
    if (leadLimit != null) lines.push(Number(leadLimit) > 0 ? `${leadLimit} leads unlocked` : 'Unlimited leads');
    const rankWeight = f('ranking_weight');
    if (rankWeight) lines.push(`Search ranking boost`);
    if (f('showcase')) lines.push('Featured showcase placement');
    if (f('verified_badge')) lines.push('Verified badge');
    return lines;
};

const InlinePropertySubscribe = ({ propertyId, user, onActivated, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState(null);
    const [plans, setPlans] = useState([]);
    const [submitting, setSubmitting] = useState(null); // planId being purchased
    const purchaseInFlightRef = useRef(false);

    useEffect(() => {
        if (window.lenis) window.lenis.stop();
        return () => {
            if (window.lenis) window.lenis.start();
        };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await propertySubscriptionService.getCatalog({ propertyId });
                if (res.success) {
                    setMode(res.property?.mode || res.modes?.[0] || null);
                    setPlans(res.plans || []);
                } else {
                    toast.error(res.message || 'Could not load plans');
                }
            } catch (err) {
                toast.error('Could not load plans');
            } finally {
                setLoading(false);
            }
        })();
    }, [propertyId]);

    const handlePurchase = async (plan) => {
        if (purchaseInFlightRef.current) return;
        purchaseInFlightRef.current = true;
        setSubmitting(plan._id);
        const isFree = Number(plan.price) <= 0;
        const tid = toast.loading(isFree ? 'Activating plan...' : 'Initializing payment...');

        try {
            const res = await propertySubscriptionService.createCheckout({ planId: plan._id, propertyIds: [propertyId] });
            if (!res.success) {
                toast.error(res.message || 'Could not start checkout', { id: tid });
                return;
            }
            if (res.free) {
                toast.success('Subscription activated!', { id: tid });
                onActivated(res.subscription);
                return;
            }

            const loaded = await loadRazorpay();
            if (!loaded) throw new Error('Razorpay SDK failed to load');

            new window.Razorpay({
                key: res.key,
                amount: res.order.amount,
                currency: res.order.currency,
                name: 'GetRightHome',
                description: `${res.plan.name} — this listing`,
                order_id: res.order.id,
                prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
                theme: { color: '#005B9F' },
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
                            onActivated(verify.subscription);
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
            setSubmitting(null);
        }
    };

    return (
        <div data-lenis-prevent="true" className="flex flex-col max-h-[85vh] md:max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-3.5 shrink-0 border-b border-slate-100 bg-white">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 active:scale-95 transition-all mb-2 cursor-pointer"
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    Choose a {mode === 'rental' ? 'Rental' : 'Sale'} plan
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">Attached to this listing only — it won't affect your other properties.</p>
            </div>

            {/* Scrollable Plans List */}
            <div 
                data-lenis-prevent="true"
                className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3.5 custom-scrollbar"
                style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y'
                }}
            >
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
                ) : plans.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No plans available for this listing right now.</p>
                ) : (
                    plans.map((plan) => {
                        const cfg = TIER_CONFIG[plan.planTier] || TIER_CONFIG.basic;
                        const Icon = cfg.icon;
                        const highlights = planHighlights(plan);
                        const isSubmittingThis = submitting === plan._id;
                        return (
                            <div key={plan._id} className="border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs transition-all">
                                <div className={`px-4 py-2.5 bg-gradient-to-r ${cfg.gradient} flex items-center gap-2`}>
                                    <Icon size={15} className="text-white shrink-0" />
                                    <span className="text-white font-bold text-sm">{plan.name}</span>
                                    <span className="ml-auto text-white font-black text-sm">{fmt(plan.price)}</span>
                                </div>
                                <div className="px-4 py-3 bg-white">
                                    <div className="space-y-1.5 mb-3">
                                        {highlights.map((h) => (
                                            <div key={h} className="flex items-center gap-1.5 text-xs text-slate-600">
                                                <CheckCircle size={12} className="text-emerald-500 shrink-0" /> {h}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handlePurchase(plan)}
                                        disabled={!!submitting}
                                        className="w-full py-2.5 rounded-xl bg-[#005B9F] hover:bg-[#004a83] active:scale-[0.98] text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                                    >
                                        {isSubmittingThis ? 'Processing...' : `Get ${plan.name}`}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default InlinePropertySubscribe;
