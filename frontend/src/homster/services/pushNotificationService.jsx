/**
 * Push Notification Service
 * Handles FCM token registration and notification handling
 */

import { messaging, getToken, onMessage } from '../firebase';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiBriefcase, FiDollarSign, FiBell, FiAlertTriangle } from 'react-icons/fi';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Picks an icon + color scheme for the foreground toast based on
 * notification type — replaces relying on an external logo image (which
 * could fail to load or just look flat/generic) with a crisp, always-
 * rendering icon that also signals what kind of update this is at a
 * glance.
 */
const getToastVisuals = (type = '') => {
  const t = (type || '').toLowerCase();
  if (t.includes('emergency')) {
    return { Icon: FiAlertTriangle, gradient: 'from-red-500 to-red-700', accent: 'border-red-600', badge: 'text-red-600 bg-red-50 border-red-100' };
  }
  if (t.includes('job')) {
    return { Icon: FiBriefcase, gradient: 'from-blue-500 to-indigo-600', accent: 'border-blue-500', badge: 'text-blue-600 bg-blue-50 border-blue-100' };
  }
  if (t.includes('payment') || t.includes('wallet') || t.includes('withdraw') || t.includes('commission')) {
    return { Icon: FiDollarSign, gradient: 'from-emerald-500 to-teal-600', accent: 'border-emerald-500', badge: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  }
  if (t.includes('booking')) {
    return { Icon: FiCheckCircle, gradient: 'from-orange-400 to-red-500', accent: 'border-orange-500', badge: 'text-orange-600 bg-orange-50 border-orange-100' };
  }
  return { Icon: FiBell, gradient: 'from-gray-400 to-gray-600', accent: 'border-gray-400', badge: 'text-gray-600 bg-gray-50 border-gray-100' };
};

/**
 * Check if running inside Flutter WebView
 * @returns {boolean}
 */
function isFlutterWebView() {
  return !!(window.flutter_inappwebview && window.flutter_inappwebview.callHandler);
}

/**
 * Get the current platform type
 * @returns {'web' | 'mobile'}
 */
function getPlatformType() {
  return isFlutterWebView() ? 'mobile' : 'web';
}

/**
 * Register service worker for push notifications
 * @returns {Promise<ServiceWorkerRegistration>}
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('✅ Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Service Workers are not supported in this browser');
  }
}

/**
 * Request notification permission from user
 * @returns {Promise<boolean>}
 */
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  }
  console.log('❌ Notifications not supported');
  return false;
}

/**
 * Get FCM token from Firebase
 * @returns {Promise<string|null>}
 */
