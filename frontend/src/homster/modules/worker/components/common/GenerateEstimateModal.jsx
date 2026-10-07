import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiDollarSign, FiPlus, FiMinus, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import workerService from '../../../../services/workerService';
import estimateService from '../../../../services/estimateService';
import { themeColors } from '../../../../theme';

const TEAL = themeColors.button;
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * The worker's estimate after inspecting the site. With an admin rate card the
 * worker only picks rooms / work and how many; the prices come from the card and
 * the customer's advance follows the admin's rule. Categories with no rate card
 * fall back to typed line items.
 */
const GenerateEstimateModal = ({ isOpen, onClose, bookingId, onSuccess }) => {
  const [card, setCard] = useState(null);       // rate card + rules
  const [loadingCard, setLoadingCard] = useState(false);
  const [qty, setQty] = useState({});           // itemId -> qty
  const [notes, setNotes] = useState('');
  const [manual, setManual] = useState([{ name: '', price: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setQty({}); setNotes(''); setManual([{ name: '', price: '' }]);
    setLoadingCard(true);
    estimateService.getOptions(bookingId)
      .then((res) => setCard(res.data))
      .catch((e) => { toast.error(e.message || 'Could not load the rate card'); setCard(null); })
      .finally(() => setLoadingCard(false));
  }, [isOpen, bookingId]);

  const hasCard = !!card?.hasItems;
  const flat = useMemo(() => (card?.groups || []).flatMap((g) => g.items.map((i) => ({ ...i, group: g.name }))), [card]);
  const picked = flat.filter((i) => qty[i.id] > 0);
  const subtotal = picked.reduce((s, i) => s + i.price * qty[i.id], 0);
  const gst = card?.gst?.applied ? Math.round((subtotal * card.gst.ratePct) / 100) : 0;
  const manualTotal = manual.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const amount = hasCard ? subtotal + gst : manualTotal;

  const rule = card?.rule || { advanceType: 'percent', advanceValue: 30 };
  const advance = Math.min(amount, Math.round(rule.advanceType === 'fixed' ? Number(rule.advanceValue) : (amount * Number(rule.advanceValue)) / 100));
  const commission = Math.round((amount * (card?.commissionPercent ?? 10)) / 100);
  const yourAdvance = Math.max(0, advance - commission);

  const change = (item, delta) => {
    const cur = qty[item.id] || 0;
    let next = cur + delta;
    if (delta > 0 && cur === 0) next = item.minQty;      // first tap starts at the minimum
    if (delta < 0 && cur <= item.minQty) next = 0;       // below the minimum removes it
    next = Math.min(item.maxQty, Math.max(0, next));
    setQty((q) => { const c = { ...q }; if (next > 0) c[item.id] = next; else delete c[item.id]; return c; });
  };

  const submit = async () => {
    setLoading(true);
    try {
      let payload;
      if (hasCard) {
        if (!picked.length) { toast.error('Select at least one room or work item'); setLoading(false); return; }
        payload = { items: picked.map((i) => ({ itemId: i.id, qty: qty[i.id] })), notes };
      } else {
        const valid = manual.filter((i) => i.name.trim() && Number(i.price) > 0);
        if (!valid.length) { toast.error('Add at least one item with a name and price'); setLoading(false); return; }
        payload = { estimatedAmount: valid.reduce((s, i) => s + Number(i.price), 0), estimateDescription: valid.map((i) => `${i.name}: ₹${i.price}`).join(', ') };
      }
      const res = await workerService.generateEstimate(bookingId, payload);
      if (res.success) { toast.success('Estimate sent to the customer!'); onSuccess(); } else toast.error(res.message || 'Failed to send the estimate');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: TEAL }}><FiDollarSign className="h-4 w-4" /></span>
              Create Estimate
            </h3>
            <button onClick={onClose} disabled={loading} className="rounded-full bg-gray-50 p-2 hover:bg-gray-100"><FiX className="h-5 w-5 text-gray-600" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingCard ? (
              <p className="py-10 text-center text-sm text-gray-400">Loading rate card…</p>
            ) : hasCard ? (
              <div className="space-y-5">
                <p className="text-xs text-gray-500">Select the rooms and work you inspected. Prices are fixed by the company, so the customer gets a clear, standard quote.</p>
                {card.groups.map((g) => (
                  <div key={g.name}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{g.name}</p>
                    <ul className="space-y-2">
                      {g.items.map((i) => {
                        const q = qty[i.id] || 0;
                        return (
                          <li key={i.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${q ? '' : 'border-gray-200'}`} style={q ? { borderColor: TEAL, backgroundColor: `${TEAL}0D` } : undefined}>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{i.name}</p>
                              <p className="text-xs text-gray-500">{inr(i.price)} / {i.unitLabel}{q ? ` · ${inr(i.price * q)}` : ''}</p>
                            </div>
                            {q ? (
                              <div className="flex shrink-0 items-center overflow-hidden rounded-lg border text-sm font-bold" style={{ borderColor: TEAL, color: TEAL }}>
                                <button type="button" onClick={() => change(i, -1)} className="px-2.5 py-1.5"><FiMinus size={14} /></button>
                                <span className="min-w-[28px] text-center">{q}</span>
                                <button type="button" onClick={() => change(i, 1)} className="px-2.5 py-1.5"><FiPlus size={14} /></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => change(i, 1)} className="shrink-0 rounded-lg border px-4 py-1.5 text-sm font-bold" style={{ borderColor: TEAL, color: TEAL }}>Add</button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600">Note for the customer (optional)</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. dampness on the east wall of bedroom 1" className="w-full rounded-xl border-2 border-gray-100 px-3 py-2.5 text-sm outline-none focus:border-gray-300" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">No rate card is set for this service yet, so enter the items and prices yourself.</p>
                {manual.map((it, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <input value={it.name} onChange={(e) => setManual(manual.map((m, j) => (j === idx ? { ...m, name: e.target.value } : m)))} placeholder="Item / labour" className="flex-1 rounded-xl border-2 border-gray-100 px-3 py-2.5 text-sm font-semibold outline-none focus:border-gray-300" />
                    <input type="number" value={it.price} onChange={(e) => setManual(manual.map((m, j) => (j === idx ? { ...m, price: e.target.value } : m)))} placeholder="₹" className="w-24 rounded-xl border-2 border-gray-100 px-3 py-2.5 text-sm font-semibold outline-none focus:border-gray-300" />
                    {manual.length > 1 && <button type="button" onClick={() => setManual(manual.filter((_, j) => j !== idx))} className="rounded-xl bg-rose-50 p-3 text-rose-500"><FiTrash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setManual([...manual, { name: '', price: '' }])} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold" style={{ color: TEAL, backgroundColor: `${TEAL}14` }}><FiPlus className="h-4 w-4" /> Add item</button>
              </div>
            )}
          </div>

          {/* Totals + send */}
          <div className="border-t border-gray-100 bg-white px-5 py-4">
            {amount > 0 && (
              <div className="mb-3 space-y-1.5 rounded-xl bg-gray-50 p-3 text-sm">
                {gst > 0 && <div className="flex justify-between text-gray-600"><span>GST @ {card.gst.ratePct}%</span><span>{inr(gst)}</span></div>}
                <div className="flex justify-between"><span className="font-bold text-gray-900">Total estimate</span><span className="text-lg font-extrabold text-gray-900">{inr(amount)}</span></div>
                <div className="flex justify-between text-xs text-gray-600"><span>Customer pays now ({rule.advanceType === 'fixed' ? 'fixed' : `${rule.advanceValue}%`})</span><span className="font-semibold">{inr(advance)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>Platform commission on it</span><span>-{inr(commission)}</span></div>
                <div className="flex justify-between border-t border-dashed border-gray-300 pt-1.5 text-xs font-bold" style={{ color: TEAL }}><span>Your advance share (to wallet)</span><span>{inr(yourAdvance)}</span></div>
              </div>
            )}
            <button
              onClick={submit}
              disabled={loading || loadingCard || amount <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black tracking-wide text-white shadow-lg disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {loading ? 'SENDING…' : <>SEND ESTIMATE TO CUSTOMER <FiCheckCircle className="h-5 w-5" /></>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GenerateEstimateModal;
