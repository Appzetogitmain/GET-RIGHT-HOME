import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Gift, Copy, Share2, Users, ChevronRight,
    Ticket, Clock, CheckCircle, TrendingUp, Sparkles,
    MessageCircle, Twitter, Facebook, Mail, ExternalLink,
    AlertCircle, Tag, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { referralService } from '../../services/apiService';

const ReferAndEarnPage = () => {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);
    const [copiedVoucher, setCopiedVoucher] = useState(null);
    const [activeTab, setActiveTab] = useState('invite');
    const [loading, setLoading] = useState(true);
    const [referralData, setReferralData] = useState({
        code: "...",
        link: "",
        stats: { invited: 0, joined: 0, bookings: 0, activeVouchersCount: 0 },
        history: [],
        vouchers: []
    });

    const [program, setProgram] = useState({
        rewardType: 'flat',
        rewardValue: 200,
        validityDays: 30,
        minOrderAmount: 0
    });

    const codeRef = useRef(null);

    const loadData = async () => {
        try {
            const [statsRes, programRes, vouchersRes] = await Promise.all([
                referralService.getMyStats().catch(() => ({ success: false })),
                referralService.getActiveProgram().catch(() => null),
                referralService.getMyVouchers().catch(() => ({ success: false }))
            ]);

            if (statsRes?.success && statsRes.data) {
                const data = statsRes.data;
                setReferralData({
                    code: data.code || '...',
                    link: data.link || '',
                    stats: data.stats || { invited: 0, joined: 0, bookings: 0, activeVouchersCount: 0 },
                    history: data.history || [],
                    vouchers: data.vouchers || []
                });

                if (data.program) {
                    setProgram({
                        rewardType: data.program.rewardType || 'flat',
                        rewardValue: data.program.rewardValue ?? 200,
                        validityDays: data.program.validityDays || 30,
                        minOrderAmount: data.program.minOrderAmount || 0
                    });
                }
            }

            if (vouchersRes?.success && vouchersRes.data) {
                setReferralData(prev => ({
                    ...prev,
                    vouchers: vouchersRes.data,
                    stats: {
                        ...prev.stats,
                        activeVouchersCount: vouchersRes.data.filter(v => v.status === 'active').length
                    }
                }));
            }

            if (programRes?.success && programRes.program) {
                setProgram({
                    rewardType: programRes.program.rewardType || 'flat',
                    rewardValue: programRes.program.rewardValue ?? programRes.program.rewardAmount ?? 200,
                    validityDays: programRes.program.validityDays || 30,
                    minOrderAmount: programRes.program.minOrderAmount || 0
                });
            }
        } catch (err) {
            console.error("Failed to load referral data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCopyCode = () => {
        if (!referralData.code || referralData.code === '...') return;
        navigator.clipboard.writeText(referralData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyVoucher = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedVoucher(code);
        setTimeout(() => setCopiedVoucher(null), 2000);
    };

    const rewardTitle = program.rewardType === 'percentage'
        ? `${program.rewardValue}% OFF`
        : `₹${program.rewardValue} OFF`;

    const rewardFullLabel = program.rewardType === 'percentage'
        ? `${program.rewardValue}% OFF Voucher`
        : `₹${program.rewardValue} Service Voucher`;

    const shareOptions = [
        {
            icon: MessageCircle,
            label: "WhatsApp",
            color: "bg-[#25D366]",
            action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`Hey! Book verified home services & properties on GetRightHome. Use my referral code *${referralData.code}* to get ${rewardTitle} on your first booking! ${referralData.link}`)}`)
        },
        {
            icon: Twitter,
            label: "Twitter / X",
            color: "bg-[#1DA1F2]",
            action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Get ${rewardTitle} on verified Home Services with GetRightHome! Use my code: ${referralData.code} ${referralData.link}`)}`)
        },
        {
            icon: Mail,
            label: "Email",
            color: "bg-gray-700",
            action: () => window.open(`mailto:?subject=${encodeURIComponent(`Get ${rewardTitle} on GetRightHome`)}&body=${encodeURIComponent(`Hey!\n\nUse my referral code ${referralData.code} to get ${rewardTitle} on your Home Services booking with GetRightHome:\n${referralData.link}`)}`)
        },
    ];

    const howItWorks = [
        {
            step: 1,
            title: "Share Your Code",
            desc: "Send your unique referral code to friends and family",
            icon: Share2
        },
        {
            step: 2,
            title: "Friend Signs Up",
            desc: "They register on GetRightHome using your code",
            icon: Users
        },
        {
            step: 3,
            title: "They Complete 1st Service",
            desc: "Friend books and completes their first Home Service",
            icon: CheckCircle
        },
        {
            step: 4,
            title: "You Get A Service Voucher",
            desc: `Single-use ${rewardTitle} discount coupon unlocks for your next Home Service!`,
            icon: Ticket
        },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    const handleShare = async () => {
        const shareData = {
            title: `Join GetRightHome & Get ${rewardTitle}!`,
            text: `Hey! Book verified home services on GetRightHome. Use my referral code ${referralData.code} to get ${rewardTitle} on your first booking!`,
            url: referralData.link || 'https://getrighthome.com'
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            handleCopyCode();
        }
    };

    const activeVouchers = referralData.vouchers.filter(v => v.status === 'active');
    const redeemedVouchers = referralData.vouchers.filter(v => v.status === 'redeemed');
    const expiredVouchers = referralData.vouchers.filter(v => v.status === 'expired');

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950 text-slate-100">

            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Go Back"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-bold text-white flex items-center gap-2 justify-center">
                            Refer & Earn <Sparkles size={16} className="text-amber-400" />
                        </h1>
                        <p className="text-[11px] text-amber-300 font-medium">Home Services Voucher Rewards</p>
                    </div>
                    <button
                        onClick={() => setActiveTab('vouchers')}
                        className="relative p-2 bg-amber-500/20 text-amber-300 rounded-full hover:bg-amber-500/30 transition-colors"
                        title="My Vouchers"
                    >
                        <Ticket size={20} />
                        {activeVouchers.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                {activeVouchers.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative px-5 pt-8 pb-10 text-center overflow-hidden max-w-2xl mx-auto">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 right-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative z-10 w-24 h-24 mx-auto mb-5 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/30"
                >
                    <Ticket size={48} className="text-slate-950" />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 border-2 border-amber-400 rounded-full flex items-center justify-center shadow-lg"
                    >
                        <Gift size={16} className="text-amber-400" />
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-xs font-semibold mb-3"
                >
                    <Tag size={13} /> Single-Use Discount Coupon
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight"
                >
                    Earn {rewardFullLabel}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed"
                >
                    Get a discount voucher redeemable on Home Services for every friend who completes their first service booking.
                </motion.p>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-4 gap-2 bg-slate-900/80 border border-white/10 rounded-2xl p-4 mt-6 shadow-xl backdrop-blur-md"
                >
                    <div className="text-center">
                        <p className="text-xl font-black text-white">{referralData.stats.invited || 0}</p>
                        <p className="text-[11px] text-slate-400 font-medium">Invited</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                        <p className="text-xl font-black text-sky-400">{referralData.stats.joined || 0}</p>
                        <p className="text-[11px] text-slate-400 font-medium">Joined</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                        <p className="text-xl font-black text-emerald-400">{referralData.stats.bookings || 0}</p>
                        <p className="text-[11px] text-slate-400 font-medium">Completed</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                        <p className="text-xl font-black text-amber-400">{activeVouchers.length}</p>
                        <p className="text-[11px] text-slate-400 font-medium">Vouchers</p>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 bg-slate-900/90 border-t border-white/10 rounded-t-[32px] min-h-[60vh] max-w-2xl mx-auto shadow-2xl pb-24">

                {/* Navigation Tabs */}
                <div className="flex gap-2 px-5 pt-6 pb-4">
                    {[
                        { id: 'invite', label: 'Invite & Earn' },
                        { id: 'vouchers', label: `My Vouchers (${activeVouchers.length})` },
                        { id: 'history', label: 'History' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                                : 'bg-slate-800/80 text-slate-300 border border-white/5 hover:bg-slate-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="px-5">
                    <AnimatePresence mode="wait">

                        {/* INVITE TAB */}
                        {activeTab === 'invite' && (
                            <motion.div
                                key="invite"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-6"
                            >
                                {/* Referral Code Box */}
                                <div className="bg-slate-950/70 rounded-2xl p-5 border border-amber-500/20 shadow-inner">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Your Referral Code</p>
                                        <span className="text-[11px] text-slate-400">Share with friends</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div
                                            ref={codeRef}
                                            className="flex-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-dashed border-amber-500/40 rounded-xl px-4 py-3 text-center"
                                        >
                                            <span className="text-2xl font-black text-amber-300 tracking-widest">{referralData.code}</span>
                                        </div>
                                        <button
                                            onClick={handleCopyCode}
                                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${copied
                                                ? 'bg-emerald-500 text-white scale-95'
                                                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                                                }`}
                                            title="Copy Code"
                                        >
                                            {copied ? <CheckCircle size={24} /> : <Copy size={24} />}
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {copied && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="text-center text-xs font-bold text-emerald-400 mt-2"
                                            >
                                                ✓ Referral code copied to clipboard!
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Share Buttons */}
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Quick Share</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {shareOptions.map((option, i) => (
                                            <motion.button
                                                key={i}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={option.action}
                                                className="flex flex-col items-center gap-2 p-3.5 bg-slate-800/80 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all shadow-sm"
                                            >
                                                <div className={`w-11 h-11 ${option.color} rounded-full flex items-center justify-center text-white shadow-md`}>
                                                    <option.icon size={20} />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-200">{option.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* How It Works */}
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">How It Works</p>
                                    <div className="bg-slate-950/60 rounded-2xl p-5 border border-white/5 space-y-4">
                                        {howItWorks.map((item, i) => (
                                            <div key={i} className="flex items-start gap-4">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                                        <item.icon size={18} />
                                                    </div>
                                                    {i < howItWorks.length - 1 && (
                                                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-800" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pt-0.5">
                                                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                                                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                                                </div>
                                                <span className="text-xs font-black text-slate-600">{item.step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Reward Rules Note */}
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                                    <ShieldCheck size={20} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-slate-300 leading-relaxed">
                                        <span className="font-bold text-amber-300">Voucher Validity & Rules:</span> Vouchers are single-use only and strictly applicable on Home Services bookings. Cannot be exchanged for cash or transferred. Valid for {program.validityDays} days from issuance.
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* MY VOUCHERS TAB */}
                        {activeTab === 'vouchers' && (
                            <motion.div
                                key="vouchers"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Your Earned Coupons</p>
                                    <span className="text-xs text-amber-400 font-semibold">{activeVouchers.length} Active</span>
                                </div>

                                {/* Active Vouchers */}
                                {activeVouchers.length > 0 && (
                                    <div className="space-y-3">
                                        {activeVouchers.map((voucher) => (
                                            <div
                                                key={voucher.id || voucher.code}
                                                className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-4 border-2 border-amber-500/40 relative overflow-hidden shadow-xl"
                                            >
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-8 -mt-8 blur-lg pointer-events-none" />

                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div>
                                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                                                            Single-Use Coupon
                                                        </span>
                                                        <h4 className="text-base font-black text-white mt-1">
                                                            {voucher.discountType === 'percentage'
                                                                ? `${voucher.discountValue}% OFF Home Services`
                                                                : `₹${voucher.discountValue} OFF Home Services`}
                                                        </h4>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-bold uppercase">
                                                        Active
                                                    </span>
                                                </div>

                                                <p className="text-xs text-slate-400 mb-3">
                                                    {voucher.description || 'Redeem on your next Home Service checkout.'}
                                                    {voucher.minOrderAmount > 0 ? ` Min order ₹${voucher.minOrderAmount}.` : ''}
                                                </p>

                                                {/* Voucher Code Box & Actions */}
                                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                                                    <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-dashed border-amber-400/50">
                                                        <span className="text-sm font-mono font-bold text-amber-300 tracking-wider">{voucher.code}</span>
                                                        <button
                                                            onClick={() => handleCopyVoucher(voucher.code)}
                                                            className="p-1 text-slate-400 hover:text-white transition-colors"
                                                            title="Copy Voucher Code"
                                                        >
                                                            {copiedVoucher === voucher.code ? (
                                                                <CheckCircle size={15} className="text-emerald-400" />
                                                            ) : (
                                                                <Copy size={15} />
                                                            )}
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => navigate('/native')}
                                                        className="px-3.5 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                                                    >
                                                        Book Service <ChevronRight size={14} />
                                                    </button>
                                                </div>

                                                {voucher.expiresAt && (
                                                    <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">
                                                        <Clock size={12} className="text-amber-400/80" />
                                                        <span>Expires on: {new Date(voucher.expiresAt).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Redeemed Vouchers */}
                                {redeemedVouchers.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Redeemed Coupons</p>
                                        {redeemedVouchers.map((voucher) => (
                                            <div
                                                key={voucher.id || voucher.code}
                                                className="bg-slate-950/40 rounded-xl p-3 border border-white/5 opacity-70 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-300 font-mono line-through">{voucher.code}</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {voucher.discountType === 'percentage' ? `${voucher.discountValue}% OFF` : `₹${voucher.discountValue} OFF`} • Used on Home Service
                                                    </p>
                                                </div>
                                                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase">
                                                    Redeemed
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Expired Vouchers */}
                                {expiredVouchers.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Expired Coupons</p>
                                        {expiredVouchers.map((voucher) => (
                                            <div
                                                key={voucher.id || voucher.code}
                                                className="bg-slate-950/40 rounded-xl p-3 border border-white/5 opacity-50 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 font-mono">{voucher.code}</p>
                                                    <p className="text-[11px] text-slate-500">Expired on {new Date(voucher.expiresAt).toLocaleDateString()}</p>
                                                </div>
                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] font-bold uppercase">
                                                    Expired
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {referralData.vouchers.length === 0 && (
                                    <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-white/5 p-6">
                                        <div className="w-16 h-16 mx-auto mb-3 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
                                            <Ticket size={28} />
                                        </div>
                                        <h4 className="font-bold text-white text-base">No Vouchers Yet</h4>
                                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                            Invite friends to GetRightHome. Once they complete their first Home Service booking, your single-use voucher will appear here!
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('invite')}
                                            className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
                                        >
                                            Invite Friends Now
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-3"
                            >
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Referral Activity</p>

                                {referralData.history.map((item, i) => (
                                    <motion.div
                                        key={item.id || i}
                                        initial={{ opacity: 0, x: -15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 flex items-center gap-3.5"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs shadow-md shrink-0">
                                            {item.avatar || '??'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                                            <p className="text-[11px] text-slate-400">
                                                Joined {new Date(item.date).toLocaleDateString()}
                                            </p>
                                            {item.voucherCode && (
                                                <p className="text-[11px] text-amber-300 font-mono mt-0.5">
                                                    Coupon: {item.voucherCode}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-bold text-xs ${item.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {item.rewardType === 'percentage' ? `${item.rewardValue}% OFF` : `₹${item.rewardValue} OFF`}
                                            </p>
                                            <span className={`text-[10px] font-bold uppercase inline-block px-2 py-0.5 rounded-full mt-1 ${item.status === 'completed'
                                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                                : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                                }`}>
                                                {item.status === 'completed' ? 'Voucher Issued' : 'Pending 1st Service'}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}

                                {referralData.history.length === 0 && (
                                    <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-white/5 p-6">
                                        <div className="w-16 h-16 mx-auto mb-3 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                            <Users size={28} />
                                        </div>
                                        <h4 className="font-bold text-white text-base">No Referrals Yet</h4>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Share your code to start earning single-use Home Service discount vouchers!
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Floating Share Button */}
            <motion.button
                initial={{ y: 80 }}
                animate={{ y: 0 }}
                whileTap={{ scale: 0.98 }}
                className="fixed bottom-6 left-5 right-5 max-w-2xl mx-auto bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 font-black py-4 rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center justify-center gap-2 z-30 transition-all text-sm sm:text-base cursor-pointer"
                onClick={handleShare}
            >
                <Share2 size={20} className="text-slate-950" />
                Invite Friends & Earn {rewardTitle} Voucher
            </motion.button>
        </div>
    );
};

export default ReferAndEarnPage;
