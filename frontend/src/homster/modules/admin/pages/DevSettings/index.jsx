import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

const LABELS = {
  HomeServiceBooking: 'Bookings',
  HomeServiceBookingRequest: 'Worker job offers',
  VendorBill: 'Bills',
  AvailabilityLedger: 'Slot ledger entries',
  Transaction: 'Transactions',
  Withdrawal: 'Withdrawals',
  Settlement: 'Settlements',
  SubscriptionOrder: 'Subscription orders',
  workers: 'Worker wallets with a balance'
};

/**
 * Superadmin-only developer tools: permanently wipe test bookings and
 * financial data. Nothing here can be undone.
 */
const DevSettings = () => {
  const [stats, setStats] = useState([]);
  const [phrase, setPhrase] = useState('DELETE');
  const [selected, setSelected] = useState([]);
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/dev/stats');
      setStats(data.data || []);
      setPhrase(data.confirmPhrase || 'DELETE');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load dev data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (key) => setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const purge = async () => {
    try {
      setBusy(true);
      const { data } = await api.post('/admin/dev/purge', { targets: selected, confirm: typed });
      toast.success(data.message || 'Deleted');
      setSelected([]);
      setTyped('');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purge failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Dev Settings</h2>
        <p className="text-xs text-gray-500">Developer tools. Deleted data cannot be recovered.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
        <FiAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>This permanently deletes data from the live database for every user. Use it only to clear test data.</p>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
        ) : stats.map((t) => (
          <label key={t.key} className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer bg-white ${selected.includes(t.key) ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'}`}>
            <input type="checkbox" className="w-4 h-4 mt-1 accent-red-600" checked={selected.includes(t.key)} onChange={() => toggle(t.key)} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-gray-900 text-sm">{t.label}</p>
                <span className="text-xs font-bold text-gray-600">{t.counts.total} record{t.counts.total === 1 ? '' : 's'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(t.counts).filter(([k]) => k !== 'total').map(([k, v]) => (
                  <span key={k} className="text-[11px] bg-gray-100 text-gray-700 rounded-md px-2 py-0.5">{LABELS[k] || k}: <b>{v}</b></span>
                ))}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <label className="text-xs font-bold text-gray-700">
          Type <span className="font-mono text-red-600">{phrase}</span> to confirm
        </label>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy || selected.length === 0 || typed !== phrase}
            onClick={purge}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-40"
          >
            <FiTrash2 className="w-4 h-4" /> {busy ? 'Deleting…' : 'Delete selected data'}
          </button>
          <button type="button" onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700">
            <FiRefreshCw className="w-3.5 h-3.5" /> Refresh counts
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevSettings;
