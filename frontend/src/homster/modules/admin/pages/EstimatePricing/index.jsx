import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PaintBucket } from 'lucide-react';
import estimateService from '../../../../services/estimateService';
import EstimateLines from '../../../../../components/common/EstimateLines';

const BRAND = { teal: '#347989', yellow: '#D68F35', orange: '#BB5F36' };
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
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

/* ---------------------------------------------------------------- Rate card */
const RateCard = ({ categoryId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const blank = { group: '', name: '', unitLabel: 'room', price: '', minQty: 1, maxQty: 10, description: '' };
  const [draft, setDraft] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await estimateService.adminItems(categoryId)).data); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [categoryId]);
  useEffect(() => { load(); }, [load]);

  const groups = [...new Set(items.map((i) => i.group))];

  const add = async () => {
    try {
      await estimateService.adminCreateItem({ ...draft, categoryId });
      toast.success('Line added');
      setDraft({ ...blank, group: draft.group, unitLabel: draft.unitLabel });
      load();
    } catch (e) { toast.error(e.message); }
  };
  const save = async (item) => {
    try { await estimateService.adminUpdateItem(item._id, item); setEditing(null); toast.success('Saved'); load(); } catch (e) { toast.error(e.message); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try { await estimateService.adminDeleteItem(item._id); load(); } catch (e) { toast.error(e.message); }
  };
  const seed = async () => {
    try { const r = await estimateService.adminSeed(categoryId); toast.success(r.message); load(); } catch (e) { toast.error(e.message); }
  };

  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-xs text-gray-500">The worker picks lines from this card after inspecting the site and enters how many (rooms, sq ft...). The price of every line is fixed here, so the estimate and the bill always follow your rates.</p>
        <Btn tone="light" onClick={seed}>Load sample painting rates</Btn>
      </div>

      <div className="grid items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-6">
        <Field label="Group"><input list="est-groups" className={input} value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} placeholder="Interior Painting" /></Field>
        <datalist id="est-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        <div className="md:col-span-2"><Field label="Name (what is charged)"><input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Bedroom (up to 150 sq ft)" /></Field></div>
        <Field label="Per"><input className={input} value={draft.unitLabel} onChange={(e) => setDraft({ ...draft, unitLabel: e.target.value })} placeholder="room / sq ft" /></Field>
        <Field label="Price (₹)"><input type="number" min="0" className={input} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></Field>
        <Btn onClick={add} disabled={!draft.group.trim() || !draft.name.trim() || draft.price === ''}>Add line</Btn>
      </div>

      {groups.length === 0 && <p className="rounded-xl bg-[#D68F35]/10 px-4 py-3 text-sm text-[#8a5a1f]">No rate card yet. Workers will have to type prices by hand. Add lines above, or load the sample painting rates.</p>}
      {groups.map((g) => (
        <div key={g} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5"><span className="h-4 w-1 rounded-full" style={{ backgroundColor: BRAND.teal }} /><p className="text-xs font-bold uppercase tracking-wide text-gray-600">{g}</p></div>
          <ul className="divide-y divide-gray-100">
            {items.filter((i) => i.group === g).map((i) => (
              <li key={i._id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                {editing?._id === i._id ? (
                  <>
                    <input className={`${input} max-w-xs`} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    <input className={`${input} w-24`} value={editing.unitLabel} onChange={(e) => setEditing({ ...editing, unitLabel: e.target.value })} />
                    <input type="number" min="0" className={`${input} w-28`} value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                    <input type="number" min="1" className={`${input} w-20`} title="Min qty" value={editing.minQty} onChange={(e) => setEditing({ ...editing, minQty: e.target.value })} />
                    <input type="number" min="1" className={`${input} w-20`} title="Max qty" value={editing.maxQty} onChange={(e) => setEditing({ ...editing, maxQty: e.target.value })} />
                    <Btn onClick={() => save(editing)}>Save</Btn>
                    <Btn tone="light" onClick={() => setEditing(null)}>Cancel</Btn>
                  </>
                ) : (
                  <>
                    <span className={`min-w-[200px] flex-1 ${i.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {i.name}
                      {i.description && <span className="block text-xs text-gray-400">{i.description}</span>}
                    </span>
                    <span className="font-bold text-gray-900">{inr(i.price)} <span className="text-xs font-normal text-gray-500">/ {i.unitLabel}</span></span>
                    <span className="text-xs text-gray-500">qty {i.minQty} to {i.maxQty}</span>
                    <Btn tone="light" className="!py-1" onClick={() => setEditing(i)}>Edit</Btn>
                    <Btn tone="light" className="!py-1" onClick={() => save({ ...i, isActive: !i.isActive })}>{i.isActive ? 'Hide' : 'Show'}</Btn>
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

/* ------------------------------------------------------ Advance & commission */
const Rules = ({ categoryId }) => {
  const [rule, setRule] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setRule(null); estimateService.adminRule(categoryId).then((r) => setRule(r.data)).catch((e) => toast.error(e.message)); }, [categoryId]);
  if (!rule) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  const example = 16500;
  const adv = rule.advanceType === 'fixed' ? Math.min(example, Number(rule.advanceValue) || 0) : Math.round((example * (Number(rule.advanceValue) || 0)) / 100);
  const save = async () => {
    try {
      setSaving(true);
      const r = await estimateService.adminSaveRule({ categoryId, advanceType: rule.advanceType, advanceValue: rule.advanceValue, commissionPercent: rule.commissionPercent });
      setRule(r.data);
      toast.success('Saved');
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <Field label="Advance the customer pays after accepting">
          <select className={input} value={rule.advanceType} onChange={(e) => setRule({ ...rule, advanceType: e.target.value })}>
            <option value="percent">Percent of the estimate</option>
            <option value="fixed">Fixed amount (₹)</option>
          </select>
        </Field>
        <Field label={rule.advanceType === 'percent' ? 'Advance (%)' : 'Advance (₹)'} hint="The rest is paid after the work is done">
          <input type="number" min="0" className={input} value={rule.advanceValue} onChange={(e) => setRule({ ...rule, advanceValue: e.target.value })} />
        </Field>
        <Field label="Admin commission (%)" hint="Empty = the platform-wide commission. It is taken from the advance; the worker gets the rest of it in their wallet.">
          <input type="number" min="0" max="100" className={input} value={rule.commissionPercent ?? ''} onChange={(e) => setRule({ ...rule, commissionPercent: e.target.value === '' ? null : e.target.value })} />
        </Field>
      </div>
      <p className="rounded-xl bg-[#347989]/10 px-4 py-3 text-sm text-[#2b6270]">Example: on a {inr(example)} estimate the customer pays <b>{inr(adv)}</b> to accept and start the work, and <b>{inr(example - adv)}</b> after it is finished.</p>
      <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
    </div>
  );
};

/* ---------------------------------------------------------------- Estimates */
const Estimates = ({ categoryId }) => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { setData(null); estimateService.adminBookings(categoryId).then((r) => setData(r.data)).catch((e) => toast.error(e.message)); }, [categoryId]);
  if (!data) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;
  const tiles = [['Estimates sent', data.count, BRAND.teal], ['Awaiting customer', data.pending, BRAND.yellow], ['Accepted value', inr(data.accepted), BRAND.teal], ['Advance collected', inr(data.advanceCollected), BRAND.orange]];
  const badge = (st) => (st === 'APPROVED' ? ['Accepted', 'bg-emerald-100 text-emerald-700'] : st === 'REJECTED' ? ['Declined', 'bg-rose-100 text-rose-700'] : ['Awaiting', 'bg-amber-100 text-amber-700']);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([l, v, c]) => (
          <div key={l} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-1" style={{ backgroundColor: c }} />
            <div className="p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{l}</p><p className="mt-1 text-2xl font-extrabold text-gray-900">{v}</p></div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
            <tr><th className="px-4 py-2.5">Booking</th><th>Worker</th><th>Estimate</th><th>Advance</th><th>Commission</th><th>Status</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No estimates yet</td></tr>}
            {data.rows.map((r) => {
              const [label, cls] = badge(r.estimate?.status);
              return (
                <React.Fragment key={r._id}>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.bookingNumber}</td>
                    <td>{r.workerId?.name || '-'}</td>
                    <td className="font-semibold">{inr(r.estimate?.amount)}</td>
                    <td>{inr(r.estimate?.tokenAmount)}</td>
                    <td>{inr(r.estimate?.adminCommission)}</td>
                    <td><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span></td>
                    <td className="pr-3 text-right"><Btn tone="light" className="!py-1 !text-xs" onClick={() => setOpen(open === r._id ? null : r._id)}>{open === r._id ? 'Hide' : 'View'}</Btn></td>
                  </tr>
                  {open === r._id && (
                    <tr><td colSpan={7} className="bg-gray-50 px-6 py-4"><div className="max-w-md"><EstimateLines estimate={r.estimate} viewer="admin" /></div></td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------- Page */
const TABS = [['rates', 'Rate card'], ['rules', 'Advance & commission'], ['estimates', 'Estimates & money']];

const EstimatePricing = () => {
  const [cats, setCats] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [tab, setTab] = useState('rates');

  useEffect(() => {
    estimateService.adminCategories().then((r) => { setCats(r.data); if (r.data[0]) setCategoryId(r.data[0].id); }).catch((e) => { toast.error(e.message); setCats([]); });
  }, []);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: 'linear-gradient(135deg, #347989 0%, #D68F35 60%, #BB5F36 100%)' }}><PaintBucket className="h-6 w-6" /></span>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Estimate Pricing</h1>
            <p className="text-sm text-gray-500">For services priced after a visit (Home Painting...): room-wise rates, advance and commission.</p>
          </div>
        </div>
        {cats && cats.length > 0 && (
          <select className={`${input} w-56`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </div>

      {cats === null ? <p className="py-10 text-center text-sm text-gray-400">Loading…</p> : cats.length === 0 ? (
        <p className="rounded-xl bg-[#D68F35]/10 px-4 py-3 text-sm text-[#8a5a1f]">No estimate-based category yet. Turn on "Estimate based" for a category (like Home Painting) in Service Catalog → Categories.</p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTab(key)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === key ? 'border-[#347989] text-[#347989]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>
            ))}
          </div>
          {categoryId && (tab === 'rates' ? <RateCard key={categoryId} categoryId={categoryId} /> : tab === 'rules' ? <Rules key={categoryId} categoryId={categoryId} /> : <Estimates key={categoryId} categoryId={categoryId} />)}
        </>
      )}
    </div>
  );
};

export default EstimatePricing;
