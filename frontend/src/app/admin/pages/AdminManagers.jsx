import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCheck, Search, Filter, MoreVertical, Ban, CheckCircle,
    Mail, Phone, Shield, ArrowUpRight, Trash2, Unlock, Eye, Loader2,
    ChevronLeft, ChevronRight, Download, Plus, X, Check, Info, Lock
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

// Fallback module list in case api fails temporarily
const FALLBACK_MODULES = [
    { key: 'dashboard', label: 'Dashboard', group: 'OVERVIEW', actions: ['view'] },
    { key: 'users', label: 'User Management', group: 'MANAGEMENT', actions: ['view', 'edit', 'delete', 'export'] },
    { key: 'partners', label: 'Partner Management', group: 'MANAGEMENT', actions: ['view', 'edit', 'approve', 'delete'] },
    { key: 'properties', label: 'Property Management', group: 'MANAGEMENT', actions: ['view', 'add', 'edit', 'delete', 'approve', 'export'] },
    { key: 'enquiries', label: 'Enquiries / Leads', group: 'MANAGEMENT', actions: ['view', 'edit', 'delete', 'export'] },
    { key: 'bookings', label: 'Bookings', group: 'MANAGEMENT', actions: ['view', 'edit', 'approve', 'export'] }
];

const AdminManagers = () => {
    const [managers, setManagers] = useState([]);
    const [modules, setModules] = useState(FALLBACK_MODULES);
    const [loading, setLoading] = useState(true);
    const [totalManagers, setTotalManagers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        isActive: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    // Panel states (For Add / Edit / View Permissions)
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [panelMode, setPanelMode] = useState('add'); // 'add' | 'edit' | 'permissions'
    const [activePreset, setActivePreset] = useState(null);
    const [selectedManager, setSelectedManager] = useState(null);
    const [errors, setErrors] = useState({});

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        branch: '',
        isActive: true,
        permissions: [] // Array of { module: 'key', actions: ['view'] }
    });

    const fetchManagers = useCallback(async (page, currentFilters) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                isActive: currentFilters.isActive || undefined
            };
            const data = await adminService.getManagers(params);
            if (data.success) {
                setManagers(data.managers);
                setTotalManagers(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            console.error('Error fetching managers:', error);
            toast.error('Failed to load managers');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    const fetchModules = useCallback(async () => {
        try {
            const data = await adminService.getManagerModules();
            if (data.success && data.modules) {
                setModules(data.modules);
            }
        } catch (error) {
            console.warn('Could not fetch modules from api, using fallbacks', error);
        }
    }, []);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchManagers(currentPage, filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchManagers]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleToggleStatus = async (managerId) => {
        try {
            const res = await adminService.toggleManagerStatus(managerId);
            if (res.success) {
                toast.success(res.message || 'Status updated successfully');
                fetchManagers(currentPage, filters);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update manager status');
        }
    };

    const handleDeleteManager = async (managerId) => {
        try {
            const res = await adminService.deleteManager(managerId);
            if (res.success) {
                toast.success('Manager deleted successfully');
                fetchManagers(currentPage, filters);
            }
        } catch (error) {
            toast.error('Failed to delete manager');
        }
    };

    const handleOpenAddPanel = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            branch: '',
            isActive: true,
            permissions: []
        });
        setErrors({});
        setPanelMode('add');
        setIsPanelOpen(true);
    };

    const handleOpenEditPanel = (manager) => {
        setSelectedManager(manager);
        setFormData({
            name: manager.name || '',
            email: manager.email || '',
            phone: manager.phone || '',
            password: '', // Keep blank unless resetting
            branch: manager.branch || '',
            isActive: manager.isActive,
            permissions: manager.permissions || []
        });
        setErrors({});
        setPanelMode('edit');
        setIsPanelOpen(true);
    };

    const handleOpenPermissionsPanel = (manager) => {
        setSelectedManager(manager);
        setFormData({
            name: manager.name || '',
            email: manager.email || '',
            phone: manager.phone || '',
            password: '',
            branch: manager.branch || '',
            isActive: manager.isActive,
            permissions: manager.permissions || []
        });
        setErrors({});
        setPanelMode('permissions');
        setIsPanelOpen(true);
    };

    // Permission handling helpers
    const handlePermissionChange = (moduleKey, action, isChecked) => {
        setFormData(prev => {
            const currentPerms = [...prev.permissions];
            const existingIndex = currentPerms.findIndex(p => p.module === moduleKey);

            if (existingIndex !== -1) {
                const entry = { ...currentPerms[existingIndex] };
                if (isChecked) {
                    if (!entry.actions.includes(action)) {
                        entry.actions = [...entry.actions, action];
                    }
                } else {
                    entry.actions = entry.actions.filter(a => a !== action);
                }

                // Always require at least 'view' to keep the entry, except when removing 'view' itself
                if (action === 'view' && !isChecked) {
                    currentPerms.splice(existingIndex, 1);
                } else if (entry.actions.length === 0) {
                    currentPerms.splice(existingIndex, 1);
                } else {
                    // Ensure 'view' is automatically checked if any other action is checked
                    if (isChecked && action !== 'view' && !entry.actions.includes('view')) {
                        entry.actions.push('view');
                    }
                    currentPerms[existingIndex] = entry;
                }
            } else if (isChecked) {
                // Create new entry
                const actions = [action];
                if (action !== 'view') actions.push('view'); // auto-include view
                currentPerms.push({ module: moduleKey, actions });
            }

            return { ...prev, permissions: currentPerms };
        });
    };

    const applyPreset = (presetName) => {
        if (activePreset === presetName) {
            // Toggle off if clicking the same preset again
            setFormData(prev => ({ ...prev, permissions: [] }));
            setActivePreset(null);
            return;
        }

        let newPerms = [];
        if (presetName === 'full') {
            newPerms = modules.map(m => ({
                module: m.key,
                actions: [...m.actions]
            }));
        } else if (presetName === 'readonly') {
            newPerms = modules.map(m => ({
                module: m.key,
                actions: ['view']
            }));
        } else if (presetName === 'property_project') {
            const propModules = ['dashboard', 'properties', 'projects', 'featured_projects', 'property_videos', 'categories', 'locations', 'property_forms'];
            newPerms = modules
                .filter(m => propModules.includes(m.key))
                .map(m => ({
                    module: m.key,
                    actions: [...m.actions]
                }));
        }
        
        setActivePreset(presetName);
        setFormData(prev => ({ ...prev, permissions: newPerms }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (panelMode === 'add' || panelMode === 'edit') {
            const tempErrors = {};
            const nameRegex = /^[a-zA-Z\s]+$/;

            if (!formData.name) {
                tempErrors.name = 'Full Name is required';
            } else if (!nameRegex.test(formData.name)) {
                tempErrors.name = 'Full Name must contain only alphabets';
            } else if (formData.name.trim().length < 3) {
                tempErrors.name = 'Full Name must be at least 3 characters';
            }

            if (!formData.email) {
                tempErrors.email = 'Email Address is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                tempErrors.email = 'Please enter a valid email address';
            }

            if (!formData.phone) {
                tempErrors.phone = 'Phone Number is required';
            } else {
                const phoneRegex = /^[6-9]\d{9}$/;
                if (!phoneRegex.test(formData.phone)) {
                    tempErrors.phone = 'Please enter a valid 10-digit Indian phone number starting with 6-9';
                }
            }

            if (panelMode === 'add') {
                if (!formData.password) {
                    tempErrors.password = 'Password is required';
                } else if (formData.password.length < 6) {
                    tempErrors.password = 'Password must be at least 6 characters';
                }
            } else if (panelMode === 'edit' && formData.password) {
                if (formData.password.length < 6) {
                    tempErrors.password = 'Password must be at least 6 characters';
                }
            }

            if (Object.keys(tempErrors).length > 0) {
                setErrors(tempErrors);
                return;
            }
            setErrors({});
        }

        try {
            if (panelMode === 'add') {
                const res = await adminService.createManager(formData);
                if (res.success) {
                    toast.success('Manager account created successfully');
                    setIsPanelOpen(false);
                    fetchManagers(currentPage, filters);
                }
            } else if (panelMode === 'edit') {
                const payload = { ...formData };
                if (!payload.password) delete payload.password; // Do not send empty pass
                const res = await adminService.updateManager(selectedManager._id, payload);
                if (res.success) {
                    toast.success('Manager account updated successfully');
                    setIsPanelOpen(false);
                    fetchManagers(currentPage, filters);
                }
            } else if (panelMode === 'permissions') {
                const res = await adminService.updateManagerPermissions(selectedManager._id, formData.permissions);
                if (res.success) {
                    toast.success('Permissions updated successfully');
                    setIsPanelOpen(false);
                    fetchManagers(currentPage, filters);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const handleExportCSV = () => {
        if (managers.length === 0) {
            toast.error('No managers to export');
            return;
        }

        const headers = ['ID', 'Name', 'Email', 'Phone', 'Branch', 'Status', 'Permissions Assigned', 'Last Login'];
        const csvContent = [
            headers.join(','),
            ...managers.map(m => [
                m._id,
                `"${m.name}"`,
                m.email,
                m.phone || 'N/A',
                m.branch || 'Global',
                m.isActive ? 'Active' : 'Deactivated',
                m.permissions?.length || 0,
                m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'Never'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `managers-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    const hasAction = (moduleKey, action) => {
        const entry = formData.permissions.find(p => p.module === moduleKey);
        return entry ? entry.actions.includes(action) : false;
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
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Manager Management ({totalManagers})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Create, edit, and assign modular permissions for staff & managers.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                    <button
                        onClick={handleOpenAddPanel}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 transition-colors shadow-lg"
                    >
                        <Plus size={14} /> Add Manager
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search manager by name, email or branch..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.isActive}
                        onChange={(e) => handleFilterChange('isActive', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active Only</option>
                        <option value="false">Deactivated Only</option>
                    </select>
                </div>
            </div>

            {/* Managers Table List */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Manager Profile</th>
                                <th className="p-4">Contact Detail</th>
                                <th className="p-4">Branch</th>
                                <th className="p-4 text-center">Perms Count</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4">Last Login</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {managers.length > 0 ? (
                                        managers.map((manager, index) => (
                                            <motion.tr
                                                key={manager._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative font-bold"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 border border-white shadow-sm font-bold uppercase text-xs">
                                                            {manager.name?.charAt(0) || 'M'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{manager.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ID: {manager._id.slice(-6)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                                                            <Mail size={11} className="mr-1.5 text-gray-400" />
                                                            {manager.email}
                                                        </div>
                                                        {manager.phone && (
                                                            <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                                                                <Phone size={11} className="mr-1.5 text-gray-400" />
                                                                {manager.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs uppercase tracking-tight font-bold text-gray-700">
                                                    {manager.branch ? (
                                                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                            {manager.branch}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic font-medium lowercase">all branches</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                                        {manager.permissions?.length || 0} modules
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${manager.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                        {manager.isActive ? 'Active' : 'Deactivated'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-[10px] text-gray-500 uppercase tracking-tight font-bold">
                                                    {manager.lastLogin ? (
                                                        new Date(manager.lastLogin).toLocaleString('en-IN', {
                                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })
                                                    ) : (
                                                        <span className="text-gray-400 italic">Never</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === manager._id ? null : manager._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === manager._id && (
                                                        <div className="absolute right-8 top-8 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1.5 text-left">
                                                            <button
                                                                onClick={() => handleOpenEditPanel(manager)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-bold uppercase text-gray-700"
                                                            >
                                                                <Eye size={13} /> Edit Account
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenPermissionsPanel(manager)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-teal-50 text-xs font-bold uppercase text-teal-700"
                                                            >
                                                                <Shield size={13} /> Permissions
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveDropdown(null);
                                                                    setModalConfig({
                                                                        isOpen: true,
                                                                        title: manager.isActive ? 'Deactivate Manager?' : 'Activate Manager?',
                                                                        message: `Are you sure you want to ${manager.isActive ? 'deactivate' : 'activate'} ${manager.name}'s manager credentials?`,
                                                                        type: manager.isActive ? 'danger' : 'success',
                                                                        confirmText: manager.isActive ? 'Deactivate' : 'Activate',
                                                                        onConfirm: () => handleToggleStatus(manager._id)
                                                                    });
                                                                }}
                                                                className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase ${manager.isActive ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'}`}
                                                            >
                                                                {manager.isActive ? <Ban size={13} /> : <Unlock size={13} />}
                                                                {manager.isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveDropdown(null);
                                                                    setModalConfig({
                                                                        isOpen: true,
                                                                        title: 'Delete Manager Account?',
                                                                        message: `Are you sure you want to permanently delete the manager account for ${manager.name}? This action is irreversible.`,
                                                                        type: 'danger',
                                                                        confirmText: 'Delete Permanently',
                                                                        onConfirm: () => handleDeleteManager(manager._id)
                                                                    });
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-bold uppercase text-red-600"
                                                            >
                                                                <Trash2 size={13} /> Delete Account
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                No manager accounts found
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                             )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && managers.length > 0 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalManagers)} of {totalManagers} managers
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 rounded-lg text-[10px] font-bold uppercase transition-all ${currentPage === i + 1 ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-600 border border-transparent hover:border-gray-200'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sliding Panel for Add/Edit/Permissions */}
            <AnimatePresence>
                {isPanelOpen && (
                    <>
                        {/* Overlay backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPanelOpen(false)}
                            className="fixed inset-0 z-40 bg-black backdrop-blur-xs"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-3xl bg-white shadow-2xl flex flex-col"
                        >
                            {/* Panel Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 uppercase">
                                        {panelMode === 'add' ? 'Create Staff Manager' : panelMode === 'edit' ? 'Update Manager Profile' : 'Configure Permissions Matrix'}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                                        {panelMode === 'permissions' ? `Configuring rules for ${formData.name}` : 'Setup login credentials and branch scoping.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsPanelOpen(false)}
                                    className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Panel Scrollable Content */}
                            <form onSubmit={handleFormSubmit} noValidate className="flex-1 overflow-y-auto p-6 space-y-6">
                                {panelMode !== 'permissions' && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                                            <UserCheck size={14} /> Profile & Login Info
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Full Name *</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') });
                                                        if (errors.name) {
                                                            setErrors(prev => {
                                                                const clone = { ...prev };
                                                                delete clone.name;
                                                                return clone;
                                                            });
                                                        }
                                                    }}
                                                    className={`w-full px-4 py-2 border ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-xs font-bold uppercase outline-none transition-colors`}
                                                />
                                                {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-tight">{errors.name}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Branch City (Scoping)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Delhi, Jaipur"
                                                    value={formData.branch}
                                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold uppercase focus:border-black outline-none transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Email Address *</label>
                                                <input
                                                    type="email"
                                                    autoComplete="new-password"
                                                    value={formData.email}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, email: e.target.value.toLowerCase() });
                                                        if (errors.email) {
                                                            setErrors(prev => {
                                                                const clone = { ...prev };
                                                                delete clone.email;
                                                                return clone;
                                                            });
                                                        }
                                                    }}
                                                    className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-xs font-bold outline-none transition-colors`}
                                                />
                                                {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-tight">{errors.email}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Phone Number *</label>
                                                <div className="flex">
                                                    <span className={`flex items-center bg-gray-100 border ${errors.phone ? 'border-red-500' : 'border-gray-200'} border-r-0 rounded-l-xl px-3 text-xs font-bold text-gray-500 select-none`}>
                                                        +91
                                                    </span>
                                                    <input
                                                        type="tel"
                                                        value={formData.phone}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) });
                                                            if (errors.phone) {
                                                                setErrors(prev => {
                                                                    const clone = { ...prev };
                                                                    delete clone.phone;
                                                                    return clone;
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full px-4 py-2 border ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-r-xl text-xs font-bold uppercase outline-none transition-colors`}
                                                        placeholder="9876543210"
                                                    />
                                                </div>
                                                {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-tight">{errors.phone}</p>}
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">
                                                    {panelMode === 'add' ? 'Temporary Password *' : 'Change Password (Leave blank to keep current)'}
                                                </label>
                                                <input
                                                    type="password"
                                                    autoComplete="new-password"
                                                    placeholder={panelMode === 'add' ? 'Password' : '••••••••'}
                                                    value={formData.password}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, password: e.target.value });
                                                        if (errors.password) {
                                                            setErrors(prev => {
                                                                const clone = { ...prev };
                                                                delete clone.password;
                                                                return clone;
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full px-4 py-2 border ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'} rounded-xl text-xs font-bold outline-none transition-colors`}
                                                    />
                                                    {errors.password && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-tight">{errors.password}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                {(panelMode === 'permissions' || panelMode === 'add' || panelMode === 'edit') && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-2">
                                            <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                                                <Shield size={14} /> Modular Access Matrix
                                            </h4>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Presets:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => { setFormData(prev => ({ ...prev, permissions: [] })); setActivePreset(null); }}
                                                    className="px-2.5 py-1 text-[8px] font-bold uppercase bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors"
                                                >
                                                    Reset
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset('readonly')}
                                                    className={`px-2.5 py-1 text-[8px] font-bold uppercase rounded-md transition-colors ${activePreset === 'readonly' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                                >
                                                    Read Only
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset('property_project')}
                                                    className={`px-2.5 py-1 text-[8px] font-bold uppercase rounded-md transition-colors ${activePreset === 'property_project' ? 'bg-teal-800 text-white' : 'bg-teal-50 hover:bg-teal-100 text-teal-700'}`}
                                                >
                                                    Prop & Proj
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset('full')}
                                                    className={`px-2.5 py-1 text-[8px] font-bold uppercase rounded-md transition-colors ${activePreset === 'full' ? 'bg-black text-white ring-2 ring-offset-1 ring-black' : 'bg-black hover:bg-gray-800 text-white'}`}
                                                >
                                                    All Access
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                                            <table className="w-full text-left border-collapse text-[10px] uppercase font-bold text-gray-600">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="p-3 text-[10px] font-bold text-gray-800">Module</th>
                                                        <th className="p-3 text-center">View</th>
                                                        <th className="p-3 text-center">Add</th>
                                                        <th className="p-3 text-center">Edit</th>
                                                        <th className="p-3 text-center">Delete</th>
                                                        <th className="p-3 text-center">Approve</th>
                                                        <th className="p-3 text-center">Reject</th>
                                                        <th className="p-3 text-center">Suspend</th>
                                                        <th className="p-3 text-center">Export</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {modules.map((mod) => (
                                                        <tr key={mod.key} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-3">
                                                                <div>
                                                                    <p className="text-gray-900 font-bold uppercase text-[10px]">{mod.label}</p>
                                                                    <p className="text-[8px] text-gray-400 font-semibold tracking-wider font-mono lowercase">{mod.key}</p>
                                                                </div>
                                                            </td>
                                                            {['view', 'add', 'edit', 'delete', 'approve', 'reject', 'suspend', 'export'].map((act) => {
                                                                const isAllowedAction = mod.actions.includes(act);
                                                                const isChecked = hasAction(mod.key, act);

                                                                return (
                                                                    <td key={act} className="p-3 text-center">
                                                                        {isAllowedAction ? (
                                                                            <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => handlePermissionChange(mod.key, act, e.target.checked)}
                                                                                    className="w-4 h-4 rounded text-teal-600 border-gray-300 focus:ring-teal-500 cursor-pointer"
                                                                                />
                                                                            </label>
                                                                        ) : (
                                                                            <span className="text-gray-200 font-bold select-none text-[8px]">-</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </form>

                            {/* Panel Footer */}
                            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                                <button
                                    type="button"
                                    onClick={() => setIsPanelOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFormSubmit}
                                    type="button"
                                    className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-md"
                                >
                                    {panelMode === 'add' ? 'Create Manager Account' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminManagers;
