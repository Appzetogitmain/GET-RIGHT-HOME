import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, ExternalLink, FileText, CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { enquiryService } from '../../services/apiService';
import { usePropertyNavigate } from '../../hooks/usePropertyNavigate';
import LeadTypeBadge from '../../components/LeadTypeBadge';
import LeadScoreStars from '../../components/enquiries/LeadScoreStars';
import {
    EMPTY, parseEnquiryMessage, getEnquiryMessage, getEnquiryStatus, getBuyerName, getBuyerPhone,
    getLeadScore, getPropertyPrice, getPropertyArea, getPropertyBhk, getPropertyLocality,
    fmtPriceShort, fmtDateTime, humanize
} from '../../components/enquiries/enquiryUtils';

const STATUSES = ['new', 'contacted', 'scheduled', 'closed', 'dropped'];
const TIME_SLOTS = ['10:00 AM - 12:00 PM', '12:00 PM - 03:00 PM', '03:00 PM - 06:00 PM', '06:00 PM - 08:00 PM'];
const CARD_SHADOW = { boxShadow: '0 1px 4px rgba(0,0,0,0.12)' };
const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
const val = (v) => (v === undefined || v === null || v === '' ? EMPTY : v);

const Row = ({ label, value }) => (
    <div className="flex items-center justify-between py-3 text-[15px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900 text-right">{value}</span>
    </div>
);

const LeadDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { navigateToProperty } = usePropertyNavigate();

    const [loading, setLoading] = useState(true);
    const [enquiry, setEnquiry] = useState(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTimeSlot, setScheduleTimeSlot] = useState(TIME_SLOTS[0]);
    const [scheduleNotes, setScheduleNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await enquiryService.getReceived();
            if (res.success) {
                const all = res.allEnquiries || res.enquiries || [];
                setEnquiry(all.find((e) => String(e._id) === String(id)) || null);
            }
        } catch (err) {
            console.error('Load lead detail error:', err);
            toast.error('Failed to load lead details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleUpdateStatus = async (status) => {
        try {
            const res = await enquiryService.updateStatus(enquiry._id, status);
            if (res.success) {
                toast.success(`Status updated to ${status}`);
                setEnquiry((prev) => ({ ...prev, status }));
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!scheduleDate) return toast.error('Please select a preferred date');
        try {
            setSubmitting(true);
            const res = await enquiryService.updateStatus(enquiry._id, {
                status: 'scheduled',
                preferredDate: scheduleDate,
                timeSlot: scheduleTimeSlot,
                adminNotes: scheduleNotes
            });
            if (res.success) {
                toast.success('Site visit scheduled successfully!');
                setScheduleOpen(false);
                setScheduleDate('');
                setScheduleNotes('');
                await load();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to schedule visit');
        } finally {
            setSubmitting(false);
        }
    };

    const header = (
        <div className="sticky top-0 z-30 bg-[#0A5CB8] text-white flex items-center gap-3 px-4 h-14">
            <button onClick={() => navigate('/my-enquiries')} aria-label="Back" className="p-1 -ml-1">
                <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg font-medium">Lead Details</h1>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F6F8]">
                {header}
                <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#0A5CB8]" /></div>
            </div>
        );
    }

    if (!enquiry) {
        return (
            <div className="min-h-screen bg-[#F5F6F8]">
                {header}
                <div className="text-center py-24 px-6">
                    <p className="font-semibold text-slate-800">Lead not found</p>
                    <button onClick={() => navigate('/my-enquiries')} className="mt-3 text-[#1A73E8] font-medium">
                        Back to responses
                    </button>
                </div>
            </div>
        );
    }

    const prop = enquiry.propertyId || {};
    const name = getBuyerName(enquiry);
    const phone = getBuyerPhone(enquiry);
    const rawPhone = enquiry.rawPhone || phone;
    const canContact = !!(enquiry.isContactAuthorized && digits(rawPhone));
    const score = getLeadScore(enquiry);
    const status = getEnquiryStatus(enquiry);
    const message = getEnquiryMessage(enquiry);
    const req = enquiry.requirement || {};

    const price = getPropertyPrice(prop);
    const area = getPropertyArea(prop);
    const interestBits = [fmtPriceShort(price, { prefix: '', sep: ' ' }).replace(/ Lac$/, ' L').replace(/ Cr$/, ' Cr'), area ? `${area} sqft` : '']
        .filter(Boolean).join(' | ');

    const bhkNum = req.bhk ? String(req.bhk).replace(/\D/g, '') : getPropertyBhk(prop);
    const budget = req.budgetMin || req.budgetMax
        ? `${fmtPriceShort(req.budgetMin, { prefix: 'Rs. ' }) || 'Rs. 0'} to ${fmtPriceShort(req.budgetMax, { prefix: 'Rs. ' })}`.replace(/ to $/, '')
        : '';
    const place = req.location || req.city || getPropertyLocality(prop);
    const focus = [bhkNum ? `${bhkNum}BHK` : '', budget, place].filter(Boolean).join(', ');

    const parsed = parseEnquiryMessage(message);
    const siteVisit = ['visit', 'schedule_visit'].includes(enquiry.actionType || enquiry.enquiryType) || enquiry.preferredDate
        ? 'Yes' : EMPTY;
    const sourceLabel = humanize(enquiry.actionType || enquiry.enquiryType || enquiry.sourceContext);

    return (
        <div className="min-h-screen bg-[#F5F6F8] pb-28">
            {header}

            {/* Contact block */}
            <div className="bg-white px-4 pt-4">
                <h2 className="text-[22px] font-medium text-[#1A73E8] leading-tight">{name}</h2>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-slate-500">{val(phone)}</p>
                    {canContact && (
                        <div className="flex gap-2">
                            <a href={`https://wa.me/${digits(rawPhone)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                                className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center"><MessageCircle size={17} /></a>
                            <a href={`tel:${rawPhone}`} aria-label="Call"
                                className="w-9 h-9 rounded-full bg-[#0B4F9C] text-white flex items-center justify-center"><Phone size={16} /></a>
                        </div>
                    )}
                </div>
                <div className="border-t border-[#E0E0E0] mt-4 grid grid-cols-2">
                    <div className="py-4 pr-3">
                        <p className="text-sm text-slate-500">Lead Score</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-lg font-bold text-slate-900">{score.toFixed(1)}</span>
                            <LeadScoreStars score={score} size={15} />
                        </div>
                    </div>
                    <div className="py-4 pl-3">
                        <p className="text-sm text-slate-500">Source</p>
                        <p className="text-lg font-bold text-slate-900 mt-1 break-words">{sourceLabel}</p>
                    </div>
                </div>
            </div>

            <div className="px-3 pt-3 space-y-3 md:max-w-[480px] md:mx-auto">
                {/* Interest card */}
                <div className="bg-white rounded p-4 space-y-2" style={CARD_SHADOW}>
                    <p className="text-[15px] text-slate-600">
                        Also interested in: <span className="text-slate-900">{interestBits ? `(${interestBits})` : EMPTY}</span>
                    </p>
                    <p className="text-[15px] text-slate-600">
                        Focussed On: <span className="font-bold text-slate-900">{focus || EMPTY}</span>
                    </p>
                </div>

                {/* Activity details */}
                <div className="bg-white rounded px-4 pt-4 pb-1" style={CARD_SHADOW}>
                    <div className="flex items-baseline justify-between">
                        <h3 className="font-bold text-slate-900 tracking-wide">ACTIVITY DETAILS</h3>
                        <span className="text-sm text-slate-400">in last 6 months</span>
                    </div>
                    <div className="divide-y divide-[#E0E0E0] mt-1">
                        <Row label="Number of Interest sent" value={val(enquiry.interestCount)} />
                        <Row label="Number of Views" value={val(enquiry.viewCount)} />
                        <Row label="Planning to Buy within" value={val(req.timeline || req.planningToBuy)} />
                        <Row label="Interested in Site Visit?" value={siteVisit} />
                    </div>
                </div>

                {/* Update status */}
                <div className="bg-white rounded p-4" style={CARD_SHADOW}>
                    <h3 className="font-bold text-slate-900 tracking-wide mb-3">UPDATE STATUS</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {STATUSES.map((st) => (
                            <button
                                key={st}
                                onClick={() => handleUpdateStatus(st)}
                                className={`py-2 rounded text-xs font-bold uppercase transition-colors ${
                                    status === st ? 'bg-[#1A73E8] text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded p-4 space-y-3" style={CARD_SHADOW}>
                    <h3 className="font-bold text-slate-900 tracking-wide">TIMELINE</h3>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1A73E8] flex items-center justify-center shrink-0">
                            <FileText size={15} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[15px] font-semibold text-slate-800">Enquiry Received</p>
                                <LeadTypeBadge type={enquiry.actionType || enquiry.enquiryType} />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(enquiry.createdAt)}</p>
                        </div>
                    </div>
                    {message && (
                        <div className="bg-slate-50 rounded p-3 text-sm text-slate-700 space-y-1">
                            <p className="text-xs font-bold text-[#1A73E8] uppercase">{parsed.type}</p>
                            {parsed.date && <p><span className="text-slate-500">Preferred Date:</span> {parsed.date}</p>}
                            {parsed.timeSlot && <p><span className="text-slate-500">Time Slot:</span> {parsed.timeSlot}</p>}
                            {parsed.notes && <p className="whitespace-pre-wrap"><span className="text-slate-500">Message:</span> {parsed.notes}</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky actions */}
            <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E0E0E0] px-3 py-3 flex gap-3 md:max-w-[480px] md:mx-auto">
                <button
                    onClick={() => setScheduleOpen(true)}
                    className="flex-1 py-3 rounded bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"
                >
                    <Calendar size={15} /> Schedule Site Visit
                </button>
                {prop._id && (
                    <button
                        onClick={() => navigateToProperty(prop)}
                        className="flex-1 py-3 rounded bg-[#0A5CB8] text-white text-sm font-bold flex items-center justify-center gap-1.5"
                    >
                        <ExternalLink size={14} /> View Property Listing
                    </button>
                )}
            </div>

            {/* Schedule visit sheet */}
            {scheduleOpen && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setScheduleOpen(false)} />
                    <form onSubmit={handleScheduleSubmit} className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
                        <h2 className="font-bold text-slate-900">Schedule Site Visit</h2>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Preferred Date *</label>
                            <input
                                type="date" required
                                min={new Date().toISOString().split('T')[0]}
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded border border-[#E0E0E0] text-sm outline-none focus:border-[#1A73E8]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Time Slot</label>
                            <div className="grid grid-cols-2 gap-2">
                                {TIME_SLOTS.map((slot) => (
                                    <button
                                        type="button" key={slot}
                                        onClick={() => setScheduleTimeSlot(slot)}
                                        className={`py-2 rounded text-xs font-semibold border ${
                                            scheduleTimeSlot === slot ? 'bg-blue-50 border-[#1A73E8] text-[#1A73E8]' : 'border-[#E0E0E0] text-slate-600'
                                        }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <textarea
                            rows={2}
                            value={scheduleNotes}
                            onChange={(e) => setScheduleNotes(e.target.value)}
                            placeholder="Visit notes (optional)"
                            className="w-full px-3 py-2.5 rounded border border-[#E0E0E0] text-sm outline-none focus:border-[#1A73E8] resize-none"
                        />
                        <button
                            type="submit" disabled={submitting}
                            className="w-full py-3 rounded bg-[#1A73E8] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> Confirm & Schedule Visit</>}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default LeadDetailPage;
