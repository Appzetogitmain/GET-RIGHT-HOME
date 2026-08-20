import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, MapPin, Save, AlertCircle, Pencil, X } from 'lucide-react';
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminManageLocalityInsights = () => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        locality: '',
        city: '',
        coverImage: '',
        transactionType: 'all',
        midSegmentLocality: false,
        pros: [''],
        cons: [''],
        upcomingDevelopments: [{ title: '', badge: '' }],
        landmarks: [{ name: '', distance: '', type: '' }],
        residentialZones: ['']
    });
    const [errors, setErrors] = useState({});
    // When editing an existing insight, its locality+city are the lookup key
    // the backend upserts on (see saveInsight) — so we lock them instead of
    // routing edits back through the cascading location pickers, and keep
    // the id around so Cancel/Delete know which entry is active.
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [locationTree, setLocationTree] = useState([]);
    const [selectedCountryId, setSelectedCountryId] = useState('');
    const [selectedStateId, setSelectedStateId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');
    const [availableStates, setAvailableStates] = useState([]);
    const [availableDistricts, setAvailableDistricts] = useState([]);
    const [availableLocalities, setAvailableLocalities] = useState([]);

    useEffect(() => {
        fetchInsights();
        fetchCities();
    }, []);

    const fetchCities = async () => {
        try {
            const res = await axios.get(`${API_URL}/locations/tree`);
            if (res.data.success) {
                const tree = res.data.data;
                setLocationTree(tree);
                
                const india = tree.find(c => c.name.toLowerCase() === 'india');
                if (india) {
                    setSelectedCountryId(india._id);
                    const karnataka = india.states?.find(s => s.name.toLowerCase() === 'karnataka');
                    if (karnataka) {
                        setAvailableStates([karnataka]);
                        setSelectedStateId(karnataka._id);
                        setAvailableDistricts(karnataka.districts || []);
                    } else {
                        setAvailableStates(india.states || []);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch cities", error);
        }
    };

    const handleStateChange = (e) => {
        const stateId = e.target.value;
        setSelectedStateId(stateId);
        setSelectedDistrictId('');
        setFormData({ ...formData, city: '', locality: '' });
        
        const state = availableStates.find(s => s._id === stateId);
        setAvailableDistricts(state?.districts || []);
        setAvailableLocalities([]);
    };

    const handleDistrictChange = (e) => {
        const distId = e.target.value;
        setSelectedDistrictId(distId);
        
        const dist = availableDistricts.find(d => d._id === distId);
        setAvailableLocalities(dist?.cities || []);
        
        if (distId) {
            const distName = e.target.options[e.target.selectedIndex].text;
            setFormData({ ...formData, city: distName, locality: '' });
        } else {
            setFormData({ ...formData, city: '', locality: '' });
        }
    };

    const handleLocalityChange = (e) => {
        setFormData({ ...formData, locality: e.target.value });
    };

    const fetchInsights = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`${API_URL}/admin/insights`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setInsights(res.data.insights);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load insights");
        } finally {
            setLoading(false);
        }
    };

    const handleArrayChange = (field, index, value) => {
        const newArray = [...formData[field]];
        newArray[index] = value;
        setFormData({ ...formData, [field]: newArray });
    };

    const handleObjectArrayChange = (field, index, key, value) => {
        const newArray = [...formData[field]];
        newArray[index] = { ...newArray[index], [key]: value };
        setFormData({ ...formData, [field]: newArray });
    };

    const addArrayItem = (field, template) => {
        setFormData({ ...formData, [field]: [...formData[field], template] });
    };

    const removeArrayItem = (field, index) => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArray });
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.locality.trim()) newErrors.locality = "Locality name is required";
        if (!formData.city.trim()) newErrors.city = "City is required";
        if (!formData.coverImage.trim()) newErrors.coverImage = "Cover image URL is required";
        else if (!/^https?:\/\/.+/.test(formData.coverImage)) newErrors.coverImage = "Must be a valid URL";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const resetForm = () => {
        setFormData({
            locality: '', city: '', coverImage: '', transactionType: 'all', midSegmentLocality: false,
            pros: [''], cons: [''], upcomingDevelopments: [{ title: '', badge: '' }],
            landmarks: [{ name: '', distance: '', type: '' }], residentialZones: ['']
        });
        setSelectedDistrictId('');
        setAvailableLocalities([]);
        setEditingId(null);
        setErrors({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const token = localStorage.getItem('adminToken');
            // The backend upserts by locality+city (see saveInsight), so this
            // same POST both creates new entries and saves edits to existing
            // ones — no separate PUT route needed.
            const res = await axios.post(`${API_URL}/admin/insights`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success(editingId ? 'Locality Insight updated successfully!' : 'Locality Insight saved successfully!');
                fetchInsights();
                resetForm();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving insight');
        }
    };

    // Locality/city are the upsert key on the backend, so editing keeps them
    // locked rather than re-running them through the cascading location
    // pickers (which would risk creating a second entry instead of updating
    // this one). To move an insight to a different locality, delete and
    // re-add it.
    const handleEdit = (insight) => {
        setFormData({
            locality: insight.locality || '',
            city: insight.city || '',
            coverImage: insight.coverImage || '',
            transactionType: insight.transactionType || 'all',
            midSegmentLocality: !!insight.midSegmentLocality,
            pros: insight.pros?.length ? insight.pros : [''],
            cons: insight.cons?.length ? insight.cons : [''],
            upcomingDevelopments: insight.upcomingDevelopments?.length ? insight.upcomingDevelopments : [{ title: '', badge: '' }],
            landmarks: insight.landmarks?.length ? insight.landmarks : [{ name: '', distance: '', type: '' }],
            residentialZones: insight.residentialZones?.length ? insight.residentialZones : ['']
        });
        setEditingId(insight._id);
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this locality insight? This cannot be undone.')) return;
        setDeletingId(id);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.delete(`${API_URL}/admin/insights/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success('Locality Insight deleted');
                if (editingId === id) resetForm();
                fetchInsights();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting insight');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Locality Insights</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Add curated editorial data (Pros, Cons, Landmarks) for localities. Other metrics like pricing will be auto-calculated from active properties.
                    </p>
                </div>
            </div>

            {editingId && (
                <div className="mb-6 flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Pencil size={16} />
                        Editing "{formData.locality}, {formData.city}" — Save to apply changes.
                    </div>
                    <button type="button" onClick={resetForm} className="flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900">
                        <X size={14} /> Cancel
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Column */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Basic Info */}
                        <div>
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Country</label>
                                    <select value={selectedCountryId} disabled className="w-full p-2 border rounded-md bg-gray-50 text-gray-500">
                                        <option value={selectedCountryId}>India</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">State</label>
                                    <select value={selectedStateId} onChange={handleStateChange} disabled={!!editingId} className="w-full p-2 border rounded-md disabled:bg-gray-50 disabled:text-gray-500">
                                        <option value="">Select State</option>
                                        {availableStates.map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">District <span className="text-red-500">*</span></label>
                                    {editingId ? (
                                        <input type="text" value={formData.city} disabled className="w-full p-2 border rounded-md bg-gray-50 text-gray-500" />
                                    ) : (
                                        <>
                                            <select value={selectedDistrictId} onChange={handleDistrictChange} disabled={!selectedStateId} className={`w-full p-2 border rounded-md ${errors.city ? 'border-red-500' : ''}`}>
                                                <option value="">Select District</option>
                                                {availableDistricts.map(d => (
                                                    <option key={d._id} value={d._id}>{d.name}</option>
                                                ))}
                                            </select>
                                            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                        </>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">City / Area <span className="text-red-500">*</span></label>
                                    {editingId ? (
                                        <input type="text" value={formData.locality} disabled className="w-full p-2 border rounded-md bg-gray-50 text-gray-500" />
                                    ) : (
                                        <>
                                            <select value={formData.locality} onChange={handleLocalityChange} disabled={!selectedDistrictId} className={`w-full p-2 border rounded-md ${errors.locality ? 'border-red-500' : ''}`}>
                                                <option value="">{selectedDistrictId ? 'Select Locality' : 'Select district first'}</option>
                                                {availableLocalities.map(l => (
                                                    <option key={l._id} value={l.name}>{l.name}</option>
                                                ))}
                                            </select>
                                            {errors.locality && <p className="text-red-500 text-xs mt-1">{errors.locality}</p>}
                                        </>
                                    )}
                                    {editingId && <p className="text-[11px] text-gray-400 mt-1">Locality can't be changed here — delete and re-add to move it.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cover Image URL <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.coverImage} onChange={(e) => setFormData({...formData, coverImage: e.target.value})} className={`w-full p-2 border rounded-md ${errors.coverImage ? 'border-red-500' : ''}`} placeholder="https://..." />
                                    {errors.coverImage && <p className="text-red-500 text-xs mt-1">{errors.coverImage}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Transaction Type</label>
                                    <select value={formData.transactionType} onChange={(e) => setFormData({...formData, transactionType: e.target.value})} className="w-full p-2 border rounded-md">
                                        <option value="all">Both (Buy & Rent)</option>
                                        <option value="buy">Buy Only</option>
                                        <option value="rent">Rent Only</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Pros & Cons */}
                        <div>
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Pros & Cons</h3>
                            <p className="text-xs text-slate-500 mb-3">Add brief, objective points about living in this locality.</p>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Pros */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-green-600">Pros</label>
                                    {formData.pros.map((pro, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input type="text" value={pro} onChange={(e) => handleArrayChange('pros', index, e.target.value)} className="w-full p-2 border border-green-200 rounded-md bg-green-50 focus:bg-white" placeholder="e.g. Excellent metro connectivity" />
                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('pros', index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><Trash2 size={16}/></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addArrayItem('pros', '')} className="text-sm text-green-600 font-medium flex items-center gap-1"><Plus size={14}/> Add Pro</button>
                                </div>
                                {/* Cons */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-red-600">Cons</label>
                                    {formData.cons.map((con, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input type="text" value={con} onChange={(e) => handleArrayChange('cons', index, e.target.value)} className="w-full p-2 border border-red-200 rounded-md bg-red-50 focus:bg-white" placeholder="e.g. Heavy traffic during peak hours" />
                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('cons', index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><Trash2 size={16}/></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addArrayItem('cons', '')} className="text-sm text-red-600 font-medium flex items-center gap-1"><Plus size={14}/> Add Con</button>
                                </div>
                            </div>
                        </div>

                        {/* Landmarks */}
                        <div>
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Explore Nearby Landmarks</h3>
                            <p className="text-xs text-slate-500 mb-3">Add key landmarks (Metro, Malls, Hospitals) and their distance from the locality center.</p>
                            <div className="space-y-3">
                                {formData.landmarks.map((lm, index) => (
                                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                                        <input type="text" placeholder="Landmark Name (e.g. Nexus Mall)" value={lm.name} onChange={(e) => handleObjectArrayChange('landmarks', index, 'name', e.target.value)} className="flex-1 p-2 border rounded-md" />
                                        <input type="text" placeholder="Distance (e.g. 2.5 km)" value={lm.distance} onChange={(e) => handleObjectArrayChange('landmarks', index, 'distance', e.target.value)} className="w-32 p-2 border rounded-md" />
                                        <select value={lm.type} onChange={(e) => handleObjectArrayChange('landmarks', index, 'type', e.target.value)} className="w-32 p-2 border rounded-md">
                                            <option value="">Select Type</option>
                                            <option value="Metro">Metro</option>
                                            <option value="Mall">Mall</option>
                                            <option value="Hospital">Hospital</option>
                                            <option value="School">School</option>
                                        </select>
                                        <button type="button" onClick={() => removeArrayItem('landmarks', index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addArrayItem('landmarks', {name:'', distance:'', type:''})} className="text-sm text-blue-600 font-medium flex items-center gap-1"><Plus size={14}/> Add Landmark</button>
                            </div>
                        </div>

                        {/* Upcoming Developments */}
                        <div>
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Upcoming Developments</h3>
                            <p className="text-xs text-slate-500 mb-3">Add major infrastructure projects planned for this area.</p>
                            <div className="space-y-3">
                                {formData.upcomingDevelopments.map((dev, index) => (
                                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                                        <input type="text" placeholder="Description (e.g. New Pink Metro line by 2026)" value={dev.title} onChange={(e) => handleObjectArrayChange('upcomingDevelopments', index, 'title', e.target.value)} className="flex-1 p-2 border rounded-md" />
                                        <input type="text" placeholder="Badge (e.g. Major Development)" value={dev.badge} onChange={(e) => handleObjectArrayChange('upcomingDevelopments', index, 'badge', e.target.value)} className="w-48 p-2 border rounded-md" />
                                        <button type="button" onClick={() => removeArrayItem('upcomingDevelopments', index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addArrayItem('upcomingDevelopments', {title:'', badge:''})} className="text-sm text-blue-600 font-medium flex items-center gap-1"><Plus size={14}/> Add Development</button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="submit" className={`flex-1 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                <Save size={18} /> {editingId ? 'Update Locality Insight' : 'Save Locality Insight'}
                            </button>
                            {editingId && (
                                <button type="button" onClick={resetForm} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List Column */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 h-fit max-h-[800px] overflow-y-auto">
                    <h3 className="font-bold text-gray-900 mb-4">Configured Localities</h3>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading...</p>
                    ) : insights.length === 0 ? (
                        <p className="text-sm text-slate-500">No localities configured yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {insights.map(insight => (
                                <div key={insight._id} className={`bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3 ${editingId === insight._id ? 'ring-2 ring-blue-400' : ''}`}>
                                    <img src={insight.coverImage} alt="" className="w-12 h-12 rounded-full object-cover border shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{insight.locality}</p>
                                        <p className="text-xs text-slate-500 truncate">{insight.city} · {insight.transactionType === 'all' ? 'Buy & Rent' : insight.transactionType}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(insight)}
                                            title="Edit"
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(insight._id)}
                                            disabled={deletingId === insight._id}
                                            title="Delete"
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-md disabled:opacity-40"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminManageLocalityInsights;
