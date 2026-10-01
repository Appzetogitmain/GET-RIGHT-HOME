import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSearch, FiUser, FiMapPin, FiPhone, FiStar, FiAlertTriangle,
  FiZap, FiCalendar, FiCheck, FiInfo
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import adminWorkerService from '../../../../../services/adminWorkerService';
import { adminBookingService } from '../../../../../services/adminBookingService';

// Server errors an admin may knowingly override when assigning.
const OVERRIDABLE_CODES = [
  'WORKER_NOT_ELIGIBLE',
  'WORKER_BOOKING_MODE_NOT_ALLOWED',
  'WORKER_UNAVAILABLE',
  'SLOT_CONFLICT'
];

const norm = (v) => String(v || '').toLowerCase().trim();

const Chip = ({ tone = 'slate', children }) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
    slate: 'bg-slate-100 text-slate-600 ring-slate-500/10'
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
};

const AssignWorkerModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('recommended'); // 'recommended' | 'all'
  const [assigningId, setAssigningId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { worker, message }

  useEffect(() => {
    if (isOpen) {
      fetchWorkers();
    } else {
      setSearch('');
      setWorkers([]);
      setFilter('recommended');
      setConfirm(null);
    }
  }, [isOpen]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await adminWorkerService.getAllWorkers({ approvalStatus: 'approved' });
      if (res.success) setWorkers(res.data || []);
    } catch (error) {
      console.error('Error fetching workers', error);
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const assign = async (worker, override = false) => {
    const workerId = worker._id || worker.id;
    try {
      setAssigningId(workerId);
      const res = await adminBookingService.assignWorker(booking._id, workerId, override);
      if (res.success) {
        toast.success(res.message || 'Worker assigned successfully');
        setConfirm(null);
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      if (!override && OVERRIDABLE_CODES.includes(error.code)) {
        // Admin has final authority: show why it's flagged and let them proceed.
        setConfirm({ worker, message: error.message });
      } else {
        setConfirm(null);
        toast.error(error.message || 'Failed to assign worker');
      }
    } finally {
      setAssigningId(null);
    }
  };

  const bookingZoneId = useMemo(() => {
    if (!booking) return null;
    if (booking.zoneId?._id) return String(booking.zoneId._id);
    if (typeof booking.zoneId === 'string') return booking.zoneId;
    return null;
  }, [booking]);

  const bookingZoneName = useMemo(() => {
    if (!booking) return '';
    return booking.zoneName || booking.zoneId?.name || booking.address?.city || '';
  }, [booking]);

  const isInstant = booking?.bookingType === 'instant';

  const isWorkerInZone = (worker) => {
    const target = norm(bookingZoneName);
    if (bookingZoneId && Array.isArray(worker.zoneIds)
      && worker.zoneIds.some((z) => String(z?._id || z) === bookingZoneId)) return true;
    if (target && Array.isArray(worker.zoneIds)
      && worker.zoneIds.some((z) => typeof z === 'object' && norm(z?.name) === target)) return true;
    if (target && Array.isArray(worker.zones) && worker.zones.some((z) => norm(z) === target)) return true;
    return false;
  };

  const isCategoryMatch = (worker) => {
    const target = norm(booking?.serviceCategory);
    if (!target) return false;
    return (worker.serviceCategories || []).some((c) => {
      const cat = norm(c);
      return cat && (cat.includes(target) || target.includes(cat));
    });
  };

  const supportsMode = (worker) => {
    const modes = Array.isArray(worker.bookingModes) && worker.bookingModes.length ? worker.bookingModes : ['slot'];
    return modes.includes(isInstant ? 'instant' : 'slot');
  };

  const isOnline = (w) => !!(w.isOnline || norm(w.status) === 'online');

  // Rank: how well the worker fits this booking, then presence, then name.
  const decorate = (w) => {
    const inZone = isWorkerInZone(w);
    const skill = isCategoryMatch(w);
    const mode = supportsMode(w);
    const online = isOnline(w);
    const fit = (inZone ? 4 : 0) + (skill ? 4 : 0) + (mode ? 2 : 0) + (online ? 1 : 0);
    return { worker: w, inZone, skill, mode, online, fit, recommended: inZone && skill && mode };
  };

  const rows = useMemo(() => {
    const q = norm(search);
    return workers
      .filter((w) => !q || [w.name, w.phone, w.address?.city, (w.serviceCategories || []).join(' '), (w.zones || []).join(' ')]
        .some((f) => norm(f).includes(q)))
      .map(decorate)
      .sort((a, b) => b.fit - a.fit || (a.worker.name || '').localeCompare(b.worker.name || ''));
  }, [workers, search, booking]);

  const recommendedCount = rows.filter((r) => r.recommended).length;
  const visible = filter === 'recommended' ? rows.filter((r) => r.recommended) : rows;

  const renderRow = (row) => {
    const { worker, inZone, skill, mode, online } = row;
    const id = worker._id || worker.id;
    const busy = assigningId === id;
    const skills = (worker.serviceCategories || []).join(', ') || 'No skills listed';

    return (
      <li key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300">
        <div className="relative shrink-0">
          {worker.profilePhoto ? (
            <img src={worker.profilePhoto} alt="" className="h-11 w-11 rounded-full border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
              {worker.name ? worker.name.charAt(0).toUpperCase() : <FiUser className="h-4 w-4" />}
            </div>
          )}
          <span
            title={online ? 'Online' : 'Offline'}
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h4 className="truncate text-sm font-semibold text-slate-900">{worker.name}</h4>
            {worker.rating > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-600">
                <FiStar className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(worker.rating).toFixed(1)}
              </span>
            )}
            {worker.phone && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <FiPhone className="h-3 w-3" />{worker.phone}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={skills}>{skills}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Chip tone={online ? 'green' : 'slate'}>{online ? 'Online' : 'Offline'}</Chip>
            <Chip tone={inZone ? 'green' : 'amber'}>{inZone ? 'In zone' : 'Outside zone'}</Chip>
            <Chip tone={skill ? 'green' : 'amber'}>{skill ? 'Skill match' : 'Different skill'}</Chip>
            {!mode && <Chip tone="amber">{isInstant ? 'Instant not enabled' : 'Slot not enabled'}</Chip>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => assign(worker)}
          disabled={!!assigningId}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Assigning…' : 'Assign'}
        </button>
      </li>
    );
  };

  const isManualRequired =
    booking?.status === 'manual_assignment_required' ||
    booking?.assignmentStatus === 'manual_assignment_required' ||
    booking?.rejectionReason;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[101] flex max-h-[90vh] w-[94%] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-slate-100 px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900">Assign a professional</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    You can assign any approved worker — flagged mismatches ask for your confirmation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>

              {/* Booking summary */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">#{booking?.bookingNumber || booking?._id?.slice(-6).toUpperCase()}</span>
                <span className="inline-flex items-center gap-1">
                  {isInstant ? <FiZap className="h-3.5 w-3.5 text-amber-500" /> : <FiCalendar className="h-3.5 w-3.5 text-indigo-500" />}
                  {isInstant ? 'Instant' : 'Scheduled'}
                </span>
                <span>{booking?.serviceName || booking?.serviceCategory || 'Service'}</span>
                <span className="inline-flex items-center gap-1">
                  <FiMapPin className="h-3.5 w-3.5 text-rose-500" />{bookingZoneName || 'Zone not set'}
                </span>
              </div>

              {isManualRequired && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                  <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>
                    {booking?.rejectionReason
                      ? <>A professional declined this booking (<span className="italic">“{booking.rejectionReason}”</span>). Choose another worker.</>
                      : 'No professional was available to take this booking automatically. Choose a worker to assign.'}
                  </p>
                </div>
              )}

              {/* Search + filter */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone, city or skill"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  {[
                    ['recommended', `Recommended (${recommendedCount})`],
                    ['all', `All workers (${rows.length})`]
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`rounded-md px-3 py-1.5 transition ${filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto bg-slate-50/60 px-5 py-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="mb-2 h-7 w-7 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  <p className="text-xs font-medium">Loading workers…</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {filter === 'recommended' ? 'No recommended workers' : 'No workers found'}
                  </p>
                  <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                    {filter === 'recommended'
                      ? 'Nobody matches this booking’s zone, skill and booking type. You can still assign any worker.'
                      : 'Try a different search.'}
                  </p>
                  {filter === 'recommended' && (
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Show all workers
                    </button>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">{visible.map(renderRow)}</ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <FiCheck className="h-3.5 w-3.5 text-emerald-600" />
                Recommended = in zone, matching skill, booking type enabled
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {/* Override confirmation */}
            <AnimatePresence>
              {confirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4"
                >
                  <motion.div
                    initial={{ scale: 0.96, y: 8 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.96, y: 8 }}
                    className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <FiAlertTriangle className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Assign {confirm.worker.name} anyway?</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{confirm.message}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      As admin you can override this. The worker will be notified of the assignment.
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirm(null)}
                        disabled={!!assigningId}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => assign(confirm.worker, true)}
                        disabled={!!assigningId}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {assigningId ? 'Assigning…' : 'Assign anyway'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AssignWorkerModal;
