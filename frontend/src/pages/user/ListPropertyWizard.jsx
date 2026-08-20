import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, ChevronRight, Check, Loader2, Phone, User,
  Tag, Key, BedDouble, Home, Building2, Users2, ShieldCheck
} from 'lucide-react';
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

  // Builders already have a dedicated 15-step project stepper, so skip this
  // basic-details screen entirely and jump straight in. Defaults to a
  // Residential project unless the caller (e.g. the builder dashboard's
  // "Add Commercial Project" button) explicitly asked for Commercial via
  // location.state.category.
  useEffect(() => {
    if (user?.role === 'builder') {
      const requestedCategory = location.state?.category === 'Commercial' ? 'Commercial' : 'Residential';
      navigate('/list-property/dynamic-form', {
        replace: true,
        state: {
          transactionType: 'Sell',
          category: requestedCategory,
          propertyType: requestedCategory === 'Commercial' ? 'Other' : 'Apartment'
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

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

  const intentIcons = { 'Sell': Tag, 'Rent / Lease': Key, 'Paying Guest': BedDouble };
  const categoryIcons = { 'Residential': Home, 'Commercial': Building2 };
  const roleCards = [
    { value: 'owner', label: 'Property Owner', hint: 'I own the property', icon: Home },
    { value: 'broker', label: 'Broker / Agent', hint: 'I represent a client', icon: Users2 },
    { value: 'builder', label: 'Builder Partner', hint: 'I develop projects', icon: Building2 }
  ];

  const canSubmit = !!(intent && propertyCategory && selectedType);

  const sectionMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25 }
  };

  if (user?.role === 'builder') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-[#0073E6]" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans antialiased text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 h-16 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0073E6]">
            {entityType === 'project' ? <Building2 size={16} strokeWidth={2.5} /> : <Home size={16} strokeWidth={2.5} />}
          </div>
          <span className="text-[13px] font-bold text-slate-800">List Your {entityType.charAt(0).toUpperCase() + entityType.slice(1)}</span>
        </div>
      </div>

      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-5 md:px-6 pt-8">
        <div className="mb-8">
          <p className="text-[11px] font-bold text-[#0073E6] uppercase tracking-widest mb-2">Get Started</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Add Basic Details</h1>
          <p className="text-[13px] text-slate-500 font-medium mt-1.5">Tell us a bit about your {entityType} to begin.</p>
        </div>

        {/* Intent Selection */}
        <motion.section {...sectionMotion} className="mb-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-[14px] font-bold text-slate-900 mb-4 tracking-tight">You're looking to?</h2>
          <div className="flex flex-wrap gap-2.5">
            {intentOptions.map((opt) => {
              const Icon = intentIcons[opt] || Tag;
              const active = intent === opt;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    setIntent(opt);
                    if (opt === 'Paying Guest') setPropertyCategory('Residential');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${
                    active
                      ? 'bg-[#0073E6] text-white border-[#0073E6] shadow-md shadow-blue-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon size={14} strokeWidth={2.5} />
                  {opt}
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Property Category */}
        <motion.section {...sectionMotion} className="mb-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-[14px] font-bold text-slate-900 mb-4 tracking-tight">What kind of {entityType}?</h2>
          <div className="flex gap-2.5">
            {categoryOptions.map((opt) => {
              const Icon = categoryIcons[opt] || Home;
              const active = propertyCategory === opt;
              const disabled = intent === 'Paying Guest' && opt === 'Commercial';
              return (
                <button
                  key={opt}
                  disabled={disabled}
                  onClick={() => setPropertyCategory(opt)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-bold transition-all border ${
                    active
                      ? 'bg-[#0073E6] text-white border-[#0073E6] shadow-md shadow-blue-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 disabled:opacity-30'
                  }`}
                >
                  <Icon size={15} strokeWidth={2.5} />
                  {opt}
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Property Type Grid */}
        <motion.section {...sectionMotion} className="mb-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-[14px] font-bold text-slate-900 mb-4 tracking-tight">Select {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Type</h2>
          <div className="flex flex-wrap gap-2">
            {visibleTypes.map((type) => {
              const active = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all border ${
                    active
                      ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {active && <Check size={12} strokeWidth={3} />}
                  {type}
                </button>
              );
            })}
            {!showMoreTypes && hiddenCount > 0 && (
              <button
                onClick={() => setShowMoreTypes(true)}
                className="px-3.5 py-2 rounded-full text-[12px] font-bold text-[#0073E6] border border-dashed border-blue-200 bg-transparent hover:bg-blue-50/50"
              >
                + {hiddenCount} more
              </button>
            )}
          </div>
        </motion.section>

        {/* Commercial Sub-types */}
        {propertyCategory === 'Commercial' && subTypes.length > 0 && (
          <motion.section {...sectionMotion} className="mb-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-[14px] font-bold text-slate-900 mb-4 tracking-tight">What kind of {selectedType} is it?</h2>
            <div className="flex flex-wrap gap-2">
              {subTypes.map((sub) => {
                const active = selectedSubType === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubType(sub)}
                    className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all border ${
                      active
                        ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {active && <Check size={12} strokeWidth={3} />}
                    {sub}
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Contact Details Card */}
        {user ? (
          <motion.section {...sectionMotion} className="mb-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-[14px] font-bold text-slate-900 mb-4 tracking-tight">Your contact details</h2>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 ring-2 ring-white flex items-center justify-center text-blue-600 font-bold text-sm overflow-hidden shadow-sm">
                  {(user.profileImage || user.avatar || user.photo) ? (
                    <img src={user.profileImage || user.avatar || user.photo} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name ? user.name.charAt(0).toUpperCase() : <User size={18} />
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                    Posting {entityType} as {user.name}
                    {(user.role === 'owner' || user.role === 'broker' || user.role === 'builder') && (
                      <ShieldCheck size={13} className="text-emerald-500" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold">+91 {user.phone}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-[11px] font-bold text-[#0073E6] hover:underline bg-transparent border-none cursor-pointer shrink-0"
              >
                Change Account
              </button>
            </div>
            {user.role !== 'owner' && user.role !== 'broker' && user.role !== 'builder' && (
              <p className="mt-3 text-[11px] text-slate-500 font-medium">
                Note: You'll be asked to choose your posting role (Owner/Broker/Builder) next.
              </p>
            )}
          </motion.section>
        ) : (
          <motion.section {...sectionMotion} className="mb-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-900 mb-1 tracking-tight">Your contact details</h2>
              <p className="text-[11px] text-slate-500 font-medium">Enter your details to create an account & start posting</p>
            </div>

            {/* Name + Mobile: stacked on mobile, side by side once there's room */}
            <div className="md:grid md:grid-cols-2 md:gap-3 space-y-4 md:space-y-0">
              {/* Name input */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 relative focus-within:border-[#0073E6] focus-within:ring-2 focus-within:ring-blue-50 transition-all">
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
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 relative focus-within:border-[#0073E6] focus-within:ring-2 focus-within:ring-blue-50 transition-all">
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
            </div>

            {/* OTP input */}
            {otpSent && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 relative focus-within:border-[#0073E6] focus-within:ring-2 focus-within:ring-blue-50 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {roleCards.map(({ value, label, hint, icon: Icon }) => {
                  const active = listingForm.role === value;
                  return (
                    <label
                      key={value}
                      className={`flex items-start gap-2.5 p-3 border rounded-xl cursor-pointer transition-all ${
                        active ? 'border-[#0073E6] bg-blue-50/40 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="listingRole"
                        checked={active}
                        onChange={() => setListingForm({ ...listingForm, role: value })}
                        className="sr-only"
                      />
                      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${active ? 'bg-[#0073E6] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon size={15} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[12px] font-bold text-slate-800">{label}</span>
                        <span className="block text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{hint}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-1 text-[11px] text-slate-500 font-semibold">
              Already have an account? <button onClick={() => navigate('/login')} className="font-bold text-[#0073E6] hover:underline">Login</button>
            </div>
          </motion.section>
        )}
      </div>

      {/* Sticky Next Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-5 md:px-6 py-4">
          <button
            onClick={handleNext}
            disabled={loading}
            className={`w-full text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px] ${
              canSubmit ? 'bg-[#0073E6] hover:bg-[#005fc2] shadow-lg shadow-blue-100' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                Next
                <ChevronRight size={18} strokeWidth={2.5} />
              </>
            )}
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
