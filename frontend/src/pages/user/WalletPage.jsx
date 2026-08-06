import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, ArrowUpRight, ArrowDownLeft, ArrowLeft,
    X, IndianRupee, Loader2,
    Calendar, Wallet, AlertCircle, CheckCircle2
} from 'lucide-react';
import { api } from '../../services/apiService';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const WalletPage = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('user'); // 'user' (Spendings) or 'partner' (Earnings)
    const [showAddMoneySheet, setShowAddMoneySheet] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [hasProperties, setHasProperties] = useState(false);

    const quickAmounts = [500, 1000, 2000];

    useEffect(() => {
        checkOwnership();
        fetchWalletData();
        fetchTransactions();
    }, [viewMode]);

    const checkOwnership = async () => {
        try {
            const res = await api.get('/properties/my');
            if (res.data.success && res.data.properties?.length > 0) {
                setHasProperties(true);
            }
        } catch (e) {}
    };

    const fetchWalletData = async () => {
        try {
            const res = await api.get('/wallet/stats', { params: { viewAs: viewMode } });
            if (res.data.success) {
                setBalance(res.data.stats.currentBalance || 0);
                setStats(res.data.stats);
            }
        } catch (error) {
            console.error('Fetch Wallet Error:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const res = await api.get('/wallet/transactions', { params: { viewAs: viewMode } });
            if (res.data.success) {
                setTransactions(res.data.transactions);
            }
        } catch (error) {
            console.error('Fetch Transactions Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleAddMoney = async () => {
        const amount = Number(addAmount);
        if (!amount || amount < 10) {
            toast.error('Minimum amount is ₹10');
            return;
        }

        try {
            setProcessing(true);
            const res = await loadRazorpay();
            if (!res) {
                toast.error('Razorpay SDK failed to load');
                setProcessing(false);
                return;
            }

            // Create Order
            const { data } = await api.post('/wallet/add-money', { amount });
            if (!data.success) throw new Error('Order creation failed');

            const options = {
                key: data.order.key,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'Get-Right-Home',
                description: 'Wallet Top-up',
                order_id: data.order.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.post('/wallet/verify-add-money', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: amount
                        });

                        if (verifyRes.data.success) {
                            toast.success('Money added successfully!');
                            setBalance(verifyRes.data.newBalance);
                            fetchTransactions();
                            fetchWalletData();
                            setShowAddMoneySheet(false);
                            setAddAmount('');
                        }
                    } catch (err) {
                        toast.error('Payment verification failed');
                    }
                },
                theme: {
                    color: '#111827'
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (error) {
            console.error('Add Money Error:', error);
            toast.error(error.response?.data?.message || 'Failed to initiate payment');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#F8FAFC] pb-24 font-sans"
        >
            <Toaster position="top-center" />

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30 pt-safe-top">
                <div className="px-5 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors shrink-0"
                    >
                        <ArrowLeft size={18} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight">My Wallet</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Balance &amp; transaction history
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 pt-5 max-w-2xl mx-auto">
                {/* Balance Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-[1.75rem] p-6 shadow-lg shadow-gray-900/10 mb-6">
                    <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${viewMode === 'user' ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`} />

                    {hasProperties && (
                        <div className="relative flex bg-white/5 p-1 rounded-xl mb-6 max-w-[220px] border border-white/10">
                            <button
                                onClick={() => setViewMode('user')}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'user' ? 'bg-white text-gray-900' : 'text-white/50 hover:text-white'}`}
                            >
                                Spendings
                            </button>
                            <button
                                onClick={() => setViewMode('partner')}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'partner' ? 'bg-white text-gray-900' : 'text-white/50 hover:text-white'}`}
                            >
                                Earnings
                            </button>
                        </div>
                    )}

                    <p className="relative text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                        {viewMode === 'user' ? 'Available Balance' : 'Total Earnings'}
                    </p>
                    <div className="relative flex items-baseline text-white">
                        <span className="text-xl font-bold opacity-60 mr-1">₹</span>
                        <span className="text-4xl font-black tracking-tight">
                            {(viewMode === 'user' ? balance : (stats?.totalEarnings || 0)).toLocaleString('en-IN')}
                        </span>
                    </div>
                    {viewMode === 'partner' && (
                        <p className="relative mt-1.5 text-white/40 text-xs font-medium">
                            Withdrawal balance: ₹{balance.toLocaleString('en-IN')}
                        </p>
                    )}

                    <div className="relative mt-5 flex gap-2.5">
                        {viewMode === 'user' ? (
                            <button
                                onClick={() => setShowAddMoneySheet(true)}
                                className="flex-1 bg-white text-gray-900 py-3 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} strokeWidth={2.5} /> Add Money
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/my-received-bookings')}
                                    className="flex-1 bg-white text-gray-900 py-3 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Calendar size={16} /> View Orders
                                </button>
                                <button
                                    onClick={() => toast.success('Withdrawal logic same as Partner module is ready')}
                                    className="flex-1 bg-white/10 border border-white/15 text-white py-3 rounded-xl font-bold text-sm backdrop-blur-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowUpRight size={16} /> Withdraw
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Transactions List */}
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Recent Transactions</h2>

                {transactions.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Wallet size={22} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">No transactions yet</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {transactions.map((tx, idx) => (
                            <motion.div
                                key={tx._id || idx}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                onClick={() => setSelectedTransaction(tx)}
                                className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/60 flex items-center justify-between cursor-pointer hover:border-gray-200 active:scale-[0.99] transition-all"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.isBooking ? 'bg-orange-50 text-orange-600' :
                                        tx.category === 'booking_payment' ? 'bg-emerald-50 text-emerald-600' :
                                        tx.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
                                        }`}>
                                        {tx.isBooking ? <Calendar size={17} /> :
                                            tx.category === 'booking_payment' ? <CheckCircle2 size={17} /> :
                                            tx.type === 'credit' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-gray-900 text-[13px] truncate leading-tight">{tx.description || 'Transaction'}</h4>
                                        <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`font-bold text-[14px] whitespace-nowrap ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'
                                        }`}>
                                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount?.toLocaleString('en-IN')}
                                    </div>
                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize inline-block mt-1 ${tx.status === 'confirmed' || tx.status === 'success' ? 'bg-green-50 text-green-700' :
                                        tx.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {tx.status || 'Success'}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Money Sheet */}
            <AnimatePresence>
                {showAddMoneySheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddMoneySheet(false)}
                            className="fixed inset-0 bg-black z-[110]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[120] rounded-t-[1.75rem] p-6 pb-10 shadow-2xl safe-area-bottom"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Add Money to Wallet</h3>
                                <button onClick={() => setShowAddMoneySheet(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 mb-2 flex items-center gap-3 border border-gray-200 focus-within:border-gray-400 focus-within:ring-4 focus-within:ring-gray-100 transition-all">
                                <IndianRupee size={22} className="text-gray-400" />
                                <input
                                    type="number"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="flex-1 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
                                    autoFocus
                                />
                            </div>

                            {/* Validation Message */}
                            <div className="mb-5 px-1">
                                {!addAmount ? (
                                    <p className="text-xs text-gray-400 font-medium">Minimum amount required is ₹10</p>
                                ) : Number(addAmount) < 10 ? (
                                    <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                        <AlertCircle size={12} /> Minimum amount must be ₹10
                                    </p>
                                ) : (
                                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Valid amount
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2 mb-7 overflow-x-auto pb-1">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setAddAmount(String(amt))}
                                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all whitespace-nowrap"
                                    >
                                        +₹{amt}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleAddMoney}
                                disabled={processing || !addAmount || Number(addAmount) < 10}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2
                                    ${(!addAmount || Number(addAmount) < 10)
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/10'
                                    }`}
                            >
                                {processing && <Loader2 size={18} className="animate-spin" />}
                                {processing ? 'Processing...' : 'Proceed to Pay'}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Transaction Detail Sheet */}
            <AnimatePresence>
                {selectedTransaction && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTransaction(null)}
                            className="fixed inset-0 bg-black z-[110]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[120] rounded-t-[1.75rem] p-6 pb-12 shadow-2xl safe-area-bottom"
                        >
                            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

                            <div className="flex flex-col items-center mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${selectedTransaction.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
                                    }`}>
                                    {selectedTransaction.type === 'credit' ? <ArrowDownLeft size={26} /> : <ArrowUpRight size={26} />}
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 text-center leading-tight mb-1">
                                    {selectedTransaction.type === 'credit' ? '+' : '-'}₹{selectedTransaction.amount?.toLocaleString('en-IN')}
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedTransaction.status || 'Success'}</p>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-start gap-4">
                                    <span className="text-[11px] font-semibold text-gray-400 shrink-0 mt-0.5">Description</span>
                                    <span className="text-[13px] font-semibold text-gray-900 text-right leading-relaxed break-words">{selectedTransaction.description}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <span className="text-[11px] font-semibold text-gray-400">Date</span>
                                    <span className="text-[12px] font-semibold text-gray-900">
                                        {new Date(selectedTransaction.createdAt).toLocaleString('en-IN', {
                                            day: 'numeric', month: 'short',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <span className="text-[11px] font-semibold text-gray-400">Transaction ID</span>
                                    <span className="text-[11px] font-mono text-gray-500">
                                        #{selectedTransaction._id?.slice(-8).toUpperCase()}
                                    </span>
                                </div>
                                {selectedTransaction.bookingId && (
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                        <span className="text-[11px] font-semibold text-gray-400">Reference</span>
                                        <span className="text-[11px] font-bold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                                            #{selectedTransaction.bookingId}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </motion.div>
    );
};

export default WalletPage;
