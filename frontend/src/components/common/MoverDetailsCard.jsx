import React, { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Packers & Movers details on a booking: pickup / drop, lift, inventory and
 * add-ons. `viewer` decides the money shown: the customer sees the payment split,
 * the admin also sees the platform cut and what is left for the workers, and the
 * worker sees no customer money at all.
 */
const MoverDetailsCard = ({ booking, viewer = 'user' }) => {
  const m = booking?.moverDetails;
  const [open, setOpen] = useState(false);
  if (!m) return null;

  const tokenPaid = booking.advanceStatus === 'paid' ? (booking.advancePaid || 0) : 0;
  const total = Number(m.total ?? booking.finalAmount) || 0;
  const due = booking.paymentStatus === 'paid' ? 0 : Math.max(0, total - tokenPaid);
  const cut = m.commissionPercent != null ? Math.round((Number(booking.basePrice || total) * m.commissionPercent) / 100) : null;
  const items = (m.inventory || []).reduce((s, l) => s + (l.qty || 0), 0);

  const Place = ({ place, color, label }) => (
    <div>
      <div className="flex items-start gap-2 text-sm text-gray-800">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} />
        <span><span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</span>{place?.address}</span>
      </div>
      <p className="ml-6 mt-0.5 text-xs text-gray-500">
        {place?.lift === false ? 'No service lift' : 'Service lift available'}{place?.floor !== null && place?.floor !== undefined ? ` · Floor ${place.floor}` : ''}
      </p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Packers & Movers</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {m.relocationType === 'INTER_CITY' ? 'Between Cities' : 'Within City'}{m.distanceKm ? ` · ${Math.round(m.distanceKm)} km` : ''}
        </span>
      </div>
      {viewer === 'admin' && m.distanceKm ? (
        <div className="mb-3 rounded-xl border border-[#347989]/20 bg-[#347989]/10 px-3 py-2 text-xs text-[#2b6270]">
          <p className="font-bold">Distance chosen: {Math.round(m.distanceKm)} km</p>
          <p className="mt-0.5">
            {{ road: 'Real road distance (Google)', estimate: 'Estimated (straight line × road factor)', default: 'Default distance (no map pin)', route: 'Fixed route distance' }[m.distance?.source] || 'Measured'}
            {m.distance?.straightKm ? ` · straight line ${Math.round(m.distance.straightKm)} km` : ''}
          </p>
          {m.distance?.charge !== undefined && <p className="mt-0.5">Distance charge {inr(m.distance.charge)}{m.distance.perKmRate ? ` (₹${m.distance.perKmRate}/km${m.distance.freeKm ? `, first ${m.distance.freeKm} km free` : ''})` : ''}</p>}
        </div>
      ) : null}
      {m.route?.transitDays ? <p className="mb-2 text-xs text-[#347989]">Delivery in about {m.route.transitDays} day{m.route.transitDays > 1 ? 's' : ''} after pickup</p> : null}
      <Place place={m.from} color="#BB5F36" label="Pickup" />
      <div className="my-2 ml-[7px] h-3 border-l border-dashed border-gray-300" />
      <Place place={m.to} color="#347989" label="Drop" />

      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-4 flex w-full items-center justify-between border-t border-gray-100 pt-3 text-left text-sm font-semibold text-gray-800">
        Inventory ({items} items){m.addOns?.length ? ` + ${m.addOns.length} add-on${m.addOns.length > 1 ? 's' : ''}` : ''}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-1 text-sm text-gray-700">
          {(m.inventory || []).map((l) => <div key={String(l.itemId)} className="flex justify-between"><span>{l.name}</span><span className="font-semibold">× {l.qty}</span></div>)}
          {(m.addOns || []).map((a) => (
            <div key={a.key} className="flex justify-between text-gray-600"><span>{a.name}</span>{viewer !== 'worker' && <span>{inr(a.price)}</span>}</div>
          ))}
          {m.notes && <p className="pt-1 text-xs text-gray-500">Note: {m.notes}</p>}
        </div>
      )}

      {viewer !== 'worker' && (
        <div className="mt-4 space-y-1.5 rounded-xl bg-gray-50 p-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Service charge</span><span>{inr(m.serviceCharge)}</span></div>
          {(m.addOns || []).length > 0 && <div className="flex justify-between"><span className="text-gray-600">Add-ons</span><span>{inr(m.addOns.reduce((s, a) => s + a.price, 0))}</span></div>}
          {m.gst?.applied && <div className="flex justify-between"><span className="text-gray-600">GST @ {m.gst.ratePct}%</span><span>{inr(m.gst.amount)}</span></div>}
          <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold"><span>Total</span><span>{inr(total)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Booking amount (token) {tokenPaid > 0 ? 'paid' : 'to pay'}</span><span className={tokenPaid > 0 ? 'font-semibold text-emerald-600' : ''}>{inr(m.token)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">At time of unloading</span><span className="font-semibold">{inr(due)}</span></div>
          {viewer === 'admin' && cut !== null && (
            <>
              <div className="flex justify-between border-t border-gray-200 pt-1.5"><span className="text-gray-600">Platform commission ({m.commissionPercent}%)</span><span>{inr(cut)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Left for worker(s)</span><span className="font-semibold">{inr((Number(booking.basePrice || total)) - cut)}</span></div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MoverDetailsCard;
