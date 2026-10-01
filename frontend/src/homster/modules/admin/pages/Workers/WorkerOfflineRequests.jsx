import React, { useEffect, useState } from 'react';
import { FiCalendar, FiClock, FiList, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { getAvailabilityRequests, getOfflineRequests } from '../../services/workerService';
import AvailabilityRequestsPanel from './AvailabilityRequestsPanel';
import LeaveRequestsPanel from './LeaveRequestsPanel';
import ApprovalHistoryPanel from './ApprovalHistoryPanel';

const TABS = [
  { id: 'availability', label: 'Availability approvals', icon: FiCalendar },
  { id: 'leave', label: 'Leave requests', icon: FiClock },
  { id: 'history', label: 'History', icon: FiList }
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' }
];

/**
 * Workers → Leave & Availability. One place to review the two things a worker
 * asks of ops: days they want to be Available (needs approval before they can
 * take bookings) and days they want off.
 */
const LeaveAndAvailability = () => {
  const [tab, setTab] = useState('availability');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState({ availability: 0, leave: 0 });

  // Debounce typing so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Pending counts for both tabs, kept fresh regardless of which tab is open.
  const loadCounts = async () => {
    try {
      const [availability, leave] = await Promise.all([
        getAvailabilityRequests({ status: 'pending' }),
        getOfflineRequests({ status: 'pending', limit: 1 })
      ]);
      setCounts({
        availability: availability?.counts?.pending ?? 0,
        leave: leave?.counts?.pending ?? 0
      });
    } catch {
      /* counts are informational */
    }
  };

  useEffect(() => {
    loadCounts();
    window.addEventListener('workerOfflineRequestReceived', loadCounts);
    return () => window.removeEventListener('workerOfflineRequestReceived', loadCounts);
  }, [refreshKey]);

  const stat = (label, value, tone) => (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Leave &amp; Availability</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Approve the days workers mark as Available — they can take bookings and go online only on approved days —
              and review leave requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-2">
              {stat('Availability to approve', counts.availability, 'border-violet-100 bg-violet-50 text-violet-700')}
              {stat('Leave to approve', counts.leave, 'border-amber-100 bg-amber-50 text-amber-700')}
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiRefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-slate-200">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const count = counts[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); if (id === 'history') setStatus('all'); }}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatus(f.id)}
                className={`rounded-md px-3.5 py-1.5 transition ${
                  status === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search worker name or phone"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {tab === 'history' ? (
          <ApprovalHistoryPanel status={status} search={search} refreshKey={refreshKey} />
        ) : tab === 'availability' ? (
          <AvailabilityRequestsPanel
            status={status}
            search={search}
            refreshKey={refreshKey}
            onCount={(n) => setCounts((c) => ({ ...c, availability: n }))}
          />
        ) : (
          <LeaveRequestsPanel
            status={status}
            search={search}
            refreshKey={refreshKey}
            onCount={(n) => setCounts((c) => ({ ...c, leave: n }))}
          />
        )}
      </div>
    </div>
  );
};

export default LeaveAndAvailability;
