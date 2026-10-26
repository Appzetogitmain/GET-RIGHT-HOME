/**
 * Who gets what from a booking.
 *
 *   service price (what the customer booked, e.g. ₹1000)
 *   ├─ admin share  = price × admin profit %           (e.g. 20% → ₹200)
 *   │    ├─ minus discounts (promo / VIP / offer) — they come out of admin's share
 *   │    └─ minus GST (when "Apply GST" is on)         → admin's net profit
 *   └─ worker share = price − admin share              (e.g. ₹800)
 *        ├─ minus SGST and CGST (when "Apply GST" is on)
 *        └─ minus platform commission                  → worker's net earning
 *
 * Platform commission is kept by the platform, so admin's total income is
 * (admin net profit + platform commission). GST / SGST / CGST are taxes payable
 * to the government. None of this changes what the customer pays.
 */
const num = (v) => Number(v) || 0;
const pct = (v) => Math.min(100, Math.max(0, num(v)));
const money = (v) => Math.round(num(v) * 100) / 100;

export const splitConfig = (platform = {}, overrideAdminPct) => ({
  adminPct: pct(overrideAdminPct ?? platform.defaultCommission ?? 10),
  applyGst: !!platform.applyGst,
  gstPct: pct(platform.gstOnAdminPercent),
  sgstPct: pct(platform.sgstPercent),
  cgstPct: pct(platform.cgstPercent),
  platformPct: pct(platform.platformCommissionPercent)
});

export const computeSplit = ({ price, discount = 0, config }) => {
  const p = Math.max(0, num(price));
  const adminShare = money((p * config.adminPct) / 100);
  const discountFromAdmin = Math.min(adminShare, Math.max(0, num(discount)));
  const adminAfterDiscount = money(adminShare - discountFromAdmin);
  const gst = config.applyGst ? money((adminAfterDiscount * config.gstPct) / 100) : 0;
  const adminNet = money(adminAfterDiscount - gst);

  const workerShare = money(p - adminShare);
  const sgst = config.applyGst ? money((workerShare * config.sgstPct) / 100) : 0;
  const cgst = config.applyGst ? money((workerShare * config.cgstPct) / 100) : 0;
  const platformCommission = money((workerShare * config.platformPct) / 100);
  const workerDeductions = money(sgst + cgst + platformCommission);
  const workerNet = money(workerShare - workerDeductions);

  return {
    price: money(p),
    adminPct: config.adminPct,
    adminShare,
    discountFromAdmin,
    gstPct: config.applyGst ? config.gstPct : 0,
    gst,
    adminNet,
    workerShare,
    sgstPct: config.applyGst ? config.sgstPct : 0,
    sgst,
    cgstPct: config.applyGst ? config.cgstPct : 0,
    cgst,
    platformPct: config.platformPct,
    platformCommission,
    workerDeductions,
    workerNet,
    // what the platform actually keeps, and what goes out as tax
    adminTotalIncome: money(adminNet + platformCommission),
    taxesPayable: money(gst + sgst + cgst)
  };
};

/** Worker's net on the original service price — used wherever a job "pays ₹X". */
export const workerNetForPrice = (price, platform, overrideAdminPct) =>
  computeSplit({ price, config: splitConfig(platform, overrideAdminPct) }).workerNet;
