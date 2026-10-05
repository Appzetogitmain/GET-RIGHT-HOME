import React, { useMemo, useState } from 'react';
import { ChevronDown, Lightbulb, Minus, Plus, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, ROOM_LABELS, teal } from './Parts';

const Stepper = ({ qty, onMinus, onPlus }) => (
  <div className="inline-flex items-center overflow-hidden rounded-lg border text-sm font-semibold" style={{ borderColor: teal, color: teal }}>
    <button type="button" onClick={onMinus} className="px-2 py-1.5 hover:bg-slate-50"><Minus size={14} /></button>
    <span className="min-w-[24px] text-center">{qty}</span>
    <button type="button" onClick={onPlus} className="px-2 py-1.5 hover:bg-slate-50"><Plus size={14} /></button>
  </div>
);

/** Step 2: pick what is being moved, room by room. */
const InventoryStep = ({ config, qty, setQty, onNext, onBack }) => {
  const rooms = config.rooms;
  const [room, setRoom] = useState(rooms[0]?.room);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState({});

  const q = query.trim().toLowerCase();
  const total = Object.values(qty).reduce((s, n) => s + n, 0);

  const visible = useMemo(() => {
    if (q) {
      // search across every room
      return rooms.flatMap((r) => r.groups.map((g) => ({ ...g, room: r.room })))
        .map((g) => ({ ...g, variants: g.variants.filter((v) => `${g.name} ${v.name}`.toLowerCase().includes(q)) }))
        .filter((g) => g.variants.length);
    }
    return (rooms.find((r) => r.room === room)?.groups || []).map((g) => ({ ...g, room }));
  }, [rooms, room, q]);

  const change = (variant, delta) => {
    const next = Math.min(variant.maxQty || 20, Math.max(0, (qty[variant.id] || 0) + delta));
    if (delta > 0 && next === (qty[variant.id] || 0)) return toast.error(`Maximum ${variant.maxQty || 20} allowed`);
    setQty((prev) => {
      const copy = { ...prev };
      if (next > 0) copy[variant.id] = next; else delete copy[variant.id];
      return copy;
    });
  };

  const countInGroup = (g) => g.variants.reduce((s, v) => s + (qty[v.id] || 0), 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-4">
      <Card className="!p-0">
        <div className="sticky top-0 z-10 rounded-t-2xl bg-white px-4 pb-2 pt-4">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for any item" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          {!q && (
            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {rooms.map((r) => (
                <button
                  key={r.room}
                  type="button"
                  onClick={() => setRoom(r.room)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${room === r.room ? 'text-white' : 'border-slate-300 text-slate-700'}`}
                  style={room === r.room ? { backgroundColor: teal, borderColor: teal } : undefined}
                >
                  {ROOM_LABELS[r.room] || r.room}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100 px-4 pb-3">
          {visible.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No item matches "{query}". Extra cartons are provided if needed.</p>}
          {visible.map((g) => {
            const key = `${g.room}:${g.name}`;
            const expanded = q ? true : !!open[key];
            const picked = countInGroup(g);
            return (
              <div key={key}>
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))} className="flex w-full items-center justify-between py-3.5 text-left">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    {g.name}
                    {picked > 0 && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: teal }}>{picked}</span>}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <ul className="mb-2 space-y-1 border-l-2 border-slate-100 pl-4">
                    {g.variants.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-sm text-slate-700">{v.name}</span>
                        {qty[v.id] ? (
                          <Stepper qty={qty[v.id]} onMinus={() => change(v, -1)} onPlus={() => change(v, 1)} />
                        ) : (
                          <button type="button" onClick={() => change(v, 1)} aria-label={`Add ${v.name}`} className="rounded-lg border p-1.5 hover:bg-slate-50" style={{ borderColor: teal, color: teal }}>
                            <Plus size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <p className="mt-3 text-center text-xs text-slate-500">Didn't find what you were looking for? Extra cartons will be provided if needed, charges apply.</p>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" /> Add all your major items to get an accurate quote.
        </div>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Added items</p>
            <p className="text-lg font-extrabold text-slate-900">{total}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onBack} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Back</button>
            <button
              type="button"
              onClick={() => (total > 0 ? onNext() : toast.error('Add at least one item to continue'))}
              className="rounded-xl px-10 py-3 text-sm font-bold text-white shadow-md active:scale-[0.99]"
              style={{ backgroundColor: teal }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryStep;