async function getFCMToken() {
  try {
    if (!messaging) {
      return null;
    }

    const registration = await registerServiceWorker();
    await registration.update(); // Update service worker

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      return token;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Register FCM token with backend
 * @param {string} userType - 'user', 'worker', or 'admin'
 * @param {boolean} forceUpdate - Force token update
 * @returns {Promise<string|null>}
 */
async function registerFCMToken(userType = 'user', forceUpdate = false) {
  try {
    const platform = getPlatformType();
    const storageKey = `fcm_token_${userType}_${platform}`;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return null;
    }

    const token = await getFCMToken();
    if (!token) {
      return null;
    }

    let endpoint;
    let authTokenKey;
    let method = 'POST';
    switch (userType) {
      case 'worker':
        endpoint = '/workers/fcm-tokens/save';
        authTokenKey = 'workerAccessToken';
        break;
      case 'admin':
        endpoint = '/admin/fcm-token';
        authTokenKey = 'adminToken';
        method = 'PUT';
        break;
      case 'user':
        endpoint = '/users/fcm-token';
        authTokenKey = null; // User uses cookies
        method = 'PUT';
        break;
      default:
        endpoint = '/users/fcm-token';
        authTokenKey = null;
        method = 'PUT';
    }

    let headers = {
      'Content-Type': 'application/json'
    };

    if (authTokenKey) {
      const authToken = localStorage.getItem(authTokenKey);
      if (!authToken) {
        console.warn(`[FCM] No auth token found for ${userType}. Cannot save FCM token.`);
        return null;
      }
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    console.log(`[FCM] Saving to backend: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: method,
      headers: headers,
      credentials: 'include', // Important for user cookies
      body: JSON.stringify({
        token: token,
        fcmToken: token, // User API expects fcmToken instead of token
        platform: platform // Use actual platform (web/mobile) instead of hardcoding 'web'
      })
    });

    const responseData = await response.json().catch(() => ({}));

    if (response.ok) {
      localStorage.setItem(storageKey, token);
      console.log('[FCM] ✅ FCM token registered with backend successfully!');
      return token;
    } else {
      console.error('[FCM] ❌ Failed to register token with backend:', responseData);
      return null;
    }
  } catch (error) {
    console.error('[FCM] ❌ CRITICAL ERROR during registration:', error);
    return null;
  }
}

/**
 * Remove FCM token from backend
 * @param {string} userType - 'user', 'worker', or 'admin'
 */
async function removeFCMToken(userType = 'user') {
  try {
    const platform = getPlatformType();
    const storageKey = `fcm_token_${userType}_${platform}`;
    const tokenToRemove = localStorage.getItem(storageKey);

    if (!tokenToRemove) {
      return;
    }

    let endpoint;
    let authTokenKey;
    switch (userType) {
      case 'worker':
        endpoint = '/workers/fcm-tokens/remove';
        authTokenKey = 'workerAccessToken';
        break;
      case 'admin':
        endpoint = '/admin/fcm-token';
        authTokenKey = 'adminToken';
        break;
      default:
        endpoint = '/fcm-tokens/remove';
        authTokenKey = 'accessToken';
    }

    const authToken = localStorage.getItem(authTokenKey);
    if (authToken) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      await fetch(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token: tokenToRemove,
          platform: platform
        })
      });
      console.log(`[FCM] ✅ Token removed from backend`);
    }

    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('[FCM] Error removing FCM token:', error);
    const platform = getPlatformType();
    const storageKey = `fcm_token_${userType}_${platform}`;
    localStorage.removeItem(storageKey);
  }
}

const shownNotifications = new Set();
let foregroundListenerRegistered = false;

/**
 * Setup foreground notification handler
 * @param {Function} handler - Custom handler function
 */
function setupForegroundNotificationHandler(handler) {
  console.log('[FCM] 🛠 Setting up foreground notification handler...');
  
  if (!messaging) {
    console.warn('[FCM] ⚠️ Messaging not initialized. Foreground notifications will not work.');
    return;
  }

  if (window._isForegroundListenerRegistered) {
    console.log('[FCM] ℹ️ Foreground listener already registered.');
    return;
  }
  window._isForegroundListenerRegistered = true;

  console.log('[FCM] ✅ Registering onMessage listener...');
  
  const unsubscribe = onMessage(messaging, async (payload) => {
    console.log('📬 [FCM] Foreground message received:', payload);
    const notification = payload.notification || {};
    const data = payload.data || {};
    const title = notification.title || data.title || 'New Notification';
    const body = notification.body || data.body || '';
    const notificationId = data.notificationId;
    const type = data.type || 'default';

    if (notificationId && notificationId !== 'test-notification' && shownNotifications.has(notificationId)) {
      console.log('[FCM] 🚫 Deduplicated foreground message:', notificationId);
      return;
    }
    
    if (notificationId) {
      shownNotifications.add(notificationId);
      setTimeout(() => shownNotifications.delete(notificationId), 60000);
    }

    // 1. Play Sound based on type
    try {
      const { playNotificationSound, playAlertRing } = await import('../utils/notificationSound');
      if (['new_booking', 'job_assigned', 'test'].includes(type)) {
        console.log('[FCM] 🔊 Playing alert ring...');
        playAlertRing(false); 
      } else {
        console.log('[FCM] 🔊 Playing notification sound...');
        playNotificationSound();
      }
    } catch (soundErr) {
      console.error('[FCM] ❌ Failed to play notification sound:', soundErr);
    }

    let notificationShown = false;

    // We removed the System Notification trigger here because onMessage ONLY runs 
    // when the app is in the foreground. We already show a beautiful custom toast below,
    // so triggering a system notification here caused duplicates (1 toast + 1 system notification).

    // 3. ALWAYS Show Internal Alert in Foreground (Premium Toast)
    try {
      console.log('[FCM] 🎨 Rendering custom toast...');
      const isEmergency = type.includes('emergency');
      const visuals = getToastVisuals(type);
      const ToastIcon = visuals.Icon;
      toast.custom((t) => (
        <div
          className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-[0_10px_40px_-8px_rgba(0,0,0,0.25)] rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden cursor-pointer border-l-4 ${visuals.accent}`}
          onClick={() => {
            toast.dismiss(t.id);
            if (data.link) window.location.href = data.link;
          }}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start gap-3">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 bg-gradient-to-br ${visuals.gradient} ${isEmergency ? 'animate-pulse' : ''}`}>
                <ToastIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-snug">{title}</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed line-clamp-2">{body}</p>
                <div className="mt-2 flex items-center gap-2">
                   <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${visuals.badge}`}>
                     {type.replace(/_/g, ' ')}
                   </span>
                   <span className="text-[9px] text-gray-400 font-semibold">Just now</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="shrink-0 self-stretch w-11 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none border-l border-gray-100"
          >
            <span className="text-base leading-none">✕</span>
          </button>
        </div>
      ), {
        // Fixed id — multiple FCM messages arriving close together (e.g. a
        // booking firing several distinct notifications) previously each
        // spawned their own toast with no id, so they all stacked up the
        // screen at once. A shared id makes react-hot-toast replace the
        // current toast in place instead, so only the latest is ever shown.
        id: 'fcm-foreground-toast',
        duration: isEmergency ? 15000 : 8000,
        position: 'top-right'
      });
    } catch (toastErr) {
      console.error('[FCM] ❌ Toast fallback failed:', toastErr);
    }

    // 4. Fallback Native Notification removed.
    // The in-app toast is guaranteed to render, so we don't need a native 
    // fallback which would cause a duplicate UI pop-up.

    // 5. Dispatch global event for components to react
    window.dispatchEvent(new CustomEvent('appNotificationReceived', { 
      detail: { ...payload, title, body, type } 
    }));

    if (handler) {
      handler(payload);
    }
  });

  return unsubscribe;
}

/**
 * Initialize push notifications
 */
let swMessageListenerRegistered = false;

async function initializePushNotifications() {
  try {
    console.log('[FCM] 🚀 Initializing push notifications...');
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      console.warn('[FCM] ⚠️ Browser does not support service workers or notifications');
      return;
    }
    await registerServiceWorker();

    // Prevent double registration of SW message listener
    if (swMessageListenerRegistered) {
      console.log('[FCM] ℹ️ SW message listener already registered.');
      return;
    }
    swMessageListenerRegistered = true;

    // ✅ PRIMARY: Listen for messages relayed from Service Worker
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type, payload } = event.data || {};
      
      if (type !== 'FCM_FOREGROUND_MESSAGE') return;
      
      console.log('[FCM] ✅ SW relayed foreground message:', payload);
      
      const title = payload.title || 'New Notification';
      const body = payload.body || '';
      const notifType = payload.type || 'default';

      // 1. Play sound
      try {
        const { playNotificationSound, playAlertRing } = await import('../utils/notificationSound');
        if (['new_booking', 'job_assigned', 'test'].includes(notifType)) {
          playAlertRing(false);
        } else {
          playNotificationSound();
        }
      } catch (e) {
        console.warn('[FCM] Sound error:', e);
      }

      // 2. Show premium toast
      try {
        const { toast } = await import('react-hot-toast');
        const isEmergency = notifType.includes('emergency');
        const visuals = getToastVisuals(notifType);
        const ToastIcon = visuals.Icon;
        toast.custom((t) => (
          <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-[0_10px_40px_-8px_rgba(0,0,0,0.25)] rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden cursor-pointer border-l-4 ${visuals.accent}`}
            onClick={() => {
              toast.dismiss(t.id);
              if (payload.link) window.location.href = payload.link;
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start gap-3">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 bg-gradient-to-br ${visuals.gradient} ${isEmergency ? 'animate-pulse' : ''}`}>
                  <ToastIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-snug">{title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed line-clamp-2">{body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${visuals.badge}`}>
                      {notifType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] text-gray-400 font-semibold">Just now</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
              className="shrink-0 self-stretch w-11 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none border-l border-gray-100"
            >
              <span className="text-base leading-none">✕</span>
            </button>
          </div>
        ), {
          // Same fixed id as the other foreground-toast path — several
          // notifications firing close together for one event previously
          // stacked up because the id here varied per call (Date.now()
          // fallback). A shared id replaces the current toast instead.
          id: 'fcm-foreground-toast',
          duration: isEmergency ? 15000 : 8000,
          position: 'top-right'
        });
      } catch (toastErr) {
        console.error('[FCM] Toast error:', toastErr);
      }

      // 3. Dispatch global event for Dashboard modal etc.
      window.dispatchEvent(new CustomEvent('appNotificationReceived', {
        detail: {
          data: payload,
          title,
          body,
          type: notifType
        }
      }));
    });

    console.log('[FCM] ✅ SW message listener registered.');
    
    // Debug utility
    window.fcmDebug = async () => {
      console.log('--- FCM Debug Info ---');
      console.log('Permission:', Notification.permission);
      console.log('Messaging Object:', !!messaging);
      const reg = await navigator.serviceWorker.getRegistration();
      console.log('SW Registration Status:', !!reg);
      if (reg) console.log('SW Scope:', reg.scope);
      try {
        const token = await getFCMToken();
        console.log('FCM Token:', token);
        return { permission: Notification.permission, hasMessaging: !!messaging, hasSW: !!reg, token };
      } catch (e) {
        console.error('Token retrieval failed:', e);
        return { permission: Notification.permission, hasMessaging: !!messaging, hasSW: !!reg, error: e.message };
      }
    };

    // Manual UI test
    window.testLocalFCMUI = async () => {
      console.log('[FCM Debug] Triggering local UI test...');
      // Simulate SW postMessage
      const fakeEvent = new MessageEvent('message', {
        data: {
          type: 'FCM_FOREGROUND_MESSAGE',
          payload: {
            title: '🔔 Test Notification',
            body: 'This is a simulated foreground notification. Working correctly!',
            type: 'test',
            notificationId: `test-${Date.now()}`,
            link: '/worker/dashboard'
          }
        }
      });
      navigator.serviceWorker.dispatchEvent(fakeEvent);
    };

  } catch (error) {
    console.error('[FCM] ❌ Error initializing push notifications:', error);
  }
}

export {
  initializePushNotifications,
  registerFCMToken,
  removeFCMToken,
  setupForegroundNotificationHandler,
  requestNotificationPermission,
  getFCMToken
};
