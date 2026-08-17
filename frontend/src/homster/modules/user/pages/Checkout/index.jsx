import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FiArrowLeft, FiShoppingCart, FiTrash2, FiMinus, FiPlus, FiPhone, FiHome, FiClock, FiEdit2, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { MdStar } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import AddressSelectionModal from './components/AddressSelectionModal';
import TimeSlotModal from './components/TimeSlotModal';
import SearchStatusModal from './components/SearchStatusModal';
import { bookingService } from '../../../../services/bookingService';
import { paymentService } from '../../../../services/paymentService';
import { cartService } from '../../../../services/cartService';
import { configService } from '../../../../services/configService';
import { getPlans } from '../../services/planService';
import { userAuthService } from '../../../../services/authService';
import { useCart } from '../../../../context/CartContext';
import LiveBookingCard from '../../components/booking/LiveBookingCard';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

// The main app (AuthContext) stores the signed-in user under 'user', while the
// homster auth flow stores it under 'userData'. Read both so users who signed in
// via the main /login screen still get their details here.
// (SocketContext.jsx uses the same fallback for the same reason.)
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('userData') || localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const category = location.state?.category || null;
  const subCategoryName = location.state?.subCategory || null;
  const plan = location.state?.plan || null;
  const { 
    cartItems: globalCartItems,
    fetchCart: fetchCartGlobal, 
    clearCart: clearCartGlobal, 
    removeCategoryItems: removeCategoryGlobal,
    removeSubCategoryItems: removeSubCategoryGlobal,
    updateItem: updateItemGlobal,
    removeItem: removeItemGlobal
  } = useCart();

  const [cartItems, setCartItems] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [address, setAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [addressDetails, setAddressDetails] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [bookingModel, setBookingModel] = useState('worker');

  // Custom Contact State (for this booking only)
  const [contactDetails, setContactDetails] = useState({ name: '', phone: '' });
  const [showContactModal, setShowContactModal] = useState(false);

  // New state for vendor search flow
  const [currentStep, setCurrentStep] = useState('details'); // 'details' | 'searching' | 'waiting' | 'accepted' | 'payment'
  const [acceptedProfessional, setAcceptedProfessional] = useState(null);
  const [bookingRequest, setBookingRequest] = useState(null);
  const [searchingVendors, setSearchingVendors] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [searchMessage, setSearchMessage] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pay_at_home'); // 'online' | 'pay_at_home'

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const [selectedTime, setSelectedTime] = useState(null);
  const [visitedFee, setVisitedFee] = useState(29);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [bookingType, setBookingType] = useState('instant'); // 'instant' | 'scheduled'

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Check if Razorpay is loaded (defer to avoid blocking initial render)
  useEffect(() => {
    // Defer Razorpay check until after page load
    const checkRazorpay = () => {
      if (window.Razorpay) {
        setRazorpayLoaded(true);
      } else {
        // Retry after a short delay (non-blocking)
        setTimeout(checkRazorpay, 100);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if (window.requestIdleCallback) {
      window.requestIdleCallback(checkRazorpay, { timeout: 200 });
    } else {
      setTimeout(checkRazorpay, 100);
    }
  }, []);

  // Load user data and cart
  useEffect(() => {
    const loadUserData = () => {
      const userData = getStoredUser();
      if (userData.phone) {
        setUserPhone(userData.phone);
      }
      // Initialize contact details for editing
      setContactDetails({
        name: userData.name || '',
        phone: userData.phone || ''
      });
    };
    loadUserData();

    // Refresh on focus to catch updates from profile page
    window.addEventListener('focus', loadUserData);
    return () => window.removeEventListener('focus', loadUserData);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (plan) {
          setCartItems([{
            id: plan.id,
            name: plan.name,
            price: plan.price,
            description: plan.description,
            isPlan: true,
            serviceCount: 1
          }]);

          try {
            const response = await userAuthService.getCheckoutData();
            if (response.success) {
              setVisitedFee(0); // Plans usually have 0 visitor fee
              setGstPercentage(response.settings?.serviceGstPercentage || 18);

              if (response.user?.addresses?.length > 0) {
                const defaultAddr = response.user.addresses.find(a => a.isDefault) || response.user.addresses[0];
                setAddress(defaultAddr.addressLine1);
                setHouseNumber(defaultAddr.addressLine2 || '');
                setAddressDetails({
                  address: defaultAddr.addressLine1,
                  lat: defaultAddr.lat,
                  lng: defaultAddr.lng,
                  type: defaultAddr.type,
                  city: defaultAddr.city,
                  state: defaultAddr.state,
                  pincode: defaultAddr.pincode
                });
              }
            }
          } catch (e) {
            try {
              const profileRes = await userAuthService.getProfile();
              if (profileRes.success) {
                setVisitedFee(0);
                if (profileRes.user?.addresses?.length > 0) {
                  const defaultAddr = profileRes.user.addresses.find(a => a.isDefault) || profileRes.user.addresses[0];
                  setAddress(defaultAddr.addressLine1);
                  setHouseNumber(defaultAddr.addressLine2 || '');
                  setAddressDetails({
                    address: defaultAddr.addressLine1,
                    lat: defaultAddr.lat,
                    lng: defaultAddr.lng,
                    type: defaultAddr.type,
                    city: defaultAddr.city,
                    state: defaultAddr.state,
                    pincode: defaultAddr.pincode
                  });
                }
              }
            } catch (profileErr) {
              console.error('Failed to load user profile fallback for plan', profileErr);
            }
          }
        } else {
          try {
            const response = await userAuthService.getCheckoutData();
            if (response.success) {
              // Set Config
              setVisitedFee(response.settings?.visitedCharges || 29);
              setGstPercentage(response.settings?.serviceGstPercentage || 18);
              setBookingModel(response.bookingModel || 'worker');

              // Set Addresses
              if (response.user?.addresses?.length > 0) {
                const defaultAddr = response.user.addresses.find(a => a.isDefault) || response.user.addresses[0];
                setAddress(defaultAddr.addressLine1);
                setHouseNumber(defaultAddr.addressLine2 || '');
                setAddressDetails({
                  address: defaultAddr.addressLine1,
                  lat: defaultAddr.lat,
                  lng: defaultAddr.lng,
                  type: defaultAddr.type,
                  city: defaultAddr.city,
                  state: defaultAddr.state,
                  pincode: defaultAddr.pincode
                });
              }
            }
          } catch (e) {
            try {
              const response = await userAuthService.getProfile();
              if (response.success) {
                setVisitedFee(29);
                setGstPercentage(18);
                setBookingModel('worker');

                if (response.user?.addresses?.length > 0) {
                  const defaultAddr = response.user.addresses.find(a => a.isDefault) || response.user.addresses[0];
                  setAddress(defaultAddr.addressLine1);
                  setHouseNumber(defaultAddr.addressLine2 || '');
                  setAddressDetails({
                    address: defaultAddr.addressLine1,
                    lat: defaultAddr.lat,
                    lng: defaultAddr.lng,
                    type: defaultAddr.type,
                    city: defaultAddr.city,
                    state: defaultAddr.state,
                    pincode: defaultAddr.pincode
                  });
                }
              }
            } catch (profileErr) {
              console.error('Failed to load user profile fallback', profileErr);
            }
          }

          // Set Cart Items
          let items = globalCartItems || [];
          if (subCategoryName) {
            const normalizedSub = subCategoryName.toLowerCase().trim();
            items = items.filter(item => {
              const itemSub = (item.subCategory || 'Other').toLowerCase().trim();
              return itemSub === normalizedSub;
            });
          } else if (category) {
            const normalizedCategory = category.toLowerCase().trim();
            items = items.filter(item => {
              const itemCat = (item.category || 'Other').toLowerCase().trim();
              return itemCat === normalizedCategory;
            });
          }
          setCartItems(items);
        }
      } catch (error) {
        console.error('Failed to load checkout data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, subCategoryName, plan]);

  // Sync cart items whenever global cart changes, without refetching profile APIs
  useEffect(() => {
    if (plan) return; // Plan doesn't use global cart
    let items = globalCartItems || [];
    if (subCategoryName) {
      const normalizedSub = subCategoryName.toLowerCase().trim();
      items = items.filter(item => {
        const itemSub = (item.subCategory || 'Other').toLowerCase().trim();
        return itemSub === normalizedSub;
      });
    } else if (category) {
      const normalizedCategory = category.toLowerCase().trim();
      items = items.filter(item => {
        const itemCat = (item.category || 'Other').toLowerCase().trim();
        return itemCat === normalizedCategory;
      });
    }
    setCartItems(items);
  }, [globalCartItems, category, subCategoryName, plan]);

  // Items added via the "Instant Booking" express section are marked
  // isInstant at add-to-cart time. When every item in this checkout came
  // from there, this is an instant-only checkout — force that mode and hide
  // the Book/Slot toggle below instead of offering a scheduled slot picker
  // that doesn't make sense for an "arrives in ~45 min" booking. A cart that
  // mixes instant and regular items (or is entirely regular items) keeps the
  // existing toggle so scheduling stays available where it's meaningful.
  const cartIsInstant = cartItems.length > 0 && cartItems.every(item => item.isInstant);

  useEffect(() => {
    if (cartIsInstant) setBookingType('instant');
  }, [cartIsInstant]);

  const loadCart = async () => {
    let items = globalCartItems || [];
    if (subCategoryName) {
      const normalizedSub = subCategoryName.toLowerCase().trim();
      items = items.filter(item => {
        const itemSub = (item.subCategory || 'Other').toLowerCase().trim();
        return itemSub === normalizedSub;
      });
    } else if (category) {
      const normalizedCategory = category.toLowerCase().trim();
      items = items.filter(item => {
        const itemCat = (item.category || 'Other').toLowerCase().trim();
        return itemCat === normalizedCategory;
      });
    }
    setCartItems(items);
  };

  const cartCount = cartItems.length;

  const handleBack = () => {
    if (currentStep === 'payment') {
      setCurrentStep('details');
    } else {
      navigate(-1);
    }
  };

  const handleQuantityChange = async (itemId, change) => {
    try {
      const item = cartItems.find(i => (i._id || i.id) === itemId);
      if (!item) return;

      const newCount = (item.serviceCount || 1) + change;

      if (newCount <= 0) {
        return handleRemoveItem(itemId);
      }

      const response = await updateItemGlobal(itemId, newCount);

      if (response.success) {
        fetchCartGlobal();
      } else {
        toast.error(response.message || 'Failed to update quantity');
      }
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const response = await removeItemGlobal(itemId);
      if (response.success) {
        toast.success('Item removed');
        fetchCartGlobal();
      } else {
        toast.error(response.message || 'Failed to remove item');
      }
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };



  const getAddressComponent = (type) => {
    return addressDetails?.components?.find(c => c.types.includes(type))?.long_name || '';
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const response = await userAuthService.validatePromo(promoCodeInput.trim(), addressDetails?.city);
      if (response.success) {
        setAppliedPromo(response);
        toast.success(response.message || 'Promo code applied!');
      } else {
        setPromoError(response.message || 'Invalid promo code');
      }
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Failed to validate promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
  };

  const handleProceed = async () => {
    // Validation
    if (bookingType === 'instant') {
      if (!addressDetails) {
        setShowAddressModal(true);
        return;
      }
    } else {
      if (!addressDetails || !selectedDate || !selectedTime) {
        if (!addressDetails) setShowAddressModal(true);
        else if (!selectedDate || !selectedTime) setShowTimeSlotModal(true);
        return;
      }
    }

    try {
      setShowVendorModal(true);
      setCurrentStep('searching');

      const firstItem = cartItems[0];
      if (!firstItem) {
        toast.error('Your cart is empty');
        return;
      }
      const serviceId = typeof firstItem.serviceId === 'object'
        ? firstItem.serviceId._id || firstItem.serviceId.id
        : firstItem.serviceId;

      const bookedItemsData = cartItems.map(item => ({
        brandName: item.sectionTitle || item.brand || '',
        brandIcon: item.sectionIcon || null,
        card: {
          title: item.card?.title || item.title,
          subtitle: item.card?.subtitle || item.description || '',
          price: item.card?.price || item.price || 0,
          originalPrice: item.card?.originalPrice || item.originalPrice || null,
          duration: item.card?.duration || item.duration || '',
          description: item.card?.description || item.description || '',
          imageUrl: item.card?.imageUrl || item.icon || '',
          features: item.card?.features || []
        },
        quantity: item.serviceCount || 1
      }));

      // Calculate Scheduled Data for Instant
      let finalDate = selectedDate;
      let finalTime = selectedTime;
      let finalTimeSlot = {
        start: selectedTime,
        end: getTimeSlots().find(slot => slot.value === selectedTime)?.end || selectedTime
      };

      if (bookingType === 'instant') {
        const now = new Date();
        finalDate = now;
        finalTime = "ASAP";
        finalTimeSlot = { start: "Now", end: "45 mins" };
      }

      const response = await bookingService.create({
        bookingType, // 'instant' or 'scheduled'
        serviceId,
        address: {
          type: addressDetails?.type || 'home',
          addressLine1: addressDetails?.addressLine1 || address,
          addressLine2: houseNumber,
          city: addressDetails?.city || getAddressComponent('locality') || getAddressComponent('administrative_area_level_2') || 'City',
          state: addressDetails?.state || getAddressComponent('administrative_area_level_1') || 'State',
          pincode: addressDetails?.pincode || getAddressComponent('postal_code') || '000000',
          lat: addressDetails?.lat,
          lng: addressDetails?.lng
        },
        scheduledDate: finalDate, // Date object
        scheduledTime: bookingType === 'instant' ? "ASAP" : (getTimeSlots().find(slot => slot.value === finalTime)?.display || finalTime),
        timeSlot: finalTimeSlot,
        amount: amountToPay,

        // Pass Full Breakdown to Backend
        basePrice: totalOriginalPrice,
        discount: savings,
        tax: taxesAndFee,
        visitationFee: finalVisitedFee,
        promoCode: appliedPromo ? appliedPromo.code : null,
        promoDiscount: promoDiscountAmount,

        // Metadata for better data capture
        serviceCategory: firstItem.categoryTitle || firstItem.category || 'General',
        categoryIcon: firstItem.categoryIcon || firstItem.icon || null,
        brandName: firstItem.sectionTitle || firstItem.brand || '',
        brandIcon: firstItem.sectionIcon || null,

        contactDetails: {
          name: contactDetails.name,
          phone: contactDetails.phone.length === 10 && !contactDetails.phone.includes('+') ? `+91${contactDetails.phone}` : contactDetails.phone
        },

        paymentMethod: 'online',
        bookedItems: bookedItemsData
      });

      if (response.success) {
        setBookingRequest(response.data);

        // If the backend returns an assigned vendor immediately (rare but possible)
        if ((response.data.vendorId || response.data.workerId) && (response.data.status === 'ACCEPTED' || response.data.status === 'ASSIGNED')) {
          setCurrentStep('accepted');
          setAcceptedProfessional({
            ...(response.data.vendorId || response.data.workerId || {}),
            price: response.data.finalAmount || amountToPay,
            distance: 'within 5km', // default
            estimatedTime: '15-30 min'
          });
          setSearchingVendors(false); // Finished search
        } else {
          // Normal flow: Entered pooling/searching
          setCurrentStep('waiting'); // Waiting for vendor acceptance
          // Keep searchingVendors = true to disable buttons and show progress
        }
      }
    } catch (error) {
      toast.error('Failed to initiate booking request. Please try again.');
      setShowVendorModal(false);
      setSearchingVendors(false);
    }
  };


  // Listen for real-time vendor acceptance and poll as fallback
  useEffect(() => {
    if (currentStep !== 'waiting' || !bookingRequest) return;

    let pollInterval;

    const checkBookingStatus = async () => {
      try {
        const response = await bookingService.getById(bookingRequest._id || bookingRequest.id);
        if (response.success && response.data) {
          const status = (response.data.status || '').toUpperCase();
          if (status === 'ASSIGNED' || status === 'ACCEPTED' || status === 'CONFIRMED' || response.data.workerId || response.data.vendorId) {
            const person = response.data.workerId || response.data.vendorId || {};
            const vendorData = {
              id: person._id || person.id,
              name: person.name || 'Professional',
              businessName: person.businessName || person.name || 'Service Provider',
              rating: person.rating || 4.8,
              distance: person.distance || 'Nearby',
              estimatedTime: '15-20 mins',
              price: bookingRequest.amount
            };

            setAcceptedProfessional(vendorData);
            setCurrentStep('accepted');
            setSearchingVendors(false);
            toast.success(`${vendorData.businessName} accepted your booking!`);

            setTimeout(() => {
              setShowVendorModal(false);
              navigate(`/user/booking-confirmation/${bookingRequest._id || bookingRequest.id}`, {
                replace: true
              });
            }, 2000);
          } else if (status === 'NO_VENDORS' || status === 'NO_WORKERS' || status === 'CANCELLED') {
            setSearchingVendors(false);
            setCurrentStep('failed');
            setSearchMessage(response.data.message || 'No professionals found nearby. Please try again later.');
            toast.error(response.data.message || 'No professionals found nearby. Please try again later.');
            
            setTimeout(() => {
              setShowVendorModal(false);
              navigate('/user', { replace: true });
            }, 10000);
          }
        }
      } catch (err) {
        console.error('Status polling error', err);
      }
    };

    pollInterval = setInterval(checkBookingStatus, 3000);

    const socketUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: {
        token: localStorage.getItem('accessToken')
          || localStorage.getItem('userToken')
          || localStorage.getItem('token')
      },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Checkout socket connected');
      {
        try {
          const user = getStoredUser();
          const uId = user._id || user.id;
          if (uId) {
            socket.emit('join_tracking', `user_${uId}`);
          }
        } catch(e) {}
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Checkout socket connection error:', err);
    });

    socket.on('booking_accepted', (data) => {
      if (data.bookingId === bookingRequest._id) {

        const person = data.vendor || data.worker || {};
        const vendorData = {
          id: person.id,
          name: person.name || 'Professional',
          businessName: person.businessName || person.name || 'Service Provider',
          rating: person.rating || 4.8, 
          distance: person.distance || 'Nearby', 
          estimatedTime: '15-20 mins',
          price: bookingRequest.amount
        };

        setAcceptedProfessional(vendorData);
        setCurrentStep('accepted');
        setSearchingVendors(false);
        toast.success(`${vendorData.businessName} accepted your booking!`);

        setTimeout(() => {
          setShowVendorModal(false);
          navigate(`/user/booking-confirmation/${bookingRequest._id}`, {
            replace: true
          });
        }, 2000);
      }
    });

    socket.on('booking_search_failed', (data) => {
      if (data.bookingId === bookingRequest._id) {
        setSearchingVendors(false);
        setCurrentStep('failed');
        setSearchMessage(data.message || 'No professionals found nearby. Please try again later.');
        toast.error(data.message || 'No professionals found nearby. Please try again later.');

        const handleAutoCancel = async () => {
          try {
            await bookingService.cancel(bookingRequest._id, 'No vendors found after search timeout');
            setTimeout(() => {
              window.location.reload();
            }, 3000); 
          } catch (err) {
            console.error('Auto-cancel failed:', err);
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
        };
        handleAutoCancel();
      }
    });

    socket.on('booking_updated', (data) => {
      if (data.bookingId === bookingRequest._id || data.relatedId === bookingRequest._id) {
        const socketStatus = (data.status || '').toUpperCase();
        if (data.message && socketStatus !== 'NO_WORKERS' && socketStatus !== 'NO_VENDORS') {
          setSearchMessage(data.message);
        }
        if (socketStatus === 'NO_WORKERS' || socketStatus === 'NO_VENDORS') {
          setSearchingVendors(false);
          setCurrentStep('failed');
          setSearchMessage(data.message || 'All professionals are currently busy.');
          toast.error('All experts are busy.');
          
          setTimeout(() => {
            setShowVendorModal(false);
            navigate('/user', { replace: true });
          }, 10000);
        }
      }
    });

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [currentStep, bookingRequest]);

  // Search for nearby vendors
  const handleSearchVendors = async () => {
    try {
      // Validate required fields
      if (bookingType === 'scheduled') {
        if (!selectedDate || !selectedTime) {
          toast.error('Please select time slot');
          return;
        }
        if (!addressDetails) {
          toast.error('Please select address');
          return;
        }
      } else {
        // Instant
        if (!addressDetails) {
          toast.error('Please select address');
          return;
        }
      }

      if (cartItems.length === 0 && !bookingRequest) {
        toast.error('Cart is empty');
        return;
      }

      // Open modal and start searching
      setShowVendorModal(true);
      setCurrentStep('searching');
      setSearchingVendors(true);

      // Get first service
      const firstItem = cartItems[0];
      if (!firstItem.serviceId) {
        toast.error('Service information missing. Please try again.');
        setCurrentStep('details');
        setSearchingVendors(false);
        setShowVendorModal(false);
        return;
      }

      // Prepare address object
      const addressObj = {
        type: 'home',
        addressLine1: address,
        addressLine2: houseNumber,
        city: addressDetails?.city || getAddressComponent('locality') || getAddressComponent('administrative_area_level_2') || 'City',
        state: addressDetails?.state || getAddressComponent('administrative_area_level_1') || 'State',
        pincode: addressDetails?.pincode || getAddressComponent('postal_code') || '123456',

        landmark: addressDetails?.landmark || '',
        lat: addressDetails?.lat || null,
        lng: addressDetails?.lng || null
      };

      // Prepare time slot
      let finalDate = selectedDate;
      let finalTimeDisplay = selectedTime;
      let timeSlotObj = {
        start: selectedTime,
        end: getTimeSlots().find(slot => slot.value === selectedTime)?.end || selectedTime
      };

      if (bookingType === 'instant') {
        finalDate = new Date();
        finalTimeDisplay = "ASAP";
        timeSlotObj = { start: "Now", end: "45 mins" };
      } else {
        finalTimeDisplay = getTimeSlots().find(slot => slot.value === selectedTime)?.display || selectedTime;
      }

      // Create booking request
      toast.loading(`Searching for nearby ${bookingModel}s...`);

      // Ensure serviceId is a string (handle populated cart data)
      const serviceId = typeof firstItem.serviceId === 'object'
        ? firstItem.serviceId._id || firstItem.serviceId.id
        : firstItem.serviceId;

      // Prepare bookedItems array matching Service catalog structure
      // Prepare bookedItems array matching Service catalog structure
      const bookedItemsData = cartItems.map(item => ({
        brandName: item.sectionTitle || item.brand || '',
        brandIcon: item.sectionIcon || null,
        card: {
          title: item.card?.title || item.title || 'Unknown Service',
          subtitle: item.card?.subtitle || item.description || '',
          price: item.card?.price || item.price || 0,
          originalPrice: item.card?.originalPrice || item.originalPrice || null,
          duration: item.card?.duration || item.duration || '',
          description: item.card?.description || item.description || '',
          imageUrl: item.card?.imageUrl || item.icon || '',
          features: item.card?.features || []
        },
        quantity: item.serviceCount || 1
      }));



      const bookingResponse = await bookingService.create({
        bookingType, // 'instant' or 'scheduled'
        serviceId: serviceId,
        address: addressObj,
        scheduledDate: finalDate.toISOString(),
        scheduledTime: finalTimeDisplay,
        timeSlot: timeSlotObj,
        // userNotes: null, // Removed per request
        paymentMethod: amountToPay === 0 ? 'plan_benefit' : paymentMethod,
        amount: amountToPay,

        // Pass Full Breakdown to Backend
        basePrice: totalOriginalPrice,
        discount: savings,
        tax: taxesAndFee,
        visitationFee: finalVisitedFee,
        promoCode: appliedPromo ? appliedPromo.code : null,
        promoDiscount: promoDiscountAmount,

        // Metadata for better data capture
        serviceCategory: firstItem.categoryTitle || firstItem.category || 'General',
        categoryIcon: firstItem.categoryIcon || firstItem.icon || null,
        brandName: firstItem.sectionTitle || firstItem.brand || '',
        brandIcon: firstItem.sectionIcon || null,

        bookedItems: bookedItemsData
      });

      if (!bookingResponse.success) {
        toast.dismiss();
        toast.error(bookingResponse.message || 'Failed to search for vendors');
        setCurrentStep('details');
        setSearchingVendors(false);
        setShowVendorModal(false);
        return;
      }

      const booking = bookingResponse.data;
      setBookingRequest(booking);
      toast.dismiss();

      // Cart will be cleared only after payment is confirmed or Pay At Home is confirmed

      // Note: the backend never fails a booking instantly anymore, even when zero
      // vendors are nearby at creation time — it keeps retrying the search for up
      // to 3 minutes (see waveScheduler.js) before reporting "no vendor available"
      // via the 'waiting' step's socket/poll listeners below.

      // If online payment is selected, trigger it before moving to waiting state
      if (paymentMethod === 'online' && amountToPay > 0) {
        // We need to pass the booking request to the payment handler
        // The handleOnlinePayment function uses acceptedProfessional and bookingRequest from state
        // So we ensure they are set first
        setCurrentStep('payment'); // New step for payment processing
        toast.dismiss();

        // Custom inline payment trigger to avoid state timing issues
        await handlePaymentForBooking(booking);
      } else {
        // Move to waiting state - alerts sent to nearby partners
        setCurrentStep('waiting');
        toast.success(`Finding nearby ${bookingModel}s... Alerts sent to ${bookingModel}s within 10km!`);
      }

      // REMOVED local setCartItems([]) - The summary should remain visible while searching
      // The cart is already cleared in server database by the backend and previous API call.

    } catch (error) {
      toast.dismiss();
      console.error('Search vendors error:', error);
      toast.error('Failed to search for vendors. Please try again.');
      setCurrentStep('details');
      setSearchingVendors(false);
      setShowVendorModal(false);
    }
  };

  // Proceed to payment after vendor acceptance
  const handleOnlinePayment = async () => {
    try {
      if (!acceptedProfessional || !bookingRequest) {
        toast.error('No vendor selected or booking not created');
        return;
      }

      // Create Razorpay order
      toast.loading('Creating payment order...');
      const orderResponse = await paymentService.createOrder(bookingRequest._id);

      if (!orderResponse.success) {
        toast.dismiss();
        toast.error(orderResponse.message || 'Failed to create payment order');
        return;
      }

      toast.dismiss();

      // Get Razorpay key
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        toast.error('Razorpay key not configured');
        return;
      }

      if (!window.Razorpay) {
        toast.error('Razorpay SDK not loaded');
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderResponse.data.amount * 100,
        currency: orderResponse.data.currency || 'INR',
        order_id: orderResponse.data.orderId,
        name: 'GetRight Home',
        description: `Payment for ${bookingRequest.serviceName || 'service'}`,
        handler: async function (response) {
          try {
            toast.loading('Verifying payment...');
            const verifyResponse = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            toast.dismiss();

            if (verifyResponse.success) {
              toast.success('Payment successful!');

              // Clear cart (or just category items)
              try {
                if (category) {
                  await removeCategoryGlobal(category);
                } else {
                  await clearCartGlobal();
                }
                setCartItems([]);
              } catch (error) {
              }

              // Navigate to booking confirmation
              navigate(`/user/booking-confirmation/${bookingRequest._id}`, {
                replace: true
              });
            } else {
              toast.error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error) {
            toast.dismiss();
            toast.error('Failed to verify payment');
          }
        },
        prefill: {
          name: contactDetails.name || getStoredUser().name || 'User',
          email: getStoredUser().email || '',
          contact: contactDetails.phone || userPhone
        },
        theme: {
          color: themeColors.button
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        toast.dismiss();
        toast.error(`Payment failed: ${response.error.description || 'Unknown error'}`);
      });
      razorpay.open();

    } catch (error) {
      toast.dismiss();
      toast.error('Failed to process payment');
    }
  };

  const handlePaymentForBooking = async (booking) => {
    try {
      toast.loading('Creating payment order...');
      const orderResponse = await paymentService.createOrder(booking._id);
      toast.dismiss();

      if (!orderResponse.success) {
        toast.error(orderResponse.message || 'Failed to create payment order');
        setCurrentStep('details');
        setShowVendorModal(false);
        return;
      }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey || !window.Razorpay) {
        toast.error('Payment gateway not ready');
        setCurrentStep('details');
        setShowVendorModal(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderResponse.data.amount * 100,
        currency: orderResponse.data.currency || 'INR',
        order_id: orderResponse.data.orderId,
        name: 'GetRight Home',
        description: `Payment for ${booking.serviceName || 'Service'}`,
        handler: async function (response) {
          try {
            toast.loading('Verifying payment...');
            const verifyResponse = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.dismiss();

            if (verifyResponse.success) {
              toast.success('Payment Successful!');
              // Clear cart (or just subcategory/category items)
              try {
                if (subCategoryName) {
                  await removeSubCategoryGlobal(subCategoryName);
                } else if (category) {
                  await removeCategoryGlobal(category);
                } else {
                  await clearCartGlobal();
                }
                setCartItems([]);
              } catch (error) { }
              // Now move to waiting state to find partners
              setCurrentStep('waiting');
              toast.success(`Finding nearby ${bookingModel}s... Alerts sent!`);
            } else {
              toast.error('Payment verification failed');
              setCurrentStep('details');
              setShowVendorModal(false);
            }
          } catch (err) {
            toast.dismiss();
            toast.error('Failed to verify payment');
            setCurrentStep('details');
            setShowVendorModal(false);
          }
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled');
            setCurrentStep('details');
            setShowVendorModal(false);
          }
        },
        prefill: {
          name: contactDetails.name || 'User',
          phone: contactDetails.phone || userPhone
        },
        theme: { color: themeColors.button }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to process payment');
      setCurrentStep('details');
      setShowVendorModal(false);
    }
  };

  const handlePayAtHome = async () => {
    try {
      if (!bookingRequest) return;
      toast.loading('Confirming booking...');
      const response = await paymentService.confirmPayAtHome(bookingRequest._id);
      toast.dismiss();

      if (response.success) {
        toast.success('Booking confirmed!');
        // Clear cart (or just subcategory/category items)
        try {
          if (subCategoryName) {
            await removeSubCategoryGlobal(subCategoryName);
          } else if (category) {
            await removeCategoryGlobal(category);
          } else {
            await clearCartGlobal();
          }
          setCartItems([]);
        } catch (error) {
        }
        // Navigate to booking confirmation
        navigate(`/user/booking-confirmation/${bookingRequest._id}`, {
          replace: true
        });
      } else {
        toast.error(response.message || 'Failed to confirm booking');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to process request');
    }
  };

  const handlePayment = async () => {
    if (totalAmount === 0) {
      // Free booking covered by plan
      toast.success('Booking confirmed!');
      // Clear cart
      try {
        if (subCategoryName) {
          await removeSubCategoryGlobal(subCategoryName);
        } else if (category) {
          await removeCategoryGlobal(category);
        } else {
          await clearCartGlobal();
        }
        setCartItems([]);
      } catch (error) { }

      // Navigate
      if (bookingRequest) {
        navigate(`/user/booking-confirmation/${bookingRequest._id}`, { replace: true });
      }
    } else if (paymentMethod === 'online') {
      await handleOnlinePayment();
    } else {
      await handlePayAtHome();
    }
  };

  const handleAddressSave = async (savedHouseNumber, locationObj) => {
    setHouseNumber(savedHouseNumber);
    if (locationObj) {
      setAddress(locationObj.address);
      setAddressDetails(locationObj);
    }
    setShowAddressModal(false);

    // Save to profile
    if (locationObj) {
      try {
        const getComp = (type) => locationObj.components?.find(c => c.types.includes(type))?.long_name || '';

        const newAddress = {
          type: 'home',
          addressLine1: locationObj.address,
          addressLine2: savedHouseNumber,
          city: getComp('locality') || getComp('administrative_area_level_2') || 'City',
          state: getComp('administrative_area_level_1') || 'State',
          pincode: getComp('postal_code') || '000000',
          lat: locationObj.lat,
          lng: locationObj.lng,
          isDefault: true
        };

        const response = await userAuthService.getProfile();
        if (response.success && response.user) {
          const updatedAddresses = [newAddress]; // Always replace with single address
          await userAuthService.updateProfile({ addresses: updatedAddresses });
          toast.success('Address updated in profile!');
        }
      } catch (e) {
        console.error('Failed to save address to profile', e);
      }
    }

    if (bookingType === 'scheduled') {
      setShowTimeSlotModal(true);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (date && selectedTime) {
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        const currentHour = now.getHours();
        const minHour = currentHour + 1;
        const slotHour = parseInt(selectedTime.split(':')[0], 10);
        if (slotHour < minHour) {
          setSelectedTime(null);
        }
      }
    }
  };

  const handleTimeSlotSave = (date, time) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setShowTimeSlotModal(false);
  };

  const handleCartClick = () => {
    if (plan) return; // Disable cart click for plan
    navigate('/user/cart');
  };

  // Fetch plan upgrade details if applicable
  const [upgradePreview, setUpgradePreview] = useState(null);
  const isUpgrade = location.state?.isUpgrade;

  useEffect(() => {
    if (plan && isUpgrade) {
      const fetchUpgradeDetails = async () => {
        try {
          const res = await paymentService.getUpgradeDetails(plan.id);
          if (res.success) {
            setUpgradePreview(res.data);
          }
        } catch (error) {
          console.error(error);
          toast.error('Failed to calculate upgrade price');
        }
      };
      fetchUpgradeDetails();
    }
  }, [plan, isUpgrade]);

  const handlePlanPayment = async () => {
    try {
      if (!razorpayLoaded) {
        toast.error('Payment gateway not ready');
        return;
      }

      const response = await paymentService.createPlanOrder(plan.id);
      if (response.success) {
        const { orderId, amount, key } = response.data;

        const options = {
          key,
          amount: amount * 100,
          currency: 'INR',
          name: 'GetRight Home',
          description: `Payment for ${plan.name} ${isUpgrade ? '(Upgrade)' : ''}`,
          order_id: orderId,
          handler: async (response) => {
            try {
              await paymentService.verifyPlanPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id
              });
              toast.success('Subscription activated successfully!');
              navigate('/user');
            } catch (e) {
              toast.error('Verification failed');
            }
          },
          prefill: {
            contact: userPhone
          },
          theme: {
            color: themeColors.primary
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      console.error(error);
      toast.error('Payment initiation failed');
    }
  };

  const [planBenefits, setPlanBenefits] = useState({ name: '', freeCategories: [], freeBrands: [], freeServices: [] });
  const [vipCards, setVipCards] = useState([]);       // VIP benefit cards from homeContent
  const [userIsVip, setUserIsVip] = useState(false);  // Is the current user an active VIP member
  const [userVipCategoryIds, setUserVipCategoryIds] = useState([]); // category IDs user booked from

  // Fetch plan and user profile to determine discounts
  useEffect(() => {
    const fetchBenefits = async () => {
      try {
        const [plansRes, userRes] = await Promise.all([
          getPlans(),
          userAuthService.getProfile(),
        ]);

        if (plansRes.success && userRes.success && userRes.user?.plans?.isActive) {
          const userPlanName = userRes.user.plans.name;
          const activePlan = plansRes.data.find(p => p.name === userPlanName);
          if (activePlan) {
            setPlanBenefits({
              name: activePlan.name,
              freeCategories: activePlan.freeCategories || [],
              freeBrands: activePlan.freeBrands || [],
              freeServices: activePlan.freeServices || []
            });
          }
        }
      } catch (e) {
        console.error('Failed to load plan benefits', e);
      }

      // Fetch VIP cards from homeContent + user VIP status
      try {
        const { publicCatalogService } = await import('../../../../services/catalogService');
        const [contentRes, userRes2] = await Promise.all([
          publicCatalogService.getHomeContent(),
          userAuthService.getProfile()
        ]);

        if (contentRes.success && contentRes.homeContent?.vipCards) {
          setVipCards(contentRes.homeContent.vipCards);
        }

        if (userRes2.success) {
          const u = userRes2.user;
          const isVipActive = u.isVip === true && u.vipExpiry && new Date(u.vipExpiry) > new Date();
          setUserIsVip(isVipActive);
        }
      } catch (e) {
        console.warn('Failed to load VIP data', e);
      }
    };

    // Only fetch if not a plan purchase (standard checkout)
    if (!plan) {
      fetchBenefits();
    }
  }, [plan]);

  // Helper to normalize MongoDB IDs (handles strings, objects with _id, and $oid)
  const normalizeId = (id) => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) return normalizeId(id._id);
    return String(id);
  };

  // Calculate totals with Plan Benefits + VIP Discount
  const calculateItemPrice = (item) => {
    if (plan) return item.price || 0; // Plan purchase

    const itemCatId = normalizeId(item.categoryId);
    const itemBrandId = normalizeId(item.brandId || item.sectionId);
    const itemServiceId = normalizeId(item.serviceId);

    // Check if free via subscription plan
    const isFreeCategory = itemCatId && planBenefits.freeCategories.some(cat => normalizeId(cat) === itemCatId);
    const isFreeBrand = itemBrandId && planBenefits.freeBrands.some(brand => normalizeId(brand) === itemBrandId);
    const isFreeService = itemServiceId && planBenefits.freeServices.some(svc => normalizeId(svc) === itemServiceId);

    if (isFreeCategory || isFreeBrand || isFreeService) return 0;

    const basePrice = item.price || 0;

    // Apply VIP discount if user is VIP member
    if (userIsVip && itemCatId && vipCards.length > 0) {
      const matchedCard = vipCards.find(card => {
        const cardCatId = normalizeId(card.targetCategoryId);
        return cardCatId && cardCatId === itemCatId;
      });
      if (matchedCard && matchedCard.discount > 0) {
        const discountPct = matchedCard.discount / 100;
        return Math.round(basePrice * (1 - discountPct));
      }
    }

    return basePrice;
  };

  // Calculate VIP discount amount for display
  const vipDiscountAmount = userIsVip && !plan
    ? cartItems.reduce((sum, item) => {
        const itemCatId = normalizeId(item.categoryId);
        if (!itemCatId) return sum;
        const matchedCard = vipCards.find(c => normalizeId(c.targetCategoryId) === itemCatId);
        if (!matchedCard || matchedCard.discount <= 0) return sum;
        return sum + Math.round((item.price || 0) * matchedCard.discount / 100);
      }, 0)
    : 0;

  const itemTotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  // Calculate savings including Plan Savings + VIP Discount
  const totalOriginalPrice = cartItems.reduce((sum, item) => {
    const basePrice = item.price || 0;
    const original = (item.originalPrice || item.unitPrice || (basePrice / (item.serviceCount || 1))) * (item.serviceCount || 1);
    return sum + original;
  }, 0);

  const savings = totalOriginalPrice - itemTotal;
  const taxesAndFee = 0;
  const finalVisitedFee = 0;

  let promoDiscountAmount = 0;
  if (appliedPromo && appliedPromo.discountPercentage) {
    promoDiscountAmount = Math.round(totalOriginalPrice * (appliedPromo.discountPercentage / 100));
  }

  const totalAmount = Math.max(0, itemTotal - promoDiscountAmount);
  const amountToPay = totalAmount;

  // Helper for Free Plan Full Breakdown Display
  const displayTax = 0;
  const displayFee = 0;
  const displaySavings = savings;

  // Date and time slot helper functions
  const getDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getTimeSlots = () => {
    const allSlots = [
      { value: '09:00', end: '10:00', display: '9:00 AM' },
      { value: '10:00', end: '11:00', display: '10:00 AM' },
      { value: '11:00', end: '12:00', display: '11:00 AM' },
      { value: '12:00', end: '13:00', display: '12:00 PM' },
      { value: '13:00', end: '14:00', display: '1:00 PM' },
      { value: '14:00', end: '15:00', display: '2:00 PM' },
      { value: '15:00', end: '16:00', display: '3:00 PM' },
      { value: '16:00', end: '17:00', display: '4:00 PM' },
      { value: '17:00', end: '18:00', display: '5:00 PM' },
      { value: '18:00', end: '19:00', display: '6:00 PM' },
      { value: '19:00', end: '20:00', display: '7:00 PM' },
      { value: '20:00', end: '21:00', display: '8:00 PM' },
    ];

    // If today is selected, filter out past time slots
    const now = new Date();
    const isToday = selectedDate && selectedDate.toDateString() === now.toDateString();

    if (!isToday) {
      return allSlots;
    }

    // Get current hour + 1 (minimum 1 hour buffer for vendors to accept)
    const currentHour = now.getHours();
    const minHour = currentHour + 1;

    return allSlots.filter(slot => {
      const slotHour = parseInt(slot.value.split(':')[0], 10);
      return slotHour >= minHour;
    });
  };

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
    };
  };



  const isDateSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const isTimeSelected = (time) => {
    return selectedTime === time;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-32 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" style={{ borderColor: themeColors.button }}></div>
          <p className="text-gray-500">Loading checkout details...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && currentStep === 'details' && !searchingVendors && !showVendorModal) {
    return (
      <div className="min-h-screen bg-white pb-32">
        <header className="bg-white">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiArrowLeft className="w-6 h-6 text-black" />
              </button>
              <h1 className="text-xl font-bold text-black">Your cart</h1>
            </div>
          </div>
          <div className="border-b border-gray-200"></div>
        </header>
        <main className="px-4 py-4">
          <div className="flex flex-col items-center justify-center py-20">
            <FiShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">Your cart is empty</p>
            <p className="text-gray-400 text-sm mt-2">Add services to get started</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-80">
      {/* Header */}
      <header className="bg-white">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiArrowLeft className="w-6 h-6 text-black" />
            </button>
            <h1 className="text-xl font-bold text-black">
              {category ? `${category} Checkout` : 'Your cart'}
            </h1>
          </div>
        </div>
        <div className="border-b border-gray-200"></div>
      </header>

      <main className="px-4 py-4">
        {/* Savings Banner */}
        {savings > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-green-200">
                <MdStar className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Smart Choice!</p>
                <p className="text-sm font-black text-slate-900">
                  You're saving ₹{savings.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-green-100">
              <span className="text-[10px] font-black text-green-600">BEST PRICE</span>
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="space-y-4 mb-4">
          {cartItems.map((item) => {
            const brandName = item.brand || item.sectionTitle;
            const categoryName = item.categoryTitle || item.category;

            return (
              <div key={item._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                {/* Brand Header */}
                {(brandName || categoryName) && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-50">
                    {item.sectionIcon ? (
                      <img src={toAssetUrl(item.sectionIcon)} className="w-5 h-5 rounded-md object-cover border border-gray-100" alt="" />
                    ) : (
                      <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {(brandName || "B").charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col leading-none">
                      {brandName && <span className="text-xs font-bold text-gray-900">{brandName}</span>}
                      {categoryName && <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mt-0.5">{categoryName}</span>}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-4">
                    <h3 className="text-base font-bold text-gray-900 mb-1 leading-snug">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    )}
                    {item.duration && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <FiClock className="w-3 h-3" />
                        {item.duration}
                      </div>
                    )}
                  </div>
                  {!item.isPlan && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                        <button
                          onClick={() => handleQuantityChange(item._id, -1)}
                          className="p-1.5 hover:bg-white rounded-md transition-all shadow-sm"
                        >
                          <FiMinus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-gray-900">{item.serviceCount || 1}</span>
                        <button
                          onClick={() => handleQuantityChange(item._id, 1)}
                          className="p-1.5 hover:bg-white rounded-md transition-all shadow-sm"
                        >
                          <FiPlus className="w-3.5 h-3.5 text-gray-900" />
                        </button>
                      </div>
                    </div>
                  )}
                  {!item.isPlan && (
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-black">
                    {calculateItemPrice(item) === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `₹${(item.price || 0).toLocaleString('en-IN')}`
                    )}
                  </span>
                  {calculateItemPrice(item) === 0 && (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                      WITH PLAN
                    </span>
                  )}
                  {calculateItemPrice(item) > 0 && (() => {
                    const unitPrice = item.unitPrice || (item.price / (item.serviceCount || 1));
                    const unitOriginalPrice = item.originalPrice || unitPrice;
                    const currentTotal = item.price;
                    const originalTotal = unitOriginalPrice * (item.serviceCount || 1);
                    if (originalTotal > currentTotal) {
                      return (
                        <span className="text-sm text-gray-400 line-through">
                          ₹{originalTotal.toLocaleString('en-IN')}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )
          })}
        </div>

        {/* ... */}


        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiPhone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-black">{contactDetails.name || getStoredUser().name || 'Verified Customer'}</p>
                <p className="text-xs text-gray-600">{contactDetails.phone || userPhone || 'Loading...'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowContactModal(true)}
              className="text-sm font-medium hover:underline"
              style={{ color: themeColors.button }}
            >
              Change
            </button>
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-green-600" /> Apply Promo Code
            </h4>
            {!appliedPromo ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. NEWCLEAN10)"
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-[13px] font-medium focus:outline-none focus:border-indigo-500 placeholder:normal-case placeholder:font-normal"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCodeInput.trim()}
                  className="text-white px-4 py-2 rounded-lg text-[13px] font-bold disabled:opacity-50 shrink-0"
                  style={{ background: themeColors.button }}
                >
                  {promoLoading ? 'Applying...' : 'Apply'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-600 w-5 h-5" />
                  <div>
                    <span className="font-bold text-green-700">{appliedPromo.code}</span>
                    <p className="text-xs text-green-600">{appliedPromo.message}</p>
                  </div>
                </div>
                <button onClick={handleRemovePromo} className="text-red-500 text-xs font-bold hover:underline">
                  REMOVE
                </button>
              </div>
            )}
            {promoError && <p className="text-xs text-red-500 font-medium">{promoError}</p>}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6 shadow-sm overflow-hidden relative">
          {/* Decorative Background for Header */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: themeColors.gradient }}></div>

          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <FiShoppingCart className="w-5 h-5" style={{ color: themeColors.button }} />
            Payment Summary
          </h3>

          <div className="space-y-3">
            {/* Original Price (before plan) */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Item Total</span>
              <span className="text-sm font-medium text-slate-900">
                ₹{totalOriginalPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {/* General Discount Line */}
            {(displaySavings - vipDiscountAmount) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-600">Discount</span>
                <span className="text-sm font-medium text-green-600">-₹{(displaySavings - vipDiscountAmount).toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* VIP Discount Line */}
            {vipDiscountAmount > 0 && (
              <div className="flex justify-between items-center bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                <span className="text-sm font-bold text-[#C8960C] flex items-center gap-1.5">
                  <span className="text-[10px] font-black bg-gradient-to-r from-[#C8960C] to-[#f5c518] text-white px-1.5 py-0.5 rounded shadow-sm tracking-wider">VIP</span> 
                  Savings
                </span>
                <span className="text-sm font-black text-[#C8960C]">-₹{vipDiscountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Promo Discount Line */}
            {promoDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span className="text-sm font-bold flex items-center gap-1">Promo Applied</span>
                <span className="text-sm font-bold">-₹{promoDiscountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Upgrade Credit (for plan upgrades) */}
            {upgradePreview && upgradePreview.credit > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span className="text-sm font-medium">Plan Credit</span>
                <span className="text-sm font-bold">-₹{upgradePreview.credit.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Taxes */}
            {displayTax > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">GST ({gstPercentage}%)</span>
                <span className="text-sm font-medium text-slate-700">₹{displayTax.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Visited Fee */}
            {displayFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Convenience Fee</span>
                <span className="text-sm font-medium text-slate-700">₹{displayFee.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-200 pt-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Total Payable</span>
                <div className="flex flex-col items-end">
                  {totalAmount === 0 ? (
                    <>
                      <span className="text-sm font-medium text-slate-400 line-through">
                        ₹{Math.round(totalOriginalPrice + displayTax + displayFee).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xl font-black text-green-600">FREE</span>
                    </>
                  ) : (
                    <span className="text-xl font-black text-slate-900">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note regarding Base Price */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-4 shadow-sm">
          <div className="bg-blue-100 p-2 rounded-full shrink-0 mt-0.5">
            <FiInfo className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 mb-1">Note</h4>
            <p className="text-sm text-blue-800 leading-relaxed font-medium">
              This is a base booking cost. Additional service cost is decided by the {bookingModel} after service bill preparation.
            </p>
          </div>
        </div>

        {/* Free Plan Benefit Card */}
        {totalAmount === 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 border border-green-200 rounded-2xl p-5 mb-6 relative overflow-hidden">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="bg-green-500 rounded-full p-2 shadow-lg shadow-green-200 shrink-0">
                <FiCheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-800 mb-1">Covered by {planBenefits.name}</h3>
                <p className="text-sm text-green-700 leading-relaxed font-medium opacity-90">
                  You save <span className="font-bold">₹{Math.round(totalOriginalPrice + displayTax + displayFee).toLocaleString('en-IN')}</span> on this booking!
                  Your plan covers all costs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-base font-bold text-black mb-2">Cancellation policy</h3>
          <p className="text-sm text-gray-700 mb-2">
            Free cancellations if done more than 12 hrs before the service or if a professional isn't assigned. A fee will be charged otherwise.
          </p>
          <button
            onClick={() => navigate('/user/cancellation-policy')}
            className="text-sm font-medium hover:underline"
            style={{ color: themeColors.button }}
          >
            Read full policy
          </button>
        </div>


      </main>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">

        {/* Booking Type — instant-only carts skip the toggle entirely, since
            offering a scheduled slot on an express booking doesn't make sense */}
        <div className="px-4 pt-3 pb-0">
          {cartIsInstant ? (
            <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 border border-green-100 mb-1">
              <span className="text-yellow-500">⚡</span>
              <span className="text-sm font-bold text-black">Instant Booking</span>
            </div>
          ) : (
            <div className="flex bg-gray-100 p-1 rounded-xl mb-1">
              <button
                onClick={() => setBookingType('instant')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${bookingType === 'instant' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
              >
                <span className="text-yellow-500">⚡</span> Book
              </button>
              <button
                onClick={() => {
                  setBookingType('scheduled');
                  setShowTimeSlotModal(true);
                  if (!selectedDate) {
                    setSelectedDate(getDates()[0]);
                  }
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${bookingType === 'scheduled' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
              >
                <span>📅</span> Slot
              </button>
            </div>
          )}
          {bookingType === 'instant' && (
            <p className="text-xs text-center text-green-600 font-medium mt-1 mb-1">
              <span className="font-bold">⚡ Priority Service:</span> {bookingModel === 'worker' ? 'Worker' : 'Vendor'} arrives in ~45 mins
            </p>
          )}
        </div>

        {/* Address and Slot Display */}
        <div className="px-4 pt-2 pb-2 border-b border-gray-100 space-y-3">
          {/* Address Section */}
          {(houseNumber || addressDetails) ? (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                <FiHome className="w-4 h-4" style={{ color: themeColors.button }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 mb-0.5">Address</p>
                <p className="text-sm font-medium text-black truncate">
                  {houseNumber ? `${houseNumber}, ` : ''}{address || 'Select Address'}
                </p>
              </div>
              <button
                onClick={() => setShowAddressModal(true)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0 mt-0.5"
              >
                <FiEdit2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setShowAddressModal(true)}
              className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <FiHome className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-900">Delivery Address Missing</p>
                  <p className="text-xs text-red-600">Please add address to see availability</p>
                </div>
              </div>
              <FiEdit2 className="w-4 h-4 text-red-400" />
            </div>
          )}

          {/* Time Slot Section (Only for Scheduled) */}
          {bookingType === 'scheduled' && (
            <div className="flex items-start gap-2.5 pt-2.5 border-t border-gray-100">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                <FiClock className="w-4 h-4" style={{ color: themeColors.button }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 mb-0.5">Time Slot</p>
                <p className="text-sm font-medium text-black">
                  {selectedDate ? (() => {
                    const { day, date: dateNum } = formatDate(selectedDate);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const month = monthNames[selectedDate.getMonth()];
                    const timeStr = selectedTime && getTimeSlots().find(slot => slot.value === selectedTime)?.display ? ` • ${getTimeSlots().find(slot => slot.value === selectedTime).display}` : '';
                    return `${day}, ${dateNum} ${month}${timeStr}`;
                  })() : (
                    <span className="text-gray-400">Select Date & Time</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTimeSlotModal(true);
                  if (!selectedDate) setSelectedDate(getDates()[0]);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0 mt-0.5"
              >
                <FiEdit2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* relative z-[60] keeps this primary CTA clickable above the floating
            LiveBookingCard (fixed, z-50), which otherwise covers it whenever the
            user already has a booking in progress. */}
        <div className="p-4 relative z-[60]">
          <button
            onClick={plan ? handlePlanPayment :
              (houseNumber || addressDetails) ?
                (currentStep === 'payment' ? handlePayment : 
                  (bookingType === 'scheduled' && (!selectedDate || !selectedTime)) ? () => {
                    setShowTimeSlotModal(true);
                    if (!selectedDate) setSelectedDate(getDates()[0]);
                  } : handleSearchVendors) :
                handleProceed}
            disabled={searchingVendors}
            className="w-full text-white py-3 rounded-lg text-base font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-teal-500/30"
            style={{ backgroundColor: themeColors.button }}
          >
            {searchingVendors ? `Searching for ${bookingModel}s...` :
              currentStep === 'payment' ? (totalAmount === 0 ? 'Confirm Booking (Free)' : (paymentMethod === 'online' ? 'Proceed to Pay' : 'Confirm Booking')) :
                plan ? 'Proceed to Payment' :
                  bookingType === 'instant' ? `Find nearby ${bookingModel}s now` :
                    (selectedDate && selectedTime && (houseNumber || addressDetails) ?
                      `Find nearby ${bookingModel}s` :
                      (houseNumber || addressDetails) ? 'Select Time Slot' : 'Add address to proceed')}
          </button>
        </div>
      </div>

      {/* Live Booking Status Card (Visible when minimized).
          Hidden while the user is still filling in this checkout: the card is
          `fixed` at the bottom and would sit on top of the primary CTA, making
          it unclickable when an earlier booking is still in progress. */}
      {currentStep !== 'details' && (
        <LiveBookingCard key={bookingRequest?._id || 'default'} />
      )}

      {/* Search Status Modal */}
      <SearchStatusModal
        isOpen={showVendorModal}
        onClose={async () => {
          setShowVendorModal(false);
          if (currentStep === 'searching' || currentStep === 'waiting') {
            const bookingId = bookingRequest?._id || bookingRequest?.id;
            if (bookingId) {
              toast.loading('Cancelling search...');
              try {
                await bookingService.cancel(bookingId, 'User cancelled search');
                toast.dismiss();
                toast.success('Search cancelled successfully');
              } catch (err) {
                toast.dismiss();
                console.error('Failed to cancel booking:', err);
              }
            }
            setBookingRequest(null);
            setCurrentStep('details');
            setSearchingVendors(false);
          } else if (currentStep === 'accepted') {
            setCurrentStep('payment');
          } else if (currentStep === 'failed') {
            setCurrentStep('details');
          }
        }}
        currentStep={currentStep}
        acceptedProfessional={acceptedProfessional}
        bookingModel={bookingModel}
        searchMessage={searchMessage}
        onRetry={() => {
          handleSearchVendors();
        }}
      />

      {/* Contact Details Edit Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-scale-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Contact Details</h3>
            <p className="text-sm text-gray-500 mb-4">These details will be used for this booking only.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                <input
                  type="text"
                  value={contactDetails.name}
                  onChange={(e) => setContactDetails(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                <div className="flex gap-2">
                  <span className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium select-none">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={contactDetails.phone?.replace('+91', '')?.replace(/^\+91/, '') || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setContactDetails(prev => ({ ...prev, phone: val }));
                    }}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="9999999999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (contactDetails.name.length < 2) {
                      toast.error('Please enter a valid name');
                      return;
                    }
                    if (!contactDetails.phone || contactDetails.phone.length < 10) {
                      toast.error('Please enter a valid 10-digit phone number');
                      return;
                    }
                    setShowContactModal(false);
                  }}
                  className="py-3 rounded-xl font-bold text-white shadow-lg shadow-teal-500/30 active:scale-95 transition-all"
                  style={{ backgroundColor: themeColors.button }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        address={address}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleAddressSave}
      />

      {/* Time Slot Modal */}
      <TimeSlotModal
        isOpen={showTimeSlotModal}
        onClose={() => setShowTimeSlotModal(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onDateSelect={handleDateSelect}
        onTimeSelect={setSelectedTime}
        onSave={handleTimeSlotSave}
        getDates={getDates}
        getTimeSlots={getTimeSlots}
        formatDate={formatDate}
        isDateSelected={isDateSelected}
        isTimeSelected={isTimeSelected}
      />
    </div>
  );
};

export default Checkout;

