import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, CheckCircle, ShieldCheck, Package, Clock,
    Crown, Zap, Star, AlertCircle, Loader2, Play, Pause
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import subscriptionService from '../../services/subscriptionService';

const loadRazorpay = () => new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
});

import { useAuth } from '../../context/AuthContext';

const TIER_CONFIG = {
    silver: { gradient: 'from-slate-400 to-slate-600', icon: Package, bg: 'bg-slate-50', text: 'text-slate-700' },
    gold_basic: { gradient: 'from-amber-300 to-amber-500', icon: Star, bg: 'bg-amber-50', text: 'text-amber-700' },
    gold: { gradient: 'from-yellow-400 to-yellow-600', icon: Crown, bg: 'bg-yellow-50', text: 'text-yellow-700' },
    platinum: { gradient: 'from-blue-400 to-blue-600', icon: ShieldCheck, bg: 'bg-blue-50', text: 'text-blue-700' },
    diamond: { gradient: 'from-purple-500 to-indigo-600', icon: Zap, bg: 'bg-purple-50', text: 'text-purple-700' },
};

const FeatureRow = ({ text, highlighted }) => (
    <div className="flex items-start gap-2.5">
        <CheckCircle size={14} className={highlighted ? 'text-emerald-500 mt-0.5' : 'text-gray-300 mt-0.5'} />
        <span className={`text-xs font-semibold leading-tight ${highlighted ? 'text-gray-800' : 'text-gray-400'}`}>{text}</span>
    </div>
);

const UserSubscriptionsPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null); // Changed from boolean to planId
    const [plans, setPlans] = useState([]);
    const [currentSub, setCurrentSub] = useState(null);
    const { user } = useAuth();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansRes, subRes] = await Promise.all([
                subscriptionService.getActivePlans(),
                subscriptionService.getCurrentSubscription()
            ]);
            if (plansRes.success) {
                const order = ['silver', 'gold_basic', 'gold', 'platinum', 'diamond'];
                setPlans(plansRes.plans.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier)));
            }
            if (subRes.success) setCurrentSub(subRes.subscription);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (plan) => {
        if (processing) return;
        setProcessing(plan._id);
        const tid = toast.loading('Initializing payment...');
        try {
            const loaded = await loadRazorpay();
            if (!loaded) throw new Error('Razorpay SDK failed');

            const { order, key } = await subscriptionService.createSubscriptionOrder(plan._id);

            new window.Razorpay({
                key,
                amount: order.amount,
                currency: order.currency,
                name: 'Get Right Home',
                description: `Plan: ${plan.name}`,
                order_id: order.id,
                prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
                theme: { color: '#059669' },
                handler: async (response) => {
                    try {
                        toast.loading('Verifying...', { id: tid });
                        const res = await subscriptionService.verifySubscription({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId: plan._id,
                        });
                        if (res.success) {
                            toast.success('Plan activated!', { id: tid });
                            setCurrentSub(res.subscription);
                            fetchData();
                        } else {
                            toast.error('Verification failed', { id: tid });
                        }
                    } catch (e) {
                        toast.error('Payment verification failed', { id: tid });
                    }
                }
            }).open();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not start payment', { id: tid });
        } finally {
            setProcessing(null);
        }
    };

    const handleTogglePause = async () => {
        try {
            const res = await subscriptionService.togglePause();
            if (res.success) {
                toast.success(res.message);
                setCurrentSub(p => ({ ...p, isPaused: res.subscription.isPaused }));
            }
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const fmt = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const isExpired = currentSub?.status === 'expired' || (currentSub?.expiryDate && new Date(currentSub.expiryDate) < new Date());
    const isActive = currentSub?.status === 'active' && !isExpired;

    return (
        <div className="min-h-screen bg-gray-50 pb-28">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                        <ArrowLeft size={18} className="text-gray-700" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-gray-900">Subscription Plans</h1>
                        <p className="text-xs text-gray-400 font-medium">Boost your property's visibility</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 max-w-2xl mx-auto">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                    </div>
                ) : (
                    <>
                        {/* Current Plan Banner */}
                        {currentSub?.planId && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 bg-gray-900 rounded-3xl p-5 text-white relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40'}`}>
                                            {isActive ? (currentSub.isPaused ? '⏸ Paused' : '● Active') : 'Expired'}
                                        </span>
                                        {currentSub.planId.tier === 'gold' && isActive && (
                                            <button onClick={handleTogglePause} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition border border-white/10">
                                                {currentSub.isPaused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
                                            </button>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-black flex items-center gap-2 mb-1">
                                        {currentSub.planId.name} <ShieldCheck size={20} className="text-emerald-400" />
                                    </h2>
                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Properties</p>
                                            <p className="text-lg font-black">{currentSub.propertiesAdded}<span className="text-xs text-gray-500">/{currentSub.planId.maxProperties}</span></p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Leads</p>
                                            <p className="text-lg font-black">{currentSub.leadsUsedThisMonth}<span className="text-xs text-gray-500">/{currentSub.planId.leadCap || '∞'}</span></p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Expires</p>
                                            <p className="text-sm font-black">{fmtDate(currentSub.expiryDate)}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Plan Cards */}
                        <div className="space-y-4">
                            {plans.map((plan, i) => {
                                const cfg = TIER_CONFIG[plan.tier] || TIER_CONFIG.silver;
                                const PlanIcon = cfg.icon;
                                const isCurrent = currentSub?.planId?._id === plan._id && isActive;

                                return (
                                    <motion.div
                                        key={plan._id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className={`bg-white rounded-3xl border-2 overflow-hidden ${isCurrent ? 'border-emerald-400 shadow-lg shadow-emerald-100' : 'border-gray-100'}`}
                                    >
                                        {/* Plan Header */}
                                        <div className={`h-16 bg-gradient-to-r ${cfg.gradient} flex items-center px-5 gap-3`}>
                                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                <PlanIcon size={18} className="text-white" />
                                            </div>
                                            <span className="text-white font-black text-base">{plan.name}</span>
                                            {isCurrent && <span className="ml-auto text-[10px] bg-white text-emerald-600 font-black px-2.5 py-1 rounded-full">Current Plan</span>}
                                        </div>

                                        <div className="p-5">
                                            {/* Price */}
                                            <div className="flex items-baseline gap-1.5 mb-4">
                                                <span className="text-3xl font-black text-gray-900">₹{plan.price}</span>
                                                <span className="text-gray-400 text-xs font-bold uppercase">/ {plan.durationDays} days</span>
                                            </div>

                                            {/* Features */}
                                            <div className="space-y-2.5 mb-5">
                                                <FeatureRow text={`Up to ${plan.maxProperties} properties`} highlighted />
                                                <FeatureRow text={plan.leadCap > 0 ? `${plan.leadCap} leads/month` : 'Unlimited leads'} highlighted />
                                                {plan.rankingWeight > 1 && <FeatureRow text={`Priority ranking (Boost x${plan.rankingWeight})`} highlighted />}
                                                {plan.hasVerifiedTag && <FeatureRow text="Verified badge on listings" highlighted />}
                                                {plan.bannerType && plan.bannerType !== 'none' && <FeatureRow text={`${plan.bannerType.charAt(0).toUpperCase() + plan.bannerType.slice(1)} banner placement`} highlighted />}
                                                {plan.pauseDaysAllowed > 0 && <FeatureRow text={`${plan.pauseDaysAllowed} pause days included`} highlighted />}
                                            </div>

                                            <button
                                                onClick={() => handlePurchase(plan)}
                                                disabled={!!processing || isCurrent}
                                                className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95 ${isCurrent
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : processing === plan._id ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-900 text-white hover:bg-black shadow-lg'
                                                    }`}
                                            >
                                                {isCurrent ? '✓ Active Plan' : processing === plan._id ? 'Processing...' : 'Get This Plan'}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {plans.length === 0 && (
                            <div className="text-center py-16">
                                <Package size={40} className="text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium">No plans available right now</p>
                            </div>
                        )}

                        {/* Info Note */}
                        <div className="mt-6 bg-blue-50 rounded-2xl p-4 flex items-start gap-3 border border-blue-100">
                            <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                Plans are non-refundable. Higher-tier plans give your properties more visibility,
                                ranking boosts, and verified badges to attract more bookings.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default UserSubscriptionsPage;
