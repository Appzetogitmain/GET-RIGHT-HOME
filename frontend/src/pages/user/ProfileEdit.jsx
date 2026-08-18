import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, ArrowLeft, Loader2, Navigation, Home, Camera, Building2, ChevronRight, LogOut, CheckCircle2, XCircle, Clock, FileText, Search, Video, Briefcase, MapPin, ShieldCheck, IdCard, Image } from 'lucide-react';
import { authService } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { isFlutterApp, openFlutterCamera, uploadBase64Image } from '../../utils/flutterBridge';

// Comprehensive India state & major cities dictionary
const stateCitiesData = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada", "Kadapa", "Anantapur"],
  "Arunachal Pradesh": ["Itanagar", "Tawang", "Bhismaknagar", "Ziro"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Arrah", "Begusarai"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Jagdalpur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar"],
  "Haryana": ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Bilaspur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh"],
  "Karnataka": ["Bengaluru", "Hubli-Dharwad", "Mysore", "Gulbarga", "Belgaum", "Mangalore", "Davanagere", "Bellary", "Shimoga"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Alappuzha", "Palakkad"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Pimpri-Chinchwad", "Nashik", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Navi Mumbai", "Solapur"],
  "Manipur": ["Imphal", "Bishnupur", "Thoubal"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Sikar"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Thoothukudi"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Noida"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Maheshtala", "Rajpur Sonarpur"],
  "Delhi": ["New Delhi", "Delhi Cantonment", "Dwarka", "Rohini"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Ladakh": ["Leh", "Kargil"],
  "Puducherry": ["Pondicherry", "Karaikal", "Mahe", "Yanam"],
  "Chandigarh": ["Chandigarh"],
  "Andaman & Nicobar Islands": ["Port Blair"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Lakshadweep": ["Kavaratti"]
};

const ROLE_BADGES = {
  owner: { label: 'Property Owner', className: 'bg-teal-50 text-teal-700 border-teal-200', icon: Home },
  broker: { label: 'Broker / Agent', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Briefcase },
  builder: { label: 'Builder Partner', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Building2 },
  user: { label: 'User', className: 'bg-gray-50 text-gray-600 border-gray-200', icon: User }
};

const RoleBadge = ({ role }) => {
  const config = ROLE_BADGES[role] || ROLE_BADGES.user;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide py-1.5 px-3 rounded-full border ${config.className}`}>
      <Icon size={12} strokeWidth={2.5} />
      {config.label}
    </span>
  );
};

// Shared field styling — consistent bordered inputs instead of the old mix
// of underline fields, used throughout every section below.
const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const labelCls = "text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block";

const Field = ({ label, error, children }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs font-semibold mt-1.5">{error}</p>}
  </div>
);

const SectionCard = ({ icon: Icon, iconClass = 'bg-emerald-50 text-emerald-600', title, action, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] p-5 md:p-6">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{title}</h3>
      </div>
      {action}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const ProfileEdit = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profileImage: '',
    profileImagePublicId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      area: '',
      houseNo: '',
      landmark: '',
      coordinates: { lat: null, lng: null }
    },
    builderProfile: {
      companyName: '',
      brandLogo: '',
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
      awards: [],
      approvalStatus: 'pending',
      verificationMessage: ''
    }
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    // Load user data from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setFormData({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          profileImage: user.profileImage || '',
          profileImagePublicId: user.profileImagePublicId || '',
          address: {
            street: user.address?.street || '',
            city: user.address?.city || '',
            state: user.address?.state || '',
            zipCode: user.address?.zipCode || '',
            country: user.address?.country || 'India',
            area: user.address?.area || '',
            houseNo: user.address?.houseNo || '',
            landmark: user.address?.landmark || '',
            coordinates: user.address?.coordinates || { lat: null, lng: null }
          },
          builderProfile: {
            companyName: user.builderProfile?.companyName || '',
            brandLogo: user.builderProfile?.brandLogo || '',
            officeAddress: user.builderProfile?.officeAddress || '',
            cinNumber: user.builderProfile?.cinNumber || '',
            reraRegistrationNumber: user.builderProfile?.reraRegistrationNumber || '',
            reraCertificate: user.builderProfile?.reraCertificate || '',
            gstNumber: user.builderProfile?.gstNumber || '',
            gstCertificate: user.builderProfile?.gstCertificate || '',
            companyRegistrationCertificate: user.builderProfile?.companyRegistrationCertificate || '',
            description: user.builderProfile?.description || '',
            establishedYear: user.builderProfile?.establishedYear || '',
            activeProjects: user.builderProfile?.activeProjects || 0,
            completedProjects: user.builderProfile?.completedProjects || 0,
            awards: user.builderProfile?.awards || [],
            approvalStatus: user.builderProfile?.approvalStatus || 'pending',
            verificationMessage: user.builderProfile?.verificationMessage || ''
          }
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  }, []);

  const validateField = (field, value) => {
    let errorMsg = '';
    if (field === 'name') {
      if (!value) {
        errorMsg = 'Full Name is required';
      } else if (!/^[a-zA-Z\s]+$/.test(value)) {
        errorMsg = 'Name can only contain alphabets and spaces';
      } else if (value.trim().length < 3) {
        errorMsg = 'Name must be at least 3 characters';
      }
    } else if (field === 'email') {
      if (!value) {
        errorMsg = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errorMsg = 'Please enter a valid email address';
      }
    } else if (field === 'phone') {
      if (!value) {
        errorMsg = 'Phone number is required';
      } else if (!/^[6-9]\d{9}$/.test(value)) {
        errorMsg = 'Mobile number must be exactly 10 digits starting with 6-9';
      }
    }
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
    return !errorMsg;
  };

  const autoFillAddress = async (lat, lng) => {
    let addressData = null;
    
    // 1. Try Google Geocoding if API key exists
    const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const result = data.results[0];
          const addressComponents = result.address_components;

          let streetNumber = '';
          let route = '';
          let neighborhood = '';
          let city = '';
          let state = '';
          let pincode = '';
          let country = '';

          addressComponents.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) streetNumber = component.long_name;
            if (types.includes('route')) route = component.long_name;
            if (types.includes('neighborhood') || types.includes('sublocality')) neighborhood = component.long_name;
            if (types.includes('locality')) city = component.long_name;
            if (types.includes('administrative_area_level_1')) state = component.long_name;
            if (types.includes('postal_code')) pincode = component.long_name;
            if (types.includes('country')) country = component.long_name;
          });

          if (!city) {
            const sublocality = addressComponents.find(c => c.types.includes('sublocality_level_1'))?.long_name;
            city = sublocality || '';
          }

          addressData = {
            houseNo: streetNumber || '',
            street: route || '',
            area: neighborhood || '',
            city: city || '',
            state: state || '',
            zipCode: pincode || '',
            country: country || 'India'
          };
        }
      } catch (err) {
        console.warn('Google Reverse Geocoding failed, trying fallback:', err);
      }
    }

    // 2. Fallback to OpenStreetMap Nominatim reverse geocoding
    if (!addressData) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'GetRightHome/1.0 (support@getrighthome.com)'
          }
        });
        const data = await response.json();
        if (data && data.address) {
          const addr = data.address;
          addressData = {
            houseNo: addr.house_number || addr.building || '',
            street: addr.road || addr.suburb || '',
            area: addr.suburb || addr.neighbourhood || addr.city_district || '',
            city: addr.city || addr.town || addr.village || addr.municipality || '',
            state: addr.state || '',
            zipCode: addr.postcode || '',
            country: addr.country || 'India'
          };
        }
      } catch (err) {
        console.error('Nominatim Reverse Geocoding failed:', err);
      }
    }

    if (addressData) {
      // Find matching state case-insensitively
      const matchState = Object.keys(stateCitiesData).find(
        s => s.toLowerCase() === addressData.state.trim().toLowerCase()
      ) || addressData.state;

      // Find matching city case-insensitively
      const cities = stateCitiesData[matchState] || [];
      const matchCity = cities.find(
        c => c.toLowerCase() === addressData.city.trim().toLowerCase()
      ) || addressData.city;

      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          country: 'India', // Enforce India as per requirement
          state: matchState,
          city: matchCity,
          area: addressData.area,
          houseNo: addressData.houseNo,
          street: addressData.street,
          zipCode: addressData.zipCode,
          coordinates: { lat, lng }
        }
      }));
      toast.success('Location auto-detected successfully!');
    } else {
      toast.error('Failed to resolve coordinates to address. Please fill manually.');
    }
  };

  const handleGetCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported');
      return;
    }

    setFetchingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      const { latitude, longitude } = position.coords;
      await autoFillAddress(latitude, longitude);
    } catch (error) {
      console.error('Location detection failed:', error);
      toast.error('Unable to retrieve location. Please fill manually.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG and WebP images supported');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('files', file);

    try {
      setImageUploading(true);
      const response = await authService.uploadDocs(uploadData);

      if (response && response.files && response.files.length > 0) {
        const { url, publicId } = response.files[0];
        setFormData(prev => ({
          ...prev,
          profileImage: url,
          profileImagePublicId: publicId
        }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      setImageUploading(true);
      const cameraResult = await openFlutterCamera();

      if (!cameraResult.success || !cameraResult.base64) {
        throw new Error('Camera capture failed');
      }

      const uploadResult = await uploadBase64Image(
        cameraResult.base64,
        cameraResult.mimeType,
        cameraResult.fileName
      );

      if (uploadResult.success && uploadResult.files && uploadResult.files.length > 0) {
        const { url, publicId } = uploadResult.files[0];
        setFormData(prev => ({
          ...prev,
          profileImage: url,
          profileImagePublicId: publicId
        }));
        toast.success('Photo uploaded successfully');
      }
    } catch (err) {
      console.error('Camera upload failed:', err);
      toast.error('Camera upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleCameraClick = () => {
    if (isFlutterApp()) {
      handleCameraCapture();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isNameValid = validateField('name', formData.name);
    const isEmailValid = validateField('email', formData.email);
    const isPhoneValid = validateField('phone', formData.phone);

    if (!isNameValid || !isEmailValid || !isPhoneValid) {
      return;
    }

    if (user?.role === 'builder') {
      if (formData.builderProfile?.establishedYear) {
        const year = parseInt(formData.builderProfile.establishedYear);
        const currentYear = new Date().getFullYear();
        if (year < 1800 || year > currentYear) {
          toast.error(`Established year must be between 1800 and ${currentYear}`);
          return;
        }
      }
      if (formData.builderProfile?.activeProjects < 0) {
        toast.error('Active projects must be a positive number');
        return;
      }
      if (formData.builderProfile?.completedProjects < 0) {
        toast.error('Completed projects must be a positive number');
        return;
      }
    }

    try {
      setLoading(true);
      const response = await authService.updateProfile(formData);

      // Instantly update global Auth context state
      updateUser(response.user);

      toast.success('Profile updated successfully!');
      navigate(-1);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleBuilderProfileChange = (field, value) => {
    let sanitizedValue = value;
    if (['establishedYear', 'activeProjects', 'completedProjects'].includes(field)) {
      sanitizedValue = Math.max(0, parseInt(value) || 0);
      if (value === '') sanitizedValue = '';
    }
    setFormData(prev => ({
      ...prev,
      builderProfile: {
        ...prev.builderProfile,
        [field]: sanitizedValue
      }
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo size must be less than 2MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG and WebP images supported');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('files', file);

    try {
      setLogoUploading(true);
      const response = await authService.uploadDocs(uploadData);

      if (response && response.files && response.files.length > 0) {
        const { url } = response.files[0];
        setFormData(prev => ({
          ...prev,
          builderProfile: {
            ...prev.builderProfile,
            brandLogo: url
          }
        }));
        toast.success('Brand logo uploaded successfully');
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBuilderDocUpload = async (e, fieldName, docLabel) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(`${docLabel} size must be less than 5MB`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, WebP and PDF supported');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('files', file);

    try {
      setDocUploading(true);
      const response = await authService.uploadDocs(uploadData);

      if (response && response.files && response.files.length > 0) {
        const { url } = response.files[0];
        setFormData(prev => ({
          ...prev,
          builderProfile: {
            ...prev.builderProfile,
            [fieldName]: url
          }
        }));
        toast.success(`${docLabel} uploaded successfully`);
      }
    } catch (error) {
      console.error(`${docLabel} upload failed:`, error);
      toast.error(`Failed to upload ${docLabel}`);
    } finally {
      setDocUploading(false);
    }
  };

  // Build state list dynamically supporting existing custom values
  const statesList = Object.keys(stateCitiesData);
  if (formData.address.state && !statesList.includes(formData.address.state)) {
    statesList.push(formData.address.state);
  }
  statesList.sort();

  // Build cities list based on selected state
  const citiesList = [...(stateCitiesData[formData.address.state] || [])];
  if (formData.address.city && !citiesList.includes(formData.address.city)) {
    citiesList.push(formData.address.city);
  }
  citiesList.sort();

  const quickActions = [
    { label: 'Post Property', desc: 'Sell/Rent your property faster', icon: Home, iconBg: 'bg-blue-50 text-blue-500', to: '/list-property' },
    { label: 'Search Properties', desc: 'Explore residential and commercial listings', icon: Search, iconBg: 'bg-orange-50 text-orange-500', to: '/search' },
    { label: 'My Properties', desc: 'Manage your active listings', icon: Building2, iconBg: 'bg-emerald-50 text-emerald-500', to: '/my-properties' },
    { label: 'My Reels', desc: 'Manage your property videos', icon: Video, iconBg: 'bg-purple-50 text-purple-500', to: '/reels/my' },
  ];

  const approvalStyles = {
    approved: { wrap: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-800', Icon: CheckCircle2, iconClass: 'text-emerald-500' },
    rejected: { wrap: 'bg-red-50 border-red-200', title: 'text-red-800', Icon: XCircle, iconClass: 'text-red-500' },
    pending: { wrap: 'bg-amber-50 border-amber-200', title: 'text-amber-800', Icon: Clock, iconClass: 'text-amber-500' },
  };
  const approval = approvalStyles[formData.builderProfile?.approvalStatus] || approvalStyles.pending;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-16">

      {/* Sticky Header */}
      <div className="sticky top-0 left-0 right-0 w-full z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-base font-black text-slate-900 tracking-wide">My Profile</h1>
          <div className="w-9" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 lg:grid lg:grid-cols-[300px_1fr] lg:gap-8 lg:items-start"
      >

        {/* ───────── Left column: identity + quick actions (sticky on desktop) ───────── */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] p-6 flex flex-col items-center text-center">
            <div
              onClick={handleCameraClick}
              className="relative cursor-pointer group"
            >
              <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg overflow-hidden border-4 border-white ring-1 ring-slate-100 group-hover:opacity-90 transition-opacity">
                {formData.profileImage ? (
                  <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} />
                )}
                {imageUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCameraClick();
                }}
                disabled={imageUploading}
                className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-emerald-700 transition-colors"
              >
                <Camera size={16} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={imageUploading}
              />
            </div>

            <h2 className="mt-3.5 text-base font-black text-slate-900 truncate max-w-full">{formData.name || 'Your Name'}</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{formData.email}</p>
            {user?.role && <div className="mt-3"><RoleBadge role={user.role} /></div>}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] overflow-hidden divide-y divide-slate-100">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{action.label}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">{action.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-red-500 font-bold text-sm bg-white hover:bg-red-50 rounded-2xl border border-slate-200/80 hover:border-red-100 active:scale-[0.98] transition-all cursor-pointer shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]"
          >
            <LogOut size={16} />
            Logout
          </button>
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Version 2.0.4 • Made with ❤️ in India
          </p>
        </div>

        {/* ───────── Right column: editable form ───────── */}
        <form onSubmit={handleSubmit} className="space-y-5 mt-4 lg:mt-0">

          <SectionCard icon={User} iconClass="bg-emerald-50 text-emerald-600" title="Contact Information">
            <Field label="Full Name" error={errors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setFormData({ ...formData, name: val });
                  validateField('name', val);
                }}
                className={inputCls}
                placeholder="Your Name"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email Address">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    disabled
                    className={`${inputCls} pl-10`}
                    placeholder="email@example.com"
                  />
                </div>
              </Field>

              <Field label="Phone Number">
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    readOnly
                    disabled
                    className={`${inputCls} pl-[4.5rem]`}
                    placeholder="9876543210"
                  />
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={MapPin}
            iconClass="bg-blue-50 text-blue-600"
            title="My Address"
            action={
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={fetchingLocation}
                className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
              >
                {fetchingLocation ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                Auto-Detect
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Country">
                <select
                  value={formData.address.country}
                  onChange={(e) => handleAddressChange('country', e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="India">India</option>
                </select>
              </Field>

              <Field label="State">
                <select
                  value={formData.address.state}
                  onChange={(e) => {
                    const selectedState = e.target.value;
                    handleAddressChange('state', selectedState);
                    const firstCity = stateCitiesData[selectedState]?.[0] || '';
                    handleAddressChange('city', firstCity);
                  }}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="" disabled>Select State</option>
                  {statesList.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </Field>

              <Field label="City">
                <select
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                  disabled={!formData.address.state}
                >
                  <option value="" disabled>Select City</option>
                  {citiesList.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Area / Locality">
              <input
                type="text"
                value={formData.address.area}
                onChange={(e) => handleAddressChange('area', e.target.value)}
                className={inputCls}
                placeholder="Area / Locality"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="House No., Building Name">
                <input
                  type="text"
                  value={formData.address.houseNo}
                  onChange={(e) => handleAddressChange('houseNo', e.target.value)}
                  className={inputCls}
                  placeholder="Flat/House No., Apartment/Building Name"
                />
              </Field>

              <Field label="Street / Road">
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className={inputCls}
                  placeholder="Street / Road Name"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Landmark (optional)">
                <input
                  type="text"
                  value={formData.address.landmark}
                  onChange={(e) => handleAddressChange('landmark', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Near Apollo Hospital"
                />
              </Field>

              <Field label="PIN Code">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={formData.address.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value.replace(/\D/g, ''))}
                  className={inputCls}
                  placeholder="PIN Code"
                />
              </Field>
            </div>
          </SectionCard>

          {/* Section: Builder Profile Information */}
          {user?.role === 'builder' && (
            <SectionCard icon={Briefcase} iconClass="bg-indigo-50 text-indigo-600" title="Builder Profile Details">
              {formData.builderProfile?.approvalStatus && (
                <div className={`p-4 rounded-xl border ${approval.wrap}`}>
                  <div className="flex items-start gap-3">
                    <approval.Icon className={`${approval.iconClass} shrink-0 mt-0.5`} size={18} />
                    <div>
                      <h4 className={`text-sm font-bold ${approval.title}`}>
                        Verification {formData.builderProfile.approvalStatus.charAt(0).toUpperCase() + formData.builderProfile.approvalStatus.slice(1)}
                      </h4>
                      {formData.builderProfile.approvalStatus === 'pending' && (
                        <p className="text-xs text-amber-700 mt-1">Your profile is currently under review by our admin team.</p>
                      )}
                      {formData.builderProfile.approvalStatus === 'rejected' && formData.builderProfile.verificationMessage && (
                        <div className="mt-2 p-3 bg-red-100 rounded-lg border border-red-200">
                          <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Admin Note:</p>
                          <p className="text-xs font-semibold text-red-700">{formData.builderProfile.verificationMessage}</p>
                          <p className="text-[10px] text-red-600 mt-2 font-medium">Please update your documents below and save profile to request re-verification.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Field label="Company Logo">
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => !logoUploading && logoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer shrink-0 group"
                  >
                    {formData.builderProfile?.brandLogo ? (
                      <img src={formData.builderProfile.brandLogo} alt="Company logo" className="w-full h-full object-contain" />
                    ) : (
                      <Image size={22} className="text-slate-300" />
                    )}
                    {logoUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 size={18} className="animate-spin text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      {formData.builderProfile?.brandLogo ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1.5">JPG, PNG or WebP. Max 2MB.</p>
                  </div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                  />
                </div>
              </Field>

              <Field label="Company Name">
                <input
                  type="text"
                  value={formData.builderProfile?.companyName || ''}
                  onChange={(e) => handleBuilderProfileChange('companyName', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. XYZ Developers Ltd."
                />
              </Field>

              <Field label="Registered Office Address">
                <textarea
                  rows={2}
                  value={formData.builderProfile?.officeAddress || ''}
                  onChange={(e) => handleBuilderProfileChange('officeAddress', e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Full office address..."
                />
              </Field>

              {/* Compliance documents */}
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {[
                  { key: 'cinNumber', doc: 'companyRegistrationCertificate', label: 'Company Registration (CIN) Number', docLabel: 'Company Registration', placeholder: 'L12345MH2000PLC123456', inputId: 'cin-upload' },
                  { key: 'reraRegistrationNumber', doc: 'reraCertificate', label: 'RERA Number', docLabel: 'RERA Certificate', placeholder: 'PR/GJ/...', inputId: 'rera-upload' },
                  { key: 'gstNumber', doc: 'gstCertificate', label: 'GST Number', docLabel: 'GST Certificate', placeholder: '22AAAAA0000A1Z5', inputId: 'gst-upload' },
                ].map((row) => (
                  <div key={row.key} className="p-4 bg-slate-50/60 space-y-3">
                    <Field label={row.label}>
                      <div className="relative">
                        <IdCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={formData.builderProfile?.[row.key] || ''}
                          onChange={(e) => handleBuilderProfileChange(row.key, e.target.value)}
                          className={`${inputCls} pl-10 uppercase`}
                          placeholder={row.placeholder}
                        />
                      </div>
                    </Field>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id={row.inputId}
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={(e) => handleBuilderDocUpload(e, row.doc, row.docLabel)}
                        disabled={docUploading}
                      />
                      <label htmlFor={row.inputId} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors">
                        <FileText size={14} /> Upload {row.docLabel}
                      </label>
                      {formData.builderProfile?.[row.doc] && (
                        <a href={formData.builderProfile[row.doc]} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-500" /> Uploaded
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Established Year">
                  <input
                    type="number"
                    value={formData.builderProfile?.establishedYear || ''}
                    onChange={(e) => handleBuilderProfileChange('establishedYear', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 1995"
                  />
                </Field>

                <Field label="Active Projects">
                  <input
                    type="number"
                    value={formData.builderProfile?.activeProjects !== undefined ? formData.builderProfile.activeProjects : 0}
                    onChange={(e) => handleBuilderProfileChange('activeProjects', e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="Completed Projects">
                  <input
                    type="number"
                    value={formData.builderProfile?.completedProjects !== undefined ? formData.builderProfile.completedProjects : 0}
                    onChange={(e) => handleBuilderProfileChange('completedProjects', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="About Company">
                <textarea
                  rows={3}
                  value={formData.builderProfile?.description || ''}
                  onChange={(e) => handleBuilderProfileChange('description', e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Brief description about the builder's history..."
                />
              </Field>
            </SectionCard>
          )}

          <button
            type="submit"
            disabled={loading || imageUploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                <ShieldCheck size={17} />
                Save Profile
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileEdit;
