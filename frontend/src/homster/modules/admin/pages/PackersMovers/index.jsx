import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Truck } from 'lucide-react';
import moverService from '../../../../services/moverService';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const ROOMS = [['bedrooms', 'Bedrooms'], ['living_room', 'Living Room'], ['kitchen', 'Kitchen'], ['miscellaneous', 'Miscellaneous'], ['cartons', 'Cartons']];
const TYPES = [['INTRA_CITY', 'Within City'], ['INTER_CITY', 'Between Cities']];
const RATE_FIELDS = [
  ['baseCharge', 'Base charge (₹)', 'Fixed part of every move'],
  ['perUnitRate', 'Rate per inventory unit (₹)', 'Each item has units; units × this rate'],
  ['perKmRate', 'Rate per km (₹)', 'Charged for every real road km (after the free km)'],
  ['freeKm', 'Free km', 'Distance included in the base'],
  ['noLiftCharge', 'No service lift charge (₹ per end)', 'Added for pickup and/or drop without a lift'],
  ['defaultKm', 'Default distance (km)', 'Used when the address has no map pin']
];

// App logo colours
const BRAND = { teal: '#347989', yellow: '#D68F35', orange: '#BB5F36' };

const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#347989] focus:ring-2 focus:ring-[#347989]/20';
const Btn = ({ tone = 'dark', className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${tone === 'dark' ? 'bg-[#347989] text-white shadow-sm hover:bg-[#2b6270]' : tone === 'danger' ? 'text-rose-600 hover:bg-rose-50' : 'border border-gray-300 bg-white text-gray-700 hover:border-[#347989] hover:text-[#347989]'} ${className}`}
  />
);
const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
  </label>
);

const distanceLabel = (d) => ({ road: 'Google road distance', estimate: 'estimated road km', default: 'default km', route: 'fixed km (old booking)' }[d?.source] || 'km');

/* ---------------------------------------------------------------- Overview */
const Overview = () => {
  const [data, setData] = useState(null);
  useEffect(() => { moverService.adminSummary().then((r) => setData(r.data)).catch((e) => toast.error(e.message)); }, []);
  if (!data) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;
  const tiles = [
    ['Bookings', data.bookings, BRAND.teal],
    ['Total value', inr(data.totalValue), BRAND.teal],
    ['Token collected', inr(data.tokenCollected), BRAND.yellow],
    ['Due at unloading', inr(data.dueAtUnloading), BRAND.orange]
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([l, v, color]) => (
          <div key={l} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-1" style={{ backgroundColor: color }} />
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{l}</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">{v}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
            <tr><th className="px-4 py-2.5">Booking</th><th>Route</th><th>Distance</th><th>Total</th><th>Token</th><th>Due</th><th>Admin cut</th><th>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">No Packers & Movers bookings yet</td></tr>}
            {data.rows.map((r) => {
              const m = r.moverDetails || {};
              const tokenPaid = r.advanceStatus === 'paid' ? r.advancePaid : 0;
              const due = r.paymentStatus === 'paid' ? 0 : r.finalAmount - tokenPaid;
              return (
                <tr key={r._id}>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.bookingNumber}</td>
                  <td className="max-w-[260px] truncate py-2.5 text-xs text-gray-600">{m.from?.address} → {m.to?.address}</td>
                  <td className="text-xs">
                    {m.distanceKm ? <><b className="text-sm text-gray-900">{Math.round(m.distanceKm)} km</b><span className="block text-gray-500">{distanceLabel(m.distance)}</span></> : '-'}
                  </td>
                  <td className="font-semibold">{inr(r.finalAmount)}</td>
                  <td>{inr(tokenPaid)}</td>
                  <td>{inr(due)}</td>
                  <td>{m.commissionPercent != null ? `${m.commissionPercent}% (${inr((r.finalAmount * m.commissionPercent) / 100)})` : '-'}</td>
                  <td className="text-xs capitalize">{String(r.status).replace(/_/g, ' ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- Inventory */
const Inventory = () => {
  const [items, setItems] = useState([]);
  const [room, setRoom] = useState('bedrooms');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ group: '', name: '', units: 1, maxQty: 20 });
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { setItems((await moverService.adminInventory()).data); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = items.filter((i) => i.room === room);
  const groups = [...new Set(shown.map((i) => i.group))];

  const add = async () => {
    try {
      await moverService.adminCreateItem({ ...draft, room });
      toast.success('Item added');
      setDraft({ ...draft, name: '' });
      load();
    } catch (e) { toast.error(e.message); }
  };
  const save = async (item) => {
    try { await moverService.adminUpdateItem(item._id, item); setEditing(null); load(); toast.success('Saved'); } catch (e) { toast.error(e.message); }
  };
  const toggle = (item) => save({ ...item, isActive: !item.isActive });
  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try { await moverService.adminDeleteItem(item._id); load(); } catch (e) { toast.error(e.message); }
  };
  const seed = async () => {
    try { const r = await moverService.adminSeed(); toast.success(r.message); load(); } catch (e) { toast.error(e.message); }
  };

  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {ROOMS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setRoom(key)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${room === key ? 'border-[#347989] bg-[#347989] text-white' : 'border-gray-300 text-gray-600'}`}>{label}</button>
          ))}
        </div>
        <Btn tone="light" onClick={seed}>Load missing default items</Btn>
      </div>

      <div className="grid grid-cols-2 items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-5">
        <Field label="Group (heading)"><input list="mover-groups" className={input} value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} placeholder="e.g. Bed" /></Field>
        <datalist id="mover-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        <Field label="Item name"><input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Queen Size Bed" /></Field>
        <Field label="Units" hint="Volume of the item"><input type="number" min="0" step="0.5" className={input} value={draft.units} onChange={(e) => setDraft({ ...draft, units: e.target.value })} /></Field>
        <Field label="Max qty"><input type="number" min="1" className={input} value={draft.maxQty} onChange={(e) => setDraft({ ...draft, maxQty: e.target.value })} /></Field>
        <Btn onClick={add} disabled={!draft.group.trim() || !draft.name.trim()}>Add item</Btn>
      </div>

      {groups.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No items in this room. Add one above or load the defaults.</p>}
      {groups.map((g) => (
        <div key={g} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">{g}</p>
          <ul className="divide-y divide-gray-100">
            {shown.filter((i) => i.group === g).map((i) => (
              <li key={i._id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                {editing?._id === i._id ? (
                  <>
                    <input className={`${input} max-w-xs`} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    <input type="number" step="0.5" min="0" className={`${input} w-24`} value={editing.units} onChange={(e) => setEditing({ ...editing, units: e.target.value })} />
                    <input type="number" min="1" className={`${input} w-24`} value={editing.maxQty} onChange={(e) => setEditing({ ...editing, maxQty: e.target.value })} />
                    <Btn onClick={() => save(editing)}>Save</Btn>
                    <Btn tone="light" onClick={() => setEditing(null)}>Cancel</Btn>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 ${i.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{i.name}</span>
                    <span className="text-xs text-gray-500">{i.units} units · max {i.maxQty}</span>
                    <Btn tone="light" className="!py-1" onClick={() => setEditing(i)}>Edit</Btn>
                    <Btn tone="light" className="!py-1" onClick={() => toggle(i)}>{i.isActive ? 'Hide' : 'Show'}</Btn>
                    <Btn tone="danger" className="!py-1" onClick={() => remove(i)}>Delete</Btn>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

/* ---------------------------------------------------------------- Coverage */
const Coverage = ({ settings, setSettings, save, saving }) => {
  const [zones, setZones] = useState(null);
  useEffect(() => { moverService.adminZones().then((r) => setZones(r.data)).catch((e) => toast.error(e.message)); }, []);

  const selectedIds = new Set((settings.withinCityZoneIds || []).map(String));
  const activeZones = (zones || []).filter((z) => z.status === 'active');
  const served = settings.withinCityMode === 'selected' ? activeZones.filter((z) => selectedIds.has(String(z._id))) : activeZones;
  const routes = settings.routes || [];
  const activeRoutes = routes.filter((r) => r.isActive !== false);

  const toggleZone = (id) => setSettings((s) => {
    const cur = new Set((s.withinCityZoneIds || []).map(String));
    if (cur.has(String(id))) cur.delete(String(id)); else cur.add(String(id));
    return { ...s, withinCityZoneIds: [...cur] };
  });
  const patchRoute = (i, p) => setSettings((s) => ({ ...s, routes: s.routes.map((r, j) => (j === i ? { ...r, ...p } : r)) }));
  const addRoute = () => setSettings((s) => ({ ...s, routes: [...(s.routes || []), { fromCity: '', toCity: '', bothWays: true, isActive: true, baseCharge: '', perUnitRate: '', transitDays: '' }] }));
  const removeRoute = (i) => setSettings((s) => ({ ...s, routes: s.routes.filter((_, j) => j !== i) }));
  const cityHints = [...new Set([...(zones || []).map((z) => z.name), ...routes.flatMap((r) => [r.fromCity, r.toCity])].filter(Boolean))];

  return (
    <div className="space-y-5">
      {/* Where we serve, at a glance */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#347989]/30 bg-[#347989]/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#347989]">Within City: available in</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {served.length === 0 && <span className="text-sm text-gray-500">Nowhere yet. Pick zones below.</span>}
            {served.map((z) => <span key={z._id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-[#347989] ring-1 ring-[#347989]/30">{z.name}</span>)}
          </div>
        </div>
        <div className="rounded-2xl border border-[#D68F35]/40 bg-[#D68F35]/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#BB5F36]">Between Cities: available on</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeRoutes.length === 0 && <span className="text-sm text-gray-500">No routes yet. Add them below.</span>}
            {activeRoutes.map((r, i) => (
              <span key={i} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#BB5F36] ring-1 ring-[#D68F35]/40">{r.fromCity} {r.bothWays !== false ? '⇄' : '→'} {r.toCity}{r.transitDays ? ` · ${r.transitDays}d` : ''}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">Anything outside this is refused at booking time with a "we don't provide this here" message.</p>

      {/* Within City = zones */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900">Within City: service areas (from Zone Setup)</h3>
        <p className="mb-3 text-xs text-gray-500">Pickup and drop must both fall inside these zones. Zones are drawn in <a href="/admin/home-service/zones" className="font-semibold underline">Zone Setup</a>.</p>
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={settings.withinCityMode !== 'selected'} onChange={() => setSettings({ ...settings, withinCityMode: 'all' })} /> All active zones</label>
          <label className="flex items-center gap-2"><input type="radio" checked={settings.withinCityMode === 'selected'} onChange={() => setSettings({ ...settings, withinCityMode: 'selected' })} /> Only the zones I select</label>
        </div>
        {zones === null ? <p className="text-sm text-gray-400">Loading zones…</p> : zones.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">No zones created yet. Without zones, Within City is open everywhere. Create zones in Zone Setup to limit it.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {zones.map((z) => {
              const on = settings.withinCityMode !== 'selected' ? z.status === 'active' : selectedIds.has(String(z._id));
              return (
                <label key={z._id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? 'border-[#347989]/50 bg-[#347989]/10' : 'border-gray-200'} ${settings.withinCityMode !== 'selected' ? 'opacity-80' : 'cursor-pointer'}`}>
                  <input type="checkbox" disabled={settings.withinCityMode !== 'selected'} checked={on} onChange={() => toggleZone(z._id)} />
                  <span className="flex-1 font-medium capitalize">{z.name}</span>
                  {z.status !== 'active' && <span className="text-[10px] font-bold uppercase text-gray-400">inactive</span>}
                </label>
              );
            })}
          </div>
        )}
        <div className="mt-4 max-w-xs">
          <Field label="Max pickup-to-drop distance (km)" hint="Further apart than this is not a Within City move">
            <input type="number" min="1" className={input} value={settings.maxWithinCityKm ?? 60} onChange={(e) => setSettings({ ...settings, maxWithinCityKm: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Between Cities = routes */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900">Between Cities: routes you serve</h3>
        <p className="mb-3 text-xs text-gray-500">City names must match what customers pick (Google names; "Bengaluru" and "Bangalore" are treated as the same). Optional base charge and per-unit rate replace the Between Cities rate card for that route only. Distance is always the real road distance, charged per km from the rate card.</p>
        <datalist id="mover-cities">{cityHints.map((c) => <option key={c} value={c} />)}</datalist>
        {routes.length === 0 && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">No routes yet, so Between Cities is not bookable. Add the routes you serve.</p>}
        <div className="space-y-3">
          {routes.map((r, i) => (
            <div key={i} className={`rounded-lg border p-3 ${r.isActive === false ? 'border-gray-200 bg-gray-50' : 'border-gray-300'}`}>
              <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
                <Field label="From city"><input list="mover-cities" className={input} value={r.fromCity} onChange={(e) => patchRoute(i, { fromCity: e.target.value })} placeholder="e.g. Indore" /></Field>
                <Field label="To city"><input list="mover-cities" className={input} value={r.toCity} onChange={(e) => patchRoute(i, { toCity: e.target.value })} placeholder="e.g. Bhopal" /></Field>
                <div className="flex items-center gap-4 pb-2 text-xs font-semibold text-gray-700">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.bothWays !== false} onChange={(e) => patchRoute(i, { bothWays: e.target.checked })} /> Both ways</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.isActive !== false} onChange={(e) => patchRoute(i, { isActive: e.target.checked })} /> Active</label>
                  <Btn tone="danger" className="!py-1" onClick={() => removeRoute(i)}>Remove</Btn>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field label="Delivery time (days)" hint="Shown to the customer, e.g. 2"><input type="number" min="0" className={input} value={r.transitDays ?? ''} onChange={(e) => patchRoute(i, { transitDays: e.target.value })} /></Field>
                <Field label="Base charge (₹)" hint="Empty = use the Between Cities rate card"><input type="number" min="0" className={input} value={r.baseCharge ?? ''} onChange={(e) => patchRoute(i, { baseCharge: e.target.value })} /></Field>
                <Field label="Rate per unit (₹)" hint="Empty = use the Between Cities rate card"><input type="number" min="0" className={input} value={r.perUnitRate ?? ''} onChange={(e) => patchRoute(i, { perUnitRate: e.target.value })} /></Field>
              </div>
            </div>
          ))}
        </div>
        <Btn tone="light" className="mt-3" onClick={addRoute}>+ Add route</Btn>
      </div>

      <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save coverage'}</Btn>
    </div>
  );
};

/* ------------------------------------------------------------ Rates & token */
// Same maths as the server, so the admin can try numbers before saving.
const sample = (rate, units, km) => {
  const n = (v) => Number(v) || 0;
  const distance = Math.max(0, km - n(rate.freeKm)) * n(rate.perKmRate);
  return { distance: Math.round(distance), total: Math.round(n(rate.baseCharge) + units * n(rate.perUnitRate) + distance) };
};

const Rates = ({ settings, setSettings, save, saving }) => {
  const [calc, setCalc] = useState({ INTRA_CITY: { units: 18, km: 8 }, INTER_CITY: { units: 18, km: 190 } });
  const setRate = (type, f, v) => setSettings((s) => ({ ...s, rates: { ...s.rates, [type]: { ...s.rates[type], [f]: v } } }));

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <input type="checkbox" checked={settings.isEnabled} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })} style={{ accentColor: BRAND.teal }} /> Packers & Movers is open for booking
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        {TYPES.map(([type, label]) => {
          const rate = settings.rates[type];
          const c = calc[type];
          const out = sample(rate, Number(c.units) || 0, Number(c.km) || 0);
          return (
            <div key={type} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: type === 'INTRA_CITY' ? BRAND.teal : BRAND.orange }} />
                <h3 className="text-sm font-bold text-gray-900">{label} rate card</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {RATE_FIELDS.map(([f, l, hint]) => (
                  <Field key={f} label={l} hint={hint}>
                    <input type="number" min="0" className={input} value={rate[f]} onChange={(e) => setRate(type, f, e.target.value)} />
                  </Field>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Try it</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <input type="number" min="0" className={`${input} w-20`} value={c.units} onChange={(e) => setCalc({ ...calc, [type]: { ...c, units: e.target.value } })} /> units
                  <input type="number" min="0" className={`${input} w-24`} value={c.km} onChange={(e) => setCalc({ ...calc, [type]: { ...c, km: e.target.value } })} /> km
                  <span className="ml-auto text-right">
                    <span className="block text-[11px] text-gray-500">distance charge {inr(out.distance)}</span>
                    <span className="text-base font-extrabold" style={{ color: BRAND.teal }}>{inr(out.total)}</span>
                    <span className="text-[11px] text-gray-500"> service charge</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-gray-900">How distance is measured</h3>
        <p className="mb-4 text-xs text-gray-500">The price uses the real road distance between the customer's pickup and drop (Google), charged per km from the rate card. If Google is unavailable it uses the straight-line distance × the factor below, and if there is no map pin the default distance above. Each booking records the km and how it was measured.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Road factor" hint="Used only when Google road distance is unavailable. Roads are usually 1.2 to 1.3 times the straight line.">
            <input type="number" min="1" step="0.05" className={input} value={settings.roadFactor ?? 1.25} onChange={(e) => setSettings({ ...settings, roadFactor: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <Field label="Booking amount (token) type">
          <select className={input} value={settings.tokenType} onChange={(e) => setSettings({ ...settings, tokenType: e.target.value })}>
            <option value="fixed">Fixed amount (₹)</option>
            <option value="percent">Percent of total</option>
          </select>
        </Field>
        <Field label={settings.tokenType === 'percent' ? 'Token (% of total)' : 'Token (₹)'} hint="Paid online to confirm; the rest is collected at unloading">
          <input type="number" min="0" className={input} value={settings.tokenValue} onChange={(e) => setSettings({ ...settings, tokenValue: e.target.value })} />
        </Field>
        <Field label="Admin commission (%)" hint="Leave empty to use the platform-wide commission">
          <input type="number" min="0" max="100" className={input} value={settings.commissionPercent ?? ''} onChange={(e) => setSettings({ ...settings, commissionPercent: e.target.value === '' ? null : e.target.value })} />
        </Field>
        <Field label="Bookings open (days ahead)"><input type="number" min="1" className={input} value={settings.advanceBookingDays} onChange={(e) => setSettings({ ...settings, advanceBookingDays: e.target.value })} /></Field>
        <Field label="Minimum notice (hours)" hint="Same-day slots closer than this are hidden"><input type="number" min="0" className={input} value={settings.sameDayLeadHours} onChange={(e) => setSettings({ ...settings, sameDayLeadHours: e.target.value })} /></Field>
      </div>
      <p className="text-xs text-gray-500">GST follows Admin Settings (Apply GST + Tax rate). The customer's total, token and what is left for the worker are all calculated from these numbers.</p>
      <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save rates & token'}</Btn>
    </div>
  );
};

/* ----------------------------------------------------------------- Add-ons */
const AddOns = ({ settings, setSettings, save, saving }) => {
  const list = settings.addOns;
  const patch = (i, p) => setSettings((s) => ({ ...s, addOns: s.addOns.map((a, j) => (j === i ? { ...a, ...p } : a)) }));
  const add = () => setSettings((s) => ({ ...s, addOns: [...s.addOns, { key: `addon_${Date.now()}`, group: 'extra', name: '', description: '', price: 0, isRecommended: false, isActive: true, order: s.addOns.length + 1 }] }));
  const remove = (i) => setSettings((s) => ({ ...s, addOns: s.addOns.filter((_, j) => j !== i) }));
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">"Care plan" add-ons are mutually exclusive (the customer picks one). "Extra" add-ons can be combined.</p>
      {list.map((a, i) => (
        <div key={a.key} className="grid items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[1fr_1.4fr_120px_130px]">
          <Field label="Name"><input className={input} value={a.name} onChange={(e) => patch(i, { name: e.target.value })} /></Field>
          <Field label="Description"><textarea rows={2} className={input} value={a.description} onChange={(e) => patch(i, { description: e.target.value })} /></Field>
          <Field label="Price (₹)"><input type="number" min="0" className={input} value={a.price} onChange={(e) => patch(i, { price: e.target.value })} /></Field>
          <Field label="Type">
            <select className={input} value={a.group} onChange={(e) => patch(i, { group: e.target.value })}>
              <option value="extra">Extra</option>
              <option value="care">Care plan (pick one)</option>
            </select>
          </Field>
          <div className="flex flex-wrap items-center gap-4 md:col-span-4">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><input type="checkbox" checked={a.isActive} onChange={(e) => patch(i, { isActive: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><input type="checkbox" checked={a.isRecommended} onChange={(e) => patch(i, { isRecommended: e.target.checked })} /> Recommended badge</label>
            <Btn tone="danger" className="ml-auto !py-1" onClick={() => remove(i)}>Remove</Btn>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Btn tone="light" onClick={add}>+ Add add-on</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save add-ons'}</Btn>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------- Slots */
const Slots = ({ settings, setSettings, save, saving }) => {
  const patch = (i, p) => setSettings((s) => ({ ...s, slots: s.slots.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
  const add = () => setSettings((s) => ({ ...s, slots: [...s.slots, { start: '09:00', end: '10:00', label: '9AM-10AM', period: 'morning', isActive: true }] }));
  const remove = (i) => setSettings((s) => ({ ...s, slots: s.slots.filter((_, j) => j !== i) }));
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">These are the pickup slots customers see (Morning / Afternoon). Times are 24-hour.</p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-3 py-2">Start</th><th>End</th><th>Label shown</th><th>Period</th><th>Active</th><th /></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {settings.slots.map((s, i) => (
              <tr key={i}>
                <td className="px-3 py-2"><input type="time" className={input} value={s.start} onChange={(e) => patch(i, { start: e.target.value })} /></td>
                <td><input type="time" className={input} value={s.end} onChange={(e) => patch(i, { end: e.target.value })} /></td>
                <td><input className={input} value={s.label} onChange={(e) => patch(i, { label: e.target.value })} /></td>
                <td><select className={input} value={s.period} onChange={(e) => patch(i, { period: e.target.value })}><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></td>
                <td className="text-center"><input type="checkbox" checked={s.isActive} onChange={(e) => patch(i, { isActive: e.target.checked })} /></td>
                <td className="pr-3 text-right"><Btn tone="danger" className="!py-1" onClick={() => remove(i)}>Remove</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Btn tone="light" onClick={add}>+ Add slot</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save slots'}</Btn>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------- Page */
const TABS = [['overview', 'Bookings & Money'], ['coverage', 'Coverage'], ['inventory', 'Inventory'], ['rates', 'Rates & Token'], ['addons', 'Add-ons'], ['slots', 'Slots']];

const PackersMovers = () => {
  const [tab, setTab] = useState('overview');
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { moverService.adminSettings().then((r) => setSettings(r.data)).catch((e) => toast.error(e.message)); }, []);

  const save = async () => {
    try {
      setSaving(true);
      const res = await moverService.adminSaveSettings(settings);
      setSettings(res.data);
      toast.success('Saved');
    } catch (e) {
      toast.error(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const body = useMemo(() => {
    if (tab === 'overview') return <Overview />;
    if (tab === 'inventory') return <Inventory />;
    if (!settings) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;
    const common = { settings, setSettings, save, saving };
    if (tab === 'coverage') return <Coverage {...common} />;
    if (tab === 'rates') return <Rates {...common} />;
    if (tab === 'addons') return <AddOns {...common} />;
    return <Slots {...common} />;
  }, [tab, settings, saving]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: 'linear-gradient(135deg, #347989 0%, #D68F35 60%, #BB5F36 100%)' }}>
          <Truck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Packers & Movers</h1>
          <p className="text-sm text-gray-500">Coverage, inventory, rate card (per km), token, add-ons and slots. The customer's quote is calculated from these.</p>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === key ? 'border-[#347989] text-[#347989]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>
        ))}
      </div>
      {body}
    </div>
  );
};

export default PackersMovers;
