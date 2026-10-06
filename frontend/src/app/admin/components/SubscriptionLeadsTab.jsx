import React, { useEffect, useState, useCallback } from 'react';
import { Search, PhoneCall, MessageCircle, ChevronLeft, ChevronRight, UserX } from 'lucide-react';
import { toast } from 'react-hot-toast';
import adminService from '../../../services/adminService';

const REASON_META = {
    trial_expired: { label: 'Free access ended', style: 'bg-amber-50 text-amber-700 border-amber-200' },
    limit_reached: { label: 'Free limit reached', style: 'bg-orange-50 text-orange-700 border-orange-200' },
    subscription_required: { label: 'Subscription required', style: 'bg-red-50 text-red-700 border-red-200' }
};

const STATUS_FILTERS = [
    { value: 'open', label: 'Open' },
    { value: 'all', label: 'All' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'closed', label: 'Closed' }
];

const STATUS_OPTIONS = ['new', 'contacted', 'scheduled', 'follow-up', 'negotiation', 'closed', 'sold', 'rented', 'dropped'];

const fmtDateTime = (d) => (d
    ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—');

const usageText = (lead) => {
    const sl = lead.subscriptionLead || {};
    if (sl.reason === 'limit_reached') {
        return sl.maxAllowed != null ? `${sl.currentCount ?? 0}/${sl.maxAllowed} listings used` : `${sl.currentCount ?? 0} listings`;
    }
    if (sl.reason === 'trial_expired') {
        return sl.trialEndsAt
            ? `Ended ${new Date(sl.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Free period over';
    }
    return 'No free access';
};

/**
 * Listers (builders etc.) who hit the paywall because free access ended, the
 * free listing limit was reached, or a subscription is required. One row per
 * lister; repeat attempts refresh the row. Status edits reuse the enquiry API.
 */
const SubscriptionLeadsTab = ({ onOpenCountChange }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('open');
    const [reason, setReason] = useState('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState({ open: 0, byReason: {} });
    const limit = 15;

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getSubscriptionLeads({
                status, reason, search: debouncedSearch || undefined, page, limit
            });
            if (res.success) {
                setLeads(res.leads || []);
                setTotal(res.total || 0);
                setCounts(res.counts || { open: 0, byReason: {} });
                onOpenCountChange?.(res.counts?.open || 0);
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load subscription leads');
        } finally {
            setLoading(false);
        }
    }, [status, reason, debouncedSearch, page, onOpenCountChange]);

    useEffect(() => { load(); }, [load]);

    const handleStatusChange = async (lead, next) => {
        const prev = leads;
        setLeads((cur) => cur.map((l) => (l._id === lead._id ? { ...l, status: next } : l)));
        try {
            await adminService.updateEnquiry(lead._id, { status: next });
            toast.success('Lead updated');
            load();
        } catch (e) {
            setLeads(prev);
            toast.error(e?.response?.data?.message || 'Could not update lead');
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div>
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => { setStatus(f.value); setPage(1); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                status === f.value ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}{f.value === 'open' ? ` (${counts.open || 0})` : ''}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <select
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                    >
                        <option value="all">All reasons</option>
                        {Object.entries(REASON_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}{counts.byReason?.[k] ? ` (${counts.byReason[k]})` : ''}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name / phone"
                            className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black w-full sm:w-56"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-12 flex justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                </div>
            ) : leads.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <UserX className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-lg font-medium">No subscription leads</p>
                    <p className="text-sm">A lead appears here when a builder hits the paywall because their free access ended.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] table-auto">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['Builder', 'Contact', 'Reason', 'Free usage', 'Attempts', 'Last attempt', 'Status'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leads.map((lead) => {
                                const sl = lead.subscriptionLead || {};
                                const meta = REASON_META[sl.reason] || { label: sl.reason || 'Unknown', style: 'bg-gray-50 text-gray-700 border-gray-200' };
                                const phone = lead.phone && lead.phone !== 'N/A' ? lead.phone : (lead.userId?.phone || '');
                                const company = lead.userId?.builderProfile?.companyName;
                                return (
                                    <tr key={lead._id} className="hover:bg-gray-50 transition-colors align-top">
                                        <td className="px-4 py-3">
                                            <div className="font-black text-gray-900 text-sm">{lead.userId?.name || lead.name}</div>
                                            <div className="text-[11px] text-gray-500 capitalize">
                                                {sl.role || lead.userId?.role || 'builder'}{company ? ` • ${company}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-bold text-gray-800">{phone || '—'}</div>
                                            {lead.email && <div className="text-[11px] text-gray-500">{lead.email}</div>}
                                            {phone && (
                                                <div className="flex gap-1.5 mt-1.5">
                                                    <a
                                                        href={`tel:${phone}`}
                                                        className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center hover:bg-blue-100"
                                                        title="Call"
                                                    >
                                                        <PhoneCall size={13} />
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello, your free listing access has ended. Subscribe to a plan to keep listing your properties on Get Right Home.')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center hover:bg-emerald-100"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle size={13} />
                                                    </a>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.style}`}>{meta.label}</span>
                                            {sl.resolvedReason === 'subscribed' && (
                                                <div className="text-[10px] font-bold text-emerald-600 mt-1">Subscribed</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-700">{usageText(lead)}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-700">{sl.attemptCount || 1}</td>
                                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDateTime(sl.lastAttemptAt || lead.updatedAt)}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={lead.status || 'new'}
                                                onChange={(e) => handleStatusChange(lead, e.target.value)}
                                                className="px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] font-bold capitalize outline-none focus:border-black bg-white"
                                            >
                                                {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{st}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {total > limit && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
                    <span>{total} leads • page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionLeadsTab;
