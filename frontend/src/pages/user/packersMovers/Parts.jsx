import React from 'react';
import { ArrowLeft, Check, Phone } from 'lucide-react';
import { themeColors } from '../../../homster/theme';

export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const teal = themeColors.button;

export const ROOM_LABELS = {
  bedrooms: 'Bedrooms',
  living_room: 'Living Room',
  kitchen: 'Kitchen',
  miscellaneous: 'Miscellaneous',
  cartons: 'Cartons'
};

const STEPS = ['Location', 'Add Items', 'Slots', 'Summary'];

/** Coloured header with the 4-step progress line (Location, Add Items, Slots, Summary). */
export const WizardHeader = ({ step, onBack, title }) => (
  <header className="text-white" style={{ background: `linear-gradient(135deg, ${teal} 0%, #2A5F6C 100%)` }}>
    <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pb-1 pt-4">
      <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-1.5 hover:bg-white/15">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="flex-1 text-base font-semibold">{title}</h1>
      <a href="tel:" className="inline-flex items-center gap-1.5 rounded-lg border border-white/50 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
        <Phone className="h-3.5 w-3.5" /> Get a call
      </a>
    </div>
    <div className="mx-auto max-w-5xl px-6 pb-5 pt-4">
      <div className="relative flex items-start justify-between">
        <span className="absolute left-[12%] right-[12%] top-[13px] h-px bg-white/35" />
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="relative z-10 flex w-1/4 flex-col items-center gap-1.5">
              <span
                className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 text-xs font-bold ${done || active ? 'border-white bg-white' : 'border-white/50 bg-transparent text-white/70'}`}
                style={done || active ? { color: teal } : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-[11px] ${active ? 'font-bold' : 'text-white/75'}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  </header>
);

/** Slide-up sheet (same behaviour as the other sheets in the app). */
export const BottomSheet = ({ onClose, children }) => {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);
  const close = () => { setShown(false); setTimeout(onClose, 260); };
  return (
    <div className="fixed inset-0 z-[80]" onClick={close}>
      <div className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl transition-transform duration-300 ease-out ${shown ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  );
};

export const Card = ({ className = '', children }) => (
  <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 ${className}`}>{children}</div>
);
