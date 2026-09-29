import React, { useState, useEffect, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Per-day availability calendar, shared by the worker app (own schedule) and
 * the admin panel (managing a worker). Every date in the booking window is
 * either Available, Leave, or not marked yet; tapping a date cycles
 * not marked -> Available -> Leave -> not marked. When the admin requires
 * daily marking, dates that aren't marked Available receive no bookings.
 */
export default function AvailabilityEditor({ data, onSave, saving = false, isAdmin = false }) {
  const [availableDays, setAvailableDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [availableDates, setAvailableDates] = useState([]);
  const [leaveDates, setLeaveDates] = useState([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState('');

  useEffect(() => {
    if (!data) return;
    setAvailableDays(data.availableDays || [0, 1, 2, 3, 4, 5, 6]);
    setAvailableDates(data.availableDates || []);
    setLeaveDates((data.leaves || []).map((l) => l.date));
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
  const bookedDates = useMemo(() => new Set(data?.bookedDates || []), [data]);
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

  const unmarkedDates = windowDates.filter((d) => !availableDates.includes(d) && !leaveDates.includes(d) && !bookedDates.has(d));

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
    if (leaveDates.includes(dateStr)) {
      setLeaveDates((prev) => prev.filter((x) => x !== dateStr));
    } else if (availableDates.includes(dateStr)) {
      setAvailableDates((prev) => prev.filter((x) => x !== dateStr));
      setLeaveDates((prev) => [...prev, dateStr].sort());
    } else {
      setAvailableDates((prev) => [...prev, dateStr].sort());
    }
  };

  const markAllAvailable = () => {
    setAvailableDates((prev) => [...new Set([...prev, ...unmarkedDates])].sort());
  };

  const dirty = useMemo(() => {
    const originalDays = [...(data?.availableDays || [0, 1, 2, 3, 4, 5, 6])].sort().join(',');
    const originalAvail = [...(data?.availableDates || [])].sort().join(',');
    const originalLeave = (data?.leaves || []).map((l) => l.date).sort().join(',');
    return (
      originalDays !== [...availableDays].sort().join(',') ||
      originalAvail !== [...availableDates].sort().join(',') ||
      originalLeave !== [...leaveDates].sort().join(',')
    );
  }, [data, availableDays, availableDates, leaveDates]);

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
        disabled: outOfRange || (isBooked && !isLeave),
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
                    elapsed: 'border-gray-200 bg-gray-100 text-gray-400',
                    unavailable: 'border-gray-200 bg-white text-gray-500'
                  };
                  const labels = { busy: 'Booked', capacity_blocked: 'Busy · active job', available: 'Available', leave: 'Leave', elapsed: 'Elapsed', unavailable: 'Not available' };
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
          Tap a date to switch: <b>Available</b> → <b>Leave</b> → not marked (next {windowDays} days).{' '}
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

        {markedDates.length > 0 && (
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
        onClick={() => onSave({ availableDays, availableDates, leaveDates })}
        className="w-full py-2.5 rounded-xl bg-[#00897B] hover:bg-[#00796B] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
      >
        {saving ? 'Saving…' : <><FiCheck className="w-4 h-4" /> Save availability</>}
      </button>
    </div>
  );
}
