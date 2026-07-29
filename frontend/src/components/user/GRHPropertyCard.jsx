import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, MessageCircle, Share2, Heart, ChevronRight, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PropertyQuickViewModal from './PropertyQuickViewModal';
import { userService } from '../../services/apiService';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23F1F5F9'/><text x='50%' y='50%' font-family='sans-serif' font-size='16' font-weight='bold' fill='%2394A3B8' dominant-baseline='middle' text-anchor='middle'>No Image Available</text></svg>";


const GRHPropertyCard = ({ property, data, theme, initialIsSaved = false, onToggleSave, cardType = 'project' }) => {
  const navigate = useNavigate();
  const item = property || data;
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  if (!item) return null;

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    if (!localStorage.getItem('user')) {
      toast.error("Please login to save projects");
      return;
    }
    if (saveLoading) return;
    setSaveLoading(true);
    const newState = !isSaved;
    setIsSaved(newState);
    try {
      await userService.toggleSavedPlace(_id || item.id, cardType);
      toast.success(newState ? "Added to wishlist!" : "Removed from wishlist!");
      if (onToggleSave) onToggleSave(newState);
    } catch (error) {
      setIsSaved(!newState);
      toast.error("Failed to update wishlist");
    } finally {
      setSaveLoading(false);
    }
  };

  const {
    _id,
    name,
    address,
    images,
    propertyType,
    startingPrice
  } = item;

  // Clean dirty image URLs
  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/[`'"]/g, '').trim();
  };

  const displayName = name || item.propertyName || 'Untitled Property';

  const imageSrc =
    images?.cover ||
    cleanImageUrl(item.coverImage) ||
    cleanImageUrl(
      Array.isArray(item.propertyImages) ? item.propertyImages[0] : ''
    ) ||
    NO_IMAGE_PLACEHOLDER;

  // Format Price in Lakhs/Crores
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

  const floorPlansPrices = (item.dynamicData?.floorPlans || item.floorPlans || [])
    .map(p => Number(p.price || p.startingPrice || p.expectedPrice || p.minPrice))
    .filter(p => !isNaN(p) && p > 0);
  const minFloorPlanPrice = floorPlansPrices.length > 0 ? Math.min(...floorPlansPrices) : null;

  const rawPrice =
    startingPrice ??
    item.startingPrice ??
    item.minPrice ??
    item.min_price ??
    minFloorPlanPrice ??
    item.buyDetails?.expectedPrice ??
    item.plotDetails?.expectedPrice ??
    item.dynamicData?.expectedPrice ??
    item.dynamicData?.startingPrice ??
    item.dynamicData?.minPrice ??
    item.rentDetails?.monthlyRent ??
    item.pgDetails?.monthlyRent ??
    item.dynamicData?.monthlyRent ??
    item.dynamicData?.expectedRent ??
    item.dynamicData?.price ??
    item.price ??
    null;

  const displayPrice = formatPriceLakhCrore(rawPrice);

  // BHK / Area layout
  const bhkValue = item.rentDetails?.type || item.buyDetails?.type || item.bhk || item.dynamicData?.bedrooms || '';
  const areaValue = item.carpetArea || item.superArea || item.plotDetails?.plotArea || item.dynamicData?.plotArea || item.dynamicData?.carpetArea || '';
  const areaUnit = item.carpetAreaUnit || item.areaUnit || item.dynamicData?.carpetAreaUnit || 'sqft';

  // Render BHK or Area conditionally
  const renderDetailsRow = () => {
    if (bhkValue) {
      // If bhkValue is just a number, append 'BHK'
      const suffix = /^\d+$/.test(bhkValue.toString().trim()) ? ' BHK' : '';
      return <span className="text-sm font-semibold text-gray-500">{bhkValue}{suffix}</span>;
    }
    if (areaValue) {
      return <span className="text-sm font-semibold text-gray-500">• {areaValue} {areaUnit}</span>;
    }
    return null;
  };

  const getDisplayLocation = (prop) => {
    if (!prop) return 'Anantapur';
    const addr = prop.address;
    if (typeof addr === 'string' && addr.trim()) return addr;
    
    const locality = addr?.area || addr?.locality || prop.locality || prop.dynamicData?.locality || '';
    const city = addr?.city || prop.city || prop.dynamicData?.city || '';
    
    if (locality && city) return `${locality}, ${city}`;
    return locality || city || 'Anantapur';
  };
  const locationText = getDisplayLocation(item);

  const phoneNum = item.contactNumber || item.phoneNumber || '9123456789';

  const handleCall = (e) => {
    e.stopPropagation();
    window.location.href = `tel:${phoneNum}`;
  };

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    const message = encodeURIComponent(`Hi, I am interested in your property "${displayName}" listed on Get Right Home.`);
    window.open(`https://wa.me/${phoneNum}?text=${message}`, '_blank');
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/property/${_id}`;
    if (navigator.share) {
      navigator.share({
        title: displayName,
        text: `Check out this property on Get Right Home!`,
        url: shareUrl
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const transactionType = item.transactionType || item.dynamicData?.transactionType || 'BUY';

  const isPG =
    transactionType === 'Paying Guest' ||
    transactionType === 'PG' ||
    (item.propertyType || '').toLowerCase() === 'pg' ||
    (item.propertyCategory || '').toLowerCase().includes('paying guest') ||
    (item.propertyCategory || '').toLowerCase().includes('pg');

  const builderName = item.buyDetails?.builderName || 
                      (item.user?.role === 'builder' ? (item.user.builderProfile?.companyName || item.user.name) : null) ||
                      (item.userId?.role === 'builder' ? (item.userId.builderProfile?.companyName || item.userId.name) : null);

  const dynamicCatName = item.dynamicCategory?.displayName || item.dynamicCategory?.name;
  const typeRawVal = (propertyType || item.propertyType || '').toString();
  const normalizedTypeVal = typeRawVal
    ? typeRawVal.toLowerCase() === 'pg'
      ? 'PG'
      : typeRawVal.charAt(0).toUpperCase() + typeRawVal.slice(1).toLowerCase()
    : '';
  const displayTypeBadge = (dynamicCatName || normalizedTypeVal || 'Property').toUpperCase();


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

  const [showOverlay, setShowOverlay] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);

  const handleCardClick = () => {
    navigate(`/property/${_id}`);
  };

  const handleCloseOverlay = (e) => {
    e.stopPropagation();
    setShowOverlay(false);
  };

  const handleEnquireClick = (e) => {
    e.stopPropagation();
    setShowEnquiryModal(true);
  };

  // ─── Auto-sliding / manual image list builder ────────────────────
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

    return list.length > 0 ? list : [NO_IMAGE_PLACEHOLDER];
  })();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (propertyImagesList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % propertyImagesList.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [propertyImagesList.length]);

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (propertyImagesList.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + propertyImagesList.length) % propertyImagesList.length);
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (propertyImagesList.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % propertyImagesList.length);
  };

  const activeImageSrc = propertyImagesList[currentImageIndex];

  // ─── Detect Ready to Move ─────────────────────────────────────────
  const availability = item.availability || item.dynamicData?.availability || '';
  const isReadyToMove =
    typeof availability === 'string' &&
    (availability.toLowerCase() === 'ready to move' || availability.toLowerCase() === 'ready to move in');

  const isPreLaunch =
    typeof availability === 'string' &&
    availability.toLowerCase() === 'pre launch';

  const isUnderConstruction =
    typeof availability === 'string' &&
    availability.toLowerCase() === 'under construction';

  if (isReadyToMove) {
    return (
      <>
        <div
          onClick={handleCardClick}
          className={`flex-shrink-0 w-[280px] h-[360px] rounded-[1.25rem] overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group relative bg-[#F4F5F7] shadow-sm hover:shadow-md`}
        >
          {/* Cover Image Container */}
          <div className="relative h-[180px] w-full overflow-hidden bg-gray-100 flex-shrink-0">
            <img
              src={activeImageSrc}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = NO_IMAGE_PLACEHOLDER;
              }}
            />

            {/* Left and Right Navigation Arrows (only show if multiple images exist) */}
            {propertyImagesList.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/75 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all active:scale-90 z-20"
                >
                  <span className="text-sm font-bold">‹</span>
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/75 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all active:scale-90 z-20"
                >
                  <span className="text-sm font-bold">›</span>
                </button>
              </>
            )}

            {/* Floating Heart Button */}
            <button
              onClick={handleToggleSave}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md active:scale-90 transition-transform z-20"
            >
              <Heart
                size={15}
                className={`transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`}
              />
            </button>

            {/* Floating Property Type Badge (Centered) */}
            <span className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#3B82F6]/95 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-[6px] shadow-sm uppercase tracking-wider z-20 whitespace-nowrap">
              {displayTypeBadge}
            </span>

            {/* Area Display (Centered at bottom of image) */}
            {areaValue && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-[2px] py-1 px-2.5 rounded-lg text-white text-[10px] font-semibold flex items-center gap-1.5 z-20 shadow-sm whitespace-nowrap">
                <span className="text-[11px]">📊</span>
                <span>{areaValue} {areaUnit} Area</span>
              </div>
            )}
          </div>

          {/* Full-width White Content Container (Flush below the image, covers the whole width) */}
          <div className="w-full bg-white p-3 z-10 border-b border-gray-100 flex flex-col flex-shrink-0">
            <div>
              {/* Premium Title Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Building size={16} className="text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {displayName}
                  </h3>
                  {builderName && (
                    <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-tight line-clamp-1">
                      By {builderName}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid: Left (Price & Location) | Right (BHK & Type Details) */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {/* Left Side: Price & Location */}
                <div className="border-r border-gray-100 pr-1 flex flex-col justify-center">
                  <div className="text-xs font-extrabold text-[#0d6efd] tracking-tight">
                    {displayPrice}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-gray-500 mt-1">
                    <MapPin size={9} className="text-gray-400 shrink-0" />
                    <span className="truncate">{locationText}</span>
                  </div>
                </div>

                {/* Right Side: BHK & Property Type Details */}
                <div className="pl-1 flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <span>🏠</span>
                    <span>{bhkValue ? `${bhkValue} BHK` : propertyType || 'Property'}</span>
                  </div>
                  <div className="text-[8px] text-emerald-600 font-bold mt-0.5 uppercase tracking-wide">
                    Immediate Possession
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Row (Placed at the bottom of the card, on the main gray background) */}
          <div className="flex items-center justify-between px-4 py-3 mt-auto bg-[#F4F5F7] w-full">
            {/* View Details Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/property/${_id}`);
              }}
              className="bg-[#10B981] hover:bg-emerald-700 text-white text-[10px] font-black py-2 px-3 rounded-[10px] flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <span>View Details</span>
              <ChevronRight size={11} strokeWidth={2.5} />
            </button>

            {/* Call and WhatsApp Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCall}
                title="Call"
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-slate-100 transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 shrink-0">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>

              <button
                onClick={handleWhatsApp}
                title="WhatsApp"
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-emerald-50 text-emerald-500 hover:text-emerald-600 border border-slate-100 transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-emerald-500 shrink-0" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.592M7.997 14.518a6.5 6.5 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.101-1.194-.588-1.378-.653-.185-.069-.32-.101-.454.101-.133.2-.517.653-.634.786-.118.133-.235.148-.437.047a5.1 5.1 0 0 1-1.625-1.002 5.6 5.6 0 0 1-1.12-1.394c-.118-.2-.013-.309.088-.41a5.6 5.6 0 0 0 .248-.344.41.41 0 0 0-.02-.412c-.067-.133-.517-1.244-.708-1.705-.186-.447-.372-.387-.512-.394-.13-.005-.28-.006-.43-.006a.85.85 0 0 0-.616.287C3.55 5.61 3 6.14 3 7.22s.792 2.115.9 2.26c.11.149 1.558 2.379 3.774 3.337.527.228.939.363 1.261.465a3.6 3.6 0 0 0 1.637.1c.366-.053 1.194-.487 1.362-1.057.17-.57.17-1.057.12-1.158-.05-.1-.186-.15-.387-.252"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <PropertyQuickViewModal
          isOpen={isQuickViewOpen || showEnquiryModal}
          onClose={() => {
            setIsQuickViewOpen(false);
            setShowEnquiryModal(false);
          }}
          property={item}
          initialShowEnquiry={showEnquiryModal}
        />
      </>
    );
  }

  if (isPreLaunch) {
    return (
      <>
        <div
          onClick={handleCardClick}
          className={`flex-shrink-0 w-[280px] h-[360px] rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-500 flex flex-col group relative bg-white border border-gray-100 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.12)] hover:border-indigo-500/30`}
        >
          {/* Cover Image Container */}
          <div className="relative h-[180px] w-full overflow-hidden bg-gray-100 flex-shrink-0">
            {/* Sliding container from bottom to top */}
            <div
              className="absolute top-0 left-0 w-full h-full flex flex-col transition-transform duration-700 ease-in-out"
              style={{ transform: `translateY(-${currentImageIndex * 100}%)` }}
            >
              {propertyImagesList.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={displayName}
                  className="w-full h-[180px] object-cover shrink-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = NO_IMAGE_PLACEHOLDER;
                  }}
                />
              ))}
            </div>

            {/* Indigo overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 via-transparent to-transparent opacity-80 z-10 pointer-events-none" />

            {/* Floating Heart Button */}
            <button
              onClick={handleToggleSave}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md active:scale-90 transition-transform z-20"
            >
              <Heart
                size={15}
                className={`transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`}
              />
            </button>

            {/* Floating Transaction Badge */}
            <span className="absolute bottom-3 right-3 bg-indigo-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded shadow-sm uppercase tracking-wider z-20">
              {displayTypeBadge}
            </span>
          </div>

          {/* Card Details Body */}
          <div className="p-4 flex flex-col flex-1 justify-between">
            <div>
              {/* Title with sleek typography */}
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {displayName}
                </h3>
                {builderName && (
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-tight line-clamp-1">
                    By {builderName}
                  </span>
                )}
              </div>

              {/* Thin light separator line */}
              <div className="border-b border-indigo-50/80 my-2" />

              {/* Price and info row */}
              <div className="flex items-center justify-between mt-1">
                <div className="text-base font-black text-indigo-600 tracking-tight">
                  {displayPrice}
                </div>

                {areaValue ? (
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {areaValue} {areaUnit}
                  </div>
                ) : bhkValue ? (
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {bhkValue} BHK
                  </div>
                ) : null}
              </div>

              {/* Location */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>

            {/* Action Row */}
            <div>
              <div className="border-t border-slate-100 my-2.5" />
              <div className="flex items-center justify-between">
                {/* Enquire button as primary action */}
                <button
                  onClick={handleEnquireClick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase py-2 px-3.5 rounded-lg active:scale-95 transition-all shadow-sm"
                >
                  Enquire Now
                </button>

                {/* Call & Whatsapp micro actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCall}
                    title="Call"
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-500 border border-slate-100 hover:border-rose-100 transition-all flex items-center justify-center animate-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    title="WhatsApp"
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-500 border border-slate-100 hover:border-emerald-100 transition-all flex items-center justify-center animate-none"
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
          isOpen={isQuickViewOpen || showEnquiryModal}
          onClose={() => {
            setIsQuickViewOpen(false);
            setShowEnquiryModal(false);
          }}
          property={item}
          initialShowEnquiry={showEnquiryModal}
        />
      </>
    );
  }

  if (isUnderConstruction) {
    return (
      <>
        <div
          onClick={handleCardClick}
          className={`flex-shrink-0 w-[280px] h-[360px] rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-500 flex flex-col group relative bg-white border border-gray-150 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.12)] hover:border-orange-500/30`}
        >
          {/* Cover Image Container */}
          <div className="relative h-[180px] w-full overflow-hidden bg-gray-100 flex-shrink-0">
            {/* Sliding container from top to bottom */}
            <div
              className="absolute top-0 left-0 w-full h-full flex flex-col transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateY(-${((propertyImagesList.length - 1 - currentImageIndex + propertyImagesList.length) % propertyImagesList.length) * 100}%)`
              }}
            >
              {[...propertyImagesList].reverse().map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={displayName}
                  className="w-full h-[180px] object-cover shrink-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = NO_IMAGE_PLACEHOLDER;
                  }}
                />
              ))}
            </div>

            {/* Orange overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-orange-950/30 via-transparent to-transparent pointer-events-none z-10" />

            {/* Floating Heart Button */}
            <button
              onClick={handleToggleSave}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md active:scale-90 transition-transform z-20"
            >
              <Heart
                size={15}
                className={`transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`}
              />
            </button>

            {/* Floating Transaction Badge */}
            <span className="absolute bottom-3 right-3 bg-orange-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded shadow-sm uppercase tracking-wider z-20">
              {displayTypeBadge}
            </span>
          </div>

          {/* Card Details Body */}
          <div className="p-4 flex flex-col flex-1 justify-between">
            <div>
              {/* Title with orange hover color */}
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors">
                  {displayName}
                </h3>
                {builderName && (
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-tight line-clamp-1">
                    By {builderName}
                  </span>
                )}
              </div>

              {/* Separator line */}
              <div className="border-b border-orange-50/80 my-2" />

              {/* Price and Area */}
              <div className="flex items-center justify-between mt-1">
                <div className="text-base font-black text-orange-600 tracking-tight">
                  {displayPrice}
                </div>

                {areaValue ? (
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {areaValue} {areaUnit}
                  </div>
                ) : bhkValue ? (
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {bhkValue} BHK
                  </div>
                ) : null}
              </div>

              {/* Location */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>

            {/* Action Row */}
            <div>
              <div className="border-t border-slate-100 my-2.5" />
              <div className="flex items-center justify-between">
                {/* View Project primary action */}
                <button
                  onClick={handleEnquireClick}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-black uppercase py-2 px-3.5 rounded-lg active:scale-95 transition-all shadow-sm"
                >
                  View Project
                </button>

                {/* Call & Whatsapp micro actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCall}
                    title="Call"
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-500 border border-slate-100 hover:border-rose-100 transition-all flex items-center justify-center animate-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    title="WhatsApp"
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-500 border border-slate-100 hover:border-emerald-100 transition-all flex items-center justify-center animate-none"
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
          isOpen={isQuickViewOpen || showEnquiryModal}
          onClose={() => {
            setIsQuickViewOpen(false);
            setShowEnquiryModal(false);
          }}
          property={item}
          initialShowEnquiry={showEnquiryModal}
        />
      </>
    );
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`flex-shrink-0 w-[280px] h-[360px] rounded-[1.25rem] overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group relative bg-white border border-gray-100 shadow-sm hover:shadow-md`}
      >
        {/* Cover Image Container */}
        <div className="relative h-[180px] w-full overflow-hidden bg-gray-100">
          {isPG ? (
            <div
              className="absolute top-0 left-0 h-full flex transition-transform duration-700 ease-in-out"
              style={{
                width: `${propertyImagesList.length * 100}%`,
                transform: `translateX(-${(currentImageIndex * 100) / propertyImagesList.length}%)`
              }}
            >
              {propertyImagesList.map((img, idx) => (
                <div key={idx} style={{ width: `${100 / propertyImagesList.length}%` }} className="h-full relative">
                  <img
                    src={img}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = NO_IMAGE_PLACEHOLDER;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-900/40 via-transparent to-transparent opacity-60 pointer-events-none" />
                </div>
              ))}
            </div>
          ) : (
            <img
              src={imageSrc}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = NO_IMAGE_PLACEHOLDER;
              }}
            />
          )}
          {/* Floating Heart Button */}
          <button
            onClick={handleToggleSave}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md active:scale-90 transition-transform z-20"
          >
            <Heart
              size={15}
              className={`transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`}
            />
          </button>

          {/* Floating Transaction Badge */}
          <span className={`absolute bottom-3 right-3 text-white text-[10px] font-black px-2.5 py-0.5 rounded shadow-sm uppercase tracking-wider z-20 ${isPG ? 'bg-violet-600' : 'bg-blue-600'}`}>
            {displayTypeBadge}
          </span>
        </div>

        {/* Card Details Body */}
        <div className="p-3.5 flex flex-col flex-1 justify-between gap-1">
          <div>
            {/* Price */}
            <div className={`text-xl font-extrabold tracking-tight flex items-baseline gap-0.5 ${isPG ? 'text-violet-600' : 'text-[#0d6efd]'}`}>
              {displayPrice}
              {isPG && <span className="text-[10px] text-gray-500 font-semibold">/month</span>}
            </div>

            {isPG ? (
              <>
                {/* Title */}
                <div className="flex flex-col mt-1.5">
                  <h3 className={`text-sm font-medium text-gray-900 line-clamp-1 transition-colors ${theme?.groupHoverText || 'group-hover:text-emerald-600'}`}>
                    {displayName}
                  </h3>
                  {builderName && (
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-tight line-clamp-1 mt-0.5">
                      By {builderName}
                    </span>
                  )}
                </div>
                {/* Location left, Room details right */}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-semibold gap-1">
                  <div className="flex items-center gap-0.5 min-w-0 flex-1">
                    <MapPin size={12} className="text-violet-500 shrink-0" />
                    <span className="truncate">{locationText}</span>
                  </div>
                  {pgRoomDetails && (
                    <div className="bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide shrink-0 ml-1.5 uppercase border border-violet-100">
                      {pgRoomDetails}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* BHK / Area */}
                <div className="mt-0.5 min-h-[20px] flex items-center">
                  {renderDetailsRow()}
                </div>

                {/* Title */}
                <div className="flex flex-col mt-0.5">
                  <h3 className={`text-sm font-medium text-gray-700 line-clamp-1 transition-colors ${theme?.groupHoverText || 'group-hover:text-emerald-600'}`}>
                    {displayName}
                  </h3>
                  {builderName && (
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-tight line-clamp-1 mt-0.5">
                      By {builderName}
                    </span>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <MapPin size={12} className="text-gray-400 shrink-0" />
                  <span className="line-clamp-1">{locationText}</span>
                </div>
              </>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex items-center gap-1.5">
            {isPG ? (
              <>
                {/* Call Button */}
                <button
                  onClick={handleCall}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 border border-violet-200 bg-violet-50 rounded-full text-[10px] font-black text-violet-600 hover:bg-violet-100 active:scale-95 transition-all shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 shrink-0">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Call</span>
                </button>

                {/* WhatsApp Button (Circular) */}
                <button
                  onClick={handleWhatsApp}
                  title="WhatsApp"
                  className="w-8 h-8 flex items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 active:scale-95 transition-all shrink-0 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" className="text-emerald-600">
                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.592M7.997 14.518a6.5 6.5 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.101-1.194-.588-1.378-.653-.185-.069-.32-.101-.454.101-.133.2-.517.653-.634.786-.118.133-.235.148-.437.047a5.1 5.1 0 0 1-1.625-1.002 5.6 5.6 0 0 1-1.12-1.394c-.118-.2-.013-.309.088-.41a5.6 5.6 0 0 0 .248-.344.41.41 0 0 0-.02-.412c-.067-.133-.517-1.244-.708-1.705-.186-.447-.372-.387-.512-.394-.13-.005-.28-.006-.43-.006a.85.85 0 0 0-.616.287C3.55 5.61 3 6.14 3 7.22s.792 2.115.9 2.26c.11.149 1.558 2.379 3.774 3.337.527.228.939.363 1.261.465a3.6 3.6 0 0 0 1.637.1c.366-.053 1.194-.487 1.362-1.057.17-.57.17-1.057.12-1.158-.05-.1-.186-.15-.387-.252"/>
                  </svg>
                </button>

                {/* View Details Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/property/${_id}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-[10px] font-black active:scale-95 transition-all shadow-md shadow-violet-600/10 hover:shadow-violet-600/20"
                >
                  <span>View Details</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
              </>
            ) : (
              <>
                {/* Call Button */}
                <button
                  onClick={handleCall}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 shrink-0">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Call</span>
                </button>

                {/* WhatsApp Button */}
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" className="text-emerald-500 shrink-0" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.592M7.997 14.518a6.5 6.5 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.101-1.194-.588-1.378-.653-.185-.069-.32-.101-.454.101-.133.2-.517.653-.634.786-.118.133-.235.148-.437.047a5.1 5.1 0 0 1-1.625-1.002 5.6 5.6 0 0 1-1.12-1.394c-.118-.2-.013-.309.088-.41a5.6 5.6 0 0 0 .248-.344.41.41 0 0 0-.02-.412c-.067-.133-.517-1.244-.708-1.705-.186-.447-.372-.387-.512-.394-.13-.005-.28-.006-.43-.006a.85.85 0 0 0-.616.287C3.55 5.61 3 6.14 3 7.22s.792 2.115.9 2.26c.11.149 1.558 2.379 3.774 3.337.527.228.939.363 1.261.465a3.6 3.6 0 0 0 1.637.1c.366-.053 1.194-.487 1.362-1.057.17-.57.17-1.057.12-1.158-.05-.1-.186-.15-.387-.252"/>
                  </svg>
                  <span>WhatsApp</span>
                </button>

                {/* Share Icon */}
                <button
                  onClick={handleShare}
                  className="w-9 h-9 border border-gray-200 rounded-full hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center text-gray-500 shrink-0 shadow-sm"
                >
                  <Share2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Elegant Dark Translucent Quick View Overlay (Inline - Bottom Half) */}
        {showOverlay && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/2 bg-slate-950/95 backdrop-blur-[2px] z-20 p-3 flex flex-col justify-between text-white rounded-b-[1.25rem] transition-all duration-300 animate-in slide-in-from-bottom-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Overlay Header / Close */}
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-base font-black text-[#60a5fa] tracking-tight">{displayPrice}</div>
                <h4 className="text-xs font-semibold text-gray-100 line-clamp-1 mt-0.5">{displayName}</h4>
              </div>
              <button 
                onClick={handleCloseOverlay}
                className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
              >
                <span className="text-[10px]">✕</span>
              </button>
            </div>

            {/* 4 Colored Circular Actions */}
            <div className="flex items-center justify-around gap-2 my-1.5">
              {/* Call */}
              <button 
                onClick={handleCall}
                title="Call"
                className="w-9 h-9 rounded-full bg-[#198754] hover:bg-[#157347] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-green-950/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>

              {/* WhatsApp */}
              <button 
                onClick={handleWhatsApp}
                title="WhatsApp"
                className="w-9 h-9 rounded-full bg-[#25d366] hover:bg-[#20ba5a] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-emerald-950/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-white" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.592M7.997 14.518a6.5 6.5 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.101-1.194-.588-1.378-.653-.185-.069-.32-.101-.454.101-.133.2-.517.653-.634.786-.118.133-.235.148-.437.047a5.1 5.1 0 0 1-1.625-1.002 5.6 5.6 0 0 1-1.12-1.394c-.118-.2-.013-.309.088-.41a5.6 5.6 0 0 0 .248-.344.41.41 0 0 0-.02-.412c-.067-.133-.517-1.244-.708-1.705-.186-.447-.372-.387-.512-.394-.13-.005-.28-.006-.43-.006a.85.85 0 0 0-.616.287C3.55 5.61 3 6.14 3 7.22s.792 2.115.9 2.26c.11.149 1.558 2.379 3.774 3.337.527.228.939.363 1.261.465a3.6 3.6 0 0 0 1.637.1c.366-.053 1.194-.487 1.362-1.057.17-.57.17-1.057.12-1.158-.05-.1-.186-.15-.387-.252"/>
                </svg>
              </button>

              {/* Share */}
              <button 
                onClick={handleShare}
                title="Share Property"
                className="w-9 h-9 rounded-full bg-[#0d6efd] hover:bg-[#0b5ed7] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-blue-950/30"
              >
                <Share2 size={14} className="text-white" />
              </button>

              {/* Enquiry */}
              <button 
                onClick={handleEnquireClick}
                title="Submit Enquiry"
                className="w-9 h-9 rounded-full bg-[#820ad1] hover:bg-[#6c08af] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-purple-950/30"
              >
                <span className="text-xs font-bold">✉</span>
              </button>
            </div>

            {/* View Full Details Button */}
            <button
              onClick={() => {
                setShowOverlay(false);
                navigate(`/property/${_id}`);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold active:scale-95 transition-all text-center border border-slate-700"
            >
              View Details
            </button>
          </div>
        )}
      </div>

      <PropertyQuickViewModal
        isOpen={isQuickViewOpen || showEnquiryModal}
        onClose={() => {
          setIsQuickViewOpen(false);
          setShowEnquiryModal(false);
        }}
        property={item}
        initialShowEnquiry={showEnquiryModal}
      />
    </>
  );
};

export default GRHPropertyCard;
