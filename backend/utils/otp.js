// OTP helper.
// Local development: set USE_DEFAULT_OTP=true (and NODE_ENV=development) in
// backend/.env and every phone number gets DEFAULT_OTP (123456 unless
// overridden), with no SMS sent.
//
// SECURITY: default-OTP mode is ignored when NODE_ENV=production — otherwise
// anyone could log in to any account with 123456.
//
// Store-review / QA accounts: TEST_OTP_NUMBERS="9876543210:482913,9123456789:771204"
// (opt-in via env only; never hardcode these in source — the repo is shared).
import crypto from 'crypto';

const parseTestNumbers = () => {
  const map = {};
  for (const pair of (process.env.TEST_OTP_NUMBERS || '').split(',')) {
    const [num, code] = pair.split(':').map((s) => (s || '').trim());
    if (num && /^\d{4,8}$/.test(code || '')) map[num.replace(/\D/g, '').slice(-10)] = code;
  }
  return map;
};

export const isDefaultOtpMode = () => {
  if (process.env.USE_DEFAULT_OTP !== 'true') return false;
  if (process.env.NODE_ENV === 'production') {
    if (!isDefaultOtpMode.warned) {
      console.error('🚨 SECURITY: USE_DEFAULT_OTP=true is ignored because NODE_ENV=production.');
      isDefaultOtpMode.warned = true;
    }
    return false;
  }
  return true;
};

export const generateOtp = (phone) => {
  if (isDefaultOtpMode()) {
    return process.env.DEFAULT_OTP || '123456';
  }
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  const testNumbers = parseTestNumbers();
  if (testNumbers[cleanPhone]) {
    return testNumbers[cleanPhone];
  }
  // Cryptographically secure 6-digit code (Math.random is predictable).
  return String(crypto.randomInt(100000, 1000000));
};

/** Constant-time comparison of two OTP strings; false for missing/non-string input. */
export const otpMatches = (expected, provided) => {
  if (typeof expected !== 'string' || typeof provided !== 'string' || !expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
