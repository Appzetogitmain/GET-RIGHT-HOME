import React from 'react';

const typeMap = {
  call: { label: '📞 Call', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  whatsapp: { label: '💬 WhatsApp', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  callback: { label: '🔔 Callback', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  contact_owner: { label: '📩 Enquiry', className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
};

const LeadTypeBadge = ({ type }) => {
  const key = (type || '').toLowerCase();
  const cfg = typeMap[key] || { label: key || 'Enquiry', className: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

export default LeadTypeBadge;
