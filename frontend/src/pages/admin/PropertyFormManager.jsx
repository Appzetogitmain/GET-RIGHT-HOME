import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiService';
import { 
  Plus, Trash2, Save, ChevronRight, Settings, Layers, 
  Edit2, X, Check, Loader2, Info, AlertTriangle, ArrowRight 
} from 'lucide-react';
import toast from 'react-hot-toast';

const PropertyFormManager = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection states
  const [selectedTxnType, setSelectedTxnType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPropType, setSelectedPropType] = useState('');
  
  // Active template being edited
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  // Dialog/Modal states for CRUD operations
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState('combination'); // 'category' | 'subcategory' | 'propertytype' | 'combination'
  const [modalData, setModalData] = useState({
    transactionType: '',
    category: '',
    propertyType: ''
  });

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameModalType, setRenameModalType] = useState(''); // 'category' | 'subcategory' | 'propertytype'
  const [renameData, setRenameData] = useState({
    oldValue: '',
    newValue: '',
    transactionType: '', // context
    category: ''        // context
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({
    title: 'Confirm Action',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title, message, onConfirm) => {
    setConfirmModalData({ title, message, onConfirm });
    setShowConfirmModal(true);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async (autoSelect = false, txn = '', cat = '', prop = '') => {
    try {
      setLoading(true);
      const res = await api.get('/property-forms/configs');
      if (res.data.success) {
        setConfigs(res.data.configs);
        if (autoSelect) {
          setSelectedTxnType(txn);
          setSelectedCategory(cat);
          setSelectedPropType(prop);
          await loadTemplate(txn, cat, prop);
        }
      }
    } catch (err) {
      toast.error('Failed to load configurations');
    }
    finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (transactionType, category, propertyType) => {
    try {
      setLoading(true);
      const res = await api.get('/property-forms/template', {
        params: { transactionType, category, propertyType }
      });
      if (res.data.success) {
        // Sort steps numerically
        const sortedSteps = res.data.template.steps.sort((a, b) => a.stepNumber - b.stepNumber);
        setCurrentTemplate({ ...res.data.template, steps: sortedSteps });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setCurrentTemplate({
          transactionType,
          category,
          propertyType,
          steps: [
            { stepNumber: 1, title: 'Property & Location Details', description: 'Basic details and location', fields: [] },
            { stepNumber: 2, title: 'Property Profile & Area', description: 'Layout and sizing details', fields: [] },
            { stepNumber: 3, title: 'Pricing & Amenities', description: 'Pricing and availability', fields: [] },
            { stepNumber: 4, title: 'Photos & Nearby Places', description: 'Media and landmarks', fields: [] }
          ]
        });
      } else {
        toast.error('Error loading template');
      }
    } finally {
      setLoading(false);
    }
  };

  // Hierarchy calculations
  const getCategoriesForTxn = () => {
    const found = configs.find(c => c.transactionType === selectedTxnType);
    return found ? found.categories : [];
  };

  const getPropTypesForCat = () => {
    const cats = getCategoriesForTxn();
    const found = cats.find(c => c.category === selectedCategory);
    return found ? found.propertyTypes : [];
  };

  // Add Item handler
  const handleAddSubmit = async () => {
    const { transactionType, category, propertyType } = modalData;
    if (!transactionType || !category || !propertyType) {
      toast.error('All fields are required to initialize a configuration template');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/property-forms/create-combination', {
        transactionType,
        category,
        propertyType
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Combination created successfully!');
        setShowAddModal(false);
        setModalData({ transactionType: '', category: '', propertyType: '' });
        // Automatically select the newly created configuration
        await fetchConfigs(true, transactionType, category, propertyType);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create combination');
    } finally {
      setSaving(false);
    }
  };

  // Rename handlers
  const handleRenameSubmit = async () => {
    const { oldValue, newValue, transactionType, category } = renameData;
    if (!newValue.trim()) {
      toast.error('New value cannot be empty');
      return;
    }

    try {
      setSaving(true);
      let res;
      if (renameModalType === 'category') {
        res = await api.post('/property-forms/rename-transaction-type', {
          oldName: oldValue,
          newName: newValue
        });
      } else if (renameModalType === 'subcategory') {
        res = await api.post('/property-forms/rename-category', {
          transactionType,
          oldCategory: oldValue,
          newCategory: newValue
        });
      } else if (renameModalType === 'propertytype') {
        res = await api.post('/property-forms/rename-property-type', {
          transactionType,
          category,
          oldPropertyType: oldValue,
          newPropertyType: newValue
        });
      }

      if (res?.data?.success) {
        toast.success(res.data.message || 'Renamed successfully!');
        setShowRenameModal(false);
        // Clear selection to prevent viewing state mismatch
        setSelectedTxnType('');
        setSelectedCategory('');
        setSelectedPropType('');
        setCurrentTemplate(null);
        await fetchConfigs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteItem = (type, itemDetails) => {
    let confirmMsg = '';
    if (type === 'category') {
      confirmMsg = `Are you sure you want to delete Category "${itemDetails.transactionType}"? This will delete ALL sub-categories and templates under it!`;
    } else if (type === 'subcategory') {
      confirmMsg = `Are you sure you want to delete Sub-category "${itemDetails.category}" under "${itemDetails.transactionType}"? This will delete all templates under it!`;
    } else if (type === 'propertytype') {
      confirmMsg = `Are you sure you want to delete Property Type "${itemDetails.propertyType}" under "${itemDetails.transactionType} > ${itemDetails.category}"?`;
    }

    triggerConfirm('Delete Configuration', confirmMsg, async () => {
      try {
        setSaving(true);
        let res;
        if (type === 'category') {
          res = await api.post('/property-forms/delete-transaction-type', {
            transactionType: itemDetails.transactionType
          });
        } else if (type === 'subcategory') {
          res = await api.post('/property-forms/delete-category', {
            transactionType: itemDetails.transactionType,
            category: itemDetails.category
          });
        } else if (type === 'propertytype') {
          res = await api.post('/property-forms/delete-property-type', {
            transactionType: itemDetails.transactionType,
            category: itemDetails.category,
            propertyType: itemDetails.propertyType
          });
        }

        if (res?.data?.success) {
          toast.success(res.data.message || 'Deleted successfully!');
          // Reset selections
          setSelectedTxnType('');
          setSelectedCategory('');
          setSelectedPropType('');
          setCurrentTemplate(null);
          await fetchConfigs();
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
      } finally {
        setSaving(false);
        setShowConfirmModal(false);
      }
    });
  };

  // Step and Field editors
  const addStep = () => {
    const nextNum = currentTemplate.steps.length + 1;
    const newStep = { stepNumber: nextNum, title: `Step ${nextNum}`, fields: [] };
    setCurrentTemplate({ ...currentTemplate, steps: [...currentTemplate.steps, newStep] });
  };

  const removeStep = (stepIndex) => {
    triggerConfirm(
      'Delete Step',
      'Are you sure you want to delete this step and all its fields? This action cannot be undone.',
      () => {
        const updatedSteps = currentTemplate.steps
          .filter((_, idx) => idx !== stepIndex)
          .map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
        setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
        setShowConfirmModal(false);
      }
    );
  };

  const addField = (stepIndex) => {
    const newField = {
      name: '',
      label: '',
      type: 'text',
      required: false,
      order: currentTemplate.steps[stepIndex].fields.length + 1,
      options: [],
      validation: {
        required: false,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        customErrorMessage: ''
      }
    };
    const updatedSteps = [...currentTemplate.steps];
    updatedSteps[stepIndex].fields.push(newField);
    setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
  };

  const removeField = (stepIndex, fieldIndex) => {
    const updatedSteps = [...currentTemplate.steps];
    updatedSteps[stepIndex].fields.splice(fieldIndex, 1);
    // Recalculate orders
    updatedSteps[stepIndex].fields.forEach((f, idx) => { f.order = idx + 1; });
    setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
  };

  const handleFieldChange = (stepIndex, fieldIndex, key, value) => {
    const updatedSteps = [...currentTemplate.steps];
    updatedSteps[stepIndex].fields[fieldIndex][key] = value;
    
    // Add default option if type is pill or dropdown or multi-checkbox
    if ((key === 'type') && ['pill', 'dropdown', 'checkbox_group', 'multiselect_pill'].includes(value)) {
      if (!updatedSteps[stepIndex].fields[fieldIndex].options?.length) {
        updatedSteps[stepIndex].fields[fieldIndex].options = ['Option 1', 'Option 2'];
      }
    }

    setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
  };

  const handleValidationChange = (stepIndex, fieldIndex, key, value) => {
    const updatedSteps = [...currentTemplate.steps];
    const field = updatedSteps[stepIndex].fields[fieldIndex];
    if (!field.validation) {
      field.validation = { required: false, min: null, max: null, minLength: null, maxLength: null, customErrorMessage: '' };
    }
    field.validation[key] = value === '' ? null : value;
    setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
  };

  const saveTemplate = async () => {
    // Check validation of keys/labels
    for (const step of currentTemplate.steps) {
      for (const field of step.fields) {
        if (!field.name.trim() || !field.label.trim()) {
          toast.error('All fields must have a valid display label and DB Key.');
          return;
        }
      }
    }

    try {
      setSaving(true);
      const res = await api.post('/property-forms/template', currentTemplate);
      if (res.data.success) {
        toast.success('Template saved successfully!');
        fetchConfigs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="text-[#004F4D] w-8 h-8" />
            Property CMS Form Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic Category ➔ Sub-category ➔ Property Type fields configuration and validations.
          </p>
        </div>
        {currentTemplate && (
          <button
            onClick={saveTemplate}
            disabled={saving}
            className="self-start md:self-auto bg-[#004F4D] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#003B39] transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Configuration
          </button>
        )}
      </div>

      {/* Explorer Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Cascade Navigation */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Level 1: Categories (Transaction Type) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers size={16} className="text-blue-500" />
                Level 1: Categories (Txn)
              </h3>
              <button 
                onClick={() => {
                  setAddModalType('category');
                  setModalData({ transactionType: '', category: 'Residential', propertyType: 'Apartment' });
                  setShowAddModal(true);
                }}
                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                title="Add New Category"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1.5">
              {configs.map(c => (
                <div 
                  key={c.transactionType} 
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    selectedTxnType === c.transactionType 
                      ? 'bg-blue-50/70 border-blue-200 text-blue-700 font-semibold' 
                      : 'bg-slate-50/50 border-transparent hover:bg-slate-50 text-slate-600'
                  }`}
                  onClick={() => {
                    setSelectedTxnType(c.transactionType);
                    setSelectedCategory('');
                    setSelectedPropType('');
                    setCurrentTemplate(null);
                  }}
                >
                  <span className="text-xs truncate">{c.transactionType}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameModalType('category');
                        setRenameData({ oldValue: c.transactionType, newValue: c.transactionType, transactionType: '', category: '' });
                        setShowRenameModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem('category', { transactionType: c.transactionType });
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {configs.length === 0 && <p className="text-xs text-slate-400 italic">No categories found.</p>}
            </div>
          </div>

          {/* Level 2: Sub-categories */}
          {selectedTxnType && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  Level 2: Sub-categories
                </h3>
                <button 
                  onClick={() => {
                    setAddModalType('subcategory');
                    setModalData({ transactionType: selectedTxnType, category: '', propertyType: 'Apartment' });
                    setShowAddModal(true);
                  }}
                  className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                  title="Add Sub-category"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-1.5">
                {getCategoriesForTxn().map(cat => (
                  <div 
                    key={cat.category}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      selectedCategory === cat.category 
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 font-semibold' 
                        : 'bg-slate-50/50 border-transparent hover:bg-slate-50 text-slate-600'
                    }`}
                    onClick={() => {
                      setSelectedCategory(cat.category);
                      setSelectedPropType('');
                      setCurrentTemplate(null);
                    }}
                  >
                    <span className="text-xs">{cat.category}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameModalType('subcategory');
                          setRenameData({ oldValue: cat.category, newValue: cat.category, transactionType: selectedTxnType, category: '' });
                          setShowRenameModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem('subcategory', { transactionType: selectedTxnType, category: cat.category });
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {getCategoriesForTxn().length === 0 && <p className="text-xs text-slate-400 italic">No sub-categories linked.</p>}
              </div>
            </div>
          )}

          {/* Level 3: Property Types */}
          {selectedCategory && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Layers size={16} className="text-emerald-500" />
                  Level 3: Property Types
                </h3>
                <button 
                  onClick={() => {
                    setAddModalType('propertytype');
                    setModalData({ transactionType: selectedTxnType, category: selectedCategory, propertyType: '' });
                    setShowAddModal(true);
                  }}
                  className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors"
                  title="Add Property Type"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-1.5">
                {getPropTypesForCat().map(type => (
                  <div 
                    key={type}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      selectedPropType === type 
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700 font-semibold' 
                        : 'bg-slate-50/50 border-transparent hover:bg-slate-50 text-slate-600'
                    }`}
                    onClick={() => {
                      setSelectedPropType(type);
                      loadTemplate(selectedTxnType, selectedCategory, type);
                    }}
                  >
                    <span className="text-xs truncate">{type}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameModalType('propertytype');
                          setRenameData({ oldValue: type, newValue: type, transactionType: selectedTxnType, category: selectedCategory });
                          setShowRenameModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem('propertytype', { transactionType: selectedTxnType, category: selectedCategory, propertyType: type });
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {getPropTypesForCat().length === 0 && <p className="text-xs text-slate-400 italic">No property types found.</p>}
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Fields Grid Editor */}
        <div className="xl:col-span-3">
          {currentTemplate ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Active Layout Selection Info Banner */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Configuration</div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>{currentTemplate.transactionType}</span>
                    <ArrowRight size={16} className="text-slate-400" />
                    <span>{currentTemplate.category}</span>
                    <ArrowRight size={16} className="text-slate-400" />
                    <span className="text-emerald-400">{currentTemplate.propertyType}</span>
                  </h2>
                </div>
                <div className="bg-slate-700/50 px-4 py-2 rounded-xl text-xs border border-slate-700 flex items-center gap-2">
                  <Info size={14} className="text-emerald-400" />
                  <span>Configuring {currentTemplate.steps.reduce((acc, step) => acc + step.fields.length, 0)} total fields</span>
                </div>
              </div>

              {/* Steps rendering */}
              {currentTemplate.steps.map((step, stepIdx) => (
                <div key={stepIdx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  
                  {/* Step Header */}
                  <div className="bg-slate-50/70 px-6 py-4 flex items-center justify-between border-b border-slate-100 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {step.stepNumber}
                      </span>
                      <div className="space-y-0.5">
                        <input 
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...currentTemplate.steps];
                            updated[stepIdx].title = e.target.value;
                            setCurrentTemplate({...currentTemplate, steps: updated});
                          }}
                          className="bg-transparent border-none font-bold text-slate-800 focus:ring-0 text-base p-0 w-60 md:w-80 outline-none focus:border-b focus:border-slate-300"
                          placeholder="Step Title"
                        />
                        <input 
                          type="text"
                          value={step.description || ''}
                          onChange={(e) => {
                            const updated = [...currentTemplate.steps];
                            updated[stepIdx].description = e.target.value;
                            setCurrentTemplate({...currentTemplate, steps: updated});
                          }}
                          className="bg-transparent border-none text-xs text-slate-400 focus:ring-0 p-0 w-60 md:w-80 outline-none block"
                          placeholder="Add step description..."
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => addField(stepIdx)} 
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border border-blue-100"
                      >
                        <Plus size={14} /> Add Field
                      </button>
                      <button 
                        onClick={() => removeStep(stepIdx)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Delete Step"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Step Fields Details */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {step.fields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                          
                          {/* Core Field Definition */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Label</label>
                              <input 
                                type="text"
                                value={field.label}
                                onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'label', e.target.value)}
                                className="w-full text-xs font-medium border-slate-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                placeholder="e.g. Expected Price (₹)"
                              />
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name (DB Key)</label>
                              <input 
                                type="text"
                                value={field.name}
                                onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'name', e.target.value)}
                                className="w-full text-xs font-medium border-slate-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 font-mono"
                                placeholder="e.g. expectedPrice"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Type</label>
                              <select 
                                value={field.type}
                                onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'type', e.target.value)}
                                className="w-full text-xs font-medium border-slate-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                              >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="email">Email</option>
                                <option value="tel">Phone (Tel)</option>
                                <option value="textarea">Text Area</option>
                                <option value="pill">Pill Selection</option>
                                <option value="multiselect_pill">Multi-Pill Selection</option>
                                <option value="dropdown">Dropdown Select</option>
                                <option value="radio">Radio Buttons</option>
                                <option value="checkbox">Single Checkbox</option>
                                <option value="checkbox_group">Checkbox Grid</option>
                                <option value="multiselect">Multi Select</option>
                                <option value="date">Date picker</option>
                                <option value="location">Location/Map</option>
                                <option value="nearby_places">Nearby Landmarks</option>
                                <option value="file">Media File Upload</option>
                              </select>
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Options (comma separated)</label>
                              <input 
                                type="text"
                                disabled={!['pill', 'dropdown', 'checkbox_group', 'multiselect_pill', 'radio', 'multiselect'].includes(field.type)}
                                value={field.options?.join(', ') || ''}
                                onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'options', e.target.value.split(',').map(s => s.trim()))}
                                className="w-full text-xs font-medium border-slate-200 rounded-lg disabled:opacity-30 disabled:bg-slate-100"
                                placeholder="e.g. Yes, No, Negotiable"
                              />
                            </div>
                            
                            <div className="md:col-span-1 flex items-center justify-end pt-5">
                              <button 
                                onClick={() => removeField(stepIdx, fieldIdx)}
                                className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Custom Validation Builder Section */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                <Settings size={12} className="text-slate-400" />
                                Validation & Conditional Settings
                              </span>
                              <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'required', e.target.checked)}
                                  className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
                                />
                                Required Field?
                              </label>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              {/* Conditional Logic UI */}
                              <div className="md:col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Depends On Field (DB Key)</label>
                                <input 
                                  type="text"
                                  value={field.dependsOn?.field || ''}
                                  onChange={(e) => {
                                      const updatedSteps = [...currentTemplate.steps];
                                      if (!updatedSteps[stepIdx].fields[fieldIdx].dependsOn) updatedSteps[stepIdx].fields[fieldIdx].dependsOn = {};
                                      updatedSteps[stepIdx].fields[fieldIdx].dependsOn.field = e.target.value;
                                      if (!e.target.value) updatedSteps[stepIdx].fields[fieldIdx].dependsOn = undefined;
                                      setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
                                  }}
                                  className="w-full p-1.5 text-xs border-slate-200 rounded font-mono bg-amber-50 focus:bg-white"
                                  placeholder="e.g. availability"
                                />
                              </div>
                              <div className="md:col-span-3 space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Depends On Value</label>
                                <input 
                                  type="text"
                                  value={field.dependsOn?.value || ''}
                                  onChange={(e) => {
                                      const updatedSteps = [...currentTemplate.steps];
                                      if (!updatedSteps[stepIdx].fields[fieldIdx].dependsOn) updatedSteps[stepIdx].fields[fieldIdx].dependsOn = {};
                                      updatedSteps[stepIdx].fields[fieldIdx].dependsOn.value = e.target.value;
                                      setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
                                  }}
                                  className="w-full p-1.5 text-xs border-slate-200 rounded bg-amber-50 focus:bg-white"
                                  placeholder="e.g. Ready to move"
                                />
                              </div>
                              {field.type === 'number' ? (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Min Value</label>
                                    <input 
                                      type="number"
                                      value={field.validation?.min ?? ''}
                                      onChange={(e) => handleValidationChange(stepIdx, fieldIdx, 'min', e.target.value)}
                                      className="w-full p-1.5 text-xs border-slate-200 rounded"
                                      placeholder="e.g. 1000"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Max Value</label>
                                    <input 
                                      type="number"
                                      value={field.validation?.max ?? ''}
                                      onChange={(e) => handleValidationChange(stepIdx, fieldIdx, 'max', e.target.value)}
                                      className="w-full p-1.5 text-xs border-slate-200 rounded"
                                      placeholder="e.g. 50000000"
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Min Length</label>
                                    <input 
                                      type="number"
                                      value={field.validation?.minLength ?? ''}
                                      onChange={(e) => handleValidationChange(stepIdx, fieldIdx, 'minLength', e.target.value)}
                                      className="w-full p-1.5 text-xs border-slate-200 rounded"
                                      placeholder="e.g. 10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Max Length</label>
                                    <input 
                                      type="number"
                                      value={field.validation?.maxLength ?? ''}
                                      onChange={(e) => handleValidationChange(stepIdx, fieldIdx, 'maxLength', e.target.value)}
                                      className="w-full p-1.5 text-xs border-slate-200 rounded"
                                      placeholder="e.g. 500"
                                    />
                                  </div>
                                </>
                              )}
                              
                              <div className="md:col-span-3 space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Custom Error Message</label>
                                <input 
                                  type="text"
                                  value={field.validation?.customErrorMessage || ''}
                                  onChange={(e) => handleValidationChange(stepIdx, fieldIdx, 'customErrorMessage', e.target.value)}
                                  className="w-full p-1.5 text-xs border-slate-200 rounded"
                                  placeholder="e.g. Price must be greater than ₹1,000"
                                />
                              </div>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={addStep}
                className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
              >
                <Plus size={20} /> Add New Step
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-dashed border-slate-200 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Settings size={40} className="text-slate-300 animate-pulse-slow" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Property Type Template</h2>
              <p className="text-slate-500 max-w-sm">Choose an existing configuration on the left hierarchy tree to load and edit its steps, fields and validation parameters.</p>
            </div>
          )}
        </div>

      </div>

      {/* dialog/Modal for ADDING config items */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">
                {addModalType === 'category' && 'Add Level 1 Category (Transaction)'}
                {addModalType === 'subcategory' && 'Add Level 2 Sub-category'}
                {addModalType === 'propertytype' && 'Add Level 3 Property Type'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Category (Level 1: Transaction Type)</label>
                <input 
                  type="text"
                  disabled={addModalType !== 'category'}
                  value={modalData.transactionType}
                  onChange={(e) => setModalData({...modalData, transactionType: e.target.value})}
                  className="w-full text-sm border-slate-200 rounded-lg p-2.5 bg-slate-50 disabled:opacity-75 disabled:bg-slate-100"
                  placeholder="e.g. Sell, Rent / Lease, Paying Guest"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Sub-category (Level 2)</label>
                <input 
                  type="text"
                  disabled={addModalType === 'propertytype'}
                  value={modalData.category}
                  onChange={(e) => setModalData({...modalData, category: e.target.value})}
                  className="w-full text-sm border-slate-200 rounded-lg p-2.5 bg-slate-50 disabled:opacity-75 disabled:bg-slate-100"
                  placeholder="e.g. Residential, Commercial"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Property Type Name (Level 3)</label>
                <input 
                  type="text"
                  value={modalData.propertyType}
                  onChange={(e) => setModalData({...modalData, propertyType: e.target.value})}
                  className="w-full text-sm border-slate-200 rounded-lg p-2.5 bg-slate-50"
                  placeholder="e.g. Apartment, Showroom, Studio"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSubmit}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="animate-spin" size={14} />}
                Add Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* dialog/Modal for RENAMING config items */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">
                Rename {renameModalType === 'category' && 'Level 1 Category'}
                {renameModalType === 'subcategory' && 'Level 2 Sub-category'}
                {renameModalType === 'propertytype' && 'Level 3 Property Type'}
              </h3>
              <button onClick={() => setShowRenameModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Old Name</label>
                <div className="w-full text-sm border border-slate-100 rounded-lg p-2.5 bg-slate-50 text-slate-500 font-medium">
                  {renameData.oldValue}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">New Name</label>
                <input 
                  type="text"
                  value={renameData.newValue}
                  onChange={(e) => setRenameData({...renameData, newValue: e.target.value})}
                  className="w-full text-sm border-slate-200 rounded-lg p-2.5"
                  placeholder="Enter new name..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button 
                onClick={() => setShowRenameModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleRenameSubmit}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="animate-spin" size={14} />}
                Confirm Rename
              </button>
            </div>
          </div>
        </div>
      )}
      {/* custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-900">{confirmModalData.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{confirmModalData.message}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModalData.onConfirm}
                disabled={saving}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="animate-spin" size={14} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PropertyFormManager;
