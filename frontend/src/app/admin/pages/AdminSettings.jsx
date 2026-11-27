import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import useAdminStore from '../store/adminStore';
import useManagerStore from '../../manager/store/managerStore';
import { useLocation } from 'react-router-dom';
import adminService from '../../../services/adminService';

/* One easing curve and one short duration for every state change on this screen */
const EASE = 'duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]';

const ToggleSwitch = ({ enabled, onChange, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors ${EASE} focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${enabled ? 'bg-neutral-900' : 'bg-neutral-300'}`}
    >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform ${EASE} ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
);

const Section = ({ title, description, action, footer, children }) => (
    <section className="rounded-2xl border border-neutral-900/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <header className="flex items-start justify-between gap-6 px-6 pt-6">
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium leading-6 text-neutral-900">{title}</h3>
                {description && <p className="text-[13px] leading-5 text-neutral-500">{description}</p>}
            </div>
            {action}
        </header>
        <div className="p-6">{children}</div>
        {footer && (
            <footer className="flex items-center justify-end gap-4 border-t border-neutral-900/[0.06] px-6 py-4">
                {footer}
            </footer>
        )}
    </section>
);

const Field = ({ label, htmlFor, hint, error, children }) => (
    <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium leading-5 text-neutral-900">{label}</label>
        {children}
        {error
            ? <p className="text-xs leading-4 text-red-600">{error}</p>
            : hint && <p className="text-xs leading-4 text-neutral-500">{hint}</p>}
    </div>
);

const boxClass = (error) => `flex h-10 w-full items-center rounded-lg border bg-white transition-[border-color,box-shadow] ${EASE} focus-within:ring-[3px] ${error
    ? 'border-red-500 focus-within:ring-red-500/15'
    : 'border-neutral-200 hover:border-neutral-300 focus-within:border-neutral-900 focus-within:ring-neutral-900/10'}`;

/* Signature: units live inside the field as quiet mono affixes, so the fee rows read like a schedule */
const TextInput = ({ id, prefix, suffix, trailing, error, ...props }) => (
    <div className={boxClass(error)}>
        {prefix && <span className="select-none pl-3 font-mono text-[13px] text-neutral-500">{prefix}</span>}
        <input
            id={id}
            aria-invalid={!!error}
            className={`h-full min-w-0 flex-1 bg-transparent text-sm text-neutral-900 tabular-nums outline-none placeholder:text-neutral-400 ${prefix ? 'pl-2' : 'pl-3'} ${suffix || trailing ? 'pr-2' : 'pr-3'}`}
            {...props}
        />
        {suffix && <span className="select-none pr-3 font-mono text-[13px] text-neutral-500">{suffix}</span>}
        {trailing}
    </div>
);

const TextArea = ({ id, ...props }) => (
    <textarea
        id={id}
        className={`w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm leading-5 text-neutral-900 outline-none transition-[border-color,box-shadow] ${EASE} placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-900 focus:ring-[3px] focus:ring-neutral-900/10`}
        {...props}
    />
);

const PasswordInput = ({ id, visible, onToggle, ...props }) => (
    <TextInput
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        trailing={(
            <button
                type="button"
                onClick={onToggle}
                aria-label={visible ? 'Hide password' : 'Show password'}
                className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 outline-none transition-colors ${EASE} hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900`}
            >
                {visible ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
            </button>
        )}
        {...props}
    />
);

const OptionRow = ({ name, checked, onChange, label, help }) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${EASE} ${checked ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
        <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 shrink-0 accent-neutral-900" />
        <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-5 text-neutral-900">{label}</span>
            {help && <span className="text-[13px] leading-5 text-neutral-500">{help}</span>}
        </span>
    </label>
);

const Group = ({ label, children }) => (
    <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-medium leading-5 text-neutral-900">{label}</legend>
        {children}
    </fieldset>
);

