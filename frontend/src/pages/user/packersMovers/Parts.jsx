import React from 'react';
import { ArrowLeft, Check, Phone } from 'lucide-react';
import { themeColors } from '../../../homster/theme';

export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const teal = themeColors.button;
export const BRAND = { teal: '#347989', yellow: '#D68F35', orange: '#BB5F36', gradient: 'linear-gradient(90deg, #347989 0%, #D68F35 55%, #BB5F36 100%)' };

export const ROOM_LABELS = {
  bedrooms: 'Bedrooms',
  living_room: 'Living Room',
  kitchen: 'Kitchen',
  miscellaneous: 'Miscellaneous',
  cartons: 'Cartons'
};

const STEPS = ['Location', 'Add Items', 'Slots', 'Summary'];

/** Same white header as My Cart / the services pages, with a compact 4-step progress under it. */
export const WizardHeader = ({ step, onBack, title }) => (
  <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
    <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
      <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-1.5 hover:bg-gray-100">
        <ArrowLeft className="h-5 w-5 text-slate-900" />
      </button>
      <h1 className="flex-1 text-lg font-semibold text-slate-900">{title}</h1>
      <a href="tel:" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50" style={{ borderColor: `${teal}66`, color: teal }}>
        <Phone className="h-3.5 w-3.5" /> Get a call
      </a>
    </div>
    <div className="mx-auto max-w-5xl px-5 pb-3">
      <div className="flex items-start">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <React.Fragment key={label}>
              <div className="flex w-14 shrink-0 flex-col items-center gap-1">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-bold ${done ? 'text-white' : active ? 'bg-white' : 'border-slate-200 bg-slate-100 text-slate-400'}`}
                  style={done ? { backgroundColor: teal, borderColor: teal } : active ? { borderColor: teal, color: teal } : undefined}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-[10px] ${active ? 'font-bold text-slate-900' : done ? 'font-medium text-slate-600' : 'text-slate-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <span className="mt-[11px] h-0.5 flex-1 rounded-full" style={{ backgroundColor: i < step ? teal : '#E2E8F0' }} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  </header>
);

/** Plain white page header (back + title), same as My Cart. */
export const SimpleHeader = ({ onBack, title }) => (
  <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
    <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
      <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-1.5 hover:bg-gray-100">
        <ArrowLeft className="h-5 w-5 text-slate-900" />
      </button>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
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
  <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
);
