/**
 * Utility to generate time slots based on platform operating hours
 * @param {string} openingTime - e.g. "09:00" (24-hour format)
 * @param {string} closingTime - e.g. "21:00" (24-hour format)
 * @param {number} slotDurationMinutes - duration per slot (default 60)
 * @returns {Array<{value: string, end: string, display: string}>}
 */
export const generateTimeSlots = (openingTime = '09:00', closingTime = '21:00', slotDurationMinutes = 60) => {
  const slots = [];

  const [openHour, openMin] = (openingTime || '09:00').split(':').map(Number);
  const [closeHour, closeMin] = (closingTime || '21:00').split(':').map(Number);

  let currentMinutes = openHour * 60 + openMin;
  const endMinutes = closeHour * 60 + closeMin;
  const duration = slotDurationMinutes > 0 ? slotDurationMinutes : 60;

  const pad = (n) => String(n).padStart(2, '0');

  const formatDisplay = (h, m) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${displayHour}:00 ${period}` : `${displayHour}:${pad(m)} ${period}`;
  };

  while (currentMinutes + duration <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60);
    const startM = currentMinutes % 60;

    const nextMinutes = currentMinutes + duration;
    const endH = Math.floor(nextMinutes / 60);
    const endM = nextMinutes % 60;

    slots.push({
      value: `${pad(startH)}:${pad(startM)}`,
      end: `${pad(endH)}:${pad(endM)}`,
      display: formatDisplay(startH, startM)
    });

    currentMinutes = nextMinutes;
  }

  return slots;
};
