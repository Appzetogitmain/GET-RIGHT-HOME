export const BOOKING_MODES = Object.freeze(['instant', 'slot']);

export const normalizeBookingModes = (value, fallback = ['slot']) => {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  const normalized = [...new Set(raw.map((mode) => String(mode).toLowerCase().trim()))]
    .filter((mode) => BOOKING_MODES.includes(mode));
  return normalized.length ? normalized : [...fallback];
};

// Existing catalog/worker rows pre-date bookingModes. They were scheduled
// slot records, so an absent/empty value is treated as slot only.
export const supportsBookingMode = (record, mode) => {
  const wanted = mode === 'instant' ? 'instant' : 'slot';
  const modes = normalizeBookingModes(record?.bookingModes, ['slot']);
  return modes.includes(wanted);
};

export const bookingModeMongoFilter = (mode, field = 'bookingModes') => {
  if (!mode) return null;
  const wanted = mode === 'instant' ? 'instant' : 'slot';
  if (wanted === 'instant') return { [field]: 'instant' };
  return {
    $or: [
      { [field]: 'slot' },
      { [field]: { $exists: false } },
      { [field]: { $size: 0 } }
    ]
  };
};
