import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiClock, FiPhone, FiPlus, FiSearch, FiTrash2, FiUsers, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import adminWorkerService from '../../../../../services/adminWorkerService';
import { adminBookingService } from '../../../../../services/adminBookingService';

const OPEN_STATUSES = ['assigned', 'confirmed', 'accepted', 'journey_started', 'visited', 'estimate_provided', 'estimate_accepted', 'in_progress'];
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Admin: extra workers on a booking. Shows requests from the lead worker and
 * lets the admin add a helper with the amount they'll be paid (credited to the
 * helper's wallet when the job completes — the helper never sees the amount).
 */
const HelpersPanel = ({ booking, onChanged }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminBookingService.getHelpers(booking._id);
      if (res.success) setData(res.data);
    } catch {
      /* panel is optional */
    } finally {
      setLoading(false);
    }
  }, [booking._id]);

  useEffect(() => { load(); }, [load, booking.helpers?.length, booking.helperRequests?.length]);

  const refreshAll = () => { load(); onChanged?.(); };

  const open = booking.workerId && OPEN_STATUSES.includes(String(booking.status).toLowerCase());
  const pending = (data?.helperRequests || []).filter((r) => r.status === 'pending');
  const helpers = data?.helpers || [];

  if (loading || (!open && helpers.length === 0 && !pending.length)) return null;

  const decline = async (request) => {
    const note = window.prompt('Reason for declining (shown to the worker, optional):', '');
    if (note === null) return;
    try {
      await adminBookingService.rejectHelperRequest(booking._id, request._id, note);
      toast.success('Request declined');
      refreshAll();
    } catch (err) {
      toast.error(err.message || 'Could not decline the request');
    }
  };

  const remove = async (helper) => {
    if (!window.confirm(`Remove ${helper.workerId?.name || 'this helper'} from the job?`)) return;
    try {
      await adminBookingService.removeHelper(booking._id, helper.workerId?._id || helper.workerId);
      toast.success('Helper removed');
      refreshAll();
    } catch (err) {
      toast.error(err.message || 'Could not remove the helper');
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${pending.length ? 'border-amber-300 bg-amber-50/60' : 'border-gray-200 bg-white'}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600">
          <FiUsers className="h-4 w-4 text-gray-400" /> Extra Workers
        </h3>
        {open && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800"
          >
            <FiPlus className="h-3.5 w-3.5" /> Add worker
          </button>
        )}
      </div>

      {pending.map((request) => (
        <div key={request._id} className="mb-3 rounded-lg border border-amber-200 bg-white p-3 text-xs">
          <p className="flex items-center gap-1.5 font-bold text-amber-800">
            <FiClock className="h-3.5 w-3.5" />
            {request.requestedBy?.name || 'The worker'} asked for {request.count} extra worker{request.count > 1 ? 's' : ''}
          </p>
          <p className="mt-1 text-gray-600">“{request.reason}”</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setAdding(true)} className="rounded-md bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700">Add a worker</button>
            <button type="button" onClick={() => decline(request)} className="rounded-md border border-gray-200 px-2.5 py-1 font-semibold text-gray-600 hover:bg-gray-50">Decline</button>
          </div>
        </div>
      ))}

      {data?.earning && data.earning.pool > 0 && (
        <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-emerald-900">Worker earning split</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
              {data.earning.fromBill ? 'From final bill' : 'Estimated'}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80">
            {inr(data.earning.booked)} booking − {inr(data.earning.platformCut)} platform cut ({data.earning.commissionPct}%) = <b>{inr(data.earning.pool)}</b> shared equally
            {data.earning.fromBill ? '' : ' (final amount follows the bill)'}
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
              <span className="truncate text-gray-700">{data.earning.leadName} <span className="text-gray-400">· main worker</span></span>
              <span className="font-bold text-gray-900">{inr(data.earning.leadShare)}</span>
            </li>
            {helpers.map((h) => (
              <li key={h._id} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                <span className="truncate text-gray-700">{h.workerId?.name || 'Worker'} <span className="text-gray-400">· extra</span></span>
                <span className="font-bold text-gray-900">{h.payoutStatus === 'paid' ? `${inr(h.payoutAmount)} paid` : inr(data.earning.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {helpers.length === 0 ? (
        <p className="text-xs text-gray-500">No extra workers on this job.</p>
      ) : (
        <ul className="space-y-2">
          {helpers.map((h) => (
            <li key={h._id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-bold text-gray-900">{h.workerId?.name || 'Worker'}</p>
                <p className="flex items-center gap-2 text-gray-500">
                  {h.workerId?.phone && <span className="inline-flex items-center gap-1"><FiPhone className="h-3 w-3" />{h.workerId.phone}</span>}
                  <span>{h.payoutStatus === 'paid' ? `Paid ${inr(h.payoutAmount)} to wallet` : 'Equal share · paid on completion'}</span>
                </p>
              </div>
              {h.payoutStatus !== 'paid' && (
                <button type="button" onClick={() => remove(h)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Remove helper">
                  <FiTrash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddHelperModal
          booking={booking}
          earning={data?.earning}
          excludeIds={[booking.workerId?._id || booking.workerId, ...helpers.map((h) => h.workerId?._id || h.workerId)].map(String)}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); refreshAll(); }}
        />
      )}
    </div>
  );
};

const AddHelperModal = ({ booking, earning, excludeIds, onClose, onAdded }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState(null);
  const [payout, setPayout] = useState('');
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminWorkerService.getAllWorkers({ approvalStatus: 'approved' });
        if (res.success) setWorkers(res.data || []);
      } catch {
        toast.error('Failed to load workers');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return workers
      .filter((w) => !excludeIds.includes(String(w._id || w.id)))
      .filter((w) => !q || [w.name, w.phone, (w.serviceCategories || []).join(' ')].some((f) => String(f || '').toLowerCase().includes(q)))
      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || (a.name || '').localeCompare(b.name || ''));
  }, [workers, search, excludeIds]);

  const submit = async (override = false) => {
    if (!chosen) return toast.error('Choose a worker');
    const amount = 0; // paid as an equal share automatically
    try {
      setSaving(true);
      const res = await adminBookingService.addHelper(booking._id, chosen._id || chosen.id, amount, override);
      if (res.success) {
        toast.success(res.message || 'Worker added');
        onAdded();
      }
    } catch (err) {
      if (!override && ['WORKER_UNAVAILABLE', 'SLOT_CONFLICT'].includes(err.code)) {
        setWarning(err.message);
      } else {
        toast.error(err.message || 'Could not add the worker');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add a worker to this job</h3>
            <p className="text-xs text-gray-500">Booking #{booking.bookingNumber} · {booking.serviceName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or skill"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-gray-400"
            />
          </div>

          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {loading ? (
              <li className="py-6 text-center text-xs text-gray-400">Loading workers…</li>
            ) : visible.length === 0 ? (
              <li className="py-6 text-center text-xs text-gray-400">No workers found</li>
            ) : visible.map((w) => {
              const id = w._id || w.id;
              const active = chosen && (chosen._id || chosen.id) === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => { setChosen(w); setWarning(null); }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${active ? 'border-slate-900 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-gray-900">{w.name}</span>
                      <span className="block truncate text-gray-500">{w.phone} · {(w.serviceCategories || []).slice(0, 2).join(', ') || 'No skills listed'}</span>
                    </span>
                    <span className={`ml-2 h-2.5 w-2.5 shrink-0 rounded-full ${w.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} title={w.isOnline ? 'Online' : 'Offline'} />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
            <p className="font-bold">Earning is split equally</p>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              After the platform's cut, the worker earning is shared equally by everyone on the job, and credited to each wallet when the job is completed.
              They never see the amount before it is paid.
            </p>
            {earning?.pool > 0 && earning.withOneMore && (
              <p className="mt-2 rounded-md bg-white px-2.5 py-2 text-[11px] font-semibold text-emerald-900">
                {inr(earning.pool)} ÷ {earning.withOneMore.people} workers: main worker gets {inr(earning.withOneMore.leadShare)}, this worker gets {inr(earning.withOneMore.share)}.
              </p>
            )}
          </div>

          {warning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">{warning}</p>
              <button type="button" onClick={() => submit(true)} className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 font-bold text-white">Add anyway</button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700">Cancel</button>
          <button
            type="button"
            disabled={!chosen || saving}
            onClick={() => submit(false)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add worker'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpersPanel;
