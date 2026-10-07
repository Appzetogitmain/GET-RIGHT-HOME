import React from 'react';
import { Share2, Phone, MessageSquare, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import LeadScoreStars from './LeadScoreStars';
import {
    fmtRelDate, getLeadScore, getListingTitle, getBuyerName, getBuyerPhone,
    getBuyerType, getEnquiryMessage, humanize
} from './enquiryUtils';

const digits = (s) => String(s || '').replace(/[^0-9]/g, '');

const propertyStatusLabel = (prop) => {
    const s = String(prop?.status || 'active').toLowerCase();
    return s === 'approved' || s === 'active' ? 'Active' : humanize(s);
};

/**
 * One response/respondent card. `item` is an enquiry; for the respondents tab
 * pass the respondent's latest enquiry plus `enquiryCount`.
 */
const EnquiryCard = ({ item, enquiryCount = 1, onViewDetail }) => {
    const navigate = useNavigate();
    const prop = item.propertyId || {};
    const name = getBuyerName(item);
    const phone = getBuyerPhone(item);
    const rawPhone = item.rawPhone || phone;
    const canContact = !!(item.isContactAuthorized && digits(rawPhone));
    const score = getLeadScore(item);
    const message = getEnquiryMessage(item);

    const share = () => {
        const text = `${name} enquired about ${prop.propertyName || 'a property'}`;
        if (navigator.share) navigator.share({ text }).catch(() => {});
        else navigator.clipboard?.writeText(text).then(() => toast.success('Copied'));
    };

    const blocked = () => toast('Subscribe to view contact details');

    return (
        <div className="bg-white border border-[#E0E0E0] rounded">
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-bold text-slate-900 leading-tight truncate">{name}</h3>
                    <span className="text-sm text-slate-500 shrink-0 pt-1">{fmtRelDate(item.createdAt)}</span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
                        <span className="shrink-0">Lead Score :</span>
                        <span className="font-bold text-slate-900">{score.toFixed(1)}</span>
                        <LeadScoreStars score={score} size={15} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 shrink-0">{getBuyerType(item)}</span>
                </div>

                <p className="text-lg text-slate-800 leading-snug mt-3">{getListingTitle(prop)}</p>

                <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="text-sm text-slate-500 leading-snug">
                        <span className="block">
                            {enquiryCount > 1 ? `${enquiryCount} enquiries` : 'Plain Listing'}
                        </span>
                        <span className="block">{propertyStatusLabel(prop)}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={share}
                            aria-label="Share"
                            className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                        >
                            <Share2 size={18} />
                        </button>
                        {canContact ? (
                            <a
                                href={`tel:${rawPhone}`}
                                aria-label="Call"
                                className="w-11 h-11 rounded-full bg-[#0B4F9C] text-white flex items-center justify-center"
                            >
                                <Phone size={18} />
                            </a>
                        ) : (
                            <button onClick={blocked} aria-label="Call" className="w-11 h-11 rounded-full bg-[#0B4F9C] text-white flex items-center justify-center">
                                <Phone size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#E0E0E0] px-4 py-3">
                <button onClick={onViewDetail} className="text-[15px] font-medium text-[#1A73E8]">
                    View Lead Detail
                </button>
                <div className="flex items-center gap-4">
                    {!canContact && (
                        <button
                            onClick={() => navigate(prop._id ? `/my-subscriptions?propertyId=${prop._id}` : '/my-subscriptions')}
                            className="flex items-center gap-1 text-[15px] font-semibold text-orange-600"
                        >
                            <Crown size={15} /> Upgrade
                        </button>
                    )}
                    {message && (
                        <button onClick={onViewDetail} className="flex items-center gap-1.5 text-[15px] font-medium text-[#1A73E8]">
                            <MessageSquare size={16} /> View Message
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnquiryCard;
