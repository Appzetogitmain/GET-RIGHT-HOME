import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { playNotificationSound, isSoundEnabled, playAlertRing } from '../utils/notificationSound';
import { registerFCMToken, setupForegroundNotificationHandler } from '../services/pushNotificationService';

const SwipeableNotification = ({ t, data, onClick }) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, opacity }}
      onDragEnd={(e, { offset, velocity }) => {
        const swipe = Math.abs(offset.x) * velocity.x;
        if (Math.abs(offset.x) > 80) { // Threshold
          toast.dismiss(t.id);
        }
      }}
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{
        opacity: t.visible ? 1 : 0,
        y: t.visible ? 0 : -20,
        scale: t.visible ? 1 : 0.95
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      whileTap={{ scale: 0.98 }}
      className="max-w-md w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-gray-900/5 cursor-pointer dark:bg-gray-800 dark:ring-gray-700"
      onClick={onClick}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <span className="text-lg">🔔</span>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {data.title}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {data.message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200 dark:border-gray-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Determine user type based on path
  const getUserType = (path) => {
    if (path.startsWith('/vendor')) return 'vendor';
    if (path.startsWith('/worker')) return 'worker';
    if (path.startsWith('/admin')) return 'admin';
    return 'user';
  };

  const userType = getUserType(location.pathname);

  useEffect(() => {
    if (!userType) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    let tokenKey = 'accessToken';
    switch (userType) {
      case 'vendor':
        tokenKey = 'vendorAccessToken';
        break;
      case 'worker':
        tokenKey = 'workerAccessToken';
        break;
      case 'admin':
        tokenKey = 'adminAccessToken';
        break;
      case 'user':
      default:
        tokenKey = 'accessToken';
        break;
    }

    const token = localStorage.getItem(tokenKey);
    const hasUserAuth = userType === 'user' && (localStorage.getItem('user') || localStorage.getItem('userData'));
    
    // If no token and no user auth, we don't connect
    if (!token && !hasUserAuth) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Reuse existing socket if userType hasn't changed (effectively) is handled by React deps
    // But basic useEffect will re-run if dependencies change.
    // userType changes -> re-run.

    // Disconnect previous if any
    if (socket) {
      // Optimization: if we are already connected with same token/auth, maybe don't reconnect?
      // But determining that is hard. Simpler to reconnect.
      socket.disconnect();
    }

    // Use HTTP URL for socket.io client - it handles WS upgrade automatically
    let socketBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '');
    
    // If VITE_API_BASE_URL was accidentally baked in as localhost during a production build, override it
    if (socketBaseUrl && socketBaseUrl.includes('localhost') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      socketBaseUrl = window.location.origin;
    } else if (!socketBaseUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        socketBaseUrl = 'http://localhost:5000';
      } else {
        socketBaseUrl = window.location.origin;
      }
    }

    const newSocket = io(socketBaseUrl, {
      auth: {
        token: token || ''
      },
      transports: ['polling', 'websocket'], // Try polling first for reliability
      path: '/socket.io/',
      secure: true,
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`✅ [Socket] ${userType?.toUpperCase()} connected → socket.id: ${newSocket.id}`);
      
      // Register FCM token for push notifications (on page load/refresh)
      if (userType && (token || hasUserAuth)) {
        // Setup foreground notification listener
        setupForegroundNotificationHandler((payload) => {
          // Play sound and show notification (handled internally by the service)
        });

        registerFCMToken(userType, true).then((fcmToken) => {
          if (fcmToken) {
            console.log(`[Socket] ✅ FCM token registered for ${userType}`);
          }
        }).catch((err) => {
          // silent
        });
      }


      // If vendor, join vendor-specific room just in case backend expects it
      if (userType === 'vendor') {
        const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        const vendorId = vendorData.id || vendorData._id;
        if (vendorId) {
          console.log(`[Socket] VENDOR joining room: vendor_${vendorId}`);
          newSocket.emit('join_vendor_room', vendorId);
        } else {
          console.warn('[Socket] ⚠️ VENDOR: no vendorId found in localStorage');
        }
      }

      if (userType === 'worker') {
        const workerData = JSON.parse(localStorage.getItem('workerData') || '{}');
        const workerId = workerData.id || workerData._id;
        if (workerId) {
          console.log(`[Socket] WORKER joining room: worker_${workerId}`);
          newSocket.emit('join_worker_room', workerId);
        } else {
          console.warn('[Socket] ⚠️ WORKER: no workerId found in localStorage');
        }
      }

      if (userType === 'user') {
        // Fallback to check both 'userData' and 'user' since different parts of the app use different keys
        const storedUserData = localStorage.getItem('userData') || localStorage.getItem('user') || '{}';
        const userData = JSON.parse(storedUserData);
        const userId = userData.id || userData._id;
        if (userId) {
          console.log(`[Socket] USER joining room: user_${userId}`);
          newSocket.emit('join_user_room', userId);
        } else {
          console.warn('[Socket] ⚠️ USER: no userId found in localStorage under "userData" or "user". userData:', userData);
        }
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`❌ [Socket] ${userType?.toUpperCase()} disconnected → reason: ${reason}`);
    });

    newSocket.on('connect_error', (err) => {
      console.error(`[Socket] ❌ Connection error for ${userType}:`, err.message);
    });

    // Listen for generic notifications
    newSocket.on('notification', (data) => {
      console.log(`[Socket] 🔔 '${userType}' received NOTIFICATION:`, data);
      if (isSoundEnabled(userType)) {
        playNotificationSound();
      }

      // Show custom toast for all notifications
      toast.custom((t) => (
        <SwipeableNotification
          t={t}
          data={data}
          onClick={() => {
            toast.dismiss(t.id);
            // Optional: navigate based on relatedId
            if (data.relatedId) {
              if (userType === 'vendor') navigate(`/vendor/booking/${data.relatedId}`);
              else if (userType === 'worker') navigate(`/worker/job/${data.relatedId}`);
              else navigate(`/user/booking/${data.relatedId}`);
            }
          }}
        />
      ), {
        id: 'socket-notification', // Prevent stacking
        duration: 3500, // Slightly longer to allow interaction/reading since it's dismissible
        position: 'top-right'
      });

      // Dispatch update events to refresh UI components
      if (userType === 'worker') window.dispatchEvent(new Event('workerJobsUpdated'));
      if (userType === 'vendor') {
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorNotificationsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
      }
      if (userType === 'user') {
        window.dispatchEvent(new Event('userBookingsUpdated'));
      }
    });

    // Listen for real-time booking updates
    newSocket.on('booking_updated', (data) => {
      console.log(`[Socket] 📦 '${userType}' received BOOKING_UPDATED:`, data);
      
      if (userType === 'user') {
        const stored = localStorage.getItem('activeAssignedBooking');
        if (stored) {
          try {
             const activeData = JSON.parse(stored);
             const updatedBookingId = data.bookingId || data._id || (data.data && data.data._id);
             const status = (data.status || (data.data && data.data.status))?.toLowerCase();
             
             if (activeData.bookingId === updatedBookingId && ['completed', 'cancelled', 'rejected', 'work_done'].includes(status)) {
               localStorage.removeItem('activeAssignedBooking');
               window.dispatchEvent(new Event('activeAssignedBookingUpdated'));
             }
          } catch(e) {}
        }
        window.dispatchEvent(new Event('userBookingsUpdated'));
      }
      
      if (userType === 'vendor') window.dispatchEvent(new Event('vendorJobsUpdated'));
      if (userType === 'worker') window.dispatchEvent(new Event('workerJobsUpdated'));
    });

    if (userType === 'user') {
      newSocket.on('booking_accepted', (data) => {
        console.log(`[Socket] 🎯 USER received BOOKING_ACCEPTED:`, data);
        if (isSoundEnabled('user')) {
          playNotificationSound();
        }
        
        // Save active booking info to localStorage
        localStorage.setItem('activeAssignedBooking', JSON.stringify({
          bookingId: data.bookingId,
          worker: data.worker,
          timestamp: Date.now()
        }));
        
        // Notify components
        window.dispatchEvent(new Event('activeAssignedBookingUpdated'));
        window.dispatchEvent(new Event('userBookingsUpdated'));

        // Show toast
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">Your expert has been assigned!</span>
            <span className="text-xs opacity-90">{data.worker?.name || 'A professional'} is ready for your job.</span>
          </div>,
          { duration: 5000, position: 'top-center' }
        );
      });
    }

    // Listen for special Vendor Booking Requests
    if (userType === 'vendor') {
      newSocket.on('new_booking_request', (data) => {
        // console.log('🚨 New Booking Request Alert:', data);

        // Play urgent alert ring
        playAlertRing();

        // Save to localStorage for the Alert screen and Dashboard to read
        // Note: Even though we are moving to backend, keeping this for immediate UI responsiveness before potential refresh lag
        const newJob = {
          id: data.bookingId,
          serviceType: data.serviceName,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          location: {
            address: data.address?.addressLine1 || 'Location shared',
            distance: data.distance ? `${data.distance.toFixed(1)} km` : 'Near you'
          },
          price: data.price,
          vendorEarnings: data.vendorEarnings,
          serviceCategory: data.serviceCategory,
          brandName: data.brandName,
          brandIcon: data.brandIcon,
          categoryIcon: data.categoryIcon,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          timeSlot: {
            date: new Date(data.scheduledDate).toLocaleDateString(),
            time: data.scheduledTime
          },
          status: 'requested',
          createdAt: data.createdAt || new Date().toISOString(),
          expiresAt: data.expiresAt
        };

        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        if (!pendingJobs.find(job => job.id === newJob.id)) {
          pendingJobs.unshift(newJob);
          localStorage.setItem('vendorPendingJobs', JSON.stringify(pendingJobs));

          // Update stats
          const stats = JSON.parse(localStorage.getItem('vendorStats') || '{}');
          stats.pendingAlerts = (stats.pendingAlerts || 0) + 1;
          localStorage.setItem('vendorStats', JSON.stringify(stats));
        }

        // Notify app components to refresh
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
        window.dispatchEvent(new Event('vendorNotificationsUpdated'));

        // Always show the global alert instead of navigating
        const event = new CustomEvent('showDashboardBookingAlert', { detail: newJob });
        window.dispatchEvent(event);
      });

      // Listen for booking_taken - when another vendor accepts a job
      newSocket.on('booking_taken', (data) => {
        // console.log('⚡ Booking taken by another vendor:', data);
        const takenBookingId = String(data.bookingId);

        // Remove from localStorage
        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        const updatedPending = pendingJobs.filter(job => {
          const jobId = String(job.id || job._id);
          return jobId !== takenBookingId;
        });
        localStorage.setItem('vendorPendingJobs', JSON.stringify(updatedPending));

        // Update stats
        const stats = JSON.parse(localStorage.getItem('vendorStats') || '{}');
        if (stats.pendingAlerts > 0) {
          stats.pendingAlerts = Math.max(0, (stats.pendingAlerts || 0) - 1);
          localStorage.setItem('vendorStats', JSON.stringify(stats));
        }

        // Show toast notification
        toast.error(data.message || 'Job taken by another vendor', { icon: '⚡' });

        // Dispatch specific remove event for instant UI update
        window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: takenBookingId } }));

        // Notify app components to refresh
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
      });

      // Listen for removeVendorBooking - generic removal (timeout, cancellation, etc.)
      newSocket.on('removeVendorBooking', (data) => {
        const bookingId = String(data.bookingId || data.id);

        // Remove from localStorage
        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        const updatedPending = pendingJobs.filter(job => String(job.id || job._id) !== bookingId);
        localStorage.setItem('vendorPendingJobs', JSON.stringify(updatedPending));

        // Update stats
        const stats = JSON.parse(localStorage.getItem('vendorStats') || '{}');
        if (stats.pendingAlerts > 0) {
          stats.pendingAlerts = Math.max(0, (stats.pendingAlerts || 0) - 1);
          localStorage.setItem('vendorStats', JSON.stringify(stats));
        }

        // Dispatch specific remove event for instant UI update
        window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: bookingId } }));
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
      });
    }

    // Listen for special Worker Job Assignments
    if (userType === 'worker') {
      newSocket.on('job_cancelled', (data) => {
        const bookingId = data.bookingId;
        if (bookingId) {
          // Remove from local storage
          const pendingJobs = JSON.parse(localStorage.getItem('workerPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(bookingId));
          localStorage.setItem('workerPendingJobs', JSON.stringify(updated));

          // Dispatch remove event so modal disappears immediately
          window.dispatchEvent(new CustomEvent('removeWorkerJobAlert', { detail: { id: bookingId } }));
          window.dispatchEvent(new Event('workerJobsUpdated'));
          
          import('react-hot-toast').then(({ toast }) => {
            toast.error(data.message || 'Job cancelled by customer');
          });
        }
      });
      newSocket.on('new_job_assigned', (data) => {
        // Play urgent alert ring
        playAlertRing();

        const newJob = {
          id: data.bookingId,
          _id: data.bookingId,
          serviceType: data.serviceName || 'Service',
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          location: {
            address: data.address?.addressLine1 || 'Location shared',
          },
          price: data.price,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          timeSlot: {
            date: new Date(data.scheduledDate).toLocaleDateString(),
            time: data.scheduledTime
          },
          status: 'ASSIGNED',
          createdAt: new Date().toISOString()
        };

        const pendingJobs = JSON.parse(localStorage.getItem('workerPendingJobs') || '[]');
        if (!pendingJobs.find(job => String(job.id || job._id) === String(newJob.id))) {
          pendingJobs.unshift(newJob);
          localStorage.setItem('workerPendingJobs', JSON.stringify(pendingJobs));
        }

        // Notify app components to refresh
        window.dispatchEvent(new Event('workerJobsUpdated'));

        // Always show the global alert 
        const event = new CustomEvent('showWorkerJobAlert', { detail: newJob });
        window.dispatchEvent(event);
      });

      // Listen for direct booking requests (Worker Mode)
      newSocket.on('new_booking_request', (data) => {
        // Play urgent alert ring
        playAlertRing();

        const newJob = {
          id: data.bookingId,
          _id: data.bookingId,
          serviceType: data.serviceName || 'Service',
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          location: {
            address: data.address?.addressLine1 || 'Location shared',
            distance: data.distance ? `${data.distance.toFixed(1)} km` : 'Near you'
          },
          price: data.price,
          serviceCategory: data.serviceCategory,
          brandName: data.brandName,
          brandIcon: data.brandIcon,
          categoryIcon: data.categoryIcon,
          bookedItems: data.bookedItems,
          requirementText: data.requirementText,
          isConsultancyRequest: data.isConsultancyRequest,
          isEstimateBased: data.isEstimateBased,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          timeSlot: {
            date: new Date(data.scheduledDate).toLocaleDateString(),
            time: data.scheduledTime
          },
          status: 'requested',
          createdAt: data.createdAt || new Date().toISOString(),
          expiresAt: data.expiresAt
        };

        // Save to localStorage for persistence
        const pendingJobs = JSON.parse(localStorage.getItem('workerPendingJobs') || '[]');
        if (!pendingJobs.find(job => String(job.id || job._id) === String(newJob.id))) {
          pendingJobs.unshift(newJob);
          localStorage.setItem('workerPendingJobs', JSON.stringify(pendingJobs));
        }

        // Notify app components to refresh
        window.dispatchEvent(new Event('workerJobsUpdated'));

        // Show the alert modal
        const event = new CustomEvent('showWorkerJobAlert', { 
          detail: {
            ...newJob,
            service: newJob.serviceType, // Alias for older components
            amount: newJob.price
          } 
        });
        window.dispatchEvent(event);
      });
    }

    return () => {
      newSocket.disconnect();
    };
  }, [userType]); // Only re-run if userType changes. Navigate is stable.

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

