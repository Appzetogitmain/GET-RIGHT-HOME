import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Loader2, Check, MapPin } from 'lucide-react';
import { api, hotelService } from '../../services/apiService';
import toast from 'react-hot-toast';
import LocationSelector from '../../components/ui/LocationSelector';

const DynamicFormEngine = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactionType, category, propertyType, existingProperty } = location.state || {};
  const isEditMode = !!existingProperty;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState({});
  
  // Data state
  const storageKey = `draft_property_${transactionType}_${category}_${propertyType}`;
  const [formData, setFormData] = useState(() => {
    if (isEditMode) {
      return {
        ...existingProperty.dynamicData,
        propertyName: existingProperty.propertyName || existingProperty.dynamicData?.propertyName,
        description: existingProperty.description || existingProperty.dynamicData?.description,
        amenities: existingProperty.amenities || existingProperty.dynamicData?.amenities,
        nearbyPlaces: existingProperty.nearbyPlaces || existingProperty.dynamicData?.nearbyPlaces,
        // Pre-populate address fields from root address object
        country: existingProperty.address?.country || existingProperty.dynamicData?.country || 'India',
        state: existingProperty.address?.state || existingProperty.dynamicData?.state || 'Karnataka',
        district: existingProperty.address?.district || existingProperty.dynamicData?.district || '',
        city: existingProperty.address?.city || existingProperty.dynamicData?.city || '',
        locality: existingProperty.address?.area || existingProperty.address?.locality || existingProperty.dynamicData?.locality || '',
        houseNumber: existingProperty.address?.fullAddress || existingProperty.dynamicData?.houseNumber || '',
        pincode: existingProperty.address?.pincode || existingProperty.dynamicData?.pincode || ''
      };
    }
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Fetch Template
  useEffect(() => {
    if (!transactionType || !category || !propertyType) {
      navigate('/list-property');
      return;
    }

    const fetchTemplate = async () => {
      try {
        const res = await api.get(`/property-forms/template`, {
          params: { transactionType, category, propertyType }
        });
        if (res.data.success) {
          // Sort steps
          const sortedSteps = res.data.template.steps.sort((a, b) => a.stepNumber - b.stepNumber);
          setTemplate({ ...res.data.template, steps: sortedSteps });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load form fields for this category.');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [transactionType, category, propertyType, navigate]);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(formData));
  }, [formData, storageKey]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleNext = () => {
    const currentStep = template.steps[currentStepIndex];
    let newErrors = {};
    let firstErrorField = null;

    const isLocationStep = currentStep?.title?.toLowerCase().includes('location');
    if (isLocationStep) {
      if (!formData.country) {
        newErrors['country'] = 'Country is required';
        if (!firstErrorField) firstErrorField = 'country';
      }
      if (!formData.state) {
        newErrors['state'] = 'State is required';
        if (!firstErrorField) firstErrorField = 'state';
      }
      if (!formData.district) {
        newErrors['district'] = 'District is required';
        if (!firstErrorField) firstErrorField = 'district';
      }
      if (!formData.city) {
        newErrors['city'] = 'City is required';
        if (!firstErrorField) firstErrorField = 'city';
      }
    }

    currentStep.fields.forEach(field => {
      // Basic visibility check (dependency)
      let isVisible = true;
      if (field.dependsOn?.field) {
        isVisible = formData[field.dependsOn.field] === field.dependsOn.value;
      }

      if (isVisible && field.required) {
        const value = formData[field.name];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.name] = `${field.label} is required`;
          if (!firstErrorField) firstErrorField = field.name;
        }
      }
    });

    // Custom Validation: Area comparisons matching 99acres rules
    const carpetVal = formData['carpetArea'];
    const superVal = formData['superArea'];
    const builtUpVal = formData['builtUpArea'];

    const carpetAreaNum = carpetVal ? Number(carpetVal.toString().replace(/,/g, '')) : 0;
    const superAreaNum = superVal ? Number(superVal.toString().replace(/,/g, '')) : 0;
    const builtUpAreaNum = builtUpVal ? Number(builtUpVal.toString().replace(/,/g, '')) : 0;

    if (carpetAreaNum > 0) {
      if (superAreaNum > 0 && carpetAreaNum >= superAreaNum) {
        newErrors['carpetArea'] = 'Carpet Area should be less than Super Built-up Area';
        if (!firstErrorField) firstErrorField = 'carpetArea';
      }
      if (builtUpAreaNum > 0 && carpetAreaNum >= builtUpAreaNum) {
        newErrors['carpetArea'] = 'Carpet Area should be less than Built-up Area';
        if (!firstErrorField) firstErrorField = 'carpetArea';
      }
      if (superAreaNum > 0 && builtUpAreaNum > 0 && builtUpAreaNum >= superAreaNum) {
        newErrors['builtUpArea'] = 'Built-up Area should be less than Super Built-up Area';
        if (!firstErrorField) firstErrorField = 'builtUpArea';
      }
    }

    // Custom Validation: Floor comparison matching 99acres rules
    const floorNumVal = formData['floorNumber'];
    const totalFloorsVal = formData['totalFloors'];

    if (floorNumVal !== undefined && totalFloorsVal !== undefined && floorNumVal !== '' && totalFloorsVal !== '') {
      const fNum = Number(floorNumVal);
      const tFloors = Number(totalFloorsVal);
      if (!isNaN(fNum) && !isNaN(tFloors) && fNum > tFloors) {
        newErrors['floorNumber'] = 'Property floor cannot be greater than total floors in building';
        if (!firstErrorField) firstErrorField = 'floorNumber';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Find the first error field and scroll to it
      if (firstErrorField) {
        setTimeout(() => {
          const errorElement = document.getElementById(`field-${firstErrorField}`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return;
    }

    if (currentStepIndex < template.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      submitForm();
    }
  };

  const submitForm = async () => {
    try {
      setLoading(true);
      const payload = {
        propertyName: formData.propertyName || `${category} ${propertyType} for ${transactionType}`,
        transactionType,
        propertyCategory: category,
        propertyType,
        dynamicCategory: template?._id,
        dynamicData: formData,
        address: {
          country: formData.country || 'India',
          state: formData.state || 'Karnataka',
          district: formData.district || '',
          city: formData.city || '',
          area: formData.locality || formData.area || '',
          fullAddress: formData.houseNumber || formData.fullAddress || '',
          pincode: formData.pincode || ''
        },
        status: 'pending' // Draft / Pending review
      };

      let res;
      if (isEditMode) {
        res = await api.put(`/properties/${existingProperty._id}`, payload);
      } else {
        res = await api.post('/properties', payload);
      }

      if (res.data.success) {
        toast.success(isEditMode ? 'Property details updated successfully!' : 'Property details submitted successfully!');
        if (!isEditMode) {
          localStorage.removeItem(storageKey);
        }
        navigate('/my-properties');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!template || template.steps.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <h2 className="text-xl font-bold mb-4">No Form Configured</h2>
        <p className="text-gray-500 mb-6 text-center">Admin has not configured the steps for {transactionType} - {category} - {propertyType} yet.</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Go Back</button>
      </div>
    );
  }

  const currentStep = template.steps[currentStepIndex];

  // Dynamic Field Renderer
  const renderField = (field) => {
    // Dependency check
    if (field.dependsOn?.field) {
      if (formData[field.dependsOn.field] !== field.dependsOn.value) {
        return null; // Hide field
      }
    }

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              className={`w-full bg-white border rounded-xl px-4 py-3 text-[15px] outline-none transition-all ${
                errors[field.name] 
                  ? 'border-red-400 focus:ring-1 focus:ring-red-400' 
                  : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}
          </div>
        );
      
      case 'pill':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {field.options?.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange(field.name, opt)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all border whitespace-nowrap flex-shrink-0 ${
                    formData[field.name] === opt
                      ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm'
                      : errors[field.name]
                        ? 'bg-white text-slate-500 border-red-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'dropdown':
        return (
          <div key={field.name} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
            >
              <option value="">Select</option>
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      
      case 'file':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all relative ${
              errors[field.name] ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
            }`}>
              <div className="flex flex-col items-center justify-center space-y-2">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p className="text-[13px] text-slate-600 font-medium">Click to upload photos/videos</p>
                <p className="text-[11px] text-slate-400">Max size 5MB. JPG, PNG, MP4</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (files.length === 0) return;
                  
                  const uploadToastId = toast.loading('Uploading media to server...');
                  try {
                    const fd = new FormData();
                    files.forEach(f => fd.append('images', f));
                    
                    const res = await hotelService.uploadImages(fd);
                    const urls = Array.isArray(res?.urls) ? res.urls : [];
                    
                    if (urls.length > 0) {
                      const currentImages = formData[field.name] || [];
                      handleChange(field.name, [...currentImages, ...urls]);
                      toast.success('Uploaded successfully!', { id: uploadToastId });
                    } else {
                      toast.error('Upload failed: Empty response', { id: uploadToastId });
                    }
                  } catch (err) {
                    toast.error(err.message || 'Upload failed', { id: uploadToastId });
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ position: 'relative', marginTop: '-80px', height: '100px' }}
              />
            </div>
            
            {/* Display selected files */}
            {formData[field.name] && Array.isArray(formData[field.name]) && formData[field.name].length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {formData[field.name].map((url, i) => (
                  <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 relative group">
                    <img src={url} alt="upload" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const nextImages = [...(formData[field.name] || [])];
                        nextImages.splice(i, 1);
                        handleChange(field.name, nextImages);
                      }}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-1 rounded-full text-[10px] w-5 h-5 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={4}
              className={`w-full bg-white border rounded-xl px-4 py-3 text-[15px] outline-none transition-all resize-none ${
                errors[field.name] 
                  ? 'border-red-400 focus:ring-1 focus:ring-red-400' 
                  : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'checkbox_group':
        const selectedOptions = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {field.options?.map(opt => {
                const isChecked = selectedOptions.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const next = isChecked 
                        ? selectedOptions.filter(o => o !== opt) 
                        : [...selectedOptions, opt];
                      handleChange(field.name, next);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-[13px] font-medium text-left transition-all ${
                      isChecked
                        ? 'bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isChecked ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}>
                      {isChecked && <Check size={10} strokeWidth={3} />}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'nearby_places':
        const places = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6 border border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {places.length > 0 && (
              <div className="space-y-2 mb-4">
                {places.map((place, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-[12px] font-medium">
                    <div>
                      <span className="text-slate-800 font-bold">{place.name}</span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className="text-slate-500 font-medium capitalize">{place.type}</span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className="text-slate-600 font-bold">{place.distanceKm} km</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = places.filter((_, i) => i !== idx);
                        handleChange(field.name, next);
                      }}
                      className="text-red-500 hover:text-red-600 font-black text-sm px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                type="text"
                placeholder="Place name (e.g. Metro Station)"
                id="nearby-name"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-blue-500"
              />
              <select
                id="nearby-type"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none"
              >
                <option value="metro">Metro</option>
                <option value="school">School</option>
                <option value="hospital">Hospital</option>
                <option value="market">Market</option>
                <option value="mall">Mall</option>
                <option value="airport">Airport</option>
                <option value="railway">Railway</option>
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Distance (km)"
                  id="nearby-dist"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById('nearby-name');
                    const typeInput = document.getElementById('nearby-type');
                    const distInput = document.getElementById('nearby-dist');
                    
                    const name = nameInput?.value?.trim();
                    const type = typeInput?.value;
                    const distanceKm = Number(distInput?.value || 0);
                    
                    if (!name || !distanceKm) {
                      toast.error('Please enter both name and distance');
                      return;
                    }
                    
                    const newPlace = { name, type, distanceKm };
                    handleChange(field.name, [...places, newPlace]);
                    
                    if (nameInput) nameInput.value = '';
                    if (distInput) distInput.value = '';
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[12px] font-bold uppercase transition-all shadow-sm shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10 font-sans text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white px-4 h-14 flex items-center border-b border-slate-100">
        <button onClick={() => {
          if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
            window.scrollTo(0, 0);
          } else {
            navigate(-1);
          }
        }} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} />
        </button>
        <span className="ml-2 font-bold text-[17px] tracking-tight">{currentStep.title}</span>
        <span className="ml-auto text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          STEP {currentStepIndex + 2} OF {template.steps.length + 1}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep.description && (
              <h2 className="text-[17px] font-bold text-[#0B1A3A] mb-6">{currentStep.description}</h2>
            )}

            {currentStep?.title?.toLowerCase().includes('location') && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                <LocationSelector
                  value={{
                    country: formData.country || 'India',
                    state: formData.state || '',
                    district: formData.district || '',
                    city: formData.city || ''
                  }}
                  onChange={({ country, state, district, city }) => {
                    handleChange('country', country);
                    handleChange('state', state);
                    handleChange('district', district);
                    handleChange('city', city);
                  }}
                  required
                />
                {errors.country && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.country}</p>}
                {errors.state && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.state}</p>}
                {errors.district && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.district}</p>}
                {errors.city && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.city}</p>}
              </div>
            )}

            {/* Render Fields sorted by order */}
            {currentStep.fields
              .sort((a,b) => a.order - b.order)
              .filter(field => !currentStep?.title?.toLowerCase().includes('location') || !['city', 'state', 'district', 'country'].includes(field.name))
              .map(renderField)}

          </motion.div>
        </AnimatePresence>

        {/* Next Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 md:relative md:border-0 md:p-0 md:mt-10">
          <button
            onClick={handleNext}
            className="w-full bg-[#005B9F] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px]"
          >
            {currentStepIndex === template.steps.length - 1 ? 'Post & continue' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DynamicFormEngine;
