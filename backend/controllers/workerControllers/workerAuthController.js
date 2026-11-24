import Worker, { WORKER_LIGHT } from '../../models/Worker.js';
import Admin from '../../models/Admin.js';
import { createNotification } from '../notificationControllers/notificationController.js';
import { getIO } from '../../sockets.js';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import Profession from '../../models/Profession.js';
import cloudinaryService from '../../services/cloudinaryService.js';
import { validProfessionIds } from '../professionController.js';
import Otp from '../../models/Otp.js';
import smsService from '../../utils/smsService.js';
import { generateOtp, isDefaultOtpMode, otpMatches } from '../../utils/otp.js';

// Stubs for services not yet configured in Hoomzo
const generateOTP = (phone) => generateOtp(phone);
const hashOTP = (otp) => otp;
const storeOTP = async (phone, otp) => {
  await Otp.findOneAndUpdate(
    { phone },
    { phone, otp, expiresAt: Date.now() + 10 * 60 * 1000, tempData: { role: 'worker' } },
    { upsert: true, new: true }
  );
};
const verifyOTP = async (phone, otp) => {
  if (typeof otp === 'number') otp = String(otp);
  if (typeof phone !== 'string' || typeof otp !== 'string') {
    return { success: false, message: 'Invalid or expired OTP' };
  }
  const otpRecord = await Otp.findOne({ phone });
  if (otpRecord && otpMatches(otpRecord.otp, otp) && otpRecord.expiresAt >= Date.now()) {
    await Otp.deleteOne({ phone });
    return { success: true };
  }
  return { success: false, message: 'Invalid or expired OTP' };
};
const checkRateLimit = async () => true;
const generateTokenPair = (data) => {
  const token = jwt.sign({ id: data.userId, role: data.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, accessToken: token, refreshToken: token };
};
const verifyRefreshToken = (token) => {
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
};
// SECURITY: the verification token proves "this phone passed OTP". It used to
// be plain base64(phone), so anyone could forge one for any number and
// register without an OTP. It is now a signed JWT that expires in 30 minutes.
const generateVerificationToken = (phone) =>
  jwt.sign({ phone, purpose: 'worker-registration' }, process.env.JWT_SECRET, { expiresIn: '30m' });
const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(String(token), process.env.JWT_SECRET);
    return decoded.purpose === 'worker-registration' && typeof decoded.phone === 'string' ? decoded.phone : null;
  } catch {
    return null;
  }
};
const sendSMSOTP = async (phone, otp) => {
  return smsService.sendOTP(phone, otp, 'worker-auth');
};
// Real uploader: the old stub always failed, so Aadhar/PAN/licence scans were stored
// as multi-MB base64 inside the worker document.
const USER_ROLES = { WORKER: 'worker' };
const WORKER_STATUS = { OFFLINE: 'offline' };

/**
 * Send OTP for worker registration/login
 */
const sendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, email, type } = req.body; // type: 'login' (from login page) or undefined/'register'

    // Check if worker exists and their approval status before sending OTP
    const worker = await Worker.findOne({ phone }).select(WORKER_LIGHT);

    // LOGIN: unregistered number -> don't send OTP, let the client redirect to signup
    if (type === 'login' && !worker) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. Please register first.',
        requiresRegistration: true
      });
    }

    // REGISTER: reject duplicates up front so no OTP is sent for a doomed signup
    if (type === 'register') {
      if (worker) {
        return res.status(409).json({
          success: false,
          message: 'Worker already exists with this phone number. Please login.',
          requiresLogin: true
        });
      }
      if (email && await Worker.exists({ email: String(email).trim().toLowerCase() })) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered with another account. Please use a different email.'
        });
      }
    }

    if (worker) {
      if (!worker.isActive) {
        return res.status(403).json({ success: false, message: 'Account deactivated.' });
      }
      if (worker.approvalStatus === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval.',
          pendingApproval: true
        });
      }
      if (worker.approvalStatus === 'rejected') {
        return res.status(403).json({ success: false, message: 'Your registration was rejected by the admin.' });
      }
      if (worker.approvalStatus === 'suspended') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }
    }

    // 1. Rate limit check
    const allowed = await checkRateLimit(phone);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after 10 minutes.'
      });
    }

    // 2. Generate OTP
    const otp = generateOTP(phone);
    const otpHash = hashOTP(otp);

    // 3. Store OTP (Redis primary, MongoDB fallback)
    await storeOTP(phone, otpHash);

    // 4. Send OTP via SMS
    const smsResult = isDefaultOtpMode() ? { success: true } : await sendSMSOTP(phone, otp);

    // Never log real OTPs (server logs are readable by hosting staff / log tools).
    if (isDefaultOtpMode()) {
      console.log(`[DEV] Worker OTP for ${phone}: default OTP mode`);
    }

    if (!smsResult.success) {
      console.warn(`[OTP] SMS failed for worker ${phone}, but OTP stored`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      token: 'verification-pending'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

/**
 * Verify OTP and Check Worker Status (Unified Login/Signup Entry)
 */
const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // 1. Verify OTP
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // 2. Check if worker exists
    const worker = await Worker.findOne({ phone }).select(WORKER_LIGHT);

    if (worker) {
      // EXISTING WORKER
      if (!worker.isActive) {
        return res.status(403).json({ success: false, message: 'Account deactivated.' });
      }

      if (worker.approvalStatus === 'pending') {
        return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
      }
      if (worker.approvalStatus === 'rejected') {
        return res.status(403).json({ success: false, message: 'Your registration was rejected by the admin.' });
      }
      if (worker.approvalStatus === 'suspended') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }

      // SINGLE DEVICE LOGIN: Update Session ID & Clear OLD FCM tokens
      const loginSessionId = Date.now().toString();
      await Worker.findByIdAndUpdate(worker._id, {
        loginSessionId,
        $set: { fcmTokens: [], fcmTokenMobile: [] } // Clear all old tokens
      });

      const tokens = generateTokenPair({
        userId: worker._id,
        role: USER_ROLES.WORKER,
        loginSessionId
      });

      return res.status(200).json({
        success: true,
        isNewUser: false,
        message: 'Login successful',
        worker: {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          phone: worker.phone,
          status: worker.status,
          approvalStatus: worker.approvalStatus,
          offlineVerificationStatus: worker.offlineVerification?.status || null,
          serviceCategories: worker.serviceCategories || [],
          aadhar: worker.aadhar || null
        },
        ...tokens
      });

    } else {
      // NEW WORKER
      const verificationToken = generateVerificationToken(phone);

      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'OTP verified. Please complete registration.',
        verificationToken
      });
    }

  } catch (error) {
    console.error('Verify Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

/**
 * Register worker with Verification Token
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // verificationToken handling
    const {
      name, email, verificationToken,
      aadharNumber, aadharDocument, aadharBackDocument,
      panCardNumber, panCardDocument,
      drivingLicenseNumber, drivingLicenseDocument
    } = req.body;
    let phone = req.body.phone;

    let verifiedPhone = null;
    if (verificationToken) {
      verifiedPhone = verifyVerificationToken(verificationToken);
      if (!verifiedPhone) return res.status(400).json({ success: false, message: 'Invalid verification session.' });
      phone = verifiedPhone;
    } else if (!req.body.otp) {
      return res.status(400).json({ success: false, message: 'Verification required.' });
    }

    // Check existing BEFORE consuming the OTP, so a duplicate phone/email
    // doesn't burn the OTP and turn every retry into "Invalid or expired OTP".
    const existingWorker = await Worker.findOne({ $or: [{ phone }, { email }] }).select('phone email');
    if (existingWorker) {
      const phoneTaken = existingWorker.phone === phone;
      return res.status(400).json({
        success: false,
        message: phoneTaken
          ? 'Worker already exists with this phone number. Please login.'
          : 'This email is already registered with another account. Please use a different email.'
      });
    }

    if (!verifiedPhone) {
      // Fallback OTP
      const ver = await verifyOTP(phone, req.body.otp);
      if (!ver.success) return res.status(400).json({ success: false, message: ver.message });
    }

    // Process Referral Code
    let referredById = null;
    if (req.body.referralCode) {
      const referrer = await Worker.findOne({ referralCode: String(req.body.referralCode).trim().toUpperCase() });
      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code.'
        });
      }
      referredById = referrer._id;
    }

    // Generate unique referral code for this new worker
    const namePrefix = name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'W');
    const newReferralCode = `GRH-${namePrefix}${Math.floor(1000 + Math.random() * 9000)}`;

    // Upload Aadhar
    let aadharUrl = aadharDocument || null;
    let aadharBackUrl = aadharBackDocument || null;

    if (aadharUrl && aadharUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(aadharUrl, { folder: 'workers/documents' });
      if (uploadRes.success) aadharUrl = uploadRes.url;
    }

    if (aadharBackUrl && aadharBackUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(aadharBackUrl, { folder: 'workers/documents' });
      if (uploadRes.success) aadharBackUrl = uploadRes.url;
    }

    // Upload PAN Card
    let panCardUrl = panCardDocument || null;
    if (panCardUrl && panCardUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(panCardUrl, { folder: 'workers/documents' });
      if (uploadRes.success) panCardUrl = uploadRes.url;
    }

    // Upload Driving License
    let dlUrl = drivingLicenseDocument || null;
    if (dlUrl && dlUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(dlUrl, { folder: 'workers/documents' });
      if (uploadRes.success) dlUrl = uploadRes.url;
    }

    // Professions picked on the signup form (admin can change them later).
    const professionIds = await validProfessionIds(req.body.professionIds);
    if (!professionIds.length && await Profession.exists({ isActive: true })) {
      return res.status(400).json({ success: false, message: 'Please select your profession.' });
    }

    // Validate Driving License format if provided
    let cleanDl = null;
    if (drivingLicenseNumber && String(drivingLicenseNumber).trim()) {
      cleanDl = String(drivingLicenseNumber).replace(/[\s-]/g, '').toUpperCase();
      const dlPattern = /^[A-Z]{2}[0-9]{2}(19|20)\d{2}\d{7,8}$/;
      if (!dlPattern.test(cleanDl)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Driving License format. Example: MH0420110062821 or MH-04-2011-0062821'
        });
      }
    }

    // Create worker
    const worker = await Worker.create({
      name, email, phone,
      professionIds,
      isPhoneVerified: true,
      aadhar: {
        number: req.body.aadhar || aadharNumber,
        document: aadharUrl,
        backDocument: aadharBackUrl
      },
      panCard: {
        number: panCardNumber,
        document: panCardUrl
      },
      drivingLicense: {
        number: drivingLicenseNumber,
        document: dlUrl
      },
      referralCode: newReferralCode,
      referredBy: referredById,
      status: WORKER_STATUS.OFFLINE,
      approvalStatus: 'pending'
    });

    if (referredById) {
      await createNotification({
        workerId: referredById,
        type: 'referral_signup',
        title: 'New Expert Referral',
        message: `${worker.name} registered using your referral code. We will notify you when the referral bonus is credited.`,
        relatedId: worker._id,
        relatedType: 'referral',
        priority: 'high',
        pushData: { type: 'referral_signup', referralWorkerId: worker._id.toString(), link: '/worker/referrals' }
      }).catch((error) => console.error('Worker referral notification failed:', error));
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending admin approval. We will notify you once approved.',
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        status: worker.status,
        approvalStatus: worker.approvalStatus,
        aadhar: worker.aadhar || null
      }
    });
  } catch (error) {
    console.error('Worker registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Login worker with OTP
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, otp } = req.body;

    // Verify OTP
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Find worker
    const worker = await Worker.findOne({ phone }).select(WORKER_LIGHT);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found. Please register first.'
      });
    }

    if (!worker.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }

    if (worker.approvalStatus === 'pending') {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }
    if (worker.approvalStatus === 'rejected') {
      return res.status(403).json({ success: false, message: 'Your registration was rejected by the admin.' });
    }
    if (worker.approvalStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    const loginSessionId = Date.now().toString();
    await Worker.findByIdAndUpdate(worker._id, {
      loginSessionId,
      $set: { fcmTokens: [], fcmTokenMobile: [] } // Clear all old tokens
    });

    const tokens = generateTokenPair({
      userId: worker._id,
      role: USER_ROLES.WORKER,
      loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        status: worker.status,
        approvalStatus: worker.approvalStatus,
        offlineVerificationStatus: worker.offlineVerification?.status || null,
        serviceCategories: worker.serviceCategories || [],
        aadhar: worker.aadhar || null
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * Logout worker
 */
const logout = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;

    // Clear FCM tokens based on platform and reset Session ID
    if (req.user && req.user.id) {
      const updateQuery = platform === 'mobile'
        ? { $set: { fcmTokenMobile: [], loginSessionId: null } }
        : { $set: { fcmTokens: [], loginSessionId: null } };

      await Worker.findByIdAndUpdate(req.user.id, updateQuery);
      console.log(`[AUTH] ✅ ${platform} session & tokens cleared for worker: ${req.user.id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Refresh Access Token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if worker exists
    const worker = await Worker.findById(decoded.userId).select(WORKER_LIGHT);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Check status
    if (!worker.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Verify Session ID
    if (decoded.loginSessionId !== worker.loginSessionId) {
      return res.status(401).json({ success: false, message: 'LoggedIn on another device.' });
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: worker._id,
      role: USER_ROLES.WORKER,
      loginSessionId: worker.loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

export {
  sendOTP,
  verifyLogin,
  register,
  login,
  logout,
  refreshToken
};

// @desc    Check a referral code (public) so the signup form can flag a wrong one
//          before any OTP is sent.
// @route   GET /api/workers/auth/validate-referral/:code
export const validateReferralCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, valid: false, message: 'Referral code is required.' });

    const referrer = await Worker.findOne({ referralCode: code }).select('name').lean();
    if (!referrer) return res.json({ success: true, valid: false, message: 'Invalid referral code.' });

    res.json({ success: true, valid: true, referrerName: referrer.name || '' });
  } catch (error) {
    console.error('Validate referral error:', error);
    res.status(500).json({ success: false, valid: false, message: 'Could not verify referral code.' });
  }
};
