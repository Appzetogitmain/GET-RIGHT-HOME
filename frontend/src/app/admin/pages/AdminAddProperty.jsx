import React, { useState, useEffect } from 'react';
import LocationSelector from '../../../components/ui/LocationSelector';
import { useNavigate } from 'react-router-dom';

import { 
    MapPin, Image as ImageIcon, Info, ChevronLeft, 
    Upload, Trash2, Plus, Loader2, Save
} from 'lucide-react';

import adminService from '../../../services/adminService';
import { categoryService } from '../../../services/categoryService';
import axios from 'axios';
import toast from 'react-hot-toast';




const AdminAddProperty = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dynamicCategories, setDynamicCategories] = useState([]);

    const [formData, setFormData] = useState({
        propertyName: '',
        propertyType: 'hotel',
        description: '',
        shortDescription: '',
        contactNumber: '',
        address: {
            country: 'India',
            state: '',
            city: '',
            district: '',
            area: '',
            fullAddress: '',
            pincode: ''
        },
        coverImage: '',
        propertyImages: [],
        amenities: [],
        status: 'approved',
        isLive: true,
        isAddedByAdmin: true
    });

    useEffect(() => {
        const fetchCats = async () => {
            try {
                const cats = await categoryService.getActiveCategories();
                setDynamicCategories(cats || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchCats();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = async (e, type = 'cover') => {
        const files = e.target.files;
        if (!files.length) return;

        setUploading(true);
        const API_BASE = import.meta.env.VITE_API_URL || 'https://homezoo.onrender.com/api';

        try {
            // Upload files one by one using banner/upload (no auth needed)
            const uploadedUrls = [];
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('image', files[i]); // banner route uses 'image' field
                const res = await axios.post(`${API_BASE}/banners/upload`, formData);
                if (res.data?.url) {
                    uploadedUrls.push(res.data.url);
                }
            }

            if (uploadedUrls.length > 0) {
                if (type === 'cover') {
                    setFormData(prev => ({ ...prev, coverImage: uploadedUrls[0] }));
                    toast.success('Cover image uploaded!');
                } else {
                    setFormData(prev => ({
                        ...prev,
                        propertyImages: [...prev.propertyImages, ...uploadedUrls]
                    }));
                    toast.success(`${uploadedUrls.length} image(s) uploaded`);
                }
            } else {
                toast.error('Upload failed — no URL returned');
            }
        } catch (err) {
            console.error('Upload error:', err);
            toast.error(err.response?.data?.message || 'Upload failed. Try again.');
        } finally {
            setUploading(false);
        }
    };


    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            propertyImages: prev.propertyImages.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.propertyName || !formData.address.city) {
            return toast.error('Property name and city are required');
        }


        setLoading(true);
        try {
            const res = await adminService.createProperty(formData);
            if (res.success) {
                toast.success('Property created successfully');
                navigate('/admin/properties');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create property');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-bold text-xs uppercase"
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Add Admin Property</h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Basic Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2 border-b border-gray-50 pb-3">
                            <Info size={16} className="text-emerald-600" /> Basic Information
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Property Name *</label>
                                <input 
                                    type="text"
                                    name="propertyName"
                                    value={formData.propertyName}
                                    onChange={handleChange}
                                    placeholder="e.g. Royal Palace Hotel"
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Property Type *</label>
                                    <select 
                                        name="propertyType"
                                        value={formData.propertyType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all uppercase"
                                    >
                                        <option value="hotel">Hotel</option>
                                        <option value="villa">Villa</option>
                                        <option value="pg">PG</option>
                                        <option value="hostel">Hostel</option>
                                        <option value="resort">Resort</option>
                                        <option value="homestay">Homestay</option>
                                        <option value="rent">Rent</option>
                                        <option value="buy">Buy</option>
                                        <option value="plot">Plot</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Contact Number</label>
                                    <input 
                                        type="text"
                                        name="contactNumber"
                                        value={formData.contactNumber}
                                        onChange={handleChange}
                                        placeholder="Phone number"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Short Description</label>
                                <input 
                                    type="text"
                                    name="shortDescription"
                                    value={formData.shortDescription}
                                    onChange={handleChange}
                                    placeholder="Brief summary (catchy)"
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Full Description</label>
                                <textarea 
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Detailed description of the property..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2 border-b border-gray-50 pb-3">
                            <MapPin size={16} className="text-emerald-600" /> Location Details
                        </h3>

                        {/* Cascading Country → State → District → City */}
                        <LocationSelector
                            value={{
                                country: formData.address.country || 'India',
                                state: formData.address.state || '',
                                district: formData.address.district || '',
                                city: formData.address.city || ''
                            }}
                            onChange={({ country, state, district, city }) => {
                                setFormData(prev => ({
                                    ...prev,
                                    address: {
                                        ...prev.address,
                                        country,
                                        state,
                                        district,
                                        city
                                    }
                                }));
                            }}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Area / Locality</label>
                                <input 
                                    type="text"
                                    name="address.area"
                                    value={formData.address.area}
                                    onChange={handleChange}
                                    placeholder="Area name"
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Pincode</label>
                                <input 
                                    type="text"
                                    name="address.pincode"
                                    value={formData.address.pincode}
                                    onChange={handleChange}
                                    placeholder="6-digit pincode"
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Full Address</label>
                            <input 
                                type="text"
                                name="address.fullAddress"
                                value={formData.address.fullAddress}
                                onChange={handleChange}
                                placeholder="Street name, landmark, etc."
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Media & Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2 border-b border-gray-50 pb-3">
                            <ImageIcon size={16} className="text-emerald-600" /> Media Upload
                        </h3>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
                            Cover Image {uploading ? <span className="text-emerald-500 normal-case font-bold">(uploading...)</span> : ''}
                        </label>
                            <div className="relative group">
                                {formData.coverImage ? (
                                    <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-100">
                                        <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed transition-all cursor-pointer group ${uploading ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-emerald-200'}`}>
                                        {uploading 
                                            ? <><div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" /><span className="text-[10px] font-black text-emerald-500 uppercase">Uploading...</span></>
                                            : <><Upload size={24} className="text-gray-300 group-hover:text-emerald-500 transition-colors" /><span className="text-[10px] font-black text-gray-400 uppercase mt-2 group-hover:text-emerald-600">Upload Cover</span></>
                                        }
                                        <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={(e) => handleImageUpload(e, 'cover')} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Gallery Images ({formData.propertyImages.length})</label>
                            <div className="grid grid-cols-2 gap-2">
                                {formData.propertyImages.map((img, idx) => (
                                    <div key={idx} className="relative rounded-lg overflow-hidden aspect-square border border-gray-100 group">
                                        <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                                <label className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed transition-all cursor-pointer group ${uploading ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-emerald-200'}`}>
                                    {uploading 
                                        ? <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                        : <Plus size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                                    }
                                    <input type="file" className="hidden" accept="image/*" multiple disabled={uploading} onChange={(e) => handleImageUpload(e, 'gallery')} />
                                </label>

                            </div>
                        </div>
                    </div>

                    <div className="bg-black p-6 rounded-2xl shadow-xl shadow-black/10 space-y-4">
                        <div className="flex items-center justify-between text-white/50 text-[10px] font-black uppercase tracking-widest">
                            <span>Status</span>
                            <span className="text-emerald-400">Approved</span>
                        </div>
                        <button 
                            type="submit"
                            disabled={loading || uploading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 text-white rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {loading ? 'Creating...' : 'Publish Property'}
                        </button>
                        <p className="text-[9px] text-white/30 text-center uppercase font-bold tracking-tight">
                            Admin properties are automatically approved and made live across the platform.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AdminAddProperty;
