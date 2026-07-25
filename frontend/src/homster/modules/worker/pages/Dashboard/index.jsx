import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiCheckCircle, FiClock, FiTrendingUp, FiChevronRight, FiUser, FiBell, FiMapPin, FiArrowRight, FiAlertCircle, FiTool, FiNavigation, FiX, FiCheck, FiStar, FiTarget, FiGift, FiAward, FiThumbsUp, FiLock, FiClipboard, FiHeadphones, FiBook, FiPhone, FiMail, FiXCircle, FiTag } from 'react-icons/fi';
import { FaWallet, FaHourglassHalf } from 'react-icons/fa';
import { workerTheme as themeColors, vendorTheme } from '../../../../theme';
import Header from '../../components/layout/Header';
import workerService from '../../../../services/workerService';
import { registerFCMToken } from '../../../../services/pushNotificationService';
import { SkeletonProfileHeader, SkeletonDashboardStats, SkeletonList } from '../../../../components/common/SkeletonLoaders';
import OptimizedImage from '../../../../components/common/OptimizedImage';
import { useSocket } from '../../../../context/SocketContext';
import WorkerJobAlertModal from '../../components/bookings/WorkerJobAlertModal';
import LogoLoader from '../../../../components/common/LogoLoader';
import workerWalletService from '../../../../services/workerWalletService';

const ACHIEVEMENT_ICONS = {
  FiStar: FiStar,
  FiAward: FiAward,
  FiClock: FiClock,
  FiCheckCircle: FiCheckCircle,
  FiTrendingUp: FiTrendingUp,
  FiThumbsUp: FiThumbsUp
};


