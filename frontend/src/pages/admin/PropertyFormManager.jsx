import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiService';
import { Plus, Trash2, Save, MoveUp, MoveDown, ChevronRight, Settings, Layout, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const PropertyFormManager = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState(null); // { transactionType, category, propertyType }
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  // Intent/Category options (Should ideally come from backend too)
  const transactionTypes = ['Sell', 'Rent / Lease', 'Paying Guest'];
  const categories = ['Residential', 'Commercial'];

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/property-forms/configs');
      if (res.data.success) {
        setConfigs(res.data.configs);
      }
    } catch (err) {
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (transactionType, category, propertyType) => {
    try {
      setLoading(true);
      setSelectedConfig({ transactionType, category, propertyType });
      const res = await api.get('/property-forms/template', {
        params: { transactionType, category, propertyType }
      });
      if (res.data.success) {
        setCurrentTemplate(res.data.template);
      }
    } catch (err) {
      // If 404, create a blank template locally
      if (err.response?.status === 404) {
        setCurrentTemplate({
          transactionType,
          category,
          propertyType,
          steps: [{ stepNumber: 1, title: 'Basic Details', fields: [] }]
        });
      } else {
        toast.error('Error loading template');
      }
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    const nextNum = currentTemplate.steps.length + 1;
    const newStep = { stepNumber: nextNum, title: `Step ${nextNum}`, fields: [] };
    setCurrentTemplate({ ...currentTemplate, steps: [...currentTemplate.steps, newStep] });
  };

  const addField = (stepIndex) => {
    const newField = {
      name: '',
      label: '',
      type: 'text',
      required: false,
      order: currentTemplate.steps[stepIndex].fields.length + 1,
      options: []
    };
    const updatedSteps = [...currentTemplate.steps];
    updatedSteps[stepIndex].fields.push(newField);
    setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
  };

  const handleFieldChange = (stepIndex, fieldIndex, key, value) => {
    const updatedSteps = [...currentTemplate.steps];
    updatedSteps[stepIndex].fields[fieldIndex][key] = value;
    
    // If type is pill/dropdown and no options, add placeholder
    if ((key === 'type') && (value === 'pill' || value === 'dropdown')) {
        if (!updatedSteps[stepIndex].fields[fieldIndex].options?.length) {
            updatedSteps[stepIndex].fields[fieldIndex].options = ['Option 1'];
        }
    }

    setCurrentTemplate({ ...currentTemplate, steps: updatedSteps });
  };

  const saveTemplate = async () => {
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
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Property Form Manager</h1>
          <p className="text-sm text-slate-500">Configure multi-step forms for different property types</p>
        </div>
        {currentTemplate && (
          <button
            onClick={saveTemplate}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Existing Configs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers size={18} className="text-blue-500" />
              Existing Templates
            </h3>
            <div className="space-y-3">
              {configs.map(config => (
                <div key={config.transactionType} className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{config.transactionType}</div>
                  {config.categories.map(cat => (
                    <div key={cat.category} className="pl-2 space-y-1">
                      <div className="text-[11px] font-bold text-slate-600">{cat.category}</div>
                      {cat.propertyTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => loadTemplate(config.transactionType, cat.category, type)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            selectedConfig?.propertyType === type && selectedConfig?.transactionType === config.transactionType
                              ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                              : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {configs.length === 0 && <p className="text-xs text-slate-400 italic">No templates found. Create one below.</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-emerald-500" />
              New Template
            </h3>
            <button 
              onClick={() => loadTemplate('Sell', 'Residential', 'Apartment')}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium hover:border-blue-300 hover:text-blue-500 transition-all"
            >
              Configure New Type
            </button>
          </div>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-3">
          {currentTemplate ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction</label>
                  <select 
                    value={currentTemplate.transactionType}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, transactionType: e.target.value})}
                    className="block w-full text-sm font-bold bg-slate-50 border-none rounded-lg focus:ring-0"
                  >
                    {transactionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                  <select 
                    value={currentTemplate.category}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, category: e.target.value})}
                    className="block w-full text-sm font-bold bg-slate-50 border-none rounded-lg focus:ring-0"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Type</label>
                  <input 
                    type="text"
                    value={currentTemplate.propertyType}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, propertyType: e.target.value})}
                    className="block w-full text-sm font-bold bg-slate-50 border-none rounded-lg focus:ring-0"
                    placeholder="e.g. Office Space"
                  />
                </div>
              </div>

              {/* Steps Editor */}
              {currentTemplate.steps.map((step, stepIdx) => (
                <div key={stepIdx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {step.stepNumber}
                      </span>
                      <input 
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...currentTemplate.steps];
                          updated[stepIdx].title = e.target.value;
                          setCurrentTemplate({...currentTemplate, steps: updated});
                        }}
                        className="bg-transparent border-none font-bold text-slate-800 focus:ring-0 text-lg p-0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => addField(stepIdx)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all">
                        <Plus size={14} /> Add Field
                      </button>
                      <button className="text-slate-400 hover:text-red-500 p-1.5">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4">
                      {step.fields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Label</label>
                            <input 
                              type="text"
                              value={field.label}
                              onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'label', e.target.value)}
                              className="w-full text-xs font-medium border-slate-200 rounded-lg"
                              placeholder="e.g. Area (sqft)"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Name (DB Key)</label>
                            <input 
                              type="text"
                              value={field.name}
                              onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'name', e.target.value)}
                              className="w-full text-xs font-medium border-slate-200 rounded-lg"
                              placeholder="e.g. carpetArea"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                            <select 
                              value={field.type}
                              onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'type', e.target.value)}
                              className="w-full text-xs font-medium border-slate-200 rounded-lg"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="pill">Pill Buttons</option>
                              <option value="dropdown">Dropdown</option>
                              <option value="textarea">Textarea</option>
                            </select>
                          </div>
                          <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Options (comma separated)</label>
                            <input 
                              type="text"
                              disabled={!['pill', 'dropdown'].includes(field.type)}
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'options', e.target.value.split(',').map(s => s.trim()))}
                              className="w-full text-xs font-medium border-slate-200 rounded-lg disabled:opacity-30"
                              placeholder="Opt 1, Opt 2..."
                            />
                          </div>
                          <div className="md:col-span-1 space-y-1 flex flex-col items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Req?</label>
                            <input 
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleFieldChange(stepIdx, fieldIdx, 'required', e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 mt-1"
                            />
                          </div>
                          <div className="md:col-span-1 flex items-center justify-end pt-5">
                            <button className="text-slate-300 hover:text-red-500 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={addStep}
                className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                <Plus size={20} /> Add New Step
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-dashed border-slate-200 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Settings size={40} className="text-slate-300 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Template to Edit</h2>
              <p className="text-slate-500 max-w-sm">Choose an existing property type from the sidebar or configure a new one to manage its steps and fields.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyFormManager;
