import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, MapPin, Save, AlertCircle } from 'lucide-react';
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
    const [availableCities, setAvailableCities] = useState([]);

    useEffect(() => {
        fetchInsights();
        fetchCities();
    }, []);

    const fetchCities = async () => {
        try {
            const res = await axios.get(`${API_URL}/locations/tree`);
            if (res.data.success) {
                const citiesList = [];
                res.data.data.forEach(c => {
                    c.states?.forEach(s => {
                        s.districts?.forEach(d => {
                            citiesList.push(d.name);
                            d.cities?.forEach(city => {
                                citiesList.push(city.name);
                            });
                        });
                    });
                });
                setAvailableCities([...new Set(citiesList)].sort());
            }
        } catch (error) {
            console.error("Failed to fetch cities", error);
        }
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post(`${API_URL}/admin/insights`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success('Locality Insight saved successfully!');
                fetchInsights();
                // Reset form
                setFormData({
                    locality: '', city: '', coverImage: '', transactionType: 'all', midSegmentLocality: false,
                    pros: [''], cons: [''], upcomingDevelopments: [{ title: '', badge: '' }],
                    landmarks: [{ name: '', distance: '', type: '' }], residentialZones: ['']
                });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving insight');
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Column */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Basic Info */}
                        <div>
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Locality Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.locality} onChange={(e) => setFormData({...formData, locality: e.target.value})} className={`w-full p-2 border rounded-md ${errors.locality ? 'border-red-500' : ''}`} placeholder="e.g. Andheri East" />
                                    {errors.locality && <p className="text-red-500 text-xs mt-1">{errors.locality}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">City <span className="text-red-500">*</span></label>
                                    <select value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className={`w-full p-2 border rounded-md ${errors.city ? 'border-red-500' : ''}`}>
                                        <option value="">Select a city</option>
                                        {availableCities.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
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

                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                            <Save size={18} /> Save Locality Insight
                        </button>
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
                                <div key={insight._id} className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3">
                                    <img src={insight.coverImage} alt="" className="w-12 h-12 rounded-full object-cover border" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{insight.locality}</p>
                                        <p className="text-xs text-slate-500 truncate">{insight.city}</p>
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
