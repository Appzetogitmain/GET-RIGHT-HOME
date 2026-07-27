import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight, Check, Loader2, Phone, User } from 'lucide-react';
import { api } from '../../services/apiService';
import { categoryService } from '../../services/categoryService';
import toast from 'react-hot-toast';
import RoleSelectionSheet from '../../components/user/RoleSelectionSheet';

const ListPropertyWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isLoggedIn = !!user;

  // Clear any unsaved/draft property listings when starting fresh
  useEffect(() => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('draft_property_') || key.includes('_wizard_draft_new'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, []);

  // State
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [intent, setIntent] = useState('Sell'); // Sell, Rent / Lease, Paying Guest
  const [propertyCategory, setPropertyCategory] = useState('Residential'); // Residential, Commercial
  const [selectedType, setSelectedType] = useState('');
  const [selectedSubType, setSelectedSubType] = useState('');
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [dynamicTypes, setDynamicTypes] = useState([]);
  const [listingForm, setListingForm] = useState({
    name: '',
    phone: '',
    otp: '',
    role: 'owner'
  });
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Fetch dynamic types from DB that Admin might have added
  useEffect(() => {
    const fetchDynamicConfigs = async () => {
      try {
        const res = await api.get('/property-forms/configs');
        if (res.data.success) {
          // Store the raw configs to extract types later
          setDynamicTypes(res.data.configs);
        }
      } catch (err) {
        console.error("Error fetching dynamic configs", err);
      }
    };
    fetchDynamicConfigs();
  }, []);

  // Static Base Options for Step 1
  const intentOptions = user?.role === 'builder' ? ['Sell'] : ['Sell', 'Rent / Lease', 'Paying Guest'];
  const categoryOptions = ['Residential', 'Commercial'];

  const residentialTypes = [
    'Apartment', 'Independent House / Villa', 'Builder Floor',
    'Plot / Land', '1 RK/ Studio Apartment', 'Serviced Apartment',
    'Farmhouse', 'Other'
  ];

  const commercialCategories = [
    { label: 'Office', subTypes: ['Ready to move office space', 'Bare shell office space', 'Co-working office space'] },
    { label: 'Retail', subTypes: ['Commercial Shops', 'Commercial Showrooms'] },
    { label: 'Plot / Land', subTypes: ['Commercial Land/Inst. Land', 'Agricultural/Farm Land', 'Industrial Lands/Plots'] },
    { label: 'Storage', subTypes: ['Ware House', 'Cold Storage'] },
    { label: 'Industry', subTypes: ['Factory', 'Manufacturing'] },
    { label: 'Hospitality', subTypes: ['Hotel/Resorts', 'Guest-House/Banquet-Halls'] },
    { label: 'Other', subTypes: [] }
  ];

  const pgResidentialTypes = [
    'Apartment', 'Independent House / Villa', 'Builder Floor',
    '1 RK / Studio Apartment', 'Serviced Apartment'
  ];

  let baseTypes = [];
  if (intent === 'Paying Guest' && propertyCategory === 'Residential') {
    baseTypes = pgResidentialTypes;
  } else if (propertyCategory === 'Commercial') {
    baseTypes = commercialCategories.map(c => c.label);
  } else {
    baseTypes = residentialTypes.filter(t => !(intent === 'Rent / Lease' && t === 'Plot / Land'));
  }

  // Merge with dynamic types from DB (Admin added)
  const getMergedTypes = () => {
    const configForIntent = dynamicTypes.find(c => c.transactionType === intent);
    if (!configForIntent) return baseTypes;

    const configForCat = configForIntent.categories.find(c => c.category === propertyCategory);
    if (!configForCat) return baseTypes;

    // Add types from DB that aren't already in our static list
    const dbTypes = configForCat.propertyTypes;
    const combined = [...baseTypes];
    
    // Collect all sub-types to filter them out of main types if we are in Commercial
    const allCommercialSubtypes = propertyCategory === 'Commercial'
      ? commercialCategories.flatMap(c => c.subTypes)
      : [];

    dbTypes.forEach(type => {
      // If it is a commercial subtype, do not list it as a main type
      if (allCommercialSubtypes.includes(type)) return;
      if (!combined.includes(type)) combined.push(type);
    });
    return combined;
  };

  const currentTypes = getMergedTypes();

  // Reset showMoreTypes when category changes
  useEffect(() => {
    setShowMoreTypes(false);
    setSelectedType('');
    setSelectedSubType('');
    if (user?.role === 'builder') {
      setIntent('Sell');
    }
  }, [intent, propertyCategory, user?.role]);

  const visibleTypes = showMoreTypes ? currentTypes : currentTypes.slice(0, 5);
  const hiddenCount = currentTypes.length - 5;

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSelectedSubType(''); // Reset sub-type when main type changes
  };

  const getSubTypes = () => {
    if (propertyCategory !== 'Commercial') return [];
    const cat = commercialCategories.find(c => c.label === selectedType);
    return cat ? cat.subTypes : [];
  };

  const subTypes = getSubTypes();

  const handleSendOtp = async () => {
    if (!listingForm.phone) {
      toast.error("Please enter your mobile number");
      return;
    }
    setSendingOtp(true);
    try {
      await api.post('/auth/send-otp', { phone: listingForm.phone, type: 'login', role: listingForm.role });
      setOtpSent(true);
      toast.success("OTP sent successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.reload();
  };

  const handleNext = async () => {
    if (!intent || !propertyCategory || !selectedType) {
      toast.error('Please select all details to continue');
      return;
    }

    if (!isLoggedIn) {
      if (!listingForm.name.trim()) {
        toast.error('Please enter your name');
        return;
      }
      if (!listingForm.phone.trim()) {
        toast.error('Please enter your mobile number');
        return;
      }
      if (!listingForm.otp.trim()) {
        toast.error('Please enter the OTP received');
        return;
      }
      setLoading(true);
      try {
        const res = await api.post('/auth/lazy-listing-login', {
          name: listingForm.name,
          phone: listingForm.phone,
          role: listingForm.role,
          otp: listingForm.otp
        });
        if (res.data.success) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          toast.success('Authenticated successfully!');
          
          // Re-fetch user in local scope
          const uStr = localStorage.getItem('user');
          const u = uStr ? JSON.parse(uStr) : null;
          
          if (u && (u.role === 'owner' || u.role === 'broker' || u.role === 'builder')) {
            proceedToWizard();
          } else {
            setShowRoleSheet(true);
          }
        } else {
          toast.error(res.data.message || 'Authentication failed');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Check if user already has a role
    if (user && (user.role === 'owner' || user.role === 'broker' || user.role === 'builder')) {
      proceedToWizard();
    } else {
      setShowRoleSheet(true);
    }
  };

  const handleRoleSelect = async (role, builderData = null) => {
    setRoleLoading(true);
    try {
      const payload = { role };
      if (builderData) {
        payload.builderData = builderData;
      }
      const res = await api.put('/users/role', payload);
      if (res.data.success) {
        // Update local user
        const updatedUser = { ...user, role: res.data.user.role };
        if (res.data.user.builderProfile) {
          updatedUser.builderProfile = res.data.user.builderProfile;
        }
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success(`Welcome ${role}!`);
        setShowRoleSheet(false);
        proceedToWizard();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setRoleLoading(false);
    }
  };

  const proceedToWizard = () => {
    // Navigate to the dynamic multistep engine
    navigate(`/list-property/dynamic-form`, { 
      state: { 
        transactionType: intent, 
        category: propertyCategory, 
        propertyType: selectedType,
        propertySubType: selectedSubType
      } 
    });
  };

  const entityType = user?.role === 'builder' ? 'project' : 'property';

  return (
    <div className="min-h-screen bg-white pb-10 font-sans antialiased text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-slate-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Add Basic Details</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">STEP 1 OF {user?.role === 'builder' ? '7' : '4'}</p>

        {/* Intent Selection */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">You're looking to?</h2>
          <div className="flex flex-wrap gap-2.5">
            {intentOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setIntent(opt);
                  if (opt === 'Paying Guest') setPropertyCategory('Residential');
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all border ${
                  intent === opt
                    ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Property Category */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">What kind of {entityType}?</h2>
          <div className="flex gap-2.5">
            {categoryOptions.map((opt) => (
              <button
                key={opt}
                disabled={intent === 'Paying Guest' && opt === 'Commercial'}
                onClick={() => setPropertyCategory(opt)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all border ${
                  propertyCategory === opt
                    ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 disabled:opacity-30'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Property Type Grid */}
        <section className="mb-8">
          <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">Select {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Type</h2>
          <div className="flex flex-wrap gap-2">
            {visibleTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
                  selectedType === type
                    ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
            {!showMoreTypes && hiddenCount > 0 && (
              <button 
                onClick={() => setShowMoreTypes(true)}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold text-[#0073E6] border-none bg-transparent hover:bg-blue-50/50"
              >
                + {hiddenCount} more
              </button>
            )}
          </div>
        </section>

        {/* Commercial Sub-types */}
        {propertyCategory === 'Commercial' && subTypes.length > 0 && (
          <section className="mb-10 animate-in fade-in slide-in-from-top-2 duration-300">
            <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">What kind of {selectedType} is it?</h2>
            <div className="flex flex-wrap gap-2">
              {subTypes.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubType(sub)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
                    selectedSubType === sub
                      ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Contact Details Card */}
        {user ? (
          <section className="mb-12">
            <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">Your contact details</h2>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm overflow-hidden">
                  {(user.profileImage || user.avatar || user.photo) ? (
                    <img src={user.profileImage || user.avatar || user.photo} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name ? user.name.charAt(0).toUpperCase() : <User size={18} />
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Posting {entityType} as {user.name}</p>
                  <p className="text-[11px] text-slate-500 font-semibold">+91 {user.phone}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="text-[11px] font-bold text-[#0073E6] hover:underline bg-transparent border-none cursor-pointer"
              >
                Change Account
              </button>
            </div>
            {user.role !== 'owner' && user.role !== 'broker' && user.role !== 'builder' && (
              <p className="mt-3 text-[11px] text-slate-500 font-medium">
                Note: You'll be asked to choose your posting role (Owner/Broker/Builder) next.
              </p>
            )}
          </section>
        ) : (
          <section className="mb-12 space-y-4">
            <h2 className="text-[15px] font-bold text-[#000000] mb-2 tracking-tight">Your contact details</h2>
            <p className="text-[11px] text-slate-500 font-medium -mt-2">Enter your details to create an account & start posting</p>
            
            {/* Name input */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 relative focus-within:border-[#0073E6] transition-all">
              <label className="text-[10px] text-slate-400 font-bold block mb-1">YOUR NAME</label>
              <input
                type="text"
                value={listingForm.name}
                onChange={(e) => setListingForm({ ...listingForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full bg-transparent outline-none text-[13px] font-semibold text-slate-800"
              />
            </div>

            {/* Mobile input */}
            <div className="flex gap-2">
              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 relative focus-within:border-[#0073E6] transition-all">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">MOBILE NUMBER</label>
                <div className="flex items-center">
                  <span className="text-[13px] text-slate-500 font-bold mr-1.5">+91</span>
                  <input
                    type="tel"
                    value={listingForm.phone}
                    onChange={(e) => setListingForm({ ...listingForm, phone: e.target.value })}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full bg-transparent outline-none text-[13px] font-bold tracking-wide text-slate-800"
                  />
                </div>
              </div>
              
              <button
                type="button"
                disabled={sendingOtp || !listingForm.phone || listingForm.phone.length < 10}
                onClick={handleSendOtp}
                className="px-4 bg-blue-50 text-[#0073E6] hover:bg-blue-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {sendingOtp ? <Loader2 className="animate-spin" size={16} /> : otpSent ? 'Resend' : 'Send OTP'}
              </button>
            </div>

            {/* OTP input */}
            {otpSent && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 relative focus-within:border-[#0073E6] transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">ENTER OTP</label>
                <input
                  type="text"
                  value={listingForm.otp}
                  onChange={(e) => setListingForm({ ...listingForm, otp: e.target.value })}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-transparent outline-none text-[13px] font-bold tracking-widest text-slate-800"
                />
                <span className="absolute right-3 bottom-3 text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  Test OTP: 123456
                </span>
              </div>
            )}

            {/* Role selection */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Select Posting Role</label>
              <div className="flex flex-wrap gap-2.5">
                <label className={`flex-1 min-w-[140px] flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-all ${listingForm.role === 'owner' ? 'border-[#0073E6] bg-blue-50/20' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="listingRole"
                      checked={listingForm.role === 'owner'}
                      onChange={() => setListingForm({ ...listingForm, role: 'owner' })}
                      className="accent-[#0073E6]"
                    />
                    <span className="text-[12px] font-bold text-slate-700">Property Owner</span>
                  </div>
                </label>
                
                <label className={`flex-1 min-w-[140px] flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-all ${listingForm.role === 'broker' ? 'border-[#0073E6] bg-blue-50/20' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="listingRole"
                      checked={listingForm.role === 'broker'}
                      onChange={() => setListingForm({ ...listingForm, role: 'broker' })}
                      className="accent-[#0073E6]"
                    />
                    <span className="text-[12px] font-bold text-slate-700">Broker / Agent</span>
                  </div>
                </label>

                <label className={`flex-1 min-w-[140px] flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-all ${listingForm.role === 'builder' ? 'border-[#0073E6] bg-blue-50/20' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="listingRole"
                      checked={listingForm.role === 'builder'}
                      onChange={() => setListingForm({ ...listingForm, role: 'builder' })}
                      className="accent-[#0073E6]"
                    />
                    <span className="text-[12px] font-bold text-slate-700">Builder Partner</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="mt-3 px-1 text-[11px] text-slate-500 font-semibold">
              Already have an account? <button onClick={() => navigate('/login')} className="font-bold text-[#0073E6] hover:underline">Login</button>
            </div>
          </section>
        )}

        {/* Next Button */}
        <div className="mt-12 mb-10">
          <button
            onClick={handleNext}
            className="w-full bg-[#0073E6] text-white font-bold py-3.5 rounded-lg active:scale-[0.98] transition-all flex items-center justify-center text-[15px]"
          >
            Next
          </button>
        </div>
      </div>

      <RoleSelectionSheet
        isOpen={showRoleSheet}
        onClose={() => setShowRoleSheet(false)}
        onSelect={handleRoleSelect}
        loading={roleLoading}
      />
    </div>
  );
};

export default ListPropertyWizard;
