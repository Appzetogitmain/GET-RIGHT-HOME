import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Loader2, Check, MapPin, Save } from 'lucide-react';
import { api, hotelService } from '../../services/apiService';
import toast from 'react-hot-toast';
import LocationSelector from '../../components/ui/LocationSelector';

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

// Builder templates flag their location step explicitly so that steps such as
// "Location Advantages" don't also render the country/state/city selector.
// Older property templates have no flag, so they keep matching on title.
const stepUsesLocationSelector = (step) => {
  if (!step) return false;
  if (typeof step.showLocationSelector === 'boolean') return step.showLocationSelector;
  return Boolean(step.title?.toLowerCase().includes('location'));
};

// A field's `dependsOn.value` can be a single value (exact match) or an array
// (OR match) so one controlling field can drive more than a two-way branch.
const matchesDependsOn = (dependsOn, dataObj) => {
  if (!dependsOn?.field) return true;
  const actual = dataObj?.[dependsOn.field];
  return Array.isArray(dependsOn.value) ? dependsOn.value.includes(actual) : actual === dependsOn.value;
};

const DynamicFormEngine = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactionType, category, propertyType, propertySubType, existingProperty } = location.state || {};
  const isEditMode = !!existingProperty;
  const displayPropertyType = propertySubType || propertyType;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  
  const stepStorageKey = isEditMode
    ? `draft_step_edit_${existingProperty._id}`
    : ((transactionType && category && displayPropertyType) 
        ? `draft_step_${transactionType}_${category}_${displayPropertyType}` 
        : 'draft_step_default');

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const savedStep = localStorage.getItem(stepStorageKey);
    return (savedStep && stepStorageKey !== 'draft_step_default') ? parseInt(savedStep, 10) : 0;
  });
  const [errors, setErrors] = useState({});

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isBrokerOrBuilder = user && (user.role === 'broker' || user.role === 'builder');
  
  // Modal states for custom tag editing
  const [customTagModal, setCustomTagModal] = useState({ open: false, fieldName: '', index: null, value: '' });

  // Tracks gallery thumbnails whose preview image failed to load, so we can
  // swap in a fallback via React state instead of touching the DOM directly
  // (mutating a React-owned node here used to desync the virtual DOM and
  // crash the whole app with a blank screen on the next re-render).
  const [brokenMedia, setBrokenMedia] = useState({});

  // Modal states for pricing details
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [modalMaintenance, setModalMaintenance] = useState('');
  const [modalFrequency, setModalFrequency] = useState('Monthly');
  const [modalBooking, setModalBooking] = useState('');

  // Data state
  const storageKey = `draft_property_${transactionType}_${category}_${displayPropertyType}`;
  const [formData, setFormData] = useState(() => {
    if (isEditMode) {
      const initialForm = {
        ...existingProperty.dynamicData,
        propertyName: existingProperty.propertyName || existingProperty.dynamicData?.propertyName,
        description: existingProperty.description || existingProperty.dynamicData?.description,
        amenities: existingProperty.amenities || existingProperty.dynamicData?.amenities,
        nearbyPlaces: existingProperty.nearbyPlaces || existingProperty.dynamicData?.nearbyPlaces,
        logo: existingProperty.logo || existingProperty.dynamicData?.logo || '',
        // Pre-populate address fields from root address object
        country: existingProperty.address?.country || existingProperty.dynamicData?.country || 'India',
        state: existingProperty.address?.state || existingProperty.dynamicData?.state || 'Karnataka',
        district: existingProperty.address?.district || existingProperty.dynamicData?.district || '',
        city: existingProperty.address?.city || existingProperty.dynamicData?.city || '',
        locality: existingProperty.address?.area || existingProperty.address?.locality || existingProperty.dynamicData?.locality || '',
        houseNumber: existingProperty.address?.fullAddress || existingProperty.dynamicData?.houseNumber || '',
        pincode: existingProperty.address?.pincode || existingProperty.dynamicData?.pincode || ''
      };
      if (existingProperty.builderProjectDetails) {
        initialForm.bpd_possessionStatus = existingProperty.builderProjectDetails.possessionStatus || '';
        initialForm.bpd_possessionYear = existingProperty.builderProjectDetails.possessionYear || '';
        if (existingProperty.builderProjectDetails.ratings) {
          initialForm.bpd_constructionQuality = existingProperty.builderProjectDetails.ratings.constructionQuality || '';
          initialForm.bpd_aiSummary = existingProperty.builderProjectDetails.ratings.aiSummary || '';
        }
        if (existingProperty.builderProjectDetails.priceHistory) {
          initialForm.bpd_currentPricePerSqft = existingProperty.builderProjectDetails.priceHistory.currentPricePerSqft || '';
          initialForm.bpd_appreciationLast3Years = existingProperty.builderProjectDetails.priceHistory.appreciationLast3Years || '';
        }
      }
      return initialForm;
    }
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    if (!parsed.country) parsed.country = 'India';
    return parsed;
  });

  // Fetch Template
  useEffect(() => {
    if (!transactionType || !category || !displayPropertyType) {
      navigate('/list-property');
      return;
    }

    const fetchTemplate = async () => {
      try {
        const endpoint = user?.role === 'builder' ? `/builder-forms/template` : `/property-forms/template`;
        const res = await api.get(endpoint, {
          params: { 
            transactionType, 
            category, 
            propertyType: displayPropertyType
          }
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
  }, [transactionType, category, displayPropertyType, navigate]);

  // Save form data to localStorage on change
  useEffect(() => {
    if (!isEditMode && Object.keys(formData).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData, storageKey, isEditMode]);

  // Save currentStepIndex to localStorage on change & Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (stepStorageKey && stepStorageKey !== 'draft_step_default') {
      localStorage.setItem(stepStorageKey, currentStepIndex.toString());
    }
  }, [currentStepIndex, stepStorageKey]);

  // Keep the active step chip scrolled into view as currentStepIndex changes
  // (15 steps overflow the header width, so without this the current step can
  // scroll off-screen and the builder loses their place in the flow).
  const stepChipRefs = useRef({});
  useEffect(() => {
    const el = stepChipRefs.current[currentStepIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentStepIndex]);

  // Robust Lenis & Body Scroll Lock for Modal Dialogs
  useEffect(() => {
    const isAnyModalOpen = showPricingModal || customTagModal.open;
    if (isAnyModalOpen) {
      if (window.lenis) window.lenis.stop();
      document.body.style.overflow = 'hidden';
    } else {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
    }
    return () => {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
    };
  }, [showPricingModal, customTagModal.open]);

  // Sync pricing modal fields when loaded/edited
  useEffect(() => {
    if (showPricingModal) {
      setModalMaintenance(formData.maintenanceCharges || '');
      setModalFrequency(formData.maintenanceFrequency || 'Monthly');
      setModalBooking(formData.bookingAmount || '');
    }
  }, [showPricingModal, formData.maintenanceCharges, formData.maintenanceFrequency, formData.bookingAmount]);

  const handleChange = (name, value) => {
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      // Automatically default unit if not selected yet
      const unitFieldKey = unitFieldMapping[name];
      if (unitFieldKey && !next[unitFieldKey]) {
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

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Jumping backwards is always allowed; moving forward must go through
  // handleNext so the current step's validation still runs.
  const goToStep = (index) => {
    if (index < 0 || index > currentStepIndex) return;
    setErrors({});
    setCurrentStepIndex(index);
    scrollToTop();
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    } else {
      navigate(-1);
    }
  };

  const [draftSaved, setDraftSaved] = useState(false);

  // Everything already autosaves to localStorage on every keystroke (see the
  // formData effect above) — this button just gives the builder an explicit,
  // visible confirmation that nothing will be lost if they leave now.
  const saveDraft = () => {
    if (!isEditMode) {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
    toast.success('Draft saved. Resume anytime from where you left off.');
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleNext = () => {
    const currentStep = template.steps[currentStepIndex];
    let newErrors = {};
    let firstErrorField = null;

    if (currentStepIndex === 0 && isBrokerOrBuilder) {
      if (!formData.logo) {
        newErrors['logo'] = 'Property logo is required for brokers and builders';
        if (!firstErrorField) firstErrorField = 'logo';
      }
    }

    const isLocationStep = stepUsesLocationSelector(currentStep);
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
      // Skip validation for unit fields and custom pricing fields since they are validated/handled separately
      const isUnitField = ['carpetAreaUnit', 'builtUpAreaUnit', 'superAreaUnit', 'areaUnit', 'entranceWidthUnit', 'ceilingHeightUnit'].includes(field.name);
      const isCustomPricingField = pricingFieldsToFilter.includes(field.name);
      if (isUnitField || isCustomPricingField) {
        return;
      }

      // Basic visibility check (dependency)
      const isVisible = matchesDependsOn(field.dependsOn, formData);

      if (isVisible) {
        const value = formData[field.name];
        const isValEmpty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

        if (field.required && isValEmpty) {
          newErrors[field.name] = `${field.label} is required`;
          if (!firstErrorField) firstErrorField = field.name;
        } else if (!isValEmpty) {
          // Custom validations
          const isPhoneField = ['contactNumber', 'phone', 'mobile', 'mobileNumber', 'phoneNumber'].includes(field.name);
          if (isPhoneField) {
            if (!/^[6-9]\d{9}$/.test(value)) {
              newErrors[field.name] = 'Mobile number must be exactly 10 digits starting with 6-9';
              if (!firstErrorField) firstErrorField = field.name;
            }
          } else if (field.name === 'bpd_constructionQuality' || field.name === 'constructionQuality') {
            const numVal = Number(value);
            if (isNaN(numVal) || numVal < 1 || numVal > 5) {
              newErrors[field.name] = 'Construction quality rating must be a number between 1 and 5';
              if (!firstErrorField) firstErrorField = field.name;
            }
          } else if (field.name === 'bpd_possessionYear' || field.name === 'possessionYear') {
            const yearStr = String(value).trim();
            if (!/^\d{4}$/.test(yearStr)) {
              newErrors[field.name] = 'Possession year must be a 4-digit number (e.g. 2026)';
              if (!firstErrorField) firstErrorField = field.name;
            }
          } else if (field.type === 'number' && Number(value) < 0) {
            // Negative value check for number fields
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

        // Check repeater subfields and URL fields
        if (field.type === 'repeater' && Array.isArray(value)) {
          value.forEach((item, index) => {
            if (field.subFields) {
              field.subFields.forEach(subF => {
                if (subF.type === 'repeater') return; // Skip nested repeaters
                const isSubVisible = matchesDependsOn(subF.dependsOn, item);
                if (isSubVisible && subF.required) {
                  const subVal = item[subF.name];
                  const isSubEmpty = subVal === undefined || subVal === null || subVal === '';
                  if (isSubEmpty) {
                    newErrors[`${field.name}_${index}_${subF.name}`] = `${subF.label} is required`;
                    if (!firstErrorField) firstErrorField = field.name;
                  }
                }
              });
            }

            ['planImageOrUrl', 'floorPlanImage'].forEach(key => {
               if (item[key] && !item[key].startsWith('http')) {
                  newErrors[`${field.name}_${index}_${key}`] = 'Please provide a valid image URL (must start with http or https) or upload an image.';
                  if (!firstErrorField) firstErrorField = field.name;
               }
            });
          });
        }

        // Check media tag requirement (all uploaded photos/videos must be tagged)
        if (field.type === 'file' && Array.isArray(value) && value.length > 0) {
          const tagKey = `${field.name}_tags`;
          const tags = formData[tagKey] || {};
          const untaggedCount = value.filter((_, idx) => !tags[idx] || !String(tags[idx]).trim()).length;
          if (untaggedCount > 0) {
            newErrors[field.name] = `Please select or add a tag for all uploaded ${field.name === 'propertyImages' ? 'photos' : 'videos'} (${untaggedCount} untagged)`;
            if (!firstErrorField) firstErrorField = field.name;
          }
        }
      }
    });

    // Special custom comparison validations (Area size checks)
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

    console.log('Validation results:', newErrors);

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
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } else {
      submitForm();
    }
  };

  const submitForm = async () => {
    try {
      setLoading(true);
      const isProjectListing = Boolean(
        category?.toLowerCase().includes('project') || 
        displayPropertyType?.toLowerCase().includes('project') || 
        formData.builderProjectDetails || 
        formData.builderName || 
        (Array.isArray(formData.towers) && formData.towers.length > 0)
      );

      const payload = {
        propertyName: formData.propertyName || `${category} ${displayPropertyType} for ${transactionType}`,
        transactionType,
        propertyCategory: category,
        propertyType: displayPropertyType,
        isProject: isProjectListing,
        dynamicCategory: template?._id,
        dynamicData: formData,
        logo: formData.logo || '',
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
        localStorage.removeItem(storageKey);
        localStorage.removeItem(stepStorageKey);
        toast.success(isEditMode ? 'Property details updated successfully!' : 'Property details submitted successfully!');
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
        <p className="text-gray-500 mb-6 text-center">Admin has not configured the steps for {transactionType} - {category} - {displayPropertyType} yet.</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Go Back</button>
      </div>
    );
  }

  const currentStep = template.steps[currentStepIndex];

  // Dynamic Field Renderer
  const renderField = (field) => {
    // Dependency check
    if (!matchesDependsOn(field.dependsOn, formData)) {
      return null; // Hide field
    }

    // Horizontal combined layout check for areas and custom facade dimensions
    const unitFieldName = unitFieldMapping[field.name];
    const unitField = unitFieldName ? currentStep.fields.find(f => f.name === unitFieldName) : null;

    if (unitField) {
      return (
        <div key={field.name} id={`field-${field.name}`} className="mb-6">
          <label className="block text-[14px] font-semibold text-slate-800 mb-2">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          
          <div className={`flex items-center bg-white border rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all ${
            errors[field.name] ? 'border-red-400' : 'border-slate-200'
          }`}>
            <input
              type="number"
              value={formData[field.name] || ''}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === '+' || e.key === 'e') e.preventDefault();
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) {
                  val = parts[0] + '.' + parts.slice(1).join('');
                }
                handleChange(field.name, val);
              }}
              placeholder={field.placeholder || ''}
              className="flex-1 bg-transparent px-4 py-3.5 text-[15px] outline-none border-none"
            />
            <div className="shrink-0 relative border-l border-slate-100 bg-slate-50/50">
              <select
                value={formData[unitFieldName] || unitField.options?.[0] || ''}
                onChange={(e) => handleChange(unitFieldName, e.target.value)}
                className="h-full bg-transparent px-3 py-3.5 text-[13px] font-bold text-slate-500 outline-none appearance-none pr-8 cursor-pointer"
              >
                {unitField.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
          {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}
        </div>
      );
    }

    switch (field.type) {
      case 'text':
      case 'number':
        const isRentTxn = transactionType?.toLowerCase().includes('rent') || transactionType?.toLowerCase().includes('lease') || transactionType?.toLowerCase().includes('pg');
        const isPriceField = field.name === 'monthlyRent' || field.name === 'expectedPrice';

        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {(() => {
              const isPhoneField = ['contactNumber', 'phone', 'mobile', 'mobileNumber', 'phoneNumber'].includes(field.name);
              if (isPhoneField) {
                return (
                  <div className={`flex items-center bg-white border rounded-xl px-4 py-3.5 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${
                    errors[field.name] ? 'border-red-400' : 'border-slate-200'
                  }`}>
                    <span className="text-[15px] font-bold text-slate-500 mr-2">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData[field.name] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ''); // only digits
                        handleChange(field.name, val);
                      }}
                      placeholder={field.placeholder || 'e.g. 9876543210'}
                      className="w-full bg-transparent text-[15px] font-semibold outline-none border-none p-0"
                    />
                  </div>
                );
              }
              return (
                <input
                  type={field.type}
                  value={formData[field.name] || ''}
                  onKeyDown={(e) => {
                    if (field.type === 'number' && (e.key === '-' || e.key === '+' || e.key === 'e')) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (field.type === 'number') {
                      val = val.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      if (parts.length > 2) {
                        val = parts[0] + '.' + parts.slice(1).join('');
                      }
                    }
                    handleChange(field.name, val);
                  }}
                  placeholder={field.placeholder || ''}
                  className={`w-full bg-white border rounded-xl px-4 py-3.5 text-[15px] outline-none transition-all ${
                    errors[field.name] 
                      ? 'border-red-400 focus:ring-1 focus:ring-red-400' 
                      : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
              );
            })()}
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}

            {/* Custom pricing features for Negotiable, Water/Electricity exclusions, and Maintenance Popup */}
            {isPriceField && (
              <div className="flex flex-col gap-3 mt-4 pl-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.priceNegotiable === 'Yes' || formData.priceNegotiable === true}
                    onChange={(e) => handleChange('priceNegotiable', e.target.checked ? 'Yes' : 'No')}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[14px] font-medium text-slate-700">Price Negotiable</span>
                </label>
                
                {isRentTxn && (
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.electricityWaterExcluded === 'Yes' || formData.electricityWaterExcluded === true}
                      onChange={(e) => handleChange('electricityWaterExcluded', e.target.checked ? 'Yes' : 'No')}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[14px] font-medium text-slate-700">Electricity & Water charges excluded</span>
                  </label>
                )}
                
                <button
                  type="button"
                  onClick={() => setShowPricingModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[14px] flex items-center gap-1.5 self-start mt-2"
                >
                  <span className="text-lg font-bold leading-none">+</span> Add Maintenance and Booking Amount
                </button>
                
                {/* Summary of maintenance and booking amount if added */}
                {(formData.maintenanceCharges || formData.bookingAmount) && (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mt-2 flex flex-col gap-2 text-[13px] text-slate-600 font-semibold max-w-sm shadow-sm">
                    {formData.maintenanceCharges && (
                      <div className="flex justify-between">
                        <span>Maintenance:</span>
                        <span className="font-bold text-slate-800">₹{formData.maintenanceCharges} ({formData.maintenanceFrequency || 'Monthly'})</span>
                      </div>
                    )}
                    {formData.bookingAmount && (
                      <div className="flex justify-between">
                        <span>Booking Amount:</span>
                        <span className="font-bold text-slate-800">₹{formData.bookingAmount}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
                      ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm font-semibold'
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

      case 'multiselect_pill':
        const selectedPills = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        const baseOptions = field.options || [];
        const customPills = selectedPills.filter(p => !baseOptions.includes(p));
        const allPills = [...baseOptions, ...customPills];

        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {allPills.map(opt => {
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
                        next = isSelected 
                          ? filtered.filter(o => o !== opt) 
                          : [...filtered, opt];
                      }
                      handleChange(field.name, next);
                    }}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all border whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#F2FAFD] text-[#0073E6] border-[#0073E6] shadow-sm font-bold'
                        : errors[field.name]
                          ? 'bg-white text-slate-500 border-red-200'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-bold leading-none">{isSelected ? '✓' : '+'}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder={`Add custom ${field.label.toLowerCase()}...`}
                id={`custom-input-${field.name}`}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[13px] outline-none focus:border-blue-500 w-full md:w-64"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value.trim();
                    if (val && !selectedPills.includes(val)) {
                      handleChange(field.name, [...selectedPills, val]);
                    }
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const inputEl = document.getElementById(`custom-input-${field.name}`);
                  const val = inputEl?.value?.trim();
                  if (val && !selectedPills.includes(val)) {
                    handleChange(field.name, [...selectedPills, val]);
                  }
                  if (inputEl) inputEl.value = '';
                }}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[13px] font-bold rounded-xl transition-colors shrink-0"
              >
                Add
              </button>
            </div>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={`w-full bg-white border rounded-xl px-4 py-3 text-[15px] outline-none transition-all ${
                errors[field.name] 
                  ? 'border-red-400 focus:ring-1 focus:ring-red-400' 
                  : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}
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
        const isGalleryField = field.name === 'propertyImages';
        const isBrochureField = field.name === 'brochure' || field.name === 'brochureUrl' || field.label?.toLowerCase().includes('brochure');
        const isVideoField = field.name === 'propertyVideos' || field.name === 'videoUrl';

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
                <p className="text-[13px] text-slate-600 font-medium">
                  {isBrochureField ? 'Click to upload e-Brochure (PDF / Document)' : (isGalleryField ? 'Click to upload photos' : (isVideoField ? 'Click to upload videos' : 'Click to upload files'))}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isBrochureField ? 'Max size 10MB. PDF, DOCX, JPG, PNG' : (isGalleryField ? 'Max size 5MB. JPG, PNG, WEBP' : (isVideoField ? 'Max size 50MB. MP4, WEBM, MOV' : 'Max size 10MB'))}
                </p>
              </div>
              <input
                type="file"
                multiple
                accept={isBrochureField ? ".pdf,.doc,.docx,image/*" : (isGalleryField ? "image/*" : (isVideoField ? "video/*" : "image/*,video/*,.pdf"))}
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
                      
                      // Bind videoUrl if uploaded file is a video
                      const videoUrls = urls.filter(u => typeof u === 'string' && (u.match(/\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i) || u.includes('/video/upload/')));
                      if (videoUrls.length > 0) {
                        handleChange('videoUrl', videoUrls[0]);
                        handleChange('youtubeUrl', videoUrls[0]);
                      }
                      toast.success('Uploaded successfully!', { id: uploadToastId });
                    } else {
                      toast.error('Upload failed: Empty response', { id: uploadToastId });
                    }
                  } catch (err) {
                    toast.error(err.message || 'Upload failed', { id: uploadToastId });
                  }
                }}
                className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* URL Input Option */}
            <div className="mt-3 flex gap-2">
              <input
                type="url"
                placeholder="Or paste video/image URL here (e.g. YouTube link)..."
                id={`url-input-${field.name}`}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-blue-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value.trim();
                    if (val) {
                      const currentImages = formData[field.name] || [];
                      handleChange(field.name, [...currentImages, val]);
                      e.target.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const inputEl = document.getElementById(`url-input-${field.name}`);
                  if (inputEl) {
                    const val = inputEl.value.trim();
                    if (val) {
                      const currentImages = formData[field.name] || [];
                      handleChange(field.name, [...currentImages, val]);
                      if (val.includes('youtube.com') || val.includes('youtu.be') || val.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
                        handleChange('videoUrl', val);
                        handleChange('youtubeUrl', val);
                      }
                      inputEl.value = '';
                    }
                  }
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold rounded-xl transition-colors"
              >
                Add URL
              </button>
            </div>
            
            {/* Display selected files with Tags & Video Preview Support */}
            {formData[field.name] && Array.isArray(formData[field.name]) && formData[field.name].length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {formData[field.name].map((url, i) => {
                  const tagKey = `${field.name}_tags`;
                  const tags = formData[tagKey] || {};
                  const currentTag = tags[i] || '';

                  // Check if media URL is video or YouTube link
                  const isVid = url && (
                    url.match(/\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i) ||
                    url.includes('youtube.com') ||
                    url.includes('youtu.be') ||
                    url.includes('video')
                  );

                  const ytMatch = url ? url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/s]{11})/i) : null;
                  const ytId = ytMatch ? ytMatch[1] : null;

                  return (
                    <div key={i} className="bg-slate-50 p-2 rounded-xl border border-slate-200 relative group flex flex-col gap-1.5">
                      <div className="h-24 w-full rounded-lg overflow-hidden relative bg-slate-900 flex items-center justify-center">
                        {ytId ? (
                          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="video preview" className="w-full h-full object-cover" />
                        ) : isVid ? (
                          <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                        ) : brokenMedia[`${field.name}_${i}`] ? (
                          <div className="text-[10px] text-slate-400 font-bold p-2 text-center">Media File/Video<br/>{url.slice(0, 20)}...</div>
                        ) : (
                          <img
                            src={url}
                            alt="upload preview"
                            className="w-full h-full object-cover"
                            onError={() => {
                              // Fallback if image load fails - update state instead of
                              // mutating the DOM directly, which would desync React's
                              // virtual DOM and crash the app on the next re-render.
                              setBrokenMedia(prev => ({ ...prev, [`${field.name}_${i}`]: true }));
                            }}
                          />
                        )}

                        {isVid && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                            <span className="text-white text-[10px] bg-red-600 px-1.5 py-0.5 rounded-full font-bold">▶ VIDEO</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const nextImages = [...(formData[field.name] || [])];
                            nextImages.splice(i, 1);
                            handleChange(field.name, nextImages);
                            // Also clear videoUrl if removing from propertyVideos field
                            if (field.name === 'propertyVideos' || field.name === 'videoUrl') {
                              handleChange('videoUrl', nextImages[0] || '');
                            }
                          }}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-1 rounded-full text-[10px] w-5 h-5 flex items-center justify-center transition-all z-10"
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* Image/Video Tag Dropdown + Custom Tag Modal Trigger */}
                      <div className="flex flex-col gap-1">
                        <select
                          value={['Hall', 'Kitchen', 'Bedroom', 'Master Bedroom', 'Bathroom', 'Elevation', 'Floor Plan', 'Balcony', 'Project Video'].includes(currentTag) ? currentTag : (currentTag ? 'Custom' : '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'Custom') {
                              setCustomTagModal({ open: true, fieldName: field.name, index: i, value: currentTag && !['Hall', 'Kitchen', 'Bedroom', 'Master Bedroom', 'Bathroom', 'Elevation', 'Floor Plan', 'Balcony', 'Project Video'].includes(currentTag) ? currentTag : '' });
                            } else {
                              handleChange(tagKey, { ...tags, [i]: val });
                            }
                          }}
                          className={`text-[11px] font-bold text-slate-700 bg-white border rounded-lg px-2 py-1 outline-none w-full cursor-pointer transition-colors ${
                            !currentTag && errors[field.name] ? 'border-red-500 bg-red-50/50' : 'border-slate-200'
                          }`}
                        >
                          <option value="">+ Tag Media Type</option>
                          <option value="Hall">Hall / Living</option>
                          <option value="Kitchen">Kitchen</option>
                          <option value="Bedroom">Bedroom</option>
                          <option value="Master Bedroom">Master Bedroom</option>
                          <option value="Bathroom">Bathroom</option>
                          <option value="Elevation">Elevation / Exterior</option>
                          <option value="Floor Plan">Floor Plan</option>
                          <option value="Balcony">Balcony / View</option>
                          <option value="Project Video">Project Video Tour</option>
                          <option value="Custom">✏️ Add / Edit Custom Tag...</option>
                        </select>
                        {!currentTag && errors[field.name] && (
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-center block">
                            ⚠️ Tag Required
                          </span>
                        )}
                        {currentTag && (
                          <div
                            onClick={() => setCustomTagModal({ open: true, fieldName: field.name, index: i, value: currentTag })}
                            className="flex items-center justify-between text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            <span className="truncate">Tag: {currentTag}</span>
                            <span className="text-[9px] text-blue-400 font-normal ml-1 shrink-0">Edit</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              {Array.from(new Set([...(field.options || []), ...(selectedOptions.filter(o => !(field.options || []).includes(o)))])).map(opt => {
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

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder={`Add custom ${field.label.toLowerCase()}...`}
                id={`custom-cbx-${field.name}`}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[13px] outline-none focus:border-blue-500 w-full md:w-64"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value.trim();
                    if (val && !selectedOptions.includes(val)) {
                      handleChange(field.name, [...selectedOptions, val]);
                    }
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const inputEl = document.getElementById(`custom-cbx-${field.name}`);
                  const val = inputEl?.value?.trim();
                  if (val && !selectedOptions.includes(val)) {
                    handleChange(field.name, [...selectedOptions, val]);
                  }
                  if (inputEl) inputEl.value = '';
                }}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[13px] font-bold rounded-xl transition-colors shrink-0"
              >
                Add
              </button>
            </div>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );

      case 'nearby_places':
        const NearbyPlacesField = () => {
          const places = Array.isArray(formData[field.name]) ? formData[field.name] : [];
          const [name, setName] = React.useState('');
          const [customType, setCustomType] = React.useState('');
          const [distance, setDistance] = React.useState('');

          const handleAdd = () => {
            const distNum = Number(distance);
            if (!name.trim() || !customType.trim() || !distNum) {
              toast.error('Please enter name, category and distance');
              return;
            }
            const newPlace = { name: name.trim(), type: customType.trim(), distanceKm: distNum };
            handleChange(field.name, [...places, newPlace]);
            setName('');
            setCustomType('');
            setDistance('');
          };

          return (
            <div key={field.name} id={`field-${field.name}`} className="mb-6">
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
              
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Place name (e.g. Apollo)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-blue-500 flex-1 min-w-0"
                />
                
                <input
                  type="text"
                  placeholder="Category (e.g. Hospital)"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-blue-500 flex-1 min-w-0"
                />

                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Distance (km)"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none w-28 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[12px] font-bold uppercase transition-all shadow-sm shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
              {errors[field.name] && <p className="text-red-500 text-[10px] mt-2 ml-1">{errors[field.name]}</p>}
            </div>
          );
        };
        return <NearbyPlacesField key={field.name} />;

      case 'repeater':
        const repeaterItems = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[15px] font-bold text-slate-800">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
            </div>
            
            <div className="space-y-4">
              {repeaterItems.map((item, index) => (
                <div key={index} className="p-4 bg-white border border-slate-200 rounded-xl relative shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...repeaterItems];
                      next.splice(index, 1);
                      handleChange(field.name, next);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-colors font-bold z-10"
                  >
                    ×
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {field.subFields?.map(subF => {
                      // Add dependency check
                      if (!matchesDependsOn(subF.dependsOn, item)) return null;

                      // Tower dropdown options are dynamic (user-entered in Step 3), not static template options.
                      const subFOptions = (field.name === 'unitConfigurations' && subF.name === 'towerName')
                        ? (formData.towers || []).map(t => t.towerName).filter(Boolean)
                        : subF.options;

                      if (subF.type === 'file') {
                         return (
                           <div key={subF.name} className="flex flex-col">
                             <label className="text-[12px] font-semibold text-slate-600 mb-1">
                               {subF.label} {subF.required && <span className="text-red-500">*</span>}
                             </label>
                             <div className="flex flex-col gap-2 items-start w-full">
                               <input type="text" placeholder="Image URL..." 
                                 className="border rounded-lg px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500"
                                 value={item[subF.name] || ''}
                                 onChange={(e) => {
                                    const next = [...repeaterItems];
                                    next[index] = { ...next[index], [subF.name]: e.target.value };
                                    handleChange(field.name, next);
                                 }}
                               />
                               <label className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-[12px] font-bold cursor-pointer transition-colors w-fit">
                                 Upload Image
                                 <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const fd = new FormData();
                                    fd.append('images', file);
                                    const toastId = toast.loading('Uploading...');
                                    try {
                                      const res = await hotelService.uploadImages(fd);
                                      if (res?.urls?.[0]) {
                                        const next = [...repeaterItems];
                                        next[index] = { ...next[index], [subF.name]: res.urls[0] };
                                        handleChange(field.name, next);
                                        toast.success('Uploaded', { id: toastId });
                                      }
                                    } catch (err) {
                                      toast.error('Upload failed', { id: toastId });
                                    }
                                 }} />
                               </label>
                             </div>
                             {item[subF.name] && <img src={item[subF.name]} alt="preview" className="h-12 w-auto mt-2 rounded border" />}
                             {errors[`${field.name}_${index}_${subF.name}`] && <p className="text-red-500 text-[10px] mt-2 font-semibold">{errors[`${field.name}_${index}_${subF.name}`]}</p>}
                           </div>
                         );
                      }

                      if (subF.type === 'pill') {
                        return (
                          <div key={subF.name} className="flex flex-col col-span-1 md:col-span-2">
                            <label className="text-[12px] font-semibold text-slate-600 mb-2">
                              {subF.label} {subF.required && <span className="text-red-500">*</span>}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {subF.options?.map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    const next = [...repeaterItems];
                                    next[index] = { ...next[index], [subF.name]: opt };
                                    handleChange(field.name, next);
                                  }}
                                  className={`px-4 py-2 text-[12px] font-medium rounded-full border transition-all ${
                                    item[subF.name] === opt 
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                              <input 
                                type="text" 
                                placeholder="Custom tag..." 
                                className="border border-slate-200 rounded-full px-4 py-2 text-[12px] outline-none focus:border-blue-500 w-32 transition-all"
                                value={(!subF.options?.includes(item[subF.name])) ? (item[subF.name] || '') : ''}
                                onChange={(e) => {
                                  const next = [...repeaterItems];
                                  next[index] = { ...next[index], [subF.name]: e.target.value };
                                  handleChange(field.name, next);
                                }}
                              />
                            </div>
                            {errors[`${field.name}_${index}_${subF.name}`] && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors[`${field.name}_${index}_${subF.name}`]}</p>}
                          </div>
                        );
                      }
                      
                      if (subF.type === 'dropdown') {
                        return (
                          <div key={subF.name} className="flex flex-col">
                            <label className="text-[12px] font-semibold text-slate-600 mb-1">
                              {subF.label} {subF.required && <span className="text-red-500">*</span>}
                            </label>
                            <select
                              value={item[subF.name] || ''}
                              onChange={(e) => {
                                const next = [...repeaterItems];
                                next[index] = { ...next[index], [subF.name]: e.target.value };
                                handleChange(field.name, next);
                              }}
                              className="border rounded-lg px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 bg-white"
                            >
                              <option value="">{subFOptions?.length ? 'Select an option' : 'Add towers in Step 3 first'}</option>
                              {subFOptions?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            {errors[`${field.name}_${index}_${subF.name}`] && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors[`${field.name}_${index}_${subF.name}`]}</p>}
                          </div>
                        );
                      }

                      if (subF.type === 'repeater') {
                        const nestedItems = Array.isArray(item[subF.name]) ? item[subF.name] : [];
                        return (
                          <div key={subF.name} className="col-span-1 md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[12px] font-bold text-slate-700">
                                {subF.label} {subF.required && <span className="text-red-500">*</span>}
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedNested = [...nestedItems, {}];
                                  const nextRepeater = [...repeaterItems];
                                  nextRepeater[index] = { ...nextRepeater[index], [subF.name]: updatedNested };
                                  handleChange(field.name, nextRepeater);
                                }}
                                className="text-[11px] font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                + Add {subF.label}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {nestedItems.map((nItem, nIdx) => (
                                <div key={nIdx} className="flex flex-col md:flex-row gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 relative">
                                  {subF.subFields?.map(nSub => (
                                    <div key={nSub.name} className="flex-1 w-full">
                                      <input
                                        type={nSub.type === 'number' ? 'number' : 'text'}
                                        placeholder={nSub.placeholder || nSub.label}
                                        value={nItem[nSub.name] || ''}
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          if (nSub.type === 'number') {
                                            val = val.replace(/[^0-9.]/g, '');
                                          }
                                          const updatedNested = [...nestedItems];
                                          updatedNested[nIdx] = { ...updatedNested[nIdx], [nSub.name]: val };
                                          const nextRepeater = [...repeaterItems];
                                          nextRepeater[index] = { ...nextRepeater[index], [subF.name]: updatedNested };
                                          handleChange(field.name, nextRepeater);
                                        }}
                                        className="border rounded-md px-2.5 py-1.5 text-[12px] w-full outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedNested = [...nestedItems];
                                      updatedNested.splice(nIdx, 1);
                                      const nextRepeater = [...repeaterItems];
                                      nextRepeater[index] = { ...nextRepeater[index], [subF.name]: updatedNested };
                                      handleChange(field.name, nextRepeater);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm font-bold px-2 shrink-0"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {nestedItems.length === 0 && (
                                <p className="text-[11px] text-slate-400 italic">No {subF.label.toLowerCase()} added yet.</p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={subF.name} className="flex flex-col">
                          <label className="text-[12px] font-semibold text-slate-600 mb-1">
                            {subF.label} {subF.required && <span className="text-red-500">*</span>}
                          </label>
                          <input 
                            type={subF.type === 'number' ? 'number' : 'text'}
                            className="border rounded-lg px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500"
                            placeholder={subF.placeholder || ''}
                            value={item[subF.name] || ''}
                            onKeyDown={(e) => {
                              if (subF.type === 'number' && (e.key === '-' || e.key === '+' || e.key === 'e')) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (subF.type === 'number') {
                                val = val.replace(/[^0-9.]/g, '');
                                const parts = val.split('.');
                                if (parts.length > 2) {
                                  val = parts[0] + '.' + parts.slice(1).join('');
                                }
                              }
                              const next = [...repeaterItems];
                              next[index] = { ...next[index], [subF.name]: val };
                              handleChange(field.name, next);
                            }}
                          />
                          {errors[`${field.name}_${index}_${subF.name}`] && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors[`${field.name}_${index}_${subF.name}`]}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={() => {
                const newItem = {};
                handleChange(field.name, [...repeaterItems, newItem]);
              }}
              className="mt-4 px-4 py-2.5 bg-blue-50 text-blue-600 font-bold text-[13px] rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <span>+ Add {field.label} Item</span>
            </button>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-2">{errors[field.name]}</p>}
          </div>
        );

      // A single labelled document/image slot with Upload / Change File.
      case 'single_file': {
        const fileUrl = formData[field.name] || '';
        const isImage = fileUrl && /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(fileUrl);

        const uploadSingle = async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const toastId = toast.loading('Uploading...');
          try {
            const fd = new FormData();
            fd.append('images', file);
            const res = await hotelService.uploadImages(fd);
            const url = Array.isArray(res?.urls) ? res.urls[0] : null;
            if (url) {
              handleChange(field.name, url);
              toast.success('Uploaded', { id: toastId });
            } else {
              toast.error('Upload failed: empty response', { id: toastId });
            }
          } catch (err) {
            toast.error(err.message || 'Upload failed', { id: toastId });
          } finally {
            e.target.value = '';
          }
        };

        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-5">
            <label className="block text-[14px] font-semibold text-slate-800 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className={`flex items-center gap-3 bg-white border rounded-xl p-3 ${
              errors[field.name] ? 'border-red-400' : 'border-slate-200'
            }`}>
              <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                {fileUrl ? (
                  isImage
                    ? <img src={fileUrl} alt={field.label} className="w-full h-full object-cover" />
                    : <span className="text-[9px] font-bold text-slate-500 text-center px-1">FILE</span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-400">EMPTY</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-700 truncate">
                  {fileUrl ? decodeURIComponent(fileUrl.split('/').pop()) : 'No file uploaded'}
                </p>
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-600 hover:underline">
                    Preview
                  </a>
                )}
              </div>

              <label className="shrink-0 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-[12px] font-bold cursor-pointer transition-colors">
                {fileUrl ? 'Change File' : 'Upload'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={uploadSingle}
                />
              </label>

              {fileUrl && (
                <button
                  type="button"
                  onClick={() => handleChange(field.name, '')}
                  className="shrink-0 text-red-500 hover:text-red-600 font-black px-1.5"
                  aria-label={`Remove ${field.label}`}
                >
                  ×
                </button>
              )}
            </div>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}
          </div>
        );
      }

      // 0-100 percentage slider.
      case 'slider': {
        const pct = Number(formData[field.name] ?? 0);
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[14px] font-semibold text-slate-800">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <span className="text-[13px] font-bold text-blue-600 tabular-nums">{pct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => handleChange(field.name, Number(e.target.value))}
              className="w-full accent-[#0073E6] cursor-pointer"
            />
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors[field.name]}</p>}
          </div>
        );
      }

      // A labelled slider per construction stage; stored as { stage: percent }.
      case 'progress_group': {
        const progress = (formData[field.name] && typeof formData[field.name] === 'object') ? formData[field.name] : {};
        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <label className="block text-[14px] font-semibold text-slate-800 mb-3">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              {field.options?.map(stage => {
                const val = Number(progress[stage] ?? 0);
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-slate-600">{stage}</span>
                      <span className="text-[12px] font-bold text-slate-700 tabular-nums">{val}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={val}
                      onChange={(e) => handleChange(field.name, { ...progress, [stage]: Number(e.target.value) })}
                      className="w-full accent-[#0073E6] cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
            {errors[field.name] && <p className="text-red-500 text-[10px] mt-2 ml-1">{errors[field.name]}</p>}
          </div>
        );
      }

      // Final step: read-only summary of every previous step, with jump-to-edit.
      case 'review': {
        const formatValue = (val) => {
          if (val === undefined || val === null || val === '') return null;
          if (Array.isArray(val)) {
            if (val.length === 0) return null;
            if (typeof val[0] === 'object') return `${val.length} item${val.length > 1 ? 's' : ''} added`;
            return val.join(', ');
          }
          if (typeof val === 'object') {
            const entries = Object.entries(val).filter(([, v]) => v !== '' && v !== null && v !== undefined);
            if (entries.length === 0) return null;
            return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
          }
          return String(val);
        };

        return (
          <div key={field.name} id={`field-${field.name}`} className="mb-6">
            <div className="space-y-3">
              {template.steps.slice(0, -1).map((step, idx) => {
                const rows = step.fields
                  .filter(f => f.type !== 'review')
                  .map(f => ({ label: f.label, value: formatValue(formData[f.name]) }))
                  .filter(r => r.value !== null);

                // Surface the address captured by the LocationSelector too
                if (stepUsesLocationSelector(step)) {
                  const addressLine = [formData.locality, formData.city, formData.district, formData.state]
                    .filter(Boolean).join(', ');
                  if (addressLine) rows.unshift({ label: 'Address', value: addressLine });
                }

                return (
                  <div key={step.stepNumber} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span className="text-[13px] font-bold text-slate-800">
                        {step.stepNumber}. {step.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStepIndex(idx)}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="px-4 py-3">
                      {rows.length === 0 ? (
                        <p className="text-[12px] text-slate-400 italic">Nothing added</p>
                      ) : (
                        <dl className="space-y-1.5">
                          {rows.map(row => (
                            <div key={row.label} className="flex gap-3 text-[12px]">
                              <dt className="text-slate-500 font-medium w-2/5 shrink-0">{row.label}</dt>
                              <dd className="text-slate-800 font-semibold break-words min-w-0">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-[12px] text-slate-500 leading-relaxed">
              Submitting sends this project for admin approval. You can keep editing it
              from <span className="font-semibold text-slate-700">My Properties</span> until it is approved.
            </p>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10 font-sans text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="px-4 md:px-6 h-14 md:h-16 flex items-center md:max-w-3xl lg:max-w-4xl md:mx-auto">
          <button onClick={goBack} className="p-2 -ml-2 text-slate-700">
            <ArrowLeft size={22} />
          </button>
          <div className="ml-2 min-w-0">
            <span className="block font-bold text-[17px] md:text-[19px] tracking-tight truncate">{currentStep.title}</span>
          </div>
          <span className="ml-auto shrink-0 text-[11px] font-bold text-[#0073E6] uppercase tracking-widest">
            {Math.round(((currentStepIndex + 1) / template.steps.length) * 100)}% Complete
          </span>
        </div>

        {/* Thin overall-progress bar, independent of the step-chip row below. */}
        <div className="h-1 bg-slate-100">
          <motion.div
            className="h-full bg-[#0073E6]"
            initial={false}
            animate={{ width: `${((currentStepIndex + 1) / template.steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Numbered step progress. Completed steps are clickable to jump back. */}
        <div className="px-4 md:px-6 pt-3 pb-3 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max md:max-w-3xl lg:max-w-4xl md:mx-auto">
            {template.steps.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <React.Fragment key={step.stepNumber}>
                  {idx > 0 && (
                    <span className={`h-[2px] w-4 shrink-0 rounded-full ${isDone || isCurrent ? 'bg-[#0073E6]' : 'bg-slate-200'}`} />
                  )}
                  <button
                    ref={(el) => { stepChipRefs.current[idx] = el; }}
                    type="button"
                    title={`${step.stepNumber}. ${step.title}`}
                    disabled={idx > currentStepIndex}
                    onClick={() => goToStep(idx)}
                    className={`w-6 h-6 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all ${
                      isCurrent
                        ? 'bg-[#0073E6] text-white border-[#0073E6] ring-2 ring-blue-100'
                        : isDone
                          ? 'bg-blue-50 text-[#0073E6] border-[#0073E6] cursor-pointer hover:bg-blue-100'
                          : 'bg-white text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-5 md:px-6 pt-6 md:pt-8">
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

            {currentStepIndex === 0 && isBrokerOrBuilder && (
              <div id="field-logo" className="mb-6">
                <label className="block text-[14px] font-semibold text-slate-800 mb-2">
                  {user?.role === 'builder' ? 'Project Logo' : 'Property Logo'} <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Upload a logo to display on your {user?.role === 'builder' ? 'project' : 'property'} card listings (e.g. your builder or broker brand).
                </p>
                
                {formData.logo ? (
                  <div className="relative w-24 h-24 bg-white border border-slate-200 rounded-xl overflow-hidden group">
                    <img src={formData.logo} alt="Property Logo" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => handleChange('logo', '')}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[12px] font-bold transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative ${
                    errors.logo ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                  }`}>
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p className="text-[12px] text-slate-600 font-medium">Click to upload logo</p>
                      <p className="text-[10px] text-slate-400">Max size 2MB. JPG, PNG</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const uploadToastId = toast.loading('Uploading logo...');
                        try {
                          const fd = new FormData();
                          fd.append('images', file);
                          
                          const res = await hotelService.uploadImages(fd);
                          const urls = Array.isArray(res?.urls) ? res.urls : [];
                          
                          if (urls.length > 0) {
                            handleChange('logo', urls[0]);
                            toast.success('Logo uploaded successfully!', { id: uploadToastId });
                          } else {
                            toast.error('Upload failed: Empty response', { id: uploadToastId });
                          }
                        } catch (err) {
                          toast.error(err.message || 'Upload failed', { id: uploadToastId });
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
                {errors.logo && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.logo}</p>}
              </div>
            )}

            {stepUsesLocationSelector(currentStep) && (
              <div className="mb-6 space-y-4">
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
                  errors={errors}
                  required
                />
                
                <div className="space-y-4 mt-6">
                   <div>
                     <label className="block text-[14px] font-semibold text-slate-800 mb-2">Locality / Sector</label>
                     <input
                       type="text"
                       value={formData.locality || ''}
                       onChange={(e) => handleChange('locality', e.target.value)}
                       placeholder="e.g. Super Corridor"
                       className={`w-full bg-white border rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all ${errors.locality ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#005B9F]'}`}
                     />
                   </div>
                   <div>
                     <label className="block text-[14px] font-semibold text-slate-800 mb-2">Complete Property Address <span className="text-red-500">*</span></label>
                     <textarea
                       value={formData.fullAddress || formData.houseNumber || ''}
                       onChange={(e) => {
                         handleChange('fullAddress', e.target.value);
                         handleChange('houseNumber', e.target.value);
                       }}
                       placeholder="e.g. Plot No 12, Main Road..."
                       className={`w-full bg-white border rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all resize-none ${errors.fullAddress || errors.houseNumber ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#005B9F]'}`}
                       rows={3}
                     />
                     {(errors.fullAddress || errors.houseNumber) && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.fullAddress || errors.houseNumber}</p>}
                   </div>
                </div>
              </div>
            )}

            {/* Render Fields sorted by order. On desktop, short fields (text,
                number, dropdown, date...) sit two-per-row instead of each
                taking the full form width; fields that need the extra room
                (file uploads, textareas, tag clouds, repeaters...) still
                span both columns. */}
            <div className="md:grid md:grid-cols-2 md:gap-x-6">
              {currentStep.fields
                .sort((a,b) => a.order - b.order)
                .filter(field => {
                  const isLocationField = stepUsesLocationSelector(currentStep) && ['city', 'state', 'district', 'country', 'locality', 'fulladdress', 'housenumber'].includes(field.name.toLowerCase());
                  const isUnitField = ['carpetAreaUnit', 'builtUpAreaUnit', 'superAreaUnit', 'areaUnit', 'entranceWidthUnit', 'ceilingHeightUnit'].includes(field.name);
                  const isCustomPricingField = pricingFieldsToFilter.includes(field.name);

                  return !isLocationField && !isUnitField && !isCustomPricingField;
                })
                .map(field => {
                  const rendered = renderField(field);
                  if (!rendered) return null;
                  const isCombinedUnitField = !!unitFieldMapping[field.name];
                  const wideTypes = ['pill', 'multiselect_pill', 'file', 'textarea', 'checkbox_group', 'nearby_places', 'repeater', 'review', 'progress_group'];
                  const isWide = isCombinedUnitField || wideTypes.includes(field.type);
                  return (
                    <div key={field.name} className={isWide ? 'md:col-span-2' : ''}>
                      {rendered}
                    </div>
                  );
                })}
            </div>

          </motion.div>
        </AnimatePresence>

        {/* Save Draft / Back / Next */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-30 md:relative md:border-0 md:p-0 md:mt-10">
          <div className="flex gap-3 max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[15px] hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Back
            </button>
            {!isEditMode && (
              <button
                type="button"
                onClick={saveDraft}
                disabled={loading}
                title="Save your progress and continue later"
                className={`px-4 py-3.5 rounded-xl border font-bold text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  draftSaved
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {draftSaved ? <Check size={16} strokeWidth={3} /> : <Save size={16} />}
                <span className="hidden sm:inline">{draftSaved ? 'Saved' : 'Save Draft'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex-1 bg-[#005B9F] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px] disabled:opacity-60"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {currentStepIndex === template.steps.length - 1 ? 'Submit for Approval' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* More Pricing Details Popup Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 transition-all">
          <div 
            className="absolute inset-0 bg-transparent"
            onClick={() => setShowPricingModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-800">More Pricing Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">It is recommended to give more details.</p>
              </div>
              <button
                onClick={() => setShowPricingModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Maintenance (Optional)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={modalMaintenance}
                    onChange={(e) => setModalMaintenance(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <div className="relative w-full sm:w-36 shrink-0">
                    <select
                      value={modalFrequency}
                      onChange={(e) => setModalFrequency(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-[14px] outline-none focus:border-blue-500 transition-all font-semibold text-slate-700 cursor-pointer appearance-none pr-8"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Annually">Annually</option>
                      <option value="One-time">One-time</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Booking Amount (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={modalBooking}
                  onChange={(e) => setModalBooking(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalMaintenance('');
                  setModalFrequency('Monthly');
                  setModalBooking('');
                  handleChange('maintenanceCharges', '');
                  handleChange('maintenanceFrequency', 'Monthly');
                  handleChange('bookingAmount', '');
                  setShowPricingModal(false);
                }}
                className="flex-1 py-3 text-[14px] font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all active:scale-[0.98]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange('maintenanceCharges', modalMaintenance);
                  handleChange('maintenanceFrequency', modalFrequency);
                  handleChange('bookingAmount', modalBooking);
                  setShowPricingModal(false);
                }}
                className="flex-1 py-3 text-[14px] font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-md shadow-blue-500/20"
              >
                Submit
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Tag Editing In-App Modal */}
      {customTagModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Add / Edit Tag</h3>
              <button
                type="button"
                onClick={() => setCustomTagModal({ open: false, fieldName: '', index: null, value: '' })}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter custom tag for this media file (e.g. Master Bedroom, Walkthrough, Site View):
            </p>

            <input
              type="text"
              autoFocus
              value={customTagModal.value}
              onChange={(e) => setCustomTagModal({ ...customTagModal, value: e.target.value })}
              placeholder="e.g. Pooja Room, Terrace View..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customTagModal.value.trim()) {
                    const tagKey = `${customTagModal.fieldName}_tags`;
                    const currentTags = formData[tagKey] || {};
                    handleChange(tagKey, { ...currentTags, [customTagModal.index]: customTagModal.value.trim() });
                  }
                  setCustomTagModal({ open: false, fieldName: '', index: null, value: '' });
                }
              }}
            />

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (customTagModal.index !== null) {
                    const tagKey = `${customTagModal.fieldName}_tags`;
                    const currentTags = { ...(formData[tagKey] || {}) };
                    delete currentTags[customTagModal.index];
                    handleChange(tagKey, currentTags);
                  }
                  setCustomTagModal({ open: false, fieldName: '', index: null, value: '' });
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
              >
                Remove Tag
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customTagModal.value.trim()) {
                    const tagKey = `${customTagModal.fieldName}_tags`;
                    const currentTags = formData[tagKey] || {};
                    handleChange(tagKey, { ...currentTags, [customTagModal.index]: customTagModal.value.trim() });
                  }
                  setCustomTagModal({ open: false, fieldName: '', index: null, value: '' });
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                Save Tag
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DynamicFormEngine;
