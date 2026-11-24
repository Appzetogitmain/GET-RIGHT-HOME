import express from 'express';
import { 
  sendOtp, 
  sendEnquiryOtp,
  verifyOtp, 
  verifyPartnerOtp, 
  adminLogin, 
  getMe, 
  updateProfile, 
  updateAdminProfile, 
  registerPartner, 
  updateFcmToken, 
  uploadDocs, 
  deleteDoc, 
  uploadDocsBase64,
  lazyEnquiryLoginRegister,
  lazyListingLoginRegister,
  logout,
  deleteAccount
} from '../controllers/authController.js';
import { managerLogin, getManagerProfile } from '../controllers/managerController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadDocuments } from '../utils/multer.js';
import { otpSendLimiter, otpVerifyLimiter, passwordLoginLimiter, rateLimit } from '../middlewares/security.js';

const router = express.Router();

// Public uploads used during partner sign-up: cap volume per IP to stop
// anonymous abuse of the Cloudinary account.
const publicUploadLimiter = rateLimit({ name: 'partner-docs', windowMs: 60 * 60_000, max: 30, message: 'Too many uploads. Please try again later.' });

router.post('/send-otp', otpSendLimiter, sendOtp);
router.post('/enquiry-otp', otpSendLimiter, sendEnquiryOtp);
router.post('/verify-otp', otpVerifyLimiter, verifyOtp);
router.post('/partner/register', publicUploadLimiter, registerPartner);
router.post('/partner/verify-otp', otpVerifyLimiter, verifyPartnerOtp);
router.post('/lazy-enquiry-login', otpVerifyLimiter, lazyEnquiryLoginRegister);
router.post('/lazy-listing-login', otpVerifyLimiter, lazyListingLoginRegister);
router.post('/logout', logout);
router.delete('/delete-account', protect, deleteAccount);

// Upload routes for partner registration
router.post('/partner/upload-docs', publicUploadLimiter, uploadDocuments.array('files', 5), uploadDocs);
router.post('/partner/upload-docs-base64', publicUploadLimiter, uploadDocsBase64); // Flutter camera upload
router.post('/partner/delete-doc', publicUploadLimiter, deleteDoc);

router.post('/admin/login', passwordLoginLimiter, adminLogin);
router.post('/manager/login', passwordLoginLimiter, managerLogin);
router.get('/manager/me', protect, getManagerProfile);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/admin/update-profile', protect, updateAdminProfile);
router.put('/update-fcm', protect, updateFcmToken); // New Route

export default router;
