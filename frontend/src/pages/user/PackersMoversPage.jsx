import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import moverService from '../../homster/services/moverService';
import { paymentService } from '../../homster/services/paymentService';
import { themeColors } from '../../homster/theme';
import { WizardHeader } from './packersMovers/Parts';
import LocationStep from './packersMovers/LocationStep';
import InventoryStep from './packersMovers/InventoryStep';
import SummaryStep from './packersMovers/SummaryStep';
import SlotSheet from './packersMovers/SlotSheet';

/**
 * Packers & Movers: Location -> Add Items -> Slots -> Summary.
 * The price comes from the admin's rate card (server side); the customer pays a
 * token now and the rest at unloading.
 */
const PackersMoversPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [config, setConfig] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(0);
  const [relocationType, setRelocationType] = useState(params.get('type') === 'INTER_CITY' ? 'INTER_CITY' : 'INTRA_CITY');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [qty, setQty] = useState({});
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(null);
  const [slotOpen, setSlotOpen] = useState(false);
  const [addOnKeys, setAddOnKeys] = useState([]);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    moverService.getConfig()
      .then((res) => setConfig(res.data))
      .catch((e) => setLoadError(e.message || 'Could not load Packers & Movers'));
  }, []);

  // what the customer picked, by id
  const variantsById = useMemo(() => {
    const map = new Map();
    config?.rooms.forEach((r) => r.groups.forEach((g) => g.variants.forEach((v) => map.set(String(v.id), { ...v, group: g.name, room: r.room }))));
    return map;
  }, [config]);
  const lines = useMemo(
    () => Object.entries(qty).map(([id, q]) => ({ id, qty: q, name: variantsById.get(id)?.name || '' })).filter((l) => l.name),
    [qty, variantsById]
  );
  const itemsPayload = useMemo(() => lines.map((l) => ({ itemId: l.id, qty: l.qty })), [lines]);

  // Live quote on the summary step.
  const quoteSeq = useRef(0);
  useEffect(() => {
    if (step !== 3 || !itemsPayload.length) return undefined;
    const seq = ++quoteSeq.current;
    setQuoting(true);
    const timer = setTimeout(() => {
      moverService.quote({ relocationType, from, to, items: itemsPayload, addOnKeys })
        .then((res) => { if (seq === quoteSeq.current) setQuote(res.data); })
        .catch((e) => toast.error(e.message || 'Could not calculate the price'))
        .finally(() => { if (seq === quoteSeq.current) setQuoting(false); });
    }, 250);
    return () => clearTimeout(timer);
  }, [step, relocationType, from, to, itemsPayload, addOnKeys]);

  // Carton hint for the slot sheet.
  const cartonVariants = config?.rooms.find((r) => r.room === 'cartons')?.groups.flatMap((g) => g.variants) || [];
  const cartonIds = new Set(cartonVariants.map((v) => String(v.id)));
  const cartonsAdded = Object.entries(qty).filter(([id]) => cartonIds.has(id)).reduce((s, [, n]) => s + n, 0);
  const otherCount = Object.entries(qty).filter(([id]) => !cartonIds.has(id)).reduce((s, [, n]) => s + n, 0);
  const cartonsNeeded = Math.max(1, Math.ceil(otherCount / 3));
  const cartonHint = {
    added: cartonsAdded,
    needed: cartonsNeeded,
    toAdd: Math.max(0, cartonsNeeded - cartonsAdded),
    canAdd: cartonVariants.length > 0
  };
  const addCartons = () => {
    const pick = cartonVariants.find((v) => /medium/i.test(v.name)) || cartonVariants[0];
    if (!pick) return;
    setQty((prev) => ({ ...prev, [pick.id]: Math.min(pick.maxQty || 20, (prev[pick.id] || 0) + cartonHint.toAdd) }));
    toast.success(`${cartonHint.toAdd} cartons added`);
  };

  const goBack = () => {
    if (step === 0) return navigate(-1);
    setStep((s) => s - 1);
  };

  // Pay the token with Razorpay (same flow as other bookings' advance).
  const payToken = async (booking) => {
    const order = await paymentService.createOrder(booking._id);
    if (!order?.success) throw new Error(order?.message || 'Could not start the payment');
    if (!window.Razorpay) throw new Error('Payment gateway is not ready. Please try again.');
    await new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: order.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.order.amount,
        currency: order.order.currency || 'INR',
        order_id: order.order.id,
        name: 'GetRight Home',
        description: 'Packers & Movers booking amount',
        handler: async (response) => {
          try {
            toast.loading('Confirming payment...');
            const verified = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking._id
            });
            toast.dismiss();
            verified?.success ? resolve() : reject(new Error('Payment could not be verified'));
          } catch (err) {
            toast.dismiss();
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error('dismissed')) },
        theme: { color: themeColors.button }
      });
      rzp.on('payment.failed', () => reject(new Error('failed')));
      rzp.open();
    });
  };

  const confirmBooking = async () => {
    if (confirming) return;
    setConfirming(true);
    let booking = null;
    try {
      const res = await moverService.book({ relocationType, from, to, items: itemsPayload, addOnKeys, date, slot: { start: slot.start, end: slot.end } });
      booking = res.data;
      if (res.requiresPayment) await payToken(booking);
      toast.success('Booking confirmed!');
      navigate(`/user/booking-confirmation/${booking._id}`, { replace: true });
    } catch (err) {
      const unpaid = ['dismissed', 'failed'].includes(err?.message);
      toast.error(unpaid
        ? 'Payment not completed. Your booking is held for 15 minutes. Pay from My Bookings to confirm it.'
        : (err?.message || 'Could not confirm the booking'));
      if (booking) navigate(`/user/booking/${booking._id}`, { replace: true });
    } finally {
      setConfirming(false);
    }
  };

  if (loadError) {
    return <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-slate-600">{loadError}</div>;
  }
  if (!config) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }
  if (!config.enabled) {
    return <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-slate-600">Packers & Movers is not available right now. Please check back soon.</div>;
  }

  return (
    <div className="min-h-screen bg-[#EEF1F6]">
      <WizardHeader step={step} onBack={goBack} title="Packers and Movers" />

      {step === 0 && (
        <LocationStep
          relocationType={relocationType}
          setRelocationType={setRelocationType}
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          onNext={() => setStep(1)}
          coverage={config.coverage}
        />
      )}

      {(step === 1 || step === 2) && (
        <InventoryStep config={config} qty={qty} setQty={setQty} onBack={() => setStep(0)} onNext={() => { setStep(2); setSlotOpen(true); }} />
      )}

      {step === 2 && slotOpen && (
        <SlotSheet
          config={config}
          date={date}
          slot={slot}
          cartons={cartonHint}
          onAddCartons={addCartons}
          onClose={() => { setSlotOpen(false); setStep(date && slot ? 3 : 1); }}
          onConfirm={({ date: d, slot: s }) => { setDate(d); setSlot(s); setSlotOpen(false); setStep(3); }}
        />
      )}

      {step === 3 && (
        <SummaryStep
          config={config}
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          lines={lines}
          date={date}
          slot={slot}
          onEditSlot={() => { setStep(2); setSlotOpen(true); }}
          addOnKeys={addOnKeys}
          setAddOnKeys={setAddOnKeys}
          quote={quote}
          quoting={quoting}
          onConfirm={confirmBooking}
          confirming={confirming}
          onBack={() => setStep(0)}
        />
      )}
    </div>
  );
};

export default PackersMoversPage;
