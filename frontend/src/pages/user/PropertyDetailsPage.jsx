import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { goBackOrHome } from '../../utils/navigation';
import { authService, propertyService, legalService, reviewService, offerService, availabilityService, userService, bookingService, enquiryService, localityReviewService } from '../../services/apiService';
import GRHPropertyCard from '../../components/user/GRHPropertyCard';
import { usePropertyNavigate } from '../../hooks/usePropertyNavigate';
import {
  MapPin, Star, Share2, Heart, ArrowLeft,
  Users, Calendar, Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, X, Gift,
  CheckCircle, Shield, Info, Clock, Wifi, Coffee, Car, Phone, Scan, Maximize2, Compass, Move, Grid, Landmark, LayoutTemplate,
  Wind, Droplets, Zap, Thermometer, Shirt, Sparkles, Camera, Dumbbell, Box, Flame, ArrowUpCircle, Tv, Utensils, User,
  Lock, Award, Check, ChevronDown, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useEnquiryModal } from '../../context/EnquiryModalContext';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='100%' height='100%' fill='%23F1F5F9'/><text x='50%' y='50%' font-family='sans-serif' font-size='24' font-weight='bold' fill='%2394A3B8' dominant-baseline='middle' text-anchor='middle'>No Image Available</text></svg>";


