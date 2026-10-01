import React, { useState } from 'react';
import { FiArrowLeft, FiCalendar, FiHome, FiMoon, FiSun, FiSunrise, FiX } from 'react-icons/fi';
import { themeColors } from '../../../../../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const VISIBLE_CHIPS = 3;

// Morning / Afternoon / Evening, each with its own icon.
const groupByPeriod = (slots) => {
  const periods = [
    { label: 'Morning', Icon: FiSunrise, test: (m) => m < 12 * 60 },
    { label: 'Afternoon', Icon: FiSun, test: (m) => m < 17 * 60 + 30 },
    { label: 'Evening', Icon: FiMoon, test: () => true }
  ];
  const groups = periods.map((p) => ({ ...p, slots: [] }));
  slots.forEach((slot) => {
    const [h, m] = String(slot.value).split(':').map(Number);
    groups.find((g) => g.test(h * 60 + (m || 0))).slots.push(slot);
  });
  return groups.filter((g) => g.slots.length > 0);
};

/**
 * Step 2 — "Book your Slot": three quick date chips + "Pick Date" for the rest,
 * start times by part of the day, and a bottom card with the service address and
 * the Book Slot button. Days nobody can serve stay tappable and say why.
 */
const SlotStepView = ({
  dates,
  selectedDate,
  selectedTime,
  onDate,
  slots,
  onTime,
  formatDate,
  isDateSelected,
  isDateFullyBooked,
  availabilityLoading,
  notServiceable,
  addressLine,
  addressLabel = 'Home',
  onChangeAddress,
  onProceed,
  onBack
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const brand = themeColors.brand.teal;
  const selectedSlot = slots.find((s) => s.value === selectedTime);
  const canProceed = !!(selectedDate && selectedSlot && addressLine);
  const today = new Date().toDateString();
  const tomorrow = new Date(Date.now() + 86400000).toDateString();

  const quickDates = dates.slice(0, VISIBLE_CHIPS);
  // A date chosen from the picker takes over the "Pick Date" chip.
  const pickedBeyondChips = selectedDate && !quickDates.some((d) => d.toDateString() === selectedDate.toDateString());

  const relativeLabel = (date) => (date.toDateString() === today ? 'Today' : date.toDateString() === tomorrow ? 'Tomorrow' : formatDate(date).day);

  const chipStyle = (selected, full) => (selected
    ? { borderColor: themeColors.button, backgroundColor: `${brand}14`, color: themeColors.button }
    : { borderColor: '#E5E7EB', backgroundColor: full ? '#F9FAFB' : '#fff', color: full ? '#9CA3AF' : '#374151' });

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-1 hover:bg-slate-100">
            <FiArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <h1 className="text-base font-semibold text-slate-900">Book your Slot</h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-52 pt-5">
        {/* Date */}
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Select date</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {quickDates.map((date) => {
            const selected = isDateSelected(date);
            const full = isDateFullyBooked(date);
            return (
              <button
                key={date.toDateString()}
                type="button"
                onClick={() => onDate(date)}
                aria-pressed={selected}
                className="flex flex-col items-center rounded-lg border px-1 py-2.5 transition"
                style={chipStyle(selected, full)}
              >
                <span className="text-base font-medium leading-tight">{String(formatDate(date).date).padStart(2, '0')}</span>
                <span className="mt-0.5 text-[11px]">{relativeLabel(date)}</span>
                {full && !selected && <span className="mt-1 text-[9px] font-medium text-slate-400">Unavailable</span>}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center rounded-lg border px-1 py-2.5 transition"
            style={chipStyle(!!pickedBeyondChips, false)}
          >
            {pickedBeyondChips ? (
              <>
                <span className="text-base font-medium leading-tight">{String(selectedDate.getDate()).padStart(2, '0')}</span>
                <span className="mt-0.5 text-[11px]">{MONTHS[selectedDate.getMonth()]}</span>
              </>
            ) : (
              <>
                <FiCalendar className="h-5 w-5 text-slate-500" />
                <span className="mt-1 text-[11px] text-slate-600">Pick Date</span>
              </>
            )}
          </button>
        </div>

        {/* Time */}
        <h2 className="mb-3 mt-7 text-sm font-semibold text-slate-800">Select Start Time</h2>
        {!addressLine ? (
          <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Choose an address to see the available time slots.</p>
        ) : availabilityLoading && slots.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Checking available professionals…</p>
        ) : slots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-700">
              {notServiceable
                ? 'Service is not available in your area yet.'
                : selectedDate
                  ? `No professional is available on ${FULL_DAYS[selectedDate.getDay()]}, ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}.`
                  : 'No time slots available.'}
            </p>
            {!notServiceable && <p className="mt-1 text-xs text-slate-500">Please choose another date.</p>}
          </div>
        ) : (
          <div className="space-y-5">
            {groupByPeriod(slots).map(({ label, Icon, slots: groupSlots }) => (
              <div key={label}>
                <p className="mb-2.5 flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="h-4 w-4 text-slate-400" /> {label}
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {groupSlots.map((slot) => {
                    const selected = selectedTime === slot.value;
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => onTime(slot.value)}
                        aria-pressed={selected}
                        className="rounded-lg border px-1 py-3 text-xs font-medium transition"
                        style={selected
                          ? { borderColor: themeColors.button, backgroundColor: themeColors.button, color: '#fff' }
                          : { borderColor: '#E5E7EB', backgroundColor: '#fff', color: '#374151' }}
                      >
                        {slot.range || slot.display}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom: service address + Book Slot */}
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-6px_20px_rgba(15,23,42,0.08)]">
        <div className="mx-auto max-w-xl px-4 pb-4 pt-3">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <FiHome className="h-5 w-5 text-slate-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-900">Service at <span className="font-semibold">{addressLabel}</span></p>
              <p className="truncate text-xs text-slate-500">{addressLine || 'Select an address'}</p>
            </div>
            <button type="button" onClick={onChangeAddress} className="shrink-0 text-sm font-semibold" style={{ color: themeColors.button }}>
              {addressLine ? 'Change' : 'Add'}
            </button>
          </div>
          <button
            type="button"
            onClick={onProceed}
            disabled={!canProceed}
            className="mt-3 w-full rounded-lg py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: themeColors.button }}
          >
            Book Slot
          </button>
        </div>
      </div>

      {/* Pick Date */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-3xl bg-white px-5 pb-6 pt-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Pick a date</h2>
              <button type="button" onClick={() => setPickerOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {dates.map((date) => {
                const selected = isDateSelected(date);
                const full = isDateFullyBooked(date);
                return (
                  <button
                    key={date.toDateString()}
                    type="button"
                    onClick={() => { onDate(date); setPickerOpen(false); }}
                    className="flex flex-col items-center rounded-lg border px-1 py-2.5"
                    style={chipStyle(selected, full)}
                  >
                    <span className="text-base font-medium leading-tight">{String(formatDate(date).date).padStart(2, '0')}</span>
                    <span className="mt-0.5 text-[11px]">{MONTHS[date.getMonth()]}</span>
                    <span className="mt-0.5 text-[10px]">{formatDate(date).day}</span>
                    {full && !selected && <span className="mt-0.5 text-[9px] text-slate-400">Unavailable</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotStepView;
