import React, { useState, useEffect, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiCheck, FiLock, FiClock, FiChevronDown } from 'react-icons/fi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Per-day availability calendar, shared by the worker app (own schedule) and
 * the admin panel (managing a worker). Every date in the booking window is
 * either Available, Leave, or not marked yet.
 *  - Worker: ticks Available or Leave for each unmarked day. Once a day is
 *    saved it is locked — view only.
 *  - Admin: taps a date to cycle not marked -> Available -> Leave -> not marked.
 * When the admin requires daily marking, dates that aren't marked Available
 * receive no bookings.
 */
export default function AvailabilityEditor({ data, onSave, saving = false, isAdmin = false }) {
  const [availableDays, setAvailableDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [availableDates, setAvailableDates] = useState([]);
  const [leaveDates, setLeaveDates] = useState([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState('');
  // { 'YYYY-MM-DD': ['09:00', ...] }: slots the worker will not work
  const [slotOffs, setSlotOffs] = useState({});
  const [slotsOpenFor, setSlotsOpenFor] = useState('');

  useEffect(() => {
    if (!data) return;
    setAvailableDays(data.availableDays || [0, 1, 2, 3, 4, 5, 6]);
    setAvailableDates(data.availableDates || []);
    setLeaveDates((data.leaves || []).map((l) => l.date));
    setSlotOffs(data.slotOffs || {});
    setSelectedScheduleDate((current) => (
      data.slotSchedule?.some((day) => day.date === current)
        ? current
        : data.slotSchedule?.[0]?.date || ''
    ));
  }, [data]);

  const requireDaily = data?.requireDailyAvailability !== false;

  const pendingDates = useMemo(
    () => new Set((data?.leaves || []).filter((l) => l.status === 'pending').map((l) => l.date)),
    [data]
  );
  // Available days waiting for admin approval — shown locked, not yet counted.
  const pendingAvailDates = useMemo(() => new Set(data?.pendingAvailableDates || []), [data]);
  const bookedDates = useMemo(() => new Set(data?.bookedDates || []), [data]);
  // Days already saved by the worker — final for them, only admin can change.
  const lockedDates = useMemo(() => new Set(isAdmin ? [] : [
    ...(data?.availableDates || []),
    ...(data?.pendingAvailableDates || []),
    ...(data?.leaves || []).map((l) => l.date)
  ]), [data, isAdmin]);
  const selectedSchedule = useMemo(
    () => (data?.slotSchedule || []).find((day) => day.date === selectedScheduleDate) || null,
    [data, selectedScheduleDate]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);
  // Only the window customers can book in (admin: Advance Booking Window)
  const windowDays = data?.advanceBookingDays || 7;
  const lastDay = new Date(today);
  lastDay.setDate(lastDay.getDate() + windowDays - 1);
  const maxMonthOffset = (lastDay.getFullYear() - today.getFullYear()) * 12 + (lastDay.getMonth() - today.getMonth());

  const shown = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
  const leadingBlanks = shown.getDay();

  // Every date in the booking window, for the "unmarked" counter / bulk action
  const windowDates = useMemo(() => {
    const list = [];
    for (let i = 0; i < windowDays; i += 1) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      list.push(ymd(d));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays, todayStr]);

  const unmarkedDates = windowDates.filter((d) => !availableDates.includes(d) && !leaveDates.includes(d) && !bookedDates.has(d) && !pendingAvailDates.has(d));

  const markedDates = useMemo(() => windowDates
    .filter((date) => availableDates.includes(date) || leaveDates.includes(date))
    .map((date) => {
      const parsed = new Date(`${date}T00:00:00`);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const label = date === todayStr
        ? 'Today'
        : date === ymd(tomorrow)
          ? 'Tomorrow'
          : parsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const isLeave = leaveDates.includes(date);
      return {
        date,
        label,
        isLeave,
        isPending: isLeave && pendingDates.has(date)
      };
    }), [windowDates, availableDates, leaveDates, pendingDates, todayStr]);

  const toggleWeekday = (d) => {
    setAvailableDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  // not marked -> Available -> Leave -> not marked
  const cycleDate = (dateStr) => {
    if (!isAdmin) return;
    if (leaveDates.includes(dateStr)) {
      setLeaveDates((prev) => prev.filter((x) => x !== dateStr));
    } else if (availableDates.includes(dateStr)) {
      setAvailableDates((prev) => prev.filter((x) => x !== dateStr));
      setLeaveDates((prev) => [...prev, dateStr].sort());
    } else {
      setAvailableDates((prev) => [...prev, dateStr].sort());
    }
  };

  // Worker checkboxes: ticking one clears the other; unticking unmarks the day.
  const setDayMark = (dateStr, mark, checked) => {
    setAvailableDates((prev) => {
      const rest = prev.filter((x) => x !== dateStr);
      return mark === 'available' && checked ? [...rest, dateStr].sort() : rest;
    });
    setLeaveDates((prev) => {
      const rest = prev.filter((x) => x !== dateStr);
      return mark === 'leave' && checked ? [...rest, dateStr].sort() : rest;
    });
  };

  const markAllAvailable = () => {
    setAvailableDates((prev) => [...new Set([...prev, ...unmarkedDates])].sort());
  };

  const slotsByDate = useMemo(
    () => Object.fromEntries((data?.slotSchedule || []).map((day) => [day.date, day.slots])),
    [data]
  );
  // An approved slot leave is final for the worker (only admin can undo it).
  const approvedOff = useMemo(() => {
    const pending = data?.slotOffsPending || {};
    const all = data?.slotOffs || {};
    const out = {};
    Object.keys(all).forEach((d) => {
      const list = all[d].filter((v) => !(pending[d] || []).includes(v));
      if (list.length) out[d] = list;
    });
    return out;
  }, [data]);
  const toggleSlot = (date, value) => {
    if (!isAdmin && (approvedOff[date] || []).includes(value)) return;
    setSlotOffs((prev) => {
      const current = prev[date] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      const copy = { ...prev };
      if (next.length) copy[date] = next; else delete copy[date];
      return copy;
    });
  };
  const setDaySlots = (date, off) => {
    const toggleable = (slotsByDate[date] || []).filter((sl) => !['busy', 'capacity_blocked', 'elapsed'].includes(sl.status)).map((sl) => sl.value);
    const locked = isAdmin ? [] : (approvedOff[date] || []);
    setSlotOffs((prev) => {
      const copy = { ...prev };
      const next = off ? [...new Set([...toggleable, ...locked])] : locked;
      if (next.length) copy[date] = next; else delete copy[date];
      return copy;
    });
  };
  const normSlotOffs = (obj) => JSON.stringify(Object.keys(obj || {}).sort().map((d) => [d, [...obj[d]].sort()]));

  const dirty = useMemo(() => {
    const originalDays = [...(data?.availableDays || [0, 1, 2, 3, 4, 5, 6])].sort().join(',');
    const originalAvail = [...(data?.availableDates || [])].sort().join(',');
    const originalLeave = (data?.leaves || []).map((l) => l.date).sort().join(',');
    return (
      originalDays !== [...availableDays].sort().join(',') ||
      originalAvail !== [...availableDates].sort().join(',') ||
      originalLeave !== [...leaveDates].sort().join(',') ||
      normSlotOffs(data?.slotOffs) !== normSlotOffs(slotOffs)
    );
  }, [data, availableDays, availableDates, leaveDates, slotOffs]);

  // Build calendar weeks for a structured table grid
  const weeks = useMemo(() => {
    const list = [];
    let currentWeek = [];

    for (let i = 0; i < leadingBlanks; i++) {
      currentWeek.push({ isBlank: true, key: `blank-${i}` });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(shown.getFullYear(), shown.getMonth(), i);
      const key = ymd(date);
      const outOfRange = date < today || date > lastDay;
      const isBooked = bookedDates.has(key);
      const isLeave = leaveDates.includes(key);
      const isAvailable = !isLeave && (availableDates.includes(key) || isBooked);
      const weekdayOff = !requireDaily && !isAvailable && !isLeave && !availableDays.includes(date.getDay());
      const isPending = isLeave && pendingDates.has(key);

      currentWeek.push({
        isBlank: false,
        dayNum: i,
        key,
        outOfRange,
        weekdayOff,
        isLeave,
        isAvailable,
        isBooked,
        isPending,
        disabled: outOfRange || (isBooked && !isLeave) || !isAdmin,
        isToday: key === todayStr
      });

      if (currentWeek.length === 7) {
        list.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      const remaining = 7 - currentWeek.length;
      for (let i = 0; i < remaining; i++) {
        currentWeek.push({ isBlank: true, key: `trail-${i}` });
      }
      list.push(currentWeek);
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.getTime(), daysInMonth, leadingBlanks, todayStr, windowDays, availableDays, availableDates, leaveDates, bookedDates, pendingDates, requireDaily]);

  // ---- Worker view: clean day cards instead of the admin calendar ----
  if (!isAdmin) {
    const availCount = windowDates.filter((d) => availableDates.includes(d) || (bookedDates.has(d) && !leaveDates.includes(d))).length;
    const leaveCount = windowDates.filter((d) => leaveDates.includes(d)).length;
    const awaitingCount = windowDates.filter((d) => pendingAvailDates.has(d) && !availableDates.includes(d)).length;
    const openCount = windowDates.length - availCount - leaveCount - awaitingCount;
    const changesCount = windowDates.filter((d) => !lockedDates.has(d) && (availableDates.includes(d) || leaveDates.includes(d))).length;
    const slotChangeCount = Object.keys(slotOffs).reduce((n, d) => n + slotOffs[d].filter((v) => !(data?.slotOffs?.[d] || []).includes(v)).length, 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Approved', value: availCount, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
            { label: 'Awaiting', value: awaitingCount, tone: 'text-violet-700 bg-violet-50 border-violet-100' },
            { label: 'On leave', value: leaveCount, tone: 'text-rose-700 bg-rose-50 border-rose-100' },
            { label: 'Not marked', value: openCount, tone: 'text-amber-700 bg-amber-50 border-amber-100' }
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-2 py-2.5 text-center ${s.tone}`}>
              <p className="text-xl font-extrabold leading-none">{s.value}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
          <FiLock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
          <p>
            Choose <b className="text-emerald-700">Available</b> or <b className="text-rose-600">Leave</b> for each day, then open <b>Time slots</b> to switch off any slot you cannot work. You receive bookings only on days approved as Available.
            {data?.availabilityRequiresApproval && ' Available days are sent to admin for approval.'}
            {' '}<b>Saved days are locked</b> and can only be changed by admin.
            {!data?.leaveAutoApprove && ' Leave days need admin approval.'}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Next {windowDays} days</h3>
            {requireDaily && unmarkedDates.length > 0 && (
              <button type="button" onClick={markAllAvailable} className="text-[11px] font-bold text-teal-700 hover:underline">
                Mark all Available
              </button>
            )}
          </div>

          <div className="space-y-2">
            {windowDates.map((date) => {
              const parsed = new Date(`${date}T00:00:00`);
              const isToday = date === todayStr;
              const isLeave = leaveDates.includes(date);
              const isAvail = availableDates.includes(date);
              const isBooked = bookedDates.has(date);
              const locked = lockedDates.has(date) || (isBooked && !isLeave);
              const isPending = isLeave && pendingDates.has(date);
              const isAwaiting = !isLeave && !isAvail && pendingAvailDates.has(date);
              const accent = isLeave ? 'bg-rose-500' : isAwaiting ? 'bg-violet-400' : (isAvail || isBooked) ? 'bg-emerald-500' : 'bg-slate-200';

              return (
                <div key={date} className="relative rounded-2xl border border-slate-200 bg-white pl-4 pr-3 py-2.5 shadow-sm overflow-hidden">
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
                  <div className="flex items-center gap-3">
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {parsed.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-extrabold leading-tight text-slate-900">{parsed.getDate()}</p>
                    <p className="text-[10px] font-medium text-slate-400">{parsed.toLocaleDateString('en-IN', { month: 'short' })}</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">
                      {isToday ? 'Today' : parsed.toLocaleDateString('en-IN', { weekday: 'long' })}
                    </p>
                    {isBooked && !isLeave && <p className="text-[10px] font-semibold text-blue-600">Has a booking</p>}
                  </div>

                  {locked ? (
                    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      isLeave
                        ? (isPending ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700')
                        : isAwaiting
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <FiLock className="w-3 h-3" />
                      {isLeave ? (isPending ? 'Leave pending' : 'On leave') : isAwaiting ? 'Awaiting approval' : 'Available'}
                    </span>
                  ) : (
                    <div className="shrink-0 inline-flex rounded-full bg-slate-100 p-0.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDayMark(date, 'available', !isAvail)}
                        className={`px-3 py-1.5 rounded-full transition-all ${isAvail ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Available
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayMark(date, 'leave', !isLeave)}
                        className={`px-3 py-1.5 rounded-full transition-all ${isLeave ? 'bg-rose-500 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Leave
                      </button>
                    </div>
                  )}
                  </div>

                  {!isLeave && (slotsByDate[date] || []).length > 0 && (() => {
                    const slots = slotsByDate[date];
                    const offList = slotOffs[date] || [];
                    const open = slotsOpenFor === date;
                    const usable = slots.filter((sl) => !['busy', 'capacity_blocked', 'elapsed'].includes(sl.status));
                    return (
                      <div className="mt-2 border-t border-slate-100 pt-2">
                        <button
                          type="button"
                          onClick={() => setSlotsOpenFor(open ? '' : date)}
                          className="flex w-full items-center justify-between text-[11px] font-bold text-slate-600"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <FiClock className="h-3.5 w-3.5 text-slate-400" />
                            Time slots
                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${offList.length ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                              {offList.length ? `${offList.length} off${(data?.slotOffsPending?.[date] || []).length ? ' · ' + data.slotOffsPending[date].length + ' pending' : ''}` : 'All slots on'}
                            </span>
                          </span>
                          <FiChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>

                        {open && (
                          <div className="mt-2.5">
                            <div className="mb-2 flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Slot off needs admin approval; until then you still get jobs in it</span>
                              {usable.length > 0 && (
                                <span className="font-bold">
                                  <button type="button" onClick={() => setDaySlots(date, false)} className="text-emerald-700 hover:underline">All on</button>
                                  <span className="mx-1.5 text-slate-300">|</span>
                                  <button type="button" onClick={() => setDaySlots(date, true)} className="text-rose-600 hover:underline">All off</button>
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {slots.map((sl) => {
                                const booked = ['busy', 'capacity_blocked'].includes(sl.status);
                                const elapsed = sl.status === 'elapsed';
                                const off = offList.includes(sl.value);
                                const savedPending = (data?.slotOffsPending?.[date] || []).includes(sl.value);
                                const approved = (approvedOff[date] || []).includes(sl.value);
                                const waiting = off && savedPending;
                                const disabled = booked || elapsed || approved;
                                const tone = booked
                                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                                  : elapsed
                                    ? 'border-slate-100 bg-slate-50 text-slate-300'
                                    : approved
                                      ? 'border-rose-300 bg-rose-100 text-rose-700'
                                      : waiting
                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                        : off
                                          ? 'border-rose-200 bg-rose-50 text-rose-600'
                                          : 'border-emerald-200 bg-emerald-50 text-emerald-700';
                                return (
                                  <button
                                    key={sl.value}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggleSlot(date, sl.value)}
                                    className={`rounded-lg border px-2 py-1.5 text-left transition-colors ${tone} ${disabled ? 'cursor-not-allowed' : 'active:scale-[0.98]'}`}
                                  >
                                    <span className={`block text-[11px] font-bold leading-tight ${off ? 'line-through decoration-rose-300' : ''}`}>{sl.range || sl.display}</span>
                                    <span className="block text-[9px] font-semibold uppercase tracking-wide opacity-80">
                                      {booked ? 'Booked' : elapsed ? 'Passed' : approved ? 'Off · approved' : waiting ? 'Awaiting approval' : off ? 'Off · will send' : 'Will work'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-1 bg-gradient-to-t from-white via-white to-white/80">
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => {
              if (changesCount > 0 && !window.confirm('Once saved, the days you marked cannot be changed. Save availability?')) return;
              onSave({ availableDays, availableDates, leaveDates, slotOffs });
            }}
            className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors shadow-md"
          >
            {saving ? 'Saving…' : <><FiCheck className="w-4 h-4" /> {changesCount === 0 && slotChangeCount > 0 ? `Send ${slotChangeCount} slot${slotChangeCount === 1 ? '' : 's'} for approval` : `Save ${changesCount > 0 ? `${changesCount} day${changesCount === 1 ? '' : 's'}` : 'availability'}`}</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && Array.isArray(data?.slotSchedule) && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-black text-gray-900">Slot occupancy</h3>
              <p className="text-[11px] text-gray-500">Live worker schedule from bookings and marked availability.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${data.workerStatus === 'busy' ? 'bg-red-100 text-red-700' : data.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
              {data.workerStatus === 'busy' ? 'Currently busy' : data.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {data.slotSchedule.map((day) => {
              const selected = day.date === selectedScheduleDate;
              const parsed = new Date(`${day.date}T00:00:00`);
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedScheduleDate(day.date)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-all ${selected ? 'border-blue-500 bg-blue-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
                >
                  <span className="block text-[10px] font-bold uppercase opacity-80">{parsed.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="block text-xs font-black">{parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span className={`block text-[9px] mt-0.5 ${selected ? 'text-blue-100' : 'text-gray-400'}`}>
                    {day.summary.busy} busy · {day.summary.available} free
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSchedule && (
            <>
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-center">
                  <p className="text-lg font-black text-red-700">{selectedSchedule.summary.busy}</p>
                  <p className="text-[9px] font-bold uppercase text-red-600">Busy</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-center">
                  <p className="text-lg font-black text-emerald-700">{selectedSchedule.summary.available}</p>
                  <p className="text-[9px] font-bold uppercase text-emerald-600">Available</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-2 text-center">
                  <p className="text-lg font-black text-gray-700">{selectedSchedule.summary.unavailable}</p>
                  <p className="text-[9px] font-bold uppercase text-gray-500">Blocked</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {selectedSchedule.slots.map((slot) => {
                  const styles = {
                    busy: 'border-red-300 bg-red-50 text-red-800',
                    capacity_blocked: 'border-rose-300 bg-rose-50 text-rose-800',
                    available: 'border-emerald-300 bg-emerald-50 text-emerald-800',
                    leave: 'border-orange-200 bg-orange-50 text-orange-800',
                    slot_off: 'border-rose-200 bg-rose-50 text-rose-700',
                    slot_pending: 'border-amber-200 bg-amber-50 text-amber-700',
                    elapsed: 'border-gray-200 bg-gray-100 text-gray-400',
                    unavailable: 'border-gray-200 bg-white text-gray-500'
                  };
                  const labels = { busy: 'Booked', capacity_blocked: 'Busy · active job', available: 'Available', leave: 'Leave', slot_off: 'Slot off (worker)', slot_pending: 'Slot off · pending', elapsed: 'Elapsed', unavailable: 'Not available' };
                  return (
                    <div key={`${selectedSchedule.date}-${slot.value}`} className={`rounded-xl border p-2.5 ${styles[slot.status] || styles.unavailable}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black">{slot.range}</span>
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-black uppercase">{labels[slot.status]}</span>
                      </div>
                      {slot.booking && (
                        <div className="mt-2 border-t border-red-200 pt-2 text-[10px] leading-relaxed">
                          <p className="font-black">#{slot.booking.bookingNumber} · {slot.booking.serviceName}</p>
                          <p className="opacity-80">{slot.booking.bookingType === 'instant' ? 'Instant' : 'Slot'} · {String(slot.booking.status).replaceAll('_', ' ')}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-gray-500">Booked slots are locked. Reassign or cancel the related booking before marking that day as leave.</p>
            </>
          )}
        </div>
      )}

      {/* Weekly pattern: only used when daily marking is not required */}
      {!requireDaily && (
        <div>
          <h3 className="text-sm font-bold text-gray-900">Days I work every week</h3>
          <p className="text-[11px] text-gray-500 mb-2">Used for any date you haven't marked yourself.</p>
          <div className="flex gap-1 sm:gap-1.5">
            {WEEKDAYS.map((label, d) => {
              const on = availableDays.includes(d);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleWeekday(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    on
                      ? 'bg-[#00897B] border-[#00897B] text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day-by-day calendar */}
      <div>
        <h3 className="text-sm font-bold text-gray-900">Mark each day: Available or Leave</h3>
        <p className="text-[11px] text-gray-500 mb-2">
          {isAdmin
            ? <>Tap a date to switch: <b>Available</b> → <b>Leave</b> → not marked (next {windowDays} days).{' '}</>
            : <>Tick <b>Available</b> or <b>Leave</b> for each day below (next {windowDays} days). <b>A day you have saved can't be changed.</b>{' '}</>}
          {requireDaily && 'You get bookings only on days marked Available.'}{' '}
          {!isAdmin && !data?.leaveAutoApprove && 'New leave days need admin approval.'}
        </p>

        <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-3">
          <div className="flex items-center justify-between px-1 pb-2.5">
            <button
              type="button"
              disabled={monthOffset === 0}
              onClick={() => setMonthOffset((m) => m - 1)}
              className="p-1 rounded hover:bg-gray-100 text-gray-700 disabled:opacity-20 transition-colors"
              title="Previous month"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <h4 className="text-sm font-bold text-gray-800 tracking-tight">
              {MONTHS[shown.getMonth()]} {shown.getFullYear()}
            </h4>
            <button
              type="button"
              disabled={monthOffset >= maxMonthOffset}
              onClick={() => setMonthOffset((m) => m + 1)}
              className="p-1 rounded hover:bg-gray-100 text-gray-700 disabled:opacity-20 transition-colors"
              title="Next month"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>

          <table className="w-full border-collapse border border-gray-200 text-center text-xs table-fixed">
            <thead>
              <tr>
                {DAY_HEADERS.map((day) => (
                  <th key={day} className="border border-gray-200 py-1.5 text-xs font-semibold text-gray-700 bg-white">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wIdx) => (
                <tr key={wIdx}>
                  {week.map((cell) => {
                    if (cell.isBlank) {
                      return <td key={cell.key} className="border border-gray-200 bg-gray-50/70 h-9 p-0" />;
                    }

                    let cls = 'bg-white text-gray-800 hover:bg-gray-50 cursor-pointer font-medium';
                    let title = 'Tap to mark Available';
                    if (cell.outOfRange) {
                      cls = 'bg-white text-gray-300 pointer-events-none cursor-default font-normal';
                      title = undefined;
                    } else if (cell.isLeave) {
                      cls = cell.isPending
                        ? 'bg-amber-100 text-amber-900 font-bold'
                        : 'bg-red-500 text-white font-bold shadow-inner';
                      title = cell.isPending ? 'Leave awaiting approval (tap to clear)' : 'Leave (tap to clear)';
                    } else if (cell.isBooked) {
                      cls = 'bg-blue-50 text-blue-700 font-bold cursor-not-allowed';
                      title = 'You have a booking on this day';
                    } else if (cell.isAvailable) {
                      cls = 'bg-emerald-500 text-white font-bold shadow-inner';
                      title = 'Available (tap to mark Leave)';
                    } else if (cell.weekdayOff) {
                      cls = 'bg-gray-100 text-gray-400 font-normal cursor-pointer';
                      title = 'Weekly off (tap to mark Available)';
                    }

                    return (
                      <td key={cell.key} className="border border-gray-200 h-9 p-0 relative">
                        <button
                          type="button"
                          disabled={cell.disabled}
                          onClick={() => cycleDate(cell.key)}
                          title={title}
                          className={`w-full h-full flex flex-col items-center justify-center text-xs transition-colors select-none ${cls}`}
                        >
                          <span className={cell.isToday && !cell.isLeave && !cell.isAvailable ? 'font-bold underline decoration-emerald-500 decoration-2 underline-offset-2' : ''}>
                            {cell.dayNum}
                          </span>
                          {cell.isBooked && <span className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-0.5" />}
                          {requireDaily && !cell.outOfRange && !cell.isLeave && !cell.isAvailable && !cell.isBooked && (
                            <span className="w-1 h-1 rounded-full bg-amber-400 absolute bottom-0.5" title="Not marked" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-center gap-3.5 mt-2.5 text-[11px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Available
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Leave
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-amber-200 inline-block" /> Leave pending
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 inline-block" /> Booked
            </span>
            {requireDaily && (
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Not marked
              </span>
            )}
          </div>
        </div>

        {!isAdmin && (
          <div className="mt-2.5 rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-bold text-gray-800 mb-2">Mark your days</p>
            <div className="space-y-1.5">
              {windowDates.map((date) => {
                const parsed = new Date(`${date}T00:00:00`);
                const label = date === todayStr
                  ? 'Today'
                  : parsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                const isLeave = leaveDates.includes(date);
                const isAvail = availableDates.includes(date);
                const isBooked = bookedDates.has(date);
                const locked = lockedDates.has(date) || (isBooked && !isLeave);
                const isPending = isLeave && pendingDates.has(date);
                if (locked) {
                  return (
                    <div key={date} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-800">{label}</p>
                        <p className="text-[10px] text-gray-500">{date}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isLeave
                          ? (isPending ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700')
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <FiLock className="w-3 h-3" />
                        {isLeave ? (isPending ? 'Leave pending' : 'Leave') : (isBooked && !isAvail ? 'Booked' : 'Available')}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={date} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-gray-800">{label}</p>
                      <p className="text-[10px] text-gray-500">{date}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-emerald-600"
                          checked={isAvail}
                          onChange={(e) => setDayMark(date, 'available', e.target.checked)}
                        />
                        Available
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-red-500"
                          checked={isLeave}
                          onChange={(e) => setDayMark(date, 'leave', e.target.checked)}
                        />
                        Leave
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isAdmin && markedDates.length > 0 && (
          <div className="mt-2.5 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-gray-800">Your marked days</p>
              <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                {markedDates.length} marked
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {markedDates.map((item) => (
                <div
                  key={item.date}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
                    item.isLeave
                      ? item.isPending
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-red-200 bg-red-50'
                      : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-gray-800">{item.label}</p>
                    <p className="text-[10px] text-gray-500">{item.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.isLeave
                      ? item.isPending
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.isLeave ? (item.isPending ? 'Holiday pending' : 'Holiday / Leave') : 'Available'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {requireDaily && unmarkedDates.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-[11px] text-amber-800 font-medium">
              {unmarkedDates.length} day{unmarkedDates.length === 1 ? '' : 's'} not marked — no bookings on those days.
            </p>
            <button
              type="button"
              onClick={markAllAvailable}
              className="shrink-0 text-[11px] font-bold text-emerald-700 underline"
            >
              Mark all Available
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={saving || !dirty || availableDays.length === 0}
        onClick={() => {
          if (!isAdmin && !window.confirm('Once saved, the days you marked cannot be changed. Save availability?')) return;
          onSave({ availableDays, availableDates, leaveDates, slotOffs });
        }}
        className="w-full py-2.5 rounded-xl bg-[#00897B] hover:bg-[#00796B] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
      >
        {saving ? 'Saving…' : <><FiCheck className="w-4 h-4" /> Save availability</>}
      </button>
    </div>
  );
}
