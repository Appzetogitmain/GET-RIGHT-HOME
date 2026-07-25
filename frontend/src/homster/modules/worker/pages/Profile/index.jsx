import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiEdit2, FiMapPin, FiStar, FiChevronRight, FiLogOut, FiCreditCard, FiFileText, FiBookOpen, FiUsers, FiMessageSquare, FiHelpCircle, FiSettings, FiAward } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { workerTheme as themeColors } from '../../../../theme';
import { workerAuthService } from '../../../../services/authService';
import workerService from '../../../../services/workerService';
import BottomNav from '../../components/layout/BottomNav';
import LogoLoader from '../../../../components/common/LogoLoader';

const Profile = () => {
  const navigate = useNavigate();
  // Initialize with empty/default values - will be loaded from localStorage
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

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

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [response, statsRes] = await Promise.all([
          workerAuthService.getProfile(),
          workerService.getDashboardStats()
        ]);
        
        if (statsRes.success) {
          setStats(statsRes.data);
        }

        if (response.success) {
          const workerData = response.worker;
          // Format address
          const addressString = workerData.address
            ? `${workerData.address.addressLine1 || ''} ${workerData.address.addressLine2 || ''} ${workerData.address.city || ''} ${workerData.address.state || ''} ${workerData.address.pincode || ''}`.trim() || 'Not set'
            : 'Not set';

          setProfile({
            name: workerData.name || 'Worker Name',
            phone: workerData.phone || '',
            email: workerData.email || '',
            address: addressString,
            rating: workerData.rating || 0,
            totalJobs: workerData.totalJobs || 0,
            completedJobs: workerData.completedJobs || 0,
            serviceCategories: workerData.serviceCategories || (workerData.serviceCategory ? [workerData.serviceCategory] : []),
            photo: workerData.profilePhoto || null,
            isPhoneVerified: workerData.isPhoneVerified || false,
            isEmailVerified: workerData.isEmailVerified || false
          });
          localStorage.setItem('workerData', JSON.stringify(workerData));
        } else {
          setError(response.message || 'Failed to fetch profile');
          toast.error(response.message || 'Failed to fetch profile');
          // Fallback to local storage if API fails
          const localWorkerData = JSON.parse(localStorage.getItem('workerData') || '{}');
          if (localWorkerData && Object.keys(localWorkerData).length > 0) {
            setProfile({
              name: localWorkerData.name || 'Worker Name',
              phone: localWorkerData.phone || '',
              email: localWorkerData.email || '',
              address: 'Not set',
              rating: localWorkerData.rating || 0,
              totalJobs: localWorkerData.totalJobs || 0,
              completedJobs: localWorkerData.completedJobs || 0,
              serviceCategories: localWorkerData.serviceCategories || (localWorkerData.serviceCategory ? [localWorkerData.serviceCategory] : []),
              photo: localWorkerData.profilePhoto || null
            });
            toast('Loaded profile from local storage (API failed)');
          }
        }
      } catch (err) {
        console.error('Error fetching worker profile:', err);
        setError(err.response?.data?.message || 'Failed to fetch profile');
        toast.error(err.response?.data?.message || 'Failed to fetch profile');
        // Fallback to local storage if API fails
        const localWorkerData = JSON.parse(localStorage.getItem('workerData') || '{}');
        if (localWorkerData && Object.keys(localWorkerData).length > 0) {
          setProfile({
            name: localWorkerData.name || 'Worker Name',
            phone: localWorkerData.phone || '',
            email: localWorkerData.email || '',
            address: 'Not set',
            rating: localWorkerData.rating || 0,
            totalJobs: localWorkerData.totalJobs || 0,
            completedJobs: localWorkerData.completedJobs || 0,
            serviceCategories: localWorkerData.serviceCategories || (localWorkerData.serviceCategory ? [localWorkerData.serviceCategory] : []),
            photo: localWorkerData.profilePhoto || null
          });
          toast('Loaded profile from local storage (API failed)');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await workerAuthService.logout();
      toast.success('Logged out successfully');
      navigate('/worker/login');
    } catch (error) {
      // Even if API call fails, clear local storage
      localStorage.removeItem('workerAccessToken');
      localStorage.removeItem('workerRefreshToken');
      localStorage.removeItem('workerData');
      toast.success('Logged out successfully');
      navigate('/worker/login');
    }
  };

  if (isLoading) {
    return <LogoLoader />;
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: themeColors.backgroundGradient }}>
        <div className="text-center p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error loading profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:opacity-90"
            style={{ backgroundColor: themeColors.button }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Calculate dynamic values from stats if available, otherwise fallback to profile
  const completedJobs = stats?.completedJobs ?? profile?.completedJobs ?? 0;
  const cancelledJobs = stats?.cancelledJobs ?? 0;
  const rating = stats?.rating ?? profile?.rating ?? 0;
  
  const completionPercentage = (completedJobs + cancelledJobs) > 0 
    ? Math.round((completedJobs / (completedJobs + cancelledJobs)) * 100) 
    : (profile?.totalJobs > 0 ? Math.round((profile.completedJobs / profile.totalJobs) * 100) : 100);

  // Compute Highest Earned Achievement for the Badge
  let highestAchievement = null;
  if (stats?.workerAchievements && stats.workerAchievements.length > 0) {
    const earned = stats.workerAchievements.filter(a => completedJobs >= a.jobThreshold);
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

  const menuItems = [
    { icon: FiCreditCard, label: 'Digital ID Card', path: '/worker/digital-id' },
    { icon: FiFileText, label: 'My Documents', path: '/worker/documents' },
    { icon: FiBookOpen, label: 'Training Center', path: '/worker/training' },
    { icon: FiUsers, label: 'Referrals', path: '/worker/referrals' },
    { icon: FiMessageSquare, label: 'Complaint Management', path: '/worker/complaints' },
    { icon: FiHelpCircle, label: 'Help Center', path: '/worker/support' },
    { icon: FiSettings, label: 'Settings', path: '/worker/settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Orange Header */}
      <div className="bg-[#E85D04] rounded-b-[40px] pt-8 pb-16 px-4 relative">
        {/* Edit Profile Button */}
        <button
          onClick={() => navigate('/worker/profile/edit')}
          className="absolute top-6 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all active:scale-95 border border-white/20"
        >
          <FiEdit2 className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col items-center">
          {/* Profile Picture */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiUser className="w-12 h-12 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
            {/* Check badge */}
            <div className="absolute bottom-0 right-1 w-6 h-6 bg-[#E85D04] rounded-full border-2 border-white flex items-center justify-center">
              <FiStar className="w-3 h-3 text-white fill-white" />
            </div>
          </div>

          {/* Name & Badge */}
          <h2 className="text-2xl font-extrabold text-white mb-2">{profile.name}</h2>
          {highestAchievement ? (
            <div className={`${getTierColor(highestAchievement.tier)} text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 mb-3`}>
              <FiAward className="w-3 h-3" /> {highestAchievement.tier} Partner
            </div>
          ) : (
            <div className="bg-[#CD7F32] text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 mb-3">
              <FiAward className="w-3 h-3" /> Bronze Partner
            </div>
          )}

          {/* Categories & Location */}
          <p className="text-white text-xs font-semibold mb-1">
            {profile.serviceCategories && profile.serviceCategories.length > 0
              ? profile.serviceCategories.join(' • ')
              : 'Services not set'}
          </p>
          <div className="flex items-center gap-1 text-white text-xs opacity-90">
            <FiMapPin className="w-3 h-3" /> {profile.address ? profile.address.split(' ')[0] : 'Location not set'}
          </div>
        </div>
      </div>

      {/* Stats Cards - Overlapping the header */}
      <div className="px-4 -mt-10 relative z-10 mb-6">
        <div className="flex justify-between gap-3">
          <div className="flex-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-50">
            <p className="text-xl font-bold text-[#1E3A8A] mb-1">{completedJobs}</p>
            <p className="text-[10px] font-medium text-gray-500">Jobs Done</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-50">
            <p className="text-xl font-bold text-[#1E3A8A] mb-1 flex items-center gap-1">
              <FiStar className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" /> {rating ? rating.toFixed(1) : '0.0'}
            </p>
            <p className="text-[10px] font-medium text-gray-500">Rating</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-50">
            <p className="text-xl font-bold text-[#1E3A8A] mb-1">{completionPercentage}%</p>
            <p className="text-[10px] font-medium text-gray-500">Completion</p>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-3xl p-2 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-gray-50">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                onClick={() => navigate(item.path)}
                className={`flex items-center justify-between p-3 cursor-pointer active:bg-gray-50 rounded-2xl transition-colors ${index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF0D9] text-[#E85D04] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[#1E3A8A] font-semibold text-sm">{item.label}</span>
                </div>
                <FiChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-8">
        <button
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
          className="w-full bg-[#FFE4E6] text-[#E11D48] rounded-2xl p-4 flex items-center justify-center gap-2 font-bold transition-all active:scale-95 border border-[#FECDD3]"
        >
          <FiLogOut className="w-5 h-5" /> Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;


