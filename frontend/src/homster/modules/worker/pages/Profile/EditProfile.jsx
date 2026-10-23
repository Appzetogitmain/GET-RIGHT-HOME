import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSave, FiUser, FiPhone, FiMail,
  FiMapPin, FiBriefcase, FiCamera, FiCheck,
  FiChevronDown, FiX, FiClock, FiAlertCircle,
  FiTrash2, FiUploadCloud, FiFileText
} from 'react-icons/fi';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import workerService from '../../../../services/workerService';
import { publicCatalogService } from '../../../../services/catalogService';
import { toast } from 'react-hot-toast';
import AddressSelectionModal from '../../../user/pages/Checkout/components/AddressSelectionModal';
import { z } from "zod";

// Zod schema
import flutterBridge from '../../../../utils/flutterBridge';

const workerProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(), // Read-only but good to have in schema
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  serviceCategories: z.array(z.string()).optional(),
  address: z.object({
    addressLine1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    fullAddress: z.string().optional()
  }).refine((data) => {
    return (data.fullAddress && data.fullAddress.length > 5) || (data.addressLine1 && data.addressLine1.length > 0);
  }, { message: "Address is required" })
});

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [verifiedCategories, setVerifiedCategories] = useState([]);
  const [pendingCategories, setPendingCategories] = useState([]);
  const [skillsData, setSkillsData] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: {
      addressLine1: '',
      city: '',
      state: '',
      pincode: '',
    },
    serviceCategories: [],
    profilePhoto: null,
    status: 'offline'
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const handleNativeCamera = async () => {
    const file = await flutterBridge.openCamera();
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      flutterBridge.hapticFeedback('success');
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [profileRes, catalogRes] = await Promise.all([
          workerService.getProfile(),
          publicCatalogService.getCategories()
        ]);

        if (profileRes.success) {
          const w = profileRes.worker;
          setProfessions(w.professions || []);
          const verified = w.serviceCategories || (w.serviceCategory ? [w.serviceCategory] : []);
          const pending = w.pendingServiceCategories || [];
          setVerifiedCategories(verified);
          setPendingCategories(pending);

          const initialCategories = Array.from(new Set([...verified, ...pending]));

          // Initialize skillsData with experience and certificates
          const initialSkillsData = {};
          (w.verifiedSkillsDetails || []).forEach(v => {
            if (v.category) {
              initialSkillsData[v.category] = {
                experienceYears: v.experienceYears || 0,
                experienceLetter: v.experienceLetter || null,
                experienceLetterPreview: v.experienceLetter || null,
                letterFile: null
              };
            }
          });
          (w.skillRequests || []).forEach(r => {
            if (r.category) {
              initialSkillsData[r.category] = {
                experienceYears: r.experienceYears || 0,
                experienceLetter: r.experienceLetter || null,
                experienceLetterPreview: r.experienceLetter || null,
                letterFile: null
              };
            }
          });
          setSkillsData(initialSkillsData);

          setFormData({
            name: w.name || '',
            phone: w.phone || '',
            email: w.email || '',
            address: {
              addressLine1: w.address?.addressLine1 || '',
              city: w.address?.city || '',
              state: w.address?.state || '',
              pincode: w.address?.pincode || '',
            },
            serviceCategories: initialCategories,
            profilePhoto: w.profilePhoto || null,
            status: w.status || 'offline'
          });
        }

        if (catalogRes.success) {
          setCategories(catalogRes.categories || []);
        }
      } catch (error) {
        console.error('Init error:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    if (!baseUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = 'http://localhost:5000';
      } else {
        baseUrl = window.location.origin;
      }
    }
    baseUrl = baseUrl.replace(/\/api$/, '');
    const response = await fetch(`${baseUrl}/api/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return data.imageUrl;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCategoryChange = (val) => {
    setFormData(prev => {
      const current = prev.serviceCategories || [];
      const updated = current.includes(val)
        ? current.filter(c => c !== val)
        : [...current, val];

      return {
        ...prev,
        serviceCategories: updated
      };
    });
  };


  const handleExperienceYearsChange = (category, years) => {
    const val = years === '' ? '' : Math.max(0, parseInt(years, 10) || 0);
    setSkillsData(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        experienceYears: val
      }
    }));
  };

  const handleExperienceLetterChange = (category, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSkillsData(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        letterFile: file,
        experienceLetterPreview: previewUrl
      }
    }));
  };

  const handleRemoveExperienceLetter = (category) => {
    setSkillsData(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        letterFile: null,
        experienceLetter: null,
        experienceLetterPreview: null
      }
    }));
  };

  const handleAddressSave = (houseNumber, location) => {
    // Extract components from Google Maps location
    let city = '';
    let state = '';
    let pincode = '';
    let addressLine2 = '';

    if (location.components) {
      location.components.forEach(comp => {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        if (comp.types.includes('postal_code')) pincode = comp.long_name;
        if (comp.types.includes('sublocality')) addressLine2 = comp.long_name;
      });
    }

    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        addressLine1: houseNumber || prev.address.addressLine1,
        addressLine2: addressLine2,
        city: city || prev.address.city,
        state: state || prev.address.state,
        pincode: pincode || prev.address.pincode,
        fullAddress: location.address // Store the full formatted address string
      }
    }));
    setIsAddressModalOpen(false);
  };

  const handleSubmit = async () => {
    // Zod Validation
    const validationResult = workerProfileSchema.safeParse({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      serviceCategories: formData.serviceCategories,
      address: formData.address
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues?.[0]?.message || "Validation failed";
      toast.error(errorMessage);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        email: formData.email,
        serviceCategories: formData.serviceCategories,
        serviceCategory: formData.serviceCategories[0], // Fallback
        address: formData.address,
        status: formData.status
      };

      if (photoFile) {
        try {
          const photoUrl = await uploadFile(photoFile);
          payload.profilePhoto = photoUrl;
        } catch (uploadErr) {
          console.error('Photo upload failed', uploadErr);
          toast.error('Failed to upload photo');
          setSaving(false);
          return;
        }
      }

      // Process experience years & experience letter upload for each category
      const skillsMetadata = {};
      for (const cat of formData.serviceCategories) {
        const item = skillsData[cat] || {};
        let letterUrl = item.experienceLetter || null;

        if (item.letterFile) {
          try {
            letterUrl = await uploadFile(item.letterFile);
          } catch (uploadErr) {
            console.error(`Experience letter upload failed for ${cat}:`, uploadErr);
            toast.error(`Failed to upload experience document for ${cat}`);
            setSaving(false);
            return;
          }
        }

        skillsMetadata[cat] = {
          category: cat,
          experienceYears: Number(item.experienceYears) || 0,
          experienceLetter: letterUrl
        };
      }
      payload.skillsMetadata = skillsMetadata;

      const updateRes = await workerService.updateProfile(payload);
      toast.success(updateRes.message || 'Profile updated successfully');

      // Update local storage to keep session in sync if needed
      const currentWorker = JSON.parse(localStorage.getItem('workerData') || '{}');
      localStorage.setItem('workerData', JSON.stringify({
        ...currentWorker,
        ...payload,
        ...(updateRes.worker || {}),
        profilePhoto: payload.profilePhoto || currentWorker.profilePhoto
      }));

      navigate('/worker/profile');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };


  // Deep link from the dashboard (/worker/profile/edit#skills) → jump to Work Profile
  useEffect(() => {
    if (loading || window.location.hash !== '#skills') return;
    document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Edit Profile" />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">

        {/* Profile Photo */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center cursor-pointer"
              onClick={() => flutterBridge.isFlutter ? handleNativeCamera() : document.getElementById('photo-upload').click()}
            >
              {photoPreview || formData.profilePhoto ? (
                <img src={photoPreview || formData.profilePhoto} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="bg-gray-100 w-full h-full flex items-center justify-center">
                  <FiUser className="w-10 h-10 text-gray-300" />
                </div>
              )}
            </div>
            {/* Camera Icon */}
            <div
              className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white ring-2 ring-white shadow-sm cursor-pointer"
              onClick={() => flutterBridge.isFlutter ? handleNativeCamera() : document.getElementById('photo-upload').click()}
            >
              <FiCamera className="w-4 h-4" />
            </div>
            {!flutterBridge.isFlutter && (
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Tap to change photo</p>
        </div>

        {/* Availability Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <FiCheck className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Availability</h2>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleInputChange('status', 'online')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${formData.status === 'online'
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-white border-gray-200 text-gray-500'
                }`}
            >
              Online
            </button>
            <button
              onClick={() => handleInputChange('status', 'offline')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${formData.status === 'offline'
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'bg-white border-gray-200 text-gray-500'
                }`}
            >
              Offline
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Set your status to receive new job assignments.
          </p>
        </div>

        {/* Personal Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <FiUser className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Personal Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block ml-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Enter name"
              />
              {errors.name && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block ml-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block ml-1">Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.phone}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                  VERIFIED
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <FiMapPin className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Address Details</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-medium text-gray-700">
                {formData.address?.fullAddress ||
                  `${formData.address?.addressLine1 || ''} ${formData.address?.city || ''} ${formData.address?.state || ''} ${formData.address?.pincode || ''}`
                }
              </p>
              {!formData.address?.fullAddress && !formData.address?.addressLine1 && (
                <p className="text-xs text-gray-400 italic mt-1">No address set</p>
              )}
            </div>

            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <FiMapPin className="w-4 h-4" />
              Build/Change Location on Map
            </button>
          </div>
        </div>

        {/* Work Category */}
        <div id="skills" className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-gray-100 scroll-mt-4">
          <div className="flex items-center gap-2 mb-2">
            <FiBriefcase className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Work Profile</h2>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
              Your Profession
            </label>
            {professions.length === 0 ? (
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                No profession assigned yet. Contact admin to get one.
              </p>
            ) : (
              <div className="space-y-2">
                {professions.map((p) => (
                  <div key={p.id} className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-sm font-bold text-green-900 flex items-center gap-1.5">
                      <FiCheck className="w-4 h-4 text-green-600" /> {p.name}
                    </p>
                    {p.categories.length > 0 && (
                      <p className="text-xs text-green-800/80 mt-1">You receive bookings for: {p.categories.join(', ')}</p>
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-gray-400">Profession is set by admin. Contact admin to change it.</p>
              </div>
            )}
          </div>

          {/* Skills: worker can request extra skills; admin verifies before jobs are received for them */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
              Categories / Skills
            </label>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 space-y-2">
              {formData.serviceCategories.length === 0 && (
                <p className="text-xs text-gray-400 px-1 py-1">No skills added yet. Tap “Add skill” below.</p>
              )}
              {formData.serviceCategories.map((cat) => {
                const isVerified = verifiedCategories.some(v => v.toLowerCase() === cat.toLowerCase());
                const isPending = !isVerified && pendingCategories.some(p => p.toLowerCase() === cat.toLowerCase());
                return (
                  <div
                    key={cat}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                      isVerified ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${isVerified ? 'text-green-900' : 'text-amber-900'}`}>
                      {isVerified ? <FiCheck className="w-4 h-4 text-green-600 shrink-0" /> : <FiClock className="w-4 h-4 text-amber-600 shrink-0" />}
                      {cat}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isVerified ? 'Verified' : isPending ? 'Pending' : 'New'}
                      </span>
                      {!isVerified && (
                        <button
                          type="button"
                          onClick={() => handleCategoryChange(cat)}
                          className="p-1 rounded-full text-amber-700 hover:bg-amber-100"
                          aria-label={`Remove ${cat}`}
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCategoryOpen(o => !o)}
                className="w-full flex items-center justify-between rounded-xl border border-dashed border-blue-300 bg-white px-3 py-2.5 text-sm font-bold text-blue-600 active:scale-[0.99] transition"
              >
                + Add skill
                <FiChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCategoryOpen && (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                  {categories
                    .filter(c => c.title && !formData.serviceCategories.some(s => s.toLowerCase() === c.title.toLowerCase()))
                    .map(c => (
                      <button
                        key={c._id || c.id || c.title}
                        type="button"
                        onClick={() => { handleCategoryChange(c.title); setIsCategoryOpen(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50"
                      >
                        {c.title}
                      </button>
                    ))}
                  {categories.filter(c => c.title && !formData.serviceCategories.some(s => s.toLowerCase() === c.title.toLowerCase())).length === 0 && (
                    <p className="px-3 py-3 text-xs text-gray-400">No more skills available.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Experience & optional certificate for new / pending skills */}
          {(() => {
            const needsDetails = formData.serviceCategories.filter(
              cat => !verifiedCategories.some(v => v.toLowerCase() === cat.toLowerCase())
            );
            if (needsDetails.length === 0) return null;
            return (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <FiFileText className="w-3.5 h-3.5 text-blue-600" /> New Skill Details & Verification
                </h3>
                {needsDetails.map(cat => {
                  const data = skillsData[cat] || {};
                  const isPending = pendingCategories.some(p => p.toLowerCase() === cat.toLowerCase());
                  const preview = data.experienceLetterPreview;
                  const isImage = preview && !/\.pdf($|\?)/i.test(preview) && !(data.letterFile && data.letterFile.type === 'application/pdf');
                  return (
                    <div key={cat} className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-800">{cat}</p>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                          {isPending ? 'Pending Admin Review' : 'New Skill'}
                        </span>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                          Years of experience
                        </label>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={data.experienceYears ?? ''}
                          onChange={(e) => handleExperienceYearsChange(cat, e.target.value)}
                          placeholder="e.g. 3"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                          Certificate / experience letter <span className="normal-case font-medium text-gray-400">(optional)</span>
                        </label>
                        {preview ? (
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isImage ? (
                                <img src={preview} alt="Certificate" className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <FiFileText className="w-6 h-6 text-blue-500 shrink-0" />
                              )}
                              <span className="text-xs text-gray-600 truncate">{data.letterFile?.name || 'Uploaded document'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExperienceLetter(cat)}
                              className="p-1.5 rounded-full text-red-500 hover:bg-red-50 shrink-0"
                              aria-label="Remove document"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-50">
                            <FiUploadCloud className="w-4 h-4" /> Upload certificate (image / PDF, max 5MB)
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => handleExperienceLetterChange(cat, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex gap-2">
            <FiAlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-bold">Skill Verification Notice:</span> Newly added skills require admin review and verification before you can receive job requests for them. Your existing verified skills keep receiving jobs without interruption.
            </p>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-5 h-5" />
                Save Profile
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/worker/profile')}
            className="w-full py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl font-bold text-sm uppercase tracking-wider active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>

      </main>



      <AddressSelectionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        address={formData.address?.fullAddress || ''} // Passing for initial view if supported later
        houseNumber={formData.address?.addressLine1 || ''}
        onHouseNumberChange={(val) => handleInputChange('address.addressLine1', val)}
        onSave={handleAddressSave}
      />

      <BottomNav />
    </div >
  );
};

export default EditProfile;

