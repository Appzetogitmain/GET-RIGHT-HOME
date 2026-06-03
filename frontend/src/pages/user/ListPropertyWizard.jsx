import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight, Check, Loader2, Phone, User, MessageCircle } from 'lucide-react';
import { api } from '../../services/apiService';
import { categoryService } from '../../services/categoryService';
import toast from 'react-hot-toast';
import RoleSelectionSheet from '../../components/user/RoleSelectionSheet';

const ListPropertyWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const token = localStorage.getItem('token');

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
  const intentOptions = ['Sell', 'Rent / Lease', 'Paying Guest'];
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
  }, [intent, propertyCategory]);

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

  const handleNext = () => {
    if (!intent || !propertyCategory || !selectedType) {
      toast.error('Please select all details to continue');
      return;
    }

    if (!token) {
      toast.error('Please login to continue');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // Check if user already has a role
    if (user && (user.role === 'owner' || user.role === 'broker')) {
      proceedToWizard();
    } else {
      setShowRoleSheet(true);
    }
  };

  const handleRoleSelect = async (role) => {
    setRoleLoading(true);
    try {
      const res = await api.put('/users/role', { role });
      if (res.data.success) {
        // Update local user
        const updatedUser = { ...user, role: res.data.user.role };
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

  return (
    <div className="min-h-screen bg-white pb-10 font-sans antialiased text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-slate-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <button className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px] uppercase tracking-wider bg-emerald-50/50 px-3 py-1.5 rounded-full border border-emerald-100">
          <MessageCircle size={14} className="fill-emerald-500/20" />
          Post via WhatsApp
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Add Basic Details</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">STEP 1 OF 4</p>

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
          <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">What kind of property?</h2>
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
          <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">Select Property Type</h2>
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
        <section className="mb-12">
          <h2 className="text-[15px] font-bold text-[#000000] mb-4 tracking-tight">Your contact details</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-0 overflow-hidden relative group mt-2 focus-within:border-[#0073E6] transition-all">
            <label className="absolute top-2 left-4 text-[10px] text-slate-500">
              Phone number / User name / E-mail
            </label>
            <div className="flex items-center px-4 pt-6 pb-2">
              <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                <span className="text-sm text-slate-600">+91</span>
                <ChevronRight size={14} className="text-slate-400 rotate-90" />
              </div>
              <input
                type="text"
                readOnly={!!user}
                value={user?.phone || ''}
                placeholder=""
                className="flex-1 px-3 bg-transparent outline-none text-[15px] font-medium text-slate-800"
              />
              <div className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            </div>
          </div>
          
          {user ? (
            <div className="mt-3 px-1 flex items-center gap-1 text-[12px] text-slate-500">
              You're posting as {user.name} - <button onClick={() => navigate('/login')} className="font-bold text-[#0073E6]">Change Account</button>
            </div>
          ) : (
            <p className="mt-3 px-1 text-[12px] text-slate-500">
              Are you a registered user? <button onClick={() => navigate('/login')} className="font-bold text-[#0073E6]">Login</button>
            </p>
          )}
        </section>

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
