import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Loader2, Save, Layers, ArrowRight, 
  MapPin, Check, Plus, Trash2, Info 
} from 'lucide-react';
import adminService from '../../../services/adminService';
import { api, hotelService } from '../../../services/apiService';
import toast from 'react-hot-toast';
import LocationSelector from '../../../components/ui/LocationSelector';

const unitFieldMapping = {
  carpetArea: 'carpetAreaUnit',
  builtUpArea: 'builtUpAreaUnit',
  superArea: 'superAreaUnit',
  plotArea: 'areaUnit',
  entranceWidth: 'entranceWidthUnit',
  ceilingHeight: 'ceilingHeightUnit'
};

const pricingFieldsToFilter = [
  'priceNegotiable',
  'taxExcluded',
  'electricityWaterExcluded',
  'maintenanceCharges',
  'maintenanceFrequency',
  'bookingAmount'
];

const AdminAddProperty = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  
  // Selection states
  const [selectedTxn, setSelectedTxn] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedPropType, setSelectedPropType] = useState('');
  
  const [template, setTemplate] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    country: 'India',
    state: '',
    district: '',
    city: '',
    locality: '',
    houseNumber: '',
    pincode: ''
  });

  // Modal states for pricing details
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [modalMaintenance, setModalMaintenance] = useState('');
  const [modalFrequency, setModalFrequency] = useState('Monthly');
  const [modalBooking, setModalBooking] = useState('');

  // Fetch Category combinations on load
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/property-forms/configs');
        if (res.data.success) {
          setConfigs(res.data.configs);
        }
      } catch (err) {
        toast.error('Failed to load category configurations');
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  // Fetch Template when all 3 selections are made
  useEffect(() => {
    if (!selectedTxn || !selectedCat || !selectedPropType) {
      setTemplate(null);
      return;
    }

    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/property-forms/template`, {
          params: { transactionType: selectedTxn, category: selectedCat, propertyType: selectedPropType }
        });
        if (res.data.success) {
          const sortedSteps = res.data.template.steps.sort((a, b) => a.stepNumber - b.stepNumber);
          setTemplate({ ...res.data.template, steps: sortedSteps });
          setCurrentStepIndex(0);
          setErrors({});
        }
      } catch (err) {
        toast.error('Failed to load fields schema for selected combination.');
        setTemplate(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [selectedTxn, selectedCat, selectedPropType]);

  // Handle inputs
  const handleChange = (name, value) => {
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      const unitFieldKey = unitFieldMapping[name];
      if (unitFieldKey && !next[unitFieldKey]) {
        const currentStep = template.steps[currentStepIndex];
        const matchingUnitField = currentStep?.fields?.find(f => f.name === unitFieldKey);
        if (matchingUnitField?.options?.[0]) {
          next[unitFieldKey] = matchingUnitField.options[0];
        }
      }
      return next;
    });

    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  // Extract dropdowns list
  const getCategories = () => {
    const found = configs.find(c => c.transactionType === selectedTxn);
    return found ? found.categories : [];
  };

  const getPropTypes = () => {
    const cats = getCategories();
    const found = cats.find(c => c.category === selectedCat);
    return found ? found.propertyTypes : [];
  };

  // Step Validation
  const validateStep = () => {
    const currentStep = template.steps[currentStepIndex];
    let newErrors = {};
    let firstErrorField = null;

    // Validate location if it's the location step
    const isLocationStep = currentStep?.title?.toLowerCase().includes('location');
    if (isLocationStep) {
      if (!formData.country) newErrors['country'] = 'Country is required';
      if (!formData.state) newErrors['state'] = 'State is required';
      if (!formData.district) newErrors['district'] = 'District is required';
      if (!formData.city) newErrors['city'] = 'City is required';
    }

    currentStep.fields.forEach(field => {
      const isUnitField = ['carpetAreaUnit', 'builtUpAreaUnit', 'superAreaUnit', 'areaUnit', 'entranceWidthUnit', 'ceilingHeightUnit'].includes(field.name);
      const isCustomPricingField = pricingFieldsToFilter.includes(field.name);
      if (isUnitField || isCustomPricingField) return;

      let isVisible = true;
      if (field.dependsOn?.field) {
        isVisible = formData[field.dependsOn.field] === field.dependsOn.value;
      }

      if (isVisible) {
        const value = formData[field.name];
        const isValEmpty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

        if (field.required && isValEmpty) {
          newErrors[field.name] = `${field.label} is required`;
          if (!firstErrorField) firstErrorField = field.name;
        } else if (!isValEmpty) {
          // Negative value check for number fields
          if (field.type === 'number' && Number(value) < 0) {
            newErrors[field.name] = `${field.label} cannot be negative`;
            if (!firstErrorField) firstErrorField = field.name;
          } else if (field.validation) {
            const { min, max, minLength, maxLength, customErrorMessage } = field.validation;
            
            if (field.type === 'number') {
              const numVal = Number(value);
              if (min !== undefined && min !== null && numVal < min) {
                newErrors[field.name] = customErrorMessage || `${field.label} must be at least ${min}`;
                if (!firstErrorField) firstErrorField = field.name;
              }
              if (max !== undefined && max !== null && numVal > max) {
                newErrors[field.name] = customErrorMessage || `${field.label} must be at most ${max}`;
                if (!firstErrorField) firstErrorField = field.name;
              }
            } else if (typeof value === 'string') {
              if (minLength !== undefined && minLength !== null && value.length < minLength) {
                newErrors[field.name] = customErrorMessage || `${field.label} must be at least ${minLength} characters`;
                if (!firstErrorField) firstErrorField = field.name;
              }
              if (maxLength !== undefined && maxLength !== null && value.length > maxLength) {
                newErrors[field.name] = customErrorMessage || `${field.label} must be at most ${maxLength} characters`;
                if (!firstErrorField) firstErrorField = field.name;
              }
            }
          }
        }
      }
    });

    // Special custom comparison validations (Area size checks)
    const carpetAreaNum = formData['carpetArea'] ? Number(formData['carpetArea']) : 0;
    const superAreaNum = formData['superArea'] ? Number(formData['superArea']) : 0;
    const builtUpAreaNum = formData['builtUpArea'] ? Number(formData['builtUpArea']) : 0;

    if (carpetAreaNum > 0) {
      if (superAreaNum > 0 && carpetAreaNum >= superAreaNum) {
        newErrors['carpetArea'] = 'Carpet Area should be less than Super Built-up Area';
        if (!firstErrorField) firstErrorField = 'carpetArea';
      }
      if (builtUpAreaNum > 0 && carpetAreaNum >= builtUpAreaNum) {
        newErrors['carpetArea'] = 'Carpet Area should be less than Built-up Area';
        if (!firstErrorField) firstErrorField = 'carpetArea';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (firstErrorField) {
        const errorElement = document.getElementById(`field-${firstErrorField}`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStepIndex < template.steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        window.scrollTo(0, 0);
      } else {
        submitForm();
      }
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const submitForm = async () => {
    try {
      setLoading(true);
      const payload = {
        propertyName: formData.propertyName || `${selectedCat} ${selectedPropType} for ${selectedTxn}`,
        transactionType: selectedTxn,
        propertyCategory: selectedCat,
        propertyType: selectedPropType,
        dynamicCategory: template?._id,
        dynamicData: formData,
        address: {
          country: formData.country || 'India',
          state: formData.state || '',
          district: formData.district || '',
          city: formData.city || '',
          area: formData.locality || '',
          fullAddress: formData.houseNumber || '',
          pincode: formData.pincode || ''
        },
        status: 'approved',
        isLive: true,
        isAddedByAdmin: true
      };

      const res = await adminService.createProperty(payload);
      if (res.success) {
        toast.success('Admin property published successfully!');
        navigate(`${basePath}/properties`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publishing failed');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic input renders
  const renderField = (field) => {
    if (field.dependsOn?.field) {
      if (formData[field.dependsOn.field] !== field.dependsOn.value) {
        return null;
      }
    }

    const unitFieldName = unitFieldMapping[field.name];
    const currentStep = template.steps[currentStepIndex];
    const unitField = unitFieldName ? currentStep.fields.find(f => f.name === unitFieldName) : null;

    if (unitField) {
      return (
        <div key={field.name} id={`field-${field.name}`} className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white focus-within:border-slate-800 transition-all">
            <input
              type="number"
              value={formData[field.name] || ''}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === '+' || e.key === 'e') e.preventDefault();
              }}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              className="flex-1 px-4 py-3 bg-transparent text-sm font-semibold outline-none border-none"
            />
            <div className="border-l border-slate-200 bg-slate-50 flex items-center px-3">
              <select
                value={formData[unitFieldName] || unitField.options?.[0] || ''}
                onChange={(e) => handleChange(unitFieldName, e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-500 outline-none border-none pr-4 cursor-pointer"
              >
                {unitField.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
          {errors[field.name] && <p className="text-red-500 text-xs mt-1 ml-1">{errors[field.name]}</p>}
        </div>
      );
    }

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              value={formData[field.name] || ''}
              onKeyDown={(e) => {
                if (field.type === 'number' && (e.key === '-' || e.key === '+' || e.key === 'e')) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-slate-800 outline-none transition-all"
            />
            {errors[field.name] && <p className="text-red-500 text-xs mt-1 ml-1 font-semibold">{errors[field.name]}</p>}
          </div>
        );

      case 'pill':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {field.options?.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange(field.name, opt)}
                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                    formData[field.name] === opt
                      ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors[field.name] && <p className="text-red-500 text-xs mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'multiselect_pill':
        const selectedPills = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {field.options?.map(opt => {
                const isSelected = selectedPills.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      let next;
                      const isNoneOpt = ['not available', 'none', 'no washroom', 'no parking'].includes(opt.toLowerCase());
                      if (isNoneOpt) {
                        next = isSelected ? [] : [opt];
                      } else {
                        const filtered = selectedPills.filter(o => 
                          !['not available', 'none', 'no washroom', 'no parking'].includes(o.toLowerCase())
                        );
                        next = isSelected ? filtered.filter(o => o !== opt) : [...filtered, opt];
                      }
                      handleChange(field.name, next);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {errors[field.name] && <p className="text-red-500 text-xs mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'dropdown':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-slate-800 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Select Option</option>
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );

      case 'date':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-slate-800 outline-none transition-all"
            />
            {errors[field.name] && <p className="text-red-500 text-xs mt-1 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-slate-800 outline-none transition-all resize-none"
            />
            {errors[field.name] && <p className="text-red-500 text-xs mt-1 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'checkbox_group':
        const selectedOptions = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold text-left transition-all ${
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
          </div>
        );

      case 'file':
        const images = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-white hover:border-slate-800 transition-all cursor-pointer">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Plus size={24} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Click to upload photos</span>
                <span className="text-[10px] text-slate-400">JPG, PNG, max 5MB</span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (files.length === 0) return;
                  const uploadToast = toast.loading('Uploading images...');
                  try {
                    const fd = new FormData();
                    files.forEach(f => fd.append('images', f));
                    const res = await hotelService.uploadImages(fd);
                    if (res?.urls) {
                      handleChange(field.name, [...images, ...res.urls]);
                      toast.success('Uploaded successfully!', { id: uploadToast });
                    }
                  } catch (err) {
                    toast.error('Upload failed', { id: uploadToast });
                  }
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {images.map((url, idx) => (
                  <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 relative group">
                    <img src={url} alt="property" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const next = images.filter((_, i) => i !== idx);
                        handleChange(field.name, next);
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'nearby_places':
        const places = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {places.length > 0 && (
              <div className="space-y-2 mb-4">
                {places.map((place, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
                    <span>{place.name} ({place.type}) - {place.distanceKm} km</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = places.filter((_, i) => i !== idx);
                        handleChange(field.name, next);
                      }}
                      className="text-red-500 hover:text-red-600 text-sm font-black"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input type="text" placeholder="Name" id="nearby-name-admin" className="p-2 border rounded-lg text-xs" />
              <select id="nearby-type-admin" className="p-2 border rounded-lg text-xs bg-white">
                <option value="metro">Metro</option>
                <option value="school">School</option>
                <option value="hospital">Hospital</option>
                <option value="market">Market</option>
              </select>
              <div className="flex gap-2">
                <input type="number" placeholder="Km" id="nearby-dist-admin" className="p-2 border rounded-lg text-xs w-full" />
                <button
                  type="button"
                  onClick={() => {
                    const nameEl = document.getElementById('nearby-name-admin');
                    const typeEl = document.getElementById('nearby-type-admin');
                    const distEl = document.getElementById('nearby-dist-admin');
                    const name = nameEl?.value?.trim();
                    const type = typeEl?.value;
                    const distanceKm = Number(distEl?.value || 0);

                    if (!name || !distanceKm) {
                      toast.error('Enter name and distance');
                      return;
                    }

                    handleChange(field.name, [...places, { name, type, distanceKm }]);
                    if (nameEl) nameEl.value = '';
                    if (distEl) distEl.value = '';
                  }}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-xs uppercase"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Layers className="text-[#004F4D]" size={24} />
          Publish Property (Admin)
        </h2>
      </div>

      {/* Grid selector for category combination */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 border-b border-slate-50 pb-3">
          <Layers size={16} className="text-[#004F4D]" /> Select Property Category
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Level 1 selector */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase">Level 1 Category</label>
            <select
              value={selectedTxn}
              onChange={(e) => {
                setSelectedTxn(e.target.value);
                setSelectedCat('');
                setSelectedPropType('');
              }}
              className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:bg-white focus:ring-1 focus:ring-slate-800 outline-none transition-all"
            >
              <option value="">Select Category</option>
              {configs.map(c => <option key={c.transactionType} value={c.transactionType}>{c.transactionType}</option>)}
            </select>
          </div>

          {/* Level 2 selector */}
          {selectedTxn && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Level 2 Sub-category</label>
              <select
                value={selectedCat}
                onChange={(e) => {
                  setSelectedCat(e.target.value);
                  setSelectedPropType('');
                }}
                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:bg-white focus:ring-1 focus:ring-slate-800 outline-none transition-all"
              >
                <option value="">Select Sub-category</option>
                {getCategories().map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
              </select>
            </div>
          )}

          {/* Level 3 selector */}
          {selectedCat && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Level 3 Property Type</label>
              <select
                value={selectedPropType}
                onChange={(e) => setSelectedPropType(e.target.value)}
                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:bg-white focus:ring-1 focus:ring-slate-800 outline-none transition-all"
              >
                <option value="">Select Property Type</option>
                {getPropTypes().map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* Main Dynamic Wizard Form */}
      {template ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Main Form Fields Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    Step {currentStepIndex + 1} of {template.steps.length}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">{template.steps[currentStepIndex].title}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {template.steps.map((step, idx) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full ${idx === currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'}`} 
                    />
                  ))}
                </div>
              </div>

              {/* Special layout for location details step */}
              {template.steps[currentStepIndex].title?.toLowerCase().includes('location') && (
                <div className="space-y-4">
                  <LocationSelector
                    value={{
                      country: formData.country || 'India',
                      state: formData.state || '',
                      district: formData.district || '',
                      city: formData.city || ''
                    }}
                    onChange={({ country, state, district, city }) => {
                      setFormData(prev => ({
                        ...prev,
                        country,
                        state,
                        district,
                        city
                      }));
                    }}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Area / Locality</label>
                      <input
                        type="text"
                        value={formData.locality || ''}
                        onChange={(e) => handleChange('locality', e.target.value)}
                        placeholder="e.g. Indiranagar"
                        className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-slate-800 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Pincode</label>
                      <input
                        type="text"
                        value={formData.pincode || ''}
                        onChange={(e) => handleChange('pincode', e.target.value)}
                        placeholder="e.g. 560038"
                        className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">House No. / Building / Street Address</label>
                    <input
                      type="text"
                      value={formData.houseNumber || ''}
                      onChange={(e) => handleChange('houseNumber', e.target.value)}
                      placeholder="e.g. Flat 402, Royal Apartments, 12th Main"
                      className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Step fields */}
              <div>
                {template.steps[currentStepIndex].fields.map(renderField)}
              </div>

            </div>
          </div>

          {/* Action Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-950/20 space-y-4">
              <div className="flex items-center justify-between text-white/50 text-[10px] font-bold uppercase tracking-wider border-b border-white/10 pb-3">
                <span>Publishing Flow</span>
                <span className="text-emerald-400">Admin Live Mode</span>
              </div>

              <div className="space-y-2 text-xs font-semibold text-white/70">
                <p>• Automatically marked Approved</p>
                <p>• Made live on search lists</p>
                <p>• Bypasses partner reviews</p>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : currentStepIndex === template.steps.length - 1 ? (
                    <>
                      <Save size={16} /> Publish Property
                    </>
                  ) : (
                    <>
                      Next Step <ArrowRight size={14} />
                    </>
                  )}
                </button>

                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl font-bold text-xs uppercase"
                  >
                    Previous Step
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        selectedPropType && !loading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
            <Info size={32} className="text-slate-400 mx-auto mb-4 animate-bounce" />
            <h4 className="text-base font-bold text-slate-800">No template configured for this combination.</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">Configure steps and fields for this type in the Property Form Manager CMS first.</p>
          </div>
        )
      )}

    </div>
  );
};

export default AdminAddProperty;
