import React, { useState } from 'react';
import { MapPin, Phone, MessageCircle, Share2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PropertyQuickViewModal from './PropertyQuickViewModal';

const GRHPropertyCard = ({ property, data }) => {
  const navigate = useNavigate();
  const item = property || data;
  const [isSaved, setIsSaved] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  if (!item) return null;

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
    'https://via.placeholder.com/400x300?text=No+Image';

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
    const shareUrl = `${window.location.origin}/hotel/${_id}`;
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

  // Transaction Badge (BUY, RENT, PG etc.)
  const transactionType = item.transactionType || item.dynamicData?.transactionType || 'BUY';
  const [showOverlay, setShowOverlay] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);

  const handleCardClick = () => {
    setIsQuickViewOpen(true);
  };

  const handleCloseOverlay = (e) => {
    e.stopPropagation();
    setShowOverlay(false);
  };

  const handleEnquireClick = (e) => {
    e.stopPropagation();
    setShowEnquiryModal(true);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="flex-shrink-0 w-[280px] bg-white rounded-[1.25rem] border border-gray-100 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group relative h-[360px]"
      >
        {/* Cover Image Container */}
        <div className="relative h-[180px] w-full overflow-hidden bg-gray-100">
          <img
            src={imageSrc}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
            }}
          />
          {/* Floating Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSaved(!isSaved);
              if (!isSaved) {
                toast.success('Added to wishlist!');
              } else {
                toast.success('Removed from wishlist!');
              }
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md active:scale-90 transition-transform z-10"
          >
            <Heart
              size={15}
              className={`transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`}
            />
          </button>

          {/* Floating Transaction Badge */}
          <span className="absolute bottom-3 right-3 bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
            {transactionType === 'Rent / Lease' ? 'RENT' : transactionType === 'Paying Guest' ? 'PG' : 'BUY'}
          </span>
        </div>

        {/* Card Details Body */}
        <div className="p-3.5 flex flex-col flex-1 justify-between gap-1">
          <div>
            {/* Price */}
            <div className="text-xl font-extrabold text-[#0d6efd] tracking-tight">
              {displayPrice}
            </div>

            {/* BHK / Area */}
            <div className="mt-0.5 min-h-[20px] flex items-center">
              {renderDetailsRow()}
            </div>

            {/* Title */}
            <h3 className="text-sm font-medium text-gray-700 line-clamp-1 group-hover:text-blue-600 transition-colors mt-0.5">
              {displayName}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <MapPin size={12} className="text-gray-400 shrink-0" />
              <span className="line-clamp-1">{locationText}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex items-center gap-1.5">
            {/* Call Button */}
            <button
              onClick={handleCall}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <Phone size={12} className="text-red-500 fill-red-500" />
              <span>Call</span>
            </button>

            {/* WhatsApp Button */}
            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <MessageCircle size={12} className="text-[#a855f7] fill-[#a855f7]" />
              <span>WhatsApp</span>
            </button>

            {/* Share Icon */}
            <button
              onClick={handleShare}
              className="w-8 h-8 border border-gray-200 rounded-full hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center text-gray-500 shrink-0"
            >
              <Share2 size={12} />
            </button>
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
                <Phone size={14} className="text-white fill-white" />
              </button>

              {/* WhatsApp */}
              <button 
                onClick={handleWhatsApp}
                title="WhatsApp"
                className="w-9 h-9 rounded-full bg-[#25d366] hover:bg-[#20ba5a] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-emerald-950/30"
              >
                <MessageCircle size={14} className="text-white fill-white" />
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
                navigate(`/hotel/${_id}`);
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

