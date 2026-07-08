/* eslint-env serviceworker, webworker */
/* global firebase, importScripts */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Standard Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDGlnu2FIZJFr3xydLfxmuPxg9Qt3xsQ64",
  authDomain: "get-right-home.firebaseapp.com",
  projectId: "get-right-home",
  storageBucket: "get-right-home.firebasestorage.app",
  messagingSenderId: "792383548755",
  appId: "1:792383548755:web:b5eeca20677221964305a6",
  measurementId: "G-4GGTSXJW36"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const shownNotifications = new Set();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const id = payload.data?.notificationId;
  
  // Deduplicate
  if (id && shownNotifications.has(id)) {
    console.log('[firebase-messaging-sw.js] Duplicate notification blocked', id);
    return;
  }
  
  if (id) shownNotifications.add(id);

  // Auto clean up set to avoid memory leak
  if (shownNotifications.size > 100) {
    const iterator = shownNotifications.values();
    shownNotifications.delete(iterator.next().value);
  }

  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/icon-192x192.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const clickUrl = event.notification.data?.link || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(clickUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickUrl);
      }
    })
  );
});
