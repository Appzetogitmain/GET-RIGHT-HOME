import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiEdit2, FiMapPin, FiStar, FiChevronRight, FiChevronDown, FiLogOut, FiCreditCard, FiFileText, FiBookOpen, FiUsers, FiMessageSquare, FiHelpCircle, FiSettings, FiAward, FiPhone, FiMail, FiCheckCircle, FiGrid } from 'react-icons/fi';
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
  const [categoriesOpen, setCategoriesOpen] = useState(false);

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
            city: workerData.address?.city || '',
            state: workerData.address?.state || '',
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
              city: localWorkerData.address?.city || '',
              state: localWorkerData.address?.state || '',
              rating: localWorkerData.rating || 0,
              totalJobs: localWorkerData.totalJobs || 0,
              completedJobs: localWorkerData.completedJobs || 0,
              serviceCategories: localWorkerData.serviceCategories || (localWorkerData.serviceCategory ? [localWorkerData.serviceCategory] : []),
              photo: localWorkerData.profilePhoto || null,
              isPhoneVerified: localWorkerData.isPhoneVerified || false,
              isEmailVerified: localWorkerData.isEmailVerified || false
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
            city: localWorkerData.address?.city || '',
            state: localWorkerData.address?.state || '',
            rating: localWorkerData.rating || 0,
            totalJobs: localWorkerData.totalJobs || 0,
            completedJobs: localWorkerData.completedJobs || 0,
            serviceCategories: localWorkerData.serviceCategories || (localWorkerData.serviceCategory ? [localWorkerData.serviceCategory] : []),
            photo: localWorkerData.profilePhoto || null,
            isPhoneVerified: localWorkerData.isPhoneVerified || false,
            isEmailVerified: localWorkerData.isEmailVerified || false
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
          <h2 className="text-base font-bold text-gray-800 mb-2">Error loading profile</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:opacity-90"
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

  const locationLabel = profile.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ''}`
    : 'Location not set';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-[#3B82F6] rounded-b-[32px] pt-8 pb-16 px-4 relative">
        {/* Edit Profile Button */}
        <button
          onClick={() => navigate('/worker/profile/edit')}
          className="absolute top-6 right-4 w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full backdrop-blur-sm transition-all active:scale-95 border border-white/20"
        >
          <FiEdit2 className="w-4 h-4 text-white" />
        </button>

        <div className="flex flex-col items-center">
          {/* Profile Picture */}
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full border-[3px] border-white overflow-hidden bg-white shadow-lg flex items-center justify-center">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiUser className="w-9 h-9 text-gray-300" />
              )}
            </div>
          </div>

          {/* Name & Badge */}
          <h2 className="text-lg font-bold text-white mb-1.5 text-center px-6">{profile.name}</h2>
          {highestAchievement ? (
            <div className={`${getTierColor(highestAchievement.tier)} text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex items-center gap-1 mb-3`}>
              <FiAward className="w-3 h-3" /> {highestAchievement.tier} Partner
            </div>
          ) : (
            <div className="bg-[#CD7F32] text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex items-center gap-1 mb-3">
              <FiAward className="w-3 h-3" /> Bronze Partner
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <FiMapPin className="w-3 h-3" /> {locationLabel}
          </div>
        </div>
      </div>

      {/* Stats Cards - Overlapping the header */}
      <div className="px-4 -mt-10 relative z-10 mb-4">
        <div className="flex justify-between gap-3">
          <div className="flex-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-50">
            <p className="text-lg font-bold text-[#1E3A8A] mb-0.5">{completedJobs}</p>
            <p className="text-[10px] font-medium text-gray-500">Jobs Done</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-50">
            <p className="text-lg font-bold text-[#1E3A8A] mb-0.5 flex items-center gap-1">
              <FiStar className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" /> {rating ? rating.toFixed(1) : '0.0'}
            </p>
            <p className="text-[10px] font-medium text-gray-500">Rating</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-50">
            <p className="text-lg font-bold text-[#1E3A8A] mb-0.5">{completionPercentage}%</p>
            <p className="text-[10px] font-medium text-gray-500">Completion</p>
          </div>
        </div>
      </div>

      {/* Category */}
      <div className="px-4 mb-4">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Category</h3>
        <div className="bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-gray-50 overflow-hidden">
          <button
            onClick={() => setCategoriesOpen(prev => !prev)}
            className="w-full flex items-center justify-between p-3.5 active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0">
                <FiGrid className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-gray-800">
                {profile.serviceCategories?.length > 0
                  ? `${profile.serviceCategories.length} ${profile.serviceCategories.length === 1 ? 'Category' : 'Categories'}`
                  : 'No categories set'}
              </span>
            </div>
            {profile.serviceCategories?.length > 0 && (
              <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {categoriesOpen && profile.serviceCategories?.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3.5 pb-3.5 pt-0.5 border-t border-gray-50">
              {profile.serviceCategories.map((cat, idx) => (
                <span key={idx} className="text-xs font-semibold text-[#3B82F6] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact Details */}
      <div className="px-4 mb-4">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Contact Details</h3>
        <div className="bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-gray-50 divide-y divide-gray-50">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0">
              <FiPhone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{profile.phone || 'Not added'}</p>
              <p className="text-[11px] text-gray-400">Mobile Number</p>
            </div>
            {profile.phone && (
              profile.isPhoneVerified ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 shrink-0">
                  <FiCheckCircle className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-500 shrink-0">Unverified</span>
              )
            )}
          </div>

          <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0">
              <FiMail className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{profile.email || 'Not added'}</p>
              <p className="text-[11px] text-gray-400">Email Address</p>
            </div>
            {profile.email && (
              profile.isEmailVerified ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 shrink-0">
                  <FiCheckCircle className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-500 shrink-0">Unverified</span>
              )
            )}
          </div>

          <div className="flex items-start gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0">
              <FiMapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{profile.address && profile.address !== 'Not set' ? profile.address : 'Not added'}</p>
              <p className="text-[11px] text-gray-400">Service Address</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-4 pb-6">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Account</h3>
        <div className="bg-white rounded-2xl p-1.5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-gray-50">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(item.path)}
                className={`flex items-center justify-between p-3 cursor-pointer active:bg-gray-50 rounded-xl transition-colors ${index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-gray-800 font-semibold text-sm">{item.label}</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-gray-400" />
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
          className="w-full bg-[#FFE4E6] text-[#E11D48] rounded-2xl p-3.5 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 border border-[#FECDD3]"
        >
          <FiLogOut className="w-4 h-4" /> Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;


