import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Edit2, Trash2, Save, X, MoveUp, MoveDown, 
    Image as ImageIcon, Link as LinkIcon, Hash, Check, AlertCircle, Loader2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
        imagePublicId: ''
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

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
            setFormData({ title: '', link: '', order: 0, type: 'home', imageUrl: '', imagePublicId: '' });
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
        setFormData({
            title: banner.title,
            link: banner.link,
            order: banner.order,
            type: banner.type,
            imageUrl: banner.imageUrl,
            imagePublicId: banner.imagePublicId
        });
        setIsModalOpen(true);
    };

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
                        setFormData({ title: '', link: '', order: 0, type: 'home', imageUrl: '', imagePublicId: '' });
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
                                                    {banner.link || 'No link set'}
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
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                                    banner.isActive 
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

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                            {editingBanner ? 'Edit Banner' : 'Create New Banner'}
                                        </h2>
                                        <p className="text-gray-500 text-sm">Fill in the details for your banner.</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Image Upload Area */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">Banner Image</label>
                                        <div className="relative group">
                                            <div className={`aspect-[2/1] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-gray-50/50 ${
                                                formData.imageUrl ? 'border-transparent' : 'border-gray-200 hover:border-black/20'
                                            }`}>
                                                {uploading ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Loader2 className="w-8 h-8 animate-spin text-black" />
                                                        <span className="text-xs font-bold text-gray-400 uppercase">Uploading...</span>
                                                    </div>
                                                ) : formData.imageUrl ? (
                                                    <>
                                                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                            <label className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                                                                Change Image
                                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mb-2 group-hover:bg-gray-200 transition-colors">
                                                            <Plus size={24} />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-400 uppercase">Upload Banner</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">Title</label>
                                            <div className="relative">
                                                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                                    placeholder="Enter title"
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">Order / Sequence</label>
                                            <div className="relative">
                                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input 
                                                    type="number" 
                                                    required
                                                    value={formData.order}
                                                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                                                    placeholder="Sequence no."
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">Redirect Link (Optional)</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input 
                                                type="text" 
                                                value={formData.link}
                                                onChange={(e) => setFormData({...formData, link: e.target.value})}
                                                placeholder="/offers, https://..."
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={uploading}
                                            className="flex-1 bg-black text-white py-4 px-6 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Check size={20} />
                                            {editingBanner ? 'Update Banner' : 'Create Banner'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminBanners;