const PrimaryButton = ({ children, ...props }) => (
    <button
        type="button"
        className={`inline-flex h-9 items-center justify-center rounded-lg bg-neutral-900 px-4 text-[13px] font-medium text-white outline-none transition-[background-color,transform] ${EASE} hover:bg-neutral-800 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`}
        {...props}
    >
        {children}
    </button>
);

/* ---------- Rule preview: the one rich moment, drawn from the values on this page ---------- */

const MAX_SEGMENTS = 24;

const Lane = ({ label, state, amount, unit }) => {
    // state: 'counted' | 'unlimited' | 'none'
    let track;
    if (state === 'counted' && amount > 0 && unit === 'properties' && amount <= MAX_SEGMENTS) {
        track = (
            <div className="flex h-2 gap-1">
                {Array.from({ length: amount }, (_, i) => (
                    <span key={i} className="h-full flex-1 rounded-[2px] bg-orange-600" />
                ))}
            </div>
        );
    } else if (state === 'counted' && amount > 0) {
        const weeks = unit === 'days' && amount <= 180 ? Math.floor((amount - 1) / 7) : 0;
        track = (
            <div className="relative h-2 overflow-hidden rounded-full bg-orange-600">
                {Array.from({ length: weeks }, (_, i) => (
                    <span key={i} className="absolute inset-y-0 w-px bg-white/70" style={{ left: `${((i + 1) * 7 / amount) * 100}%` }} />
                ))}
            </div>
        );
    } else if (state === 'unlimited') {
        track = <div className="h-0 border-t-2 border-dashed border-neutral-300" />;
    } else {
        track = <div className="h-2 rounded-full bg-neutral-200" />;
    }

    const value = state === 'unlimited'
        ? 'No limit'
        : `${state === 'counted' ? amount : 0} ${unit}`;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[72px_minmax(0,1fr)_104px]">
            <span className="order-1 text-[13px] text-neutral-600">{label}</span>
            <div className="order-3 col-span-2 sm:order-2 sm:col-span-1">{track}</div>
            <span className="order-2 text-right font-mono text-[13px] tabular-nums text-neutral-900 sm:order-3">{value}</span>
        </div>
    );
};

const RulePreview = ({ freeAccess, usesTime, usesListings, summary }) => {
    const off = !freeAccess.enabled || freeAccess.mode === 'none';
    const lifetime = !off && freeAccess.mode === 'lifetime';
    const listings = Math.max(0, Number(freeAccess.listingLimit) || 0);
    const days = Math.max(0, Number(freeAccess.durationDays) || 0);

    const laneState = (uses) => {
        if (off) return 'none';
        if (lifetime) return 'unlimited';
        return uses ? 'counted' : 'unlimited';
    };

    const selectedRoles = FREE_ACCESS_ROLE_OPTIONS
        .filter((r) => freeAccess.roles.includes(r.value))
        .map((r) => `${r.label.toLowerCase()}s`);
    const rolesText = selectedRoles.length
        ? `Applies to ${new Intl.ListFormat('en', { type: 'conjunction' }).format(selectedRoles)}`
        : 'No roles selected';

    let endLabel = 'Then subscription';
    if (off) endLabel = 'Subscription from signup';
    else if (lifetime) endLabel = 'No paywall';
    else if (usesTime && usesListings) endLabel = 'Paywall at whichever ends first';

    return (
        <div className="flex flex-col gap-5 rounded-xl border border-neutral-900/[0.06] bg-neutral-50 p-5">
            <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[13px] font-medium text-neutral-600">Rule preview</p>
                    <p className="text-xs text-neutral-500">{rolesText}</p>
                </div>
                <p className="text-[15px] leading-6 text-neutral-900">{summary}</p>
            </div>
            <div className="flex flex-col gap-3">
                <Lane label="Properties" state={laneState(usesListings)} amount={listings} unit="properties" />
                <Lane label="Days" state={laneState(usesTime)} amount={days} unit="days" />
            </div>
            <div className="flex items-center justify-between gap-4 font-mono text-xs text-neutral-500 sm:ml-[88px] sm:mr-[120px]">
                <span>Signup</span>
                <span className="flex items-center gap-1.5 text-right">
                    {!lifetime && <Lock size={12} strokeWidth={1.5} className="shrink-0" />}
                    {endLabel}
                </span>
            </div>
        </div>
    );
};

