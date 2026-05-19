import React, { useState, useEffect } from 'react';
import { MapPin, Star, IndianRupee, Heart, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/apiService';
import toast from 'react-hot-toast';

const PropertyCard = ({ property, data, className = "", isSaved: initialIsSaved }) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(initialIsSaved || false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync with initialIsSaved if it changes
  useEffect(() => {
    if (initialIsSaved !== undefined) {
      setIsSaved(initialIsSaved);
    }
  }, [initialIsSaved]);

  const item = property || data;

  if (!item) return null;

  const {
    _id,
    name,
    address,
    images,
    propertyType,
    rating,
    startingPrice,
    details
  } = item;

  const handleToggleSave = async (e) => {
    e.stopPropagation(); // Don't navigate to details
    if (!localStorage.getItem('token')) {
      toast.error("Please login to save properties");
      return;
    }

    if (saveLoading) return;

    setSaveLoading(true);
    const newState = !isSaved;
    setIsSaved(newState); // Optimistic update

    try {
      await userService.toggleSavedHotel(_id || item.id);
      toast.success(newState ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      setIsSaved(!newState); // Revert
      toast.error("Failed to update wishlist");
    } finally {
      setSaveLoading(false);
    }
  };

  // Function to clean dirty URLs (handles backticks, spaces, quotes)
  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    // Remove backticks, single quotes, double quotes, and surrounding whitespace
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

  const typeLabel = dynamicCatName ? dynamicCatName.toUpperCase() : (normalizedType || typeRaw).toString().toUpperCase();


  // Improved Rating Logic
  const rawRating =
    item.avgRating !== undefined ? item.avgRating :
      item.rating !== undefined ? item.rating :
        rating;

  const reviewCount = item.totalReviews || item.reviews || 0;

  // Show rating if it exists and is > 0, otherwise show 'New'
  const displayRating = (Number(rawRating) > 0) ? Number(rawRating).toFixed(1) : 'New';

  // Improved Price Logic - Check more fields
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
  const displayPrice =
    parsedPrice && !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

  const imageSrc =
    images?.cover ||
    cleanImageUrl(item.coverImage) ||
    cleanImageUrl(
      Array.isArray(item.propertyImages) ? item.propertyImages[0] : ''
    ) ||
    'https://via.placeholder.com/400x300?text=No+Image';

  const badgeTypeKey = normalizedType || typeRaw;

  // Housing.com style colors often use distinct semantic colors for types
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

  return (
    <div
      onClick={() => navigate(`/hotel/${_id}`)}
      className={`relative h-[270px] md:h-[340px] w-full bg-gray-100 rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 hover:-translate-y-1 group ${className}`}
    >
      {/* Background Cover Image */}
      <img
        src={imageSrc}
        alt={displayName}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
        }}
      />

      {/* Gradient Overlay */}
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
        
        {/* Subscription/Premium Tag */}
        {(item.rankingWeight > 0 || item.isFeatured) && (
          <span className="bg-[#FFD700] text-black px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-wider shadow-md border border-white/20 flex items-center gap-1 animate-pulse-slow">
            <Star size={8} className="fill-black" />
            PREMIUM
          </span>
        )}
      </div>

      {/* Top Right: Wishlist */}
      <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 flex flex-col gap-2 items-end z-20">
        <button
          onClick={handleToggleSave}
          className="p-1.5 md:p-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full shadow-md hover:bg-black/60 active:scale-95 transition-all"
        >
          <Heart
            size={13}
            className={`${isSaved ? 'fill-white text-white' : 'text-white/90'} md:hidden`}
          />
          <Heart
            size={16}
            className={`${isSaved ? 'fill-white text-white' : 'text-white/90'} hidden md:block`}
          />
        </button>
      </div>

      {/* The White Content Box */}
      <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3 bg-white rounded-xl md:rounded-2xl p-2.5 md:p-4 pt-5 md:pt-8 shadow-xl z-10">
        
        {/* Logo Overlapping */}
        <div className="absolute -top-4 md:-top-7 left-1/2 -translate-x-1/2 w-9 h-9 md:w-14 md:h-14 rounded-full border-2 md:border-[3px] border-white overflow-hidden bg-white shadow-sm flex items-center justify-center">
          <img 
            src={item.logo || imageSrc} 
            alt="Logo" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/150?text=Logo';
            }}
          />
        </div>

        {/* Text Details */}
        <div className="text-center">
          <h3 className="font-black text-xs md:text-sm text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {displayName}
          </h3>
          <p className="text-[8px] md:text-[10px] text-gray-500 mt-0.5 font-medium line-clamp-1">
            {item.rentDetails?.type || item.buyDetails?.type || item.bhk || ''} {item.rentDetails?.type || item.buyDetails?.type || item.bhk ? '•' : ''} {address?.area || address?.locality || item.locality || ''}{address?.area || address?.locality || item.locality ? ', ' : ''}{address?.city || item.city || 'Indore'}
          </p>
        </div>

        {/* Price & Actions Row */}
        <div className="mt-2 pt-2 md:mt-3 md:pt-3 border-t border-gray-100 flex items-center justify-between">
          
          {/* Price on the Left */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] md:text-sm font-black text-gray-900 flex items-center gap-0.5">
              ₹ {formattedPrice}
              {displayPrice && (
                <span className="text-[8px] md:text-[9px] text-gray-500 font-medium ml-0.5 mt-0.5">
                  {priceSuffix}
                </span>
              )}
            </span>
          </div>

          {/* Contact and View on the Right */}
          <div className="flex items-center gap-1 md:gap-2">
            {(item.contactNumber || item.phoneNumber) && (
              <a
                href={`tel:${item.contactNumber || item.phoneNumber}`}
                className="p-1 bg-gray-50 text-emerald-600 rounded-lg hover:bg-emerald-50 border border-gray-100 transition-colors shadow-sm"
                onClick={(e) => e.stopPropagation()}
                title="Call Now"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </a>
            )}
            <button className="text-[8px] md:text-[10px] font-bold text-white bg-gray-900 px-2 md:px-3 py-1 md:py-1.5 rounded-lg hover:bg-black transition-colors flex items-center gap-1 shadow-sm">
              View
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
