import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Search, Filter, MoreVertical, Trash2, Edit, UploadCloud, Link as LinkIcon, Download, X, Save
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminBuilders = () => {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    const [builders, setBuilders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => {} });

    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBuilderId, setCurrentBuilderId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        reraRegistrationNumber: '',
        gstNumber: '',
        description: '',
        establishedYear: '',
        activeProjects: 0,
        completedProjects: 0,
        brandLogo: ''
    });
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const fetchBuilders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminService.getBuilders();
            if (data.success) {
                setBuilders(data.builders);
            }
        } catch (error) {
            console.error('Error fetching builders:', error);
            toast.error('Failed to load builders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBuilders();
    }, [fetchBuilders]);

    const handleAction = (action, builder) => {
        setActiveDropdown(null);
        if (action === 'edit') {
            setFormData({
                name: builder.name || '',
                email: builder.email || '',
                phone: builder.phone || '',
                companyName: builder.builderProfile?.companyName || '',
                reraRegistrationNumber: builder.builderProfile?.reraRegistrationNumber || '',
                gstNumber: builder.builderProfile?.gstNumber || '',
                description: builder.builderProfile?.description || '',
                establishedYear: builder.builderProfile?.establishedYear || '',
                activeProjects: builder.builderProfile?.activeProjects || 0,
                completedProjects: builder.builderProfile?.completedProjects || 0,
                brandLogo: builder.builderProfile?.brandLogo || ''
            });
            setCurrentBuilderId(builder._id);
            setIsEditing(true);
            setIsAddEditModalOpen(true);
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete Builder?',
                message: `Are you sure you want to delete ${builder.name}? This action cannot be undone.`,
                type: 'danger',
                confirmText: 'Delete Builder',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deleteBuilder(builder._id);
                        if (res.success) {
                            toast.success('Builder deleted successfully');
                            fetchBuilders();
                        }
                    } catch {
                        toast.error('Failed to delete builder');
                    }
                }
            });
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo must be less than 2MB');
            return;
        }

        try {
            setUploadingLogo(true);
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Image = reader.result;
                const payload = {
                    images: [{ base64: base64Image, fileName: file.name }]
                };
                const response = await adminService.uploadImageBase64(payload);
                if (response.success) {
                    const uploadedUrl = response.urls ? response.urls[0] : response.url;
                    setFormData(prev => ({ ...prev, brandLogo: uploadedUrl }));
                    toast.success('Logo uploaded successfully');
                }
            };
        } catch (error) {
            console.error('Upload Error', error);
            toast.error('Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSaveBuilder = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                builderProfile: {
                    companyName: formData.companyName,
                    reraRegistrationNumber: formData.reraRegistrationNumber,
                    gstNumber: formData.gstNumber,
                    description: formData.description,
                    establishedYear: Number(formData.establishedYear),
                    activeProjects: Number(formData.activeProjects),
                    completedProjects: Number(formData.completedProjects),
                    brandLogo: formData.brandLogo
                }
            };

            if (isEditing) {
                await adminService.updateBuilder(currentBuilderId, payload);
                toast.success('Builder updated successfully');
            } else {
                await adminService.addBuilder(payload);
                toast.success('Builder created successfully');
            }
            setIsAddEditModalOpen(false);
            fetchBuilders();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save builder');
        }
    };

    const openAddModal = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            companyName: '',
            reraRegistrationNumber: '',
            gstNumber: '',
            description: '',
            establishedYear: '',
            activeProjects: 0,
            completedProjects: 0,
            brandLogo: ''
        });
        setIsEditing(false);
        setCurrentBuilderId(null);
        setIsAddEditModalOpen(true);
    };

    return (
        <div className="space-y-6 relative" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Builder Management</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Manage construction partners and builder profiles.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase hover:bg-gray-900 transition-colors shadow-lg"
                    >
                        + Add Builder
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Builder Profile</th>
                                <th className="p-4">Contact Person</th>
                                <th className="p-4">RERA & GST</th>
                                <th className="p-4">Projects (Active / Completed)</th>
                                <th className="p-4">Joined Date</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {builders.length > 0 ? (
                                        builders.map((builder, index) => (
                                            <motion.tr
                                                key={builder._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative font-bold"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {builder.builderProfile?.brandLogo ? (
                                                                <img src={builder.builderProfile.brandLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                                                            ) : (
                                                                <Building2 size={20} className="text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{builder.builderProfile?.companyName || 'N/A'}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Est. {builder.builderProfile?.establishedYear || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-gray-900 font-bold uppercase">{builder.name}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase">{builder.email || 'No Email'}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase">{builder.phone}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-gray-700 uppercase"><span className="text-gray-400">RERA:</span> {builder.builderProfile?.reraRegistrationNumber || 'N/A'}</span>
                                                        <span className="text-[10px] font-bold text-gray-700 uppercase"><span className="text-gray-400">GST:</span> {builder.builderProfile?.gstNumber || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center">
                                                            <p className="text-sm font-black text-blue-600">{builder.builderProfile?.activeProjects || 0}</p>
                                                            <p className="text-[9px] text-gray-500 uppercase">Active</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-sm font-black text-green-600">{builder.builderProfile?.completedProjects || 0}</p>
                                                            <p className="text-[9px] text-gray-500 uppercase">Completed</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-[10px] font-bold text-gray-500 uppercase">
                                                    {new Date(builder.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === builder._id ? null : builder._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === builder._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <button onClick={() => handleAction('edit', builder)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700">
                                                                <Edit size={14} /> Edit Builder
                                                            </button>
                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                            <button onClick={() => handleAction('delete', builder)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Building2 size={32} className="text-gray-300" />
                                                    <p className="text-xs font-bold uppercase">No builders found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Builder Modal */}
            <AnimatePresence>
                {isAddEditModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{isEditing ? 'Edit Builder' : 'Add New Builder'}</h3>
                                    <p className="text-xs text-gray-500 font-bold tracking-tight">Fill in the details below to save the builder profile.</p>
                                </div>
                                <button onClick={() => setIsAddEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveBuilder} className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 border-b pb-2">Representative Contact</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium" placeholder="John Doe" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Phone Number</label>
                                            <input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium" placeholder="+91 9876543210" />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium" placeholder="contact@builder.com" />
                                        </div>
                                    </div>
                                </div>

                                {/* Builder Profile */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 border-b pb-2">Company Profile</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Company Name</label>
                                            <input type="text" required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium" placeholder="XYZ Developers Ltd." />
                                        </div>
                                        
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Brand Logo (Max 2MB)</label>
                                            <div className="flex items-center gap-4">
                                                {formData.brandLogo && (
                                                    <div className="w-16 h-16 rounded-xl border border-gray-200 p-1 shrink-0 overflow-hidden bg-gray-50">
                                                        <img src={formData.brandLogo} alt="Logo preview" className="w-full h-full object-contain" />
                                                    </div>
                                                )}
                                                <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors relative">
                                                    {uploadingLogo ? (
                                                        <span className="text-xs font-bold text-gray-500">Uploading...</span>
                                                    ) : (
                                                        <>
                                                            <UploadCloud size={20} className="text-gray-400 mb-1" />
                                                            <span className="text-[10px] font-bold text-gray-600 uppercase">Click to upload logo</span>
                                                        </>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">RERA Number</label>
                                            <input type="text" value={formData.reraRegistrationNumber} onChange={e => setFormData({ ...formData, reraRegistrationNumber: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium uppercase" placeholder="PR/GJ/..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">GST Number</label>
                                            <input type="text" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium uppercase" placeholder="22AAAAA0000A1Z5" />
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">About Company</label>
                                            <textarea rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium resize-none" placeholder="Brief description about the builder's history and reputation..." />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Established Year</label>
                                            <input type="number" min="1800" max={new Date().getFullYear()} value={formData.establishedYear} onChange={e => setFormData({ ...formData, establishedYear: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium" placeholder="1995" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Active Projects</label>
                                            <input type="number" min="0" value={formData.activeProjects} onChange={e => setFormData({ ...formData, activeProjects: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Completed Projects</label>
                                            <input type="number" min="0" value={formData.completedProjects} onChange={e => setFormData({ ...formData, completedProjects: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white py-4 z-10">
                                    <button type="button" onClick={() => setIsAddEditModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors uppercase text-xs">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={uploadingLogo} className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-colors flex items-center gap-2 uppercase text-xs shadow-xl disabled:opacity-50">
                                        <Save size={16} /> {isEditing ? 'Update Builder' : 'Save Builder'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminBuilders;
