import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiCheck, FiCheckCircle, FiClock, FiRotateCcw, FiUser, FiX, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import {
  getAvailabilityRequests,
  approveAvailabilityRequests,
  rejectAvailabilityRequest,
  revokeAvailabilityRequest
} from '../../services/workerService';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  revoked: 'bg-orange-50 text-orange-700 ring-orange-600/20'
};

const todayYmd = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const describeDate = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const diff = Math.round((date - new Date(`${todayYmd()}T00:00:00`)) / 86400000);
  const relative = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff < 0 ? 'Past' : null;
  return {
    weekday: date.toLocaleDateString('en-IN', { weekday: 'long' }),
    full: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    relative
  };
};

const AvailabilityRequestsPanel = ({ status, search, refreshKey = 0, onCount }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [busyIds, setBusyIds] = useState(new Set());
  const [rejecting, setRejecting] = useState(null); // { row, mode: 'reject' | 'revoke' }
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAvailabilityRequests({ status, search });
      if (res.success) {
        setRows(res.data || []);
        onCount?.(res.counts?.pending ?? 0);
      }
    } catch (error) {
      toast.error('Failed to load availability requests');
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('workerOfflineRequestReceived', refresh);
    return () => window.removeEventListener('workerOfflineRequestReceived', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, refreshKey]);

  const pendingRows = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);
  const allSelected = pendingRows.length > 0 && pendingRows.every((r) => selected.has(r._id));

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pendingRows.map((r) => r._id)));

  const approve = async (ids) => {
    setBusyIds(new Set(ids));
    // Optimistic: the rows leave the pending view straight away.
    const previous = rows;
    if (status === 'pending') setRows((cur) => cur.filter((r) => !ids.includes(r._id)));
    try {
      const res = await approveAvailabilityRequests(ids);
      toast.success(res.message || 'Approved');
      load();
    } catch (error) {
      setRows(previous);
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setBusyIds(new Set());
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    setBusyIds(new Set([rejecting.row._id]));
    try {
      if (rejecting.mode === 'revoke') await revokeAvailabilityRequest(rejecting.row._id, reason);
      else await rejectAvailabilityRequest(rejecting.row._id, reason);
      toast.success(rejecting.mode === 'revoke' ? 'Approval revoked' : 'Request rejected');
      setRejecting(null);
      setReason('');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setBusyIds(new Set());
    }
  };

  return (
    <div>
      {/* Bulk action bar */}
      {pendingRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            {selected.size ? `${selected.size} selected` : `Select all ${pendingRows.length} pending`}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!selected.size || busyIds.size > 0}
              onClick={() => approve([...selected])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiCheck className="h-3.5 w-3.5" /> Approve selected
            </button>
            <button
              type="button"
              disabled={busyIds.size > 0}
              onClick={() => approve(pendingRows.map((r) => r._id))}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Approve all
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="text-sm text-slate-500">Loading requests…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FiCalendar className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {status === 'pending' ? 'You’re all caught up' : 'No requests yet'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {status === 'pending'
              ? 'No availability requests are waiting for approval.'
              : 'No requests match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="w-10 px-5 py-3" />
                <th className="px-3 py-3">Worker</th>
                <th className="px-3 py-3">Available on</th>
                <th className="px-3 py-3">Requested</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rows.map((row) => {
                const worker = row.workerId || {};
                const when = describeDate(row.dateStr);
                const pending = row.status === 'pending';
                const busy = busyIds.has(row._id);
                return (
                  <tr key={row._id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      {pending && (
                        <input
                          type="checkbox"
                          checked={selected.has(row._id)}
                          onChange={() => toggle(row._id)}
                          className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                        />
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {worker.name ? worker.name.charAt(0).toUpperCase() : <FiUser />}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                            {worker.name || 'Unknown'}
                            <span
                              className={`h-2 w-2 rounded-full ${worker.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                              title={worker.isOnline ? 'Online' : 'Offline'}
                            />
                          </p>
                          <p className="text-xs text-slate-500">{worker.phone || 'No phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="font-semibold text-slate-900">
                        {when.weekday}
                        {when.relative && (
                          <span className="ml-2 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            {when.relative}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{when.full}</p>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${STATUS_STYLES[row.status] || STATUS_STYLES.cancelled}`}>
                        {row.status === 'pending' && <FiClock className="h-3 w-3" />}
                        {row.status === 'approved' && <FiCheckCircle className="h-3 w-3" />}
                        {(row.status === 'rejected' || row.status === 'revoked') && <FiXCircle className="h-3 w-3" />}
                        {row.status}
                      </span>
                      {row.reviewedAt && row.status !== 'pending' && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {row.reviewedBy?.name || row.reviewedBy?.email || 'Admin'} ·{' '}
                          {new Date(row.reviewedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {['rejected', 'revoked'].includes(row.status) && row.rejectionReason && (
                        <p className="max-w-[220px] truncate text-[11px] italic text-rose-600" title={row.rejectionReason}>
                          {row.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {(pending || row.status === 'rejected' || row.status === 'revoked') && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approve([row._id])}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <FiCheck className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {pending && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => { setRejecting({ row, mode: 'reject' }); setReason(''); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            <FiX className="h-3.5 w-3.5" /> Reject
                          </button>
                        )}
                        {row.status === 'approved' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => { setRejecting({ row, mode: 'revoke' }); setReason(''); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            <FiRotateCcw className="h-3.5 w-3.5" /> Revoke
                          </button>
                        )}
                        {row.status === 'cancelled' && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject dialog */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              {rejecting.mode === 'revoke' ? 'Revoke approval' : 'Reject availability request'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {rejecting.row.workerId?.name} · {describeDate(rejecting.row.dateStr).weekday}, {describeDate(rejecting.row.dateStr).full}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason (shown to the worker)"
              className="mt-3 w-full resize-none rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={busyIds.size > 0}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rejecting.mode === 'revoke' ? 'Revoke approval' : 'Reject request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityRequestsPanel;
