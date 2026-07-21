import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, ArrowLeft, Loader2, Navigation, Home, Camera, Building2, ChevronRight, LogOut, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
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

  const handleCameraClick = () => {
    if (isFlutterApp()) {
      handleCameraCapture();
    } else {
      fileInputRef.current?.click();
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pt-safe-top px-6 pb-24 md:pb-12">

      {/* Sticky Header */}
      <div className="sticky top-0 left-0 right-0 w-full z-20 bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Edit Profile</h1>
        <div className="w-10 text-right">
          <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-6"
      >

        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg overflow-hidden border-4 border-white">
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
              onClick={handleCameraClick}
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
          <p className="mt-2 text-xs text-gray-400">Tap icon to change photo</p>
        </div>

        {/* Host/Sell Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                <Home size={24} className="text-white" />
              </div>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">Post Free</span>
            </div>
            <h3 className="text-xl font-black mb-1">Sell or Rent Your Property</h3>
            <p className="text-white/70 text-xs leading-relaxed mb-4 max-w-[200px]">
              List your House, Villa, Plot or PG and connect with thousands of buyers.
            </p>
            <button
              onClick={() => navigate('/list-property')}
              className="w-full py-3 bg-white text-emerald-700 font-black text-sm rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Start Listing Now
            </button>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/my-properties')}
          className="w-full py-4 px-5 bg-gray-50 border border-gray-100 rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white rounded-2xl shadow-sm text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Building2 size={20} />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">My Properties</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage your active listings</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section: Contact Information */}
          <div className="space-y-5">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Contact Information</h3>
            </div>
            
            {/* Full Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Name</label>
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2 focus-within:border-emerald-600 transition-colors">
                <User size={16} className="text-slate-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setFormData({ ...formData, name: val });
                    validateField('name', val);
                  }}
                  className="flex-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent"
                  placeholder="Your Name"
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-xs font-semibold mt-1">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email Address</label>
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2 focus-within:border-emerald-600 transition-colors">
                <Mail size={16} className="text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    validateField('email', e.target.value);
                  }}
                  className="flex-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent"
                  placeholder="email@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs font-semibold mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone Number</label>
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2 focus-within:border-emerald-600 transition-colors">
                <Phone size={16} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-500 select-none">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, phone: val });
                    validateField('phone', val);
                  }}
                  className="flex-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent"
                  placeholder="9876543210"
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-xs font-semibold mt-1">{errors.phone}</p>
              )}
            </div>
          </div>


          {/* Section: Delivery Address */}
          <div className="space-y-5 pt-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Delivery Address</h3>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={fetchingLocation}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {fetchingLocation ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
                Auto-Detect
              </button>
            </div>

            {/* Country */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">Country</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <select
                  value={formData.address.country}
                  onChange={(e) => handleAddressChange('country', e.target.value)}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none bg-transparent cursor-pointer"
                >
                  <option value="India">India</option>
                </select>
              </div>
            </div>

            {/* State */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">State</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <select
                  value={formData.address.state}
                  onChange={(e) => {
                    const selectedState = e.target.value;
                    handleAddressChange('state', selectedState);
                    // Reset city to first available or empty
                    const firstCity = stateCitiesData[selectedState]?.[0] || '';
                    handleAddressChange('city', firstCity);
                  }}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none bg-transparent cursor-pointer"
                >
                  <option value="" disabled>Select State</option>
                  {statesList.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* City */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">City</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <select
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none bg-transparent cursor-pointer"
                  disabled={!formData.address.state}
                >
                  <option value="" disabled>Select City</option>
                  {citiesList.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Area / Locality */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">Area / Locality</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <input
                  type="text"
                  value={formData.address.area}
                  onChange={(e) => handleAddressChange('area', e.target.value)}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none placeholder:text-gray-400 bg-transparent"
                  placeholder="Area / Locality"
                />
              </div>
            </div>

            {/* House No., Building Name */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">House No., Building Name</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <input
                  type="text"
                  value={formData.address.houseNo}
                  onChange={(e) => handleAddressChange('houseNo', e.target.value)}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none placeholder:text-gray-400 bg-transparent"
                  placeholder="Flat/House No., Apartment/Building Name"
                />
              </div>
            </div>

            {/* Street / Road */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">Street / Road</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none placeholder:text-gray-400 bg-transparent"
                  placeholder="Street / Road Name"
                />
              </div>
            </div>

            {/* Landmark (optional) */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">Landmark (optional)</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <input
                  type="text"
                  value={formData.address.landmark}
                  onChange={(e) => handleAddressChange('landmark', e.target.value)}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none placeholder:text-gray-400 bg-transparent"
                  placeholder="e.g. Near Apollo Hospital"
                />
              </div>
            </div>

            {/* PIN Code */}
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 block">PIN Code</label>
              <div className="border-b border-gray-300 focus-within:border-emerald-600 transition-colors">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={formData.address.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2 text-sm font-bold text-slate-950 outline-none placeholder:text-gray-400 bg-transparent"
                  placeholder="PIN Code"
                />
              </div>
            </div>
          </div>

          {/* Section: Builder Profile Information */}
          {user?.role === 'builder' && (
            <div className="space-y-5 pt-4">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Builder Profile Details</h3>
              </div>

              {/* Verification Status Banner */}
              {formData.builderProfile?.approvalStatus && (
                <div className={`p-4 rounded-xl border ${
                  formData.builderProfile.approvalStatus === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                  formData.builderProfile.approvalStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {formData.builderProfile.approvalStatus === 'approved' ? <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} /> :
                     formData.builderProfile.approvalStatus === 'rejected' ? <XCircle className="text-red-500 shrink-0 mt-0.5" size={18} /> :
                     <Clock className="text-amber-500 shrink-0 mt-0.5" size={18} />}
                    <div>
                      <h4 className={`text-sm font-bold ${
                        formData.builderProfile.approvalStatus === 'approved' ? 'text-emerald-800' :
                        formData.builderProfile.approvalStatus === 'rejected' ? 'text-red-800' :
                        'text-amber-800'
                      }`}>
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

              {/* Company Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Company Name</label>
                <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors">
                  <input
                    type="text"
                    value={formData.builderProfile?.companyName || ''}
                    onChange={(e) => handleBuilderProfileChange('companyName', e.target.value)}
                    className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent"
                    placeholder="e.g. XYZ Developers Ltd."
                  />
                </div>
              </div>

              {/* Office Address */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Registered Office Address</label>
                <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors">
                  <textarea
                    rows={2}
                    value={formData.builderProfile?.officeAddress || ''}
                    onChange={(e) => handleBuilderProfileChange('officeAddress', e.target.value)}
                    className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent resize-none"
                    placeholder="Full office address..."
                  />
                </div>
              </div>

              {/* CIN Number & Registration Doc */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Company Registration (CIN) Number</label>
                  <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors bg-white px-2 rounded-t-md">
                    <input
                      type="text"
                      value={formData.builderProfile?.cinNumber || ''}
                      onChange={(e) => handleBuilderProfileChange('cinNumber', e.target.value)}
                      className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent uppercase"
                      placeholder="L12345MH2000PLC123456"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Upload Company Registration</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="cin-upload"
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={(e) => handleBuilderDocUpload(e, 'companyRegistrationCertificate', 'Company Registration')}
                      disabled={docUploading}
                    />
                    <label htmlFor="cin-upload" className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors">
                      <FileText size={14} /> Upload Doc
                    </label>
                    {formData.builderProfile?.companyRegistrationCertificate && (
                      <a href={formData.builderProfile.companyRegistrationCertificate} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Uploaded
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* RERA Number & Certificate */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">RERA Number</label>
                  <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors bg-white px-2 rounded-t-md">
                    <input
                      type="text"
                      value={formData.builderProfile?.reraRegistrationNumber || ''}
                      onChange={(e) => handleBuilderProfileChange('reraRegistrationNumber', e.target.value)}
                      className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent uppercase"
                      placeholder="PR/GJ/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Upload RERA Certificate</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="rera-upload"
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={(e) => handleBuilderDocUpload(e, 'reraCertificate', 'RERA Certificate')}
                      disabled={docUploading}
                    />
                    <label htmlFor="rera-upload" className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors">
                      <FileText size={14} /> Upload Doc
                    </label>
                    {formData.builderProfile?.reraCertificate && (
                      <a href={formData.builderProfile.reraCertificate} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Uploaded
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* GST Number & Certificate */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">GST Number</label>
                  <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors bg-white px-2 rounded-t-md">
                    <input
                      type="text"
                      value={formData.builderProfile?.gstNumber || ''}
                      onChange={(e) => handleBuilderProfileChange('gstNumber', e.target.value)}
                      className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent uppercase"
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Upload GST Certificate</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="gst-upload"
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={(e) => handleBuilderDocUpload(e, 'gstCertificate', 'GST Certificate')}
                      disabled={docUploading}
                    />
                    <label htmlFor="gst-upload" className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors">
                      <FileText size={14} /> Upload Doc
                    </label>
                    {formData.builderProfile?.gstCertificate && (
                      <a href={formData.builderProfile.gstCertificate} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Uploaded
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Established Year */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Established Year</label>
                <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors">
                  <input
                    type="number"
                    value={formData.builderProfile?.establishedYear || ''}
                    onChange={(e) => handleBuilderProfileChange('establishedYear', e.target.value)}
                    className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent"
                    placeholder="e.g. 1995"
                  />
                </div>
              </div>

              {/* Active Projects */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Active Projects</label>
                <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors">
                  <input
                    type="number"
                    value={formData.builderProfile?.activeProjects !== undefined ? formData.builderProfile.activeProjects : 0}
                    onChange={(e) => handleBuilderProfileChange('activeProjects', e.target.value)}
                    className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent"
                  />
                </div>
              </div>

              {/* Completed Projects */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Completed Projects</label>
                <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors">
                  <input
                    type="number"
                    value={formData.builderProfile?.completedProjects !== undefined ? formData.builderProfile.completedProjects : 0}
                    onChange={(e) => handleBuilderProfileChange('completedProjects', e.target.value)}
                    className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent"
                  />
                </div>
              </div>

              {/* About Company */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">About Company</label>
                <div className="border-b border-gray-200 focus-within:border-emerald-600 transition-colors">
                  <textarea
                    rows={3}
                    value={formData.builderProfile?.description || ''}
                    onChange={(e) => handleBuilderProfileChange('description', e.target.value)}
                    className="w-full py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-gray-300 bg-transparent resize-none"
                    placeholder="Brief description about the builder's history..."
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || imageUploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Profile'}
          </button>
        </form>

        <div className="pt-8 pb-10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold text-sm bg-red-50 hover:bg-red-100 rounded-2xl border border-red-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            <LogOut size={18} />
            Logout
          </button>
          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
            Version 2.0.4 • Made with ❤️ in India
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileEdit;