const Dashboard = () => {
  const navigate = useNavigate();

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper function to get status label
  const getStatusLabel = (status) => {
    const statusMap = {
      'PENDING': 'Pending',
      'ACCEPTED': 'Accepted',
      'REJECTED': 'Rejected',
      'COMPLETED': 'Completed',
      'ASSIGNED': 'Assigned',
      'VISITED': 'Visited',
      'WORK_DONE': 'Work Done',
    };
    return statusMap[status] || status;
  };

  const [stats, setStats] = useState({
    pendingJobs: 0,
    acceptedJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    rating: 0,
    walletBalance: 0,
    targetTitle: 'Monthly Target',
    monthlyTarget: 30,
    monthlyTargetBonus: 5000,
    targetCompletedJobs: 0,
    targetStartDate: null,
    targetEndDate: null,
    workerAchievements: [],
    workerReferralBonusReferrer: 0,
    workerReferralCode: null,
  });
  const [workerProfile, setWorkerProfile] = useState({
    name: 'Worker Name',
    phone: '+91 9876543210',
    photo: null,
    categories: [],
    address: null,
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [emergencyJobs, setEmergencyJobs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);

  // Set background gradient
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket();

  const [alertJobId, setAlertJobId] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState(null);

  // Get current GPS position as a promise
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  };

  // Toggle online/offline with GPS
  const handleToggleOnline = async () => {
    setTogglingOnline(true);
    const goingOnline = !isOnline;

    try {
      let lat, lng;
      if (goingOnline) {
        // Get GPS location before going online
        try {
          const pos = await getCurrentPosition();
          lat = pos.lat;
          lng = pos.lng;
        } catch (geoErr) {
          console.error('GPS error:', geoErr);
          const { toast } = await import('react-hot-toast');
          toast.error('Location permission required to go online. Please enable GPS.');
          setTogglingOnline(false);
          return;
        }
      }

      const res = await workerService.toggleOnline(goingOnline, lat, lng);
      if (res.success) {
        setIsOnline(goingOnline);
        const { toast } = await import('react-hot-toast');
        toast.success(res.message);

        // Start periodic location updates when online
        if (goingOnline) {
          startLocationTracking();
        } else {
          stopLocationTracking();
        }
      }
    } catch (error) {
      console.error('Toggle online error:', error);
      const { toast } = await import('react-hot-toast');
      toast.error('Failed to update status');
    } finally {
      setTogglingOnline(false);
    }
  };

  // Periodic location tracking (every 2 minutes when online)
  const startLocationTracking = () => {
    stopLocationTracking(); // clear any existing
    const id = setInterval(async () => {
      try {
        const pos = await getCurrentPosition();
        await workerService.updateLocation(pos.lat, pos.lng);
      } catch (err) {
        console.warn('Background location update failed:', err.message);
      }
    }, 2 * 60 * 1000); // Every 2 minutes
    setLocationWatchId(id);
  };

  const stopLocationTracking = () => {
    if (locationWatchId) {
      clearInterval(locationWatchId);
      setLocationWatchId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLocationTracking();
  }, [locationWatchId]);

  // Fetch Dashboard Data Function
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Profile, Stats and Recent Jobs in parallel (Stats also includes recent jobs but let's be robust)
      const [profileRes, statsRes, subRes, walletRes] = await Promise.all([
        workerService.getProfile(),
        workerService.getDashboardStats(),
        workerService.getSubscriptionStatus(),
        workerWalletService.getWallet().catch(() => null)
      ]);

      if (profileRes.success) {
        const profile = profileRes.worker;
        setWorkerProfile({
          name: profile.name || 'Worker Name',
          phone: profile.phone || '',
          photo: profile.profilePhoto || null,
          categories: profile.serviceCategories || (profile.serviceCategory ? [profile.serviceCategory] : []),
          address: profile.address,
        });
        // Sync online status from DB
        setIsOnline(profile.isOnline || false);
      }

      if (statsRes.success) {
        const { totalEarnings, todayEarnings, thisWeekEarnings, thisMonthEarnings, activeJobs, pendingJobs, acceptedJobs, completedJobs, targetCompletedJobs, cancelledJobs, monthlyTarget, monthlyTargetBonus, targetStartDate, targetEndDate, workerAchievements, rating, recentJobs: apiRecentJobs, emergencyJobs: apiEmergencyJobs, workerReferralBonusReferrer, workerReferralCode } = statsRes.data;
        setStats(prev => ({
          ...prev,
          totalEarnings: totalEarnings || 0,
          todayEarnings: todayEarnings || 0,
          thisWeekEarnings: thisWeekEarnings || 0,
          thisMonthEarnings: thisMonthEarnings || 0,
          pendingJobs: pendingJobs !== undefined ? pendingJobs : (activeJobs || 0),
          acceptedJobs: acceptedJobs !== undefined ? acceptedJobs : (activeJobs || 0),
          completedJobs: completedJobs || 0,
          cancelledJobs: cancelledJobs || 0,
          targetCompletedJobs: targetCompletedJobs || 0,
          targetTitle: statsRes.data.targetTitle || 'Monthly Target',
          monthlyTarget: monthlyTarget || 30,
          monthlyTargetBonus: monthlyTargetBonus || 5000,
          targetStartDate: targetStartDate || null,
          targetEndDate: targetEndDate || null,
          workerAchievements: workerAchievements || [],
          workerReferralBonusReferrer: workerReferralBonusReferrer || 0,
          workerReferralCode: workerReferralCode || null,
          rating: rating || 0,
          walletBalance: walletRes?.success ? (walletRes.data?.balance || 0) : prev.walletBalance
        }));

        if (apiRecentJobs && apiRecentJobs.length > 0) {
          setRecentJobs(apiRecentJobs.map(job => ({
            id: job._id,
            serviceType: job.serviceId?.title || job.serviceName || 'Service',
            customerName: job.userId?.name || 'Customer',
            location: job.address?.city || 'Location N/A',
            time: job.scheduledTime || 'N/A',
            status: job.status,
            price: job.finalAmount,
          })));
        }

        if (apiEmergencyJobs) {
          setEmergencyJobs(apiEmergencyJobs);
        }
      }

      if (subRes && subRes.success) {
        setSubscriptionStatus(subRes.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleEmergencyResponse = async (jobId, status) => {
    try {
      const res = await workerService.respondToJob(jobId, status);
      if (res.success) {
        const { toast } = await import('react-hot-toast');

        // Match popup logic: Clear from local storage so it doesn't reappear
        const pendingJobs = JSON.parse(localStorage.getItem('workerPendingJobs') || '[]');
        const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(jobId));
        localStorage.setItem('workerPendingJobs', JSON.stringify(updated));

        // Remove from active alerts if any
        window.dispatchEvent(new CustomEvent('removeWorkerJobAlert', { detail: { id: jobId } }));

        if (status === 'ACCEPTED') {
          toast.success('Job Accepted Successfully!');
          // Dashboard will unmount, but let's dispatch just in case
          window.dispatchEvent(new Event('workerJobsUpdated'));
          navigate(`/worker/job/${jobId}`);
        } else {
          toast.success('Job Declined');
          fetchDashboardData();
        }
      } else {
        const { toast } = await import('react-hot-toast');
        toast.error(res.message || 'Failed to update job status');
      }
    } catch (error) {
      const { toast } = await import('react-hot-toast');
      toast.error('Failed to update job status');
    }
  };

  // Load real data from API
  useEffect(() => {
    fetchDashboardData();

    // Ask for notification permission and register FCM
    registerFCMToken('worker', true).catch(err => console.error('FCM registration failed:', err));

    // Listen for updates
    const handleUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('workerJobsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('workerJobsUpdated', handleUpdate);
    };

  }, []);

  // Compute Highest Earned Achievement for the Badge
  let highestAchievement = null;
  if (stats.workerAchievements && stats.workerAchievements.length > 0) {
    const earned = stats.workerAchievements.filter(a => stats.completedJobs >= a.jobThreshold);
    if (earned.length > 0) {
      highestAchievement = [...earned].sort((a, b) => a.jobThreshold - b.jobThreshold).pop();
    }
  }

  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return 'bg-[#CD7F32] text-white';
      case 'silver': return 'bg-[#C0C0C0] text-gray-800';
      case 'gold': return 'bg-[#F5B01B] text-white';
      case 'platinum': return 'bg-[#E5E4E2] text-gray-800';
      case 'diamond': return 'bg-[#b9f2ff] text-blue-800';
      default: return 'bg-[#F5B01B] text-white';
    }
  };

  // Clean up previous unnecessary local socket listeners since SocketContext handles global job alerts
  useEffect(() => {
    // Only keeping push notification handling if needed locally, but we don't need to open any local modal
    const handlePushNotification = (e) => {
      // Just refresh data on push
      fetchDashboardData();
    };

    window.addEventListener('appNotificationReceived', handlePushNotification);

    return () => {
      window.removeEventListener('appNotificationReceived', handlePushNotification);
    };
  }, []);

  // Test Push Notification
  const handleTestPush = async () => {
    try {
      const { toast } = await import('react-hot-toast');
      const loadingToast = toast.loading('Sending test push...');

      const res = await workerService.testPushNotification();

      toast.dismiss(loadingToast);
      if (res.success) {
        toast.success('Test push sent! Check your notification tray.');
      } else {
        toast.error(res.error || 'Failed to send test push');
      }
    } catch (err) {
      console.error('Test push error:', err);
      const { toast } = await import('react-hot-toast');
      toast.error('Error triggering test push');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
        <Header title="Dashboard" showBack={false} />
        <main className="px-4 py-4 space-y-6">
          <SkeletonProfileHeader />
          <SkeletonDashboardStats />
          <div className="space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
            <SkeletonList count={3} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <main className="pt-0">
        {/* Profile & Status Section */}
        <div className="bg-[#EF6B11] px-5 pt-10 pb-16 rounded-b-[2.5rem] relative mb-14 shadow-lg">
          {/* Profile Info */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="relative shrink-0">
              {/* Profile Photo */}
              <div className="w-[72px] h-[72px] rounded-full border-2 border-white overflow-hidden bg-white/20 flex items-center justify-center shadow-sm">
                {workerProfile.photo ? (
                  <OptimizedImage
                    src={workerProfile.photo}
                    alt={workerProfile.name}
                    className="w-full h-full object-cover"
                    width={72}
                    height={72}
                  />
                ) : (
                  <FiUser className="w-8 h-8 text-white" />
                )}
              </div>
              {/* Verified Badge */}
              <div className="absolute bottom-0 right-0 bg-white rounded-full p-[2px] shadow-sm">
                <div className="bg-[#EF6B11] text-white rounded-full w-4 h-4 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <p className="text-white/90 text-sm font-medium mb-0.5">Good Afternoon,</p>
              <h2 className="text-white text-[22px] font-bold flex items-center gap-1.5 mb-2 leading-tight">
                {workerProfile.name} <span className="text-xl">👋</span>
              </h2>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {highestAchievement && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${getTierColor(highestAchievement.tier)}`}>
                    <span className="text-[10px]">🛡️</span> {highestAchievement.tier} Partner
                  </div>
                )}
                {workerProfile.address?.city && (
                  <div className="flex items-center gap-1 text-white text-sm font-bold tracking-wide">
                    <FiMapPin className="w-3.5 h-3.5" />
                    {workerProfile.address.city}
                  </div>
                )}
              </div>
              {workerProfile.categories && workerProfile.categories.length > 0 && (
                <p className="text-white text-[13px] font-medium truncate opacity-95 tracking-wide">
                  {workerProfile.categories.join(' • ')}
                </p>
              )}
            </div>
          </div>

          {/* Overlapping Status Card */}
          <div className="absolute left-5 right-5 -bottom-10 z-20">
            <div className="bg-white rounded-[20px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-between border border-gray-50">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isOnline ? 'bg-[#A7F3D0]/60' : 'bg-gray-100'}`}>
                    <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-[#00B48A]' : 'bg-gray-400'}`} />
                  </div>
                  <h3 className="text-[#1E3A8A] font-bold text-[17px] tracking-tight">
                    {isOnline ? 'You are Online' : 'You are Offline'}
                  </h3>
                </div>
                <p className="text-[#64748B] text-[13px] pl-7 mb-2 font-medium">
                  {isOnline ? 'Receiving nearby job requests' : 'Go online to receive jobs'}
                </p>
                <div className="flex items-center gap-3 pl-7 text-[#64748B] text-[11px] font-bold tracking-wide">
                  <div className="flex items-center gap-1">
                    <svg className={`w-3.5 h-3.5 ${isOnline ? 'text-[#00B48A]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 22v-4m0-12V2m10 10h-4M6 12H2m4 0a6 6 0 1012 0 6 6 0 00-12 0z" /></svg>
                    GPS Active
                  </div>
                  <div className="flex items-center gap-1">
                    <FiClock className="w-3.5 h-3.5" />
                    Just now
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleToggleOnline}
                disabled={togglingOnline}
                className={`w-[34px] h-[14px] rounded-full relative transition-colors duration-300 ease-in-out shrink-0 flex items-center ${isOnline ? 'bg-[#96F2D7]' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1/2 -translate-y-1/2 -left-[1px] w-[20px] h-[20px] rounded-full transition-transform duration-300 ease-in-out flex items-center justify-center shadow-md ${isOnline ? 'transform translate-x-[16px] bg-[#00A699]' : 'bg-[#FAFAFA]'}`}>
                  {togglingOnline && (
                    <div className={`w-2.5 h-2.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin ${isOnline ? 'text-white' : 'text-gray-400'}`} />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Incomplete Profile Prompt */}
        {((!workerProfile.categories || workerProfile.categories.length === 0) ||
          (!workerProfile.address || Object.keys(workerProfile.address).length === 0)) && (
            <div className="px-4 pt-2 -mb-2">
              <div
                onClick={() => navigate('/worker/profile')}
                className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r shadow-sm cursor-pointer hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FiClock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-bold text-orange-700">Profile Incomplete</p>
                    <p className="text-sm text-orange-600">
                      Complete your profile (Address and Category) to start receiving jobs.
                    </p>
                  </div>
                  <div className="ml-auto">
                    <FiArrowRight className="h-4 w-4 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Notification Status & Debug - NEW */}
        <div className="px-4 py-2">
          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${Notification.permission === 'granted' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
              />
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notification Status</p>
                <p className={`text-xs font-bold ${Notification.permission === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
                  {Notification.permission === 'granted' ? '✅ Active & Ready' : '❌ Blocked / Not Setup'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTestPush}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 active:scale-95 transition-all"
              >
                TEST PUSH
              </button>
              <button
                onClick={() => {
                  if (window.fcmDebug) window.fcmDebug();
                  if (window.testLocalFCMUI) window.testLocalFCMUI();
                  window.dispatchEvent(new CustomEvent('showWorkerJobAlert', { detail: { id: 'test-id' } }));
                }}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 active:scale-95 transition-all"
              >
                TEST UI
              </button>
              <button
                onClick={async () => {
                  const { registerFCMToken } = await import('../../../../services/pushNotificationService');
                  registerFCMToken('worker', true);
                }}
                className="p-2 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-100 active:scale-95 transition-all"
              >
                RE-REGISTER
              </button>
            </div>
          </div>
          {Notification.permission !== 'granted' && (
            <p className="text-[9px] text-red-500 font-bold mt-1 px-1">
              ⚠️ Notifications are disabled in your browser. Click the lock icon in the URL bar to fix.
            </p>
          )}
        </div>

        {/* Earnings Card */}
        <div className="px-4 pt-4">
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-50 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#1E3A8A] text-lg font-bold">Earnings</h2>
              <button
                onClick={() => navigate('/worker/wallet')}
                className="text-[#F06500] text-sm font-bold flex items-center gap-0.5 active:scale-95 transition-transform"
              >
                History <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1">
                <p className="text-[#8492A6] text-xs font-semibold mb-1">Today</p>
                <p className="text-[#1E3A8A] text-[17px] font-bold">₹{stats.todayEarnings !== undefined ? stats.todayEarnings.toLocaleString() : '0'}</p>
              </div>
              <div className="w-[1px] h-10 bg-gray-100"></div>
              <div className="text-center flex-1">
                <p className="text-[#8492A6] text-xs font-semibold mb-1">This Week</p>
                <p className="text-[#1E3A8A] text-[17px] font-bold">₹{stats.thisWeekEarnings !== undefined ? stats.thisWeekEarnings.toLocaleString() : '0'}</p>
              </div>
              <div className="w-[1px] h-10 bg-gray-100"></div>
              <div className="text-center flex-1">
                <p className="text-[#8492A6] text-xs font-semibold mb-1">This Month</p>
                <p className="text-[#1E3A8A] text-[17px] font-bold">₹{stats.thisMonthEarnings !== undefined ? stats.thisMonthEarnings.toLocaleString() : '0'}</p>
              </div>
            </div>

            <div className="bg-[#FEF0D9] rounded-[16px] p-4 flex items-center justify-between border border-[#FDE0B2]">
              <div>
                <p className="text-[#E85D04] text-xs font-bold mb-1">Wallet Balance</p>
                <p className="text-[#E85D04] text-[22px] font-extrabold tracking-tight leading-none">₹{stats.walletBalance.toLocaleString()}</p>
              </div>
              <button
                onClick={() => navigate('/worker/wallet')}
                className="bg-[#F06500] text-white px-5 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(240,101,0,0.25)] active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-0.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L1 7v2h22V7L12 2zm-9 9h3v7H3v-7zm7 0h3v7h-3v-7zm7 0h3v7h-3v-7zM1 20v2h22v-2H1z" />
                  </svg>
                  <FiArrowRight className="w-3 h-3 -ml-0.5 stroke-[3]" />
                </div>
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Jobs Section */}
        {emergencyJobs.length > 0 && (
          <div className="px-4 pt-2 pb-2">
            <div className="flex items-center gap-1.5 mb-3 text-red-500 font-bold">
              <FiAlertCircle className="fill-current w-5 h-5" />
              <h2 className="text-lg">Emergency Jobs</h2>
            </div>
            <div className="space-y-4">
              {emergencyJobs.map((job) => (
                <div key={job._id} className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(239,68,68,0.15)] border border-red-400 relative">
                  <div className="inline-flex items-center gap-1.5 bg-[#FF4B4B] text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 absolute -top-3 left-4 border-2 border-white">
                    <FiAlertCircle className="w-3 h-3 stroke-[3]" />
                    Priority • Extra Earning
                  </div>

                  <div className="flex justify-between items-start mt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {job.userId?.profilePicture ? (
                          <OptimizedImage src={job.userId.profilePicture} alt={job.userId.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400"><FiUser className="w-6 h-6" /></div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-[#2C3E50] font-bold text-[15px] leading-tight">{job.userId?.name || 'Customer'}</h3>
                        <div className="flex items-center text-[11px] text-gray-500 mt-0.5">
                          <FiStar className="text-orange-400 fill-orange-400 w-3 h-3 mr-1" />
                          <span className="font-semibold text-gray-700 mr-1">5.0</span>
                          <span>• {job.address?.city || 'Location N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[#E85D04] font-extrabold text-lg">
                      ₹{job.finalAmount?.toLocaleString()}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 bg-[#FEF0D9] text-[#E85D04] px-2.5 py-1 rounded-lg text-xs font-bold mt-3">
                    <FiTool className="w-3.5 h-3.5" />
                    Emergency {job.serviceId?.title || job.serviceName || 'Service'}
                  </div>

                  <div className="flex items-center gap-4 text-gray-500 text-xs font-semibold mt-3 mb-4">
                    <div className="flex items-center gap-1">
                      <FiMapPin className="w-3.5 h-3.5" /> 1.2 km
                    </div>
                    <div className="flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5" />
                      {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' : ''}
                      {job.scheduledTime || 'ASAP'}
                    </div>
                    <div className="flex items-center gap-1">
                      <FaHourglassHalf className="w-3 h-3 text-gray-400" /> 60 min
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEmergencyResponse(job._id, 'REJECTED')}
                      className="flex-1 py-2.5 rounded-xl border border-red-500 text-red-500 font-bold text-[13px] active:scale-95 transition-transform"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${job.address?.lat},${job.address?.lng}`)}
                      className="w-11 h-[42px] rounded-xl border border-gray-200 text-[#2C3E50] flex items-center justify-center active:scale-95 transition-transform shrink-0"
                    >
                      <FiNavigation className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={() => handleEmergencyResponse(job._id, 'ACCEPTED')}
                      className="flex-[1.5] py-2.5 rounded-xl bg-[#10B981] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.3)] active:scale-95 transition-transform"
                    >
                      <FiCheck className="w-4 h-4 stroke-[3]" /> Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Dashboard Section */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-50 mb-2">
            <h2 className="text-[#1E3A8A] text-lg font-bold mb-4">Performance Dashboard</h2>
            <div className="grid grid-cols-3 gap-3">
              {/* Pending */}
              <div className="bg-[#F8FAFC] rounded-[16px] p-3 border border-gray-100 flex flex-col items-start">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                  <FiClock className="text-orange-400 w-4 h-4" />
                </div>
                <p className="text-[#1E3A8A] text-[18px] font-bold leading-tight">{stats.pendingJobs || 0}</p>
                <p className="text-gray-500 text-[11px] font-medium mt-0.5">Pending</p>
              </div>
              {/* Accepted */}
              <div className="bg-[#F8FAFC] rounded-[16px] p-3 border border-gray-100 flex flex-col items-start">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                  <FiCheckCircle className="text-indigo-600 w-4 h-4" />
                </div>
                <p className="text-[#1E3A8A] text-[18px] font-bold leading-tight">{stats.acceptedJobs || 0}</p>
                <p className="text-gray-500 text-[11px] font-medium mt-0.5">Accepted</p>
              </div>
              {/* Completed */}
              <div className="bg-[#F8FAFC] rounded-[16px] p-3 border border-gray-100 flex flex-col items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                  <div className="bg-emerald-500 rounded-full w-4 h-4 flex items-center justify-center">
                    <FiCheck className="text-white w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <p className="text-[#1E3A8A] text-[18px] font-bold leading-tight">{stats.completedJobs || 0}</p>
                <p className="text-gray-500 text-[11px] font-medium mt-0.5">Completed</p>
              </div>
              {/* Cancelled */}
              <div className="bg-[#F8FAFC] rounded-[16px] p-3 border border-gray-100 flex flex-col items-start">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mb-2">
                  <div className="border-[1.5px] border-red-400 rounded-full w-4 h-4 flex items-center justify-center">
                    <FiX className="text-red-400 w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <p className="text-[#1E3A8A] text-[18px] font-bold leading-tight">{stats.cancelledJobs || 0}</p>
                <p className="text-gray-500 text-[11px] font-medium mt-0.5">Cancelled</p>
              </div>
              {/* Rating */}
              <div className="bg-[#F8FAFC] rounded-[16px] p-3 border border-gray-100 flex flex-col items-start">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                  <FiStar className="text-orange-400 fill-orange-400 w-4 h-4" />
                </div>
                <p className="text-[#1E3A8A] text-[18px] font-bold leading-tight">{stats.rating ? stats.rating.toFixed(1) : '0.0'}</p>
                <p className="text-gray-500 text-[11px] font-medium mt-0.5">Rating</p>
              </div>
              {/* Completion */}
              <div className="bg-[#F8FAFC] rounded-[16px] p-3 border border-gray-100 flex flex-col items-start">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                  <div className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent border-l-transparent transform rotate-45" />
                </div>
                <p className="text-[#1E3A8A] text-[18px] font-bold leading-tight">
                  {stats.completedJobs + (stats.cancelledJobs || 0) > 0
                    ? Math.round((stats.completedJobs / (stats.completedJobs + (stats.cancelledJobs || 0))) * 100)
                    : 100}%
                </p>
                <p className="text-gray-500 text-[11px] font-medium mt-0.5">Completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Target Section */}
        <div className="px-4 pt-2 pb-2">
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-50 mb-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <FiTarget className="w-32 h-32 text-[#E85D04] transform translate-x-4 -translate-y-4" />
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-[#1E3A8A] text-lg font-bold">{stats.targetTitle}</h2>
                  <p className="text-gray-500 text-[13px] font-medium mt-0.5">Complete {stats.monthlyTarget} jobs to earn bonus</p>
                  {stats.targetStartDate && stats.targetEndDate && (
                    <p className="text-[10px] text-gray-400 font-bold mt-1">
                      Valid: {new Date(stats.targetStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(stats.targetEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
                <div className="bg-[#FEF0D9] text-[#E85D04] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm border border-[#FDE0B2]">
                  <FiGift className="w-4 h-4" />
                  <span className="font-extrabold text-[15px]">₹{stats.monthlyTargetBonus.toLocaleString()}</span>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-[13px] font-bold mb-2.5">
                  <span className="text-[#00B48A]">{stats.targetCompletedJobs} Completed</span>
                  <span className="text-gray-400">{Math.max(0, stats.monthlyTarget - stats.targetCompletedJobs)} Remaining</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 shadow-inner overflow-hidden border border-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00A699] to-[#00E5B5] relative transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, (stats.targetCompletedJobs / stats.monthlyTarget) * 100)}%` }}
                  >
                    <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>

              {stats.targetCompletedJobs >= stats.monthlyTarget && (
                <div className="mt-4 bg-[#E6F8F3] border border-[#00B48A]/30 text-[#00A699] px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  <FiCheckCircle className="w-4 h-4 shrink-0" /> Target Achieved! Bonus unlocked.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#1E3A8A] text-lg font-bold">Achievements</h2>
            <button className="text-[#E85D04] text-[13px] font-bold flex items-center gap-0.5">
              View all <FiChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {stats.workerAchievements && stats.workerAchievements.length > 0 ? (
              stats.workerAchievements.map((achievement, idx) => {
                const Icon = ACHIEVEMENT_ICONS[achievement.icon] || FiStar;
                const isEarned = stats.completedJobs >= achievement.jobThreshold;

                return (
                  <div key={idx} className={`min-w-[130px] rounded-2xl p-4 shadow-sm border flex flex-col items-center justify-center text-center transition-all ${isEarned ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 relative ${isEarned ? 'bg-[#FEF0D9] text-[#E85D04]' : 'bg-gray-200 text-gray-400'}`}>
                      <Icon className={`w-6 h-6 ${isEarned && (achievement.icon === 'FiStar' || achievement.icon === 'FiCheckCircle') ? 'fill-current' : ''}`} />
                      {!isEarned && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                          <FiLock className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h3 className={`text-[13px] font-bold leading-tight mb-1 ${isEarned ? 'text-[#1E3A8A]' : 'text-gray-500'}`}>{achievement.title}</h3>
                    <p className={`text-[11px] font-bold ${isEarned ? 'text-[#E85D04]' : 'text-gray-400'}`}>{achievement.tier}</p>
                    {!isEarned && (
                      <p className="text-[9px] text-gray-400 font-medium mt-1">
                        {Math.max(0, achievement.jobThreshold - stats.completedJobs)} jobs left
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-gray-400 text-xs italic px-2 py-4">No achievements configured yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="px-4 pt-2 pb-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-[#1E3A8A] text-lg font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-4 gap-2">
              <div onClick={() => navigate('/worker/jobs')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF3ED] text-[#E85D04] flex items-center justify-center transition-transform group-hover:scale-105">
                  <FiClipboard className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#1E3A8A] text-center leading-tight">My Jobs</span>
              </div>

              <div onClick={() => navigate('/worker/wallet')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-[#E6F8F3] text-[#00A699] flex items-center justify-center transition-transform group-hover:scale-105">
                  <FaWallet className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#1E3A8A] text-center leading-tight">Wallet</span>
              </div>

              <div onClick={() => navigate('/worker/support')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center transition-transform group-hover:scale-105">
                  <FiHeadphones className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#1E3A8A] text-center leading-tight">Support</span>
              </div>

              <div onClick={() => navigate('/worker/training')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center transition-transform group-hover:scale-105">
                  <FiBook className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#1E3A8A] text-center leading-tight">Training</span>
              </div>
            </div>
          </div>
        </div>

        {/* Refer & Earn Banner */}
        {stats.workerReferralCode && stats.workerReferralBonusReferrer > 0 && (
          <div className="px-4 pb-6">
            <div className="bg-[#1e3a8a] rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <div className="relative z-10">
                <p className="text-[#f97316] text-xs font-bold tracking-wider mb-2 uppercase">Refer & Earn</p>
                <h3 className="text-white text-xl font-extrabold mb-1">
                  Invite a Partner. Earn ₹{stats.workerReferralBonusReferrer}
                </h3>
                <p className="text-blue-200 text-sm mb-4">
                  Share code <span className="font-mono font-bold text-white">{stats.workerReferralCode}</span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(stats.workerReferralCode);
                      import('react-hot-toast').then(({ toast }) => toast.success('Code Copied!'));
                    }}
                    className="bg-white text-[#1e3a8a] px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform"
                  >
                    <FiClipboard className="w-4 h-4" /> Copy Code
                  </button>
                  <button
                    onClick={() => {
                      const text = `Join me on Get Right Home! Use my referral code: ${stats.workerReferralCode} to get a bonus when you join. Sign up here: https://getrighthome.com/worker/signup`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Announcements Section */}
        <div className="px-4 pt-4 pb-6">
          <h2 className="text-[#1E3A8A] text-lg font-bold mb-4">Announcements</h2>
          <div className="space-y-3">
            {[
              {
                id: 1,
                title: 'Diwali Bonus Program',
                desc: 'Complete 50 jobs in October and win ₹10,000 bonus!',
                time: 'Today',
                icon: FiGift
              },
              {
                id: 2,
                title: 'New Safety Guidelines',
                desc: 'Please review updated safety protocols in Training Center.',
                time: 'Yesterday',
                icon: FiBell
              },
              {
                id: 3,
                title: 'Weekend Surge Pricing',
                desc: 'Earn 1.5x on weekend jobs this month.',
                time: '3 days ago',
                icon: FiTag
              }
            ].map((announcement) => {
              const Icon = announcement.icon;
              return (
                <div key={announcement.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-[#FEF0D9] text-[#E85D04] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[#1E3A8A] font-bold text-sm mb-0.5 truncate">{announcement.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{announcement.desc}</p>
                  </div>
                  <span className="text-gray-400 text-[10px] font-medium shrink-0 pt-1">{announcement.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Jobs Section */}
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recent Jobs</h2>
            {recentJobs.length > 0 && (
              <button
                onClick={() => navigate('/worker/jobs')}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 active:scale-95 text-white"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.button}dd 100%)`,
                  boxShadow: `0 4px 12px ${themeColors.button}40, 0 2px 6px ${themeColors.button}30`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 16px ${themeColors.button}50, 0 3px 8px ${themeColors.button}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${themeColors.button}40, 0 2px 6px ${themeColors.button}30`;
                }}
              >
                View All
              </button>
            )}
          </div>
          {recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map((job, index) => {
                // Alternating colors
                const isDarkBlue = index % 2 === 0;
                const accentColor = isDarkBlue ? '#3B82F6' : '#F97316';

                return (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/worker/job/${job.id}`)}
                    className="bg-white rounded-xl shadow-lg cursor-pointer active:scale-98 transition-all duration-200 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    {/* Left accent border */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
                      style={{
                        background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                      }}
                    />

                    {/* Compact Content */}
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        {/* Profile Image Circle */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                          style={{
                            border: `2.5px solid ${accentColor}40`,
                            boxShadow: `0 2px 8px ${accentColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.4)`,
                            background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`,
                          }}
                        >
                          <FiUser className="w-5 h-5" style={{ color: accentColor }} />
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Name and Service in one line */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-sm font-bold text-gray-800 truncate">{job.customerName}</p>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-lg shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                                color: '#FFFFFF',
                                boxShadow: `0 2px 5px ${hexToRgba(accentColor, 0.3)}`,
                              }}
                            >
                              {job.serviceType || 'Service'}
                            </span>
                          </div>

                          {/* Address, Time, Status in one line */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="flex items-center gap-1 px-2 py-0.5 rounded"
                              style={{
                                background: 'rgba(0, 166, 166, 0.1)',
                                border: '1px solid rgba(0, 166, 166, 0.2)',
                              }}
                            >
                              <FiMapPin className="w-3 h-3" style={{ color: themeColors.button }} />
                              <span className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{job.location}</span>
                            </div>
                            <div
                              className="flex items-center gap-1 px-2 py-0.5 rounded"
                              style={{
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                              }}
                            >
                              <FiClock className="w-3 h-3 text-orange-500" />
                              <span className="text-xs font-semibold text-gray-700">
                                {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' : ''}
                                {job.scheduledTime || 'ASAP'}
                              </span>
                            </div>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${accentColor}15`,
                                color: accentColor,
                                border: `1px solid ${accentColor}30`,
                              }}
                            >
                              {getStatusLabel(job.status)}
                            </span>
                          </div>
                        </div>

                        {/* Navigate Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/worker/job/${job.id}`);
                          }}
                          className="p-2 rounded-lg shrink-0 transition-all duration-300 active:scale-95"
                          style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                            boxShadow: `0 3px 10px ${hexToRgba(accentColor, 0.3)}, 0 2px 5px ${hexToRgba(accentColor, 0.2)}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = `0 5px 14px ${hexToRgba(accentColor, 0.4)}, 0 3px 7px ${hexToRgba(accentColor, 0.3)}`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = `0 3px 10px ${hexToRgba(accentColor, 0.3)}, 0 2px 5px ${hexToRgba(accentColor, 0.2)}`;
                          }}
                        >
                          <FiArrowRight className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="bg-white rounded-xl p-8 text-center shadow-md"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            >
              <FiBriefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-semibold mb-2">No jobs assigned yet</p>
              <p className="text-sm text-gray-500">
                You'll see assigned jobs here when partners or admin assign work to you
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Test Push Notification Floating Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={handleTestPush}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 16px rgba(245, 124, 0, 0.4)',
          }}
          title="Test Push Notification"
        >
          <FiBell className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
