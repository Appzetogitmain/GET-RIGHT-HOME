import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Star, Heart, BadgeCheck, Phone, MessageCircle, ChevronRight, Share2, ChevronLeft, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService, propertyService, authService } from '../../services/apiService';
import toast from 'react-hot-toast';
import PropertyQuickViewModal from './PropertyQuickViewModal';
import { motion, AnimatePresence } from 'framer-motion';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23F1F5F9'/><text x='50%' y='50%' font-family='sans-serif' font-size='16' font-weight='bold' fill='%2394A3B8' dominant-baseline='middle' text-anchor='middle'>No Image Available</text></svg>";
const LOGO_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='100%' height='100%' fill='%23E2E8F0'/><text x='50%' y='50%' font-family='sans-serif' font-size='14' font-weight='bold' fill='%2364748B' dominant-baseline='middle' text-anchor='middle'>GRH</text></svg>";


const PropertyCard = ({ property, data, className = "", isSaved: initialIsSaved, isSearchPage = false }) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(initialIsSaved || false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  // Lazy Enquiry Modal States
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    otp: '',
    message: 'Interested in this property.'
  });
  const [enquiryErrors, setEnquiryErrors] = useState({});
  const [actionAfterLogin, setActionAfterLogin] = useState(null);

  useEffect(() => {
    if (initialIsSaved !== undefined) {
      setIsSaved(initialIsSaved);
    }
  }, [initialIsSaved]);

  const item = property || data;
  if (!item) return null;

  const { _id, name, address, images, propertyType, rating, startingPrice } = item;

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    if (!localStorage.getItem('user')) {
      toast.error("Please login to save properties");
      return;
    }
    if (saveLoading) return;
    setSaveLoading(true);
    const newState = !isSaved;
    setIsSaved(newState);
    try {
      await userService.toggleSavedHotel(_id || item.id);
      toast.success(newState ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      setIsSaved(!newState);
      toast.error("Failed to update wishlist");
    } finally {
      setSaveLoading(false);
    }
  };

  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/[`'"]/g, '').trim();
  };

  const displayName = name || item.propertyName || 'Untitled';
  const dynamicCatName = item.dynamicCategory?.displayName || item.dynamicCategory?.name;
  const typeRaw = (propertyType || item.propertyType || '').toString();
  const normalizedType = typeRaw
    ? typeRaw.toLowerCase() === 'pg'
      ? 'PG'
      : typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).toLowerCase()
    : '';
  const typeLabel = dynamicCatName
    ? dynamicCatName.toUpperCase()
    : (normalizedType || typeRaw).toString().toUpperCase();

  const rawRating =
    item.avgRating !== undefined ? item.avgRating :
    item.rating !== undefined ? item.rating : rating;

  const rawPrice =
    startingPrice ??
    item.startingPrice ??
    item.rentDetails?.monthlyRent ??
    item.pgDetails?.monthlyRent ??
    item.buyDetails?.expectedPrice ??
    item.plotDetails?.expectedPrice ??
    item.dynamicData?.expectedPrice ??
    item.dynamicData?.monthlyRent ??
    item.dynamicData?.expectedRent ??
    item.dynamicData?.price ??
    item.minPrice ??
    item.min_price ??
    item.price ??
    item.costPerNight ??
    item.amount ??
    null;

  const parsedPrice = rawPrice ? Number(rawPrice.toString().replace(/,/g, '')) : null;
  const displayPrice = parsedPrice && !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

  const badgeTypeKey = normalizedType || typeRaw;

  const getTypeColor = (type) => {
    switch (type) {
      case 'Hotel': return 'bg-blue-600 text-white border-blue-600';
      case 'Villa': return 'bg-purple-600 text-white border-purple-600';
      case 'Resort': return 'bg-orange-500 text-white border-orange-500';
      case 'Homestay': return 'bg-indigo-500 text-white border-indigo-500';
      case 'Hostel': return 'bg-pink-500 text-white border-pink-500';
      case 'PG': return 'bg-rose-500 text-white border-rose-500';
      default: return 'bg-emerald-600 text-white border-emerald-600';
    }
  };

  const formattedPrice = displayPrice
    ? displayPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : 'Price on Request';

  const priceSuffix = ['PG', 'Hostel', 'Rent'].includes(badgeTypeKey)
    ? '/month'
    : ['Buy', 'Plot'].includes(badgeTypeKey)
      ? ''
      : '/night';

  const isPG =
    badgeTypeKey === 'PG' ||
    typeRaw?.toLowerCase() === 'pg' ||
    (item.transactionType || '').toLowerCase().includes('paying guest') ||
    (item.transactionType || '').toLowerCase().includes('pg') ||
    (item.propertyCategory || '').toLowerCase().includes('paying guest') ||
    (item.propertyCategory || '').toLowerCase().includes('pg');

  const pgRoomDetails = (() => {
    if (!isPG) return '';
    // 1. Check if roomTypes array is present
    if (item.roomTypes && item.roomTypes.length > 0) {
      const types = item.roomTypes.map(r => {
        const n = (r.name || '').trim();
        const c = (r.roomCategory || '').trim();
        const val = n || c;
        if (!val) return '';
        if (/^\d+$/.test(val)) return `${val} BHK`;
        return val;
      }).filter(Boolean);
      if (types.length > 0) {
        const uniqueTypes = [...new Set(types)];
        return uniqueTypes.slice(0, 2).join(' / ');
      }
    }
    
    // 2. Check if pgDetails.occupancy is set
    if (item.pgDetails?.occupancy) {
      return `${item.pgDetails.occupancy} Room`;
    }

    // 3. Check if dynamicData has occupancy or bedrooms
    const occ = item.dynamicData?.occupancy;
    const beds = item.dynamicData?.bedrooms;
    if (occ) return `${occ} Room`;
    if (beds) return `${beds} BHK`;

    return '';
  })();

  // ─── Detect Plot / Land ───────────────────────────────────────────
  const plotKeywords = ['plot', 'land'];
  const isPlotOrLand =
    plotKeywords.some(k => (item.propertyCategory || '').toLowerCase().includes(k)) ||
    plotKeywords.some(k => (item.propertyType || '').toLowerCase().includes(k)) ||
    plotKeywords.some(k => (item.dynamicCategory?.displayName || '').toLowerCase().includes(k)) ||
    plotKeywords.some(k => (item.dynamicCategory?.name || '').toLowerCase().includes(k));

  const isRent =
    badgeTypeKey?.toLowerCase() === 'rent' ||
    typeRaw?.toLowerCase() === 'rent' ||
    (item.propertyCategory || '').toLowerCase().includes('rent') ||
    (item.propertyType || '').toLowerCase().includes('rent') ||
    (item.dynamicCategory?.displayName || '').toLowerCase().includes('rent') ||
    (item.dynamicCategory?.name || '').toLowerCase().includes('rent') ||
    (item.transactionType || '').toLowerCase().includes('rent') ||
    (item.availability || '').toLowerCase().includes('rent') ||
    (item.dynamicData?.availability || '').toLowerCase().includes('rent');

  const isBuy =
    !isPlotOrLand &&
    !isRent &&
    (badgeTypeKey?.toLowerCase() === 'buy' ||
     typeRaw?.toLowerCase() === 'buy' ||
     (item.propertyCategory || '').toLowerCase().includes('buy') ||
     (item.propertyType || '').toLowerCase().includes('buy') ||
     (item.dynamicCategory?.displayName || '').toLowerCase().includes('buy') ||
     (item.dynamicCategory?.name || '').toLowerCase().includes('buy') ||
     (item.transactionType || '').toLowerCase().includes('buy') ||
     (item.transactionType || '').toLowerCase().includes('sell') ||
     (item.availability || '').toLowerCase().includes('buy') ||
     (item.availability || '').toLowerCase().includes('sale'));

  const locationText = (() => {
    const addr = item.address;
    if (typeof addr === 'string' && addr.trim()) return addr;
    const locality = addr?.area || addr?.locality || item.locality || item.dynamicData?.locality || '';
    const city = addr?.city || item.city || item.dynamicData?.city || '';
    if (locality && city) return `${locality}, ${city}`;
    return locality || city || '';
  })();

  const phoneNum = item.contactNumber || item.phoneNumber || '';
  const [localEnquiryCount, setLocalEnquiryCount] = useState(item.enquiryCount || 0);

  const trackLead = async (type) => {
    if (!localStorage.getItem('user')) {
      setActionAfterLogin(type);
      setShowEnquiryModal(true);
      return null;
    }

    try {
      const res = await propertyService.revealContact(_id);
      if (res && res.success) {
        setLocalEnquiryCount(prev => prev + 1);
        return res.contactNumber;
      }
    } catch (error) {
      console.error("Failed to track lead:", error);
      const errData = error.response?.data || error;
      if (errData?.subscriptionExpired) {
        toast.error("This seller's subscription has expired. Their contact details are currently unavailable.", { duration: 5000 });
      } else if (errData?.limitReached) {
        toast.error("This seller has reached their monthly lead limit. Please try again next month or contact another seller.", { duration: 5000 });
      } else {
        toast.error(errData?.message || "Failed to reveal contact");
      }
    }
    return null;
  };

  const executeActionWithAuth = async (actionType) => {
    try {
      const res = await propertyService.revealContact(_id);
      if (res && res.success) {
        setLocalEnquiryCount(prev => prev + 1);
        const contact = res.contactNumber;
        if (actionType === 'call' || actionType === 'view_number') {
          window.location.href = `tel:${contact}`;
        } else if (actionType === 'whatsapp') {
          const msg = encodeURIComponent(`Hi, I am interested in "${displayName}" listed on Get Right Home.`);
          window.open(`https://wa.me/${contact}?text=${msg}`, '_blank');
        }
      }
    } catch (error) {
      console.error("Reveal Contact Error:", error);
      const errData = error.response?.data || error;
      if (errData?.subscriptionExpired) {
        toast.error("This seller's subscription has expired. Their contact details are currently unavailable.", { duration: 5000 });
      } else if (errData?.limitReached) {
        toast.error("This seller has reached their monthly lead limit. Please try again next month or contact another seller.", { duration: 5000 });
      } else {
        toast.error(errData?.message || "Failed to reveal contact");
      }
    }
  };

  const handleSendOtp = async () => {
    if (!enquiryForm.phone || enquiryForm.phone.length < 10) {
      setEnquiryErrors({ phone: "Please enter a valid 10-digit phone number" });
      return;
    }
    setSendingOtp(true);
    try {
      await authService.sendOtp(enquiryForm.phone, 'login', 'user');
      setOtpSent(true);
      toast.success("OTP sent successfully! (Use 123456 to bypass)");
    } catch (err) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!enquiryForm.name) errors.name = "Name is required";
    if (!enquiryForm.phone) errors.phone = "Phone number is required";
    if (!enquiryForm.otp) errors.otp = "OTP is required";
    if (Object.keys(errors).length > 0) {
      setEnquiryErrors(errors);
      return;
    }
    setEnquiryErrors({});
    setEnquiryLoading(true);

    try {
      const response = await authService.lazyEnquiryLogin({
        name: enquiryForm.name,
        email: enquiryForm.email || `${enquiryForm.phone}@getrighthome.com`,
        phone: enquiryForm.phone,
        otp: enquiryForm.otp,
        message: enquiryForm.message,
        propertyId: _id
      });

      if (response.success) {
        toast.success("Enquiry submitted successfully!");
        setShowEnquiryModal(false);
        setOtpSent(false);
        setEnquiryForm({ name: '', email: '', phone: '', otp: '', message: 'Interested in this property.' });
        
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          window.dispatchEvent(new Event('storage'));
        }

        if (actionAfterLogin) {
          await executeActionWithAuth(actionAfterLogin);
          setActionAfterLogin(null);
        }
      }
    } catch (err) {
      const errData = err.response?.data || err;
      toast.error(errData?.message || "Failed to submit enquiry");
    } finally {
      setEnquiryLoading(false);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/property/${_id}`;
    if (navigator.share) {
      navigator.share({
        title: displayName,
        text: `Check out this property: ${displayName}`,
        url: url
      }).catch(err => console.error("Error sharing:", err));
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleCall = async (e) => {
    e.stopPropagation();
    const actualPhone = await trackLead('call');
    if (actualPhone) {
      window.location.href = `tel:${actualPhone}`;
    }
  };

  const handleWhatsApp = async (e) => {
    e.stopPropagation();
    const actualPhone = await trackLead('whatsapp');
    if (actualPhone) {
      const msg = encodeURIComponent(`Hi, I am interested in "${displayName}" listed on Get Right Home.`);
      window.open(`https://wa.me/${actualPhone}?text=${msg}`, '_blank');
    }
  };

  // ─── Auto-sliding Image Carousel for Plot and Search properties ─────────────
  const propertyImagesList = (() => {
    const list = [];
    const addClean = (img) => {
      if (!img || typeof img !== 'string') return;
      let clean = img.replace(/[\[\]`'"]/g, '').trim();
      if (clean && !list.includes(clean)) {
        list.push(clean);
      }
    };

    if (images?.cover) addClean(images.cover);
    if (item.coverImage) addClean(item.coverImage);

    const rawPropImages = item.propertyImages || item.images || images;
    if (Array.isArray(rawPropImages)) {
      rawPropImages.forEach(img => addClean(img));
    } else if (typeof rawPropImages === 'string' && rawPropImages.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawPropImages);
        if (Array.isArray(parsed)) {
          parsed.forEach(img => addClean(img));
        }
      } catch (e) {}
    }

    if (Array.isArray(images?.gallery)) {
      images.gallery.forEach(img => addClean(img));
    }

    return list.length > 0 ? list : ['/src/assets/grh-logo.png'];
  })();

  useEffect(() => {
    if ((!isPlotOrLand && !isSearchPage) || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isPlotOrLand, isSearchPage]);

  useEffect(() => {
    if ((!isPlotOrLand && !isSearchPage) || !isVisible || propertyImagesList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % propertyImagesList.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlotOrLand, isSearchPage, isVisible, propertyImagesList.length]);

  const activeImageSrc = propertyImagesList[currentImageIndex];

  const imageSrc =
    images?.cover ||
    cleanImageUrl(item.coverImage) ||
    cleanImageUrl(Array.isArray(item.propertyImages) ? item.propertyImages[0] : '') ||
    '/src/assets/grh-logo.png';

  const areaValue = item.carpetArea || item.superArea || item.plotDetails?.plotArea || item.dynamicData?.plotArea || item.dynamicData?.carpetArea || '';
  const areaUnit = item.carpetAreaUnit || item.areaUnit || item.dynamicData?.carpetAreaUnit || 'sqft';

  if (isSearchPage) {
    const imageList = propertyImagesList;
    const nextImage = (e) => {
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev + 1) % imageList.length);
    };
    const prevImage = (e) => {
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
    };

    const postedByName = item.buyDetails?.builderName || 
                         (item.user?.role === 'builder' && item.user?.builderProfile?.companyName) ||
                         (item.userId?.role === 'builder' && item.userId?.builderProfile?.companyName) ||
                         item.partner?.name || 
                         item.partnerId?.name || 
                         item.user?.name || 
                         item.userId?.name || 
                         'Owner';

    const postedByRole = (() => {
      if (item.buyDetails?.builderName) return 'Builder';
      const roleStr = item.partner?.role || item.partnerId?.role || item.user?.role || item.userId?.role;
      if (roleStr) {
        if (roleStr === 'user') return 'Owner';
        if (roleStr === 'partner' || roleStr === 'broker') return 'Broker';
        if (roleStr === 'builder') return 'Builder';
        if (roleStr === 'dealer') return 'Dealer';
        return roleStr.charAt(0).toUpperCase() + roleStr.slice(1);
      }
      if (item.partner || item.partnerId) return 'Broker';
      return 'Owner';
    })();
    
    const displayPostedName = postedByName === 'Owner' ? 'Owner Listing' : postedByName;
    const postedByNameTruncated = displayPostedName.length > 18 ? `${displayPostedName.slice(0, 18)}...` : displayPostedName;

    const getPostedTimeStr = () => {
      if (!item.createdAt) return 'recently';
      const diffMs = new Date() - new Date(item.createdAt);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'today';
      if (diffDays === 1) return '1d ago';
      if (diffDays < 7) return `${diffDays}d ago`;
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks}w ago`;
    };

    const constructionStatus = item.buyDetails?.propertyAge 
      ? item.buyDetails.propertyAge 
      : item.dynamicData?.constructionStatus 
        ? item.dynamicData.constructionStatus 
        : item.availabilityStatus 
          ? item.availabilityStatus 
          : 'Ready to Move';

    const carpet = item.carpetArea;
    const superA = item.superArea || item.plotDetails?.plotArea || item.buyDetails?.area?.superBuiltUp || '';
    const exactArea = carpet || superA || item.dynamicData?.plotArea || item.dynamicData?.carpetArea || '';
    const exactAreaUnit = item.carpetAreaUnit || item.areaUnit || item.plotDetails?.unit || item.buyDetails?.area?.unit || 'sqft';

    const typeBadgeLabel = dynamicCatName || normalizedType || typeRaw || 'Property';

    return (
      <>
        <div 
          ref={containerRef}
          onClick={() => navigate(`/property/${_id}`)}
          className={`w-full bg-white rounded-[20px] border border-gray-200 shadow-sm hover:shadow-md overflow-hidden transition-all duration-300 flex flex-col cursor-pointer relative ${className}`}
        >
          {/* Image Container with Slider */}
          <div className="relative h-[200px] w-full bg-gray-100 group/slider overflow-hidden flex-shrink-0">
            <img 
              src={imageList[currentImageIndex]} 
              alt={displayName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = NO_IMAGE_PLACEHOLDER;
              }}
            />
            
            {/* Hover chevrons for Image Slider */}
            {imageList.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity duration-200 z-20"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity duration-200 z-20"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}

            {/* Slider Dots */}
            {imageList.length > 1 && (
              <div 
                className={`absolute left-1/2 -translate-x-1/2 flex gap-1.5 z-20 ${
                  localEnquiryCount > 0 ? 'bottom-8' : 'bottom-3'
                }`}
              >
                {imageList.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Dynamic Property Type Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
              <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-bold px-2.5 py-1 rounded tracking-wider uppercase">
                {typeBadgeLabel}
              </span>
            </div>

            {/* Top Right Action Icons: Heart & Share vertically stacked */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
              {/* Heart Icon */}
              <button 
                onClick={handleToggleSave}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                title="Save Property"
              >
                <Heart size={16} className={isSaved ? 'text-red-500 fill-red-500' : 'text-white'} />
              </button>
              {/* Share Icon */}
              <button 
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                title="Share Property"
              >
                <Share2 size={15} />
              </button>
            </div>

            {/* 99acres style Bottom-Overlay Contacted Badge */}
            {localEnquiryCount > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[11px] py-1.5 px-3 flex items-center gap-1.5 z-20 font-bold">
                <span>🔥</span>
                <span>{localEnquiryCount} {localEnquiryCount === 1 ? 'person' : 'people'} visited this property</span>
              </div>
            )}
          </div>

          {/* Card Details (below image) */}
          <div className="p-4 flex flex-col flex-grow justify-between">
            <div>
              {/* Row 1: Title (uppercase, bold) */}
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide truncate flex-1 pr-2">
                  {displayName}
                </h4>
                {item.isVerified && (
                  <span className="bg-gray-150 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shrink-0">
                    <BadgeCheck size={10} className="text-blue-500 fill-blue-500" />
                    RERA
                  </span>
                )}
              </div>

              {/* Row 2: Subtitle / Location */}
              <p className="text-xs text-gray-500 mb-3 truncate">
                <span className="font-bold text-gray-800">{item.bhk ? `${item.bhk} BHK ` : ''}{normalizedType || typeRaw}</span> in {locationText}
              </p>

              {/* Row 3: Grid (Price & Area layout matching 99acres with light borders) */}
              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-3 mb-3">
                <div className="flex flex-col">
                  <span className="text-base font-extrabold text-gray-900">
                    ₹ {formattedPrice}
                    {priceSuffix && <span className="text-[10px] font-normal text-gray-500"> {priceSuffix}</span>}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-0.5">
                    {displayPrice && exactArea ? `₹${Math.round(displayPrice / exactArea)} /sqft` : 'Price Negotiable'}
                  </span>
                  <span className="text-[11px] text-gray-600 font-semibold mt-1">
                    {constructionStatus}
                  </span>
                </div>
                
                <div className="border-l border-slate-100 pl-4 flex flex-col">
                  <span className="text-base font-extrabold text-gray-900">
                    {carpet && superA && carpet !== superA ? `${carpet}-${superA}` : exactArea || 'N/A'} {exactAreaUnit}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-0.5">
                    {exactArea ? `(${Math.round(exactArea * 0.092903)} sqm)` : ''}
                  </span>
                  <span className="text-[11px] text-gray-600 font-semibold mt-1">
                    {item.carpetArea ? 'Carpet Area' : 'Super Built-up Area'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 4: Builder Info & Action CTA Row */}
            <div className="flex items-center justify-between mt-1 pt-1">
              <div className="flex flex-col min-w-0 max-w-[42%]">
                <span className="font-extrabold text-xs text-gray-900 truncate" title={displayPostedName}>
                  {postedByNameTruncated}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {postedByRole} • {getPostedTimeStr()}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleCall}
                  className="px-2.5 py-1.5 border border-[#0d6efd] text-[#0d6efd] hover:bg-[#0d6efd]/5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                  View Number
                </button>
                <button 
                  onClick={handleWhatsApp}
                  className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:bg-[#20ba5a] transition-colors shrink-0 shadow-sm"
                  title="WhatsApp"
                >
                  <MessageCircle size={16} className="fill-white text-white" />
                </button>
                <button 
                  onClick={handleCall}
                  className="w-9 h-9 rounded-full bg-[#0d6efd] text-white flex items-center justify-center hover:bg-[#0b5ed7] transition-colors shrink-0 shadow-sm"
                  title="Call"
                >
                  <Phone size={14} className="fill-white text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LAZY ENQUIRY REGISTRATION MODAL */}
        <AnimatePresence>
          {showEnquiryModal && (
            <div 
              className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm" 
              onClick={() => {
                setShowEnquiryModal(false);
                setOtpSent(false);
              }}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-xl rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-8 font-sans"
              >
                {/* Drawer handle indicator */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
                
                <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Contact Owner / Dealer</h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Submit enquiry to view phone number</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowEnquiryModal(false);
                      setOtpSent(false);
                    }} 
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleEnquirySubmit} className="p-5 overflow-y-auto space-y-4 max-h-[70vh]">
                  {/* Name */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all">
                    <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={enquiryForm.name}
                      onChange={(e) => {
                        setEnquiryForm({ ...enquiryForm, name: e.target.value });
                        if (enquiryErrors.name) setEnquiryErrors(prev => ({ ...prev, name: '' }));
                      }}
                      placeholder="e.g. John Doe"
                      className="w-full bg-transparent outline-none text-xs font-bold text-slate-800"
                    />
                    {enquiryErrors.name && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">
                        {enquiryErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all">
                    <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={enquiryForm.email}
                      onChange={(e) => {
                        setEnquiryForm({ ...enquiryForm, email: e.target.value });
                        if (enquiryErrors.email) setEnquiryErrors(prev => ({ ...prev, email: '' }));
                      }}
                      placeholder="e.g. john@example.com"
                      className="w-full bg-transparent outline-none text-xs font-bold text-slate-800"
                    />
                    {enquiryErrors.email && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">
                        {enquiryErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone + Send OTP */}
                  <div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all">
                        <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Mobile Number</label>
                        <div className="flex items-center">
                          <span className="text-xs text-slate-500 font-bold mr-1.5">+91</span>
                          <input
                            type="tel"
                            required
                            value={enquiryForm.phone}
                            onChange={(e) => {
                              setEnquiryForm({ ...enquiryForm, phone: e.target.value });
                              if (enquiryErrors.phone) setEnquiryErrors(prev => ({ ...prev, phone: '' }));
                            }}
                            placeholder="9876543210"
                            maxLength={10}
                            className="w-full bg-transparent outline-none text-xs font-bold tracking-wide text-slate-800"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={sendingOtp || !enquiryForm.phone || enquiryForm.phone.length < 10}
                        onClick={handleSendOtp}
                        className="px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center shrink-0 border border-blue-100/50"
                      >
                        {sendingOtp ? <Loader2 className="animate-spin text-blue-600" size={16} /> : otpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    </div>
                    {enquiryErrors.phone && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">
                        {enquiryErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* OTP */}
                  {otpSent && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Enter OTP Sent</label>
                      <input
                        type="text"
                        required
                        value={enquiryForm.otp}
                        onChange={(e) => {
                          setEnquiryForm({ ...enquiryForm, otp: e.target.value });
                          if (enquiryErrors.otp) setEnquiryErrors(prev => ({ ...prev, otp: '' }));
                        }}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full bg-transparent outline-none text-xs font-bold tracking-widest text-slate-800"
                      />
                      <span className="absolute right-3 bottom-3 text-[8px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        Bypass: 123456
                      </span>
                      {enquiryErrors.otp && (
                        <p className="text-red-500 text-[10px] font-bold mt-1">
                          {enquiryErrors.otp}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submit / Cancel buttons */}
                  <div className="flex items-center gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEnquiryModal(false);
                        setOtpSent(false);
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={enquiryLoading}
                      className="flex-1 py-3 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      {enquiryLoading ? <Loader2 className="animate-spin text-white" size={16} /> : 'Verify & Submit'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <PropertyQuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          property={item}
          initialShowEnquiry={false}
        />
      </>
    );
  }

  // ─── PLOT / LAND CARD DESIGN (Matches Template Exactly) ──────────
  if (isPlotOrLand) {
    return (
      <>
        <div
          ref={containerRef}
          className={`flex-shrink-0 w-[280px] h-[360px] relative ${className}`}
        >
          <div
            onClick={() => navigate(`/hotel/${_id}`)}
            className={`w-full h-full bg-[#F4F5F7] rounded-[1.5rem] border border-gray-200/50 shadow-sm hover:shadow-md overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group relative`}
          >
          {/* Cover Image Section */}
          <div className="relative h-[180px] w-full overflow-hidden bg-slate-100 flex-shrink-0">
            <img
              src={activeImageSrc}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = NO_IMAGE_PLACEHOLDER;
              }}
            />

            {/* Blue RERA badge on left */}
            <div className="absolute top-3 left-3 bg-[#0d6efd] text-white text-[9px] font-black px-2.5 py-0.5 rounded flex items-center gap-1 shadow-md uppercase tracking-wider z-20">
              <BadgeCheck size={10} className="fill-[#0d6efd] text-white" />
              <span>{propertyType || 'PLOT'}</span>
            </div>

            {/* Carousel Dots on right */}
            {propertyImagesList.length > 1 && (
              <div className="absolute top-3.5 right-3.5 flex gap-1 bg-black/30 px-1.5 py-1 rounded-full backdrop-blur-sm z-20">
                {propertyImagesList.slice(0, 5).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-1 h-1 rounded-full transition-all duration-300 ${
                      idx === (currentImageIndex % Math.min(propertyImagesList.length, 5))
                        ? 'bg-white scale-125'
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Overlapping Floating White Container */}
          <div className="relative w-full bg-white rounded-t-[1.5rem] rounded-b-[1.5rem] p-4 pb-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)] z-10 -mt-6 flex-shrink-0 flex flex-col justify-between min-h-[120px]">
            <div>
              {/* Price and Type Info */}
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[16px] font-extrabold text-slate-800">
                  ₹ {formattedPrice} <span className="text-[10px] font-normal text-slate-400">onwards</span>
                </span>
                {areaValue && (
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    {areaValue} {areaUnit}
                  </span>
                )}
              </div>

              {/* Dashed Separator */}
              <div className="border-t border-dashed border-slate-200 my-2" />

              {/* Title */}
              <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-surface transition-colors mt-0.5">
                {displayName}
              </h3>

              {/* Location */}
              {locationText && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 font-medium">
                  <MapPin size={12} className="shrink-0 text-slate-400" />
                  <span className="truncate">{locationText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Row (sits below overlapping white box) */}
          <div className="flex items-center justify-between px-4 pb-4 pt-3 mt-auto bg-[#F4F5F7]">
            {/* Compact Details Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/hotel/${_id}`);
              }}
              className="bg-surface hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-4 rounded-[12px] flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <span>View Details</span>
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>

            {/* Call and WhatsApp Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCall}
                title="Call"
                className="p-1 text-[#e91e63] hover:bg-rose-50 rounded-full transition-colors active:scale-90"
              >
                <Phone size={19} className="fill-[#e91e63]/10" />
              </button>

              <div className="w-[1px] h-5 bg-gray-300" />

              <button
                onClick={handleWhatsApp}
                title="WhatsApp"
                className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors active:scale-90"
              >
                <MessageCircle size={20} className="fill-emerald-500/10" />
              </button>
            </div>
          </div>
        </div>
      </div>

        <PropertyQuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          property={item}
          initialShowEnquiry={false}
        />
      </>
    );
  }

  if (isRent) {
    return (
      <>
        <div
          onClick={() => navigate(`/hotel/${_id}`)}
          className={`flex-shrink-0 w-[280px] bg-white rounded-[1.5rem] ${item.logo ? 'border-2 border-amber-400/80 shadow-md hover:shadow-lg shadow-amber-500/5 bg-gradient-to-b from-white to-amber-50/10' : 'border border-gray-150 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.12)] hover:border-emerald-500/30'} transition-all duration-500 flex flex-col group relative h-[360px] ${className}`}
        >
          {/* Cover Image Container */}
          <div className="relative h-[190px] w-full overflow-hidden bg-gray-100 flex-shrink-0">
            {item.logo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-amber-200 flex flex-col items-center justify-center max-w-[65%] transform transition-transform duration-300 group-hover:scale-105">
                  <img 
                    src={item.logo} 
                    alt="Brand Logo" 
                    className="h-10 max-h-12 w-auto object-contain" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest mt-1">Premium Partner</span>
                </div>
              </div>
            )}
            <img
              src={imageSrc}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = NO_IMAGE_PLACEHOLDER;
              }}
            />

            {/* Dark gradient overlay for bottom edge contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80 z-10" />

            {/* Floating Heart Button */}
            <button
              onClick={handleToggleSave}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-md active:scale-90 hover:scale-105 transition-all duration-300 z-20"
            >
              <Heart
                size={15}
                className={`transition-colors duration-300 ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`}
              />
            </button>

            {/* Premium Glassmorphic Transaction Badge */}
            <span className="absolute top-3 left-3 bg-emerald-500/90 text-white text-[9px] font-black px-3 py-1 rounded-md backdrop-blur-md shadow-md uppercase tracking-wider z-20 border border-white/10">
              {typeLabel}
            </span>

            {/* Floating Embedded Price Tag inside Image */}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white backdrop-blur-md px-3 py-1 rounded-lg text-xs font-black flex items-center shadow-lg border border-white/10 z-20">
              ₹ {formattedPrice}
              <span className="text-[9px] font-medium text-slate-300 ml-0.5 uppercase tracking-tighter">
                {priceSuffix === '/month' ? '/mo' : priceSuffix}
              </span>
            </div>
          </div>

          {/* Card Details Body */}
          <div className="p-4 flex flex-col flex-1 justify-between">
            <div>
              {/* Badges row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.bhk ? (
                  <span className="bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    {item.bhk} BHK
                  </span>
                ) : null}
                {areaValue ? (
                  <span className="bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    {areaValue} {areaUnit}
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    Apartment
                  </span>
                )}
              </div>

              {/* Title with Serif font style and emerald color transition */}
              <h3 className="font-serif font-black text-[14px] leading-tight text-slate-900 group-hover:text-emerald-600 transition-colors mt-2 line-clamp-1">
                {displayName}
              </h3>

              {/* Location with micro gap */}
              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 font-medium">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>

            {/* Action Row */}
            <div>
              <div className="border-t border-dashed border-slate-200 my-2.5" />
              <div className="flex items-center justify-between">
                {/* View Details Link with arrow slide animation */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/hotel/${_id}`);
                  }}
                  className="text-[11px] font-black text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group/btn"
                >
                  <span>View Details</span>
                  <ChevronRight size={13} className="transform group-hover/btn:translate-x-1 transition-transform duration-300 text-slate-400 group-hover/btn:text-emerald-600" />
                </button>

                {/* Minimalist interactive call & whatsapp circles */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCall}
                    title="Call"
                    className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm active:scale-90 hover:scale-105"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    title="WhatsApp"
                    className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm active:scale-90 hover:scale-105"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.592M7.997 14.518a6.5 6.5 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.101-1.194-.588-1.378-.653-.185-.069-.32-.101-.454.101-.133.2-.517.653-.634.786-.118.133-.235.148-.437.047a5.1 5.1 0 0 1-1.625-1.002 5.6 5.6 0 0 1-1.12-1.394c-.118-.2-.013-.309.088-.41a5.6 5.6 0 0 0 .248-.344.41.41 0 0 0-.02-.412c-.067-.133-.517-1.244-.708-1.705-.186-.447-.372-.387-.512-.394-.13-.005-.28-.006-.43-.006a.85.85 0 0 0-.616.287C3.55 5.61 3 6.14 3 7.22s.792 2.115.9 2.26c.11.149 1.558 2.379 3.774 3.337.527.228.939.363 1.261.465a3.6 3.6 0 0 0 1.637.1c.366-.053 1.194-.487 1.362-1.057.17-.57.17-1.057.12-1.158-.05-.1-.186-.15-.387-.252"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PropertyQuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          property={item}
          initialShowEnquiry={false}
        />
      </>
    );
  }

  if (isBuy) {
    return (
      <>
        <div
          onClick={() => navigate(`/hotel/${_id}`)}
          className={`flex-shrink-0 w-[280px] bg-white rounded-[1.5rem] ${item.logo ? 'border-2 border-amber-400/80 shadow-md hover:shadow-lg shadow-amber-500/5 bg-gradient-to-b from-white to-amber-50/10' : 'border border-gray-150 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(217,119,6,0.15)] hover:border-amber-500/30'} transition-all duration-500 flex flex-col group relative h-[360px] ${className}`}
        >
          {/* Cover Image Container */}
          <div className="relative h-[190px] w-full overflow-hidden bg-gray-100 flex-shrink-0">
            {item.logo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-amber-200 flex flex-col items-center justify-center max-w-[65%] transform transition-transform duration-300 group-hover:scale-105">
                  <img 
                    src={item.logo} 
                    alt="Brand Logo" 
                    className="h-10 max-h-12 w-auto object-contain" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest mt-1">Premium Partner</span>
                </div>
              </div>
            )}
            <img
              src={imageSrc}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = NO_IMAGE_PLACEHOLDER;
              }}
            />

            {/* Dark gradient overlay for bottom edge contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80 z-10" />

            {/* Floating Heart Button on Top-Left */}
            <button
              onClick={handleToggleSave}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-md active:scale-90 hover:scale-105 transition-all duration-300 z-20"
            >
              <Heart
                size={15}
                className={`transition-colors duration-300 ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`}
              />
            </button>

            {/* Premium Gold/Amber Floating Price Badge on Top-Right */}
            <div className="absolute top-0 right-0 bg-amber-600 text-white px-3.5 py-1.5 rounded-bl-xl text-xs font-black shadow-md z-20">
              ₹ {formattedPrice}
            </div>

            {/* Translucent Transaction Type Badge on Bottom-Left */}
            <span className="absolute bottom-3 left-3 bg-amber-500/90 text-white text-[9px] font-black px-3 py-1 rounded-md backdrop-blur-md shadow-md uppercase tracking-wider z-20 border border-white/10">
              {typeLabel}
            </span>
          </div>

          {/* Card Details Body with Left Accent Border */}
          <div className="p-4 flex flex-col flex-1 justify-between bg-slate-50/20">
            <div className="border-l-[3px] border-amber-500/70 pl-3">
              {/* BHK & Area row formatted with bullets */}
              <div className="flex items-center text-[9px] font-black text-amber-600 tracking-wider uppercase">
                {item.bhk ? `${item.bhk} BHK` : 'RESIDENCE'}
                {areaValue ? ` • ${areaValue} ${areaUnit}` : ''}
              </div>

              {/* Title with Serif font style and amber color transition */}
              <h3 className="font-serif font-black text-[14px] leading-tight text-slate-800 group-hover:text-amber-600 transition-colors mt-1.5 line-clamp-1">
                {displayName}
              </h3>

              {/* Location with micro gap */}
              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 font-medium">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>

            {/* Action Row */}
            <div>
              <div className="border-t border-dashed border-slate-200 my-2.5" />
              <div className="flex items-center justify-between">
                {/* Explore Details Link Styled as a luxury compact button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/hotel/${_id}`);
                  }}
                  className="bg-slate-900 hover:bg-amber-600 text-white text-[9px] font-black uppercase py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all duration-300 active:scale-95 shadow-sm"
                >
                  <span>Explore</span>
                  <ChevronRight size={11} strokeWidth={3} />
                </button>

                {/* Aesthetic, borderless action links with circular hover states */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCall}
                    title="Call"
                    className="w-8 h-8 rounded-full border border-slate-200 hover:border-rose-500 bg-white hover:bg-rose-500 text-slate-600 hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm active:scale-90"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    title="WhatsApp"
                    className="w-8 h-8 rounded-full border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-500 text-slate-600 hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm active:scale-90"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.592M7.997 14.518a6.5 6.5 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.101-1.194-.588-1.378-.653-.185-.069-.32-.101-.454.101-.133.2-.517.653-.634.786-.118.133-.235.148-.437.047a5.1 5.1 0 0 1-1.625-1.002 5.6 5.6 0 0 1-1.12-1.394c-.118-.2-.013-.309.088-.41a5.6 5.6 0 0 0 .248-.344.41.41 0 0 0-.02-.412c-.067-.133-.517-1.244-.708-1.705-.186-.447-.372-.387-.512-.394-.13-.005-.28-.006-.43-.006a.85.85 0 0 0-.616.287C3.55 5.61 3 6.14 3 7.22s.792 2.115.9 2.26c.11.149 1.558 2.379 3.774 3.337.527.228.939.363 1.261.465a3.6 3.6 0 0 0 1.637.1c.366-.053 1.194-.487 1.362-1.057.17-.57.17-1.057.12-1.158-.05-.1-.186-.15-.387-.252"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PropertyQuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          property={item}
          initialShowEnquiry={false}
        />
      </>
    );
  }

  // ─── DEFAULT CARD ─────────────────────────────────────────────────
  return (
    <div
      onClick={() => navigate(`/hotel/${_id}`)}
      className={`relative h-[270px] md:h-[340px] w-full bg-gray-100 rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${item.logo ? 'border-2 border-amber-400/80 shadow-md hover:shadow-lg shadow-amber-500/5 bg-gradient-to-b from-slate-100 to-amber-50/10' : 'border border-gray-100 hover:-translate-y-1'} group ${className}`}
    >
      {item.logo && (
        <div className="absolute inset-x-0 top-0 bottom-[100px] flex items-center justify-center pointer-events-none z-10">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-amber-200 flex flex-col items-center justify-center max-w-[65%] transform transition-transform duration-300 group-hover:scale-105">
            <img 
              src={item.logo} 
              alt="Brand Logo" 
              className="h-10 max-h-12 w-auto object-contain" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest mt-1">Premium Partner</span>
          </div>
        </div>
      )}
      <img
        src={imageSrc}
        alt={displayName}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = NO_IMAGE_PLACEHOLDER;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

      {/* Floating Badges */}
      <div className="absolute top-2.5 left-2.5 md:top-4 md:left-4 flex flex-col items-start gap-1.5 z-20">
        <div className="flex items-center gap-1">
          {typeLabel && (
            <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded text-[8px] md:text-[10px] font-black uppercase tracking-wide shadow-md flex items-center gap-1 ${getTypeColor(badgeTypeKey)}`}>
              {typeLabel}
            </span>
          )}
          {item.hasVerifiedTag && (
            <div className="bg-white/90 backdrop-blur-sm p-0.5 md:p-1 rounded-full shadow-sm">
              <BadgeCheck size={12} className="fill-blue-500 text-white md:hidden" />
              <BadgeCheck size={16} className="fill-blue-500 text-white hidden md:block" />
            </div>
          )}
        </div>
        {(item.rankingWeight > 0 || item.isFeatured) && (
          <span className="bg-[#FFD700] text-black px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-wider shadow-md border border-white/20 flex items-center gap-1">
            <Star size={8} className="fill-black" />
            PREMIUM
          </span>
        )}
      </div>

      {/* Wishlist */}
      <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 flex flex-col gap-2 items-end z-20">
        <button
          onClick={handleToggleSave}
          className="p-1.5 md:p-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full shadow-md hover:bg-black/60 active:scale-95 transition-all"
        >
          <Heart size={13} className={`${isSaved ? 'fill-white text-white' : 'text-white/90'} md:hidden`} />
          <Heart size={16} className={`${isSaved ? 'fill-white text-white' : 'text-white/90'} hidden md:block`} />
        </button>
      </div>

      {/* White content box */}
      <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3 bg-white rounded-xl md:rounded-2xl p-2.5 md:p-4 pt-5 md:pt-8 shadow-xl z-10">
        <div className="absolute -top-4 md:-top-7 left-1/2 -translate-x-1/2 w-9 h-9 md:w-14 md:h-14 rounded-full border-2 md:border-[3px] border-white overflow-hidden bg-white shadow-sm flex items-center justify-center">
          <img
            src={item.logo || imageSrc}
            alt="Logo"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = LOGO_PLACEHOLDER;
            }}
          />
        </div>

        {isPG ? (
          <div className="text-left w-full">
            <h3 className="font-black text-xs md:text-sm text-gray-900 line-clamp-1 group-hover:text-violet-600 transition-colors">
              {displayName}
            </h3>
            <div className="mt-1 flex items-center justify-between text-[8px] md:text-[10px] text-gray-500 font-semibold gap-1">
              <div className="flex items-center gap-0.5 min-w-0 flex-1">
                <MapPin size={11} className="text-violet-500 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
              {pgRoomDetails && (
                <div className="bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black tracking-wide shrink-0 ml-1.5 uppercase border border-violet-100">
                  {pgRoomDetails}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="font-black text-xs md:text-sm text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
              {displayName}
            </h3>
            <p className="text-[8px] md:text-[10px] text-gray-500 mt-0.5 font-medium line-clamp-1">
              {address?.area || address?.locality || item.locality || ''}{address?.area || address?.locality || item.locality ? ', ' : ''}{address?.city || item.city || ''}
            </p>
          </div>
        )}

        <div className="mt-2 pt-2 md:mt-3 md:pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col items-start">
            {isPG ? (
              <span className="text-xs md:text-base font-extrabold text-violet-600 flex items-baseline gap-0.5">
                ₹ {formattedPrice}
                {displayPrice && (
                  <span className="text-[8px] md:text-[10px] text-gray-500 font-semibold ml-0.5">
                    {priceSuffix}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[11px] md:text-sm font-black text-gray-900 flex items-center gap-0.5">
                ₹ {formattedPrice}
                {displayPrice && (
                  <span className="text-[8px] md:text-[9px] text-gray-500 font-medium ml-0.5 mt-0.5">
                    {priceSuffix}
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {isPG ? (
              <>
                {(item.contactNumber || item.phoneNumber) && (
                  <a
                    href={`tel:${item.contactNumber || item.phoneNumber}`}
                    className="w-8 h-8 md:w-9 md:h-9 bg-violet-50 text-violet-600 rounded-full hover:bg-violet-600 hover:text-white border border-violet-100 hover:border-violet-600 transition-all duration-300 shadow-sm flex items-center justify-center active:scale-95 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    title="Call Now"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[12px] h-[12px] md:w-[14px] md:h-[14px]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </a>
                )}
                <button className="text-[9px] md:text-[10px] font-black text-white bg-violet-600 hover:bg-violet-700 px-3 md:px-4 py-2 md:py-2.5 rounded-full transition-all duration-300 flex items-center gap-1 shadow-md shadow-violet-600/10 hover:shadow-violet-600/20 active:scale-95">
                  View
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[9px] h-[9px] md:w-[11px] md:h-[11px]"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
              </>
            ) : (
              <>
                {(item.contactNumber || item.phoneNumber) && (
                  <a
                    href={`tel:${item.contactNumber || item.phoneNumber}`}
                    className="p-1.5 md:p-2 bg-gray-50 text-emerald-600 rounded-lg hover:bg-emerald-50 border border-gray-100 transition-colors shadow-sm flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                    title="Call Now"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[12px] h-[12px] md:w-[14px] md:h-[14px]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </a>
                )}
                <button className="text-[8px] md:text-[10px] font-bold text-white bg-gray-900 px-2 md:px-3 py-1.5 md:py-2 rounded-lg hover:bg-black transition-colors flex items-center gap-1 shadow-sm">
                  View
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px] md:w-[12px] md:h-[12px]"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <PropertyQuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        property={item}
        initialShowEnquiry={false}
      />
    </div>
  );
};

export default PropertyCard;
