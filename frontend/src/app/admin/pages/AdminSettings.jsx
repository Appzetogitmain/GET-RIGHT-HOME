import React, { useEffect, useState } from 'react';
import {
    Settings, Shield, Bell, CreditCard, ToggleLeft,
    ToggleRight, Save, Globe, Lock, MapPin, Key, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAdminStore from '../store/adminStore';
import useManagerStore from '../../manager/store/managerStore';
import { useLocation } from 'react-router-dom';
import adminService from '../../../services/adminService';

const ToggleSwitch = ({ enabled, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${enabled ? 'bg-black' : 'bg-gray-300'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </button>
);

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-700">
                <Icon size={18} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">{title}</h3>
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const AdminSettings = () => {
    const location = useLocation();
    const isManager = location.pathname.startsWith('/manager');

    const admin = useAdminStore(state => state.admin);
    const adminCheckAuth = useAdminStore(state => state.checkAuth);

    const manager = useManagerStore(state => state.manager);
    const managerCheckAuth = useManagerStore(state => state.checkAuth);

    const currentUser = isManager ? manager : admin;
    const currentCheckAuth = isManager ? managerCheckAuth : adminCheckAuth;

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: ''
    });
    
    const [profileErrors, setProfileErrors] = useState({});

    const [platformOpen, setPlatformOpen] = useState(true);
    const [maintenance, setMaintenance] = useState(false);
    const [bookingMessage, setBookingMessage] = useState('');
    const [maintenanceTitle, setMaintenanceTitle] = useState('');
    const [maintenanceMessage, setMaintenanceMessage] = useState('');
    const [commission, setCommission] = useState(10);
    const [taxRate, setTaxRate] = useState(12);
    const [freeTrialListingLimit, setFreeTrialListingLimit] = useState(10);
    const [freeTrialDurationDays, setFreeTrialDurationDays] = useState(30);
    const [platformFlatFee, setPlatformFlatFee] = useState(20);
    const [cashCollectionFee, setCashCollectionFee] = useState(20);

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [savingPassword, setSavingPassword] = useState(false);

    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setProfile({
                name: currentUser.name || '',
                email: currentUser.email || '',
                phone: currentUser.phone || ''
            });
        }
    }, [currentUser]);

    useEffect(() => {
        if (isManager) return; // Skip platform settings for manager role
        const loadSettings = async () => {
            try {
                setLoadingSettings(true);
                const res = await adminService.getPlatformSettings();
                if (res.settings) {
                    setPlatformOpen(res.settings.platformOpen);
                    setMaintenance(res.settings.maintenanceMode);
                    setBookingMessage(res.settings.bookingDisabledMessage || '');
                    setMaintenanceTitle(res.settings.maintenanceTitle || '');
                    setMaintenanceMessage(res.settings.maintenanceMessage || '');
                    setCommission(res.settings.defaultCommission || 10);
                    setTaxRate(res.settings.taxRate || 12);
                    setFreeTrialListingLimit(res.settings.freeTrialListingLimit ?? 10);
                    setFreeTrialDurationDays(res.settings.freeTrialDurationDays ?? 30);
                    setPlatformFlatFee(res.settings.platformFlatFee ?? 20);
                    setCashCollectionFee(res.settings.cashCollectionFee ?? 20);
                }
            } catch (error) {
                toast.error('Failed to load platform settings');
            } finally {
                setLoadingSettings(false);
            }
        };
        loadSettings();
    }, [isManager]);

    const handleProfileChange = (field, value) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateProfile = () => {
        let errors = {};
        if (!profile.name || !profile.name.trim()) {
            errors.name = 'Name is required';
        } else if (!/^[a-zA-Z\s]+$/.test(profile.name)) {
            errors.name = 'Name must contain only alphabets';
        }

        if (!profile.email || !profile.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
            errors.email = 'Invalid email address';
        }

        if (!profile.phone || !profile.phone.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!/^[6-9]\d{9}$/.test(profile.phone)) {
            errors.phone = 'Mobile must be 10 digits starting with 6-9';
        }
        
        setProfileErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveProfile = async () => {
        if (!validateProfile()) return;
        
        try {
            setSavingProfile(true);
            if (isManager) {
                await adminService.updateProfile(profile);
                toast.success('Manager profile updated successfully');
            } else {
                await adminService.updateAdminProfile(profile);
                toast.success('Admin profile updated successfully');
            }
            if (currentCheckAuth) {
                await currentCheckAuth();
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to update profile';
            toast.error(message);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePlatformSettings = async () => {
        try {
            setSavingSettings(true);
            await adminService.updatePlatformSettings({
                platformOpen,
                maintenanceMode: maintenance,
                bookingDisabledMessage: bookingMessage,
                maintenanceTitle,
                maintenanceMessage,
                defaultCommission: Number(commission),
                taxRate: Number(taxRate),
                freeTrialListingLimit: Number(freeTrialListingLimit),
                freeTrialDurationDays: Number(freeTrialDurationDays),
                platformFlatFee: Number(platformFlatFee),
                cashCollectionFee: Number(cashCollectionFee)
            });
            toast.success('Platform settings updated successfully');
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to update platform settings';
            toast.error(message);
        } finally {
            setSavingSettings(false);
        }
    };

    const validatePassword = () => {
        let errors = {};
        if (!passwordData.oldPassword) errors.oldPassword = 'Current password is required';
        if (!passwordData.newPassword) errors.newPassword = 'New password is required';
        if (!passwordData.confirmPassword) errors.confirmPassword = 'Confirm password is required';

        if (passwordData.oldPassword && passwordData.newPassword && passwordData.oldPassword === passwordData.newPassword) {
            errors.newPassword = 'New password must be different from current password';
        }
        if (passwordData.newPassword && passwordData.newPassword.length < 6) {
            errors.newPassword = 'Password must be at least 6 characters long';
        }
        if (passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword) {
            errors.confirmPassword = 'New passwords do not match';
        }
        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSavePassword = async () => {
        if (!validatePassword()) return;

        try {
            setSavingPassword(true);
            await adminService.updateAdminPassword({
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password updated successfully');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to update password';
            toast.error(message);
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                    {isManager ? 'Manager Profile Settings' : 'Platform Settings'}
                </h2>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">
                    {isManager ? 'Manage your personal profile and view your system access scoping.' : 'Configure global rules, commission rates, and system preferences.'}
                </p>
            </div>

            {/* Manager Scoping & Identity Info (Only for Manager Role) */}
            {isManager && currentUser && (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-teal-100 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                            <Shield size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-teal-900 uppercase tracking-tight">Access & Scope Identity</h3>
                            <p className="text-[9px] text-teal-700 font-bold uppercase tracking-tight">Detailed summary of your system roles and permissions.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-teal-600 shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold text-teal-700 uppercase tracking-tight">Branch Scope</p>
                                <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                                    {currentUser.branch ? currentUser.branch : 'Global (All Branches)'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Key size={16} className="text-teal-600 shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold text-teal-700 uppercase tracking-tight">Assigned System Role</p>
                                <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                                    {currentUser.role ? currentUser.role : 'Manager'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <p className="text-[9px] font-bold text-teal-700 uppercase tracking-tight mb-2">Assigned Permissions Matrix</p>
                        <div className="flex flex-wrap gap-2">
                            {currentUser.permissions && currentUser.permissions.length > 0 ? (
                                currentUser.permissions.map((perm, idx) => (
                                    <div key={idx} className="bg-white border border-teal-100 rounded-lg p-2 flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold text-teal-900 uppercase tracking-tight">{perm.module}</span>
                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tight">
                                            {perm.actions.join(', ')}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight italic">No modular permissions assigned yet.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Section title={isManager ? "Profile Information" : "Admin Profile"} icon={Settings}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Full Name</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => handleProfileChange('name', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-xl text-xs font-bold uppercase focus:border-black outline-none transition-colors ${profileErrors.name ? 'border-red-500' : 'border-gray-200'}`}
                            placeholder="Full Name"
                        />
                        {profileErrors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => handleProfileChange('email', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-xl text-xs font-bold focus:border-black outline-none transition-colors ${profileErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                            placeholder="email@example.com"
                        />
                        {profileErrors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Phone</label>
                        <div className="flex">
                            <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-500 text-xs font-bold">
                                +91
                            </span>
                            <input
                                type="tel"
                                maxLength="10"
                                value={profile.phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    handleProfileChange('phone', val);
                                }}
                                className={`w-full px-4 py-2 border rounded-r-xl text-xs font-bold focus:border-black outline-none transition-colors ${profileErrors.phone ? 'border-red-500' : 'border-gray-200'}`}
                                placeholder="Phone Number"
                            />
                        </div>
                        {profileErrors.phone && <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.phone}</p>}
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] font-bold uppercase rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60 transition-all"
                    >
                        <Save size={14} />
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </Section>

            {/* Password Update Section */}
            <Section title="Update Password" icon={Lock}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Current Password</label>
                        <div className="relative">
                            <input
                                type={showOldPassword ? "text" : "password"}
                                value={passwordData.oldPassword}
                                onChange={(e) => {
                                    setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }));
                                    setPasswordErrors(prev => ({ ...prev, oldPassword: null }));
                                }}
                                className={`w-full px-4 py-2 border rounded-xl text-xs font-bold pr-10 focus:border-black outline-none transition-colors ${passwordErrors.oldPassword ? 'border-red-500' : 'border-gray-200'}`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                            >
                                {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {passwordErrors.oldPassword && <p className="text-red-500 text-[10px] mt-1 font-bold">{passwordErrors.oldPassword}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">New Password</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) => {
                                    setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                                    setPasswordErrors(prev => ({ ...prev, newPassword: null }));
                                }}
                                className={`w-full px-4 py-2 border rounded-xl text-xs font-bold pr-10 focus:border-black outline-none transition-colors ${passwordErrors.newPassword ? 'border-red-500' : 'border-gray-200'}`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {passwordErrors.newPassword && <p className="text-red-500 text-[10px] mt-1 font-bold">{passwordErrors.newPassword}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordData.confirmPassword}
                                onChange={(e) => {
                                    setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                                    setPasswordErrors(prev => ({ ...prev, confirmPassword: null }));
                                }}
                                className={`w-full px-4 py-2 border rounded-xl text-xs font-bold pr-10 focus:border-black outline-none transition-colors ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'}`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {passwordErrors.confirmPassword && <p className="text-red-500 text-[10px] mt-1 font-bold">{passwordErrors.confirmPassword}</p>}
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSavePassword}
                        disabled={savingPassword || !passwordData.oldPassword || !passwordData.newPassword}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] font-bold uppercase rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60 transition-all"
                    >
                        <Key size={14} />
                        {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </Section>

            {/* Render General Configurations (Only for Admin Role) */}
            {!isManager && (
                <>
                    <Section title="General Configuration" icon={Globe}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-900 text-sm uppercase tracking-tight">Platform Status</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Enable or disable booking capability globally.</p>
                            </div>
                            <ToggleSwitch enabled={platformOpen} onChange={setPlatformOpen} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-900 text-sm uppercase tracking-tight">Maintenance Mode</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Show maintenance screen to all users.</p>
                            </div>
                            <ToggleSwitch enabled={maintenance} onChange={setMaintenance} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 pt-2">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">User message when booking is disabled</label>
                                <input
                                    type="text"
                                    value={bookingMessage}
                                    onChange={(e) => setBookingMessage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-colors"
                                    placeholder="Bookings are temporarily disabled. Please try again later."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Maintenance title</label>
                                <input
                                    type="text"
                                    value={maintenanceTitle}
                                    onChange={(e) => setMaintenanceTitle(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold uppercase focus:border-black outline-none transition-colors"
                                    placeholder="We will be back soon."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Maintenance description</label>
                                <textarea
                                    rows={3}
                                    value={maintenanceMessage}
                                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold uppercase focus:border-black outline-none transition-colors resize-none"
                                    placeholder="The platform is under scheduled maintenance. Please check back in some time."
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="pb-4 font-bold text-md flex items-center gap-2 border-b border-gray-100 uppercase tracking-tight mb-4">
                                <Globe size={16} /> Financial Rule
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Default Commission (%)</label>
                                    <input
                                        type="number"
                                        value={commission}
                                        onChange={(e) => setCommission(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">GST / Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Platform Flat Commission (₹)</label>
                                    <input
                                        type="number"
                                        value={platformFlatFee}
                                        onChange={(e) => setPlatformFlatFee(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Cash Extra Fee (₹)</label>
                                    <input
                                        type="number"
                                        value={cashCollectionFee}
                                        onChange={(e) => setCashCollectionFee(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="pb-4 pt-6 font-bold text-md flex items-center gap-2 border-b border-gray-100 mt-6 uppercase tracking-tight mb-4">
                                <CreditCard size={16} /> Free Trial Settings
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Trial Property Listing Limit</label>
                                    <input
                                        type="number"
                                        value={freeTrialListingLimit}
                                        onChange={(e) => setFreeTrialListingLimit(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-colors"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Trial Duration (Days)</label>
                                    <input
                                        type="number"
                                        value={freeTrialDurationDays}
                                        onChange={(e) => setFreeTrialDurationDays(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-colors"
                                        min="1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={handleSavePlatformSettings}
                                disabled={savingSettings || loadingSettings}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] font-bold uppercase rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60 transition-all"
                            >
                                <Save size={14} />
                                {savingSettings || loadingSettings ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </Section>
                </>
            )}
        </div>
    );
};

export default AdminSettings;
