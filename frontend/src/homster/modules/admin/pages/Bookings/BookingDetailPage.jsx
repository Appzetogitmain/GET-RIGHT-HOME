import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiArrowLeft, FiZap, FiCalendar, FiUser, FiPhone, FiMapPin, FiTool, FiClock,
  FiExternalLink, FiAlertCircle, FiXCircle, FiUserCheck
} from 'react-icons/fi';
import { adminBookingService } from '../../../../services/adminBookingService';
import adminWorkerService from '../../../../services/adminWorkerService';
import AssignWorkerModal from './components/AssignWorkerModal';

const inr = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const STATUS_TONE = {
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  assigned: 'bg-teal-100 text-teal-800 border-teal-200',
  searching: 'bg-blue-100 text-blue-800 border-blue-200'
};

const Row = ({ label, value, tone, sub, bold, minus }) => (
  <div className={`flex items-start justify-between gap-3 py-1.5 text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
    <span className="min-w-0">
      {label}
      {sub && <span className="block text-[11px] font-normal text-gray-400">{sub}</span>}
    </span>
    <span className={`shrink-0 font-mono ${tone || ''} ${bold ? 'text-gray-900' : 'text-gray-800'}`}>{minus ? '− ' : ''}{value}</span>
  </div>
);

const Card = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
      {Icon && <Icon className="h-4 w-4 text-gray-400" />} {title}
    </h3>
    {children}
  </div>
);

const Stat = ({ label, value, sub, tone }) => (
  <div className={`rounded-2xl border p-4 ${tone}`}>
    <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
    {sub && <p className="mt-0.5 text-[11px] opacity-70">{sub}</p>}
  </div>
);

/** Full-page admin view of one booking, with the complete admin / worker money split. */
const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminBookingService.getBookingById(id);
      if (res.success) setBooking(res.data);
    } catch (error) {
      toast.error(error.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    const reason = window.prompt(`Cancel booking #${booking.bookingNumber}? Enter a reason (shown to the customer):`);
    if (reason === null) return;
    if (!reason.trim()) return toast.error('A cancellation reason is required');
    try {
      const res = await adminWorkerService.cancelBooking(booking._id, reason.trim());
      toast.success(res.message || 'Booking cancelled');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  if (loading) return <p className="py-20 text-center text-sm text-gray-500">Loading booking…</p>;
  if (!booking) return <p className="py-20 text-center text-sm text-gray-500">Booking not found.</p>;

  const f = booking.financials || {};
  const c = f.customer || {};
  const s = f.settlement || {};
  const a = f.admin || {};
  const w = f.worker || {};
  const status = String(booking.status || '').toLowerCase();
  const instant = String(booking.bookingType || '').toLowerCase() === 'instant';
  const provider = booking.workerId || booking.vendorId;
  const canCancel = !['completed', 'cancelled'].includes(status);
  const hasGst = s.gst > 0 || s.sgst > 0 || s.cgst > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/home-service/bookings')} className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50">
            <FiArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-gray-900">Booking #{booking.bookingNumber}</h1>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${STATUS_TONE[status] || 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {status.replaceAll('_', ' ')}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${instant ? 'bg-orange-500 text-white' : 'border border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
                {instant ? <FiZap className="h-3 w-3" /> : <FiCalendar className="h-3 w-3" />} {instant ? 'Instant' : 'Slot'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">Booked on {when(booking.createdAt)} · {booking.zoneName || 'Zone not set'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <button onClick={() => setAssignFor(booking)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
              <FiUserCheck className="h-4 w-4" /> {provider ? 'Reassign' : 'Assign worker'}
            </button>
          )}
          {canCancel && (
            <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
              <FiXCircle className="h-4 w-4" /> Cancel booking
            </button>
          )}
        </div>
      </div>

      {f.estimated && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>The final bill is not generated yet, so the admin / worker split below is an estimate from today's settings. It becomes final when the worker finishes billing.</p>
        </div>
      )}

      {/* Money at a glance */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Customer bill" value={inr(c.billTotal)} sub={c.balanceDue > 0 ? `${inr(c.balanceDue)} still due` : 'Fully settled'} tone="border-gray-200 bg-white text-gray-900" />
        <Stat label="Admin profit" value={inr(a.totalIncome)} sub={`${s.adminPct ?? 0}% share${a.platformCommission ? ' + platform commission' : ''}`} tone="border-violet-200 bg-violet-50 text-violet-800" />
        <Stat label="Worker earning" value={inr(w.totalEarning)} sub={w.extras ? `incl. ${inr(w.extras)} extras` : 'service share'} tone="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <Stat label="Taxes payable" value={inr(f.taxesPayable)} sub={hasGst ? 'GST + SGST + CGST' : 'Apply GST is off'} tone="border-amber-200 bg-amber-50 text-amber-800" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Customer side */}
        <Card title="Customer payment" icon={FiUser}>
          <Row label={booking.serviceName || 'Service'} sub={booking.serviceCategory} value={inr(c.servicePrice)} />
          {c.discounts?.offer > 0 && <Row label="Offer discount" value={inr(c.discounts.offer)} minus tone="text-emerald-600" />}
          {c.discounts?.promo > 0 && <Row label={`Promo${booking.promoCode ? ` (${booking.promoCode})` : ''}`} value={inr(c.discounts.promo)} minus tone="text-emerald-600" />}
          {c.discounts?.vip > 0 && <Row label="VIP discount" value={inr(c.discounts.vip)} minus tone="text-emerald-600" />}
          {c.extras?.services > 0 && <Row label="Extra services (added by worker)" value={inr(c.extras.services)} />}
          {c.extras?.parts > 0 && <Row label="Parts & materials" value={inr(c.extras.parts)} />}
          {c.extras?.transport > 0 && <Row label="Transport" value={inr(c.extras.transport)} />}
          {c.tax > 0 && <Row label="Tax on booking" value={inr(c.tax)} />}
          {c.visitingCharges > 0 && <Row label="Visiting charges" value={inr(c.visitingCharges)} />}
          {c.tip > 0 && <Row label="Tip for professional" value={inr(c.tip)} />}
          <div className="my-2 border-t border-dashed border-gray-200" />
          <Row label="Total bill" value={inr(c.billTotal)} bold />
          {c.advancePaid > 0 && <Row label="Advance paid online" value={inr(c.advancePaid)} minus tone="text-emerald-600" />}
          <Row label="Balance due" value={inr(c.balanceDue)} bold tone={c.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'} />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold capitalize text-gray-700">{String(c.paymentMethod || 'pay at home').replaceAll('_', ' ')}</span>
            <span className={`rounded-full px-2.5 py-1 font-bold uppercase ${['paid', 'plan_covered', 'collected_by_vendor'].includes(c.paymentStatus) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {String(c.paymentStatus || 'pending').replaceAll('_', ' ')}
            </span>
          </div>
        </Card>

        {/* Split */}
        <div className="space-y-5">
          <Card title="Admin profit" icon={FiTool} className="border-violet-200">
            <Row label={`Admin share (${s.adminPct ?? 0}% of ${inr(s.price)})`} value={inr(a.share)} />
            {a.discountFromAdmin > 0 && <Row label="Discounts given to customer" sub="Come out of the admin's share" value={inr(a.discountFromAdmin)} minus tone="text-red-600" />}
            {s.gst > 0 && <Row label={`GST (${s.gstPct}% of admin share)`} value={inr(s.gst)} minus tone="text-red-600" />}
            <Row label="Admin net profit" value={inr(a.netProfit)} bold />
            {s.platformCommission > 0 && <Row label={`Platform commission (${s.platformPct}% of worker share)`} sub="Kept by the platform" value={inr(s.platformCommission)} tone="text-violet-700" />}
            <div className="my-2 border-t border-dashed border-gray-200" />
            <Row label="Total admin income" value={inr(a.totalIncome)} bold tone="text-violet-700" />
          </Card>

          <Card title="Worker earning" icon={FiUserCheck} className="border-emerald-200">
            <Row label={`Worker share (${100 - (s.adminPct ?? 0)}% of ${inr(s.price)})`} value={inr(w.share)} />
            {s.sgst > 0 && <Row label={`SGST (${s.sgstPct}%)`} value={inr(s.sgst)} minus tone="text-red-600" />}
            {s.cgst > 0 && <Row label={`CGST (${s.cgstPct}%)`} value={inr(s.cgst)} minus tone="text-red-600" />}
            {s.platformCommission > 0 && <Row label={`Platform commission (${s.platformPct}%)`} value={inr(s.platformCommission)} minus tone="text-red-600" />}
            <Row label="Worker net for service" value={inr(w.netForService)} bold />
            {w.extras > 0 && <Row label="Extras & parts (100% to worker)" value={inr(w.extras)} />}
            {w.tip > 0 && <Row label="Tip (100% to worker)" value={inr(w.tip)} />}
            <div className="my-2 border-t border-dashed border-gray-200" />
            <Row label="Total worker earning" value={inr(w.totalEarning)} bold tone="text-emerald-700" />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Schedule" icon={FiClock}>
          <Row label="Mode" value={instant ? 'Instant (ASAP)' : 'Scheduled slot'} />
          <Row label="Date" value={booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          <Row label="Time" value={instant ? 'ASAP' : (booking.scheduledTime || `${booking.timeSlot?.start || ''} - ${booking.timeSlot?.end || ''}`)} />
          <Row label="Accepted" value={when(booking.acceptedAt || booking.workerAcceptedAt)} />
          {booking.completedAt && <Row label="Completed" value={when(booking.completedAt)} />}
          {booking.cancellationReason && (
            <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800"><b>Cancelled{booking.cancelledBy ? ` by ${booking.cancelledBy}` : ''}:</b> {booking.cancellationReason}</p>
          )}
        </Card>

        <Card title="Customer" icon={FiUser}>
          <p className="text-sm font-bold text-gray-900">{booking.userId?.name || 'Guest user'}</p>
          {booking.userId?.phone && <a href={`tel:${booking.userId.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FiPhone className="h-3.5 w-3.5" />{booking.userId.phone}</a>}
          {booking.address && (
            <div className="mt-3 text-sm text-gray-600">
              <p className="flex items-start gap-1.5"><FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />{[booking.address.addressLine1, booking.address.addressLine2, booking.address.city, booking.address.pincode].filter(Boolean).join(', ')}</p>
              {booking.address.lat && booking.address.lng && (
                <a href={`https://www.google.com/maps?q=${booking.address.lat},${booking.address.lng}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 pl-5 text-xs font-semibold text-blue-600 hover:underline">
                  <FiExternalLink className="h-3 w-3" /> View on map
                </a>
              )}
            </div>
          )}
        </Card>

        <Card title="Service provider" icon={FiUserCheck}>
          {provider ? (
            <>
              <p className="text-sm font-bold text-gray-900">{provider.name || 'Unnamed'}</p>
              <p className="text-xs text-gray-500">{booking.workerId ? 'Worker' : 'Vendor'}{provider.rating ? ` · ★ ${provider.rating}` : ''}</p>
              {provider.phone && <a href={`tel:${provider.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FiPhone className="h-3.5 w-3.5" />{provider.phone}</a>}
            </>
          ) : (
            <p className="text-sm text-gray-500">No provider assigned yet.</p>
          )}
        </Card>
      </div>

      <AssignWorkerModal isOpen={!!assignFor} onClose={() => setAssignFor(null)} booking={assignFor} onSuccess={load} />
    </div>
  );
};

export default BookingDetailPage;
