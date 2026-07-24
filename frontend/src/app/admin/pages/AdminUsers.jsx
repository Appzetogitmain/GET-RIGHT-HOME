import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, MoreVertical, Ban, CheckCircle,
    Mail, Phone, Calendar, Shield, ArrowUpRight, Trash2, Unlock, Eye, Loader2,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const UserStatusBadge = ({ status }) => {
    const isBlocked = status === 'BLOCKED';

    return (
        <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isBlocked ? 'bg-red-100 text-red-700 border-red-200 font-bold' : 'bg-green-100 text-green-700 border-green-200 font-bold'
            }`}>
            {isBlocked ? <Ban size={10} className="mr-1" /> : <CheckCircle size={10} className="mr-1" />}
            {status || 'ACTIVE'}
        </span>
    );
};

const AddBrokerModal = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', profileImage: '' });
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const validateFields = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Full Name is required.';
        
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone Number is required.';
        } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
            newErrors.phone = 'Enter a valid 10-digit number starting with 6-9.';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = 'Enter a valid email address.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (validateFields()) {
            setStep(2);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, profileImage: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitOtp = async (e) => {
        e.preventDefault();
        if (otp !== '123456') {
            setErrors({ otp: 'Invalid OTP. Please enter 123456.' });
            return;
        }

        setLoading(true);
        try {
            let imageUrl = formData.profileImage;
            
            // If it's a base64 string, upload it first
            if (imageUrl && imageUrl.startsWith('data:image')) {
                const uploadRes = await adminService.uploadImageBase64({
                    image: imageUrl,
                    folder: 'broker_profiles'
                });
                if (uploadRes.success) {
                    imageUrl = uploadRes.url;
                }
            }

            const payload = {
                ...formData,
                profileImage: imageUrl,
                phone: formData.phone.trim()
            };
            const res = await adminService.createBroker(payload);
            if (res.success) {
                toast.success('Broker created successfully');
                setFormData({ name: '', email: '', phone: '', profileImage: '' });
                setStep(1);
                setOtp('');
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create broker');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900 uppercase">
                        {step === 1 ? 'Add Broker' : 'Verify OTP'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="text-xl leading-none">&times;</span>
                    </button>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleNext} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">Full Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value });
                                    if (errors.name) setErrors({ ...errors, name: '' });
                                }}
                                className={`w-full px-4 py-2 bg-gray-50 border ${errors.name ? 'border-red-500' : 'border-transparent'} rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all`}
                                placeholder="John Doe"
                            />
                            {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-tight">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">Phone Number *</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 border-r pr-2 border-gray-300">+91</span>
                                <input
                                    type="tel"
                                    maxLength="10"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, phone: val });
                                        if (errors.phone) setErrors({ ...errors, phone: '' });
                                    }}
                                    className={`w-full pl-16 pr-4 py-2 bg-gray-50 border ${errors.phone ? 'border-red-500' : 'border-transparent'} rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all`}
                                    placeholder="9876543210"
                                />
                            </div>
                            {errors.phone && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-tight">{errors.phone}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">Email *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                    if (errors.email) setErrors({ ...errors, email: '' });
                                }}
                                className={`w-full px-4 py-2 bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-transparent'} rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all`}
                                placeholder="john@example.com"
                            />
                            {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-tight">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight mb-1">Logo / Profile Picture (Optional)</label>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="w-12 h-12 rounded-full border border-gray-200 overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
                                    {formData.profileImage ? (
                                        <img src={formData.profileImage} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="text-gray-300" size={20} />
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                />
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold uppercase text-xs hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-black text-white rounded-xl font-bold uppercase text-xs hover:bg-gray-900 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleSubmitOtp} className="p-6 space-y-4">
                        <div className="text-center mb-6">
                            <p className="text-sm font-bold text-gray-600">Enter OTP sent to +91 {formData.phone}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">(Bypass: enter 123456)</p>
                        </div>
                        <div>
                            <input
                                type="text"
                                maxLength="6"
                                value={otp}
                                onChange={(e) => {
                                    setOtp(e.target.value.replace(/\D/g, ''));
                                    if (errors.otp) setErrors({ ...errors, otp: '' });
                                }}
                                className={`w-full text-center tracking-[0.5em] px-4 py-3 bg-gray-50 border ${errors.otp ? 'border-red-500' : 'border-transparent'} rounded-xl text-xl font-bold focus:bg-white focus:border-black outline-none transition-all`}
                                placeholder="------"
                            />
                            {errors.otp && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-tight text-center">{errors.otp}</p>}
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold uppercase text-xs hover:bg-gray-200 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="flex-1 px-4 py-2 bg-black text-white rounded-xl font-bold uppercase text-xs hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading && <Loader2 size={14} className="animate-spin" />}
                                Verify & Create
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

const AdminUsers = () => {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        role: '',
        status: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });
    const [isAddBrokerModalOpen, setIsAddBrokerModalOpen] = useState(false);

    const fetchUsers = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                role: currentFilters.role,
                status: currentFilters.status
            };
            const data = await adminService.getUsers(params);
            if (data.success) {
                setUsers(data.users);
                setTotalUsers(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching users:', error);
                toast.error('Failed to load users');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(currentPage, filters);
        }, 300); // 300ms debounce for search
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchUsers]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const next = { ...prev, [key]: value };
            // Auto-clear builder-specific statuses if switching away from builder/all-roles
            if (key === 'role' && value !== 'builder' && value !== '') {
                if (['pending', 'approved', 'rejected'].includes(next.status)) {
                    next.status = '';
                }
            }
            return next;
        });
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleUpdateStatus = async (userId, isBlocked) => {
        try {
            const res = await adminService.updateUserStatus(userId, isBlocked);
            if (res.success) {
                toast.success(`User ${isBlocked ? 'blocked' : 'unblocked'} successfully`);
                fetchUsers(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update user status');
        }
    };

    const handleAction = (action, user) => {
        setActiveDropdown(null);
        if (action === 'block') {
            setModalConfig({
                isOpen: true,
                title: 'Block User?',
                message: `Are you sure you want to block ${user.name}? They will not be able to login or make bookings.`,
                type: 'danger',
                confirmText: 'Block User',
                onConfirm: () => handleUpdateStatus(user._id, true)
            });
        } else if (action === 'unblock') {
            setModalConfig({
                isOpen: true,
                title: 'Unblock User?',
                message: `Are you sure you want to unblock ${user.name}?`,
                type: 'success',
                confirmText: 'Unblock User',
                onConfirm: () => handleUpdateStatus(user._id, false)
            });
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete User?',
                message: `Are you sure you want to delete ${user.name}? This action cannot be undone and all their data will be lost.`,
                type: 'danger',
                confirmText: 'Delete User',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deleteUser(user._id);
                        if (res.success) {
                            toast.success('User deleted successfully');
                            fetchUsers(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to delete user');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (users.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
        const csvContent = [
            headers.join(','),
            ...users.map(u => [
                u._id,
                `"${u.name}"`,
                u.email,
                u.phone,
                u.role,
                u.isBlocked ? 'Blocked' : 'Active',
                new Date(u.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />
            
            <AnimatePresence>
                {isAddBrokerModalOpen && (
                    <AddBrokerModal
                        isOpen={isAddBrokerModalOpen}
                        onClose={() => setIsAddBrokerModalOpen(false)}
                        onSuccess={() => {
                            setIsAddBrokerModalOpen(false);
                            fetchUsers(1, filters);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">User Management ({totalUsers})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">View, track, and manage registered guests and partners.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddBrokerModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-900 transition-colors shadow-sm"
                    >
                        + Add Broker
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search via name, email or phone..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.role}
                        onChange={(e) => handleFilterChange('role', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="builder">Builder</option>
                        <option value="broker">Broker</option>
                        <option value="owner">Owner</option>
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                        {(!filters.role || filters.role === 'builder') && (
                            <>
                                <option value="pending">Pending (Builder Only)</option>
                                <option value="approved">Approved (Builder Only)</option>
                                <option value="rejected">Rejected (Builder Only)</option>
                            </>
                        )}
                    </select>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">User Details</th>
                                <th className="p-4">Contact Info</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Account Status</th>
                                <th className="p-4">Joined Date</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {users.length > 0 ? (
                                        users.map((user, index) => (
                                            <motion.tr
                                                key={user._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative font-bold"
                                            >
                                                <td className="p-4">
                                                    <Link to={`${basePath}/users/${user._id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0 border border-white shadow-sm font-bold uppercase text-xs">
                                                            {user.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{user.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ID: {user._id.slice(-6)}</p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                                                            <Mail size={12} className="mr-1.5 text-gray-400" />
                                                            {user.email || 'N/A'}
                                                        </div>
                                                        <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                                                            <Phone size={12} className="mr-1.5 text-gray-400" />
                                                            {user.phone}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold uppercase py-1 px-2 rounded-md ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 font-bold' :
                                                        user.role === 'partner' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100 text-gray-700 font-bold'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <UserStatusBadge status={user.isBlocked ? 'BLOCKED' : 'ACTIVE'} />
                                                </td>
                                                <td className="p-4 text-[10px] font-bold text-gray-500 uppercase">
                                                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === user._id ? null : user._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === user._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`${basePath}/users/${user._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-bold uppercase text-gray-700">
                                                                <Eye size={14} /> View Profile
                                                            </Link>
                                                            {user.isBlocked ? (
                                                                <button
                                                                    onClick={() => handleAction('unblock', user)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-xs font-bold uppercase text-green-600"
                                                                >
                                                                    <Unlock size={14} /> Unblock
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAction('block', user)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-bold uppercase text-red-600"
                                                                >
                                                                    <Ban size={14} /> Block
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleAction('delete', user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-bold uppercase text-red-600"
                                                                disabled={user.role === 'admin'}
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                No users found matching query
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && users.length > 0 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalUsers)} of {totalUsers} users
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
        </div>
    );
};

export default AdminUsers;
