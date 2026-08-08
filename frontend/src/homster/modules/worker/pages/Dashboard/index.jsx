import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell, FiUser, FiClock, FiBriefcase, FiGrid, FiTarget, FiStar,
  FiZap, FiDroplet, FiWind, FiTool, FiHome
} from 'react-icons/fi';
import { workerTheme as themeColors } from '../../../../theme';
import workerService from '../../../../services/workerService';
import { registerFCMToken } from '../../../../services/pushNotificationService';
import OptimizedImage from '../../../../components/common/OptimizedImage';
import LogoLoader from '../../../../components/common/LogoLoader';
import workerWalletService from '../../../../services/workerWalletService';

// Maps a worker's registered category to a themed promo banner. Falls back to
// a generic "Home Services" banner for anything not in this short list, so
// new categories never render blank.
const CATEGORY_BANNERS = [
  { match: /electric/i, label: 'Electrical Services', icon: FiZap, gradient: 'from-[#111827] to-[#1E3A8A]' },
  { match: /plumb/i, label: 'Plumbing Services', icon: FiDroplet, gradient: 'from-[#0C4A6E] to-[#0369A1]' },
  { match: /clean/i, label: 'Cleaning Services', icon: FiWind, gradient: 'from-[#134E4A] to-[#0D9488]' },
  { match: /carpen|paint|repair|appliance/i, label: 'Home Repair Services', icon: FiTool, gradient: 'from-[#3F1D0F] to-[#B45309]' },
];
const DEFAULT_BANNER = { label: 'Home Services', icon: FiHome, gradient: 'from-[#1E293B] to-[#334155]' };

