// utils/bookingPricing.js
//
// Authoritative pricing for a home-service booking.
//
// The client sends its own totals so it can render a summary, but those values
// must never decide what the customer is charged — a request claiming
// `basePrice: 1` for a ₹629 service was previously accepted verbatim. Prices
// here are recomputed from the service/cart records the server loaded, and the
// client's figures are only compared against the result.

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Per-line price for a booked cart item, taken from the SERVER's service record. */
const lineTotal = (item, trustedUnitPrice) => {
  const qty = Math.max(1, Math.floor(toNumber(item?.quantity, 1)));
  return trustedUnitPrice * qty;
};

/**
 * Recomputes a booking's money from trusted sources.
 *
 * @param {object}  args
 * @param {object}  args.service          service doc loaded by the server
 * @param {Array}   [args.bookedItems]    cart lines from the request
 * @param {Map}     [args.trustedPrices]  serviceId -> price, loaded server-side
 * @param {number}  [args.visitingCharges]
 * @param {number}  [args.taxRate]        e.g. 0.18
 * @param {number}  [args.promoDiscount]  already validated against a promo record
 * @param {number}  [args.pendingPenalty]
 * @returns {{basePrice, discount, tax, visitingCharges, promoDiscount, finalAmount}}
 */
export const computeBookingPricing = ({
  service,
  bookedItems = [],
  trustedPrices = null,
  visitingCharges = 0,
  taxRate = 0,
  promoDiscount = 0,
  pendingPenalty = 0
} = {}) => {
  let basePrice = 0;

  if (Array.isArray(bookedItems) && bookedItems.length > 0) {
    basePrice = bookedItems.reduce((sum, item) => {
      // Prefer the price the server looked up for this item; only fall back to
      // the service's own base price. The item's own `price` field is client
      // data and is deliberately NOT trusted.
      const id = String(item?.serviceId?._id || item?.serviceId || item?.card?._id || item?._id || '');
      const trusted = trustedPrices?.get?.(id);
      const unit = toNumber(trusted, toNumber(service?.discountPrice || service?.basePrice, 0));
      return sum + lineTotal(item, unit);
    }, 0);
  }

  if (basePrice <= 0) {
    basePrice = toNumber(service?.basePrice, 0);
  }

  // A discountPrice on the service is the offer price, so the discount is the
  // gap between list and offer — never a client-supplied number.
  const discountPrice = toNumber(service?.discountPrice, 0);
  const discount = discountPrice > 0 && discountPrice < basePrice ? basePrice - discountPrice : 0;

  const safeVisiting = Math.max(0, toNumber(visitingCharges, 0));
  // A promo can never exceed what's actually payable for the service.
  const safePromo = Math.min(Math.max(0, toNumber(promoDiscount, 0)), Math.max(0, basePrice - discount));

  const taxable = Math.max(0, basePrice - discount - safePromo);
  const tax = Math.round(taxable * Math.max(0, toNumber(taxRate, 0)));

  const penalty = Math.max(0, toNumber(pendingPenalty, 0));
  const finalAmount = Math.max(0, taxable + tax + safeVisiting + penalty);

  return {
    basePrice,
    discount,
    tax,
    visitingCharges: safeVisiting,
    promoDiscount: safePromo,
    finalAmount
  };
};

/**
 * Whether the client's displayed total matches what the server computed.
 *
 * Used to detect tampering (and genuine client/server drift) without blocking
 * on rounding noise.
 */
export const pricingMatchesClient = (serverAmount, clientAmount, tolerance = 1) => {
  const c = Number(clientAmount);
  if (!Number.isFinite(c)) return true; // client sent nothing to compare
  return Math.abs(serverAmount - c) <= tolerance;
};