const FREE_ACCESS_MODE_OPTIONS = [
    { value: 'none', label: 'No free access', help: 'A subscription is required from the start' },
    { value: 'time', label: 'Free for a limited time', help: 'Free for a set number of days after signup, then a subscription is needed' },
    { value: 'listings', label: 'Free for a limited number of properties', help: 'The first N properties are free, with no time limit' },
    { value: 'time_and_listings', label: 'Limited time and properties, whichever ends first', help: 'Free for N days and up to M properties, the first limit reached ends it' },
    { value: 'lifetime', label: 'Free forever', help: 'No limit and no paywall, builders always list free' }
];
const FREE_ACCESS_ROLE_OPTIONS = [
    { value: 'builder', label: 'Builder' },
    { value: 'partner', label: 'Partner' },
    { value: 'broker', label: 'Broker' },
    { value: 'owner', label: 'Owner' }
];
const EXISTING_USER_OPTIONS = [
    { value: true, label: 'Apply to everyone', help: 'Existing builders get the new rule immediately' },
    { value: false, label: 'Keep the old rule for existing builders', help: 'Builders who signed up earlier keep the previous rule, only new signups get this one' }
];

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
    const [platformErrors, setPlatformErrors] = useState({});

    const [platformOpen, setPlatformOpen] = useState(true);
    const [maintenance, setMaintenance] = useState(false);
    const [bookingMessage, setBookingMessage] = useState('');
    const [maintenanceTitle, setMaintenanceTitle] = useState('');
    const [maintenanceMessage, setMaintenanceMessage] = useState('');
    const [commission, setCommission] = useState(10);
    const [taxRate, setTaxRate] = useState(12);
    const [freeAccess, setFreeAccess] = useState({
        enabled: true,
        mode: 'time_and_listings',
        durationDays: 30,
        listingLimit: 10,
        roles: FREE_ACCESS_ROLE_OPTIONS.map((r) => r.value),
        applyToExisting: true,
        paywallTitle: '',
        paywallMessage: ''
    });
    const updateFreeAccess = (patch) => setFreeAccess((prev) => ({ ...prev, ...patch }));
    const toggleFreeAccessRole = (role) => setFreeAccess((prev) => ({
        ...prev,
        roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role]
    }));
    const freeAccessUsesTime = freeAccess.mode === 'time' || freeAccess.mode === 'time_and_listings';
    const freeAccessUsesListings = freeAccess.mode === 'listings' || freeAccess.mode === 'time_and_listings';
    const freeAccessSummary = (() => {
        if (!freeAccess.enabled || freeAccess.mode === 'none') return 'Builders must subscribe before they can list a property';
        if (freeAccess.mode === 'lifetime') return 'Builders can list unlimited properties, free forever';
        if (freeAccess.mode === 'time') return `Builders can list free for ${freeAccess.durationDays || 0} days after signing up`;
        if (freeAccess.mode === 'listings') return `Builders can list their first ${freeAccess.listingLimit || 0} properties free, with no time limit`;
        return `Builders can list up to ${freeAccess.listingLimit || 0} properties free within ${freeAccess.durationDays || 0} days of signing up, whichever ends first`;
    })();
    const [platformFlatFee, setPlatformFlatFee] = useState(20);
    const [cashCollectionFee, setCashCollectionFee] = useState(20);

    const [supportEmail, setSupportEmail] = useState('getrighthome7@gmail.com');
    const [supportPhone, setSupportPhone] = useState('6304471791');
    const [supportWhatsapp, setSupportWhatsapp] = useState('6304471791');

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
                    setFreeAccess({
                        enabled: res.settings.freeAccessEnabled !== false,
                        mode: res.settings.freeAccessMode || 'time_and_listings',
                        durationDays: res.settings.freeAccessDurationDays ?? res.settings.freeTrialDurationDays ?? 30,
                        listingLimit: res.settings.freeAccessListingLimit ?? res.settings.freeTrialListingLimit ?? 10,
                        roles: Array.isArray(res.settings.freeAccessRoles) ? res.settings.freeAccessRoles : FREE_ACCESS_ROLE_OPTIONS.map((r) => r.value),
                        applyToExisting: res.settings.freeAccessApplyToExisting !== false,
                        paywallTitle: res.settings.freeAccessPaywallTitle || '',
                        paywallMessage: res.settings.freeAccessPaywallMessage || ''
                    });
                    setPlatformFlatFee(res.settings.platformFlatFee ?? 20);
                    setCashCollectionFee(res.settings.cashCollectionFee ?? 20);
                    setSupportEmail(res.settings.supportEmail || 'getrighthome7@gmail.com');
                    setSupportPhone(res.settings.supportPhone?.replace(/\D/g, '').slice(-10) || '6304471791');
                    setSupportWhatsapp(res.settings.supportWhatsapp?.replace(/\D/g, '').slice(-10) || '6304471791');
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
        let errors = {};
        if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
            errors.supportEmail = 'Valid email is required';
        }
        if (!supportPhone || !/^[6-9]\d{9}$/.test(supportPhone)) {
            errors.supportPhone = 'Mobile must be 10 digits starting with 6-9';
        }
        if (!supportWhatsapp || !/^[6-9]\d{9}$/.test(supportWhatsapp)) {
            errors.supportWhatsapp = 'WhatsApp must be 10 digits starting with 6-9';
        }

        if (Object.keys(errors).length > 0) {
            setPlatformErrors(errors);
            toast.error('Please fix validation errors');
            return;
        }
        setPlatformErrors({});

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
                freeAccessEnabled: freeAccess.enabled,
                freeAccessMode: freeAccess.mode,
                freeAccessDurationDays: Number(freeAccess.durationDays) || 0,
                freeAccessListingLimit: Number(freeAccess.listingLimit) || 0,
                freeAccessRoles: freeAccess.roles,
                freeAccessApplyToExisting: freeAccess.applyToExisting,
                freeAccessPaywallTitle: freeAccess.paywallTitle,
                freeAccessPaywallMessage: freeAccess.paywallMessage,
                platformFlatFee: Number(platformFlatFee),
                cashCollectionFee: Number(cashCollectionFee),
                supportEmail,
                supportPhone: `+91${supportPhone}`,
                supportWhatsapp: `+91${supportWhatsapp}`
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

    const updatePasswordField = (field, value) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
        setPasswordErrors(prev => ({ ...prev, [field]: null }));
    };

    const permissions = currentUser?.permissions || [];

    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-16">
            <div className="mb-2 flex flex-col gap-1">
                <h2 className="text-[28px] font-medium leading-9 text-neutral-900">
                    {isManager ? 'Profile settings' : 'Platform settings'}
                </h2>
                <p className="text-sm leading-5 text-neutral-500">
                    {isManager
                        ? 'Your profile, password and access scope'
                        : 'Booking status, fees, support contacts and builder free access'}
                </p>
            </div>

            {/* Manager scope (manager role only) */}
            {isManager && currentUser && (
                <Section title="Access and scope" description="Your branch, role and permissions">
                    <div className="flex flex-col gap-6">
                        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-1">
                                <dt className="text-[13px] text-neutral-500">Branch</dt>
                                <dd className="text-sm font-medium text-neutral-900">{currentUser.branch || 'All branches'}</dd>
                            </div>
                            <div className="flex flex-col gap-1">
                                <dt className="text-[13px] text-neutral-500">Role</dt>
                                <dd className="text-sm font-medium capitalize text-neutral-900">{currentUser.role || 'Manager'}</dd>
                            </div>
                        </dl>
                        <div className="flex flex-col gap-2">
                            <p className="text-[13px] font-medium text-neutral-900">Permissions</p>
                            {permissions.length > 0 ? (
                                <ul className="divide-y divide-neutral-900/[0.06] rounded-lg border border-neutral-900/[0.08]">
                                    {permissions.map((perm, idx) => (
                                        <li key={idx} className="flex items-center justify-between gap-4 px-4 py-3">
                                            <span className="text-sm capitalize text-neutral-900">{perm.module}</span>
                                            <span className="text-right font-mono text-xs text-neutral-500">{perm.actions.join(', ')}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[13px] text-neutral-500">No permissions assigned yet</p>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            <Section
                title={isManager ? 'Profile' : 'Admin profile'}
                description="Name, email and phone for this account"
                footer={(
                    <PrimaryButton onClick={handleSaveProfile} disabled={savingProfile}>
                        {savingProfile ? 'Saving…' : 'Save profile'}
                    </PrimaryButton>
                )}
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="Full name" htmlFor="profile-name" error={profileErrors.name}>
                        <TextInput
                            id="profile-name"
                            type="text"
                            autoComplete="name"
                            value={profile.name}
                            onChange={(e) => handleProfileChange('name', e.target.value)}
                            error={profileErrors.name}
                        />
                    </Field>
                    <Field label="Email" htmlFor="profile-email" error={profileErrors.email}>
                        <TextInput
                            id="profile-email"
                            type="email"
                            autoComplete="email"
                            value={profile.email}
                            onChange={(e) => handleProfileChange('email', e.target.value)}
                            placeholder="name@example.com"
                            error={profileErrors.email}
                        />
                    </Field>
                    <Field label="Phone" htmlFor="profile-phone" error={profileErrors.phone}>
                        <TextInput
                            id="profile-phone"
                            type="tel"
                            inputMode="numeric"
                            maxLength="10"
                            prefix="+91"
                            value={profile.phone}
                            onChange={(e) => handleProfileChange('phone', e.target.value.replace(/\D/g, ''))}
                            placeholder="9876543210"
                            error={profileErrors.phone}
                        />
                    </Field>
                </div>
            </Section>

            <Section
                title="Password"
                description="At least 6 characters, different from the current one"
                footer={(
                    <PrimaryButton
                        onClick={handleSavePassword}
                        disabled={savingPassword || !passwordData.oldPassword || !passwordData.newPassword}
                    >
                        {savingPassword ? 'Updating…' : 'Update password'}
                    </PrimaryButton>
                )}
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="Current password" htmlFor="pw-current" error={passwordErrors.oldPassword}>
                        <PasswordInput
                            id="pw-current"
                            visible={showOldPassword}
                            onToggle={() => setShowOldPassword(!showOldPassword)}
                            value={passwordData.oldPassword}
                            onChange={(e) => updatePasswordField('oldPassword', e.target.value)}
                            error={passwordErrors.oldPassword}
                        />
                    </Field>
                    <Field label="New password" htmlFor="pw-new" error={passwordErrors.newPassword}>
                        <PasswordInput
                            id="pw-new"
                            visible={showNewPassword}
                            onToggle={() => setShowNewPassword(!showNewPassword)}
                            value={passwordData.newPassword}
                            onChange={(e) => updatePasswordField('newPassword', e.target.value)}
                            error={passwordErrors.newPassword}
                        />
                    </Field>
                    <Field label="Confirm new password" htmlFor="pw-confirm" error={passwordErrors.confirmPassword}>
                        <PasswordInput
                            id="pw-confirm"
                            visible={showConfirmPassword}
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                            value={passwordData.confirmPassword}
                            onChange={(e) => updatePasswordField('confirmPassword', e.target.value)}
                            error={passwordErrors.confirmPassword}
                        />
                    </Field>
                </div>
            </Section>

            {/* Platform configuration (admin role only) */}
            {!isManager && (
                <>
                    <Section title="Platform status" description="Bookings and maintenance for the whole platform">
                        <div className="flex flex-col divide-y divide-neutral-900/[0.06]">
                            <div className="flex flex-col gap-4 pb-6">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-sm font-medium leading-5 text-neutral-900">Bookings open</p>
                                        <p className="text-[13px] leading-5 text-neutral-500">Turn booking on or off for every user</p>
                                    </div>
                                    <ToggleSwitch enabled={platformOpen} onChange={setPlatformOpen} label="Bookings open" />
                                </div>
                                <Field label="Message when bookings are off" htmlFor="booking-message">
                                    <TextInput
                                        id="booking-message"
                                        type="text"
                                        value={bookingMessage}
                                        onChange={(e) => setBookingMessage(e.target.value)}
                                        placeholder="Bookings are temporarily disabled. Please try again later."
                                    />
                                </Field>
                            </div>
                            <div className="flex flex-col gap-4 pt-6">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-sm font-medium leading-5 text-neutral-900">Maintenance mode</p>
                                        <p className="text-[13px] leading-5 text-neutral-500">Show the maintenance screen to every user</p>
                                    </div>
                                    <ToggleSwitch enabled={maintenance} onChange={setMaintenance} label="Maintenance mode" />
                                </div>
                                <Field label="Maintenance title" htmlFor="maintenance-title">
                                    <TextInput
                                        id="maintenance-title"
                                        type="text"
                                        value={maintenanceTitle}
                                        onChange={(e) => setMaintenanceTitle(e.target.value)}
                                        placeholder="We will be back soon"
                                    />
                                </Field>
                                <Field label="Maintenance description" htmlFor="maintenance-message">
                                    <TextArea
                                        id="maintenance-message"
                                        rows={3}
                                        value={maintenanceMessage}
                                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                                        placeholder="The platform is under scheduled maintenance. Please check back in some time."
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Fees and tax" description="Defaults for commission, GST and flat fees">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Default commission" htmlFor="fee-commission">
                                <TextInput id="fee-commission" type="number" inputMode="decimal" suffix="%" value={commission} onChange={(e) => setCommission(e.target.value)} />
                            </Field>
                            <Field label="GST / tax rate" htmlFor="fee-tax">
                                <TextInput id="fee-tax" type="number" inputMode="decimal" suffix="%" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                            </Field>
                            <Field label="Flat platform commission" htmlFor="fee-flat">
                                <TextInput id="fee-flat" type="number" inputMode="decimal" prefix="₹" value={platformFlatFee} onChange={(e) => setPlatformFlatFee(e.target.value)} />
                            </Field>
                            <Field label="Extra fee for cash payments" htmlFor="fee-cash">
                                <TextInput id="fee-cash" type="number" inputMode="decimal" prefix="₹" value={cashCollectionFee} onChange={(e) => setCashCollectionFee(e.target.value)} />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Support contact" description="Email, phone and WhatsApp for customer support">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field label="Email" htmlFor="support-email" error={platformErrors.supportEmail}>
                                <TextInput
                                    id="support-email"
                                    type="email"
                                    value={supportEmail}
                                    onChange={(e) => setSupportEmail(e.target.value)}
                                    placeholder="support@example.com"
                                    error={platformErrors.supportEmail}
                                />
                            </Field>
                            <Field label="Phone" htmlFor="support-phone" error={platformErrors.supportPhone}>
                                <TextInput
                                    id="support-phone"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength="10"
                                    prefix="+91"
                                    value={supportPhone}
                                    onChange={(e) => setSupportPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="9876543210"
                                    error={platformErrors.supportPhone}
                                />
                            </Field>
                            <Field label="WhatsApp" htmlFor="support-whatsapp" error={platformErrors.supportWhatsapp}>
                                <TextInput
                                    id="support-whatsapp"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength="10"
                                    prefix="+91"
                                    value={supportWhatsapp}
                                    onChange={(e) => setSupportWhatsapp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="9876543210"
                                    error={platformErrors.supportWhatsapp}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section
                        title="Builder free access"
                        description="How long builders can list before a subscription is needed"
                        action={(
                            <ToggleSwitch
                                enabled={freeAccess.enabled}
                                onChange={(enabled) => updateFreeAccess({ enabled })}
                                label="Enable free access"
                            />
                        )}
                    >
                        <div className="flex flex-col gap-6">
                            <RulePreview
                                freeAccess={freeAccess}
                                usesTime={freeAccessUsesTime}
                                usesListings={freeAccessUsesListings}
                                summary={freeAccessSummary}
                            />

                            <div
                                aria-disabled={!freeAccess.enabled}
                                className={`flex flex-col gap-6 transition-opacity ${EASE} ${freeAccess.enabled ? '' : 'pointer-events-none opacity-50'}`}
                            >
                                <Group label="How long listing is free">
                                    {FREE_ACCESS_MODE_OPTIONS.map((opt) => (
                                        <OptionRow
                                            key={opt.value}
                                            name="freeAccessMode"
                                            checked={freeAccess.mode === opt.value}
                                            onChange={() => updateFreeAccess({ mode: opt.value })}
                                            label={opt.label}
                                            help={opt.help}
                                        />
                                    ))}
                                </Group>

                                {(freeAccessUsesTime || freeAccessUsesListings) && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {freeAccessUsesListings && (
                                            <Field label="Free properties allowed" htmlFor="fa-listings" hint="0 means no free properties">
                                                <TextInput
                                                    id="fa-listings"
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    suffix="properties"
                                                    value={freeAccess.listingLimit}
                                                    onChange={(e) => updateFreeAccess({ listingLimit: e.target.value })}
                                                />
                                            </Field>
                                        )}
                                        {freeAccessUsesTime && (
                                            <Field label="Free period" htmlFor="fa-days" hint="Counted from the builder's signup date">
                                                <TextInput
                                                    id="fa-days"
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    suffix="days"
                                                    value={freeAccess.durationDays}
                                                    onChange={(e) => updateFreeAccess({ durationDays: e.target.value })}
                                                />
                                            </Field>
                                        )}
                                    </div>
                                )}

                                <Group label="Applies to">
                                    <div className="flex flex-wrap gap-2">
                                        {FREE_ACCESS_ROLE_OPTIONS.map((r) => {
                                            const checked = freeAccess.roles.includes(r.value);
                                            return (
                                                <label
                                                    key={r.value}
                                                    className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors ${EASE} ${checked ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleFreeAccessRole(r.value)}
                                                        className="h-4 w-4 accent-neutral-900"
                                                    />
                                                    {r.label}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </Group>

                                <Group label="When this rule changes">
                                    {EXISTING_USER_OPTIONS.map((opt) => (
                                        <OptionRow
                                            key={String(opt.value)}
                                            name="freeAccessApplyToExisting"
                                            checked={freeAccess.applyToExisting === opt.value}
                                            onChange={() => updateFreeAccess({ applyToExisting: opt.value })}
                                            label={opt.label}
                                            help={opt.help}
                                        />
                                    ))}
                                </Group>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[13px] font-medium leading-5 text-neutral-900">Paywall popup</p>
                                        <p className="text-xs leading-4 text-neutral-500">Optional, leave blank to use the default text</p>
                                    </div>
                                    <Field label="Title" htmlFor="fa-paywall-title">
                                        <TextInput
                                            id="fa-paywall-title"
                                            type="text"
                                            maxLength={120}
                                            value={freeAccess.paywallTitle}
                                            onChange={(e) => updateFreeAccess({ paywallTitle: e.target.value })}
                                        />
                                    </Field>
                                    <Field label="Message" htmlFor="fa-paywall-message">
                                        <TextArea
                                            id="fa-paywall-message"
                                            rows={2}
                                            maxLength={500}
                                            value={freeAccess.paywallMessage}
                                            onChange={(e) => updateFreeAccess({ paywallMessage: e.target.value })}
                                        />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                        <p className="text-[13px] text-neutral-500">Saves platform status, fees, support contact and free access</p>
                        <PrimaryButton onClick={handleSavePlatformSettings} disabled={savingSettings || loadingSettings}>
                            {loadingSettings ? 'Loading…' : savingSettings ? 'Saving…' : 'Save platform settings'}
                        </PrimaryButton>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminSettings;
