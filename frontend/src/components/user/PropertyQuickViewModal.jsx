import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Phone, MessageCircle, Share2, Heart, Mail, Eye, Calendar, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { enquiryService } from '../../services/apiService';

const PropertyQuickViewModal = ({ isOpen, onClose, property, initialShowEnquiry = false }) => {
  const navigate = useNavigate();
  const [showEnquiry, setShowEnquiry] = useState(initialShowEnquiry);
  const [isSaved, setIsSaved] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: JSON.parse(localStorage.getItem('user'))?.name || '',
    phone: JSON.parse(localStorage.getItem('user'))?.phone || '',
    email: JSON.parse(localStorage.getItem('user'))?.email || '',
    message: `Hi, I am interested in your property "${property?.propertyName || property?.name || 'this property'}" listed on Get Right Home. Please contact me.`,
    preferredDate: new Date().toISOString().split('T')[0]
  });

  React.useEffect(() => {
    if (isOpen) {
      setShowEnquiry(initialShowEnquiry);
      // Update form message with correct property name
      setFormData(prev => ({
        ...prev,
        name: JSON.parse(localStorage.getItem('user'))?.name || '',
        phone: JSON.parse(localStorage.getItem('user'))?.phone || '',
        email: JSON.parse(localStorage.getItem('user'))?.email || '',
        message: `Hi, I am interested in your property "${property?.propertyName || property?.name || 'this property'}" listed on Get Right Home. Please contact me.`
      }));
    }
  }, [isOpen, initialShowEnquiry, property]);

  React.useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  if (!isOpen || !property) return null;

  const {
    _id,
    name,
    address,
    images,
    propertyType,
    startingPrice
  } = property;

  const displayName = property.propertyName || name || 'Untitled Property';

  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/[`'"]/g, '').trim();
  };

  const imageSrc =
    images?.cover ||
    cleanImageUrl(property.coverImage) ||
    cleanImageUrl(
      Array.isArray(property.propertyImages) ? property.propertyImages[0] : ''
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
    property.startingPrice ??
    property.rentDetails?.monthlyRent ??
    property.pgDetails?.monthlyRent ??
    property.buyDetails?.expectedPrice ??
    property.plotDetails?.expectedPrice ??
    property.dynamicData?.expectedPrice ??
    property.dynamicData?.monthlyRent ??
    property.dynamicData?.expectedRent ??
    property.dynamicData?.price ??
    property.price ??
    null;

  const displayPrice = formatPriceLakhCrore(rawPrice);

  const bhkValue = property.rentDetails?.type || property.buyDetails?.type || property.bhk || property.dynamicData?.bedrooms || '';
  const areaValue = property.carpetArea || property.superArea || property.plotDetails?.plotArea || property.dynamicData?.plotArea || property.dynamicData?.carpetArea || '';
  const areaUnit = property.carpetAreaUnit || property.areaUnit || property.dynamicData?.carpetAreaUnit || 'sqft';

  const renderDetailsRow = () => {
    if (bhkValue) {
      const suffix = /^\d+$/.test(bhkValue.toString().trim()) ? ' BHK' : '';
      return <span className="text-xs font-semibold text-blue-400">{bhkValue}{suffix}</span>;
    }
    if (areaValue) {
      return <span className="text-xs font-semibold text-gray-300">• {areaValue} {areaUnit}</span>;
    }
    return null;
  };

  const getDisplayLocation = (prop) => {
    if (!prop) return 'Anantapur';
    const addr = prop.address;
    if (typeof addr === 'string' && addr.trim()) return addr;
    if (addr?.fullAddress) return addr.fullAddress;
    
    const locality = addr?.area || addr?.locality || prop.locality || prop.dynamicData?.locality || '';
    const city = addr?.city || prop.city || prop.dynamicData?.city || '';
    
    if (locality && city) return `${locality}, ${city}`;
    return locality || city || addr?.city || 'Anantapur';
  };
  const locationText = getDisplayLocation(property);

  const phoneNum = property.contactNumber || property.phoneNumber || '9123456789';

  const handleCall = (e) => {
    e.stopPropagation();
    window.location.href = `tel:${phoneNum}`;
  };

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    const msg = encodeURIComponent(`Hi, I am interested in your property "${displayName}" listed on Get Right Home.`);
    window.open(`https://wa.me/${phoneNum}?text=${msg}`, '_blank');
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

  const handleEnquiryClick = (e) => {
    e.stopPropagation();
    if (!localStorage.getItem('token')) {
      toast.error('Please login to send enquiry');
      navigate('/login', { state: { from: `/hotel/${_id}` } });
      onClose();
      return;
    }
    setShowEnquiry(true);
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquiryLoading(true);
    try {
      const pType = propertyType?.toLowerCase() || 'buy';
      const response = await enquiryService.create({
        propertyId: _id,
        enquiryType: 'contact_owner',
        message: formData.message,
        preferredDate: formData.preferredDate ? new Date(formData.preferredDate) : new Date(),
        budget: rawPrice || 0
      });

      if (response.success) {
        toast.success('Enquiry submitted successfully!');
        setShowEnquiry(false);
      } else {
        toast.error('Failed to submit enquiry');
      }
    } catch (err) {
      toast.error(err.message || 'Server error submitting enquiry');
    } finally {
      setEnquiryLoading(false);
    }
  };

  const transactionType = property.transactionType || property.dynamicData?.transactionType || 'BUY';

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[320px] bg-[#0f172a] rounded-[1.5rem] overflow-hidden shadow-2xl flex flex-col border border-gray-800 animate-in fade-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image Container */}
        <div className="relative h-[180px] w-full overflow-hidden bg-gray-900 shrink-0">
          <img
            src={imageSrc}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
            }}
          />

          {/* Floating Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md active:scale-90 transition-transform z-10 text-gray-800 hover:bg-white"
          >
            <X size={16} />
          </button>

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
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md active:scale-90 transition-transform z-10"
          >
            <Heart
              size={15}
              className={`transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-800 hover:text-red-500'}`}
            />
          </button>

          {/* Floating Transaction Badge */}
          <span className="absolute bottom-3 right-3 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
            {transactionType === 'Rent / Lease' ? 'RENT' : transactionType === 'Paying Guest' ? 'PG' : 'BUY'}
          </span>
        </div>

        {/* Form or Info Details Body */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          {!showEnquiry ? (
            <>
              <div>
                {(() => {
                  const plotKeywords = ['plot', 'land'];
                  const isPlotOrLand =
                    plotKeywords.some(k => (property.propertyCategory || '').toLowerCase().includes(k)) ||
                    plotKeywords.some(k => (property.propertyType || '').toLowerCase().includes(k)) ||
                    plotKeywords.some(k => (property.dynamicCategory?.displayName || '').toLowerCase().includes(k)) ||
                    plotKeywords.some(k => (property.dynamicCategory?.name || '').toLowerCase().includes(k));

                  if (isPlotOrLand) {
                    return (
                      <>
                        {/* Price and Area in same line */}
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-[18px] font-black text-white tracking-tight">
                            {displayPrice} <span className="text-[11px] font-normal text-gray-400">onwards</span>
                          </span>
                          {areaValue && (
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {areaValue} {areaUnit}
                            </span>
                          )}
                        </div>

                        {/* Dashed Separator */}
                        <div className="border-t border-dashed border-gray-800 my-2" />

                        {/* Title */}
                        <h3 className="text-sm font-bold text-gray-100 line-clamp-2">
                          {displayName}
                        </h3>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                          <MapPin size={12} className="text-gray-500 shrink-0" />
                          <span className="line-clamp-1">{locationText}</span>
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      {/* Price */}
                      <div className="text-2xl font-black text-white tracking-tight">
                        {displayPrice}
                      </div>

                      {/* BHK / Area */}
                      <div className="mt-0.5 min-h-[16px] flex items-center gap-1.5 text-xs text-gray-400">
                        {renderDetailsRow()}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-gray-150 line-clamp-2 mt-1">
                        {displayName}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                        <MapPin size={12} className="text-gray-500 shrink-0" />
                        <span className="line-clamp-1">{locationText}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 mt-2 w-full justify-between">
                {/* Call Button */}
                <button
                  onClick={handleCall}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 bg-[#198754] hover:bg-[#157347] text-white rounded-xl active:scale-95 transition-all text-[10px] font-bold"
                >
                  <Phone size={14} className="fill-white text-white" />
                  <span>Call</span>
                </button>

                {/* WhatsApp Button */}
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 bg-[#198754] hover:bg-[#157347] text-white rounded-xl active:scale-95 transition-all text-[10px] font-bold"
                >
                  <MessageCircle size={14} className="fill-white text-white" />
                  <span>WhatsApp</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white rounded-xl active:scale-95 transition-all text-[10px] font-bold"
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>

                {/* Enquire Button */}
                <button
                  onClick={handleEnquiryClick}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 bg-[#820ad1] hover:bg-[#6c08af] text-white rounded-xl active:scale-95 transition-all text-[10px] font-bold"
                >
                  <Mail size={14} />
                  <span>Enquire</span>
                </button>
              </div>

              {/* View Full Details Button */}
              <button
                onClick={() => {
                  onClose();
                  navigate(`/hotel/${_id}`);
                }}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-1 border border-gray-700 hover:border-gray-500 rounded-xl text-xs font-bold active:scale-95 transition-all bg-transparent text-gray-200"
              >
                <Eye size={14} />
                <span>View Full Details</span>
              </button>
            </>
          ) : (
            /* Enquiry Form State */
            <form onSubmit={handleEnquirySubmit} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                <button
                  type="button"
                  onClick={() => setShowEnquiry(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-xs font-black tracking-wider uppercase text-purple-400">Submit Enquiry</span>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#1e293b] border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#1e293b] border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full bg-[#1e293b] border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Message</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[#1e293b] border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowEnquiry(false)}
                  className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enquiryLoading}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  {enquiryLoading ? (
                    <Loader2 className="animate-spin text-white" size={14} />
                  ) : (
                    <span>Submit</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyQuickViewModal;
