/**
 * WhatsApp messages through the GRH Infinity Media platform.
 *
 * Needs in .env (nothing is sent until WHATSAPP_ENABLED=true):
 *   WHATSAPP_ENABLED=true
 *   WHATSAPP_API_BASE_URL=https://grhinfinitymedia.com/api
 *   WHATSAPP_API_KEY=<token>            (never commit / paste in chat)
 *   WHATSAPP_VENDOR_UID=<vendor uid>
 *   WHATSAPP_SEND_PATH=/{vendorUid}/contact/send-template-message   (template message)
 *   WHATSAPP_TEXT_PATH=/{vendorUid}/contact/send-message            (plain text, 24h window)
 *   WHATSAPP_LANGUAGE=en
 *   WHATSAPP_TEMPLATE_<EVENT>=<approved template name>   e.g. WHATSAPP_TEMPLATE_WITHDRAWAL_PAID=withdrawal_paid
 * The token goes in the URL as ?token=... (a Bearer header is sent too).
 *
 * Sending never throws and never blocks a booking/payment: failures are only logged.
 */
const env = (k, d = '') => (process.env[k] ?? d).toString().trim();

export const whatsappEnabled = () =>
  env('WHATSAPP_ENABLED') === 'true' && !!env('WHATSAPP_API_KEY') && !!env('WHATSAPP_API_BASE_URL');

// Platform wants the number with country code, without + or 0. Indian 10-digit numbers get 91.
export const normalisePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
};

const post = async (pathKey, defaultPath, body, label) => {
  const path = env(pathKey, defaultPath).replace('{vendorUid}', env('WHATSAPP_VENDOR_UID'));
  const base = env('WHATSAPP_API_BASE_URL').replace(/\/$/, '');
  const url = `${base}${path}?token=${encodeURIComponent(env('WHATSAPP_API_KEY'))}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('WHATSAPP_API_KEY')}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  const text = await res.text();
  if (!res.ok) {
    console.warn(`[WhatsApp] ${label}: HTTP ${res.status} ${text.slice(0, 200)}`);
    return { sent: false, reason: `http ${res.status}` };
  }
  return { sent: true };
};

/** Plain text. WhatsApp only delivers it if the customer messaged the business in the last 24h. */
export const sendText = async ({ phone, message }) => {
  try {
    if (!whatsappEnabled()) return { sent: false, reason: 'disabled' };
    const to = normalisePhone(phone);
    if (to.length < 11 || !message) return { sent: false, reason: 'bad input' };
    return await post(
      'WHATSAPP_TEXT_PATH',
      '/{vendorUid}/contact/send-message',
      { phone_number: to, message_body: String(message) },
      `text to ${to.slice(0, 4)}******`
    );
  } catch (error) {
    console.warn('[WhatsApp] text failed:', error.message);
    return { sent: false, reason: error.message };
  }
};

/** fields: ['Ravi', 'BK123', ...] -> field_1, field_2, ... in the order of the template's {{1}}, {{2}}. */
export const sendTemplate = async ({ phone, template, fields = [], extra = {} }) => {
  try {
    if (!whatsappEnabled()) return { sent: false, reason: 'disabled' };
    if (!template) return { sent: false, reason: 'no template' };
    const to = normalisePhone(phone);
    if (to.length < 11) return { sent: false, reason: 'bad phone' };

    const body = {
      phone_number: to,
      template_name: template,
      template_language: env('WHATSAPP_LANGUAGE', 'en'),
      ...extra
    };
    fields.forEach((value, i) => { body[`field_${i + 1}`] = String(value ?? ''); });
    return await post(
      'WHATSAPP_SEND_PATH',
      '/{vendorUid}/contact/send-template-message',
      body,
      `${template} to ${to.slice(0, 4)}******`
    );
  } catch (error) {
    console.warn('[WhatsApp] send failed:', error.message);
    return { sent: false, reason: error.message };
  }
};

/** Send the template configured for an event (WHATSAPP_TEMPLATE_<EVENT>); no-op if none is set. */
export const notifyWhatsApp = (event, phone, fields = []) => {
  const template = env(`WHATSAPP_TEMPLATE_${String(event).toUpperCase()}`);
  if (!template) return Promise.resolve({ sent: false, reason: 'no template for event' });
  return sendTemplate({ phone, template, fields });
};
