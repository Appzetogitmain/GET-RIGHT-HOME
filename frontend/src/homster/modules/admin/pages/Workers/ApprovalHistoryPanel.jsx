import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClock, FiDownload, FiUser } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { getAvailabilityRequests, getOfflineRequests } from '../../services/workerService';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  revoked: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20'
};

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'availability', label: 'Availability' },
  { id: 'leave', label: 'Leave' }
];

const fmtDate = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
});
const fmtStamp = (value) => (value
  ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');

/**
 * Read-only audit trail of every availability and leave request: who asked,
 * for which day, what was decided, by whom and when.
 */
const ApprovalHistoryPanel = ({ status, search, refreshKey = 0 }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [availability, leave] = await Promise.all([
          getAvailabilityRequests({ status: 'all', search, limit: 500 }),
          getOfflineRequests({ status: 'all', search, limit: 500 })
        ]);
        if (cancelled) return;
        const merged = [
          ...(availability?.data || []).map((r) => ({
            key: `a-${r._id}`,
            kind: 'availability',
            worker: r.workerId || {},
            dateStr: r.dateStr,
            detail: 'Available (full day)',
            status: r.status,
            reason: r.rejectionReason,
            reviewer: r.reviewedBy,
            reviewedAt: r.reviewedAt,
            requestedAt: r.createdAt
          })),
          ...(leave?.data || []).map((r) => ({
            key: `l-${r._id}`,
            kind: 'leave',
            worker: r.workerId || {},
            dateStr: r.dateStr,
            detail: r.isFullDay ? 'Leave (full day)' : `Leave ${r.startSlot?.display || ''} – ${r.endSlot?.display || ''}`,
            status: r.status,
            reason: r.status === 'rejected' ? r.rejectionReason : r.reason,
            reviewer: r.reviewedBy,
            reviewedAt: r.reviewedAt,
            requestedAt: r.createdAt
          }))
        ];
        merged.sort((a, b) => new Date(b.reviewedAt || b.requestedAt) - new Date(a.reviewedAt || a.requestedAt));
        setRows(merged);
      } catch (error) {
        toast.error('Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, refreshKey]);

  const visible = useMemo(() => rows.filter((r) => {
    if (type !== 'all' && r.kind !== type) return false;
    if (status === 'rejected' && !['rejected', 'revoked'].includes(r.status)) return false;
    if (['pending', 'approved'].includes(status) && r.status !== status) return false;
    if (from && r.dateStr < from) return false;
    if (to && r.dateStr > to) return false;
    return true;
  }), [rows, type, status, from, to]);

  const exportCsv = () => {
    const header = ['Type', 'Worker', 'Phone', 'Day', 'Detail', 'Status', 'Decided by', 'Decided at', 'Requested at', 'Reason'];
    const lines = visible.map((r) => [
      r.kind, r.worker.name || '', r.worker.phone || '', r.dateStr, r.detail, r.status,
      r.reviewer?.name || r.reviewer?.email || '', r.reviewedAt ? new Date(r.reviewedAt).toISOString() : '',
      r.requestedAt ? new Date(r.requestedAt).toISOString() : '', r.reason || ''
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave-availability-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-white p-0.5 text-xs font-semibold ring-1 ring-slate-200">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setType(f.id)}
                className={`rounded-md px-3 py-1.5 transition ${type === f.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Day</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400" />
            <span>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400" />
            {(from || to) && (
              <button type="button" onClick={() => { setFrom(''); setTo(''); }} className="font-semibold text-slate-600 hover:underline">Clear</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{visible.length} {visible.length === 1 ? 'record' : 'records'}</span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!visible.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <FiDownload className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="text-sm text-slate-500">Loading history…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FiClock className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No history yet</h3>
          <p className="mt-1 text-xs text-slate-500">Approvals, rejections and leave decisions will be listed here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Type</th>
                <th className="px-3 py-3">Worker</th>
                <th className="px-3 py-3">Day</th>
                <th className="px-3 py-3">Decision</th>
                <th className="px-3 py-3">Decided by</th>
                <th className="px-5 py-3">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {visible.map((r) => (
                <tr key={r.key} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${r.kind === 'leave' ? 'bg-rose-50 text-rose-700' : 'bg-violet-50 text-violet-700'}`}>
                      {r.kind === 'leave' ? <FiClock className="h-3 w-3" /> : <FiCalendar className="h-3 w-3" />}
                      {r.kind === 'leave' ? 'Leave' : 'Availability'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {r.worker.name ? r.worker.name.charAt(0).toUpperCase() : <FiUser />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{r.worker.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{r.worker.phone || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="font-medium text-slate-800">{fmtDate(r.dateStr)}</p>
                    <p className="text-xs text-slate-500">{r.detail}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${STATUS_STYLES[r.status] || STATUS_STYLES.cancelled}`}>
                      {r.status}
                    </span>
                    {r.reason && (
                      <p className="mt-1 max-w-[220px] truncate text-[11px] italic text-slate-500" title={r.reason}>{r.reason}</p>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {r.status === 'pending' ? (
                      <span className="text-xs text-slate-400">Awaiting review</span>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-slate-700">{r.reviewer?.name || r.reviewer?.email || (r.reviewedAt ? 'Admin' : '—')}</p>
                        <p className="text-[11px] text-slate-500">{fmtStamp(r.reviewedAt)}</p>
                      </>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{fmtStamp(r.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApprovalHistoryPanel;
