// Shared helpers for the received-enquiries list and the lead detail page.

export const EMPTY = 'NA';

// Parse the free-text enquiry message into structured sections.
export const parseEnquiryMessage = (raw = '') => {
    const result = { type: 'General', date: null, timeSlot: null, notes: '' };
    if (!raw) return result;

    if (/schedule visit/i.test(raw)) result.type = 'Schedule Visit';
    else if (/contact owner/i.test(raw)) result.type = 'Contact Owner';
    else if (/callback/i.test(raw)) result.type = 'Callback Request';

    const cleanRaw = raw.replace(/[`'"\[\]]/g, '').trim();

    const dateMatch = cleanRaw.match(/date[:\s]+([^\n\r]+)/i);
    if (dateMatch) result.date = dateMatch[1].trim().split(/(?:time slot|notes|message|preferred)/i)[0].trim();

    const timeMatch = cleanRaw.match(/time slot[:\s]+([^\n\r]+)/i);
    if (timeMatch) result.timeSlot = timeMatch[1].trim().split(/(?:notes|message|preferred)/i)[0].trim();

    const notesMatch = cleanRaw.match(/(?:notes|message|preferred time)[:\s]+([^\n\r]+)/i);
    if (notesMatch) result.notes = notesMatch[1].trim();
    else if (!result.date && !result.timeSlot) result.notes = cleanRaw;

    return result;
};

export const getEnquiryMessage = (item) => item?.message || item?.inquiryMetadata?.message || '';
export const getEnquiryStatus = (item) => (item?.status || item?.inquiryMetadata?.status || 'new').toLowerCase();
export const getBuyerName = (item) => item?.userId?.name || item?.name || 'Inquirer';
export const getBuyerPhone = (item) => item?.phone || item?.userId?.phone || '';
export const getBuyerType = (item) => {
    const t = item?.userId?.userType || item?.userId?.role;
    if (!t || ['user', 'buyer'].includes(String(t).toLowerCase())) return 'Individual';
    return String(t).charAt(0).toUpperCase() + String(t).slice(1);
};

// Today / Yesterday / "Aug 21, 2026"
export const fmtRelDate = (d) => {
    if (!d) return '';
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

export const fmtDateTime = (d) => d
    ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

// 1–5 lead score, derived from how strong the buyer's action was.
export const getLeadScore = (item) => {
    if (!item) return 0;
    const byAction = {
        visit: 4.5, schedule_visit: 4.5, callback: 4, call: 4, whatsapp: 3.5, chat: 3.5,
        view_number: 3, request_photos: 3, brochure_download: 2.5, download_brochure: 2.5,
        document_view: 2, profile_view: 1.5, general: 2.5
    };
    let score = byAction[item.actionType || item.enquiryType] ?? 3;
    if (item.preferredDate) score += 0.5;
    if (getEnquiryMessage(item)) score += 0.5;
    return Math.min(5, score);
};

const pickNumber = (v) => {
    if (v && typeof v === 'object') {
        v = ['value', 'amount', 'price', 'expectedPrice', 'monthlyRent']
            .map(k => v[k]).find(x => x !== undefined && x !== null);
    }
    return Number(v) || 0;
};

export const getPropertyPrice = (prop) => pickNumber(
    prop?.startingPrice ??
    prop?.rentDetails?.monthlyRent ?? prop?.pgDetails?.monthlyRent ??
    prop?.buyDetails?.expectedPrice ?? prop?.plotDetails?.expectedPrice ??
    prop?.dynamicData?.expectedPrice ?? prop?.dynamicData?.monthlyRent ??
    prop?.dynamicData?.expectedRent ?? prop?.dynamicData?.price ?? prop?.price
);

export const fmtPriceShort = (n, { prefix = 'Rs', sep = ' ' } = {}) => {
    if (!n) return '';
    if (n >= 10000000) return `${prefix}${+(n / 10000000).toFixed(2)}${sep}Cr`;
    if (n >= 100000) return `${prefix}${+(n / 100000).toFixed(2)}${sep}Lac`;
    return `${prefix}${n.toLocaleString('en-IN')}`;
};

export const getPropertyBhk = (prop) => {
    const bhk = prop?.buyDetails?.bhk || prop?.rentDetails?.bhk || prop?.dynamicData?.bhk || prop?.bhk;
    return bhk ? String(bhk).replace(/\D/g, '') : '';
};

export const getPropertyArea = (prop) => {
    const candidates = [
        prop?.buyDetails?.area?.superBuiltUp, prop?.buyDetails?.area?.carpet, prop?.carpetArea, prop?.superArea,
        prop?.dynamicData?.carpetArea, prop?.dynamicData?.superArea, prop?.dynamicData?.plotArea,
        prop?.plotDetails?.plotArea, prop?.rentDetails?.area, prop?.buyDetails?.area, prop?.area
    ];
    for (const v of candidates) {
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'object') {
            const inner = ['superBuiltUp', 'carpet', 'value', 'amount', 'size', 'super']
                .map(k => v[k]).find(x => x !== undefined && x !== null && x !== '');
            if (inner !== undefined) return inner;
        } else return v;
    }
    return null;
};

export const getPropertyLocality = (prop) =>
    prop?.address?.locality || prop?.address?.area || prop?.address?.city || '';

// e.g. "Rs49 Lac, 2 Bed, Independent House/Villa for Sale in Bellary bypass"
export const getListingTitle = (prop) => {
    if (!prop || !prop._id) return 'Property';
    const price = fmtPriceShort(getPropertyPrice(prop));
    const bhkNum = getPropertyBhk(prop);
    const tx = String(prop.transactionType || prop.listingType || '').toLowerCase();
    const purpose = tx.includes('rent') || prop.rentDetails?.monthlyRent ? 'Rent' : tx.includes('sale') || tx.includes('buy') ? 'Sale' : '';
    const place = getPropertyLocality(prop);

    const head = [price, bhkNum ? `${bhkNum} Bed` : '', prop.propertyType || ''].filter(Boolean).join(', ');
    const title = `${head}${purpose ? ` for ${purpose}` : ''}${place ? ` in ${place}` : ''}`.trim();
    return title || prop.propertyName || 'Property';
};

export const humanize = (s) => s ? String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : EMPTY;
