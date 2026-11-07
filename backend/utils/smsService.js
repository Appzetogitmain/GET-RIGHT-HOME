import axios from 'axios';

class SMSIndiaHubService {
  constructor() {
    this.primaryUrl = 'https://cloud.smsindiahub.in/api/mt/SendSMS';
    this.legacyUrl = 'https://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
  }

  getCredentials() {
    return {
      apiKey: (process.env.SMSINDIAHUB_API_KEY || '').trim(),
      user: (process.env.SMSINDIAHUB_USER || '').trim(),
      password: (process.env.SMSINDIAHUB_PASSWORD || '').trim(),
      senderId: (process.env.SMSINDIAHUB_SENDER_ID || 'BGADEC').trim(),
      dltTemplateId: (process.env.SMSINDIAHUB_DLT_TE_ID || '1007282516644508833').trim(),
      appName: (process.env.SMS_APP_NAME || 'Get Right Home').trim(),
      peId: (process.env.SMSINDIAHUB_PE_ID || '').trim()
    };
  }

  normalizePhoneNumber(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/[^0-9]/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length === 10) return '91' + digits;
    if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.substring(1);
    return '91' + digits.slice(-10);
  }

  /**
   * Send OTP using DLT approved template:
   * "Welcome to the {#var#} powered by Appzeto.Your OTP for registration is {#var#}.BGADEC"
   * DLT Template ID: 1007282516644508833
   * Sender ID: BGADEC
   */
  async sendOTP(phone, otp, purpose = 'registration') {
    const creds = this.getCredentials();
    const appName = creds.appName || 'Get Right Home';

    // Exact match for approved DLT template:
    const message = `Welcome to the ${appName} powered by Appzeto.Your OTP for registration is ${otp}.BGADEC`;
    return this.sendSMS(phone, message, creds.dltTemplateId);
  }

  async sendSMS(phone, message, templateId = null) {
    const creds = this.getCredentials();
    const apiKey = creds.apiKey;
    const senderId = creds.senderId || 'BGADEC';
    const dltId = (templateId || creds.dltTemplateId || '1007282516644508833').trim();

    if (!apiKey && !creds.user) {
      console.warn('⚠️ [SMSIndiaHub] Missing SMSINDIAHUB_API_KEY in environment variables. SMS NOT SENT.');
      return { success: false, error: 'Missing API Key in environment variables' };
    }

    const normalizedPhone = this.normalizePhoneNumber(phone);
    if (!normalizedPhone || normalizedPhone.length < 12) {
      console.warn(`⚠️ [SMSIndiaHub] Invalid phone number: ${phone}`);
      return { success: false, error: 'Invalid phone number format' };
    }

    // ── Attempt 1: Modern REST Endpoint (/api/mt/SendSMS) ─────────────────
    // This is the official endpoint that accepts APIKey for Transactional SMS
    try {
      const modernParams = new URLSearchParams({
        APIKey: apiKey,
        senderid: senderId,
        channel: 'Trans',
        DCS: '0',
        flashsms: '0',
        number: normalizedPhone,
        text: message,
        route: '04'
      });

      if (dltId) {
        modernParams.append('TemplateId', dltId);
        modernParams.append('DLTTemplateId', dltId);
      }
      if (creds.peId) {
        modernParams.append('PEId', creds.peId);
      }

      console.log(`📨 [SMSIndiaHub] Sending SMS via /api/mt/SendSMS to ${normalizedPhone} (Sender: ${senderId}, DLT: ${dltId})...`);

      const resp1 = await axios.get(`${this.primaryUrl}?${modernParams.toString()}`, {
        headers: { 'User-Agent': 'GetRightHome/1.0' },
        timeout: 10000
      });

      const parsed1 = this.parseResponse(resp1.data);
      if (this.isSuccess(parsed1)) {
        console.log('✅ [SMSIndiaHub] SMS Sent Successfully (Endpoint 1):', parsed1);
        return { success: true, response: parsed1 };
      }

      console.warn('⚠️ [SMSIndiaHub] Endpoint 1 returned non-success:', parsed1, 'Trying legacy endpoint...');
    } catch (err1) {
      console.warn('⚠️ [SMSIndiaHub] Endpoint 1 failed:', err1.message, 'Trying legacy endpoint...');
    }

    // ── Attempt 2: Legacy Endpoint (/vendorsms/pushsms.aspx) ───────────────
    try {
      const legacyParams = new URLSearchParams({
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: '0',
        dc: '0',
        gwid: '2'
      });

      if (apiKey) {
        legacyParams.append('APIKey', apiKey);
        legacyParams.append('password', apiKey);
      }
      if (creds.user) {
        legacyParams.append('user', creds.user);
      }
      if (creds.password) {
        legacyParams.append('password', creds.password);
      }
      if (dltId) {
        legacyParams.append('templateid', dltId);
        legacyParams.append('TemplateID', dltId);
      }

      const resp2 = await axios.get(`${this.legacyUrl}?${legacyParams.toString()}`, {
        headers: { 'User-Agent': 'GetRightHome/1.0' },
        timeout: 10000
      });

      const parsed2 = this.parseResponse(resp2.data);
      if (this.isSuccess(parsed2)) {
        console.log('✅ [SMSIndiaHub] SMS Sent Successfully (Legacy Endpoint):', parsed2);
        return { success: true, response: parsed2 };
      }

      console.error('❌ [SMSIndiaHub] Both endpoints failed. Gateway response:', parsed2);
      return {
        success: false,
        error: parsed2.ErrorMessage || parsed2.raw || JSON.stringify(parsed2)
      };
    } catch (err2) {
      console.error('❌ [SMSIndiaHub] All SMS attempts failed:', err2.message);
      return { success: false, error: err2.message };
    }
  }

  parseResponse(data) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return { raw: data };
      }
    }
    return data || {};
  }

  isSuccess(resp) {
    if (!resp) return false;
    if (resp.ErrorCode === '000' || resp.ErrorCode === '0' || resp.ErrorCode === 0) return true;
    if (resp.ErrorMessage === 'Done' || resp.ErrorMessage === 'Success') return true;
    if (resp.raw && (resp.raw.includes('Done') || resp.raw.includes('Success') || resp.raw.includes('000'))) return true;
    return false;
  }
}

export default new SMSIndiaHubService();
