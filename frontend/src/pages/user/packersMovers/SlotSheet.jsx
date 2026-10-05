import React, { useMemo, useState } from 'react';
import { ChevronDown, X, Zap } from 'lucide-react';
import { BottomSheet, teal } from './Parts';

const pad = (n) => String(n).padStart(2, '0');
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "Confirm your shifting Date & Slot" — date cards, Morning / Afternoon slots, carton hint. */
const SlotSheet = ({ config, date, slot, cartons, onAddCartons, onConfirm, onClose }) => {
  const days = useMemo(() => {
    const out = [];
    const count = Math.min(config.advanceBookingDays || 14, 30);
    for (let i = 0; i < count; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({ ymd: ymdOf(d), d, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }) });
    }
    return out;
  }, [config.advanceBookingDays]);

  const [pickedDate, setPickedDate] = useState(date || days[0].ymd);
  const [pickedSlot, setPickedSlot] = useState(slot || null);
  const [openPeriod, setOpenPeriod] = useState('morning');

  const leadMs = (config.sameDayLeadHours || 0) * 3600 * 1000;
  const disabled = (s) => {
    const [h, m] = s.start.split(':').map(Number);
    const start = new Date(`${pickedDate}T${pad(h)}:${pad(m)}:00`);
    return start.getTime() < Date.now() + leadMs;
  };

  const periods = [['morning', 'Morning'], ['afternoon', 'Afternoon']].filter(([p]) => config.slots.some((s) => s.period === p));
  const chosenOk = pickedSlot && !disabled(pickedSlot);

  return (
    <BottomSheet onClose={onClose}>
      {(close) => (
        <>
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h2 className="text-lg font-bold text-slate-900">Confirm your shifting Date & Slot</h2>
            <button type="button" onClick={close} aria-label="Close" className="rounded-full border border-slate-200 p-1.5 text-slate-500"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-3">
            <p className="mb-2 text-sm font-medium text-slate-600">Select Pickup Date</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {days.map((d) => {
                const active = d.ymd === pickedDate;
                return (
                  <button
                    key={d.ymd}
                    type="button"
                    onClick={() => { setPickedDate(d.ymd); if (pickedSlot && disabledFor(d.ymd, pickedSlot, leadMs)) setPickedSlot(null); }}
                    className="w-[78px] shrink-0 rounded-xl border-2 px-2 py-2.5 text-center transition"
                    style={active ? { borderColor: teal, backgroundColor: `${teal}10` } : { borderColor: '#E2E8F0' }}
                  >
                    <p className={`text-xs ${active ? 'font-bold' : 'text-slate-500'}`} style={active ? { color: teal } : undefined}>{d.label}</p>
                    <p className="text-sm font-bold text-slate-900">{pad(d.d.getDate())} {d.d.toLocaleDateString('en-IN', { month: 'short' })}</p>
                  </button>
                );
              })}
            </div>

            <div className="my-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              <Zap className="h-4 w-4 text-amber-500" /> Slots Filling Fast, Book Now!
            </div>

            <p className="mb-1 text-sm font-medium text-slate-600">Select Pickup Slot</p>
            {periods.map(([period, label]) => (
              <div key={period} className="border-b border-slate-100 py-2">
                <button type="button" onClick={() => setOpenPeriod(openPeriod === period ? '' : period)} className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-slate-800">
                  {label}
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${openPeriod === period ? 'rotate-180' : ''}`} />
                </button>
                {openPeriod === period && (
                  <div className="grid grid-cols-3 gap-2 pb-2 pt-1">
                    {config.slots.filter((s) => s.period === period).map((s) => {
                      const off = disabled(s);
                      const active = pickedSlot?.start === s.start && !off;
                      return (
                        <button
                          key={s.start}
                          type="button"
                          disabled={off}
                          onClick={() => setPickedSlot(s)}
                          className={`rounded-lg border py-2.5 text-xs font-medium transition ${off ? 'cursor-not-allowed border-slate-100 text-slate-300' : active ? 'font-bold' : 'border-slate-200 text-slate-700'}`}
                          style={active ? { borderColor: teal, color: teal, backgroundColor: `${teal}10` } : undefined}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-slate-50 px-5 py-3 text-xs text-slate-600">
            You've added {cartons.added} cartons. Based on your inventory, we estimate you'll need {cartons.needed} for small items like books and clothes.{' '}
            {cartons.canAdd && cartons.toAdd > 0 && (
              <button type="button" onClick={onAddCartons} className="font-semibold underline" style={{ color: teal }}>Add {cartons.toAdd} Cartons</button>
            )}
          </div>
          <div className="border-t border-slate-200 bg-white px-5 py-3">
            <button
              type="button"
              disabled={!chosenOk}
              onClick={() => onConfirm({ date: pickedDate, slot: pickedSlot })}
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-40"
              style={{ backgroundColor: teal }}
            >
              Confirm
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
};

function disabledFor(ymd, s, leadMs) {
  const [h, m] = s.start.split(':').map(Number);
  return new Date(`${ymd}T${pad(h)}:${pad(m)}:00`).getTime() < Date.now() + leadMs;
}

export default SlotSheet;
