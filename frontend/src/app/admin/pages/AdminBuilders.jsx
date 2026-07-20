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
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        officeAddress: '',
        cinNumber: '',
        reraRegistrationNumber: '',
        reraCertificate: '',
        gstNumber: '',
        gstCertificate: '',
        companyRegistrationCertificate: '',
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
                officeAddress: builder.builderProfile?.officeAddress || '',
                cinNumber: builder.builderProfile?.cinNumber || '',
                reraRegistrationNumber: builder.builderProfile?.reraRegistrationNumber || '',
                reraCertificate: builder.builderProfile?.reraCertificate || '',
                gstNumber: builder.builderProfile?.gstNumber || '',
                gstCertificate: builder.builderProfile?.gstCertificate || '',
                companyRegistrationCertificate: builder.builderProfile?.companyRegistrationCertificate || '',
                description: builder.builderProfile?.description || '',
                establishedYear: builder.builderProfile?.establishedYear || '',
                activeProjects: builder.builderProfile?.activeProjects || 0,
                completedProjects: builder.builderProfile?.completedProjects || 0,
                brandLogo: builder.builderProfile?.brandLogo || ''
            });
            setErrors({});
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

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const clone = { ...prev };
                delete clone[field];
                return clone;
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

    const handleDocumentUpload = async (e, fieldName, docLabel) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error(`${docLabel} size must be less than 5MB`);
            return;
        }

        try {
            toast.loading(`Uploading ${docLabel}...`, { id: fieldName });
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result;
                const payload = {
                    images: [{ base64: base64Data, fileName: file.name }]
                };
                const response = await adminService.uploadImageBase64(payload);
                if (response.success) {
                    const uploadedUrl = response.urls ? response.urls[0] : response.url;
                    setFormData(prev => ({ ...prev, [fieldName]: uploadedUrl }));
                    toast.success(`${docLabel} uploaded successfully`, { id: fieldName });
                }
            };
        } catch (error) {
            console.error('Upload Error', error);
            toast.error(`Failed to upload ${docLabel}`, { id: fieldName });
        }
    };

    const handleSaveBuilder = async (e) => {
        e.preventDefault();
        
        const tempErrors = {};
        
        // Name validation
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!formData.name) {
            tempErrors.name = 'Full Name is required';
        } else if (!nameRegex.test(formData.name)) {
            tempErrors.name = 'Name must contain only alphabets';
        } else if (formData.name.trim().length < 3) {
            tempErrors.name = 'Name must be at least 3 characters';
        }

        // Phone validation
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!formData.phone) {
            tempErrors.phone = 'Phone Number is required';
        } else if (!phoneRegex.test(formData.phone)) {
            tempErrors.phone = 'Please enter a valid 10-digit Indian phone number starting with 6-9';
        }

        // Email validation
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            tempErrors.email = 'Please enter a valid email address';
        }

        // Company Name validation
        if (!formData.companyName || !formData.companyName.trim()) {
            tempErrors.companyName = 'Company Name is required';
        }

        // Established Year
        if (formData.establishedYear) {
            const year = parseInt(formData.establishedYear);
            const currentYear = new Date().getFullYear();
            if (year < 1800 || year > currentYear) {
                tempErrors.establishedYear = `Established year must be between 1800 and ${currentYear}`;
            }
        }

        // Projects
        if (formData.activeProjects < 0) {
            tempErrors.activeProjects = 'Active projects must be a positive number';
        }
        if (formData.completedProjects < 0) {
            tempErrors.completedProjects = 'Completed projects must be a positive number';
        }

        if (Object.keys(tempErrors).length > 0) {
            setErrors(tempErrors);
            return;
        }
        setErrors({});

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                builderProfile: {
                    companyName: formData.companyName,
                    officeAddress: formData.officeAddress,
                    cinNumber: formData.cinNumber,
                    reraRegistrationNumber: formData.reraRegistrationNumber,
                    reraCertificate: formData.reraCertificate,
                    gstNumber: formData.gstNumber,
                    gstCertificate: formData.gstCertificate,
                    companyRegistrationCertificate: formData.companyRegistrationCertificate,
                    description: formData.description,
                    establishedYear: Number(formData.establishedYear) || undefined,
                    activeProjects: Number(formData.activeProjects) || 0,
                    completedProjects: Number(formData.completedProjects) || 0,
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
            officeAddress: '',
            cinNumber: '',
            reraRegistrationNumber: '',
            reraCertificate: '',
            gstNumber: '',
            gstCertificate: '',
            companyRegistrationCertificate: '',
            description: '',
            establishedYear: '',
            activeProjects: 0,
            completedProjects: 0,
            brandLogo: ''
        });
        setErrors({});
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
                            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[85vh]"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{isEditing ? 'Edit Builder' : 'Add New Builder'}</h3>
                                    <p className="text-xs text-gray-500 font-bold tracking-tight">Fill in the details below to save the builder profile.</p>
                                </div>
                                <button onClick={() => setIsAddEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveBuilder} className="flex flex-col flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Basic Info */}
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 border-b pb-2">Representative Contact</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                                                <input type="text" required value={formData.name} onChange={e => handleInputChange('name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))} className={`w-full px-4 py-3 bg-gray-50 border ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-sm outline-none font-medium`} placeholder="John Doe" />
                                                {errors.name && <p className="text-red-500 text-[11px] font-bold ml-1">{errors.name}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Phone Number</label>
                                                <div className="flex">
                                                    <span className={`flex items-center bg-gray-100 border ${errors.phone ? 'border-red-500' : 'border-gray-200'} border-r-0 rounded-l-xl px-3 text-sm font-bold text-gray-500 select-none`}>
                                                        +91
                                                    </span>
                                                    <input type="tel" required value={formData.phone} onChange={e => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={`w-full px-4 py-3 bg-gray-50 border ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-r-xl text-sm outline-none font-medium`} placeholder="9876543210" />
                                                </div>
                                                {errors.phone && <p className="text-red-500 text-[11px] font-bold ml-1">{errors.phone}</p>}
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                                <input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className={`w-full px-4 py-3 bg-gray-50 border ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-sm outline-none font-medium`} placeholder="contact@builder.com" />
                                                {errors.email && <p className="text-red-500 text-[11px] font-bold ml-1">{errors.email}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Builder Profile */}
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 border-b pb-2">Company Profile</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Company Name</label>
                                                <input type="text" required value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} className={`w-full px-4 py-3 bg-gray-50 border ${errors.companyName ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-sm outline-none font-medium`} placeholder="XYZ Developers Ltd." />
                                                {errors.companyName && <p className="text-red-500 text-[11px] font-bold ml-1">{errors.companyName}</p>}
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

                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Registered Office Address</label>
                                                <textarea rows="2" value={formData.officeAddress} onChange={e => handleInputChange('officeAddress', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium resize-none" placeholder="Full office address..." />
                                            </div>

                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Company Registration (CIN)</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="text" value={formData.cinNumber} onChange={e => handleInputChange('cinNumber', e.target.value)} className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium uppercase" placeholder="L12345MH2000PLC123456" />
                                                    <label className="shrink-0 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-200 flex items-center gap-2 text-gray-600 transition-colors">
                                                        <UploadCloud size={16} className={formData.companyRegistrationCertificate ? 'text-green-500' : ''} />
                                                        <span className="text-[10px] font-bold uppercase">{formData.companyRegistrationCertificate ? 'Uploaded' : 'Upload Doc'}</span>
                                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocumentUpload(e, 'companyRegistrationCertificate', 'Company Registration')} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">RERA Number</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="text" value={formData.reraRegistrationNumber} onChange={e => handleInputChange('reraRegistrationNumber', e.target.value)} className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium uppercase" placeholder="PR/GJ/..." />
                                                    <label className="shrink-0 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-200 flex items-center gap-2 text-gray-600 transition-colors">
                                                        <UploadCloud size={16} className={formData.reraCertificate ? 'text-green-500' : ''} />
                                                        <span className="text-[10px] font-bold uppercase">{formData.reraCertificate ? 'Uploaded' : 'Upload Doc'}</span>
                                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocumentUpload(e, 'reraCertificate', 'RERA Certificate')} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">GST Number</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="text" value={formData.gstNumber} onChange={e => handleInputChange('gstNumber', e.target.value)} className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium uppercase" placeholder="22AAAAA0000A1Z5" />
                                                    <label className="shrink-0 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-200 flex items-center gap-2 text-gray-600 transition-colors">
                                                        <UploadCloud size={16} className={formData.gstCertificate ? 'text-green-500' : ''} />
                                                        <span className="text-[10px] font-bold uppercase">{formData.gstCertificate ? 'Uploaded' : 'Upload Doc'}</span>
                                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocumentUpload(e, 'gstCertificate', 'GST Certificate')} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">About Company</label>
                                                <textarea rows="3" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium resize-none" placeholder="Brief description about the builder's history and reputation..." />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Established Year</label>
                                                <input type="number" min="1800" max={new Date().getFullYear()} value={formData.establishedYear} onChange={e => handleInputChange('establishedYear', Math.max(0, parseInt(e.target.value) || ''))} className={`w-full px-4 py-3 bg-gray-50 border ${errors.establishedYear ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-sm outline-none font-medium`} placeholder="1995" />
                                                {errors.establishedYear && <p className="text-red-500 text-[11px] font-bold ml-1">{errors.establishedYear}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Active Projects</label>
                                                <input type="number" min="0" value={formData.activeProjects} onChange={e => handleInputChange('activeProjects', Math.max(0, parseInt(e.target.value) || 0))} className={`w-full px-4 py-3 bg-gray-50 border ${errors.activeProjects ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-sm outline-none font-medium`} />
                                                {errors.activeProjects && <p className="text-red-500 text-[11px] font-bold ml-1">{errors.activeProjects}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Completed Projects</label>
                                                <input type="number" min="0" value={formData.completedProjects} onChange={e => handleInputChange('completedProjects', Math.max(0, parseInt(e.target.value) || 0))} className={`w-full px-4 py-3 bg-gray-50 border ${errors.completedProjects ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-sm outline-none font-medium`} />
                                                {errors.completedProjects && <p className="text-red-500 text-[11px] font-bold ml-1">{errors.completedProjects}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 shrink-0">
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