const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { navigateToProperty } = usePropertyNavigate();
  const { openEnquiryModal } = useEnquiryModal();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0 });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [taxRate, setTaxRate] = useState(0); 
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [revealedNumber, setRevealedNumber] = useState(null);
  const [revealLoading, setRevealLoading] = useState(false);

  // Enquiry and Similar Properties state
  const [enquiryTab, setEnquiryTab] = useState('contact');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitSlot, setVisitSlot] = useState('Morning (10 AM - 12 PM)');
  const [callbackTime, setCallbackTime] = useState('Immediate (within 15 mins)');
  const [similarProperties, setSimilarProperties] = useState([]);
  const [recentProperties, setRecentProperties] = useState([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    otp: '',
    message: 'Interested in this property.'
  });
  const [enquiryErrors, setEnquiryErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);

  // Offers State
  const [offers, setOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);

  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // 99acres Specific Drawers / Modals State
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [showAllAmenitiesModal, setShowAllAmenitiesModal] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadErrors, setLeadErrors] = useState({});
  const [isAgent, setIsAgent] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Helper validation function
  const validateForm = (name, email, phone) => {
    const errors = {};
    if (!name || !name.trim()) {
      errors.name = "Name is required";
    } else if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      errors.name = "Name must contain letters and spaces only";
    }

    if (!email || !email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!phone || !phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      const cleanPhone = phone.trim();
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        errors.phone = "Mobile number must be exactly 10 digits and start with 6-9";
      }
    }
    return errors;
  };

  const [localityStats, setLocalityStats] = useState(null);
  const [localityReviews, setLocalityReviews] = useState([]);
  const [loadingLocalityStats, setLoadingLocalityStats] = useState(false);
  const isManualScrollRef = useRef(false);

  // Horizontal Tab Scroll Link state
  const [activeTab, setActiveTab] = useState('overview');
  const tabsContainerRef = useRef(null);

  // Center active tab inside horizontal tabs list
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        const container = tabsContainerRef.current;
        const containerWidth = container.clientWidth;
        const activeOffsetLeft = activeEl.offsetLeft;
        const activeWidth = activeEl.clientWidth;
        
        container.scrollTo({
          left: activeOffsetLeft - (containerWidth / 2) + (activeWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [activeTab]);

  // Load User Details if available
  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        setLeadName(u.name || '');
        setLeadPhone(u.phone || '');
        setLeadEmail(u.email || '');
        setEnquiryForm(prev => ({
          ...prev,
          name: u.name || '',
          phone: u.phone || '',
          email: u.email || ''
        }));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  // Lock Body Scroll when Modal Open
  useEffect(() => {
    if (showOffersModal || showImageModal || showHighlightsModal || showAllAmenitiesModal || showVisitModal || showCallbackModal) {
      if (window.lenis) window.lenis.stop();
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [showOffersModal, showImageModal, showHighlightsModal, showAllAmenitiesModal, showVisitModal, showCallbackModal]);

  useEffect(() => {
    legalService.getFinancialSettings()
      .then(res => {
        if (res.success) setTaxRate(res.taxRate || 0);
      })
      .catch(err => console.error("Failed to fetch tax rate", err));
  }, []);

  const fetchLocalityData = async (localityName) => {
    if (!localityName) return;
    setLoadingLocalityStats(true);
    try {
      const statsRes = await localityReviewService.getStats(localityName);
      if (statsRes && statsRes.success) {
        setLocalityStats(statsRes.stats);
      }
      
      const revRes = await localityReviewService.getReviews(localityName, 1, 3);
      if (revRes && revRes.success) {
        setLocalityReviews(revRes.reviews || []);
      }
    } catch (err) {
      console.warn("Failed to fetch locality stats:", err);
    } finally {
      setLoadingLocalityStats(false);
    }
  };

  const loadPropertyDetails = async () => {
    try {
      const response = await propertyService.getDetails(id);
      if (response && response.property) {
        const p = response.property;
        if (p.isAddedByAdmin) {
          navigateToProperty(p, { replace: true });
          return;
        }
        const rts = response.roomTypes || [];
        const adapted = {
          ...p,
          _id: p._id,
          name: p.propertyName,
          description: p.description,
          address: p.address,
          avgRating: p.avgRating || 0,
          images: { cover: p.coverImage, gallery: p.propertyImages || [] },
          propertyType: p.propertyType ? p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1) : '',
          amenities: p.amenities || [],
          highlights: p.highlights || [],
          topAmenities: p.topAmenities || [],
          otherAmenities: p.otherAmenities || [],
          inventory: rts.map(rt => ({
            _id: rt._id,
            type: rt.name,
            price: rt.pricePerNight,
            description: rt.description || '',
            amenities: rt.amenities || [],
            maxAdults: rt.maxAdults,
            maxChildren: rt.maxChildren,
            images: rt.images || [],
            inventoryType: rt.inventoryType || (['Hostel', 'PG'].includes(p.propertyType) ? 'bed' : 'room'),
            roomCategory: rt.roomCategory,
            bathroomType: rt.bathroomType
          })),
          policies: {
            checkInTime: p.checkInTime,
            checkOutTime: p.checkOutTime,
            cancellationPolicy: p.cancellationPolicy,
            houseRules: p.houseRules,
            petsAllowed: p.petsAllowed,
            coupleFriendly: p.coupleFriendly
          },
          config: {
            pgType: p.pgType,
            resortType: p.resortType,
            foodType: p.foodType,
            hotelCategory: p.hotelCategory,
            starRating: p.starRating
          }
        };
        setProperty(adapted);

        // Save to recent views in localStorage
        try {
          const recentsRaw = localStorage.getItem('recentViews') || '[]';
          let recents = JSON.parse(recentsRaw);
          recents = recents.filter(rid => rid !== p._id);
          recents.unshift(p._id);
          recents = recents.slice(0, 10);
          localStorage.setItem('recentViews', JSON.stringify(recents));
        } catch (e) {
          console.warn("Failed to update recent views in localStorage", e);
        }

        // Fetch details for recently viewed properties
        try {
          const recentsRaw = localStorage.getItem('recentViews') || '[]';
          let recents = JSON.parse(recentsRaw);
          const otherRecents = recents.filter(rid => rid !== p._id).slice(0, 3);
          if (otherRecents.length > 0) {
            const recentsRes = await propertyService.getPublic({ ids: otherRecents.join(',') });
            const recentsArray = Array.isArray(recentsRes) ? recentsRes : (recentsRes && Array.isArray(recentsRes.properties) ? recentsRes.properties : []);
            setRecentProperties(recentsArray);
          } else {
            setRecentProperties([]);
          }
        } catch (err) {
          console.warn("Failed to load recent properties:", err);
        }

        // Fetch locality details
        const localityString = p.address?.locality || p.address?.area || p.address?.city || '';
        if (localityString) {
          fetchLocalityData(localityString);
        }
        
        // Fetch similar properties
        try {
          const filterType = p.propertyType || '';
          const simRes = await propertyService.getPublic({ type: filterType });
          const propertiesArray = Array.isArray(simRes) ? simRes : (simRes && Array.isArray(simRes.properties) ? simRes.properties : []);
          const filtered = propertiesArray.filter(item => item._id !== p._id).slice(0, 4);
          setSimilarProperties(filtered);
        } catch (err) {
          console.warn("Failed to load similar properties:", err);
        }
      } else {
        setProperty(response);
      }
    } catch (error) {
      console.error("Error fetching property details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPropertyDetails();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchReviews();
      fetchOffers();
    }
  }, [id]);

  // Tab scrolling link effect
  useEffect(() => {
    const handleScroll = () => {
      if (isManualScrollRef.current) return;
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 130;
      if (isAtBottom) {
        setActiveTab('explore-locality');
        return;
      }

      const sections = [
        { id: 'overview', el: document.getElementById('overview') },
        { id: 'highlights', el: document.getElementById('highlights') },
        { id: 'property-details', el: document.getElementById('property-details') },
        { id: 'photos', el: document.getElementById('photos') },
        { id: 'facilities', el: document.getElementById('facilities') },
        { id: 'compare', el: document.getElementById('compare') },
        { id: 'explore-locality', el: document.getElementById('explore-locality') }
      ];

      let currentSection = 'overview';
      const offsetThreshold = 140; // sticky header tabs offset
      
      for (const sec of sections) {
        if (sec.el) {
          const rect = sec.el.getBoundingClientRect();
          if (rect.top <= offsetThreshold) {
            currentSection = sec.id;
          }
        }
      }
      setActiveTab(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      isManualScrollRef.current = true;
      setActiveTab(sectionId);
      const yOffset = -130; // matches scroll threshold offset
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      setTimeout(() => {
        isManualScrollRef.current = false;
      }, 800);
    }
  };

  const formatMemberSince = (dateStr) => {
    if (!dateStr) return 'Jan 2023';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Jan 2023';
    }
  };

  const getSpecs = () => {
    const specs = [];
    if (!property) return specs;

    specs.push({ label: 'Property Type', value: property.propertyType || 'Residential' });
    specs.push({ label: 'Transaction Type', value: property.transactionType || 'Sell' });

    if (property.buyDetails) {
      const bd = property.buyDetails;
      if (bd.type) specs.push({ label: 'Configuration', value: bd.type });
      if (bd.expectedPrice) specs.push({ label: 'Expected Price', value: `₹${bd.expectedPrice.toLocaleString('en-IN')}` });
      if (bd.area?.carpet) specs.push({ label: 'Carpet Area', value: `${bd.area.carpet} ${bd.area.unit || 'sqft'}` });
      if (bd.ownership) specs.push({ label: 'Ownership', value: bd.ownership });
      if (bd.propertyAge) specs.push({ label: 'Property Age', value: bd.propertyAge });
      if (bd.facing) specs.push({ label: 'Facing', value: bd.facing });
      if (bd.builderName) specs.push({ label: 'Builder', value: bd.builderName });
    } else if (property.rentDetails) {
      const rd = property.rentDetails;
      if (rd.type) specs.push({ label: 'Configuration', value: rd.type });
      if (rd.monthlyRent) specs.push({ label: 'Monthly Rent', value: `₹${rd.monthlyRent.toLocaleString('en-IN')}/month` });
      if (rd.furnishing) specs.push({ label: 'Furnishing', value: rd.furnishing });
      if (rd.tenantPreference) specs.push({ label: 'Tenant Preference', value: rd.tenantPreference });
      if (rd.societyName) specs.push({ label: 'Society', value: rd.societyName });
      if (rd.waterSupply) specs.push({ label: 'Water Supply', value: rd.waterSupply });
    } else if (property.plotDetails) {
      const pd = property.plotDetails;
      if (pd.expectedPrice) specs.push({ label: 'Expected Price', value: `₹${pd.expectedPrice.toLocaleString('en-IN')}` });
      if (pd.plotArea) specs.push({ label: 'Plot Area', value: `${pd.plotArea} ${pd.unit || 'sqyrd'}` });
      if (pd.landType) specs.push({ label: 'Land Type', value: pd.landType });
      if (pd.facing) specs.push({ label: 'Facing', value: pd.facing });
      if (pd.roadWidth) specs.push({ label: 'Road Width', value: pd.roadWidth });
      if (pd.approvalAuthority) specs.push({ label: 'Approval Authority', value: pd.approvalAuthority });
    } else if (property.pgDetails) {
      const pgd = property.pgDetails;
      if (pgd.gender) specs.push({ label: 'Gender Allowed', value: pgd.gender });
      if (pgd.occupancy) specs.push({ label: 'Occupancy', value: pgd.occupancy });
      if (pgd.securityDeposit) specs.push({ label: 'Security Deposit', value: `₹${pgd.securityDeposit.toLocaleString('en-IN')}` });
      if (pgd.minStay) specs.push({ label: 'Min Stay', value: pgd.minStay });
      if (pgd.noticePeriod) specs.push({ label: 'Notice Period', value: pgd.noticePeriod });
      if (pgd.foodIncluded !== undefined) specs.push({ label: 'Food Included', value: pgd.foodIncluded ? 'Yes' : 'No' });
    }

    if (specs.length <= 2) {
      const dd = property.dynamicData || {};
      const getDdVal = (key) => {
        if (typeof dd.get === 'function') return dd.get(key);
        return dd[key];
      };
      // Pull from dynamicData (new form submissions)
      if (getDdVal('bedrooms')) specs.push({ label: 'Bedrooms', value: getDdVal('bedrooms') });
      if (getDdVal('bathrooms')) specs.push({ label: 'Bathrooms', value: getDdVal('bathrooms') });
      if (getDdVal('balconies')) specs.push({ label: 'Balconies', value: getDdVal('balconies') });
      if (getDdVal('furnishing')) specs.push({ label: 'Furnishing', value: getDdVal('furnishing') });
      if (getDdVal('carpetArea')) specs.push({ label: 'Carpet Area', value: `${getDdVal('carpetArea')} ${getDdVal('carpetAreaUnit') || 'sq.ft.'}` });
      if (getDdVal('superArea')) specs.push({ label: 'Super Built-up Area', value: `${getDdVal('superArea')} ${getDdVal('superAreaUnit') || 'sq.ft.'}` });
      if (getDdVal('totalFloors')) specs.push({ label: 'Total Floors', value: getDdVal('totalFloors') });
      if (getDdVal('floorNumber')) specs.push({ label: 'Floor Number', value: getDdVal('floorNumber') });
      if (getDdVal('facing')) specs.push({ label: 'Facing', value: getDdVal('facing') });
      if (getDdVal('availability')) specs.push({ label: 'Availability', value: getDdVal('availability') });
      if (getDdVal('gatedCommunity')) specs.push({ label: 'Gated Community', value: getDdVal('gatedCommunity') });
      if (getDdVal('waterSupply')) specs.push({ label: 'Water Supply', value: getDdVal('waterSupply') });
      if (getDdVal('expectedPrice')) specs.push({ label: 'Expected Price', value: `₹${Number(getDdVal('expectedPrice')).toLocaleString('en-IN')}` });
      if (getDdVal('monthlyRent')) specs.push({ label: 'Monthly Rent', value: `₹${Number(getDdVal('monthlyRent')).toLocaleString('en-IN')}/mo` });
      if (getDdVal('securityDeposit')) specs.push({ label: 'Security Deposit', value: `₹${Number(getDdVal('securityDeposit')).toLocaleString('en-IN')}` });
      if (getDdVal('plotArea')) specs.push({ label: 'Plot Area', value: `${getDdVal('plotArea')} ${getDdVal('areaUnit') || 'sq.ft.'}` });
      if (getDdVal('approvalAuthority')) specs.push({ label: 'Approval Authority', value: getDdVal('approvalAuthority') });
      if (getDdVal('boundaryWall')) specs.push({ label: 'Boundary Wall', value: getDdVal('boundaryWall') });
      
      if (getDdVal('roadWidth')) specs.push({ label: 'Road Width', value: `${getDdVal('roadWidth')} ft` });
      if (getDdVal('totalLandArea')) specs.push({ label: 'Total Land Area', value: `${getDdVal('totalLandArea')} Acres` });
    }
    return specs;
  };

  const getCircularWidgets = () => {
    const widgets = [];
    if (!property) return widgets;

    if (property.buyDetails?.type || property.rentDetails?.type) {
      widgets.push({
        icon: LayoutTemplate,
        label: property.buyDetails?.type || property.rentDetails?.type,
        color: 'text-slate-600'
      });
    } else if (property.pgDetails?.gender) {
      widgets.push({
        icon: Users,
        label: `${property.pgDetails.gender} PG`,
        color: 'text-slate-600'
      });
    } else {
      widgets.push({
        icon: LayoutTemplate,
        label: property.propertyType || 'Residential',
        color: 'text-slate-600'
      });
    }

    if (property.buyDetails?.area?.carpet) {
      widgets.push({
        icon: Maximize2,
        label: `${property.buyDetails.area.carpet} ${property.buyDetails.area.unit || 'sqft'} carpet`,
        color: 'text-slate-600'
      });
    } else if (property.plotDetails?.plotArea) {
      widgets.push({
        icon: Maximize2,
        label: `${property.plotDetails.plotArea} ${property.plotDetails.unit || 'sqyrd'} area`,
        color: 'text-slate-600'
      });
    } else if (property.dynamicData) {
      const dd = property.dynamicData;
      const getDd = (k) => typeof dd.get === 'function' ? dd.get(k) : dd[k];
      const area = getDd('carpetArea') || getDd('plotArea') || getDd('superArea');
      const unit = getDd('carpetAreaUnit') || getDd('areaUnit') || getDd('superAreaUnit') || 'sq.ft.';
      if (area) {
        widgets.push({ icon: Maximize2, label: `${area} ${unit} carpet`, color: 'text-slate-600' });
      } else {
        widgets.push({ icon: Maximize2, label: 'Area N/A', color: 'text-slate-400' });
      }
    }

    if (property.buyDetails?.expectedPrice) {
      const carpetVal = property.buyDetails.area?.carpet || 1;
      const perSqft = Math.round(property.buyDetails.expectedPrice / carpetVal);
      widgets.push({
        icon: null,
        symbol: '₹',
        label: `₹${perSqft.toLocaleString('en-IN')}/sqft`,
        color: 'text-[#0061df]'
      });
    } else if (property.rentDetails?.monthlyRent) {
      widgets.push({
        icon: null,
        symbol: '₹',
        label: `₹${property.rentDetails.monthlyRent.toLocaleString('en-IN')}/mo`,
        color: 'text-[#0061df]'
      });
    } else if (property.pgDetails?.securityDeposit) {
      widgets.push({
        icon: null,
        symbol: '₹',
        label: `₹${property.pgDetails.securityDeposit.toLocaleString('en-IN')} Dep`,
        color: 'text-[#0061df]'
      });
    } else if (property.dynamicData) {
      const dd = property.dynamicData;
      const getDd = (k) => typeof dd.get === 'function' ? dd.get(k) : dd[k];
      const price = getDd('expectedPrice') || getDd('monthlyRent') || getDd('expectedRent');
      if (price) {
        widgets.push({ icon: null, symbol: '₹', label: formatPriceLakhCrore(price), color: 'text-[#0061df]' });
      } else {
        widgets.push({ icon: null, symbol: '₹', label: 'Price on Request', color: 'text-[#0061df]' });
      }
    }

    if (property.buyDetails?.facing || property.plotDetails?.facing) {
      widgets.push({
        icon: Compass,
        label: `${property.buyDetails?.facing || property.plotDetails?.facing} Facing`,
        color: 'text-slate-600'
      });
    } else if (property.buyDetails?.propertyAge) {
      widgets.push({
        icon: Calendar,
        label: `${property.buyDetails.propertyAge} Old`,
        color: 'text-slate-600'
      });
    } else if (property.dynamicData) {
      const dd = property.dynamicData;
      const getDd = (k) => typeof dd.get === 'function' ? dd.get(k) : dd[k];
      const facing = getDd('facing');
      if (facing) {
        widgets.push({ icon: Compass, label: `${facing} Facing`, color: 'text-slate-600' });
      }
    }

    if (property.rentDetails?.furnishing) {
      widgets.push({
        icon: Grid,
        label: property.rentDetails.furnishing,
        color: 'text-slate-600'
      });
    } else if (property.pgDetails?.occupancy) {
      widgets.push({
        icon: Users,
        label: property.pgDetails.occupancy,
        color: 'text-slate-600'
      });
    } else if (property.dynamicData) {
      const dd = property.dynamicData;
      const getDd = (k) => typeof dd.get === 'function' ? dd.get(k) : dd[k];
      const furnishing = getDd('furnishing');
      if (furnishing) {
        widgets.push({ icon: Grid, label: furnishing, color: 'text-slate-600' });
      }
    }

    return widgets.slice(0, 5);
  };

  const propertyType = property?.propertyType;
  const isBedBased = ['hostel', 'pg'].includes(propertyType?.toLowerCase());

  useEffect(() => {
    if (isBedBased) {
      setGuests(prev => ({ ...prev, adults: prev.rooms, children: 0 }));
    }
  }, [guests.rooms, isBedBased]);

  const getDefaultPgDates = () => {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(new Date().getTime() + 2592000000).toISOString().split('T')[0]; 
    return { checkIn: start, checkOut: end };
  };

  const fetchOffers = async () => {
    try {
      const data = await offerService.getActive();
      setOffers(data || []);
    } catch (error) {
      console.error("Failed to fetch offers");
    }
  };

  useEffect(() => {
    if (localStorage.getItem('user')) {
      userService.getSavedPlaces()
        .then(res => {
          const list = [
            ...(res.savedProperties || []),
            ...(res.savedProjects || []),
            ...(res.savedHotels || [])
          ];
          if (Array.isArray(list)) {
            const found = list.some(h => (typeof h === 'object' ? (h._id || h.id) : h) === id);
            setIsSaved(found);
          }
        })
        .catch(err => console.error("Failed to fetch saved status", err));
    }
  }, [id]);

  const handleToggleSave = async () => {
    if (!localStorage.getItem('user')) {
      toast.error("Please login to save properties");
      return;
    }
    try {
      const newState = !isSaved;
      setIsSaved(newState);
      await userService.toggleSavedPlace(id, 'property');
      toast.success(newState ? "Added to wishlist" : "Removed from wishlist");
    } catch (err) {
      setIsSaved(!isSaved);
      toast.error("Failed to update wishlist");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: property?.name || 'Get-Right-home',
      text: `Check out ${property?.name || 'this amazing place'} on Get-Right-Home!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await reviewService.getPropertyReviews(id);
      setReviews(data);
    } catch (error) {
      console.error("Failed to fetch reviews");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem('user')) {
      toast.error('Please login to submit a review');
      return;
    }
    setSubmitReviewLoading(true);
    try {
      await reviewService.createReview({
        propertyId: id,
        ...reviewData
      });
      toast.success('Review submitted!');
      setReviewData({ rating: 5, comment: '' });
      setShowReviewForm(false);
      fetchReviews();
      loadPropertyDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitReviewLoading(false);
    }
  };

  const checkAvailability = async (directCall = false) => {
    const isPgOrHostel = propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel';
    if (!selectedRoom || (!isPgOrHostel && (!dates.checkIn || !dates.checkOut))) {
      if (directCall) {
        toast.error(selectedRoom ? "Please select dates first" : "Please select a room/unit first");
      }
      setAvailability(null);
      return null;
    }

    const pgDates = getDefaultPgDates();
    const checkIn = (isPgOrHostel && !dates.checkIn) ? pgDates.checkIn : dates.checkIn;
    const checkOut = (isPgOrHostel && !dates.checkOut) ? pgDates.checkOut : dates.checkOut;

    setCheckingAvailability(true);
    try {
      const response = await availabilityService.check({
        propertyId: id,
        roomTypeId: selectedRoom._id,
        checkIn: checkIn,
        checkOut: checkOut,
        rooms: guests.rooms
      });

      let result = null;
      if (Array.isArray(response)) {
        const roomAvail = response.find(r => String(r.roomTypeId) === String(selectedRoom._id));
        if (roomAvail) {
          const requiredUnits = guests.rooms || 1;
          if (roomAvail.availableUnits >= requiredUnits) {
            result = { available: true, unitsLeft: roomAvail.availableUnits };
          } else {
            result = { available: false, message: `Only ${roomAvail.availableUnits} units available`, unitsLeft: roomAvail.availableUnits };
          }
        } else {
          result = { available: false, message: "Sold Out for these dates", unitsLeft: 0 };
        }
      } else {
        result = response;
      }

      setAvailability(result);
      return result;
    } catch (error) {
      console.error("Availability check failed:", error);
      const errorResult = { available: false, message: error.message || "Unable to verify availability" };
      setAvailability(errorResult);
      return errorResult;
    } finally {
      setCheckingAvailability(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#0061df]" size={36} /></div>;
  if (!property) return <div className="h-screen flex items-center justify-center bg-white text-gray-500 font-medium">Property not found</div>;

  const {
    _id, name, address, images, description, avgRating: rating,
    inventory, amenities, policies, config,
    pgDetails, rentDetails, buyDetails, plotDetails, nearbyPlaces,
    videoUrl, virtualTourLink, isVerified, isFeatured, isUrgent, isNegotiable,
    contactNumber
  } = property;

  const hasInventory = inventory && inventory.length > 0;
  const isWholeUnit = [
    'villa',
    'independent house',
    'independenthouse',
    'house',
    'plot',
    'buy',
    'rent'
  ].includes(propertyType?.toLowerCase() || '') ||
  (['homestay', 'apartment'].includes(propertyType?.toLowerCase() || '') && !hasInventory);

  const getRoomPrice = (room) => {
    if (!room) return null;
    if (room.pricing) {
      if (typeof room.pricing.basePrice === 'number') return room.pricing.basePrice;
      if (typeof room.pricing.weekendPrice === 'number') return room.pricing.weekendPrice;
    }
    return room.price || null;
  };

  const getNightBreakup = (room) => {
    if (!room) {
      return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: 0 };
    }
    const pricing = room.pricing || {};
    const { basePrice, weekendPrice } = pricing;
    const fallbackPrice = getRoomPrice(room);

    if (!dates.checkIn || !dates.checkOut) {
      const base = typeof basePrice === 'number' ? basePrice : (typeof weekendPrice === 'number' ? weekendPrice : fallbackPrice);
      return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: base };
    }

    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    if (isNaN(start) || isNaN(end) || end <= start) {
      const base = typeof basePrice === 'number' ? basePrice : (typeof weekendPrice === 'number' ? weekendPrice : fallbackPrice);
      return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: base };
    }

    let current = new Date(start);
    let nights = 0;
    let weekdayNights = 0;
    let weekendNights = 0;
    let total = 0;
    while (current < end) {
      const day = current.getDay();
      const isWeekendDay = day === 5 || day === 6;
      const dayPrice = isWeekendDay && typeof weekendPrice === 'number' ? weekendPrice : (typeof basePrice === 'number' ? basePrice : fallbackPrice);
      total += (dayPrice || 0);
      nights += 1;
      if (isWeekendDay) weekendNights += 1;
      else weekdayNights += 1;
      current.setDate(current.getDate() + 1);
    }
    const perNight = nights > 0 ? Math.round(total / nights) : fallbackPrice;
    return { nights, weekdayNights, weekendNights, perNight };
  };

  const getExtraPricingLabels = (room) => {
    if (!room || !room.pricing) return [];
    const labels = [];
    const pType = property?.propertyType?.toLowerCase();
    const isMonthBased = ['pg', 'hostel', 'rent'].includes(pType);
    const isSaleBased = ['buy', 'plot'].includes(pType);
    const suffix = isMonthBased ? 'month' : isSaleBased ? '' : 'night';

    if (typeof room.pricing.extraAdultPrice === 'number') {
      labels.push(`Extra adult: ₹${room.pricing.extraAdultPrice}${suffix ? ` / ${suffix}` : ''}`);
    }
    if (typeof room.pricing.extraChildPrice === 'number') {
      labels.push(`Extra child: ₹${room.pricing.extraChildPrice}${suffix ? ` / ${suffix}` : ''}`);
    }
    return labels;
  };

  const getGalleryImages = () => {
    if (selectedRoom && selectedRoom.images && selectedRoom.images.length > 0) {
      return selectedRoom.images
        .map((img) => (typeof img === 'string' ? img : img.url))
        .filter(Boolean);
    }
    const list = [];
    if (images?.cover) list.push(images.cover);
    if (Array.isArray(images?.gallery)) list.push(...images.gallery);
    if (list.length > 0) return list;
    return [NO_IMAGE_PLACEHOLDER];
  };

  const galleryImages = getGalleryImages();
  const mainImage = galleryImages[Math.min(currentImageIndex, Math.max(galleryImages.length - 1, 0))];
  const activeRoom = selectedRoom || (hasInventory ? inventory[0] : null);
  const stayPricing = getNightBreakup(activeRoom);
  const bookingRoom = selectedRoom || activeRoom;
  
  const getPriceBreakdown = () => {
    const isPg = propertyType?.toLowerCase() === 'pg';
    const isHostel = propertyType?.toLowerCase() === 'hostel';
    const isPgOrHostel = isPg || isHostel;
    if (!selectedRoom || (!isPgOrHostel && (!dates.checkIn || !dates.checkOut))) return null;

    let { nights: stayNights, perNight } = stayPricing;
    const nights = isPgOrHostel ? 1 : stayNights;
    if (nights === 0 && !isPgOrHostel) return null;

    if (isPgOrHostel && !dates.checkIn) {
      perNight = getRoomPrice(selectedRoom);
    }

    const units = isWholeUnit ? 1 : guests.rooms;
    const baseAdultsPerUnit = selectedRoom.maxAdults || property.maxGuests || 2;
    const baseChildrenPerUnit = selectedRoom.maxChildren !== undefined ? selectedRoom.maxChildren : 0;

    const extraAdultsCount = Math.max(0, guests.adults - (baseAdultsPerUnit * units));
    const extraChildrenCount = Math.max(0, guests.children - (baseChildrenPerUnit * units));

    const pricePerNight = getRoomPrice(selectedRoom);
    const extraAdultPrice = selectedRoom.pricing?.extraAdultPrice || 0;
    const extraChildPrice = selectedRoom.pricing?.extraChildPrice || 0;

    const totalBasePrice = pricePerNight * nights * units;
    const totalExtraAdultCharge = extraAdultsCount * extraAdultPrice * nights;
    const totalExtraChildCharge = extraChildrenCount * extraChildPrice * nights;

    const grossAmount = totalBasePrice + totalExtraAdultCharge + totalExtraChildCharge;

    let discountAmount = 0;
    if (appliedOffer) {
      if (grossAmount >= (appliedOffer.minBookingAmount || 0)) {
        if (appliedOffer.discountType === 'percentage') {
          discountAmount = (grossAmount * appliedOffer.discountValue) / 100;
          if (appliedOffer.maxDiscount) {
            discountAmount = Math.min(discountAmount, appliedOffer.maxDiscount);
          }
        } else {
          discountAmount = appliedOffer.discountValue;
        }
        discountAmount = Math.floor(discountAmount);
      }
    }

    discountAmount = Math.min(discountAmount, grossAmount);
    const commissionableAmount = grossAmount;
    const taxableAmount = grossAmount - discountAmount;
    const taxAmount = Math.round((commissionableAmount * taxRate) / 100);
    const grandTotal = taxableAmount + taxAmount;

    return {
      nights,
      units,
      baseAdultsPerUnit,
      extraAdultsCount,
      extraChildrenCount,
      pricePerNight,
      extraAdultPrice,
      extraChildPrice,
      totalBasePrice,
      totalExtraAdultCharge,
      totalExtraChildCharge,
      grossAmount,
      discountAmount,
      couponCode: (appliedOffer && discountAmount > 0) ? appliedOffer.code : null,
      commissionableAmount,
      taxableAmount,
      taxAmount,
      grandTotal
    };
  };

  const pType = propertyType?.toLowerCase();
  const txnType = (property.transactionType || '').toLowerCase();
  const isPgGroup = ['pg', 'hostel'].includes(pType) || txnType.includes('pg') || txnType.includes('paying guest');
  const isRentGroup = ['rent'].includes(pType) || txnType.includes('rent') || txnType.includes('lease');
  const isBuyGroup = ['buy', 'plot', 'apartment', 'villa', 'residential', 'commercial'].includes(pType) || txnType.includes('sell') || txnType.includes('buy');

  let bookingBarPrice =
    stayPricing.nights > 0
      ? stayPricing.perNight
      : getRoomPrice(bookingRoom) || property.minPrice;

  if (!bookingBarPrice) {
    bookingBarPrice =
      property.dynamicData?.expectedPrice ||
      property.dynamicData?.monthlyRent ||
      property.dynamicData?.expectedRent ||
      property.dynamicData?.price ||
      property.rentDetails?.monthlyRent ||
      property.buyDetails?.expectedPrice ||
      property.plotDetails?.expectedPrice ||
      property.pgDetails?.monthlyRent ||
      property.minPrice;
  }

  if (bookingBarPrice) {
    const parsed = Number(bookingBarPrice.toString().replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      bookingBarPrice = parsed;
    }
  }

  const priceBreakdown = getPriceBreakdown();

  const handlePrevImage = () => {
    if (galleryImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleNextImage = () => {
    if (galleryImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handleSendOtpForPhone = async (phoneVal) => {
    setSendingOtp(true);
    try {
      await authService.sendOtp(phoneVal, 'login', 'user');
      setOtpSent(true);
      toast.success("OTP sent to your mobile number!");
    } catch (err) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSendOtp = async () => {
    const errors = validateForm(enquiryForm.name, enquiryForm.email, enquiryForm.phone);
    if (Object.keys(errors).length > 0) {
      setEnquiryErrors(errors);
      return;
    }
    setEnquiryErrors({});

    setSendingOtp(true);
    try {
      await authService.sendOtp(enquiryForm.phone, 'login', 'user');
      setOtpSent(true);
      toast.success("OTP sent to your mobile number!");
    } catch (err) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleDirectLoggedInEnquiry = async () => {
    const errors = validateForm(leadName, leadEmail, leadPhone);
    if (Object.keys(errors).length > 0) {
      setLeadErrors(errors);
      return;
    }
    setLeadErrors({});

    setBookingLoading(true);
    try {
      let messageBody = `[Inquiry from Detail Page]\nName: ${leadName}\nPhone: ${leadPhone}\nEmail: ${leadEmail}\nAgent Status: ${isAgent ? 'Real Estate Agent' : 'Individual/Buyer'}\nMessage: Interested in this property.`;
      const response = await enquiryService.create({
        propertyId: id,
        enquiryType: 'callback',
        name: leadName,
        phone: leadPhone,
        email: leadEmail,
        message: messageBody,
        preferredDate: new Date(),
        timeSlot: '',
        budget: property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || 0
      });

      if (response.success) {
        // Will be called by onSuccess if needed, or we can just return
      } else {
        toast.error(response.message || "Failed to submit enquiry");
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit enquiry");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    const isLoggedIn = !!localStorage.getItem('user');

    if (!isLoggedIn) {
      const errors = validateForm(enquiryForm.name, enquiryForm.email, enquiryForm.phone);
      if (!enquiryForm.otp || !enquiryForm.otp.trim()) {
        errors.otp = "OTP is required";
      }
      if (Object.keys(errors).length > 0) {
        setEnquiryErrors(errors);
        return;
      }
      setEnquiryErrors({});
    }

    setBookingLoading(true);
    try {
      let response;
      if (isLoggedIn) {
        let messageBody = `[Inquiry from Detail Page]\nName: ${leadName}\nPhone: ${leadPhone}\nEmail: ${leadEmail}\nAgent Status: ${isAgent ? 'Real Estate Agent' : 'Individual/Buyer'}\nMessage: ${enquiryForm.message || 'Interested in this property.'}`;
        response = await enquiryService.create({
          propertyId: id,
          enquiryType: 'callback',
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          message: messageBody,
          preferredDate: new Date(),
          timeSlot: '',
          budget: property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || 0
        });
      } else {
        response = await authService.lazyEnquiryLogin({
          name: enquiryForm.name,
          email: enquiryForm.email,
          phone: enquiryForm.phone,
          otp: enquiryForm.otp,
          message: enquiryForm.message,
          propertyId: id
        });
      }

      if (response.success) {
        toast.success("Enquiry submitted successfully!");
        setShowEnquiryModal(false);
        setOtpSent(false);
        setEnquiryForm({ name: '', email: '', phone: '', otp: '', message: 'Interested in this property.' });
        setEnquiryErrors({});
        
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          setLeadName(response.user.name || '');
          setLeadPhone(response.user.phone || '');
          setLeadEmail(response.user.email || '');
          window.dispatchEvent(new Event('storage'));
        }

        await handleRevealContact();
      } else {
        toast.error(response.message || "Failed to submit enquiry");
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit enquiry");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleEnquiryButtonClick = (actionType = 'view_number') => {
    if (!agreedTerms) {
      toast.error("Please agree to the Terms & Conditions");
      return;
    }
    if (revealedNumber) {
      if (actionType === 'call') window.location.href = `tel:${revealedNumber}`;
      else if (actionType === 'whatsapp') {
        const propertyName = property?.name || property?.propertyName || 'this property';
        const msg = encodeURIComponent(`Hi, I am interested in property "${propertyName}" listed on Get Right Home.`);
        window.open(`https://wa.me/${revealedNumber}?text=${msg}`, '_blank');
      }
      return;
    }

    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      handleDirectLoggedInEnquiry();
      handleRevealContact(actionType);
      return;
    }

    let targetType = 'Owner';
    if (property.partnerId) {
      targetType = property.partnerId.role === 'builder' ? 'Builder' : 'Broker';
    }

    openEnquiryModal({
      targetId: id,
      targetType: targetType,
      actionType: actionType,
      onSuccess: () => {
        handleDirectLoggedInEnquiry();
        handleRevealContact(actionType);
      }
    });
  };

  const handleRevealContact = async (actionType = 'view_number') => {
    if (revealLoading) return;
    setRevealLoading(true);
    try {
      const response = await propertyService.revealContact(id);
      if (response.success) {
        setRevealedNumber(response.contactNumber);
        
        const contact = response.contactNumber;
        if (actionType === 'call') {
          window.location.href = `tel:${contact}`;
        } else if (actionType === 'whatsapp') {
          const propertyName = property?.name || property?.propertyName || 'this property';
          const msg = encodeURIComponent(`Hi, I am interested in property "${propertyName}" listed on Get Right Home.`);
          window.open(`https://wa.me/${contact}?text=${msg}`, '_blank');
        } else {
          toast.success("Contact number revealed!");
        }
      } else {
        toast.error(response.message || "Failed to reveal contact");
      }
    } catch (error) {
      const errData = error.response?.data || error;
      if (errData?.limitReached) {
        toast.error("This seller has reached their monthly lead limit. Please try again next month or contact another seller.", { duration: 5000 });
      } else {
        toast.error(errData?.message || "Failed to reveal contact");
      }
    } finally {
      setRevealLoading(false);
    }
  };

  const formatPriceLakhCrore = (price) => {
    if (!price || isNaN(price)) return 'Price on Request';
    const num = Number(price);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const maskPhone = (phone) => {
    if (!phone || phone === 'N/A') return 'N/A';
    const str = String(phone).trim();
    if (str.length < 5) return str;
    let cleanStr = str;
    let countryPrefix = '';
    if (str.startsWith('+91')) {
      cleanStr = str.substring(3).trim();
      countryPrefix = '+91 ';
    } else if (str.startsWith('+')) {
      const parts = str.split(' ');
      if (parts.length > 1) {
        countryPrefix = parts[0] + ' ';
        cleanStr = parts.slice(1).join('');
      } else {
        countryPrefix = str.substring(0, 3) + ' ';
        cleanStr = str.substring(3);
      }
    }
    return `${countryPrefix}${cleanStr.substring(0, 4)}XXXXXX${cleanStr.substring(cleanStr.length - 2)}`;
  };

  const dbPhone = property?.contactNumber || property?.partnerId?.phone || property?.userId?.phone || 'N/A';
  const displayPhone = revealedNumber ? revealedNumber : maskPhone(dbPhone);
  const sellerName = property?.partnerId?.name || property?.userId?.name || 'Umesh Diwakar';
  const memberSinceDate = property?.partnerId?.createdAt || property?.userId?.createdAt || '';
  const memberSinceText = memberSinceDate ? `Member Since ${formatMemberSince(memberSinceDate)}` : 'Member Since Jan 2023';
  const listedCount = property?.partnerId?.listedPropertiesCount || property?.userId?.listedPropertiesCount || 46;
  const verifiedCount = property?.partnerId?.verifiedPropertiesCount || property?.userId?.verifiedPropertiesCount || 12;

  const localityName = property?.address?.locality || property?.address?.area || property?.address?.city || '';
  const totalLocalityReviews = localityStats?.totalReviews || 0;
  const avgLocalityRating = localityStats?.averageRating || localityStats?.avgRating || 0;
  const getStarPercentage = (starVal) => {
    const dist = localityStats?.ratingDistribution || localityStats?.ratingsBreakdown || {};
    const count = dist[starVal] || 0;
    if (totalLocalityReviews <= 0) return 0;
    return Math.round((count / totalLocalityReviews) * 100);
  };
  const featureRatings = [
    { title: 'Connectivity', val: localityStats?.connectivity ? `${localityStats.connectivity.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.connectivity ? `${localityStats.ratingsByFeature.connectivity.toFixed(1)}/5` : '0/5'), percent: localityStats?.connectivity ? Math.round(localityStats.connectivity * 20) : (localityStats?.ratingsByFeature?.connectivity ? Math.round(localityStats.ratingsByFeature.connectivity * 20) : 0) },
    { title: 'Lifestyle', val: localityStats?.lifestyle ? `${localityStats.lifestyle.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.lifestyle ? `${localityStats.ratingsByFeature.lifestyle.toFixed(1)}/5` : '0/5'), percent: localityStats?.lifestyle ? Math.round(localityStats.lifestyle * 20) : (localityStats?.ratingsByFeature?.lifestyle ? Math.round(localityStats.ratingsByFeature.lifestyle * 20) : 0) },
    { title: 'Safety', val: localityStats?.safety ? `${localityStats.safety.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.safety ? `${localityStats.ratingsByFeature.safety.toFixed(1)}/5` : '0/5'), percent: localityStats?.safety ? Math.round(localityStats.safety * 20) : (localityStats?.ratingsByFeature?.safety ? Math.round(localityStats.ratingsByFeature.safety * 20) : 0) },
    { title: 'Green Area', val: localityStats?.greenArea ? `${localityStats.greenArea.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.greenArea ? `${localityStats.ratingsByFeature.greenArea.toFixed(1)}/5` : '0/5'), percent: localityStats?.greenArea ? Math.round(localityStats.greenArea * 20) : (localityStats?.ratingsByFeature?.greenArea ? Math.round(localityStats.ratingsByFeature.greenArea * 20) : 0) }
  ];
  const localityPositives = localityStats?.positives || [];
  const localityNegatives = localityStats?.negatives || [];

  return (
    <div className="bg-[#f8fafe] min-h-screen pb-32 pt-28 text-gray-800 font-sans selection:bg-blue-100 antialiased">
      
      {/* Premium Top Navigation Action Bar */}
      <div className="fixed top-0 w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 z-40 transition-all">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => goBackOrHome(navigate)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider line-clamp-1">
              {property?.propertyType} {property?.transactionType ? `· ${property.transactionType}` : ''}
            </span>
              <span className="text-sm font-bold text-gray-900 line-clamp-1">
                {name || 'Property Details'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <Share2 size={19} />
            </button>
            <button onClick={handleToggleSave} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Heart size={19} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'} />
            </button>
          </div>
        </div>

        {/* Scroll link Horizontal Navigation Tabs */}
        <div 
          ref={tabsContainerRef}
          className="max-w-xl mx-auto px-3 border-t border-gray-50 flex items-center gap-1 overflow-x-auto hide-scrollbar py-2 bg-white"
        >
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'highlights', label: 'Highlights' },
            { id: 'property-details', label: 'Property Details' },
            { id: 'photos', label: 'Photos' },
            { id: 'facilities', label: 'Facilities' },
            { id: 'compare', label: 'Compare' },
            { id: 'explore-locality', label: 'Explore Locality' }
          ].map(tab => (
            <button
              key={tab.id}
              data-active={activeTab === tab.id ? 'true' : 'false'}
              onClick={() => scrollToSection(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-[#0061df]'
                  : 'text-gray-500 hover:text-gray-900 bg-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Single Column Container - Match Premium Mobile View */}
      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">

        {/* 1. SECTION: HERO IMAGE GALLERY (id="overview") */}
        <div id="overview" className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group">
          <div className="relative h-[250px] bg-slate-900">
            <img
              src={mainImage}
              alt={name}
              onClick={() => setShowImageModal(true)}
              className="w-full h-full object-cover cursor-zoom-in"
            />
            
            {/* Top Verified Indicator overlay */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              {isVerified && (
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 shadow">
                  <Shield size={10} className="fill-white text-emerald-600" />
                  Verified
                </span>
              )}
              {isFeatured && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  Featured
                </span>
              )}
            </div>

            {/* Price Overlay tag inside image block like 99acres (Image 5) */}
            <div className="absolute bottom-4 left-4 text-white z-10 drop-shadow-md">
              <h2 className="text-2xl font-black flex items-baseline gap-1">
                {formatPriceLakhCrore(bookingBarPrice)}
                {(isRentGroup || isPgGroup) && <span className="text-xs font-medium opacity-85">/mo</span>}
              </h2>
              <p className="text-[10px] opacity-90 font-medium">
                {property?.dynamicData?.priceNegotiable === 'Yes' || property?.isNegotiable ? 'Negotiable' : 'Non-negotiable'}
                {property?.dynamicData?.brokersOk === 'Yes' ? ', Brokers OK' : ''}
                {property?.dynamicData?.maintenanceCharges ? `, ₹${Number(property.dynamicData.maintenanceCharges).toLocaleString('en-IN')} maintenance` : ''}
              </p>
              <button 
                onClick={() => setShowOffersModal(true)} 
                className="mt-1 bg-white/20 backdrop-blur-md border border-white/25 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all text-white"
              >
                See Price Details <ChevronRight size={10} />
              </button>
            </div>

            {/* Carousel navigation indicators */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm border border-white/10 active:scale-90"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm border border-white/10 active:scale-90"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                  <Camera size={11} /> {currentImageIndex + 1}/{galleryImages.length}
                </div>
              </>
            )}
          </div>

          {/* Quick Checklist beneath cover image — shows first 4 highlights or graceful static fallback */}
          <div className="p-4 bg-[#f8fbff] grid grid-cols-2 gap-y-2 gap-x-4 border-t border-gray-50 text-[11px] font-bold text-slate-700">
            {property.highlights && property.highlights.length > 0
              ? property.highlights.slice(0, 4).map((hl, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">✓</span> {hl}
                  </div>
                ))
              : [
                  property.buyDetails?.facing ? `${property.buyDetails.facing} Facing` : null,
                  property.rentDetails?.furnishing || null,
                  property.dynamicData?.gatedCommunity === 'Yes' ? 'Gated Society' : null,
                  property.transactionType?.includes('Sell') ? 'Ready to Move In' : null,
                  property.dynamicData?.availability || null,
                  property.dynamicData?.waterSupply ? `${property.dynamicData.waterSupply} Water` : null
                ].filter(Boolean).slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">✓</span> {item}
                  </div>
                ))
            }
          </div>
        </div>

        {/* 2. SECTION: CORE DETAILS & TITLE */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#eff6ff] text-[#0061df] text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">
              {propertyType}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200 uppercase">
              ID: {property?.propertyId || id?.substring(id?.length - 6).toUpperCase()}
            </span>
            <span className="text-[10px] text-gray-400 font-medium ml-auto">
              {property?.createdAt
                ? (() => {
                    const diff = Date.now() - new Date(property.createdAt).getTime();
                    const days = Math.floor(diff / 86400000);
                    const hours = Math.floor(diff / 3600000);
                    const mins = Math.floor(diff / 60000);
                    return days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : `${mins}m ago`;
                  })()
                : 'Recently posted'
              } by {property?.partnerId ? 'Partner' : property?.userId ? 'Owner' : 'Dealer'}
            </span>
          </div>

          <h1 className="text-base font-bold text-gray-900 leading-snug">
            {name}{
              (address?.locality || address?.area || address?.city)
                ? ` in ${[address?.locality || address?.area, address?.city].filter(Boolean).join(', ')}`
                : ''
            }
          </h1>

          <div className="flex items-start gap-1.5 text-gray-500 text-xs">
            <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <span className="leading-tight">
              {address?.fullAddress || `${address?.locality}, ${address?.city}, ${address?.state}`}
            </span>
          </div>

          {/* Nearby Places Pills — from DB or count badge */}
          {nearbyPlaces && nearbyPlaces.length > 0 && (
            <div className="pt-2 border-t border-gray-50">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                {nearbyPlaces.length} Places Nearby
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
                {nearbyPlaces.slice(0, 6).map((place, idx) => (
                  <span key={idx} className="bg-gray-50 hover:bg-gray-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full border border-gray-150 whitespace-nowrap cursor-pointer transition-colors">
                    {place.name} {place.distanceKm ? `· ${place.distanceKm}km` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. SECTION: HIGHLIGHT CIRCULAR WIDGET MATRIX */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {getCircularWidgets().map((widget, i) => {
              const Icon = widget.icon;
              return (
                <div key={i} className="flex flex-col items-center justify-center space-y-1">
                  <div className={`w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center ${widget.color}`}>
                    {Icon ? <Icon size={18} /> : <span className="text-xs font-black">{widget.symbol}</span>}
                  </div>
                  <span className="text-[10px] font-bold text-gray-800 line-clamp-2 leading-tight">{widget.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. SECTION: KEY HIGHLIGHTS BOX & ...more (id="highlights") */}
        <div id="highlights" className="bg-[#fffdf7] border border-[#fdf3da]/60 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#fdf3da] flex items-center justify-center text-[#d97706]">
              <Award size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Key Highlights</h3>
              <p className="text-[10px] text-slate-500">Why you should choose this property</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2 text-xs font-semibold text-slate-700">
            {property.highlights && property.highlights.length > 0 ? (
              property.highlights.slice(0, 3).map((hl, idx) => {
                const isLast = idx === Math.min(property.highlights.length, 3) - 1;
                const hasMore = property.highlights.length > 3;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                    <span>
                      {hl}
                      {isLast && hasMore && (
                        <button
                          onClick={() => setShowHighlightsModal(true)}
                          className="text-[#0061df] font-bold ml-1 hover:underline focus:outline-none"
                        >
                          ...more
                        </button>
                      )}
                    </span>
                  </div>
                );
              })
            ) : property.amenities && property.amenities.length > 0 ? (
              property.amenities.slice(0, 3).map((am, idx) => {
                const isLast = idx === Math.min(property.amenities.length, 3) - 1;
                const hasMore = property.amenities.length > 3;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                    <span>
                      {am}
                      {isLast && hasMore && (
                        <button
                          onClick={() => setShowHighlightsModal(true)}
                          className="text-[#0061df] font-bold ml-1 hover:underline focus:outline-none"
                        >
                          ...more
                        </button>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
                <div className="text-gray-500 text-xs italic">Highlights available on request</div>
            )}
          </div>

          {/* 24-Hour View Banner */}
          <div className="bg-[#eff6ff] rounded-xl p-3 border border-blue-50 flex items-center gap-2 text-[11px] font-semibold text-[#0061df]">
            <Users size={14} className="shrink-0 text-blue-500" />
            <span>
              {property.viewCount && property.viewCount > 0
                ? `${property.viewCount} people viewed this property recently`
                : 'Be among the first to enquire about this property'
              }
            </span>
          </div>
        </div>

        {/* 5. SECTION: PROPERTY DETAILS SPECIFICATION TABLE (id="property-details") */}
        <div id="property-details" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-gray-50 pb-2">Property Details</h3>
          
          <div className="space-y-2">
            {getSpecs().map((spec, i) => (
              <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-b-0">
                <span className="text-slate-500 font-medium">{spec.label}</span>
                <span className="text-slate-900 font-bold">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. SECTION: PHOTO ALBUMS GRID / TAKE A TOUR (id="photos") */}
        <div id="photos" className="bg-[#ffffff] rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Take a tour of the Property</h3>
            <p className="text-[10px] text-gray-500">With photos and videos</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(() => {
              const rawImages = property?.propertyImages || property?.images?.gallery || galleryImages || [];
              const tagsObj = property?.propertyImages_tags || property?.dynamicData?.propertyImages_tags || property?.imageTags || {};
              
              const grouped = {};
              rawImages.forEach((imgUrl, i) => {
                let tag = tagsObj[i] || tagsObj[String(i)] || (i === 0 ? 'Entrance' : (i === 1 ? 'Hall' : (i === 2 ? 'Bedroom' : 'Exterior')));
                if (!tag) tag = 'Property View';
                if (!grouped[tag]) {
                  grouped[tag] = { title: tag, count: 0, img: imgUrl };
                }
                grouped[tag].count += 1;
              });

              const albums = Object.values(grouped);
              const tourList = albums.length > 0 ? albums : [
                { title: 'Full Gallery', count: rawImages.length, img: rawImages[0] || '/placeholder-property.jpg' }
              ];

              return tourList.map((album, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentImageIndex(idx % galleryImages.length);
                    setShowImageModal(true);
                  }}
                  className={`relative rounded-xl overflow-hidden h-[75px] cursor-pointer group ${
                    idx === 0 ? 'col-span-3 h-[130px]' : 'col-span-1'
                  }`}
                >
                  <img src={album.img} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                  
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white shadow-sm">
                    {album.title}
                  </span>
                  
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-0.5">
                    <Camera size={9} /> {album.count}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* 6b. SECTION: PROPERTY VIDEO (shown only if videoUrl exists) */}
        {property?.videoUrl && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Property Video</h3>
              <p className="text-[10px] text-gray-500">Watch the property walkthrough</p>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-100">
              <video
                src={property.videoUrl}
                controls
                controlsList="nodownload"
                preload="metadata"
                playsInline
                className="w-full max-h-[320px] object-contain rounded-2xl"
                poster={galleryImages?.[0] || undefined}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* 7. SECTION: FACILITIES & AMENITIES (id="facilities") */}
        <div id="facilities" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          
          {/* Essential Facilities */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Essential Facilities</h3>
              <p className="text-[10px] text-gray-500">Core amenities already setup</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
              {property.topAmenities && property.topAmenities.length > 0 ? (
                property.topAmenities.map((am, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span className="line-clamp-1">{am}</span>
                  </div>
                ))
              ) : property.amenities && property.amenities.length > 0 ? (
                property.amenities.slice(0, 8).map((am, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span className="line-clamp-1">{am}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-xs italic col-span-2">Facilities available on request</div>
              )}
            </div>
          </div>

          {/* Other Key Facilities Horizontal scroll with view all */}
          <div className="pt-3 border-t border-slate-50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Other Key Facilities</span>
              <button
                onClick={() => setShowAllAmenitiesModal(true)}
                className="text-xs font-bold text-[#0061df] hover:underline"
              >
                View all ({(property.topAmenities?.length || 0) + (property.otherAmenities?.length || 0) || (property.amenities?.length || 0)})
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {property.otherAmenities && property.otherAmenities.length > 0 ? (
                property.otherAmenities.slice(0, 5).map((am, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-center min-w-[120px] shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 shadow-sm">
                      <Grid size={14} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-1">{am}</span>
                  </div>
                ))
              ) : property.amenities && property.amenities.length > 8 ? (
                property.amenities.slice(8, 13).map((am, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-center min-w-[120px] shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 shadow-sm">
                      <Grid size={14} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-1">{am}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-xs italic">Other amenities available on request</div>
              )}
            </div>
          </div>
        </div>

        {/* HOTEL ONLY SECTION: Room availability wizard selection */}
        {!isWholeUnit && inventory && inventory.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-slate-900">Choose Room Type</h3>
              <p className="text-[10px] text-gray-500">Required if booking beds or rooms</p>
            </div>

            <div className="space-y-3">
              {inventory.map((room) => (
                <div
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`border rounded-xl p-3 cursor-pointer transition-all relative ${
                    selectedRoom?._id === room._id ? 'border-[#0061df] bg-blue-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-bold text-xs text-slate-800">{room.type}</h4>
                    <span className="font-bold text-xs text-[#0061df]">₹{getRoomPrice(room)}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mb-2">{room.description}</p>
                  
                  <div className="flex gap-1.5 flex-wrap">
                    {room.bathroomType && (
                      <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                        {room.bathroomType}
                      </span>
                    )}
                    {room.roomCategory && (
                      <span className="text-[8px] bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                        {room.roomCategory}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. SECTION: ABOUT PROPERTY (DESCRIPTION) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-slate-900">About Property</h3>
          {address && (
            <p className="text-xs font-semibold text-slate-500">
              Address: {address.fullAddress || [address.houseNumber, address.locality, address.city, address.state].filter(Boolean).join(', ')}
            </p>
          )}
          
          <div className="text-xs text-slate-600 leading-relaxed font-medium">
            {description || 'Detailed property information has not been provided yet. Please contact the owner/dealer for more details.'}
          </div>
        </div>


        {/* 10. SECTION: RECENT VIEWS COMPARE SLIDER (id="compare") */}
        <div id="compare" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          
          {/* Compare Recent Views */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Compare your recent views</h3>
              <p className="text-[10px] text-gray-500">Find the home that best matches your requirements</p>
            </div>

            {/* Horizontal side by side vs items */}
            <div className="flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar py-2 w-full">
              
              {/* Current Property */}
              <div 
                onClick={() => navigateToProperty(property)}
                className="p-3 rounded-2xl border border-slate-200 bg-white min-w-[210px] w-[210px] shrink-0 text-left relative shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md z-10">
                  Current
                </span>
                <img 
                  src={(galleryImages && galleryImages[0]) || "/placeholder-property.jpg"} 
                  className="w-full h-28 object-cover rounded-xl mb-2 group-hover:scale-102 transition-transform duration-300 shadow-sm" 
                />
                <h4 className="text-[12px] font-extrabold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{property?.propertyName || property?.name}</h4>
                <p className="text-[13px] text-slate-950 font-black mt-1">
                  {property?.buyDetails?.expectedPrice
                    ? formatPriceLakhCrore(property.buyDetails.expectedPrice)
                    : property?.rentDetails?.monthlyRent
                      ? `₹${property.rentDetails.monthlyRent.toLocaleString('en-IN')}/mo`
                      : property?.dynamicData?.expectedPrice
                        ? formatPriceLakhCrore(property.dynamicData.expectedPrice)
                        : property?.dynamicData?.monthlyRent
                          ? `₹${Number(property.dynamicData.monthlyRent).toLocaleString('en-IN')}/mo`
                          : property?.startingPrice
                            ? formatPriceLakhCrore(property.startingPrice)
                            : 'Contact for Price'}
                </p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-extrabold">
                  <span className="uppercase">by {property?.partnerId ? 'Partner' : 'Owner'}</span>
                  <span className="text-indigo-600 font-bold hover:underline">View →</span>
                </div>
              </div>

              {/* Loop over comparison items */}
              {((recentProperties && recentProperties.length > 0) ? recentProperties.slice(0, 2) : (similarProperties && similarProperties.length > 0 ? similarProperties.slice(0, 2) : [])).map((item, idx) => {
                const itemPrice = item.buyDetails?.expectedPrice
                  ? formatPriceLakhCrore(item.buyDetails.expectedPrice)
                  : item.rentDetails?.monthlyRent
                    ? `₹${item.rentDetails.monthlyRent.toLocaleString('en-IN')}/mo`
                    : item.dynamicData?.expectedPrice
                      ? formatPriceLakhCrore(item.dynamicData.expectedPrice)
                      : item.dynamicData?.monthlyRent
                        ? `₹${Number(item.dynamicData.monthlyRent).toLocaleString('en-IN')}/mo`
                        : item.startingPrice
                          ? formatPriceLakhCrore(item.startingPrice)
                          : 'Contact for Price';
                const itemCover = item.images?.cover || item.images?.gallery?.[0] || item.coverImage || (item.propertyImages?.[0]) || "/placeholder-property.jpg";

                return (
                  <React.Fragment key={item._id}>
                    <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm mx-1">
                      VS
                    </div>

                    <div 
                      onClick={() => navigateToProperty(item)}
                      className="p-3 rounded-2xl border border-slate-150 bg-white min-w-[210px] w-[210px] shrink-0 text-left relative shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <img 
                        src={itemCover} 
                        className="w-full h-28 object-cover rounded-xl mb-2 group-hover:scale-102 transition-transform duration-300 shadow-sm" 
                      />
                      <h4 className="text-[12px] font-extrabold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{item.propertyName || item.name}</h4>
                      <p className="text-[13px] text-slate-950 font-black mt-1">{itemPrice}</p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-extrabold">
                        <span className="uppercase">by {item.partnerId ? 'Partner' : 'Owner'}</span>
                        <span className="text-indigo-600 font-bold hover:underline">View →</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* If no other items, show an add comparison helper */}
              {(!recentProperties || recentProperties.length === 0) && (!similarProperties || similarProperties.length === 0) && (
                <>
                  <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm mx-1">
                    VS
                  </div>
                  <div 
                    onClick={() => navigate(`/compare?ids=${property?._id}`)}
                    className="p-3 rounded-2xl border border-dashed border-slate-350 bg-slate-50/50 min-w-[210px] w-[210px] h-[190px] shrink-0 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-3xl text-indigo-500 font-bold mb-1">+</span>
                    <span className="text-[11px] font-extrabold text-slate-500">Choose to compare</span>
                  </div>
                </>
              )}

            </div>

            <button 
              onClick={() => {
                const comparisonList = (recentProperties && recentProperties.length > 0)
                  ? recentProperties.slice(0, 2)
                  : (similarProperties && similarProperties.length > 0 ? similarProperties.slice(0, 2) : []);
                const ids = [property?._id, ...comparisonList.map(item => item._id)].join(',');
                navigate(`/compare?ids=${ids}`);
              }}
              className="w-full py-2.5 bg-white border border-[#0061df] text-[#0061df] rounded-xl text-xs font-bold hover:bg-blue-50/50 active:scale-98 transition-all text-center block"
            >
              View Comparison
            </button>
          </div>

          {/* Owner / Partner other properties */}
          <div className="pt-4 border-t border-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {property?.partnerId ? 'Partner' : 'Owner'} Properties
            </h4>
            
            {similarProperties && similarProperties.length > 0 ? (
              <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50 p-2 flex gap-3 items-center">
                <img
                  src={similarProperties[0]?.images?.cover || similarProperties[0]?.images?.gallery?.[0] || galleryImages[0]}
                  className="w-16 h-16 object-cover rounded-lg shadow-sm"
                />
                <div className="flex-1">
                  <span className="bg-slate-200 text-slate-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                    {similarProperties[0]?.buyDetails?.expectedPrice
                      ? formatPriceLakhCrore(similarProperties[0].buyDetails.expectedPrice)
                      : similarProperties[0]?.dynamicData?.expectedPrice
                        ? formatPriceLakhCrore(similarProperties[0].dynamicData.expectedPrice)
                        : 'Contact for Price'}
                  </span>
                  <h5 className="text-xs font-bold text-gray-800 line-clamp-1 mt-1">
                    {similarProperties[0]?.name || 'Similar Property'}
                  </h5>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {similarProperties[0]?.address?.locality || similarProperties[0]?.address?.city || ''}
                  </p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                    {property?.partnerId ? 'By Partner' : 'By Owner'}
                    {similarProperties[0]?.createdAt ? ` · ${(() => {
                      const diff = Date.now() - new Date(similarProperties[0].createdAt).getTime();
                      const days = Math.floor(diff / 86400000);
                      return days > 0 ? `${days}d ago` : 'Today';
                    })()}` : ''}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-semibold text-center py-3">
                No other listings found
              </div>
            )}

            <div className="bg-[#eff6ff] rounded-xl p-3 border border-blue-50 flex items-center gap-2 text-[10px] font-semibold text-[#0061df]">
              <User size={13} className="text-blue-500" />
              <span>
                {property?.enquiryCount && property.enquiryCount > 0
                  ? `${property.enquiryCount}+ people contacted for this property recently`
                  : 'Be among the first to enquire about this property'
                }
              </span>
            </div>
          </div>

          {/* Compare with similar homes list carousel */}
          <div className="pt-4 border-t border-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Compare with Similar Homes</h4>
            
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
              {similarProperties && similarProperties.length > 0 ? (
                similarProperties.map((simItem, i) => {
                  const simPrice = simItem.buyDetails?.expectedPrice 
                    ? `₹${(simItem.buyDetails.expectedPrice / 100000).toFixed(1)} Lac` 
                    : (simItem.rentDetails?.monthlyRent ? `₹${simItem.rentDetails.monthlyRent.toLocaleString('en-IN')}/mo` 
                    : (simItem.dynamicData?.expectedPrice ? formatPriceLakhCrore(simItem.dynamicData.expectedPrice)
                    : (simItem.dynamicData?.monthlyRent ? `₹${Number(simItem.dynamicData.monthlyRent).toLocaleString('en-IN')}/mo`
                    : 'Contact for Price')));
                  const simName = simItem.propertyName || simItem.name || 'Property';
                  const simLocality = simItem.address?.locality || simItem.address?.area || simItem.address?.city || '';
                  const simCover = simItem.coverImage || 
                                   simItem.images?.cover || 
                                   (Array.isArray(simItem.propertyImages) && simItem.propertyImages[0]) || 
                                   (Array.isArray(simItem.images?.gallery) && simItem.images.gallery[0]) || 
                                   (Array.isArray(simItem.photos) && simItem.photos[0]) || 
                                   "/placeholder-property.jpg";
                  const ratingVal = simItem.avgRating || 0;

                  return (
                    <div key={i} onClick={() => navigateToProperty(simItem)} className="bg-white rounded-xl border border-slate-150 p-3 w-[150px] shrink-0 shadow-sm hover:border-[#0061df] transition-colors cursor-pointer">
                      <img src={simCover} className="w-full h-16 object-cover rounded-lg mb-1.5" />
                      <h5 className="text-[10px] font-bold text-gray-800 line-clamp-1">{simName}</h5>
                      <p className="text-[10px] text-slate-500 font-bold line-clamp-1">{simLocality}</p>
                      
                      {ratingVal > 0 && (
                        <div className="flex items-center gap-1 my-1 text-[9px] text-[#d97706] font-bold">
                          <Star size={9} className="fill-[#d97706]" /> {ratingVal.toFixed(1)}
                        </div>
                      )}

                      <p className="text-xs font-extrabold text-gray-900">{simPrice}</p>
                      <p className="text-[8px] text-slate-400 font-semibold">{simItem.propertyType ? (simItem.propertyType.charAt(0).toUpperCase() + simItem.propertyType.slice(1)) : 'Residential'}</p>
                    </div>
                  );
                })
              ) : (
                <div className="w-full py-6 text-center text-xs text-slate-400 font-semibold">
                  No similar properties found in this area
                </div>
              )}
            </div>
            
            {similarProperties && similarProperties.length > 0 && (
              <button
                onClick={() => navigate(`/properties?city=${address?.city || ''}&type=${propertyType || ''}`)}
                className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 active:scale-98 transition-all text-center block"
              >
                View more similar properties
              </button>
            )}
          </div>
        </div>

        {/* 11. SECTION: LOCALITY REVIEWS DETAILS (id="explore-locality") */}
        <div id="explore-locality" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Locality Reviews</h3>
              <p className="text-[10px] text-gray-500">For {localityName}</p>
            </div>
            <button
              onClick={() => navigate(`/locality-reviews?locality=${encodeURIComponent(localityName)}`)}
              className="text-xs font-bold text-[#0061df] hover:underline"
            >
              View all
            </button>
          </div>

          {/* Average Rating Block */}
          <div className="flex items-center gap-6 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="text-center">
              <h4 className="text-2xl font-black text-slate-900 leading-none">{avgLocalityRating.toFixed(1)}<span className="text-sm text-slate-400 font-normal"> / 5</span></h4>
              <div className="flex items-center gap-0.5 justify-center mt-1 text-[#d97706]">
                {[1, 2, 3, 4, 5].map((starIdx) => {
                  const isFull = starIdx <= Math.floor(avgLocalityRating);
                  return (
                    <Star key={starIdx} size={11} className={isFull ? "fill-[#d97706] text-[#d97706]" : "text-slate-300"} />
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Average Rating</p>
              <p className="text-[8px] text-slate-400">({totalLocalityReviews} Total Reviews)</p>
            </div>

            {/* Bars */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((starVal) => {
                const percentage = getStarPercentage(starVal);
                return (
                  <div key={starVal} className="flex items-center gap-2 text-[9px] font-bold text-slate-600">
                    <span className="w-1">{starVal}</span>
                    <Star size={7} className="fill-slate-400 text-slate-400" />
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="w-4 text-right opacity-70">{starVal === 5 ? '5★' : `${starVal}★`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <a href="#ratings-calc" className="block text-xs font-bold text-[#0061df] hover:underline">
            See how ratings are calculated
          </a>

          {/* Ratings by Features - progress circle indicators style */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900">Ratings by features</h4>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              {featureRatings.map((feat, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center">
                  <div className="relative w-12 h-12 flex items-center justify-center mb-1">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="18" className="stroke-slate-100 fill-transparent" strokeWidth="3" />
                      <circle cx="24" cy="24" r="18" className="stroke-[#0061df] fill-transparent" strokeWidth="3"
                        strokeDasharray={113} strokeDashoffset={113 - (113 * feat.percent) / 100} strokeLinecap="round" />
                    </svg>
                    <span className="text-[9px] font-black text-gray-800">{feat.val.split('/')[0]}</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-600 leading-tight">{feat.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Positives & Negatives List tags */}
          {(localityPositives.length > 0 || localityNegatives.length > 0) ? (
            <div className="space-y-3 pt-2 border-t border-slate-50">
              {localityPositives.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-slate-900">What are the positives</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {localityPositives.map((pos, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-100">
                        {pos}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {localityNegatives.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-slate-900">What are the negatives</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {localityNegatives.map((neg, i) => (
                      <span key={i} className="bg-red-50 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded border border-red-100">
                        {neg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-50">
              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-center my-1">
                <p className="text-[11px] text-slate-600 font-semibold">No resident feedback tags for {localityName || 'this locality'} yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Be the first to share your experience!</p>
              </div>
            </div>
          )}

          {/* Reviews by Residents Horizontal scroll list */}
          <div className="space-y-3 pt-3 border-t border-slate-50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900">Reviews by Residents</span>
              <button onClick={() => navigate('/insights/' + encodeURIComponent(localityName) + '/reviews')} className="text-xs font-bold text-[#0061df] hover:underline">View all</button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
              {localityReviews && localityReviews.length > 0 ? (
                localityReviews.map((rev, idx) => {
                  const ratingVal = rev.rating || 4.0;
                  const reviewerName = rev.reviewerName || rev.userId?.name || rev.name || 'Anonymous';
                  const role = rev.reviewerType || rev.role || 'Resident';
                  const duration = rev.stayDuration ? ` | living since ${rev.stayDuration}` : '';
                  const timeAgo = rev.createdAt ? `${new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '1mo ago';
                  return (
                    <div key={idx} className="bg-slate-50/50 rounded-xl border border-slate-100 p-3 min-w-[220px] max-w-[260px] shrink-0 text-xs font-medium text-slate-700 relative">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">{ratingVal.toFixed(1)} ★</span>
                      </div>
                      <h6 className="text-[11px] font-bold text-slate-900 mb-1 line-clamp-1">{rev.title || 'Locality Rating'}</h6>
                      <p className="line-clamp-2 leading-relaxed opacity-95">{rev.reviewText || rev.review || 'No comment provided.'}</p>
                      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-[10px]">
                          {reviewerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-900 leading-none">{reviewerName}</p>
                          <p className="text-[8px] text-slate-400">{role}{duration} | {timeAgo}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full py-6 text-center text-xs text-slate-400 font-semibold bg-slate-50/50 rounded-xl border border-slate-100">
                  No reviews yet for this locality. Be the first to share your experience!
                </div>
              )}
            </div>

          <button
            onClick={() => setShowReviewForm(true)}
            className="w-full py-3 bg-[#0061df] hover:bg-blue-700 text-white rounded-xl text-xs font-bold hover:shadow-lg active:scale-98 transition-all text-center block"
          >
            Review your Society / Locality
          </button>
          </div>

          {/* Affordability EMI calculator Tool card */}
          <div className="pt-3 border-t border-slate-50">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Check your affordability</span>
            
            {(() => {
              const rawPrice = Number(bookingBarPrice) || Number(property?.buyDetails?.expectedPrice) || Number(property?.rentDetails?.monthlyRent) || 3000000;
              const principal = rawPrice > 100000 ? rawPrice : rawPrice * 100; // normalize
              const rate = 8.5 / 100 / 12; // 8.5% annual rate
              const tenure = 20 * 12; // 20 years in months
              const emi = principal > 0
                ? Math.round((principal * 0.8 * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1))
                : 0;

              return (
                <div 
                  onClick={() => navigate(`/home-loan-emi-calculator?amount=${principal}`)}
                  className="rounded-xl border border-slate-150 p-3 bg-white flex items-center justify-between cursor-pointer hover:border-[#0061df] transition-colors shadow-sm group active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Grid size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-[#0061df] transition-colors">Calculate EMI</h5>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {emi > 0 ? `Est. EMI ₹${emi.toLocaleString('en-IN')}/month · 20 yrs @8.5%` : 'Tap to calculate your loan EMI'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-[#0061df] transition-colors" />
                </div>
              );
            })()}
          </div>
        </div>

      </div>



      {/* Sticky Bottom Actions Bar (Matches Image 1) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 p-2.5 shadow-2xl z-50 max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          
          {/* WhatsApp Support */}
          <button
            onClick={() => {
              if (revealedNumber) {
                const msg = encodeURIComponent(`Hi, I am interested in property "${property?.name || property?.propertyName || 'this property'}" listed on Get Right Home.`);
                window.open(`https://wa.me/${revealedNumber}?text=${msg}`, '_blank');
              } else {
                handleEnquiryButtonClick('whatsapp');
              }
            }}
            className="flex-1 py-3 bg-white hover:bg-slate-50 text-emerald-600 border border-emerald-500 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            💬 WhatsApp
          </button>

          {/* Solid blue core action button */}
          <button
            onClick={() => {
              if (revealedNumber) {
                window.location.href = `tel:${revealedNumber}`;
              } else {
                handleEnquiryButtonClick('call');
              }
            }}
            className="flex-[2] py-3.5 bg-[#0061df] hover:bg-blue-700 text-white rounded-full text-xs font-bold flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
          >
            <span>{revealedNumber ? `📞 ${revealedNumber}` : 'View Number / Enquire'}</span>
          </button>

          {/* Call icon */}
          {revealedNumber ? (
            <a
              href={`tel:${revealedNumber}`}
              className="w-11 h-11 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all"
            >
              <Phone size={16} className="fill-current" />
            </a>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                handleEnquiryButtonClick('call');
              }}
              disabled={revealLoading}
              className="w-11 h-11 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-[#0061df] rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all"
            >
              {revealLoading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={16} className="fill-current" />}
            </button>
          )}

        </div>
      </div>

      {/* DRAWER MODAL 1: PROPERTY HIGHLIGHTS BOTTOM DRAWER */}
      <AnimatePresence>
        {showHighlightsModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHighlightsModal(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-xl rounded-t-[2rem] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-8"
            >
              {/* Drawer handle indicator */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="px-5 pb-3 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Property Highlights</h3>
                <button onClick={() => setShowHighlightsModal(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {property.highlights && property.highlights.length > 0 ? (
                  property.highlights.map((hl, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-700 border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0061df] flex items-center justify-center">
                        <CheckCircle size={12} />
                      </div>
                      <span>{hl}</span>
                    </div>
                  ))
                ) : (
                  [
                    { label: 'Full Power Backup', icon: Zap },
                    { label: 'Visitor Parking Available', icon: Car },
                    { label: 'Centrally Air Conditioned', icon: Wind },
                    { label: 'On-Call Maintenance Staff', icon: Sparkles },
                    { label: 'Overlooking Park', icon: Grid },
                    { label: 'Overlooking Main Road', icon: Move },
                    { label: 'Vaastu Compliant', icon: Compass },
                    { label: 'Natural Light', icon: Droplets },
                    { label: 'Air Rooms', icon: Wind },
                    { label: 'Spacious Interiors', icon: LayoutTemplate }
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-700 border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0061df] flex items-center justify-center">
                          <Icon size={12} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER MODAL 2: BUILDING AMENITIES VIEW ALL BOTTOM DRAWER */}
      <AnimatePresence>
        {showAllAmenitiesModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAllAmenitiesModal(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-xl rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-8"
            >
              {/* Drawer handle indicator */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="px-5 pb-3 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Building amenities</h3>
                <button onClick={() => setShowAllAmenitiesModal(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                
                {/* Top Amenities Grid (Matches Image 8) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top amenities</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {property.topAmenities && property.topAmenities.length > 0 ? (
                      property.topAmenities.map((am, i) => (
                        <div key={i} className="p-3 rounded-2xl flex flex-col items-center justify-center text-center bg-[#f0f7ff] text-blue-600 border border-blue-50">
                          <CheckCircle size={18} className="mb-1" />
                          <span className="text-[9px] font-bold leading-tight">{am}</span>
                        </div>
                      ))
                    ) : (
                      [
                        { title: 'Security / Fire Alarm', icon: Shield, bg: 'bg-[#fff5f5] text-red-500 border border-red-50' },
                        { title: 'Centrally Air Conditioned', icon: Wind, bg: 'bg-[#effbfb] text-teal-600 border border-teal-50' },
                        { title: 'Vaastu Compliant', icon: Compass, bg: 'bg-[#fffbf0] text-amber-600 border border-amber-50' },
                        { title: 'Visitor Parking', icon: Car, bg: 'bg-[#f0f7ff] text-blue-600 border border-blue-50' },
                        { title: 'Intercom Facility', icon: Phone, bg: 'bg-[#fffbf0] text-amber-600 border border-amber-50' },
                        { title: 'Park', icon: Grid, bg: 'bg-[#f0fff4] text-green-600 border border-green-50' },
                        { title: 'Fitness Centre / GYM', icon: Dumbbell, bg: 'bg-[#fff5f5] text-red-500 border border-red-50' },
                        { title: 'Maintenance Staff', icon: Sparkles, bg: 'bg-[#f0f7ff] text-blue-600 border border-blue-50' },
                        { title: 'Rain Water Harvesting', icon: Droplets, bg: 'bg-[#effbfb] text-teal-600 border border-teal-50' }
                      ].map((topA, i) => {
                        const Icon = topA.icon;
                        return (
                          <div key={i} className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center ${topA.bg}`}>
                            <Icon size={18} className="mb-1" />
                            <span className="text-[9px] font-bold leading-tight">{topA.title}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Other Amenities list */}
                <div className="space-y-2 pt-3 border-t border-slate-50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Other amenities</h4>
                  
                  <div className="space-y-2">
                    {property.otherAmenities && property.otherAmenities.length > 0 ? (
                      property.otherAmenities.map((am, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-700 py-1.5 border-b border-slate-50 last:border-0 last:pb-0">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span>{am}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-xs italic py-2">No additional amenities listed</div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN GALLERY IMAGE VIEW MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black animate-fadeIn">
          <div className="p-4 flex items-center justify-between text-white z-10 shrink-0">
            <div className="flex flex-col">
              <h3 className="font-bold text-sm line-clamp-1">{name}</h3>
              <p className="text-[10px] opacity-70">Image {currentImageIndex + 1} of {galleryImages.length}</p>
            </div>
            <button
              onClick={() => setShowImageModal(false)}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 w-full h-full relative flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
            <img
              src={galleryImages[currentImageIndex]}
              alt={`Gallery ${currentImageIndex}`}
              onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
              className="max-w-full max-h-full w-auto h-auto object-contain cursor-pointer shadow-2xl"
            />
          </div>

          <div className="p-4 flex justify-center gap-1.5 overflow-x-auto hide-scrollbar z-10 shrink-0">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                  idx === currentImageIndex ? 'border-[#0061df] scale-105' : 'border-transparent opacity-55'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* REVIEW SUBMIT MODAL */}
      <AnimatePresence>
        {showReviewForm && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowReviewForm(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-xl rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-8"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="px-5 pb-3 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Write a Review</h3>
                <button onClick={() => setShowReviewForm(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto">
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">How would you rate this property?</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={28}
                          className={`cursor-pointer transition-colors ${reviewData.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                          onClick={() => setReviewData({ ...reviewData, rating: star })}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Write your review</label>
                    <textarea
                      value={reviewData.comment || ''}
                      onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                      placeholder="Share your experience living here or about the locality..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#0061df] transition-colors resize-none"
                      rows={5}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitReviewLoading}
                    className="w-full py-3.5 bg-[#0061df] hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center shadow-lg active:scale-95 transition-all"
                  >
                    {submitReviewLoading ? <Loader2 className="animate-spin" size={18} /> : 'Submit Review'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFERS / PRICE BREAKDOWN MODAL */}
      {showOffersModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowOffersModal(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-[2rem] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-gray-900">Price Details Breakdown</h3>
              <button onClick={() => setShowOffersModal(false)} className="p-1 bg-slate-100 rounded-full text-slate-500">✕</button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto max-h-[50vh] text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Asking Base Price</span>
                <span className="font-extrabold text-slate-900">{formatPriceLakhCrore(bookingBarPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Brokerage Charges</span>
                <span>2% / Negotiable</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Stamp Duty & Registration</span>
                <span>Additional / standard rates</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-100 text-sm font-extrabold text-[#0061df]">
                <span>Total Expected Value</span>
                <span>{formatPriceLakhCrore(bookingBarPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PropertyDetailsPage;
