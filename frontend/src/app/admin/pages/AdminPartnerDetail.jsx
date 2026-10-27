import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Calendar, MapPin, Shield, CreditCard,
    History, AlertTriangle, Ban, CheckCircle, Lock, Unlock, Loader2,
    Building, FileText, CheckSquare, XSquare, ArrowDownLeft, ArrowUpRight, ShieldCheck
} from 'lucide-react';
import { Link, useParams, useLocation } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import walletService from '../../../services/walletService';
import toast from 'react-hot-toast';

const PartnerPropertiesTab = ({ properties }) => {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                <tr>
                    <th className="p-4 font-bold text-gray-600">Property Name</th>
                    <th className="p-4 font-bold text-gray-600">Location</th>
                    <th className="p-4 font-bold text-gray-600">Type</th>
                    <th className="p-4 font-bold text-gray-600">Status</th>
                    <th className="p-4 font-bold text-gray-600 text-right">Added On</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {properties && properties.length > 0 ? (
                    properties.map((property, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-900">
                                <Link to={`${basePath}/properties/${property._id}`} className="hover:text-blue-600 hover:underline">
                                    {property.propertyName}
                                </Link>
                            </td>
                            <td className="p-4 text-xs font-bold text-gray-500 uppercase">{property.address?.city}, {property.address?.state}</td>
                            <td className="p-4 text-xs font-bold text-gray-500 uppercase">{property.propertyType}</td>
                            <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${property.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    property.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {property.status}
                                </span>
                            </td>
                            <td className="p-4 text-right font-bold text-xs uppercase text-gray-400">
                                {new Date(property.createdAt).toLocaleDateString()}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-400 text-xs font-bold uppercase">No properties listed</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
    );
};

const PartnerDocumentsTab = ({ partner }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                <FileText size={16} /> Identity Proof (Aadhaar)
            </h3>
            <div className="space-y-4">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block">Aadhaar Number</span>
                    <span className="text-sm font-bold text-gray-900">{partner.aadhaarNumber || 'Not provided'}</span>
                </div>
                <div className="flex gap-4">
                    {partner.aadhaarFront ? (
                        <a href={partner.aadhaarFront} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                            <img src={partner.aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                            Front Missing
                        </div>
                    )}
                    {partner.aadhaarBack ? (
                        <a href={partner.aadhaarBack} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                            <img src={partner.aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                            Back Missing
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white p-6 border border-gray-200 rounded-xl">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                <FileText size={16} /> Tax Proof (PAN)
            </h3>
            <div className="space-y-4">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block">PAN Number</span>
                    <span className="text-sm font-bold text-gray-900">{partner.panNumber || 'Not provided'}</span>
                </div>
                <div>
                    {partner.panCardImage ? (
                        <a href={partner.panCardImage} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                            <img src={partner.panCardImage} alt="PAN Card" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                            PAN Image Missing
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const PartnerTransactionsTab = ({ partnerId }) => {
    const [wallet, setWallet] = useState(null);
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWalletData = async () => {
            try {
                setLoading(true);
                const [wRes, sRes, tRes] = await Promise.all([
                    walletService.getWallet({ ownerId: partnerId, viewAs: 'partner' }),
                    walletService.getWalletStats({ ownerId: partnerId, viewAs: 'partner' }),
                    walletService.getTransactions({ ownerId: partnerId, viewAs: 'partner', limit: 50 })
                ]);
                if (wRes.success) setWallet(wRes.wallet);
                if (sRes.success) setStats(sRes.stats);
                if (tRes.success) setTransactions(tRes.transactions);
            } catch (error) {
                console.error('Error fetching partner wallet:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWalletData();
    }, [partnerId]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-300" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Available Balance</p>
                    <h3 className="text-xl font-black text-gray-900">₹{wallet?.balance?.toLocaleString() || 0}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Earnings</p>
                    <h3 className="text-xl font-black text-green-600">₹{stats?.totalEarnings?.toLocaleString() || 0}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">+₹{stats?.thisMonthEarnings?.toLocaleString() || 0} this month</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Payouts</p>
                    <h3 className="text-xl font-black text-orange-600">₹{stats?.totalWithdrawals?.toLocaleString() || 0}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pending Clearance</p>
                    <h3 className="text-xl font-black text-blue-600">₹{stats?.pendingClearance?.toLocaleString() || 0}</h3>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Recent Transactions</h3>
                <div className="space-y-3">
                    {transactions && transactions.length > 0 ? (
                        transactions.map((txn, i) => {
                            const isDebit = txn.type === 'debit';
                            const isBooking = txn.category?.includes('booking');

                            return (
                                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors bg-white">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${isBooking ? 'bg-orange-50 text-orange-500' :
                                            !isDebit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                                            }`}>
                                            {isBooking ? <Calendar size={20} /> :
                                                !isDebit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate pr-2">{txn.description}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                                                {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })} • {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-lg font-black tracking-tight ${isDebit ? 'text-gray-900' : 'text-green-600'}`}>
                                            {isDebit ? '-' : '+'}₹{txn.amount?.toLocaleString()}
                                        </p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${txn.status === 'completed' || txn.status === 'success' ? 'bg-green-50 text-green-600' :
                                            txn.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            {txn.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-xl">
                            <CreditCard size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-xs font-bold uppercase text-gray-400">No transactions history</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PartnerSubscriptionsTab = ({ subscriptions, basePath }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Subscription History</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">All packages and plans assigned to or purchased by this partner</p>
            </div>
            <Link
                to={`${basePath}/subscriptions`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 transition-colors"
            >
                <ShieldCheck size={12} /> Manage Plans
            </Link>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                    <tr>
                        <th className="p-4">Subscription ID</th>
                        <th className="p-4">Plan & Tier</th>
                        <th className="p-4">Mode / Scope</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Duration & Validity</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Properties Covered</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {subscriptions && subscriptions.length > 0 ? (
                        subscriptions.map((sub, i) => {
                            const isAct = sub.status === 'active' && sub.expiryDate && new Date(sub.expiryDate) > new Date();
                            const daysLeft = sub.expiryDate ? Math.max(0, Math.ceil((new Date(sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
                            return (
                                <tr key={sub._id || i} className="hover:bg-gray-50 font-medium">
                                    <td className="p-4 font-mono text-xs font-bold text-gray-700">
                                        #{sub.subscriptionId || sub._id?.slice(-8).toUpperCase()}
                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                            {new Date(sub.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-gray-900 text-sm">{sub.planName || sub.planId?.name || 'Custom Plan'}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                                            {sub.planTier ? sub.planTier.replace('_', ' ') : 'Standard'}
                                        </span>
                                    </td>
                                    <td className="p-4 uppercase text-xs font-bold text-gray-600">
                                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                                            {sub.mode || 'Sale'}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1 capitalize font-medium">{sub.scope || 'Property'}-level</p>
                                    </td>
                                    <td className="p-4 font-bold text-gray-900">
                                        ₹{(sub.amount || 0).toLocaleString('en-IN')}
                                        <p className="text-[9px] text-gray-400 uppercase font-semibold mt-0.5">
                                            {sub.paymentType || 'Online'}
                                        </p>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-gray-600">
                                        <div>
                                            <span>{sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                            <span className="mx-1 text-gray-400">→</span>
                                            <span className={isAct ? 'text-emerald-700 font-black' : 'text-gray-600'}>
                                                {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </span>
                                        </div>
                                        {isAct && (
                                            <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600">
                                                {daysLeft} days remaining
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                                            isAct ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            sub.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                            sub.status === 'expired' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {isAct ? 'ACTIVE' : (sub.status || 'INACTIVE')}
                                        </span>
                                        {sub.cancelReason && (
                                            <p className="text-[9px] text-red-500 font-semibold mt-1 max-w-[160px] truncate" title={sub.cancelReason}>
                                                {sub.cancelReason}
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-gray-700">
                                        {sub.propertyIds && sub.propertyIds.length > 0 ? (
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-500 uppercase">{sub.propertyIds.length} listing{sub.propertyIds.length > 1 ? 's' : ''}:</span>
                                                {sub.propertyIds.slice(0, 2).map((p, idx) => (
                                                    <p key={idx} className="truncate max-w-[150px] text-gray-900 font-bold text-[11px]">
                                                        • {p.propertyName || p._id || p}
                                                    </p>
                                                ))}
                                                {sub.propertyIds.length > 2 && (
                                                    <span className="text-[10px] text-gray-400 font-bold">+{sub.propertyIds.length - 2} more</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">No listings assigned</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="7" className="p-8 text-center text-gray-400 text-xs font-bold uppercase">
                                No subscriptions found for this partner
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const AdminPartnerDetail = () => {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    const { id } = useParams();
    const [partner, setPartner] = useState(null);
    const [properties, setProperties] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [activeSubscription, setActiveSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('properties');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchPartnerDetails = async () => {
        try {
            setLoading(true);
            const data = await adminService.getPartnerDetails(id);
            if (data.success) {
                setPartner(data.partner);
                setProperties(data.properties || []);
                setSubscriptions(data.subscriptions || []);
                setActiveSubscription(data.activeSubscription || null);
            }
        } catch (error) {
            console.error('Error fetching partner details:', error);
            toast.error('Failed to load partner information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartnerDetails();
    }, [id]);

    const handleBlockToggle = async () => {
        const isBlocked = partner.isBlocked;
        setModalConfig({
            isOpen: true,
            title: isBlocked ? 'Unblock Partner?' : 'Block Partner?',
            message: isBlocked
                ? `Partner ${partner.name} will regain access to their dashboard.`
                : `Blocking ${partner.name} will prevent them from managing properties.`,
            type: isBlocked ? 'success' : 'danger',
            confirmText: isBlocked ? 'Unblock' : 'Block',
            onConfirm: async () => {
                try {
                    const res = await adminService.updatePartnerStatus(partner._id, !isBlocked);
                    if (res.success) {
                        toast.success(`Partner ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
                        fetchPartnerDetails();
                    }
                } catch {
                    toast.error('Failed to update partner status');
                }
            }
        });
    };

    const handleApproval = async (status) => {
        setModalConfig({
            isOpen: true,
            title: `${status === 'approved' ? 'Approve' : 'Reject'} Partner?`,
            message: `Are you sure you want to ${status} ${partner.name}?`,
            type: status === 'approved' ? 'success' : 'danger',
            confirmText: status === 'approved' ? 'Approve' : 'Reject',
            onConfirm: async () => {
                try {
                    const res = await adminService.updatePartnerApproval(partner._id, status);
                    if (res.success) {
                        toast.success(`Partner ${status} successfully`);
                        fetchPartnerDetails();
                    }
                } catch {
                    toast.error(`Failed to ${status} partner`);
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-gray-400" size={48} />
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading partner profile...</p>
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="text-center py-20">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Partner Not Found</h2>
                <p className="text-gray-500 mt-2">The partner you're looking for doesn't exist or has been deleted.</p>
                <Link to={`${basePath}/partners`} className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Partners</Link>
            </div>
        );
    }

    const activePlanInfo = React.useMemo(() => {
        const sub = activeSubscription || (
            partner?.subscription?.status === 'active' &&
            (partner?.subscription?.planId || partner?.subscription?.planName) &&
            (!partner?.subscription?.expiryDate || new Date(partner.subscription.expiryDate) > new Date())
                ? partner.subscription
                : null
        );
        if (!sub) return null;

        const planName = sub.planName || sub.planId?.name || (typeof sub.planId === 'string' ? sub.planId : 'Active Plan');
        const snap = sub.entitlementSnapshot || {};
        const maxProperties = snap.propertyLimit != null
            ? snap.propertyLimit
            : (sub.planId?.maxProperties ?? sub.planId?.propertiesPerPurchase ?? 1);
        const rawCap = snap.leadLimit != null ? snap.leadLimit : sub.planId?.leadCap;
        const leadCap = (rawCap === 0 || rawCap === null || rawCap === undefined) ? '∞' : rawCap;
        const propertiesAdded = sub.propertyIds?.length ?? sub.propertiesAdded ?? 0;
        const leadsUsed = sub.usage?.leadsUsed ?? sub.leadsUsedThisMonth ?? 0;
        const expiryDate = sub.expiryDate;
        const daysLeft = expiryDate ? Math.max(0, Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;

        return {
            planName,
            planTier: sub.planTier || sub.planId?.planTier,
            mode: sub.mode,
            maxProperties,
            leadCap,
            propertiesAdded,
            leadsUsed,
            expiryDate,
            daysLeft
        };
    }, [partner, activeSubscription]);

    const tabs = [
        { id: 'properties', label: 'Properties', icon: Building },
        { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: ShieldCheck },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'documents', label: 'Documents', icon: FileText },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to={`${basePath}/partners`} className="hover:text-black transition-colors">Partners</Link>
                <span>/</span>
                <span className="text-black">{partner.name}</span>
            </div>

            <div className={`rounded-2xl p-8 border shadow-sm flex flex-col md:flex-row gap-8 transition-colors ${partner.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col items-center md:items-start gap-4 min-w-[200px]">
                    <div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg relative uppercase">
                        {partner.profileImage ? (
                            <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            partner.name.charAt(0)
                        )}
                        {partner.isBlocked && (
                            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1.5 rounded-full border-4 border-white">
                                <Ban size={16} />
                            </div>
                        )}
                        {partner.partnerApprovalStatus === 'approved' && !partner.isBlocked && (
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
                                <CheckCircle size={16} />
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">ID: #{partner._id.slice(-6)}</p>
                        <div className="flex flex-col gap-1 mt-2">
                            {partner.isBlocked && <span className="text-xs font-bold text-red-600 uppercase">ACCOUNT BLOCKED</span>}
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded w-fit mx-auto md:mx-0 ${partner.partnerApprovalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                partner.partnerApprovalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {partner.partnerApprovalStatus}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{partner.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{partner.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <User size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{partner.ownerName || 'Owner Name N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">
                                {[partner.address?.city, partner.address?.state, partner.address?.country].filter(Boolean).join(', ') || 'Address N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="p-3 bg-white/50 rounded-lg border border-gray-200/50 flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Total Properties</span>
                            <span className="text-lg font-bold text-gray-900">{properties.length}</span>
                        </div>
                        <div className={`p-3 rounded-lg border flex flex-col gap-1.5 transition-colors ${
                            activePlanInfo ? 'bg-amber-50/40 border-amber-200/70' : 'bg-white/50 border-gray-200/50'
                        }`}>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Active Plan</span>
                                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                                    activePlanInfo ? 'bg-amber-100 text-amber-800 border border-amber-300/50' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {activePlanInfo ? activePlanInfo.planName : 'No Active Plan'}
                                </span>
                            </div>
                            {activePlanInfo && (
                                <div className="mt-1 pt-1.5 border-t border-amber-100/80 flex flex-col gap-1 text-[9px] font-bold text-gray-500 uppercase">
                                    {activePlanInfo.mode && (
                                        <div className="flex justify-between">
                                            <span>Mode / Tier:</span>
                                            <span className="text-gray-900 font-black">
                                                {activePlanInfo.mode} {activePlanInfo.planTier ? `• ${activePlanInfo.planTier.replace('_', ' ')}` : ''}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Expires:</span>
                                        <span className="text-gray-900 font-black">
                                            {activePlanInfo.expiryDate ? new Date(activePlanInfo.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            {activePlanInfo.daysLeft !== null && (
                                                <span className="text-emerald-700 ml-1">({activePlanInfo.daysLeft}d left)</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Properties:</span>
                                        <span className="text-gray-900 font-black">
                                            {activePlanInfo.propertiesAdded}/{activePlanInfo.maxProperties}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Leads:</span>
                                        <span className="text-gray-900 font-black">
                                            {activePlanInfo.leadsUsed}/{activePlanInfo.leadCap}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[160px]">
                    <button
                        onClick={handleBlockToggle}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase transition-colors ${partner.isBlocked
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                    >
                        {partner.isBlocked ? <Unlock size={16} /> : <Ban size={16} />}
                        {partner.isBlocked ? 'Unblock' : 'Block'}
                    </button>

                    {partner.partnerApprovalStatus === 'pending' && (
                        <>
                            <button
                                onClick={() => handleApproval('approved')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-bold uppercase transition-colors"
                            >
                                <CheckSquare size={16} /> Approve
                            </button>
                            <button
                                onClick={() => handleApproval('rejected')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold uppercase transition-colors"
                            >
                                <XSquare size={16} /> Reject
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div>
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabBadgePartner"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                                />
                            )}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === 'properties' && <PartnerPropertiesTab properties={properties} />}
                        {activeTab === 'subscriptions' && <PartnerSubscriptionsTab subscriptions={subscriptions} basePath={basePath} />}
                        {activeTab === 'transactions' && <PartnerTransactionsTab partnerId={id} />}
                        {activeTab === 'documents' && <PartnerDocumentsTab partner={partner} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminPartnerDetail;