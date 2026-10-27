import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Calendar, MapPin, Shield, CreditCard,
    History, AlertTriangle, Ban, CheckCircle, Lock, Unlock, Loader2, ArrowDownLeft, ArrowUpRight,
    MessageSquare, Clock, FileText, Home, ShieldCheck, Package
} from 'lucide-react';
import { Link, useParams, useLocation } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { RoleBadge } from './AdminUsers';
import toast from 'react-hot-toast';

const UserPropertiesTab = ({ properties }) => {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                <tr>
                    <th className="p-4 font-bold text-gray-600">Property Name</th>
                    <th className="p-4 font-bold text-gray-600">Type</th>
                    <th className="p-4 font-bold text-gray-600">City</th>
                    <th className="p-4 font-bold text-gray-600">Status</th>
                    <th className="p-4 font-bold text-gray-600 text-right">View</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {properties && properties.length > 0 ? (
                    properties.map((prop, i) => (
                        <tr key={i} className="hover:bg-gray-50 font-bold">
                            <td className="p-4 font-bold text-gray-900">{prop.propertyName || 'Untitled'}</td>
                            <td className="p-4 uppercase text-xs font-bold text-gray-600">{prop.propertyType || 'N/A'}</td>
                            <td className="p-4 font-semibold text-gray-500">{prop.address?.city || 'N/A'}</td>
                            <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    prop.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    prop.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {prop.status}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <Link to={`${basePath}/properties/${prop._id}`} className="text-black font-bold uppercase text-[10px] border-b border-black pb-0.5 hover:text-gray-600 hover:border-gray-600 transition-colors">
                                    Details
                                </Link>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-400 text-xs font-bold uppercase">No properties found</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
    );
};

// ─── Enquiry status badge ─────────────────────────────────────────────────────
const EnqStatusBadge = ({ status }) => {
    const st = (status || 'new').toLowerCase();
    const cls = {
        new: 'bg-blue-50 text-blue-700 border-blue-100',
        contacted: 'bg-amber-50 text-amber-700 border-amber-100',
        scheduled: 'bg-blue-50 text-[#1A73E8] border-blue-200',
        closed: 'bg-green-50 text-green-700 border-green-100',
        dropped: 'bg-red-50 text-red-700 border-red-100',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${cls[st] || cls.new}`}>
            {st}
        </span>
    );
};

// ─── User Enquiries Tab ───────────────────────────────────────────────────────
const UserEnquiriesTab = ({ enquiries }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                <tr>
                    <th className="p-4">Enquiry ID</th>
                    <th className="p-4">Property</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Scheduled Date</th>
                    <th className="p-4">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {enquiries && enquiries.length > 0 ? (
                    enquiries.map((enq, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 font-mono text-[11px] text-gray-500">
                                #{enq.bookingId || enq._id?.slice(-8).toUpperCase()}
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    {new Date(enq.createdAt).toLocaleDateString()}
                                </p>
                            </td>
                            <td className="p-4">
                                <p className="font-bold text-gray-900 text-[13px]">
                                    {enq.propertyId?.propertyName || 'Deleted Property'}
                                </p>
                                <p className="text-[10px] text-gray-400 uppercase font-medium mt-0.5">
                                    {enq.propertyId?.address?.city || ''}
                                </p>
                            </td>
                            <td className="p-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                                    {enq.propertyId?.propertyType || enq.propertyType || 'N/A'}
                                </span>
                            </td>
                            <td className="p-4 text-[11px] font-bold text-gray-600">
                                {enq.preferredDate || enq.inquiryMetadata?.preferredDate
                                    ? new Date(enq.preferredDate || enq.inquiryMetadata.preferredDate).toLocaleDateString()
                                    : '—'}
                                {enq.timeSlot && (
                                    <span className="block text-[10px] text-gray-400 font-normal mt-0.5">{enq.timeSlot}</span>
                                )}
                            </td>
                            <td className="p-4">
                                <EnqStatusBadge status={enq.status || enq.inquiryMetadata?.status} />
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="p-8 text-center">
                            <MessageSquare size={28} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-[11px] font-bold uppercase text-gray-400">No enquiries found for this user</p>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const UserTransactionsTab = ({ wallet, transactions }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Current Balance</p>
                <h3 className="text-2xl font-black text-gray-900">₹{wallet?.balance?.toLocaleString() || 0}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Transactions</p>
                <h3 className="text-2xl font-black text-gray-900">{transactions?.length || 0}</h3>
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Recent Transactions</h3>
            <div className="space-y-3">
                {transactions && transactions.length > 0 ? (
                    transactions.map((txn, i) => {
                        const isDebit = txn.type === 'debit';
                        const isBooking = txn.category?.includes('booking') || txn.isBooking;

                        // Styling Logic based on User Screenshot
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

const UserSubscriptionsTab = ({ subscriptions, basePath }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Subscription History</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">All packages and plans assigned to or purchased by this user</p>
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
                                No subscriptions found for this user
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const AdminUserDetail = () => {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [properties, setProperties] = useState([]);
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [enquiries, setEnquiries] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [activeSubscription, setActiveSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('enquiries');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            const [userRes, enqRes] = await Promise.all([
                adminService.getUserDetails(id),
                adminService.getEnquiries({ limit: 100 })
            ]);
            if (userRes.success) {
                setUser(userRes.user);
                setBookings(userRes.bookings);
                setProperties(userRes.properties || []);
                setWallet(userRes.wallet);
                setTransactions(userRes.transactions);
                setSubscriptions(userRes.subscriptions || []);
                setActiveSubscription(userRes.activeSubscription || null);
            }
            if (enqRes.success) {
                // Filter enquiries that belong to this user
                const userEnquiries = (enqRes.enquiries || []).filter(
                    enq => enq.userId?._id === id || enq.userId === id
                );
                setEnquiries(userEnquiries);
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
            toast.error('Failed to load user information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, [id]);

    const handleBlockToggle = async () => {
        const isBlocked = user.isBlocked;
        setModalConfig({
            isOpen: true,
            title: isBlocked ? 'Unblock User?' : 'Block User?',
            message: isBlocked
                ? `User ${user.name} will regain access to booking and account features.`
                : `Blocking ${user.name} will prevent them from logging in or making new bookings.`,
            type: isBlocked ? 'success' : 'danger',
            confirmText: isBlocked ? 'Unblock' : 'Block',
            onConfirm: async () => {
                try {
                    const res = await adminService.updateUserStatus(user._id, !isBlocked);
                    if (res.success) {
                        toast.success(`User ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
                        fetchUserDetails();
                    }
                } catch {
                    toast.error('Failed to update user status');
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-gray-400" size={48} />
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading user profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">User Not Found</h2>
                <p className="text-gray-500 mt-2">The user you're looking for doesn't exist or has been deleted.</p>
                <Link to={`${basePath}/users`} className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Users</Link>
            </div>
        );
    }

    const activePlanInfo = React.useMemo(() => {
        const sub = activeSubscription || (
            user?.subscription?.status === 'active' &&
            (user?.subscription?.planId || user?.subscription?.planName) &&
            (!user?.subscription?.expiryDate || new Date(user.subscription.expiryDate) > new Date())
                ? user.subscription
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
    }, [user, activeSubscription]);

    const tabs = [
        { id: 'enquiries', label: `Enquiries (${enquiries.length})`, icon: MessageSquare },
        { id: 'properties', label: `Properties (${properties.length})`, icon: Home },
        { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: ShieldCheck },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to={`${basePath}/users`} className="hover:text-black transition-colors">Users</Link>
                <span>/</span>
                <span className="text-black">{user.name}</span>
            </div>

            <div className={`rounded-2xl p-8 border shadow-sm flex flex-col md:flex-row gap-8 transition-colors ${user.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col items-center md:items-start gap-4 min-w-[200px]">
                    <div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg relative uppercase">
                        {user.name.charAt(0)}
                        {user.isBlocked && (
                            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1.5 rounded-full border-4 border-white">
                                <Ban size={16} />
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">User ID: #{user._id.slice(-6)}</p>
                        {user.isBlocked && <span className="text-xs font-bold text-red-600 mt-1 block uppercase">ACCOUNT BLOCKED</span>}
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{user.email || 'N/A'}</span>
                            {user.isVerified && <CheckCircle size={14} className="text-green-500" />}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{user.phone}</span>
                            <CheckCircle size={14} className="text-green-500" />
                        </div>
                        <div className="flex items-center gap-3 text-sm pt-2">
                            <RoleBadge role={user.role} size="lg" />
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
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase transition-colors ${user.isBlocked
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                    >
                        {user.isBlocked ? <Unlock size={16} /> : <Ban size={16} />}
                        {user.isBlocked ? 'Unblock User' : 'Block User'}
                    </button>

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
                                    layoutId="activeTabBadgeUser"
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
                        {activeTab === 'enquiries' && <UserEnquiriesTab enquiries={enquiries} />}
                        {activeTab === 'properties' && <UserPropertiesTab properties={properties} />}
                        {activeTab === 'subscriptions' && <UserSubscriptionsTab subscriptions={subscriptions} basePath={basePath} />}
                        {activeTab === 'transactions' && <UserTransactionsTab wallet={wallet} transactions={transactions} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminUserDetail;
