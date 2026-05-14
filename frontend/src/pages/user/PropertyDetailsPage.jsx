import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService, legalService, reviewService, offerService, availabilityService, userService, bookingService } from '../../services/apiService';
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
      text: `Check out ${property?.name || 'this amazing place'} on HoomZo!`,
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

  let bookingBarPrice =
    stayPricing.nights > 0
      ? stayPricing.perNight
      : getRoomPrice(bookingRoom) || property.minPrice;

  const pType = propertyType?.toLowerCase();
  if (!bookingBarPrice) {
    if (pType === 'rent') bookingBarPrice = property.rentDetails?.monthlyRent;
    else if (pType === 'buy') bookingBarPrice = property.buyDetails?.expectedPrice;
    else if (pType === 'plot') bookingBarPrice = property.plotDetails?.expectedPrice;
    else if (pType === 'pg') bookingBarPrice = property.pgDetails?.monthlyRent || property.minPrice;
  }

  const priceLabel = (['rent', 'pg', 'hostel'].includes(pType)) ? 'Monthly Rent' : (['buy', 'plot'].includes(pType)) ? 'Asking Price' : 'Price per night';

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
      const pType = propertyType?.toLowerCase();
      const response = await bookingService.create({
        propertyId: id,
        message: `I am interested in this ${propertyType}. Please contact me.`,
        budget: property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || 0,
        propertyType: pType,
        checkInDate: dates.checkIn || new Date()
      });

      if (response.success) {
        toast.success("Inquiry sent successfully! The partner will contact you soon.");
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
                        {Number(rating) > 0 ? Number(rating).toFixed(1) : 'New'}
                      </div>
                    )}
                  </div>
                  <h1 className="text-xl md:text-3xl font-bold text-textDark mb-1 leading-tight">{name}</h1>
                  <div className="flex items-start gap-1.5 text-gray-500 text-xs md:text-sm">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-3 md:line-clamp-1">
                      {address?.fullAddress}
                      {address?.city ? `, ${address.city}` : ''}

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

              <div className="mb-8">
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
                  <div className="mb-4">
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

              {['Rent', 'Buy', 'Plot'].includes(propertyType) ? (
                <div className="mb-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm lg:hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-emerald-900">Interested in this property?</h3>
                      <p className="text-sm text-emerald-700 font-medium">Contact the owner directly for more details and visits.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button
                      onClick={handleRevealContact}
                      disabled={revealLoading}
                      className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-center shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {revealLoading ? <Loader2 className="animate-spin" size={18} /> : (
                        <>
                          <Phone size={18} />
                          {revealedNumber ? `Call: ${revealedNumber}` : 'Reveal Contact Number'}
                        </>
                      )}
                    </button>
                    {revealedNumber && (
                      <a href={`tel:${revealedNumber}`} className="text-center text-xs text-emerald-600 font-bold underline mt-1">
                        Click to dial {revealedNumber}
                      </a>
                    )}
                    <p className="text-[10px] text-emerald-600 font-bold uppercase text-center mt-1 tracking-widest">
                      Verified Inquiries Only
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Booking Inputs (Date & Guest) */}
                  <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100 lg:hidden">
                    <h3 className="font-bold text-textDark mb-3">
                      {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'Stay Details' : 'Trip Details'}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {propertyType?.toLowerCase() !== 'pg' && propertyType?.toLowerCase() !== 'hostel' && (
                        <>
                          <div className="col-span-1">
                            <ModernDatePicker
                              label="Check-in"
                              date={dates.checkIn}
                              onChange={(newDate) => setDates({ ...dates, checkIn: newDate })}
                              minDate={new Date().toISOString().split('T')[0]}
                              placeholder="Select Check-in"
                            />
                          </div>
                          <div className="col-span-1">
                            <ModernDatePicker
                              label="Check-out"
                              date={dates.checkOut}
                              onChange={(newDate) => setDates({ ...dates, checkOut: newDate })}
                              minDate={dates.checkIn ? new Date(new Date(dates.checkIn).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                              placeholder="Select Check-out"
                              align="right"
                            />
                          </div>
                        </>
                      )}

                      {/* Dynamic Guest/Room Inputs */}
                      {!isWholeUnit && (
                        <div className="col-span-1">
                          <label className="text-xs text-gray-500 block mb-1">{getUnitLabel()}</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-surface"
                            value={guests.rooms}
                            onChange={e => setGuests({ ...guests, rooms: e.target.value === '' ? '' : parseInt(e.target.value) })}
                            onBlur={() => setGuests(prev => ({ ...prev, rooms: Math.max(1, Number(prev.rooms) || 1) }))}
                          />
                        </div>
                      )}

                      <div className="col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">
                          {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'Guests' : 'Adults'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-surface"
                          value={guests.adults}
                          onChange={e => setGuests({ ...guests, adults: e.target.value === '' ? '' : parseInt(e.target.value) })}
                          onBlur={() => setGuests(prev => ({ ...prev, adults: Math.max(1, Number(prev.adults) || 1) }))}
                          disabled={isBedBased}
                        />
                      </div>

                      {!isBedBased && (
                        <div className="col-span-1">
                          <label className="text-xs text-gray-500 block mb-1">Children</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-surface"
                            value={guests.children}
                            onChange={e => setGuests({ ...guests, children: e.target.value === '' ? '' : parseInt(e.target.value) })}
                            onBlur={() => setGuests(prev => ({ ...prev, children: Math.max(0, Number(prev.children) || 0) }))}
                          />
                        </div>
                      )}
                    </div>


                    {/* --- OFFERS SECTION --- */}
                    {offers.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <Gift size={16} className="text-surface" />
                            Offers & Coupons
                          </h4>
                          <button
                            onClick={() => setShowOffersModal(true)}
                            className="text-xs font-bold text-surface hover:underline"
                          >
                            View All
                          </button>
                        </div>

                        {/* Applied Offer State */}
                        {appliedOffer ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between relative overflow-hidden">
                            <div className="flex items-center gap-3 relative z-10">
                              <div className="p-1.5 bg-green-100 rounded-lg text-green-700">
                                <Tag size={16} />
                              </div>
                              <div>
                                <p className="font-bold text-green-800 text-sm">{appliedOffer.code}</p>
                                <p className="text-xs text-green-600">
                                  {appliedOffer.discountType === 'percentage'
                                    ? `${appliedOffer.discountValue}% Off applied`
                                    : `₹${appliedOffer.discountValue} Off applied`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleRemoveOffer}
                              className="p-1.5 hover:bg-white/50 rounded-full text-green-700 transition-colors z-10"
                            >
                              <X size={16} />
                            </button>
                            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-green-100 rounded-full opacity-50" />
                          </div>
                        ) : (
                          /* Carousel of Top 3 Offers */
                          <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar snap-x">
                            {offers.slice(0, 3).map((offer) => (
                              <div
                                key={offer._id}
                                onClick={() => handleApplyOffer(offer)}
                                className="min-w-[200px] bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-surface transition-all snap-center relative overflow-hidden group"
                              >
                                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold text-white rounded-bl-lg ${offer.bg || 'bg-black'}`}>
                                  {offer.code}
                                </div>
                                <p className="font-bold text-xs text-gray-800 mt-2">{offer.title}</p>
                                <p className="text-[10px] text-gray-500 line-clamp-1">{offer.subtitle}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}


                    {/* Price Breakdown Display */}
                    {priceBreakdown && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-dashed border-gray-300">
                        <h4 className="font-bold text-gray-800 text-sm mb-3">Price Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'Monthly Rent' : `Base Price (${priceBreakdown.nights} nights x ${priceBreakdown.units} units)`}
                            </span>
                            <span className="font-medium">₹{priceBreakdown.totalBasePrice.toLocaleString()}</span>
                          </div>

                          {priceBreakdown.discountAmount > 0 && (
                            <div className="flex justify-between text-green-600 font-medium">
                              <span className="flex items-center gap-1"><Tag size={12} /> Coupon Discount ({appliedOffer?.code})</span>
                              <span>- ₹{priceBreakdown.discountAmount.toLocaleString()}</span>
                            </div>
                          )}
                          {priceBreakdown.totalExtraAdultCharge > 0 && (
                            <div className="flex justify-between text-orange-700">
                              <span>Extra Adults ({priceBreakdown.extraAdultsCount} x ₹{priceBreakdown.extraAdultPrice}/{(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'month' : 'night'})</span>
                              <span>+ ₹{priceBreakdown.totalExtraAdultCharge.toLocaleString()}</span>
                            </div>
                          )}
                          {priceBreakdown.totalExtraChildCharge > 0 && (
                            <div className="flex justify-between text-orange-700">
                              <span>Extra Children ({priceBreakdown.extraChildrenCount} x ₹{priceBreakdown.extraChildPrice}/{(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'month' : 'night'})</span>
                              <span>+ ₹{priceBreakdown.totalExtraChildCharge.toLocaleString()}</span>
                            </div>
                          )}
                          {priceBreakdown.taxAmount > 0 && (
                            <div className="flex justify-between text-gray-600">
                              <span>Taxes & Fees ({taxRate}%)</span>
                              <span>+ ₹{priceBreakdown.taxAmount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-base text-surface">
                            <span>Total Amount</span>
                            <span>₹{priceBreakdown.grandTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Note about limits */}
                    <div className="mt-3 bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      <p>
                        Max allowed: <strong>{getMaxAdults()} {(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') ? 'Guests' : 'Adults'}</strong>
                        {!(propertyType?.toLowerCase() === 'pg' || propertyType?.toLowerCase() === 'hostel') && (
                          <> and <strong>{getMaxChildren()} Children</strong></>
                        )} for current selection.
                      </p>
                    </div>
                  </div>
                </>
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
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-surface via-surface/80 to-surface/60" />

                {(['rent', 'buy', 'plot'].includes(propertyType?.toLowerCase()) && false) ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                        <Phone size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-500">Direct Contact</p>
                        <h3 className="text-xl font-bold text-gray-900">Owner</h3>
                      </div>
                    </div>
                    <a href={`tel:${contactNumber}`} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200">
                      <Phone size={20} /> Call {contactNumber}
                    </a>
                    <p className="text-center text-xs text-gray-400 font-medium">Verified Inquiries Only</p>
                  </div>
                ) : (
                  <>
                    {/* Price Header */}
                    <div className="mb-6">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="text-gray-500 text-sm font-medium">
                          {priceBreakdown ? 'Total Price' :
                            (['rent', 'pg', 'hostel'].includes(propertyType?.toLowerCase()) ? 'Monthly Rent' :
                              (['buy', 'plot'].includes(propertyType?.toLowerCase()) ? 'Asking Price' : 'Price per night'))}
                        </p>
                        {rating && <div className="flex items-center gap-1 text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded"><Star size={10} className="fill-green-700" /> {Number(rating).toFixed(1)}</div>}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">₹{priceBreakdown?.grandTotal?.toLocaleString() || bookingBarPrice?.toLocaleString() || 'N/A'}</span>
                        {!priceBreakdown && (
                          <span className="text-sm text-gray-400 font-medium">
                            / {(['rent', 'pg', 'hostel'].includes(propertyType?.toLowerCase()) ? 'month' : (['buy', 'plot'].includes(propertyType?.toLowerCase()) ? 'total' : 'night'))}
                          </span>
                        )}
                      </div>
                      {priceBreakdown && <p className="text-xs text-green-600 font-bold mt-1">Includes taxes & fees</p>}
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4 mb-6">
                      {/* Date Pickers */}
                      {propertyType?.toLowerCase() !== 'pg' && propertyType?.toLowerCase() !== 'hostel' && propertyType?.toLowerCase() !== 'buy' && propertyType?.toLowerCase() !== 'plot' && propertyType?.toLowerCase() !== 'rent' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Check-in</label>
                            <input type="date" value={dates.checkIn} onChange={(e) => setDates({ ...dates, checkIn: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full bg-transparent text-sm font-bold outline-none" />
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Check-out</label>
                            <input type="date" value={dates.checkOut} onChange={(e) => setDates({ ...dates, checkOut: e.target.value })} min={dates.checkIn || new Date().toISOString().split('T')[0]} className="w-full bg-transparent text-sm font-bold outline-none text-right" />
                          </div>
                        </div>
                      )}

                      {/* Inquiry Fields for Buy/Plot */}
                      {(propertyType?.toLowerCase() === 'buy' || propertyType?.toLowerCase() === 'plot' || propertyType?.toLowerCase() === 'rent') && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                          <p className="text-xs font-bold text-gray-700 uppercase">Inquiry Details</p>
                          <textarea
                            placeholder="I'm interested in this property. Please contact me with more details."
                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm min-h-[100px] outline-none focus:ring-1 focus:ring-surface"
                          ></textarea>
                        </div>
                      )}

                      {/* Guests */}
                      {!['buy', 'plot', 'rent'].includes(propertyType?.toLowerCase()) && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-700 uppercase">Guests & Rooms</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {!isWholeUnit && (
                              <div>
                                <label className="text-[10px] text-gray-500 block">{getUnitLabel()}</label>
                                <select value={guests.rooms} onChange={e => setGuests({ ...guests, rooms: Number(e.target.value) })} className="w-full bg-white border border-gray-300 rounded p-1 text-sm outline-none">
                                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                            )}
                            <div>
                              <label className="text-[10px] text-gray-500 block">Adults</label>
                              <select value={guests.adults} onChange={e => setGuests({ ...guests, adults: Number(e.target.value) })} disabled={isBedBased} className="w-full bg-white border border-gray-300 rounded p-1 text-sm outline-none">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Availability Message */}
                      {dates.checkIn && (
                        <div className="text-xs">
                          {checkingAvailability ? <span className="text-blue-600">Checking availability...</span> :
                            availability?.available === false ? <span className="text-red-500 font-bold">{availability.message}</span> :
                              availability?.available === true ? <span className="text-green-600 font-bold">Available! {availability.unitsLeft} units left.</span> : null}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleBook}
                        disabled={bookingLoading || checkingAvailability || availability?.available === false}
                        className="w-full py-4 bg-gradient-to-r from-surface to-surface-dark text-white rounded-xl font-bold shadow-lg shadow-surface/30 hover:shadow-surface/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {bookingLoading ? <Loader2 className="animate-spin" size={20} /> : (['buy', 'plot', 'rent'].includes(propertyType?.toLowerCase()) ? 'Inquire Now' : 'Reserve Now')}
                      </button>

                      {(['rent', 'buy', 'plot'].includes(propertyType?.toLowerCase())) && (
                        <button
                          onClick={handleRevealContact}
                          disabled={revealLoading}
                          className="w-full py-3 bg-white border border-emerald-600 text-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"
                        >
                          {revealLoading ? <Loader2 className="animate-spin" size={18} /> : (
                            <>
                              <Phone size={18} />
                              {revealedNumber ? `Call: ${revealedNumber}` : 'Reveal Contact'}
                            </>
                          )}
                        </button>
                      )}
                      {revealedNumber && (['rent', 'buy', 'plot'].includes(propertyType?.toLowerCase())) && (
                        <a href={`tel:${revealedNumber}`} className="text-center text-xs text-emerald-600 font-medium underline">
                          Dial {revealedNumber}
                        </a>
                      )}
                    </div>

                    <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">You won't be charged yet</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50 lg:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">{priceBreakdown ? 'Total Amount' : priceLabel}</p>
            <p className="font-bold text-lg text-surface">
              ₹{priceBreakdown?.grandTotal?.toLocaleString() || bookingBarPrice?.toLocaleString() || 'N/A'}
            </p>
            {dates.checkIn && dates.checkOut && (
              <div className="mt-1">
                {checkingAvailability ? (
                  <span className="text-[10px] text-blue-500 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Checking...
                  </span>
                ) : availability?.available === false ? (
                  <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                    <Info size={10} /> {availability.message || "Not Available"}
                  </span>
                ) : availability?.available === true ? (
                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle size={10} /> {availability.unitsLeft !== undefined ? `${availability.unitsLeft} Left!` : 'Available'}
                  </span>
                ) : null}
              </div>
            )}
            {extraPricingLabels.length > 0 && (
              <p className="text-[11px] text-gray-500">
                {extraPricingLabels.join(' • ')}
              </p>
            )}
          </div>
          <div className="flex flex-1 md:flex-none gap-2">
            {(['rent', 'buy', 'plot'].includes(propertyType?.toLowerCase())) ? (
              <div className="flex flex-1 gap-2">
                <a href={`tel:${contactNumber}`} className="bg-white text-surface border border-surface px-4 py-3 rounded-xl font-bold flex-1 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <Phone size={20} /> Call
                </a>
                <button
                  onClick={handleBook}
                  disabled={bookingLoading}
                  className="bg-surface text-white px-4 py-3 rounded-xl font-bold flex-1 hover:bg-surface-dark transition-colors flex items-center justify-center gap-2"
                >
                  {bookingLoading ? <Loader2 size={20} className="animate-spin" /> : (['buy', 'plot', 'rent'].includes(propertyType?.toLowerCase()) ? 'Inquire Now' : 'Book Now')}
                </button>
              </div>
            ) : (
              <button
                onClick={handleBook}
                disabled={bookingLoading || checkingAvailability}
                className="bg-surface text-white px-8 py-3 rounded-xl font-bold flex-1 md:w-64 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-surface-dark transition-colors flex items-center justify-center gap-2"
              >
                {(bookingLoading || checkingAvailability) ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>{checkingAvailability ? 'Checking...' : 'Processing...'}</span>
                  </>
                ) : 'Book Now'}
              </button>
            )}
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

    </div>
  );
};

export default PropertyDetailsPage;
