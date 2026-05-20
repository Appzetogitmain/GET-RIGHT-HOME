import React, { useState } from 'react';
import { MapPin, Phone, MessageCircle, Share2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const GRHPropertyCard = ({ property, data }) => {
  const navigate = useNavigate();
  const item = property || data;
  const [isSaved, setIsSaved] = useState(false);

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

  const locationText = 
    address?.area || 
    address?.locality || 
    item.locality || 
    item.dynamicData?.locality || 
    address?.city || 
    item.city || 
    item.dynamicData?.city || 
    'Anantapur';

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

  return (
    <div
      onClick={() => navigate(`/hotel/${_id}`)}
      className="flex-shrink-0 w-[280px] bg-white rounded-[1.25rem] border border-gray-100 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group"
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
    </div>
  );
};

export default GRHPropertyCard;
