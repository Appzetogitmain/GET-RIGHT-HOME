import axios from 'axios';

class SMSIndiaHubService {
  constructor() {
    this.apiKey = process.env.SMSINDIAHUB_API_KEY;
    this.senderId = process.env.SMSINDIAHUB_SENDER_ID || 'BGADEC';
    this.dltTemplateId = process.env.SMSINDIAHUB_DLT_TE_ID || '1007282516644508833';
    this.appName = process.env.SMS_APP_NAME || 'Get Right Home';
    this.baseUrl = 'https://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
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
    const appName = this.appName || process.env.SMS_APP_NAME || 'Get Right Home';
    // Exact match for approved DLT template:
    // "Welcome to the {#var#} powered by Appzeto.Your OTP for registration is {#var#}.BGADEC"
    const message = `Welcome to the ${appName} powered by Appzeto.Your OTP for registration is ${otp}.BGADEC`;
    return this.sendSMS(phone, message, this.dltTemplateId);
  }

  async sendSMS(phone, message, templateId = null) {
    try {
      // Load credentials dynamically at runtime to ensure dotenv has loaded
      const apiKey = this.apiKey || process.env.SMSINDIAHUB_API_KEY;
      const senderId = this.senderId || process.env.SMSINDIAHUB_SENDER_ID || 'BGADEC';
      const dltId = templateId || this.dltTemplateId || process.env.SMSINDIAHUB_DLT_TE_ID || '1007282516644508833';

      if (!apiKey) {
        console.warn('⚠️ [SMSIndiaHub] Missing API Key. SMS NOT SENT.');
        return { success: false, error: 'Missing API Key in environment variables' };
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);
      if (!normalizedPhone || normalizedPhone.length < 12) {
        console.warn(`⚠️ [SMSIndiaHub] Invalid phone number: ${phone}`);
        return { success: false, error: 'Invalid phone number format' };
      }

      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: '0',
        dc: '0',
        gwid: '2'
      });

      if (dltId) {
        params.append('templateid', dltId);
        params.append('TemplateID', dltId);
      }

      const apiUrl = `${this.baseUrl}?${params.toString()}`;
      console.log(`📨 [SMSIndiaHub] Sending SMS to ${normalizedPhone} (Sender: ${senderId}, DLT: ${dltId})...`);

      const response = await axios.get(apiUrl, {
        headers: { 'User-Agent': 'GetRightHome/1.0' },
        timeout: 10000
      });

      const responseData = typeof response.data === 'string'
        ? (() => {
            try {
              return JSON.parse(response.data);
            } catch {
              return { raw: response.data };
            }
          })()
        : response.data;

      // SMSIndiaHub success indicators
      if (
        responseData.ErrorCode === '000' ||
        responseData.ErrorCode === '0' ||
        responseData.ErrorMessage === 'Done' ||
        (responseData.raw && responseData.raw.includes('Done'))
      ) {
        console.log('✅ [SMSIndiaHub] SMS Sent Successfully:', responseData);
        return { success: true, response: responseData };
      } else {
        console.error('❌ [SMSIndiaHub] SMS Failed:', responseData);
        return {
          success: false,
          error: responseData.ErrorMessage || responseData.raw || 'SMS gateway rejected request'
        };
      }

    } catch (error) {
      console.error('❌ [SMSIndiaHub] Service Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new SMSIndiaHubService();
