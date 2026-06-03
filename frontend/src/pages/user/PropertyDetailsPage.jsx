import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService, legalService, reviewService, offerService, availabilityService, userService, bookingService, enquiryService } from '../../services/apiService';
import GRHPropertyCard from '../../components/user/GRHPropertyCard';
import {
  MapPin, Star, Share2, Heart, ArrowLeft,
  Users, Calendar, Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, X, Gift,
  CheckCircle, Shield, Info, Clock, Wifi, Coffee, Car, Phone, Scan, Maximize2, Compass, Move, Grid, Landmark, LayoutTemplate,
  Wind, Droplets, Zap, Thermometer, Shirt, Sparkles, Camera, Dumbbell, Box, Flame, ArrowUpCircle, Tv, Utensils, User,
  Lock, Award, Check, ChevronDown, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);

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
  const [isAgent, setIsAgent] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

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

  const loadPropertyDetails = async () => {
    try {
      const response = await propertyService.getDetails(id);
      if (response && response.property) {
        const p = response.property;
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
        { id: 'seller', el: document.getElementById('seller') },
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
      const yOffset = -130; // matches scroll threshold offset
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveTab(sectionId);
    }
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
    if (localStorage.getItem('token')) {
      userService.getSavedHotels()
        .then(res => {
          const list = res.data || res.savedHotels || [];
          if (Array.isArray(list)) {
            const found = list.some(h => (typeof h === 'object' ? h._id : h) === id);
            setIsSaved(found);
          }
        })
        .catch(err => console.error("Failed to fetch saved status", err));
    }
  }, [id]);

  const handleToggleSave = async () => {
    if (!localStorage.getItem('token')) {
      toast.error("Please login to save properties");
      return;
    }
    try {
      const newState = !isSaved;
      setIsSaved(newState);
      await userService.toggleSavedHotel(id);
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
    if (!localStorage.getItem('token')) {
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
    return ['https://via.placeholder.com/800x600'];
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

  const handleInquiry = async () => {
    if (!localStorage.getItem('token')) {
      toast.error("Please login to send enquiry");
      navigate('/login', { state: { from: `/hotel/${id}` } });
      return;
    }

    setBookingLoading(true);
    try {
      let messageBody = `[Inquiry from Detail Page]\nName: ${leadName}\nPhone: ${leadPhone}\nAgent Status: ${isAgent ? 'Real Estate Agent' : 'Individual/Buyer'}\nMessage: ${enquiryMessage || 'Interested in this property.'}`;

      const response = await enquiryService.create({
        propertyId: id,
        enquiryType: 'contact_owner',
        message: messageBody,
        preferredDate: new Date(),
        timeSlot: '',
        budget: property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || 0
      });

      if (response.success) {
        toast.success("Enquiry details submitted successfully! The owner/dealer will contact you.");
        setEnquiryMessage('');
      }
    } catch (error) {
      toast.error(error.message || "Failed to send inquiry");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRevealContact = async () => {
    if (revealLoading) return;
    setRevealLoading(true);
    try {
      const response = await propertyService.revealContact(id);
      if (response.success) {
        setRevealedNumber(response.contactNumber);
      } else {
        toast.error(response.message || "Failed to reveal contact");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reveal contact");
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

  return (
    <div className="bg-[#f8fafe] min-h-screen pb-32 text-gray-800 font-sans selection:bg-blue-100 antialiased">
      
      {/* Premium Top Navigation Action Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 z-40 transition-all">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider line-clamp-1">
                {propertyType} for Resale
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
            { id: 'seller', label: 'Seller' },
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
              <p className="text-[10px] opacity-90 font-medium">Negotiable, 2% brokerage,...</p>
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

          {/* Quick Checklist beneath cover image */}
          <div className="p-4 bg-[#f8fbff] grid grid-cols-2 gap-y-2 gap-x-4 border-t border-gray-50 text-[11px] font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> East Facing
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Recently Renovated
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Gated Society
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Corner Property
            </div>
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
              Posted 1m ago by dealer
            </span>
          </div>

          <h1 className="text-base font-bold text-gray-900 leading-snug">
            {name} in Piccadilly 1 CHS, Goregaon East, Mumbai
          </h1>

          <div className="flex items-start gap-1.5 text-gray-500 text-xs">
            <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <span className="leading-tight">
              {address?.fullAddress || `${address?.locality}, ${address?.city}, ${address?.state}`}
            </span>
          </div>

          {/* Nearby Pills Grid */}
          <div className="pt-2 border-t border-gray-50">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">50 Places Nearby</div>
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              {['Royal Palms', 'Gaodevi Temple', 'Sparsh Poly Clinic', 'Nirala Nursing Home'].map((place, idx) => (
                <span key={idx} className="bg-gray-50 hover:bg-gray-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full border border-gray-150 whitespace-nowrap cursor-pointer transition-colors">
                  {place}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 3. SECTION: HIGHLIGHT CIRCULAR WIDGET MATRIX */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <LayoutTemplate size={18} />
              </div>
              <span className="text-[10px] font-bold text-gray-800">1 RK & 1 baths</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <Grid size={18} />
              </div>
              <span className="text-[10px] font-bold text-gray-800">1 of 7 floors</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <Maximize2 size={18} />
              </div>
              <span className="text-[10px] font-bold text-gray-800">244 sqft carpet</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[#0061df]">
                <span className="text-xs font-black">₹</span>
              </div>
              <span className="text-[10px] font-bold text-gray-800">₹14,344/sqft</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <Calendar size={18} />
              </div>
              <span className="text-[10px] font-bold text-gray-800">10+ Yr Old</span>
            </div>

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
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-blue-500 fill-blue-50" />
              <span>Full Power Backup</span>
            </div>
            <div className="flex items-center gap-2">
              <Car size={13} className="text-[#0061df]" />
              <span>Visitor Parking Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind size={13} className="text-emerald-500" />
              <span>
                Centrally Air Conditioned{' '}
                <button
                  onClick={() => setShowHighlightsModal(true)}
                  className="text-[#0061df] font-bold ml-1 hover:underline focus:outline-none"
                >
                  ...more
                </button>
              </span>
            </div>
          </div>

          {/* 24-Hour View Banner */}
          <div className="bg-[#eff6ff] rounded-xl p-3 border border-blue-50 flex items-center gap-2 text-[11px] font-semibold text-[#0061df]">
            <Users size={14} className="shrink-0 text-blue-500" />
            <span>4 people viewed this property in last 24 hours</span>
          </div>
        </div>

        {/* 5. SECTION: PROPERTY DETAILS SPECIFICATION TABLE (id="property-details") */}
        <div id="property-details" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-gray-50 pb-2">Property Details</h3>
          
          <div className="space-y-2">
            {[
              { label: 'Layout', value: '1 RK, 1 Baths' },
              { label: 'Ownership', value: 'Freehold' },
              { label: 'Carpet Area', value: '244 sq.ft.' },
              { label: 'Overlooking', value: 'Others, Park/Garden, Main Road' },
              { label: 'Width of facing road', value: '90 ft' },
              { label: 'Floor Number', value: '1' },
              { label: 'Flooring', value: 'Vitrified' },
              { label: 'Furnishing', value: 'Unfurnished' },
              { label: 'Facing', value: 'East' },
              { label: 'Power backup', value: 'Full' }
            ].map((spec, i) => (
              <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-b-0">
                <span className="text-slate-500 font-medium">{spec.label}</span>
                <span className="text-slate-900 font-bold">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. SECTION: PHOTO ALBUMS GRID / TAKE A TOUR (id="photos") */}
        <div id="photos" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Take a tour of the Property</h3>
            <p className="text-[10px] text-gray-500">With photos and videos</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { title: 'Entrance', count: 1, img: galleryImages[0] },
              { title: 'Hall', count: 1, img: galleryImages[1] || galleryImages[0] },
              { title: 'Bedroom', count: 2, img: galleryImages[2] || galleryImages[0] },
              { title: 'Kitchen', count: 1, img: galleryImages[3] || galleryImages[0] }
            ].map((album, idx) => (
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
            ))}
          </div>
        </div>

        {/* 7. SECTION: FACILITIES & AMENITIES (id="facilities") */}
        <div id="facilities" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          
          {/* Essential Facilities */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Essential Facilities</h3>
              <p className="text-[10px] text-gray-500">Core amenities already setup</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500 fill-amber-50" />
                <span>Power Back-up</span>
              </div>
              <div className="flex items-center gap-2">
                <Compass size={14} className="text-teal-500" />
                <span>Corner Property</span>
              </div>
              <div className="flex items-center gap-2">
                <Car size={14} className="text-[#0061df]" />
                <span>Reserved Parking</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpCircle size={14} className="text-slate-600" />
                <span>Lift(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-blue-500 fill-blue-50" />
                <span>Security Guard</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets size={14} className="text-sky-500" />
                <span>Water Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Car size={14} className="text-[#0061df]" />
                <span>1 Covered Parking</span>
              </div>
              <div className="flex items-center gap-2">
                <Grid size={14} className="text-indigo-500" />
                <span>In a Gated Society</span>
              </div>
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
                View all (14)
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {[
                { title: 'Security / Fire Alarm', icon: Shield, bg: 'bg-[#fff5f5] text-red-500' },
                { title: 'Centrally Air Conditioned', icon: Wind, bg: 'bg-[#effbfb] text-teal-600' },
                { title: 'Vaastu Compliant', icon: Compass, bg: 'bg-[#fffbf0] text-amber-600' }
              ].map((other, idx) => {
                const Icon = other.icon;
                return (
                  <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-center min-w-[120px] shrink-0">
                    <div className={`w-8 h-8 rounded-full ${other.bg} flex items-center justify-center mb-1.5 shadow-sm`}>
                      <Icon size={14} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-1">{other.title}</span>
                  </div>
                );
              })}
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
          <p className="text-xs text-slate-500 font-semibold">Address : 0000, Piccadilly 1 CHS, Goregaon East, Mumbai</p>
          
          <div className="text-xs text-slate-600 leading-relaxed font-medium">
            {description || 'This is a 1rk studio apartment for sale in goregaon east mumbai royal palms. It has a beautiful garden view and is close to local transit and school points.'}
          </div>
        </div>

        {/* 9. SECTION: CONTACT SELLER / LEAD GENERATION FORM (id="seller") */}
        <div id="seller" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Contact Dealer</h3>
            <p className="text-[10px] text-gray-500">Get a callback and resolve your queries</p>
          </div>

          {/* Seller profile overview */}
          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0061df] font-black text-lg shadow-inner">
              {sellerName.charAt(0)}
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">{sellerName}</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Shree Ganesh Realty | {displayPhone}</p>
              
              <div className="flex items-center gap-4 mt-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-0.5"><Shield size={10} className="text-emerald-500" /> 12 Verified</span>
                <span>46 Listed</span>
                <span>Member Since Jan 2023</span>
              </div>
            </div>
          </div>

          <a href="#complete-profile" className="block text-right text-xs font-bold text-[#0061df] hover:underline pb-2 border-b border-gray-50">
            View Complete Profile &gt;
          </a>

          {/* Lead capture form inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">+91</span>
                <input
                  type="text"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-10 text-xs font-semibold outline-none focus:border-blue-500 transition-colors"
                />
                <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Is Real Estate Agent trigger toggle */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Are you a Real Estate Agent?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAgent(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    isAgent
                      ? 'bg-blue-50 border-blue-500 text-[#0061df]'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsAgent(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    !isAgent
                      ? 'bg-blue-50 border-blue-500 text-[#0061df]'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 leading-normal font-semibold">
                I agree to Get-Right-home's <span className="text-[#0061df] hover:underline">Terms & Conditions</span> and <span className="text-[#0061df] hover:underline">Privacy Policy</span>.
              </span>
            </label>

            {/* Primary Action Button to View/Enquire */}
            <button
              onClick={() => {
                if (!agreedTerms) {
                  toast.error("Please agree to the Terms & Conditions");
                  return;
                }
                handleInquiry();
              }}
              disabled={bookingLoading}
              className="w-full py-3.5 bg-blue-50 hover:bg-blue-100 text-[#0061df] rounded-xl font-bold transition-all text-xs border border-blue-100 flex items-center justify-center gap-1.5 mt-2"
            >
              {bookingLoading ? <Loader2 className="animate-spin text-[#0061df]" size={14} /> : 'View Phone Number'}
            </button>
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
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
              
              {/* Item 1 */}
              <div className="p-2 rounded-xl border border-slate-100 bg-slate-50/50 min-w-[120px] shrink-0 text-center relative">
                <img src={galleryImages[0]} className="w-full h-12 object-cover rounded-lg mb-1" />
                <h4 className="text-[10px] font-bold text-gray-800 line-clamp-1">Piccadilly 1 CHS</h4>
                <p className="text-[10px] text-gray-900 font-extrabold">₹35 Lac</p>
                <span className="text-[9px] text-slate-500 font-semibold block">by Dealer</span>
              </div>

              <div className="text-[9px] font-bold text-white bg-slate-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                Vs
              </div>

              {/* Item 2 */}
              <div className="p-2 rounded-xl border border-slate-100 bg-slate-50/50 min-w-[120px] shrink-0 text-center relative">
                <img src={galleryImages[1] || galleryImages[0]} className="w-full h-12 object-cover rounded-lg mb-1" />
                <h4 className="text-[10px] font-bold text-gray-800 line-clamp-1">Golden Isle</h4>
                <p className="text-[10px] text-gray-900 font-extrabold">₹35.5 Lac</p>
                <span className="text-[9px] text-slate-500 font-semibold block">by Owner</span>
              </div>

              <div className="text-[9px] font-bold text-white bg-slate-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                Vs
              </div>

              {/* Item 3 */}
              <div className="p-2 rounded-xl border border-slate-100 bg-slate-50/50 min-w-[120px] shrink-0 text-center relative">
                <img src={galleryImages[2] || galleryImages[0]} className="w-full h-12 object-cover rounded-lg mb-1" />
                <h4 className="text-[10px] font-bold text-gray-800 line-clamp-1">Aditya Old Mhada</h4>
                <p className="text-[10px] text-gray-900 font-extrabold">₹30 Lac</p>
                <span className="text-[9px] text-slate-500 font-semibold block">by Owner</span>
              </div>

            </div>

            <button className="w-full py-2.5 bg-white border border-[#0061df] text-[#0061df] rounded-xl text-xs font-bold hover:bg-blue-50/50 active:scale-98 transition-all text-center block">
              View Comparison
            </button>
          </div>

          {/* Owner properties display card */}
          <div className="pt-4 border-t border-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Owner Properties</h4>
            
            <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50 p-2 flex gap-3 items-center">
              <img src={galleryImages[1] || galleryImages[0]} className="w-16 h-16 object-cover rounded-lg shadow-sm" />
              <div className="flex-1">
                <span className="bg-slate-200 text-slate-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">₹ 40 L</span>
                <h5 className="text-xs font-bold text-gray-800 line-clamp-1 mt-1">1 BHK Studio Apartment, 1 Baths</h5>
                <p className="text-[10px] text-slate-500 font-medium">In Starways CHS, Goregaon East, Mu...</p>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Posted by Owner 2 weeks ago</span>
              </div>
            </div>

            <div className="bg-[#eff6ff] rounded-xl p-3 border border-blue-50 flex items-center gap-2 text-[10px] font-semibold text-[#0061df]">
              <User size={13} className="text-blue-500" />
              <span>50+ people contacted this dealer for similar properties recently</span>
            </div>
          </div>

          {/* Compare with similar homes list carousel */}
          <div className="pt-4 border-t border-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Compare with Similar Homes</h4>
            
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
              {[
                { title: '1 RK Studio Apart...', price: '₹35 Lac', details: 'Ready to Move (10+ Year Old)' },
                { title: '1 RK Studio Apart...', price: '₹39.5 Lac', details: 'Ready to Move (10+ Year Old)' },
                { title: '1 RK Studio Apart...', price: '₹38 Lac', details: 'Ready to Move (10+ Year Old)' }
              ].map((simItem, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-150 p-3 w-[150px] shrink-0 shadow-sm hover:border-[#0061df] transition-colors cursor-pointer">
                  <img src={galleryImages[0]} className="w-full h-16 object-cover rounded-lg mb-1.5" />
                  <h5 className="text-[10px] font-bold text-gray-800 line-clamp-1">{simItem.title}</h5>
                  <p className="text-[10px] text-slate-500 font-bold">Piccadilly 1 CHS</p>
                  
                  <div className="flex items-center gap-1 my-1 text-[9px] text-[#d97706] font-bold">
                    <Star size={9} className="fill-[#d97706]" /> 4.3 <span className="text-slate-400 font-normal">(205 Reviews)</span>
                  </div>

                  <p className="text-xs font-extrabold text-gray-900">{simItem.price}</p>
                  <p className="text-[8px] text-slate-400 font-semibold">{simItem.details}</p>
                </div>
              ))}
            </div>

            <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 active:scale-98 transition-all text-center block">
              View detailed comparison
            </button>
          </div>
        </div>

        {/* 11. SECTION: LOCALITY REVIEWS DETAILS (id="explore-locality") */}
        <div id="explore-locality" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Locality Reviews</h3>
              <p className="text-[10px] text-gray-500">For Goregaon East, Mumbai</p>
            </div>
            <button className="text-xs font-bold text-[#0061df] hover:underline">View all</button>
          </div>

          {/* Average Rating Block */}
          <div className="flex items-center gap-6 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="text-center">
              <h4 className="text-2xl font-black text-slate-900 leading-none">4.3<span className="text-sm text-slate-400 font-normal"> / 5</span></h4>
              <div className="flex items-center gap-0.5 justify-center mt-1 text-[#d97706]">
                <Star size={11} className="fill-[#d97706]" />
                <Star size={11} className="fill-[#d97706]" />
                <Star size={11} className="fill-[#d97706]" />
                <Star size={11} className="fill-[#d97706]" />
                <Star size={11} className="text-slate-300" />
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Average Rating</p>
              <p className="text-[8px] text-slate-400">(205 Total Reviews)</p>
            </div>

            {/* Bars */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((starVal) => {
                const percentage = starVal === 5 ? 65 : (starVal === 4 ? 25 : (starVal === 3 ? 8 : 2));
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
              {[
                { title: 'Connectivity', val: '4.3/5', percent: 86 },
                { title: 'Lifestyle', val: '4.3/5', percent: 86 },
                { title: 'Safety', val: '4.2/5', percent: 84 },
                { title: 'Green Area', val: '4.2/5', percent: 84 }
              ].map((feat, idx) => (
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
          <div className="space-y-3 pt-2 border-t border-slate-50">
            
            {/* Positives */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-slate-900">What are the positives</h5>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Good Public Transport', 'Easy Cab/Auto Availability', 
                  'Good Schools are nearby', 'Markets at a walkable distance',
                  'Well-maintained Roads', 'Good Hospitals are nearby'
                ].map((pos, i) => (
                  <span key={i} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-100">
                    {pos}
                  </span>
                ))}
              </div>
            </div>

            {/* Negatives */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-slate-900">What are the negatives</h5>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Frequent Traffic Jams', 'Frequent Parking Issues'
                ].map((neg, i) => (
                  <span key={i} className="bg-red-50 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded border border-red-100">
                    {neg}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Reviews by Residents Horizontal scroll list */}
          <div className="space-y-3 pt-3 border-t border-slate-50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900">Reviews by Residents</span>
              <button className="text-xs font-bold text-[#0061df] hover:underline">View all</button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
              
              {/* Review Card 1 */}
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3 min-w-[220px] shrink-0 text-xs font-medium text-slate-700 relative">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">4.7 ★</span>
                  <span className="text-[10px] text-gray-500 font-bold ml-auto">1 person found helpful</span>
                </div>
                <h6 className="text-[11px] font-bold text-slate-900 mb-1">Aarey Milk Colony</h6>
                <p className="line-clamp-2 leading-relaxed opacity-95">Aarey Milk Colony is located in a prime location in the western suburbs of Mumbai, making it easily accessible...</p>
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-[10px]">N</div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-900 leading-none">Niranjan</p>
                    <p className="text-[8px] text-slate-400">Tenant (living since 2Y) | 10mo ago</p>
                  </div>
                </div>
              </div>

              {/* Review Card 2 */}
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3 min-w-[220px] shrink-0 text-xs font-medium text-slate-700 relative">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="bg-yellow-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">3.6 ★</span>
                </div>
                <h6 className="text-[11px] font-bold text-slate-900 mb-1">Royal Palms Area</h6>
                <p className="line-clamp-2 leading-relaxed opacity-95">Public Transport is good but safety at late night could be better. High connectivity to vegetable markets...</p>
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">AM</div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-900 leading-none">Ankit Mishra</p>
                    <p className="text-[8px] text-slate-400">Owner | 4Y ago</p>
                  </div>
                </div>
              </div>

            </div>

            <button className="w-full py-3 bg-[#0061df] hover:bg-blue-700 text-white rounded-xl text-xs font-bold hover:shadow-lg active:scale-98 transition-all text-center block">
              Review your Society / Locality
            </button>
          </div>

          {/* Affordability EMI calculator Tool card */}
          <div className="pt-3 border-t border-slate-50">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Check your affordability</span>
            
            <div className="rounded-xl border border-slate-150 p-3 bg-white flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
                  <Grid size={18} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Calculate EMI</h5>
                  <p className="text-[10px] text-slate-500 font-semibold">EMI ₹ 22,386 /month for 20 years @7.4%</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </div>
        </div>

      </div>

      {/* Ticker / Banner on top of footer bar */}
      <div className="fixed bottom-[65px] left-0 right-0 z-50 bg-[#fff5f6] border-y border-[#ffe2e5] py-2 px-4 shadow-md text-center max-w-xl mx-auto">
        <span className="text-[11px] font-bold text-red-600 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 bg-red-600 rounded-full animate-ping shrink-0" />
          6 people already contacted since last week
        </span>
      </div>

      {/* Sticky Bottom Actions Bar (Matches Image 1) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 p-2.5 shadow-2xl z-50 max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          
          {/* WhatsApp Support */}
          <button
            onClick={() => {
              const msg = encodeURIComponent(`Hi, I am interested in property "${name}" (${id}) listed on Get Right Home.`);
              window.open(`https://wa.me/919652961607?text=${msg}`, '_blank');
            }}
            className="flex-1 py-3 bg-white hover:bg-slate-50 text-emerald-600 border border-emerald-500 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            💬 WhatsApp
          </button>

          {/* Solid blue core action button */}
          <button
            onClick={() => {
              const pType = propertyType?.toLowerCase();
              const isHotelOrPg = ['hotel', 'pg', 'hostel', 'resort', 'homestay'].includes(pType);
              if (!isHotelOrPg) {
                handleInquiry();
              } else {
                // Hotel booking flow
                if (!selectedRoom && inventory && inventory.length > 0) {
                  toast.error("Please choose a Room Type first");
                  const el = document.getElementById('facilities');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  return;
                }
                
                // Route to checkout with selected dates
                const checkInDate = dates.checkIn || new Date().toISOString().split('T')[0];
                const checkOutDate = dates.checkOut || new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];
                
                navigate('/checkout', {
                  state: {
                    property,
                    selectedRoom: selectedRoom || (inventory && inventory[0]),
                    dates: { checkIn: checkInDate, checkOut: checkOutDate },
                    guests,
                    priceBreakdown: priceBreakdown || {
                      nights: 1,
                      units: 1,
                      pricePerNight: bookingBarPrice,
                      grossAmount: bookingBarPrice,
                      grandTotal: bookingBarPrice + Math.round((bookingBarPrice * taxRate) / 100),
                      taxAmount: Math.round((bookingBarPrice * taxRate) / 100)
                    },
                    taxRate
                  }
                });
              }
            }}
            className="flex-[2] py-3.5 bg-[#0061df] hover:bg-blue-700 text-white rounded-full text-xs font-bold flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
          >
            <span>View Number / Enquire</span>
          </button>

          {/* Call icon */}
          <a
            href={`tel:${revealedNumber || '919652961607'}`}
            onClick={handleRevealContact}
            className="w-11 h-11 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-[#0061df] rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all"
          >
            <Phone size={16} className="fill-current" />
          </a>

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
                {[
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
                })}
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
                    {[
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
                    })}
                  </div>
                </div>

                {/* Other Amenities list (Matches Image 8) */}
                <div className="space-y-2 pt-3 border-t border-slate-50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Other amenities</h4>
                  
                  <div className="space-y-2">
                    {[
                      { title: 'Piped-gas', icon: Flame },
                      { title: 'Bank Attached Property', icon: Landmark },
                      { title: 'Recently Renovated', icon: CheckCircle },
                      { title: 'High Ceiling Height', icon: Move },
                      { title: 'False Ceiling Lighting', icon: Sparkles }
                    ].map((otherA, i) => {
                      const Icon = otherA.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-700 py-1.5 border-b border-slate-50 last:border-0 last:pb-0">
                          <Icon size={14} className="text-slate-400" />
                          <span>{otherA.title}</span>
                        </div>
                      );
                    })}
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
