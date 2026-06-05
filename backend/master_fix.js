import fs from 'fs';

// ─── 1. FULLY REWRITE hsBookingController.js imports (top section only) ───────
const hsBkCtrl = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\hsBookingController.js';
let hsBk = fs.readFileSync(hsBkCtrl, 'utf-8');

// Remove every existing import line at the top
const importLineRegex = /^import\s+.*\n/gm;
const newImports = `import mongoose from 'mongoose';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import UserService from '../models/UserService.js';
import Category from '../models/Category.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import BookingRequest from '../models/HomeServiceBookingRequest.js';
import VendorBill from '../models/VendorBill.js';
import Plan from '../models/Plan.js';
import Settings from '../models/Settings.js';
import Transaction from '../models/Transaction.js';
import { validationResult } from 'express-validator';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { createNotification } from './notificationControllers/notificationController.js';
import { sendNotificationToUser, sendNotificationToWorker } from '../services/firebaseAdmin.js';
import { findNearbyWorkers, geocodeAddress } from '../services/locationService.js';
import { getIO } from '../sockets.js';
import { sendBookingEmails } from '../services/emailService.js';

`;

// Find the first non-import line (const or export or /*)
const firstNonImport = hsBk.search(/^(\/\*\*|const |export |async )/m);
const bodyPart = firstNonImport > -1 ? hsBk.slice(firstNonImport) : hsBk;

// Also strip any remaining inline import statements in body (those should have been removed)
const cleanBody = bodyPart.replace(/^\s*import\s+.*from\s+['"].*['"];?\n/gm, '');

fs.writeFileSync(hsBkCtrl, newImports + cleanBody);
console.log('✓ Fixed hsBookingController.js imports');

// ─── 2. FIX reelController.js ────────────────────────────────────────────────
const reelPath = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\reelController.js';
let reel = fs.readFileSync(reelPath, 'utf-8');

// Remove all existing import lines and rewrite clean
const reelBody = reel.replace(/^import\s+.*\n/gm, '').replace(/^const MAX_REEL.*\n/gm, '');
const reelImports = `import Reel from '../models/Reel.js';
import ReelLike from '../models/ReelLike.js';
import ReelComment from '../models/ReelComment.js';
import ReelCommentLike from '../models/ReelCommentLike.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import fs from 'fs';
import { uploadVideoToCloudinary, getVideoThumbnailUrl, deleteVideoFromCloudinary } from '../utils/cloudinary.js';

const MAX_REEL_DURATION_SEC = 30;
const MAX_CAPTION_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;

`;
fs.writeFileSync(reelPath, reelImports + reelBody.trimStart());
console.log('✓ Fixed reelController.js imports');

// ─── 3. FIX worker-routes - all files ────────────────────────────────────────
const workerRoutesDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\routes\\worker-routes';
fs.readdirSync(workerRoutesDir).forEach(file => {
  if (!file.endsWith('.js')) return;
  const fp = workerRoutesDir + '\\' + file;
  let c = fs.readFileSync(fp, 'utf-8');

  // Fix middleware paths
  c = c.replace(/from '\.\.\/middleware\//g, "from '../../middlewares/");
  c = c.replace(/from '\.\.\/middlewares\/roleMiddleware\.js'/g, "from '../../middlewares/authMiddleware.js'");
  
  // Fix model paths - from worker-routes, models are ../../models/
  c = c.replace(/from '\.\.\/\.\.\/\.\.\/models\//g, "from '../../models/");
  c = c.replace(/from '\.\/models\//g, "from '../../models/");
  
  // Fix services paths
  c = c.replace(/from '\.\.\/\.\.\/\.\.\/services\//g, "from '../../services/");
  c = c.replace(/from '\.\/services\//g, "from '../../services/");
  
  // Fix controllers paths  
  c = c.replace(/from '\.\.\/\.\.\/controllers\/bookingControllers\//g, "from '../../controllers/workerControllers/");
  c = c.replace(/from '\.\.\/controllers\/workerControllers\//g, "from '../../controllers/workerControllers/");

  fs.writeFileSync(fp, c);
});
console.log('✓ Fixed worker-routes paths');

// ─── 4. FIX fcmToken.routes.js specifically ───────────────────────────────────
const fcmPath = workerRoutesDir + '\\fcmToken.routes.js';
let fcm = fs.readFileSync(fcmPath, 'utf-8');
fcm = fcm.replace(/import Vendor from.*\n/g, '');
fs.writeFileSync(fcmPath, fcm);
console.log('✓ Removed Vendor from fcmToken.routes.js');

// ─── 5. FIX workerControllers - fix relative paths ────────────────────────────
const workerCtrlDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\workerControllers';
fs.readdirSync(workerCtrlDir).forEach(file => {
  if (!file.endsWith('.js')) return;
  const fp = workerCtrlDir + '\\' + file;
  let c = fs.readFileSync(fp, 'utf-8');
  
  // From workerControllers, go up to backend root:
  // ../../models, ../../services, ../../utils, ../../sockets
  c = c.replace(/from '\.\/models\//g, "from '../../models/");
  c = c.replace(/from '\.\/services\//g, "from '../../services/");
  c = c.replace(/from '\.\/utils\//g, "from '../../utils/");
  c = c.replace(/from '\.\/sockets\.js'/g, "from '../../sockets.js'");
  c = c.replace(/import Vendor from.*\n/g, '');
  c = c.replace(/import VendorBill from.*\n/g, '');
  
  fs.writeFileSync(fp, c);
});
console.log('✓ Fixed workerControllers paths');

// ─── 6. Install express-validator in correct place ─────────────────────────────
console.log('\nAll fixes applied! Now run: npm install express-validator');
console.log('Then restart: npm run dev');