const getBanner = (categories) => {
  const primary = (categories && categories[0]) || '';
  return CATEGORY_BANNERS.find(b => b.match.test(primary)) || DEFAULT_BANNER;
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    pendingJobs: 0,
    acceptedJobs: 0,
    completedJobs: 0,
    todayEarnings: 0,
    rating: 0,
    targetTitle: 'Monthly Target',
    monthlyTarget: 30,
    targetCompletedJobs: 0,
  });
  const [workerProfile, setWorkerProfile] = useState({
    name: 'Worker',
    photo: null,
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState(null);

  // Keep the page background in sync with the worker theme, same as every
  // other worker screen.
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

  const getCurrentPosition = () => new Promise((resolve, reject) => {
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

  const stopLocationTracking = () => {
    if (locationWatchId) {
      clearInterval(locationWatchId);
      setLocationWatchId(null);
    }
  };

  const startLocationTracking = () => {
    stopLocationTracking();
    const intervalId = setInterval(async () => {
      try {
        const pos = await getCurrentPosition();
        await workerService.updateLocation(pos.lat, pos.lng);
      } catch (err) {
        console.warn('Background location update failed:', err.message);
      }
    }, 2 * 60 * 1000); // every 2 minutes
    setLocationWatchId(intervalId);
  };

  useEffect(() => () => stopLocationTracking(), [locationWatchId]);

  const handleToggleOnline = async () => {
    setTogglingOnline(true);
    const goingOnline = !isOnline;
    try {
      let lat, lng;
      if (goingOnline) {
        try {
          const pos = await getCurrentPosition();
          lat = pos.lat;
          lng = pos.lng;
        } catch {
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
        if (goingOnline) startLocationTracking();
        else stopLocationTracking();
      }
    } catch {
      const { toast } = await import('react-hot-toast');
      toast.error('Failed to update status');
    } finally {
      setTogglingOnline(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [profileRes, statsRes, walletRes] = await Promise.all([
        workerService.getProfile(),
        workerService.getDashboardStats(),
        workerWalletService.getWallet().catch(() => null)
      ]);

      if (profileRes.success) {
        const profile = profileRes.worker;
        setWorkerProfile({
          name: profile.name || 'Worker',
          photo: profile.profilePhoto || null,
          categories: profile.serviceCategories || (profile.serviceCategory ? [profile.serviceCategory] : []),
        });
        setIsOnline(profile.isOnline || false);
      }

      if (statsRes.success) {
        const {
          todayEarnings, pendingJobs, acceptedJobs, completedJobs,
          targetCompletedJobs, monthlyTarget, rating
        } = statsRes.data;
        setStats(prev => ({
          ...prev,
          todayEarnings: todayEarnings || 0,
          pendingJobs: pendingJobs || 0,
          acceptedJobs: acceptedJobs || 0,
          completedJobs: completedJobs || 0,
          targetCompletedJobs: targetCompletedJobs || 0,
          targetTitle: statsRes.data.targetTitle || 'Monthly Target',
          monthlyTarget: monthlyTarget || 30,
          rating: rating || 0,
          walletBalance: walletRes?.success ? (walletRes.data?.balance || 0) : prev.walletBalance
        }));
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    registerFCMToken('worker', true).catch(err => console.error('FCM registration failed:', err));

    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('workerJobsUpdated', handleUpdate);
    return () => window.removeEventListener('workerJobsUpdated', handleUpdate);
  }, []);

  const banner = getBanner(workerProfile.categories);
  const BannerIcon = banner.icon;
  const targetMet = stats.targetCompletedJobs >= stats.monthlyTarget;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <LogoLoader />
      </div>
    );
  }

  // Soft, high-contrast tiles — one glance should tell a worker everything
  // that needs their attention today.
  const statTiles = [
    { label: "Today's Earnings", value: `₹${stats.todayEarnings.toLocaleString()}`, icon: FiBriefcase, bg: 'bg-violet-50', fg: 'text-violet-600', onClick: () => navigate('/worker/wallet') },
    { label: 'Pending Alerts', value: stats.pendingJobs, icon: FiBell, bg: 'bg-sky-50', fg: 'text-sky-600', onClick: () => navigate('/worker/jobs') },
    { label: 'Active Jobs', value: stats.acceptedJobs, icon: FiTool, bg: 'bg-emerald-50', fg: 'text-emerald-600', onClick: () => navigate('/worker/jobs') },
    { label: 'My Services', value: workerProfile.categories.length, icon: FiGrid, bg: 'bg-amber-50', fg: 'text-amber-600', onClick: () => navigate('/worker/profile') },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <div
          onClick={() => navigate('/worker/profile')}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 cursor-pointer"
          style={{ background: themeColors.brand.teal }}
        >
          {workerProfile.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1" />

        {/* Online / Offline toggle */}
        <button
          onClick={handleToggleOnline}
          disabled={togglingOnline}
          className="flex items-center gap-2 px-1"
        >
          <span className={`text-xs font-bold ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
            {togglingOnline ? 'Updating…' : (isOnline ? 'Online' : 'Offline')}
          </span>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isOnline ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>

        {/* Notifications */}
        <button onClick={() => navigate('/worker/notifications')} className="relative w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <FiBell className="w-4 h-4 text-gray-600" />
          {stats.pendingJobs > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
              {stats.pendingJobs > 9 ? '9+' : stats.pendingJobs}
            </span>
          )}
        </button>

        {/* Avatar */}
        <button onClick={() => navigate('/worker/profile')} className="w-9 h-9 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center shrink-0">
          {workerProfile.photo ? (
            <OptimizedImage src={workerProfile.photo} alt={workerProfile.name} className="w-full h-full object-cover" width={36} height={36} />
          ) : (
            <FiUser className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      <main className="px-4 space-y-5">
        {/* Category banner */}
        <div className={`rounded-2xl p-5 bg-gradient-to-br ${banner.gradient} text-white relative overflow-hidden`}>
          <BannerIcon className="absolute -right-3 -bottom-3 w-24 h-24 opacity-10" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <BannerIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold leading-tight uppercase tracking-tight">{banner.label}</h2>
              <p className="text-white/70 text-xs font-medium mt-0.5">Keep your profile online to receive new job requests</p>
            </div>
          </div>
        </div>

        {/* Incomplete profile nudge */}
        {(!workerProfile.categories || workerProfile.categories.length === 0) && (
          <button
            onClick={() => navigate('/worker/profile')}
            className="w-full text-left bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3"
          >
            <FiClock className="w-5 h-5 text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-blue-700">Complete your profile to start receiving jobs</span>
          </button>
        )}

        {/* 2x2 stat grid */}
        <div className="grid grid-cols-2 gap-3">
          {statTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.label}
                onClick={tile.onClick}
                className={`text-left rounded-2xl p-4 ${tile.bg} active:scale-95 transition-transform`}
              >
                <Icon className={`w-5 h-5 ${tile.fg} mb-3`} />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{tile.label}</p>
                <p className="text-xl font-extrabold text-gray-900 mt-0.5">{tile.value}</p>
              </button>
            );
          })}
        </div>

        {/* Performance */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2 px-1">Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 bg-emerald-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Target Met</span>
                <FiTarget className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{stats.targetCompletedJobs}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">
                Completed Jobs {targetMet ? '· Bonus Unlocked 🎉' : `(of ${stats.monthlyTarget})`}
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-amber-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Rating</span>
                <FiStar className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{stats.rating ? stats.rating.toFixed(1) : 'N/A'}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">Average Rating</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
