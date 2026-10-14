import React, { useId } from 'react';

/** 3D-style SVG illustrations for the packers & movers landing page (gradients, side faces, soft shadow). */

const Shadow = ({ id }) => (
  <>
    <defs><filter id={`${id}b`}><feGaussianBlur stdDeviation="1.6" /></filter></defs>
    <ellipse cx="32" cy="58" rx="19" ry="3.2" fill="#2B6270" opacity=".28" filter={`url(#${id}b)`} />
  </>
);

const Defs = ({ id }) => (
  <defs>
    <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7FC6D1" /><stop offset="1" stopColor="#2F7482" /></linearGradient>
    <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3F8A98" /><stop offset="1" stopColor="#1F4B57" /></linearGradient>
    <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#B9DDE3" /></linearGradient>
    <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FBE0A6" /><stop offset="1" stopColor="#D68F35" /></linearGradient>
  </defs>
);

const ICONS = {
  truck: (id) => (
    <>
      <polygon points="12,13 44,13 40,18 8,18" fill="#FFFFFF" />
      <rect x="8" y="18" width="32" height="26" rx="4" fill={`url(#${id}l)`} />
      <polygon points="40,18 44,13 44,39 40,44" fill="#8FC3CC" />
      <path d="M42 24h9l7 9v11H42z" fill={`url(#${id}t)`} />
      <path d="M46 28h4l4 5h-8z" fill="#EAF6F8" />
      <circle cx="18" cy="46" r="6.5" fill="#1F4B57" /><circle cx="18" cy="46" r="2.6" fill="#CFE8EC" />
      <circle cx="50" cy="46" r="6.5" fill="#1F4B57" /><circle cx="50" cy="46" r="2.6" fill="#CFE8EC" />
    </>
  ),
  building: (id) => (
    <>
      <rect x="14" y="10" width="28" height="42" rx="3" fill={`url(#${id}t)`} />
      <polygon points="42,14 50,20 50,52 42,52" fill={`url(#${id}d)`} />
      {[16, 25, 34].flatMap((y) => [19, 26, 33].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="6" rx="1" fill="#EAF6F8" opacity=".92" />))}
      <rect x="25" y="42" width="9" height="10" rx="1.5" fill={`url(#${id}a)`} />
      <rect x="14" y="10" width="28" height="4" rx="2" fill="#fff" opacity=".35" />
    </>
  ),
  clipboard: (id) => (
    <>
      <rect x="14" y="10" width="36" height="46" rx="6" fill={`url(#${id}t)`} />
      <rect x="19" y="17" width="26" height="35" rx="3" fill={`url(#${id}l)`} />
      {[24, 33, 42].map((y) => (
        <g key={y}><rect x="23" y={y} width="5" height="5" rx="1.4" fill="#2F7482" /><rect x="31" y={y + 1.2} width="11" height="2.6" rx="1.3" fill="#8FC3CC" /></g>
      ))}
      <rect x="24" y="7" width="16" height="9" rx="3" fill={`url(#${id}a)`} />
    </>
  ),
  quote: (id) => (
    <>
      <rect x="8" y="12" width="30" height="38" rx="5" fill={`url(#${id}l)`} />
      <rect x="13" y="19" width="18" height="2.6" rx="1.3" fill="#8FC3CC" /><rect x="13" y="26" width="14" height="2.6" rx="1.3" fill="#8FC3CC" /><rect x="13" y="33" width="16" height="2.6" rx="1.3" fill="#8FC3CC" />
      <circle cx="40" cy="38" r="17" fill="#B9722A" /><circle cx="40" cy="36" r="17" fill={`url(#${id}a)`} />
      <circle cx="40" cy="36" r="12.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" />
      <text x="40" y="43" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff" fontFamily="Inter, Arial, sans-serif">₹</text>
    </>
  ),
  expert: (id) => (
    <>
      <path d="M9 54c0-12 8-19 19-19s19 7 19 19z" fill={`url(#${id}t)`} />
      <circle cx="28" cy="21" r="10" fill={`url(#${id}a)`} />
      <path d="M20 17a8.5 8.5 0 0 1 16 0c-4-3-12-3-16 0z" fill="#1F4B57" opacity=".85" />
      <circle cx="46" cy="42" r="11" fill="#2E8B63" /><circle cx="46" cy="40.5" r="11" fill="#3FB487" />
      <path d="M41 40.5l3.6 3.8 6.6-7.6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  box: (id) => (
    <>
      <polygon points="10,20 32,30 32,54 10,44" fill={`url(#${id}a)`} />
      <polygon points="54,20 32,30 32,54 54,44" fill="#B9722A" />
      <polygon points="32,10 54,20 32,30 10,20" fill="#FBE0A6" />
      <polyline points="21,15 43,25" stroke="#fff" strokeOpacity=".7" strokeWidth="4" fill="none" />
      <polyline points="32,30 32,54" stroke="#fff" strokeOpacity=".35" strokeWidth="3" fill="none" />
    </>
  ),
  wallet: (id) => (
    <>
      <rect x="8" y="18" width="46" height="34" rx="7" fill={`url(#${id}t)`} />
      <rect x="8" y="13" width="40" height="13" rx="5" fill="#9CCBD3" />
      <rect x="38" y="30" width="22" height="13" rx="6.5" fill={`url(#${id}a)`} />
      <circle cx="46" cy="36.5" r="2.6" fill="#fff" />
    </>
  ),
  award: (id) => (
    <>
      <polygon points="18,32 30,36 25,56 16,48" fill={`url(#${id}d)`} />
      <polygon points="46,32 34,36 39,56 48,48" fill={`url(#${id}t)`} />
      <circle cx="32" cy="27" r="17" fill="#B9722A" /><circle cx="32" cy="25" r="17" fill={`url(#${id}a)`} />
      <circle cx="32" cy="25" r="11.5" fill="#FBE0A6" />
      <polygon points="32,17 34.6,22.4 40.5,23.1 36.2,27.1 37.3,33 32,30.1 26.7,33 27.8,27.1 23.5,23.1 29.4,22.4" fill="#fff" />
    </>
  ),
  calendar: (id) => (
    <>
      <rect x="9" y="15" width="46" height="40" rx="7" fill={`url(#${id}l)`} />
      <path d="M9 22a7 7 0 0 1 7-7h32a7 7 0 0 1 7 7v7H9z" fill={`url(#${id}t)`} />
      <rect x="19" y="9" width="5.5" height="13" rx="2.7" fill={`url(#${id}a)`} /><rect x="39.5" y="9" width="5.5" height="13" rx="2.7" fill={`url(#${id}a)`} />
      {[[18, 37], [26, 37], [18, 46], [26, 46]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill="#8FC3CC" />)}
      <circle cx="42" cy="44" r="12" fill="#B9722A" /><circle cx="42" cy="42.5" r="12" fill={`url(#${id}a)`} />
      <circle cx="42" cy="42.5" r="8.4" fill="#fff" />
      <path d="M42 37v5.5l3.8 2.2" stroke="#D68F35" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  headset: (id) => (
    <>
      <path d="M14 38a18 18 0 0 1 36 0" stroke={`url(#${id}t)`} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <rect x="8" y="33" width="12" height="19" rx="6" fill={`url(#${id}t)`} /><rect x="44" y="33" width="12" height="19" rx="6" fill={`url(#${id}d)`} />
      <rect x="11" y="36" width="3" height="9" rx="1.5" fill="#fff" opacity=".4" />
      <path d="M50 50q0 8-13 8" stroke="#1F4B57" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="35.5" cy="58" r="3.6" fill={`url(#${id}a)`} />
    </>
  ),
  helmet: (id) => (
    <>
      <path d="M12 42a20 20 0 0 1 40 0z" fill={`url(#${id}a)`} />
      <rect x="27" y="17" width="10" height="25" rx="3.5" fill="#FBE0A6" />
      <path d="M17 36a15 15 0 0 1 8-12" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="7" y="42" width="50" height="9" rx="4.5" fill="#B9722A" />
      <rect x="7" y="42" width="50" height="4" rx="2" fill="#E3A24C" />
    </>
  ),
};

export const Icon3D = ({ name, className = 'h-full w-full' }) => {
  const id = useId().replace(/:/g, '');
  const draw = ICONS[name];
  if (!draw) return null;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <Defs id={id} /><Shadow id={id} />{draw(id)}
    </svg>
  );
};

/** Picks a 3D icon from an item's title; returns null when nothing fits so the uploaded image is used. */
const RULES = [
  [/vehicle|bike|car\b|truck|intra|inter|city/i, 'truck'],
  [/commercial|office|workspace|shop/i, 'building'],
  [/requirement|share/i, 'clipboard'],
  [/quote/i, 'quote'],
  [/expert|assign/i, 'expert'],
  [/lifting|heavy/i, 'box'],
  [/pric|cost|afford/i, 'wallet'],
  [/quality|best/i, 'award'],
  [/reschedule|calendar|date/i, 'calendar'],
  [/support|assist|help/i, 'headset'],
  [/labou?r|professional|staff|team/i, 'helmet'],
];

export const pick3D = (title = '') => RULES.find(([re]) => re.test(title))?.[1] || null;
