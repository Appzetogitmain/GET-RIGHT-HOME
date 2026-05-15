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

  // State
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [intent, setIntent] = useState('Sell'); // Sell, Rent / Lease, Paying Guest
  const [propertyCategory, setPropertyCategory] = useState('Residential'); // Residential, Commercial
  const [selectedType, setSelectedType] = useState('');
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  // Options
  const intentOptions = ['Sell', 'Rent / Lease', 'Paying Guest'];
  const categoryOptions = ['Residential', 'Commercial'];

  const residentialTypes = [
    'Apartment', 'Independent House / Villa', 'Builder Floor',
    'Plot / Land', '1 RK/ Studio Apartment', 'Serviced Apartment',
    'Farmhouse', 'Other'
  ];

  const commercialTypes = [
    'Office Space', 'Shop / Showroom', 'Commercial Land',
    'Warehouse / Godown', 'Industrial Shed', 'Other'
  ];

  useEffect(() => {
    const fetchCats = async () => {
      const data = await categoryService.getActiveCategories();
      setCategories(data);
    };
    fetchCats();
  }, []);

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
    // Find matching category from DB
    const searchName = intent === 'Paying Guest' ? 'PG' : intent === 'Rent / Lease' ? 'Rent' : 'Buy';
    const dbCat = categories.find(c => 
      (c.displayName || '').toLowerCase().includes(searchName.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(searchName.toLowerCase())
    );

    if (dbCat) {
      navigate(`/list-property/wizard/${dbCat._id}`, { 
        state: { 
          intent, 
          propertyCategory, 
          propertyType: selectedType 
        } 
      });
    } else {
      toast.error('Service currently unavailable for this category');
    }
  };

  const currentTypes = propertyCategory === 'Residential' ? residentialTypes : commercialTypes;

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10 font-sans antialiased text-slate-800">
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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">STEP 1 OF 3</p>

        {/* Intent Selection */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-800 mb-4 tracking-tight">You're looking to?</h2>
          <div className="flex flex-wrap gap-3">
            {intentOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setIntent(opt);
                  if (opt === 'Paying Guest') setPropertyCategory('Residential');
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all border ${
                  intent === opt
                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Property Category */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-800 mb-4 tracking-tight">What kind of property?</h2>
          <div className="flex gap-3">
            {categoryOptions.map((opt) => (
              <button
                key={opt}
                disabled={intent === 'Paying Guest' && opt === 'Commercial'}
                onClick={() => setPropertyCategory(opt)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all border ${
                  propertyCategory === opt
                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 disabled:opacity-30'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Property Type Grid */}
        <section className="mb-12">
          <h2 className="text-[15px] font-bold text-slate-800 mb-4 tracking-tight">Select Property Type</h2>
          <div className="flex flex-wrap gap-3">
            {currentTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all border ${
                  selectedType === type
                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
            <button className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-blue-500 border border-dashed border-blue-200 bg-blue-50/20">
              + 3 more
            </button>
          </div>
        </section>

        {/* Contact Details Card */}
        <section className="mb-12">
          <h2 className="text-[15px] font-bold text-slate-800 mb-4 tracking-tight">Your contact details</h2>
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm">
            <div className="relative group">
              <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Phone number / User name / E-mail
              </label>
              <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-focus-within:border-blue-100 transition-all">
                <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                  <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-4 h-3 rounded-sm opacity-80" />
                  <span className="text-sm font-semibold text-slate-600">+91</span>
                </div>
                <input
                  type="text"
                  readOnly={!!user}
                  value={user?.phone || ''}
                  placeholder="9644323019"
                  className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-300"
                />
                <User size={16} className="text-slate-300" />
              </div>
            </div>
            
            {user ? (
              <div className="mt-5 flex items-center justify-between px-1">
                <p className="text-[12px] text-slate-500 font-medium">
                  You're posting as <span className="font-bold text-slate-800">{user.name}</span>
                </p>
                <button onClick={() => navigate('/login')} className="text-[12px] font-bold text-blue-500 hover:text-blue-600">
                  Change Account
                </button>
              </div>
            ) : (
              <p className="mt-5 text-[12px] text-slate-500 font-medium px-1">
                Are you a registered user? <button onClick={() => navigate('/login')} className="text-blue-500 font-bold">Login</button>
              </p>
            )}
          </div>
        </section>

        {/* Next Button */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-lg border-t border-slate-50 md:relative md:bg-transparent md:border-0 md:p-0 md:mb-10">
          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px]"
          >
            Next <ChevronRight size={18} strokeWidth={2.5} />
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
