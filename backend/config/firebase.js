import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseAdmin = null;

export const initializeFirebase = () => {
  try {
    let serviceAccount;

    // 1. Check for minified JSON in FIREBASE_CONFIG environment variable
    if (process.env.FIREBASE_CONFIG) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
      } catch (err) {
        throw new Error('Failed to parse FIREBASE_CONFIG from environment variables.');
      }
    } else {
      // 2. Fallback to file path
      let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
        ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : path.join(__dirname, '../serviceAccountKey.json');

      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Service account file not found at ${serviceAccountPath}`);
      }

      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✓ Firebase Admin initialized successfully');
    } else {
      firebaseAdmin = admin.app();
    }

    return firebaseAdmin;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    // Don't throw error, allow server to continue without Firebase
    return null;
  }
};

// Get Firebase Admin instance
export const getFirebaseAdmin = () => {
  if (!firebaseAdmin) {
    initializeFirebase();
  }
  return firebaseAdmin;
};

export { admin };
