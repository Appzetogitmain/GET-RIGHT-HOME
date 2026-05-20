import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService, legalService, reviewService, offerService, availabilityService, userService, bookingService } from '../../services/apiService';
import GRHPropertyCard from '../../components/user/GRHPropertyCard';
import {
  MapPin, Star, Share2, Heart, ArrowLeft,
  Users, Calendar, Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, X, Gift,
  CheckCircle, Shield, Info, Clock, Wifi, Coffee, Car, Phone, Scan, Maximize2, Compass, Move, Grid, Landmark, LayoutTemplate,
  Wind, Droplets, Zap, Thermometer, Shirt, Sparkles, Camera, Dumbbell, Box, Flame, ArrowUpCircle, Tv, Utensils, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModernDatePicker from '../../components/ui/ModernDatePicker';

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
  const [taxRate, setTaxRate] = useState(0); // Fetched from backend
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

  // Check Availability Logic
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

      // Handle array response from backend
      if (Array.isArray(response)) {
        // Ensure ID comparison handles string/object ID types safely
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

  // Removed useEffect for automatic availability check as per requirement
  // to only check on "Book Now" click.
  /*
  useEffect(() => {
    checkAvailability();
  }, [dates.checkIn, dates.checkOut, selectedRoom?._id, guests.rooms]);
  */

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

  // Lock Body Scroll when Modal Open
  useEffect(() => {
    if (showOffersModal || showImageModal) {
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
  }, [showOffersModal, showImageModal]);

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
        // Only set selected room on first load if not set
        // REMOVED: Do NOT auto select room, so Property Images show first by default.
        // if (!selectedRoom && adapted.inventory && adapted.inventory.length > 0) {
        //   setSelectedRoom(adapted.inventory[0]);
        // }
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

  // Helper derived state for hooks (safe access)
  const propertyType = property?.propertyType;
  const isBedBased = ['hostel', 'pg'].includes(propertyType?.toLowerCase());

  // Update guests when rooms change to ensure valid state
  useEffect(() => {
    if (isBedBased) {
      setGuests(prev => ({ ...prev, adults: prev.rooms, children: 0 }));
    }
  }, [guests.rooms, isBedBased]);

  const getDefaultPgDates = () => {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(new Date().getTime() + 2592000000).toISOString().split('T')[0]; // 30 days
    return { checkIn: start, checkOut: end };
  };

  useEffect(() => {
    if (id) {
      fetchReviews();
      fetchOffers();
    }
  }, [id]);

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
            // Check if current ID exists in the list (handles populated objects or raw IDs)
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
      // Optional: navigate to login
      return;
    }
    try {
      // Optimistic update
      const newState = !isSaved;
      setIsSaved(newState);

      await userService.toggleSavedHotel(id);

      toast.success(newState ? "Added to wishlist" : "Removed from wishlist");
    } catch (err) {
      // Revert on error
      setIsSaved(!isSaved);
      toast.error("Failed to update wishlist");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: property?.name || 'HoomZo Stay',
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

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedRoom]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-surface" size={40} /></div>;
  if (!property) return <div className="h-screen flex items-center justify-center">Property not found</div>;

  const {
    _id, name, address, images, description, avgRating: rating,
    inventory, amenities, policies, config,
    pgDetails, rentDetails, buyDetails, plotDetails, nearbyPlaces,
    videoUrl, virtualTourLink, isVerified, isFeatured, isUrgent, isNegotiable,
    contactNumber
  } = property;

  const hasInventory = inventory && inventory.length > 0;
  // Treated as Whole Unit if it's a Villa OR (Homestay/Apartment with NO separate inventory units)
  const isWholeUnit = propertyType === 'Villa' || (['Homestay', 'Apartment'].includes(propertyType) && !hasInventory);

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

  const getRoomPrice = (room) => {
    if (!room) return null;
    if (room.pricing) {
      if (typeof room.pricing.basePrice === 'number') return room.pricing.basePrice;
      if (typeof room.pricing.weekendPrice === 'number') return room.pricing.weekendPrice;
    }
    return room.price || null;
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

  const getMaxAdults = () => {
    // If a specific room/unit is selected (which contains the limits), use it
    if (selectedRoom) {
      // Multiply by number of units/rooms selected if applicable
      // But for 'Entire Villa' (inventoryType='entire'), usually quantity is 1 which is guests.rooms
      return (selectedRoom.maxAdults || 12) * (isWholeUnit ? 1 : guests.rooms);
    }

    if (isWholeUnit) return property.structure?.maxGuests || property.maxGuests || 12;
    if (isBedBased) return guests.rooms; // 1 person per bed

    if (propertyType === 'Resort') return guests.rooms * 4;
    return guests.rooms * 3;
  };

  const getMaxChildren = () => {
    if (selectedRoom) {
      if (selectedRoom.maxChildren !== undefined) {
        return selectedRoom.maxChildren * (isWholeUnit ? 1 : guests.rooms);
      }
    }

    if (isBedBased) return 0;
    if (isWholeUnit) return 6;

    return guests.rooms * 2;
  };

  const getUnitLabel = () => {
    if (propertyType === 'Tent') return 'Tents';
    if (propertyType === 'Homestay' || propertyType === 'Villa') return 'Units';
    if (['PG', 'Hostel'].includes(propertyType)) return 'Beds';
    return 'Rooms';
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
  const extraPricingLabels = getExtraPricingLabels(bookingRoom);
  const getPriceBreakdown = () => {
    const isPg = propertyType?.toLowerCase() === 'pg';
    const isHostel = propertyType?.toLowerCase() === 'hostel';
    const isPgOrHostel = isPg || isHostel;
    if (!selectedRoom || (!isPgOrHostel && (!dates.checkIn || !dates.checkOut))) return null;

    let { nights: stayNights, perNight } = stayPricing;

    // For PGs/Hostels, if dates aren't selected, we assume 1 month (1 unit of pricing)
    const nights = isPgOrHostel ? 1 : stayNights;
    if (nights === 0 && !isPgOrHostel) return null;

    // Ensure perNight is valid even if dates are missing for PG/Hostel
    if (isPgOrHostel && !dates.checkIn) {
      perNight = getRoomPrice(selectedRoom);
    }

    const units = isWholeUnit ? 1 : guests.rooms;

    // Base Occupancy Logic
    // If Villa/WholeUnit -> assuming base is 2 per unit for calculation if extraAdultPrice > 0, 
    // BUT usually 'Entire Villa' standard price covers up to a certain amount.
    // Given the user prompt implies dynamic calculation, we assume Standard Base = 2.
    // Ideally this should come from backend (e.g. baseAdults). Defaults to 2.
    // Dynamic Base Capacity from Room/Property
    const baseAdultsPerUnit = selectedRoom.maxAdults || property.maxGuests || 2;
    const baseChildrenPerUnit = selectedRoom.maxChildren !== undefined ? selectedRoom.maxChildren : 0;

    // Calculate Extras
    // Total Adults - (Base * Units)
    const extraAdultsCount = Math.max(0, guests.adults - (baseAdultsPerUnit * units));
    const extraChildrenCount = Math.max(0, guests.children - (baseChildrenPerUnit * units));

    const pricePerNight = getRoomPrice(selectedRoom);
    const extraAdultPrice = selectedRoom.pricing?.extraAdultPrice || 0;
    const extraChildPrice = selectedRoom.pricing?.extraChildPrice || 0;

    const totalBasePrice = pricePerNight * nights * units;
    const totalExtraAdultCharge = extraAdultsCount * extraAdultPrice * nights;
    const totalExtraChildCharge = extraChildrenCount * extraChildPrice * nights;

    const grossAmount = totalBasePrice + totalExtraAdultCharge + totalExtraChildCharge;

    // --- DISCOUNT CALCULATION ---
    let discountAmount = 0;
    if (appliedOffer) {
      // Validate Min Booking Amount
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
      } else {
        // Auto-remove if condition met no longer? Or simply don't apply.
        // Let's not apply but maybe don't remove so user sees why?
        // Simpler: Just 0 discount.
        discountAmount = 0;
      }
    }

    // Ensure we don't discount below 0
    discountAmount = Math.min(discountAmount, grossAmount);

    const commissionableAmount = grossAmount; // Base + Extras
    const taxableAmount = grossAmount - discountAmount;

    // Tax Calculation (on Commissionable Amount) matching backend logic
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

  const priceLabel = isPgGroup ? 'Monthly Rent' : isBuyGroup ? 'Asking Price' : isRentGroup ? 'Monthly Rent' : 'Price per night';

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
      toast.error("Please login to send inquiry");
      navigate('/login', { state: { from: `/hotel/${id}` } });
      return;
    }

    setBookingLoading(true);
    try {
      const pType = propertyType?.toLowerCase() || 'buy';
      let messageBody = '';
      let preferredDate = dates.checkIn ? new Date(dates.checkIn) : new Date();

      if (enquiryTab === 'contact') {
        messageBody = `[Contact Owner Request]\nMessage: ${enquiryMessage || 'Hi, I am interested in this property. Please share details.'}`;
      } else if (enquiryTab === 'visit') {
        if (!visitDate) {
          toast.error("Please select a date for your visit");
          setBookingLoading(false);
          return;
        }
        preferredDate = new Date(visitDate);
        messageBody = `[Schedule Visit Request]\nDate: ${visitDate}\nTime Slot: ${visitSlot}\nMessage: ${enquiryMessage || 'I would like to schedule a visit to this property.'}`;
      } else if (enquiryTab === 'callback') {
        messageBody = `[Request Callback]\nPreferred Time: ${callbackTime}\nMessage: ${enquiryMessage || 'Please call me back.'}`;
      }

      const response = await bookingService.create({
        propertyId: id,
        isInquiry: true,
        message: messageBody,
        budget: property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || 0,
        propertyType: pType,
        checkInDate: preferredDate
      });

      if (response.success) {
        toast.success(
          enquiryTab === 'visit' ? "Visit scheduled successfully! The partner will contact you soon." :
          enquiryTab === 'callback' ? "Callback requested! You will get a call soon." :
          "Inquiry sent to owner successfully!"
        );
        setEnquiryMessage('');
      }
    } catch (error) {
      toast.error(error.message || "Failed to send inquiry");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBook = async () => {
    const pType = propertyType?.toLowerCase();
    if (pType === 'buy' || pType === 'plot' || pType === 'rent') {
      handleInquiry();
      return;
    }

    const isPgOrHostel = pType === 'pg' || pType === 'hostel';
    if (!isPgOrHostel && (!dates.checkIn || !dates.checkOut)) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    if (!selectedRoom && !['Rent', 'Buy', 'Plot'].includes(propertyType)) {
      toast.error("Please select a room/unit");
      return;
    }

    // Capture availability result (either from state or fresh check)
    let currentAvailability = availability;

    if (!currentAvailability || checkingAvailability) {
      // If we are currently checking, or haven't checked yet, do a fresh wait
      currentAvailability = await checkAvailability();
    }

    if (!currentAvailability || currentAvailability.available !== true) {
      toast.error(currentAvailability?.message || (isPgOrHostel ? "Selected room/bed is not available" : "Selected room is not available for these dates"));
      return;
    }

    if (!localStorage.getItem('token')) {
      toast.error("Please login to book");
      navigate('/login', { state: { from: `/hotel/${id}` } });
      return;
    }

    if (!priceBreakdown) {
      toast.error("Unable to calculate price. Please check dates.");
      return;
    }

    navigate('/checkout', {
      state: {
        property,
        selectedRoom,
        dates: (propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? getDefaultPgDates() : dates,
        guests: {
          ...guests,
          rooms: guests.rooms
        },
        priceBreakdown,
        taxRate,
        couponCode: priceBreakdown.couponCode
      }
    });
  };

  const handleApplyOffer = (offer) => {
    // Basic pre-validation
    const gross = priceBreakdown ? priceBreakdown.grossAmount : (bookingBarPrice || 0);
    if (offer.minBookingAmount && gross < offer.minBookingAmount) {
      toast.error(`Min booking amount of ₹${offer.minBookingAmount} required`);
      return;
    }
    setAppliedOffer(offer);
    setShowOffersModal(false);
    toast.success(`'${offer.code}' applied!`);
  };

  const handleRemoveOffer = () => {
    setAppliedOffer(null);
    toast.success('Coupon removed');
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
    
    if (cleanStr.length < 5) return str;
    return `${countryPrefix}${cleanStr.substring(0, 4)}XXXXXX${cleanStr.substring(cleanStr.length - 2)}`;
  };

  const renderEnquiryWidget = () => {
    const ownerName = property?.partnerId?.name || property?.userId?.name || 'Owner';
    const dbPhone = property?.contactNumber || property?.partnerId?.phone || property?.userId?.phone || 'N/A';
    const displayPhone = revealedNumber ? revealedNumber : maskPhone(dbPhone);

    return (
      <div className="space-y-4">
        {/* Price Card */}
        <div className="bg-[#f0f7ff] rounded-2xl p-5 mb-4 border border-blue-50/50">
          <p className="text-sm text-gray-500 font-semibold mb-1">Price</p>
          <p className="text-3xl font-black text-[#0061df] tracking-tight">
            {formatPriceLakhCrore(bookingBarPrice)}
            {(isRentGroup || isPgGroup) && <span className="text-sm text-gray-400 font-medium ml-1">/ month</span>}
          </p>
        </div>

        {/* 3 Call-to-actions */}
        <div className="space-y-3">
          <button
            onClick={handleRevealContact}
            disabled={revealLoading}
            className="w-full py-3.5 bg-[#0061df] hover:bg-[#0052be] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-sm"
          >
            {revealLoading ? <Loader2 className="animate-spin text-white" size={16} /> : (
              <>
                <Phone size={16} className="fill-white text-white" />
                <span>Contact Owner</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (!localStorage.getItem('token')) {
                toast.error("Please login to schedule a visit");
                navigate('/login', { state: { from: `/hotel/${_id}` } });
                return;
              }
              setShowVisitModal(true);
            }}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-sm"
          >
            <Calendar size={16} className="text-slate-500" />
            <span>Schedule Visit</span>
          </button>

          <button
            onClick={() => {
              if (!localStorage.getItem('token')) {
                toast.error("Please login to request a callback");
                navigate('/login', { state: { from: `/hotel/${_id}` } });
                return;
              }
              setShowCallbackModal(true);
            }}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-sm"
          >
            <Phone size={16} className="text-slate-500" />
            <span>Request Callback</span>
          </button>
        </div>

        <hr className="border-slate-100 my-4" />

        {/* Owner Details */}
        <div>
          <h3 className="text-slate-900 text-base font-bold mb-3">Owner Details</h3>
          <div className="grid grid-cols-3 gap-y-2 text-sm mb-4">
            <span className="text-slate-500 font-medium col-span-1">Name:</span>
            <span className="text-slate-800 font-bold col-span-2">{ownerName}</span>
            
            <span className="text-slate-500 font-medium col-span-1">Phone:</span>
            <span className="text-slate-800 font-bold col-span-2">{displayPhone}</span>
          </div>
        </div>

        {/* Support Alert Box */}
        <div className="bg-[#eff6ff] border border-blue-100 rounded-xl p-3.5 text-xs text-blue-700 font-medium flex items-start gap-2 leading-relaxed">
          <Info size={14} className="mt-0.5 shrink-0 text-blue-600" />
          <span>Contact our support team for inquiries about this property</span>
        </div>

        {/* Support Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const msg = encodeURIComponent(`Hi, I am interested in property "${name}" (${_id}) listed on Get Right Home.`);
              window.open(`https://wa.me/919652961607?text=${msg}`, '_blank');
            }}
            className="flex-1 py-2.5 bg-[#25d366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            💬 WhatsApp Support
          </button>
          <a
            href="tel:+919652961607"
            className="flex-1 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            📞 Call Support
          </a>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-semibold tracking-wide mt-2">
          Platform Support: +91 9652961607
        </p>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 lg:pb-12 relative">
      {/* Header Image Gallery */}
      <div className="relative h-[40vh] md:h-[60vh] bg-gray-200 group z-0">
        <div className="hidden md:grid h-full grid-cols-4 gap-1.5 p-1.5">
          {/* Main Large Image */}
          <div className="relative col-span-2 h-full overflow-hidden rounded-l-xl cursor-pointer" onClick={() => { setCurrentImageIndex(0); setShowImageModal(true); }}>
            <img src={galleryImages[0]} alt={name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          </div>

          {/* Middle Column */}
          <div className="col-span-1 flex flex-col gap-1.5 h-full">
            <div className="relative h-1/2 overflow-hidden cursor-pointer" onClick={() => { setCurrentImageIndex(1); setShowImageModal(true); }}>
              <img src={galleryImages[1] || galleryImages[0]} alt={name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative h-1/2 overflow-hidden cursor-pointer" onClick={() => { setCurrentImageIndex(2); setShowImageModal(true); }}>
              <img src={galleryImages[2] || galleryImages[0]} alt={name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-1 flex flex-col gap-1.5 h-full">
            <div className="relative h-1/2 overflow-hidden rounded-tr-xl cursor-pointer" onClick={() => { setCurrentImageIndex(3); setShowImageModal(true); }}>
              <img src={galleryImages[3] || galleryImages[0]} alt={name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative h-1/2 overflow-hidden rounded-br-xl cursor-pointer" onClick={() => { setCurrentImageIndex(Math.min(4, galleryImages.length - 1)); setShowImageModal(true); }}>
              <img src={galleryImages[Math.min(4, galleryImages.length - 1)] || galleryImages[0]} alt={name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              {/* View All Overlay */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px] hover:bg-black/60 transition-colors group/view">
                <span className="text-white font-bold text-sm tracking-wide border border-white/50 px-4 py-2 rounded-full group-hover/view:bg-white group-hover/view:text-black transition-all">
                  +{galleryImages.length > 5 ? galleryImages.length - 5 : 'View'} Photos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden relative h-full w-full bg-gray-200">
          <img
            src={mainImage}
            alt={name}
            onClick={() => setShowImageModal(true)}
            className="w-full h-full object-cover"
          />
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md border border-white/20"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md border border-white/20"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                {galleryImages.map((_, index) => (
                  <span
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${index === currentImageIndex ? 'bg-white w-4' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Navigation & Actions */}
        <div className="absolute top-4 left-4 z-20">
          <button onClick={() => navigate(-1)} className="bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition-all active:scale-95 text-gray-700 hover:text-black">
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="absolute top-4 right-4 flex gap-3 z-20">
          <button onClick={handleShare} className="bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition-all active:scale-95 text-gray-700 hover:text-black">
            <Share2 size={20} />
          </button>
          <button onClick={handleToggleSave} className="bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition-all active:scale-95">
            <Heart size={20} className={`${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto md:px-6 md:py-6 lg:py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Left Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white md:rounded-2xl p-5 md:p-8 md:shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:border border-gray-100">

              {/* Title & Badge */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-surface/10 text-surface text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      {propertyType}
                    </span>
                    {isVerified && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Shield size={10} className="fill-blue-600 text-blue-600" /> Verified</span>}
                    {isFeatured && <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1"><Star size={10} className="fill-amber-600 text-amber-600" /> Featured</span>}
                    {isUrgent && <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100">Urgent</span>}
                    {isNegotiable && <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded border border-green-100">Negotiable</span>}
                    {rating !== undefined && rating !== null && (
                      <div className="flex items-center gap-1 bg-honey/10 text-honey-dark px-2 py-0.5 rounded text-[10px] font-bold">
                        <Star size={10} className="fill-honey text-honey" />
                        {Number(rating) > 0 && reviews.length > 0 ? Number(rating).toFixed(1) : 'New'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl md:text-3xl font-bold text-textDark leading-tight">{name}</h1>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider shrink-0">
                      Property ID: {property?.propertyId || id?.substring(id?.length - 8).toUpperCase() || 'N/A'}
                    </span>
                    {property?.dynamicData?.availability && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider shrink-0">
                        {property.dynamicData.availability}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-1.5 text-gray-500 text-xs md:text-sm">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-3 md:line-clamp-1">
                      {address?.fullAddress}
                      {address?.city ? `, ${address.city}` : ''}
                      {address?.district ? `, ${address.district}` : ''}

                      {address?.state ? `, ${address.state}` : ''}
                      {address?.pincode ? ` - ${address.pincode}` : ''}
                    </span>
                  </div>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm text-gray-500">{priceLabel || 'Starting from'}</p>
                  <p className="text-2xl font-bold text-surface">₹{bookingBarPrice?.toLocaleString() || 'N/A'}</p>
                  {stayPricing.nights > 0 && (
                    <p className="text-[11px] text-gray-400">
                      {stayPricing.nights} nights ({stayPricing.weekdayNights} weekday, {stayPricing.weekendNights} weekend)
                    </p>
                  )}
                </div>
              </div>

              <hr className="border-gray-100 mb-6" />

              {/* Mobile Owner/Enquiry Section (Above Specs Tab Bar) */}
              <div className="lg:hidden mb-8">
                {renderEnquiryWidget()}
              </div>

              {/* Horizontal Specs Tab Bar */}
              <div className="flex gap-2 border-b border-gray-100 pb-3 mb-6 overflow-x-auto hide-scrollbar sticky top-0 bg-white z-20 pt-2">
                <button
                  onClick={() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-all shrink-0"
                >
                  🏠 Overview
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-all shrink-0"
                >
                  ✨ Key Features
                </button>
                <button
                  onClick={() => document.getElementById('amenities')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-all shrink-0"
                >
                  🏊 Amenities
                </button>
              </div>

              <div className="mb-8" id="overview">
                <h2 className="text-lg font-bold text-textDark mb-3">About this place</h2>
                {property.shortDescription && (
                  <p className="text-gray-500 font-bold italic text-sm mb-3">
                    {property.shortDescription}
                  </p>
                )}
                <p className="text-gray-600 leading-relaxed text-sm md:text-base mb-4">
                  {description || "No description available."}
                </p>
                <div className="flex flex-wrap gap-3">
                  {videoUrl && (
                    <a href={videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-bold text-sm">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"><div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-red-600 border-b-[4px] border-b-transparent ml-0.5"></div></div>
                      Watch Video
                    </a>
                  )}
                  {virtualTourLink && (
                    <a href={virtualTourLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-sm">
                      <Users size={18} /> 360° Virtual Tour
                    </a>
                  )}
                </div>
              </div>

              {/* Amenities - Dynamic Switching */}
              {(() => {
                // 1. Determine which list to use: Room-specific if selected, otherwise Property-wide
                const showRoomAmenities = selectedRoom && selectedRoom.amenities && selectedRoom.amenities.length > 0;
                const displayAmenities = showRoomAmenities ? selectedRoom.amenities : amenities;
                const title = showRoomAmenities ? 'Room Amenities' : 'Amenities';

                // 2. Filter valid items
                const validAmenities = displayAmenities?.filter(item => item && typeof item === 'string' && item.trim().length > 0) || [];

                // 3. Render if items exist
                if (validAmenities.length === 0) return null;

                return (
                  <div className="mb-4" id="amenities">
                    <h2 className="text-lg font-bold text-textDark mb-2">{title}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {validAmenities.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-gray-600 text-sm">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            {(() => {
                              const iconName = item.toLowerCase().trim();
                              const IconComponent = {
                                'wi-fi': Wifi,
                                'wifi': Wifi,
                                'ac': Wind,
                                'air conditioning': Wind,
                                'ro water': Droplets,
                                'water': Droplets,
                                'power backup': Zap,
                                'backup': Zap,
                                'geyser': Thermometer,
                                'laundry': Shirt,
                                'washing machine': Shirt,
                                'housekeeping': Sparkles,
                                'cleaning': Sparkles,
                                'cctv': Camera,
                                'security': Shield,
                                'parking': Car,
                                'gym': Dumbbell,
                                'fridge': Box,
                                'refrigerator': Box,
                                'kitchen': Flame,
                                'induction': Flame,
                                'lift': ArrowUpCircle,
                                'tv': Tv,
                                'television': Tv,
                                'food': Utensils,
                                'meal': Utensils,
                                'single occupancy': User,
                                'double occupancy': Users,
                                'triple occupancy': Users
                              }[iconName] || CheckCircle;
                              return <IconComponent size={16} className="text-surface" />;
                            })()}
                          </div>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Type Specific Info - Dynamic Rendering */}
              <div id="features" className="space-y-6">
                {/* PG Details */}
              {(propertyType === 'PG' || pgDetails) && (pgDetails || config) && (
                <div className="mb-8 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <h3 className="font-bold text-yellow-900 mb-3">PG / Co-Living Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-yellow-900">
                    {pgDetails?.occupancy && <div><span className="opacity-70 text-xs block">Occupancy</span>{pgDetails.occupancy}</div>}
                    {pgDetails?.gender && <div><span className="opacity-70 text-xs block">Gender</span>{pgDetails.gender}</div>}
                    {pgDetails?.minStay && <div><span className="opacity-70 text-xs block">Min Stay</span>{pgDetails.minStay}</div>}
                    {pgDetails?.noticePeriod && <div><span className="opacity-70 text-xs block">Notice Period</span>{pgDetails.noticePeriod}</div>}
                    {pgDetails?.securityDeposit && <div><span className="opacity-70 text-xs block">Security Deposit</span>₹{pgDetails.securityDeposit}</div>}
                    {pgDetails?.availableFrom && <div><span className="opacity-70 text-xs block">Available From</span>{new Date(pgDetails.availableFrom).toLocaleDateString()}</div>}
                    <div><span className="opacity-70 text-xs block">Food</span>{pgDetails?.foodIncluded ? 'Included' : 'Not Included'}</div>
                    {/* Fallback to old config if pgDetails not present */}
                    {!pgDetails && config && (
                      <>
                        <div>Type: {config.pgType}</div>
                        <div>Notice: {config.noticePeriod}</div>
                      </>
                    )}
                  </div>
                  {pgDetails?.rules && (
                    <div className="mt-3 pt-3 border-t border-yellow-200/50">
                      <span className="opacity-70 text-xs block mb-2 font-bold text-yellow-900">PG Rules</span>
                      <div className="flex flex-wrap gap-2">
                        {pgDetails.rules.smoking !== undefined && <span className={`px-2 py-1 rounded text-xs border ${pgDetails.rules.smoking ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>Smoking: {pgDetails.rules.smoking ? 'Yes' : 'No'}</span>}
                        {pgDetails.rules.drinking !== undefined && <span className={`px-2 py-1 rounded text-xs border ${pgDetails.rules.drinking ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>Drinking: {pgDetails.rules.drinking ? 'Yes' : 'No'}</span>}
                        {pgDetails.rules.visitors !== undefined && <span className={`px-2 py-1 rounded text-xs border ${pgDetails.rules.visitors ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>Visitors: {pgDetails.rules.visitors ? 'Yes' : 'No'}</span>}
                        {pgDetails.rules.curfew && <span className="px-2 py-1 rounded text-xs border border-yellow-200 bg-yellow-100 text-yellow-800">Curfew: {pgDetails.rules.curfew}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rent Details */}
              {propertyType === 'Rent' && rentDetails && (
                <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h3 className="font-bold text-blue-900 mb-3">Rental Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-blue-900">
                    <div><span className="opacity-70 text-xs block">Monthly Rent</span>₹{rentDetails.monthlyRent?.toLocaleString() || 'Not set'}</div>
                    <div><span className="opacity-70 text-xs block">Maintenance</span>₹{rentDetails.maintenanceCharges?.toLocaleString() || 0}</div>
                    <div><span className="opacity-70 text-xs block">Type</span>{rentDetails.type || 'Not specified'}</div>
                    <div><span className="opacity-70 text-xs block">Furnishing</span>{rentDetails.furnishing || 'Not specified'}</div>
                    <div><span className="opacity-70 text-xs block">Tenant Preference</span>{rentDetails.tenantPreference || 'Any'}</div>
                    {rentDetails.societyName && <div><span className="opacity-70 text-xs block">Society</span>{rentDetails.societyName}</div>}
                    <div><span className="opacity-70 text-xs block">Water Supply</span>{rentDetails.waterSupply || 'Not specified'}</div>
                    <div className="col-span-full flex gap-2 mt-1">
                      {rentDetails.electricityIncluded && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Electricity Incl.</span>}
                      {rentDetails.lift && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Lift Available</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Details */}
              {propertyType === 'Buy' && buyDetails && (
                <div className="mb-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <h3 className="font-bold text-emerald-900 mb-3">Property Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-emerald-900">
                    <div><span className="opacity-70 text-xs block">Type</span>{buyDetails.type}</div>
                    <div><span className="opacity-70 text-xs block">Super Built-up Area</span>{buyDetails.area?.superBuiltUp} {buyDetails.area?.unit || 'sqft'}</div>
                    {buyDetails.area?.carpet && <div><span className="opacity-70 text-xs block">Carpet Area</span>{buyDetails.area?.carpet} {buyDetails.area?.unit || 'sqft'}</div>}
                    <div><span className="opacity-70 text-xs block">Ownership</span>{buyDetails.ownership}</div>
                    <div><span className="opacity-70 text-xs block">Floor</span>{buyDetails.floor?.current} / {buyDetails.floor?.total}</div>
                    <div><span className="opacity-70 text-xs block">Facing</span>{buyDetails.facing}</div>
                    <div><span className="opacity-70 text-xs block">Age</span>{buyDetails.propertyAge}</div>
                    {buyDetails.builderName && <div className="col-span-1"><span className="opacity-70 text-xs block">Builder</span>{buyDetails.builderName}</div>}
                    {buyDetails.propertyTax && <div><span className="opacity-70 text-xs block">Property Tax</span>₹{buyDetails.propertyTax.toLocaleString()}</div>}
                    <div className="col-span-full flex flex-wrap gap-2 mt-2">
                      {buyDetails.loanEligible && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Loan Eligible</span>}
                      {buyDetails.legalVerified && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Legal Verified</span>}
                      {buyDetails.registrationIncluded && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Registration Incl.</span>}
                      {buyDetails.stampDutyIncluded && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Stamp Duty Incl.</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Plot Details - Housing.com Style */}
              {propertyType === 'Plot' && plotDetails && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">Plot Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                    {/* Plot Area */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400">
                        <Scan size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Plot Area</p>
                        <p className="text-sm font-bold text-gray-900">{plotDetails.plotArea} {plotDetails.unit}</p>
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400">
                        <Maximize2 size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Dimensions</p>
                        <p className="text-sm font-bold text-gray-900">{plotDetails.dimensions?.length} x {plotDetails.dimensions?.breadth}</p>
                      </div>
                    </div>

                    {/* Facing */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400">
                        <Compass size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Facing</p>
                        <p className="text-sm font-bold text-gray-900">{plotDetails.facing}</p>
                      </div>
                    </div>

                    {/* Road Width */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400">
                        <Move size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Road Width</p>
                        <p className="text-sm font-bold text-gray-900">{plotDetails.roadWidth ? `${plotDetails.roadWidth} ft` : 'N/A'}</p>
                      </div>
                    </div>

                    {/* Land Type */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400">
                        <Grid size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Land Type</p>
                        <p className="text-sm font-bold text-gray-900">{plotDetails.landType}</p>
                      </div>
                    </div>

                    {/* Authority */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400">
                        <Landmark size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Authority</p>
                        <p className="text-sm font-bold text-gray-900">{plotDetails.approvalAuthority || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Boundary Wall */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400">
                        <LayoutTemplate size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Boundary Wall</p>
                        <p className="text-sm font-bold text-gray-900">{plotDetails.boundaryMarked ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    {/* Nearby Landmark */}
                    {plotDetails.nearbyLandmark && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-gray-400">
                          <MapPin size={20} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Landmark</p>
                          <p className="text-sm font-bold text-gray-900">{plotDetails.nearbyLandmark}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {propertyType === 'Hotel' && config && (config.hotelCategory || config.starRating) && (
                <div className="mb-8 grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <h3 className="font-bold text-blue-900 mb-2">Hotel Info</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {config.hotelCategory && <li>Category: {config.hotelCategory}</li>}
                      {config.starRating && <li>Rating: {config.starRating} Stars</li>}
                    </ul>
                  </div>
                </div>
              )}

              {/* Have to check these later */}
              {propertyType === 'Villa' && (property.structure || config) && (
                <div className="mb-8 grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <h3 className="font-bold text-green-900 mb-2">Villa Structure</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      {property.structure ? (
                        <>
                          <li>Bedrooms: {property.structure.bedrooms}</li>
                          <li>Bathrooms: {property.structure.bathrooms}</li>
                          <li>Max Guests: {property.structure.maxGuests}</li>
                          <li>Kitchen: {property.structure.kitchenAvailable ? 'Available' : 'No'}</li>
                        </>
                      ) : (
                        <li>Details available on request</li>
                      )}
                    </ul>
                  </div>

                  {/* Price Details Card */}
                  {selectedRoom && (
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                      <h3 className="text-gray-500 text-sm mb-1">
                        {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'Monthly Rent' : 'Price per night'}
                      </h3>
                      <div className="text-2xl font-black text-gray-900 mb-1 flex items-baseline gap-1">
                        ₹{(selectedRoom.pricing?.basePrice || selectedRoom.price || 0).toLocaleString()}
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                          / {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'month' : 'night'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                        <div>Extra adult: ₹{selectedRoom.pricing?.extraAdultPrice || selectedRoom.extraAdultPrice || 0} / {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'month' : 'night'} •</div>
                        <div>Extra child: ₹{selectedRoom.pricing?.extraChildPrice || selectedRoom.extraChildPrice || 0} / {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'month' : 'night'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {propertyType === 'Resort' && config && (
                <div className="mb-8">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <h3 className="font-bold text-amber-900 mb-2">Resort Highlights</h3>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>Theme: {config.resortTheme}</li>
                        <li>Category: {config.resortCategory}</li>
                        <li>Reception: {config.receptionAvailable ? '24/7' : 'Limited Hours'}</li>
                      </ul>
                    </div>
                    {property.mealPlans && property.mealPlans.length > 0 && (
                      <div className="p-4 bg-orange-50 rounded-xl">
                        <h3 className="font-bold text-orange-900 mb-2">Meal Plans</h3>
                        <div className="flex flex-wrap gap-2">
                          {property.mealPlans.map((plan, i) => (
                            <span key={i} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              {plan.mealType}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {property.activities && property.activities.length > 0 && (
                    <div className="p-4 bg-indigo-50 rounded-xl">
                      <h3 className="font-bold text-indigo-900 mb-2">Activities</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {property.activities.map((act, i) => (
                          <div key={i} className="text-sm text-indigo-800">
                            <span className="font-semibold">{act.name}</span>
                            <span className="text-xs ml-1 opacity-75">({act.type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {propertyType === 'Homestay' && config && (
                <div className="mb-8 grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h3 className="font-bold text-amber-900 mb-2">Homestay Experience</h3>
                    <ul className="text-sm text-amber-800 space-y-1">
                      {property.hostName && <li>Host: {property.hostName}</li>}
                      <li>Food: {config.foodType} ({config.mealsAvailable === 'Yes' ? 'Available' : 'Not Available'})</li>
                      <li>Shared Areas: {config.sharedAreas ? 'Yes' : 'No'}</li>
                      {config.idealFor && config.idealFor.length > 0 && <li>Ideal For: {Array.isArray(config.idealFor) ? config.idealFor.join(', ') : config.idealFor}</li>}
                      {config.stayExperience && <li>Experience: {config.stayExperience}</li>}
                    </ul>
                  </div>
                </div>
              )}

              {propertyType === 'Hostel' && config && (
                <div className="mb-8 grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <h3 className="font-bold text-purple-900 mb-2">Hostel Info</h3>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>Type: {config.hostelType}</li>
                      <li>Curfew: {config.curfewTime || 'No Curfew'}</li>
                      <li>Age Restriction: {config.ageRestriction ? 'Yes' : 'No'}</li>
                    </ul>
                  </div>
                </div>
              )}
              </div>

              {/* Inventory / Rooms - Conditional */}
              {!isWholeUnit && inventory && inventory.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-textDark mb-4">
                    {isBedBased ? 'Choose your Bed/Room' : propertyType === 'Tent' ? 'Choose your tent' : 'Choose your room'}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {inventory.map((room) => (
                      <div
                        key={room._id}
                        onClick={() => {
                          setSelectedRoom(room);
                          // Force scroll to top using multiple methods for reliability
                          window.scrollTo(0, 0);
                          document.documentElement.scrollTop = 0;
                          document.body.scrollTop = 0;
                        }}
                        className={`
                      border rounded-xl p-4 cursor-pointer transition-all relative overflow-hidden
                      ${selectedRoom?._id === room._id ? 'border-surface bg-surface/5 ring-1 ring-surface' : 'border-gray-200 hover:border-surface/50'}
                    `}
                      >
                        {selectedRoom?._id === room._id && (
                          <div className="absolute top-0 right-0 bg-surface text-white text-[10px] px-2 py-1 rounded-bl-lg">
                            Selected
                          </div>
                        )}
                        <div className={`flex justify-between items-start mb-2 ${selectedRoom?._id === room._id ? 'pr-14' : ''}`}>
                          <h4 className="font-bold text-textDark">{room.type}</h4>
                          <span className="font-bold text-surface">₹{getRoomPrice(room) || 'N/A'}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{room.description || `Comfortable ${room.type}`}</p>
                        {getExtraPricingLabels(room).length > 0 && (
                          <div className="text-[11px] text-gray-600 mb-2 space-y-0.5">
                            {getExtraPricingLabels(room).map((label, index) => (
                              <div key={index}>{label}</div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-1.5 flex-wrap">
                          {room.roomCategory && (() => {
                            const config = {
                              triple: { label: 'Triple Sharing', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                              double: { label: 'Double Sharing', bg: 'bg-blue-50 text-blue-700 border-blue-100' },
                              private: { label: 'Private Room', bg: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                              shared: { label: 'Shared Dorm', bg: 'bg-gray-100 text-gray-700 border-gray-200' }
                            }[room.roomCategory.toLowerCase()] || { label: room.roomCategory, bg: 'bg-surface/10 text-surface border-surface/20' };

                            return (
                              <span className={`text-[9px] ${config.bg} px-2 py-0.5 rounded border font-bold uppercase tracking-wider`}>
                                {config.label}
                              </span>
                            );
                          })()}
                          {room.bathroomType && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">
                              {room.bathroomType}
                            </span>
                          )}
                          {room.amenities?.filter(a => a && typeof a === 'string' && a.trim()).slice(0, 3).map((am, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-600">{am}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Policies */}
              {policies && !['buy', 'plot'].includes(propertyType?.toLowerCase()) && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-textDark mb-4">House Rules & Policies</h2>
                  <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-600">
                    {!['pg', 'hostel', 'rent', 'buy', 'plot'].includes(propertyType?.toLowerCase()) && (
                      <>
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-surface" />
                          <div>
                            <span className="font-semibold block text-textDark">Check-in</span>
                            <span>{policies.checkInTime ? (policies.checkInTime.toString().includes(':') ? policies.checkInTime : `${policies.checkInTime}:00 AM`) : '12:00 PM'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-surface" />
                          <div>
                            <span className="font-semibold block text-textDark">Check-out</span>
                            <span>{policies.checkOutTime ? (policies.checkOutTime.toString().includes(':') ? policies.checkOutTime : `${policies.checkOutTime}:00 AM`) : '11:00 AM'}</span>
                          </div>
                        </div>
                      </>
                    )}

                    {policies.cancellationPolicy && (
                      <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                        <Info size={18} className="text-surface" />
                        <div>
                          <span className="font-semibold block text-textDark">Cancellation Policy</span>
                          <span>{policies.cancellationPolicy}</span>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Policy Badges */}
                    <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {[
                        { label: 'Pets Allowed', value: policies.petsAllowed || policies.petFriendly, type: 'bool' },
                        { label: 'Smoking Allowed', value: policies.smokingAllowed || policies.smokingAlcohol, type: 'bool' },
                        { label: 'Alcohol Allowed', value: policies.alcoholAllowed, type: 'bool' },
                        { label: 'Couple Friendly', value: policies.coupleFriendly, type: 'bool' },
                        { label: 'ID Required', value: policies.idProofMandatory || policies.idProofRequired || policies.idRequirement, type: 'mixed' }
                      ].map((rule, idx) => {
                        if (rule.value === undefined || rule.value === null) return null;

                        let displayValue = '';
                        if (rule.type === 'bool') {
                          if (rule.value === true || rule.value === 'Yes' || rule.value === 'Allowed') displayValue = 'Yes';
                          else if (rule.value === false || rule.value === 'No' || rule.value === 'Not Allowed') displayValue = 'No';
                          else displayValue = rule.value; // Fallback
                        } else {
                          displayValue = typeof rule.value === 'boolean' ? (rule.value ? 'Yes' : 'No') : rule.value;
                        }

                        if (!displayValue) return null;

                        return (
                          <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                            <Shield size={14} className="text-gray-400" />
                            <span>{rule.label}: <span className="font-semibold text-textDark">{displayValue}</span></span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom House Rules List */}
                    {policies.houseRules && Array.isArray(policies.houseRules) && policies.houseRules.length > 0 && (
                      <div className="col-span-2 mt-2">
                        <span className="font-semibold block text-textDark mb-2">Additional Rules</span>
                        <ul className="list-disc list-inside space-y-1">
                          {policies.houseRules.map((rule, i) => (
                            <li key={i}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Object based house rules (Villa) */}
                    {policies.houseRules && !Array.isArray(policies.houseRules) && typeof policies.houseRules === 'object' && (
                      <div className="col-span-2 mt-2">
                        <span className="font-semibold block text-textDark mb-2">House Rules</span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(policies.houseRules).map(([key, val], i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded border ${val ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}: {val ? 'Yes' : 'No'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nearby Places */}
              {nearbyPlaces && nearbyPlaces.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-textDark mb-4">Nearby Places</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nearbyPlaces.map((place, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-surface">
                            <MapPin size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-textDark">{place.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{place.type}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-surface bg-surface/5 px-2 py-1 rounded-md">
                          {place.distanceKm} km
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Reviews Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-textDark">Guest Reviews</h2>
                    <div className="flex items-center text-sm text-gray-500 pt-1">
                      <span>{reviews.length > 0 ? `(${reviews.length})` : ''}</span>
                      <span className="mx-1">•</span>
                      <span className="font-bold text-black mr-1">{rating ? Number(rating).toFixed(1) : 'New'}</span>
                      <Star size={14} className="fill-honey text-honey" />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-xs font-bold text-surface border border-surface px-3 py-1.5 rounded bg-surface/5 hover:bg-surface hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare size={14} /> <span>Write a Review</span>
                  </button>
                </div>

                {/* Review Form */}
                {showReviewForm && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 animate-fadeIn">
                    <h3 className="font-bold text-gray-800 mb-3">Rate your experience</h3>
                    <form onSubmit={handleReviewSubmit}>
                      <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewData({ ...reviewData, rating: star })}
                            className="focus:outline-none"
                          >
                            <Star
                              size={24}
                              className={`${reviewData.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewData.comment}
                        onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                        placeholder="Share your experience..."
                        rows={3}
                        className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-surface outline-none mb-3"
                        required
                      />
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(false)}
                          className="px-4 py-2 text-gray-500 font-medium hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitReviewLoading}
                          className="px-6 py-2 bg-black text-white rounded-lg font-bold disabled:opacity-50"
                        >
                          {submitReviewLoading ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Reviews Display - Carousel if > 3 */}
                {reviews.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dotted border-gray-300">
                    <p className="text-gray-500">No reviews yet. Be the first to share your experience!</p>
                  </div>
                ) : (
                  // Simple Scrollable Row for simplicity and UX
                  <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review._id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm snap-center flex-shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-surface/10 flex items-center justify-center text-surface font-bold text-lg">
                            {review.userId?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm line-clamp-1">{review.userId?.name || 'User'}</p>
                            <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">
                            {review.rating} <Star size={10} className="fill-yellow-500 text-yellow-500" />
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                          "{review.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          </div>

          {/* Right Sidebar - Sticky Booking/Contact Card */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-6 overflow-hidden relative">
                {/* Header Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700" />
                
                {renderEnquiryWidget()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3.5 shadow-lg z-50 lg:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 font-medium">Starting from</p>
            <p className="font-bold text-lg text-slate-900">
              ₹{bookingBarPrice?.toLocaleString() || 'N/A'}
            </p>
          </div>
          <div className="flex gap-2 flex-1 justify-end max-w-[280px]">
            <button
              onClick={() => {
                const msg = encodeURIComponent(`Hi, I am interested in your property "${name}" listed on Get Right Home.`);
                window.open(`https://wa.me/${revealedNumber || '9652961607'}?text=${msg}`, '_blank');
              }}
              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all flex-1"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={handleRevealContact}
              className="px-4 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all flex-1"
            >
              📞 {revealedNumber ? 'Call' : 'Call Owner'}
            </button>
          </div>
        </div>
      </div>

      {/* ALL OFFERS MODAL */}
      {showOffersModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fadeIn">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slideUp">

            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 rounded-t-2xl">
              <h3 className="font-bold text-lg text-gray-900">Available Offers</h3>
              <button
                onClick={() => setShowOffersModal(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div
              className="p-4 overflow-y-auto overflow-x-hidden space-y-4 bg-gray-50 flex-1 overscroll-y-contain"
              data-lenis-prevent
            >
              {offers.map((offer) => (
                <div
                  key={offer._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col"
                >
                  <div className={`h-24 ${offer.bg || 'bg-gray-800'} relative p-4 flex flex-col justify-center text-white`}>
                    {offer.image && (
                      <img src={offer.image} alt="offer" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    <div className="relative z-10">
                      <h4 className="font-black text-xl">{offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}</h4>
                      <p className="text-xs opacity-90 font-medium">{offer.title}</p>
                    </div>
                    <div className="absolute top-3 right-3 bg-white text-black text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                      {offer.code}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-600 text-sm mb-3">{offer.description || offer.subtitle}</p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-[10px] text-gray-400 font-medium">
                        {offer.minBookingAmount > 0 ? `Min. Spend: ₹${offer.minBookingAmount}` : 'No Min Spend'}
                      </div>
                      <button
                        onClick={() => handleApplyOffer(offer)}
                        className="bg-surface text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-surface/20 active:scale-95 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}



      {/* FULL SCREEN IMAGE MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/95 animate-fadeIn">
          {/* Header */}
          <div className="p-4 flex items-center justify-between text-white z-10">
            <div className="flex flex-col">
              <h3 className="font-bold text-sm md:text-base line-clamp-1">{name}</h3>
              <p className="text-[10px] md:text-xs opacity-70">Image {currentImageIndex + 1} of {galleryImages.length}</p>
            </div>
            <button
              onClick={() => setShowImageModal(false)}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Image View */}
          <div className="flex-1 w-full h-full relative flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowImageModal(false)}>
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={galleryImages[currentImageIndex]}
              alt={`Gallery ${currentImageIndex}`}
              onClick={(e) => { e.stopPropagation(); handleNextImage(); }} // Click image to go next
              className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl cursor-pointer"
            />

            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-md transition-all active:scale-95 z-50 group hover:ring-2 hover:ring-white/50"
                  aria-label="Previous Image"
                >
                  <ChevronLeft size={32} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-md transition-all active:scale-95 z-50 group hover:ring-2 hover:ring-white/50"
                  aria-label="Next Image"
                >
                  <ChevronRight size={32} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails / Counter Bar */}
          <div className="p-4 flex justify-center gap-1.5 overflow-x-auto hide-scrollbar z-10">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`
                  w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all
                  ${idx === currentImageIndex ? 'border-surface scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}
                `}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Similar / Recommended Properties Slider */}
      {similarProperties && similarProperties.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 border-t border-gray-200 mt-12">
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Recommended Properties</h2>
            <p className="text-gray-500 text-sm mt-1">Similar properties you might be interested in</p>
          </div>
          
          <div className="flex flex-col gap-6 items-center md:items-start">
            {similarProperties.map((prop) => (
              <div key={prop._id} className="w-[280px]">
                <GRHPropertyCard property={prop} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCHEDULE VISIT DIALOG MODAL */}
      {showVisitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowVisitModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Schedule a Visit</h3>
              <button onClick={() => setShowVisitModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setBookingLoading(true);
              try {
                const response = await bookingService.create({
                  propertyId: id,
                  isInquiry: true,
                  message: `[Schedule Visit Request]\nDate: ${visitDate}\nTime Slot: ${visitSlot}\nNotes: ${enquiryMessage || 'I would like to schedule a visit to this property.'}`,
                  budget: property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || 0,
                  propertyType: propertyType?.toLowerCase() || 'buy',
                  checkInDate: new Date(visitDate)
                });
                if (response.success) {
                  toast.success("Visit scheduled successfully! The partner will contact you soon.");
                  setShowVisitModal(false);
                  setEnquiryMessage('');
                }
              } catch (err) {
                toast.error(err.message || "Failed to schedule visit");
              } finally {
                setBookingLoading(false);
              }
            }} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred Time Slot</label>
                <select
                  value={visitSlot}
                  onChange={(e) => setVisitSlot(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Morning (10 AM - 12 PM)">Morning (10 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 3 PM)">Afternoon (12 PM - 3 PM)</option>
                  <option value="Evening (3 PM - 6 PM)">Evening (3 PM - 6 PM)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Additional Notes</label>
                <textarea
                  value={enquiryMessage}
                  onChange={(e) => setEnquiryMessage(e.target.value)}
                  placeholder="e.g. I want to see the parking space and facing direction."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm min-h-[80px] outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-3 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                {bookingLoading ? <Loader2 className="animate-spin" size={18} /> : 'Schedule Visit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST CALLBACK DIALOG MODAL */}
      {showCallbackModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCallbackModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Request Callback</h3>
              <button onClick={() => setShowCallbackModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setBookingLoading(true);
              try {
                const response = await bookingService.create({
                  propertyId: id,
                  isInquiry: true,
                  message: `[Request Callback]\nPreferred Time: ${callbackTime}\nMessage: Please call me back at my registered number.`,
                  budget: property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || 0,
                  propertyType: propertyType?.toLowerCase() || 'buy',
                  checkInDate: new Date()
                });
                if (response.success) {
                  toast.success("Callback requested! You will get a call soon.");
                  setShowCallbackModal(false);
                }
              } catch (err) {
                toast.error(err.message || "Failed to request callback");
              } finally {
                setBookingLoading(false);
              }
            }} className="space-y-4 mt-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                The owner or their agent will call you back shortly on your registered phone number.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred Callback Time</label>
                <select
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Immediate (within 15 mins)">Immediate (within 15 mins)</option>
                  <option value="Within 2 Hours">Within 2 Hours</option>
                  <option value="Evening (after 5 PM)">Evening (after 5 PM)</option>
                  <option value="Tomorrow Morning">Tomorrow Morning</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                {bookingLoading ? <Loader2 className="animate-spin" size={18} /> : 'Request Callback'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetailsPage;
