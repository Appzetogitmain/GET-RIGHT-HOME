import React, { useState, useEffect } from 'react';
import { Video, Users, Heart, Loader2, ArrowUpRight, Search, Plus, Trash2, Pencil, Eye, Link, X } from 'lucide-react';
import adminService from '../../../services/adminService';
import { reelService } from '../../../services/reelService';
import toast from 'react-hot-toast';

const BENGALURU_AREAS = [
  "Bengaluru North",
  "Bengaluru South",
  "Bengaluru East",
  "Anekal",
  "Yelahanka",
  "Devanahalli",
  "Doddaballapura",
  "Hosakote",
  "Nelamangala"
];

const BUDGET_RANGES = [
  "Less than 1.5 Cr",
  "1.5 Cr to 2.5 Cr",
  "2.5 Cr to 3.5 Cr",
  "More than 3.5 Cr"
];

const PROPERTY_TYPES = [
  "PG",
  "Hotel",
  "Rent",
  "Sell",
  "Apartment",
  "Villa",
  "Plot",
  "Builder Floor",
  "Office Space",
  "Retail Space"
];

const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"];

const AdminReelAnalysis = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ totalReels: 0, userStats: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [couponSettings, setCouponSettings] = useState({
        reelCouponTarget: 1000,
        reelCouponDiscount: 500
    });
    const [saving, setSaving] = useState(false);

    // Reels Management State
    const [allReels, setAllReels] = useState([]);
    const [loadingReels, setLoadingReels] = useState(false);
    const [reelsSearchTerm, setReelsSearchTerm] = useState('');

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editingReel, setEditingReel] = useState(null); // null if creating

    // Form fields state
    const [formTitle, setFormTitle] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formCity, setFormCity] = useState(BENGALURU_AREAS[0]);
    const [formBudget, setFormBudget] = useState(BUDGET_RANGES[0]);
    const [formStatus, setFormStatus] = useState('Ready to move');
    const [formType, setFormType] = useState(PROPERTY_TYPES[0]);
    const [formContact, setFormContact] = useState('');
    const [formCaption, setFormCaption] = useState('');
    const [formBhkSelections, setFormBhkSelections] = useState({});

    const [formVideoType, setFormVideoType] = useState('url'); // 'file' or 'url'
    const [formVideoUrl, setFormVideoUrl] = useState('');
    const [formSelectedFile, setFormSelectedFile] = useState(null);
    const [formSelectedFileName, setFormSelectedFileName] = useState('');
    const [submittingReel, setSubmittingReel] = useState(false);

    // Preview Modal State
    const [previewReel, setPreviewReel] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchAllReels = async () => {
        try {
            setLoadingReels(true);
            const res = await reelService.getFeed({ limit: 100 });
            if (res.reels) {
                setAllReels(res.reels);
            }
        } catch (error) {
            console.error('Error fetching reels:', error);
            toast.error('Failed to load reels list');
        } finally {
            setLoadingReels(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await adminService.getReelAnalysis();
            if (res.success) {
                setData({
                    totalReels: res.totalReels,
                    userStats: res.userStats
                });
                if (res.settings) {
                    setCouponSettings(res.settings);
                }
            }
            await fetchAllReels();
        } catch (error) {
            console.error('Error fetching reel analysis:', error);
            toast.error('Failed to load reel analysis');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReel = async (reelId) => {
        if (!window.confirm('Are you sure you want to delete this reel?')) return;
        try {
            await reelService.deleteReel(reelId);
            toast.success('Reel deleted successfully');
            setAllReels(prev => prev.filter(r => r._id !== reelId));
            setData(prev => ({ ...prev, totalReels: Math.max(0, prev.totalReels - 1) }));
        } catch (error) {
            console.error('Error deleting reel:', error);
            toast.error('Failed to delete reel');
        }
    };

    const handleOpenCreateModal = () => {
        setEditingReel(null);
        setFormTitle('');
        setFormAddress('');
        setFormCity(BENGALURU_AREAS[0]);
        setFormBudget(BUDGET_RANGES[0]);
        setFormStatus('Ready to move');
        setFormType(PROPERTY_TYPES[0]);
        setFormContact('');
        setFormCaption('');
        setFormBhkSelections({});
        setFormVideoType('url');
        setFormVideoUrl('');
        setFormSelectedFile(null);
        setFormSelectedFileName('');
        setModalOpen(true);
    };

    const handleOpenEditModal = (reel) => {
        setEditingReel(reel);
        setFormTitle(reel.title || '');
        setFormAddress(reel.address || '');
        setFormCity(reel.city || BENGALURU_AREAS[0]);
        setFormBudget(reel.budgetRange || BUDGET_RANGES[0]);
        setFormStatus(reel.status || 'Ready to move');
        setFormType(reel.propertyType || PROPERTY_TYPES[0]);
        setFormContact(reel.contactNumber || '');
        setFormCaption(reel.caption || '');
        setFormVideoType(reel.videoType || 'url');
        setFormVideoUrl(reel.videoUrl || '');
        setFormSelectedFile(null);
        setFormSelectedFileName('');

        const bhks = {};
        if (reel.configurations && Array.isArray(reel.configurations)) {
            reel.configurations.forEach(config => {
                bhks[config.bhk] = config.price;
            });
        }
        setFormBhkSelections(bhks);
        setModalOpen(true);
    };

    const handleBhkCheck = (bhk) => {
        setFormBhkSelections(prev => {
            const next = { ...prev };
            if (next[bhk] !== undefined) {
                delete next[bhk];
            } else {
                next[bhk] = '';
            }
            return next;
        });
    };

    const handleBhkPriceChange = (bhk, val) => {
        setFormBhkSelections(prev => ({
            ...prev,
            [bhk]: val
        }));
    };

    const handleReelSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!editingReel && formVideoType === 'file' && !formSelectedFile) {
            toast.error('Please select a video file');
            return;
        }
        if (formVideoType === 'url' && !formVideoUrl) {
            toast.error('Please provide a video URL link');
            return;
        }
        if (!formTitle || !formAddress || !formContact) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmittingReel(true);
        try {
            const configurations = Object.entries(formBhkSelections)
                .filter(([_, value]) => value && value.trim())
                .map(([bhk, price]) => ({ bhk, price }));

            let res;
            if (editingReel) {
                if (formVideoType === 'file') {
                    const formData = new FormData();
                    if (formSelectedFile) {
                        formData.append('video', formSelectedFile);
                    }
                    formData.append('videoType', 'file');
                    formData.append('title', formTitle);
                    formData.append('address', formAddress);
                    formData.append('city', formCity);
                    formData.append('budgetRange', formBudget);
                    formData.append('status', formStatus);
                    formData.append('propertyType', formType);
                    formData.append('contactNumber', formContact);
                    formData.append('caption', formCaption);
                    formData.append('configurations', JSON.stringify(configurations));
                    formData.append('category', 'General');

                    res = await reelService.updateReel(editingReel._id, formData, true);
                } else {
                    const payload = {
                        videoType: 'url',
                        videoUrl: formVideoUrl,
                        title: formTitle,
                        address: formAddress,
                        city: formCity,
                        budgetRange: formBudget,
                        status: formStatus,
                        propertyType: formType,
                        contactNumber: formContact,
                        caption: formCaption,
                        configurations,
                        category: 'General'
                    };
                    res = await reelService.updateReel(editingReel._id, payload, false);
                }
                toast.success('Reel updated successfully');
            } else {
                if (formVideoType === 'file') {
                    const formData = new FormData();
                    formData.append('video', formSelectedFile);
                    formData.append('videoType', 'file');
                    formData.append('title', formTitle);
                    formData.append('address', formAddress);
                    formData.append('city', formCity);
                    formData.append('budgetRange', formBudget);
                    formData.append('status', formStatus);
                    formData.append('propertyType', formType);
                    formData.append('contactNumber', formContact);
                    formData.append('caption', formCaption);
                    formData.append('configurations', JSON.stringify(configurations));
                    formData.append('category', 'General');

                    res = await reelService.uploadReel(formData, true);
                } else {
                    const payload = {
                        videoType: 'url',
                        videoUrl: formVideoUrl,
                        title: formTitle,
                        address: formAddress,
                        city: formCity,
                        budgetRange: formBudget,
                        status: formStatus,
                        propertyType: formType,
                        contactNumber: formContact,
                        caption: formCaption,
                        configurations,
                        category: 'General'
                    };
                    res = await reelService.uploadReel(payload, false);
                }
                toast.success('Reel created successfully');
            }
            setModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error submitting reel:', error);
            toast.error(error.response?.data?.message || 'Failed to submit reel');
        } finally {
            setSubmittingReel(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            const res = await adminService.updatePlatformSettings(couponSettings);
            if (res.success) {
                toast.success('Coupon settings updated successfully');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const filteredStats = data.userStats.filter(user =>
        user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userPhone.includes(searchTerm)
    );

    const totalLikes = data.userStats.reduce((acc, curr) => acc + curr.totalLikes, 0);
    const totalUsers = data.userStats.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reel Analysis</h1>
                    <p className="text-gray-500 text-sm">Monitor reel engagement and user activity</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    Refresh Data
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Reels"
                    value={data.totalReels}
                    icon={<Video className="w-6 h-6 text-blue-500" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Contributors"
                    value={totalUsers}
                    icon={<Users className="w-6 h-6 text-purple-500" />}
                    color="bg-purple-50"
                />
                <StatCard
                    title="Total Engagement"
                    value={totalLikes}
                    subtitle="Total Likes"
                    icon={<Heart className="w-6 h-6 text-red-500" />}
                    color="bg-red-50"
                />
            </div>

            {/* Reward Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-amber-50 rounded-lg">
                        <Heart className="w-5 h-5 text-amber-500 fill-current" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Reel Reward Logic</h2>
                </div>
                <p className="text-sm text-gray-500">Automatically generate a PG-only discount coupon when a user's reel reaches a specific like count.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Likes per Reel</label>
                        <input
                            type="number"
                            value={couponSettings.reelCouponTarget}
                            onChange={(e) => setCouponSettings({ ...couponSettings, reelCouponTarget: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="e.g. 1000"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Discount Amount (Flat ₹)</label>
                        <input
                            type="number"
                            value={couponSettings.reelCouponDiscount}
                            onChange={(e) => setCouponSettings({ ...couponSettings, reelCouponDiscount: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="e.g. 500"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md shadow-teal-500/20"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save reward Logic'}
                    </button>
                </div>
            </div>

            {/* Analysis Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-gray-800">User Performance</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-full md:w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Reels Posted</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Total Likes</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Engagement Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStats.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900">{user.userName}</span>
                                            <span className="text-xs text-gray-500">{user.userPhone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-700 font-medium">
                                        {user.reelCount}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 text-sm text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full">
                                            <Heart size={14} className="fill-current" />
                                            {user.totalLikes}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-sm text-emerald-600 font-bold">
                                            {(user.totalLikes / user.reelCount).toFixed(1)} <span className="text-[10px] text-gray-400 font-normal">avg/reel</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStats.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                                        No matching users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* All Reels Management */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">All Reels</h2>
                        <p className="text-xs text-gray-500">View, edit, or delete user and admin uploaded reels</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by title, city, type..."
                                value={reelsSearchTerm}
                                onChange={(e) => setReelsSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-full md:w-64"
                            />
                        </div>
                        <button
                            onClick={handleOpenCreateModal}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-teal-500/20"
                        >
                            <Plus size={16} />
                            <span>Create Reel</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loadingReels ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
                            <p className="text-xs text-gray-500 mt-2 font-medium">Loading reels list...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reel Video</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">City & Area</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Type & Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Engagement</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {allReels
                                    .filter(reel =>
                                        reel.title?.toLowerCase().includes(reelsSearchTerm.toLowerCase()) ||
                                        reel.city?.toLowerCase().includes(reelsSearchTerm.toLowerCase()) ||
                                        reel.propertyType?.toLowerCase().includes(reelsSearchTerm.toLowerCase())
                                    )
                                    .map((reel) => (
                                        <tr key={reel._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div 
                                                    onClick={() => setPreviewReel(reel)}
                                                    className="w-16 h-24 rounded-lg bg-neutral-900 overflow-hidden relative cursor-pointer group-hover:scale-105 transition-transform flex items-center justify-center border border-gray-100 shadow-sm"
                                                >
                                                    {reel.videoType === 'file' ? (
                                                        <video src={reel.videoUrl} className="w-full h-full object-cover pointer-events-none" muted />
                                                    ) : (
                                                        <div className="text-center p-1">
                                                            <Link size={16} className="text-gray-400 mx-auto mb-1" />
                                                            <span className="text-[8px] text-gray-400 uppercase font-black tracking-tighter block truncate">Link</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 text-sm">{reel.title}</span>
                                                    <span className="text-xs text-gray-500">{reel.address}</span>
                                                    {reel.contactNumber && (
                                                        <span className="text-[10px] text-teal-600 font-semibold mt-1">📞 {reel.contactNumber}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs text-gray-700 font-semibold bg-gray-100 px-2 py-1 rounded-md">{reel.city || 'Bengaluru'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{reel.propertyType}</span>
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{reel.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-bold">
                                                        <Heart size={12} className="fill-current" />
                                                        {reel.likesCount}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{reel.viewsCount} views</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(reel)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Reel"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReel(reel._id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Reel"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {allReels.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">
                                            No reels found in database
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create / Edit Reel Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    {editingReel ? 'Edit Reel Details' : 'Create New Reel'}
                                </h3>
                                <p className="text-xs text-gray-500">Enter the specifications and video link/file for the reel</p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleReelSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Video Source Type */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Video Source Type</label>
                                <div className="flex border border-gray-200 rounded-xl overflow-hidden p-1 bg-gray-50">
                                    <button
                                        type="button"
                                        onClick={() => setFormVideoType('file')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            formVideoType === 'file' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        <Video size={13} />
                                        <span>Upload File</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormVideoType('url')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            formVideoType === 'url' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        <Link size={13} />
                                        <span>Link URL</span>
                                    </button>
                                </div>
                            </div>

                            {formVideoType === 'file' ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Video File</label>
                                    <div 
                                        onClick={() => document.getElementById('adminFileInput')?.click()}
                                        className="border border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all"
                                    >
                                        <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <span className="text-xs font-bold text-gray-700">
                                            {formSelectedFileName ? 'Change Video File' : 'Select Video File (MP4/WebM)'}
                                        </span>
                                        <p className="text-[10px] text-gray-500 mt-1">Maximum size 30MB</p>
                                        {formSelectedFileName && (
                                            <span className="mt-2 inline-block text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md max-w-xs truncate">
                                                {formSelectedFileName}
                                            </span>
                                        )}
                                        <input
                                            id="adminFileInput"
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 30 * 1024 * 1024) {
                                                        toast.error('Video must be under 30MB');
                                                        return;
                                                    }
                                                    setFormSelectedFile(file);
                                                    setFormSelectedFileName(file.name);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Video link / Shorts URL</label>
                                    <input
                                        type="text"
                                        value={formVideoUrl}
                                        onChange={(e) => setFormVideoUrl(e.target.value)}
                                        placeholder="e.g. https://www.instagram.com/reel/Code/"
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 placeholder-gray-400 font-medium"
                                    />
                                </div>
                            )}

                            {/* Title & Address */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Property Title *</label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="e.g. Ambience Creacions"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Address / Locality *</label>
                                    <input
                                        type="text"
                                        value={formAddress}
                                        onChange={(e) => setFormAddress(e.target.value)}
                                        placeholder="e.g. Sector 22, Gurgaon"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                                        required
                                    />
                                </div>
                            </div>

                            {/* City & Budget target */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">City Area</label>
                                    <select
                                        value={formCity}
                                        onChange={(e) => setFormCity(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        {BENGALURU_AREAS.map(area => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Budget Range</label>
                                    <select
                                        value={formBudget}
                                        onChange={(e) => setFormBudget(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        {BUDGET_RANGES.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Status & Property Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        <option value="Ready to move">Ready to move</option>
                                        <option value="Under construction">Under construction</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Property Type</label>
                                    <select
                                        value={formType}
                                        onChange={(e) => setFormType(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        {PROPERTY_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Contact Number *</label>
                                <input
                                    type="text"
                                    value={formContact}
                                    onChange={(e) => setFormContact(e.target.value)}
                                    placeholder="e.g. 9999999999"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                                    required
                                />
                            </div>

                            {/* BHK prices configuration */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase block">BHK configuration & price (Onwards)</label>
                                <div className="space-y-2 border border-gray-100 bg-gray-50 p-4 rounded-xl">
                                    {BHK_OPTIONS.map((bhk) => {
                                        const isChecked = formBhkSelections[bhk] !== undefined;
                                        return (
                                            <div key={bhk} className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 text-xs font-bold min-w-[70px] cursor-pointer text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleBhkCheck(bhk)}
                                                        className="rounded border-gray-300 text-teal-600 focus:ring-0 w-4 h-4"
                                                    />
                                                    <span>{bhk}</span>
                                                </label>
                                                {isChecked && (
                                                    <input
                                                        type="text"
                                                        value={formBhkSelections[bhk]}
                                                        onChange={(e) => handleBhkPriceChange(bhk, e.target.value)}
                                                        placeholder="e.g. ₹3.2 Cr"
                                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-teal-500 font-semibold shadow-sm"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Caption */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Caption / Description</label>
                                <textarea
                                    value={formCaption}
                                    onChange={(e) => setFormCaption(e.target.value)}
                                    placeholder="Write details about the property..."
                                    rows={2}
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                />
                            </div>

                            {/* Footer Submit Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReel}
                                    className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-teal-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                                >
                                    {submittingReel ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <span>{editingReel ? 'Update Reel' : 'Publish Reel'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Play Reel Preview Modal */}
            {previewReel && (
                <div 
                    onClick={() => setPreviewReel(null)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-neutral-950 w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-between border border-neutral-800"
                    >
                        <button
                            onClick={() => setPreviewReel(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                        
                        {previewReel.videoType === 'file' ? (
                            <video 
                                src={previewReel.videoUrl} 
                                className="w-full h-full object-cover" 
                                controls 
                                autoPlay 
                                loop
                            />
                        ) : (() => {
                            const url = previewReel.videoUrl || '';
                            const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
                            const instaMatch = url.match(/(?:instagram\.com\/(?:p|reel|reels|tv)\/)([^/?#&\s]+)/i);

                            if (ytMatch) {
                                return (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`}
                                        className="w-full h-full object-cover"
                                        style={{ border: 0 }}
                                        title="Reel Preview"
                                        allow="autoplay; encrypted-media"
                                    />
                                );
                            } else if (instaMatch) {
                                return (
                                    <iframe
                                        src={`https://www.instagram.com/reel/${instaMatch[1]}/embed/`}
                                        className="w-full h-full object-cover"
                                        style={{ border: 0 }}
                                        title="Reel Preview"
                                        allow="autoplay; encrypted-media; picture-in-picture"
                                        allowFullScreen
                                        sandbox="allow-scripts allow-same-origin allow-presentation"
                                    />
                                );
                            } else {
                                return (
                                    <video
                                        src={previewReel.videoUrl}
                                        className="w-full h-full object-cover"
                                        controls
                                        autoPlay
                                        loop
                                    />
                                );
                            }
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
                {subtitle && <span className="text-xs text-gray-400 font-medium">{subtitle}</span>}
            </div>
        </div>
    </div>
);

export default AdminReelAnalysis;
