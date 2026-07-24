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
  logout
} from '../controllers/authController.js';
import { managerLogin, getManagerProfile } from '../controllers/managerController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadDocuments } from '../utils/multer.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/enquiry-otp', sendEnquiryOtp);
router.post('/verify-otp', verifyOtp);
router.post('/partner/register', registerPartner);
router.post('/partner/verify-otp', verifyPartnerOtp);
router.post('/lazy-enquiry-login', lazyEnquiryLoginRegister);
router.post('/lazy-listing-login', lazyListingLoginRegister);
router.post('/logout', logout);

// Upload routes for partner registration
router.post('/partner/upload-docs', uploadDocuments.array('files', 5), uploadDocs);
router.post('/partner/upload-docs-base64', uploadDocsBase64); // Flutter camera upload
router.post('/partner/delete-doc', deleteDoc);

router.post('/admin/login', adminLogin);
router.post('/manager/login', managerLogin);
router.get('/manager/me', protect, getManagerProfile);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/admin/update-profile', protect, updateAdminProfile);
router.put('/update-fcm', protect, updateFcmToken); // New Route

export default router;
