import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit2, Trash2, Save, X, MoveUp, MoveDown,
    Image as ImageIcon, Link as LinkIcon, Hash, Check, AlertCircle, Loader2, Search, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        link: '',
        order: 0,
        type: 'home',
        imageUrl: '',
        imagePublicId: '',
        linkedItemType: '',
        linkedItem: ''
    });
    const [properties, setProperties] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter properties based on search and type
    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchesSearch = (p.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            // Check if it's a project (case insensitive across multiple fields)
            const isProject = 
                (p.propertyType || '').toLowerCase() === 'project' || 
                (p.transactionType || '').toLowerCase() === 'project' ||
                (p.propertyCategory || '').toLowerCase() === 'project';
            
            if (filterType === 'project') return matchesSearch && isProject;
            if (filterType === 'property') return matchesSearch && !isProject;
            return matchesSearch;
        });
    }, [properties, searchTerm, filterType]);

    // Handle outside click for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchBanners();
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/banners/properties`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProperties(response.data);
        } catch (error) {
            console.error('Failed to fetch properties for banners', error);
        }
    };

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/banners/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBanners(response.data);
        } catch (error) {
            toast.error('Failed to fetch banners');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            setUploading(true);
            const token = localStorage.getItem('adminToken');
            const response = await axios.post(`${API_URL}/banners/upload`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setFormData({
                    ...formData,
                    imageUrl: response.data.url,
                    imagePublicId: response.data.publicId
                });
                toast.success('Image uploaded successfully');
            }

        } catch (error) {
            toast.error('Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.imageUrl) {
            return toast.error('Please upload an image');
        }

        try {
            const token = localStorage.getItem('adminToken');
            if (editingBanner) {
                await axios.put(`${API_URL}/banners/${editingBanner._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Banner updated');
            } else {
                await axios.post(`${API_URL}/banners`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Banner created');
            }
            setIsModalOpen(false);
            setEditingBanner(null);
            setFormData({ title: '', link: '', order: 0, type: 'home', imageUrl: '', imagePublicId: '', linkedItemType: '', linkedItem: '' });
            fetchBanners();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`${API_URL}/banners/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Banner deleted');
            fetchBanners();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleToggleStatus = async (banner) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`${API_URL}/banners/${banner._id}`, { isActive: !banner.isActive }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBanners();
            toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const openEditModal = (banner) => {
        setEditingBanner(banner);
        const linkedItemData = banner.linkedItem;
        setFormData({
            title: banner.title || '',
            link: banner.link,
            order: banner.order,
            type: banner.type,
            imageUrl: banner.imageUrl,
            imagePublicId: banner.imagePublicId,
            linkedItemType: banner.linkedItemType || '',
            linkedItem: banner.linkedItem?._id || banner.linkedItem || ''
        });
        if (linkedItemData && linkedItemData.propertyName) {
            setSearchTerm(linkedItemData.propertyName);
        } else {
            setSearchTerm('');
        }
        setIsModalOpen(true);
    };

    const renderForm = () => (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 max-w-4xl mx-auto mt-4">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-100">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                        {editingBanner ? 'Edit Banner' : 'Create New Banner'}
                    </h2>
                    <p className="text-gray-500 mt-2">Fill in the details below to configure your banner.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold transition-colors"
                >
                    <X size={20} /> Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Image Upload Area */}
                <div className="space-y-3">
                    <label className="text-sm font-black text-gray-700 uppercase tracking-wider ml-1">Banner Image <span className="text-red-500">*</span></label>
                    <div className="relative group max-w-2xl">
                        <div className={`aspect-[2.5/1] rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-gray-50/50 ${formData.imageUrl ? 'border-transparent shadow-md' : 'border-gray-200 hover:border-black/20'
                            }`}>
                            {uploading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-black" />
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Uploading...</span>
                                </div>
                            ) : formData.imageUrl ? (
                                <>
                                    <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                        <label className="bg-white text-black px-6 py-3 rounded-xl font-bold cursor-pointer hover:scale-105 transition-transform shadow-xl flex items-center gap-2">
                                            <ImageIcon size={20} /> Change Image
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-6 text-center">
                                    <div className="w-16 h-16 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4 group-hover:scale-110 group-hover:text-black transition-all">
                                        <Plus size={32} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Upload Desktop Banner</span>
                                    <span className="text-xs text-gray-400 mt-2">Recommended size: 1920x800px (Max 2MB)</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                    <div className="space-y-3">
                        <label className="text-sm font-black text-gray-700 uppercase tracking-wider ml-1">Title (Optional)</label>
                        <div className="relative">
                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="E.g., Diwali Special Offer"
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-base font-medium focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-black text-gray-700 uppercase tracking-wider ml-1">Display Order <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.order}
                                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                placeholder="1, 2, 3..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-base font-medium focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <LinkIcon className="text-blue-500" size={24} />
                        <h3 className="text-lg font-black text-gray-900">Banner Navigation / Routing</h3>
                    </div>
                    <p className="text-sm text-gray-500 -mt-4">Where should users go when they click this banner?</p>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider ml-1">Link to Property / Project</label>
                            <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                                <button type="button" onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>All</button>
                                <button type="button" onClick={() => setFilterType('property')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'property' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Properties</button>
                                <button type="button" onClick={() => setFilterType('project')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'project' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Projects</button>
                            </div>
                        </div>
                        
                        <div className="relative" ref={dropdownRef}>
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setIsDropdownOpen(true);
                                    if (e.target.value === '') {
                                        setFormData({ ...formData, linkedItem: '', linkedItemType: '' });
                                    }
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder="Search & select a property or project..."
                                className="w-full pl-12 pr-10 py-4 bg-white border border-gray-200 rounded-2xl text-base font-medium focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm cursor-text"
                            />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                            
                            {isDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-72 overflow-y-auto overflow-x-hidden">
                                    {filteredProperties.length === 0 ? (
                                        <div className="p-6 text-center text-sm font-medium text-gray-400">No matching properties found.</div>
                                    ) : (
                                        <ul className="py-2">
                                            {filteredProperties.map(p => {
                                                const isProj = (p.propertyType || '').toLowerCase() === 'project' || (p.transactionType || '').toLowerCase() === 'project' || (p.propertyCategory || '').toLowerCase() === 'project';
                                                const isSelected = formData.linkedItem === p._id;
                                                return (
                                                    <li
                                                        key={p._id}
                                                        onClick={() => {
                                                            setSearchTerm(p.propertyName);
                                                            setFormData({ ...formData, linkedItem: p._id, linkedItemType: 'Property' });
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`px-5 py-3.5 cursor-pointer transition-colors text-sm flex items-center justify-between border-b border-gray-50 last:border-0 ${isSelected ? 'bg-gray-50/80 font-black text-black' : 'hover:bg-gray-50 text-gray-600 font-medium'}`}
                                                    >
                                                        <span className="truncate">{p.propertyName}</span>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {p.isLive ? (
                                                                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                                            ) : (
                                                                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                                            )}
                                                            <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-wider ${isProj ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                {isProj ? 'Project' : 'Property'}
                                                            </span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {formData.linkedItem && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100 gap-3">
                                <p className="text-sm text-blue-700 font-bold flex items-center gap-2">
                                    <Check className="bg-blue-200 text-blue-700 rounded-full p-0.5" size={18} />
                                    Property linked successfully! External links below will be ignored.
                                </p>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFormData({ ...formData, linkedItem: '', linkedItemType: '' });
                                    }}
                                    className="text-xs font-black bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 px-4 py-2 rounded-lg transition-colors"
                                >
                                    Remove Link
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-gray-50 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">OR</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-black text-gray-700 uppercase tracking-wider ml-1">Redirect to Custom Link</label>
                        <div className="relative">
                            <LinkIcon className={`absolute left-4 top-1/2 -translate-y-1/2 ${formData.linkedItem ? 'text-gray-300' : 'text-gray-400'}`} size={20} />
                            <input
                                type="text"
                                value={formData.link}
                                disabled={!!formData.linkedItem}
                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                placeholder="E.g., /offers, /contact, https://..."
                                className={`w-full pl-12 pr-4 py-4 rounded-2xl text-base font-medium outline-none transition-all shadow-sm border ${
                                    formData.linkedItem 
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                                    : 'bg-white border-gray-200 focus:border-black focus:ring-4 focus:ring-black/5'
                                }`}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Discard Changes
                    </button>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="flex-[2] bg-black text-white py-4 px-6 rounded-2xl font-black shadow-xl shadow-black/20 hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                    >
                        <Save size={22} />
                        {editingBanner ? 'Update Banner & Save' : 'Publish Banner'}
                    </button>
                </div>
            </form>
        </div>
    );

    if (isModalOpen) return renderForm();

    return (
        <div className="space-y-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Banner Management</h1>
                    <p className="text-gray-500 mt-1">Manage dynamic banners for home and offer pages.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingBanner(null);
                        setFormData({ title: '', link: '', order: 0, type: 'home', imageUrl: '', imagePublicId: '', linkedItemType: '', linkedItem: '' });
                        setSearchTerm('');
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-black/10 hover:bg-gray-900 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Add New Banner
                </button>
            </div>

            {/* Banners List */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Order</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-10 h-10 animate-spin text-black" />
                                            <p className="text-gray-400 font-medium">Loading banners...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : banners.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                                <ImageIcon size={32} />
                                            </div>
                                            <p className="text-gray-400 font-medium text-lg">No banners found</p>
                                            <button
                                                onClick={() => setIsModalOpen(true)}
                                                className="text-black font-bold hover:underline"
                                            >
                                                Create your first banner
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                banners.map((banner) => (
                                    <tr key={banner._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="w-32 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                                                <img
                                                    src={banner.imageUrl}
                                                    alt={banner.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{banner.title}</span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                    <LinkIcon size={12} />
                                                    {banner.link ? banner.link : (banner.linkedItem?.propertyName ? `Linked to: ${banner.linkedItem.propertyName}` : 'No link set')}
                                                </span>
                                                <span className="inline-flex mt-2 px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 w-fit uppercase">
                                                    {banner.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-black text-black">
                                                {banner.order}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(banner)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${banner.isActive
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-red-100 text-red-600'
                                                    }`}
                                            >
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(banner)}
                                                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(banner._id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminBanners;
